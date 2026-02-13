import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';
import { authorizeUser } from '@/proxy';
import { checkRateLimit, getRequestIp } from '@/utils/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_DIR = '/tmp/report-cache';
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function POST(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const ip = getRequestIp(request.headers);
		const limiter = await checkRateLimit(
			`rl:reports_pdf_post:${currentUser.id}:${ip}`,
			20,
			60,
		);
		if (!limiter.allowed) {
			return NextResponse.json(
				{
					success: false,
					message: 'Too many uploads. Please wait and try again.',
					retryAfter: limiter.retryAfter,
				},
				{ status: 429 },
			);
		}

		const contentType = request.headers.get('content-type') || '';
		if (!contentType.includes('application/pdf')) {
			return NextResponse.json(
				{ success: false, message: 'Expected PDF payload.' },
				{ status: 400 },
			);
		}

		const buffer = Buffer.from(await request.arrayBuffer());
		if (!buffer.length) {
			return NextResponse.json(
				{ success: false, message: 'Empty PDF payload.' },
				{ status: 400 },
			);
		}
		if (buffer.length > 15 * 1024 * 1024) {
			return NextResponse.json(
				{ success: false, message: 'PDF payload too large.' },
				{ status: 413 },
			);
		}

		const hash = crypto.createHash('sha256').update(buffer).digest('hex');
		const pdfPath = path.join(CACHE_DIR, `${hash}.pdf`);
		const metaPath = path.join(CACHE_DIR, `${hash}.json`);

		await fs.mkdir(CACHE_DIR, { recursive: true });
		await fs.writeFile(pdfPath, buffer);
		await fs.writeFile(
			metaPath,
			JSON.stringify({ createdAt: Date.now() }),
		);

		return NextResponse.json({ success: true, cacheKey: hash });
	} catch (error) {
		console.error('Error storing report PDF:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to store PDF.' },
			{ status: 500 },
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const key = searchParams.get('key');
		const fileName = searchParams.get('fileName') || 'report.pdf';
		if (!key) {
			return NextResponse.json(
				{ success: false, message: 'Missing cache key.' },
				{ status: 400 },
			);
		}
		const pdfPath = path.join(CACHE_DIR, `${key}.pdf`);
		const metaPath = path.join(CACHE_DIR, `${key}.json`);
		const stat = await fs.stat(pdfPath);
		const metaRaw = await fs.readFile(metaPath, 'utf-8');
		const meta = JSON.parse(metaRaw || '{}');
		if (!stat || !meta?.createdAt || Date.now() - meta.createdAt > CACHE_TTL_MS) {
			return NextResponse.json(
				{ success: false, message: 'Cached report expired.' },
				{ status: 410 },
			);
		}
		const cached = await fs.readFile(pdfPath);
		return new NextResponse(cached, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `inline; filename="${fileName}"`,
				'Cache-Control': 'public, max-age=3600',
			},
		});
	} catch (error) {
		console.error('Error reading cached report PDF:', error);
		return NextResponse.json(
			{ success: false, message: 'Report not found.' },
			{ status: 404 },
		);
	}
}
