import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authorizeUser } from '@/proxy';
import { checkRateLimit, getRequestIp } from '@/utils/rateLimit';
import { isR2Configured, putObject } from '@/lib/storage/r2';
import { avatarPrefix, resolveTenantSlug } from '@/lib/storage/avatar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The client downscales to 512x512 before uploading (~50-150 KB). This ceiling only
// guards direct calls to the API, and stays well under Vercel's ~4.5 MB body limit.
const MAX_BYTES = 2 * 1024 * 1024;

type SniffResult = { contentType: string; ext: string };

/**
 * Identify the image from its magic bytes rather than trusting the client-supplied
 * Content-Type. SVG is intentionally not supported: it can carry script, and we should
 * never serve user-supplied SVG from a domain we control.
 */
function sniffImage(buffer: Buffer): SniffResult | null {
	if (buffer.length < 12) return null;

	if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		return { contentType: 'image/jpeg', ext: 'jpg' };
	}
	if (
		buffer[0] === 0x89 &&
		buffer[1] === 0x50 &&
		buffer[2] === 0x4e &&
		buffer[3] === 0x47
	) {
		return { contentType: 'image/png', ext: 'png' };
	}
	if (
		buffer.toString('ascii', 0, 4) === 'RIFF' &&
		buffer.toString('ascii', 8, 12) === 'WEBP'
	) {
		return { contentType: 'image/webp', ext: 'webp' };
	}
	if (buffer.toString('ascii', 0, 4) === 'GIF8') {
		return { contentType: 'image/gif', ext: 'gif' };
	}

	return null;
}

export async function POST(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		if (!isR2Configured()) {
			return NextResponse.json(
				{ success: false, message: 'File uploads are not configured' },
				{ status: 503 },
			);
		}

		const ip = getRequestIp(request.headers);
		const limiter = await checkRateLimit(
			`rl:avatar_upload:${currentUser.id}:${ip}`,
			10,
			600,
		);
		if (!limiter.allowed) {
			return NextResponse.json(
				{
					success: false,
					message: 'Too many uploads. Please try again later.',
					retryAfter: limiter.retryAfter,
				},
				{ status: 429 },
			);
		}

		const form = await request.formData();
		const file = form.get('file');
		const isFileLike =
			file &&
			typeof file === 'object' &&
			'arrayBuffer' in file &&
			typeof (file as File).arrayBuffer === 'function';

		if (!isFileLike) {
			return NextResponse.json(
				{ success: false, message: 'No file provided' },
				{ status: 400 },
			);
		}

		const fileLike = file as File;
		if (fileLike.size > MAX_BYTES) {
			return NextResponse.json(
				{ success: false, message: 'Image must be smaller than 2 MB' },
				{ status: 400 },
			);
		}

		const buffer = Buffer.from(await fileLike.arrayBuffer());
		if (buffer.length === 0) {
			return NextResponse.json(
				{ success: false, message: 'Uploaded file is empty' },
				{ status: 400 },
			);
		}
		if (buffer.length > MAX_BYTES) {
			return NextResponse.json(
				{ success: false, message: 'Image must be smaller than 2 MB' },
				{ status: 400 },
			);
		}

		const sniffed = sniffImage(buffer);
		if (!sniffed) {
			return NextResponse.json(
				{
					success: false,
					message: 'Unsupported file type. Use a JPEG, PNG, WebP or GIF image.',
				},
				{ status: 400 },
			);
		}

		const tenantSlug = resolveTenantSlug(currentUser);
		const prefix = avatarPrefix(tenantSlug, String(currentUser.id));
		const key = `${prefix}${crypto.randomUUID()}.${sniffed.ext}`;

		const url = await putObject({
			key,
			body: buffer,
			contentType: sniffed.contentType,
		});

		// Note: the avatar being replaced is NOT deleted here. Cleanup happens when the
		// new URL is persisted (see deleteReplacedAvatar), because screens that defer
		// saving until form submit would otherwise delete a file the stored record still
		// points at. The cost is an orphan when an upload is started and abandoned.
		return NextResponse.json({ success: true, data: { url, key } });
	} catch (error) {
		console.error('Avatar upload error:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to upload image' },
			{ status: 500 },
		);
	}
}
