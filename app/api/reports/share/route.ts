import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import path from 'path';
import { promises as fs } from 'fs';
import { getTenantModels } from '@/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_DIR = '/tmp/report-cache';
const SHARE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

const buildOrigin = (request: NextRequest) => {
	const proto = request.headers.get('x-forwarded-proto') || 'https';
	const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
	return `${proto}://${host}`;
};

const parseSharePayload = async (request: NextRequest) => {
	const contentType = request.headers.get('content-type') || '';
	if (contentType.includes('multipart/form-data')) {
		const form = await request.formData();
		const pdf = form.get('pdf');
		const cacheKey = form.get('cacheKey');
		let pdfBuffer: Buffer | null = null;
		let fileName = String(form.get('fileName') || '');
		const reportType = String(form.get('reportType') || '');
		const createdBy = String(form.get('createdBy') || '');
		const isFileLike =
			pdf &&
			typeof pdf === 'object' &&
			'arrayBuffer' in pdf &&
			typeof (pdf as File).arrayBuffer === 'function';
		const contentTypeValue =
			isFileLike && (pdf as File).type ? (pdf as File).type : 'application/pdf';
		if (isFileLike) {
			const fileLike = pdf as File;
			pdfBuffer = Buffer.from(await fileLike.arrayBuffer());
			if (!fileName) {
				fileName = fileLike.name || fileName;
			}
		}
		return {
			cacheKey: cacheKey ? String(cacheKey) : '',
			fileName,
			reportType,
			createdBy,
			pdfBuffer,
			contentType: contentTypeValue,
		};
	}

	const body = await request.json();
	const pdfBase64 = body?.pdfBase64 as string | undefined;
	const pdfBuffer = pdfBase64 ? Buffer.from(pdfBase64, 'base64') : null;
	return {
		cacheKey: body?.cacheKey || '',
		fileName: body?.fileName || '',
		reportType: body?.reportType || '',
		createdBy: body?.createdBy || '',
		pdfBuffer,
		contentType: 'application/pdf',
	};
};

const renderPinForm = (token: string, errorMessage?: string) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Enter PIN</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; }
    .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; max-width: 360px; width: 100%; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    p { font-size: 13px; margin: 0 0 16px; color: #475569; }
    .error { color: #b91c1c; background: #fee2e2; border: 1px solid #fecaca; padding: 8px 10px; border-radius: 8px; font-size: 12px; margin-bottom: 12px; }
    input { width: 100%; padding: 10px 12px; font-size: 16px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 12px; }
    button { width: 100%; padding: 10px 12px; font-size: 14px; border: none; background: #2563eb; color: white; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="wrap">
    <form class="card" method="get" action="/api/reports/share">
      <h1>Enter 4-digit PIN</h1>
      <p>This report is protected. Ask the sender for the PIN.</p>
      ${errorMessage ? `<div class="error">${errorMessage}</div>` : ''}
      <input type="hidden" name="token" value="${token}"/>
      <input type="text" name="pin" inputmode="numeric" pattern="\\d{4}" maxlength="4" placeholder="PIN" required />
      <button type="submit">View Report</button>
    </form>
  </div>
</body>
</html>`;

export async function POST(request: NextRequest) {
	try {
		const { cacheKey, fileName, reportType, createdBy, pdfBuffer, contentType } =
			await parseSharePayload(request);
		if (!fileName || !reportType) {
			return NextResponse.json(
				{ success: false, message: 'Missing required fields.' },
				{ status: 400 },
			);
		}

		const models = await getTenantModels();
		const { ReportShare } = models;

		let resolvedCacheKey = cacheKey;
		let resolvedBuffer = pdfBuffer;
		if (!resolvedCacheKey && !resolvedBuffer) {
			return NextResponse.json(
				{ success: false, message: 'Missing report payload.' },
				{ status: 400 },
			);
		}
		if (resolvedBuffer && !resolvedBuffer.length) {
			return NextResponse.json(
				{ success: false, message: 'Empty PDF payload.' },
				{ status: 400 },
			);
		}
		if (!resolvedBuffer && resolvedCacheKey) {
			const pdfPath = path.join(CACHE_DIR, `${resolvedCacheKey}.pdf`);
			try {
				resolvedBuffer = await fs.readFile(pdfPath);
			} catch {
				return NextResponse.json(
					{
						success: false,
						message: 'Cached report not available for sharing.',
					},
					{ status: 404 },
				);
			}
		}
		if (!resolvedCacheKey && resolvedBuffer) {
			resolvedCacheKey = crypto
				.createHash('sha256')
				.update(resolvedBuffer)
				.digest('hex');
		}

		const token = crypto.randomBytes(16).toString('hex');
		const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
		const pinHash = await bcrypt.hash(pin, 10);
		const expiresAt = new Date(Date.now() + SHARE_TTL_MS);

		await ReportShare.create({
			token,
			cacheKey: resolvedCacheKey,
			pdfData: resolvedBuffer,
			pdfSize: resolvedBuffer?.length || 0,
			contentType: contentType || 'application/pdf',
			pinHash,
			fileName,
			reportType,
			createdBy,
			expiresAt,
		});

		const origin = buildOrigin(request);
		const shareUrl = `${origin}/api/reports/share?token=${token}`;

		return NextResponse.json({
			success: true,
			shareUrl,
			pin,
			expiresAt,
			cacheKey: resolvedCacheKey,
		});
	} catch (error) {
		console.error('Error creating report share link:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to create share link.' },
			{ status: 500 },
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const token = searchParams.get('token');
		const pin = searchParams.get('pin');
		if (!token) {
			return NextResponse.json(
				{ success: false, message: 'Missing share token.' },
				{ status: 400 },
			);
		}

		const models = await getTenantModels();
		const { ReportShare } = models;

		const share = await ReportShare.findOne({ token }).lean();
		if (!share) {
			return NextResponse.json(
				{ success: false, message: 'Share link not found.' },
				{ status: 404 },
			);
		}
		if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) {
			await ReportShare.deleteOne({ token });
			return NextResponse.json(
				{ success: false, message: 'Share link expired.' },
				{ status: 410 },
			);
		}

		if (!pin) {
			return new NextResponse(renderPinForm(token), {
				status: 200,
				headers: { 'Content-Type': 'text/html; charset=utf-8' },
			});
		}

		const pinOk = await bcrypt.compare(pin, share.pinHash);
		if (!pinOk) {
			return new NextResponse(renderPinForm(token, 'Invalid PIN. Please try again.'), {
				status: 401,
				headers: { 'Content-Type': 'text/html; charset=utf-8' },
			});
		}

		const resolvePdfData = () => {
			if (!share.pdfData) return null;
			if (Buffer.isBuffer(share.pdfData)) return share.pdfData;
			if (
				typeof share.pdfData === 'object' &&
				share.pdfData.buffer &&
				typeof share.pdfData.byteLength === 'number'
			) {
				const byteOffset =
					typeof share.pdfData.byteOffset === 'number'
						? share.pdfData.byteOffset
						: 0;
				return Buffer.from(
					share.pdfData.buffer,
					byteOffset,
					share.pdfData.byteLength,
				);
			}
			if (share.pdfData.buffer) {
				try {
					return Buffer.from(share.pdfData.buffer);
				} catch {
					return null;
				}
			}
			if (share.pdfData.data) {
				try {
					return Buffer.from(share.pdfData.data);
				} catch {
					return null;
				}
			}
			return null;
		};

		const embeddedPdf = resolvePdfData();
		if (embeddedPdf && embeddedPdf.length) {
			return new NextResponse(embeddedPdf, {
				status: 200,
				headers: {
					'Content-Type': share.contentType || 'application/pdf',
					'Content-Disposition': `inline; filename="${share.fileName}"`,
					'Cache-Control': 'public, max-age=3600',
				},
			});
		}

		const pdfPath = path.join(CACHE_DIR, `${share.cacheKey}.pdf`);
		let cached: Buffer;
		try {
			cached = await fs.readFile(pdfPath);
		} catch {
			return NextResponse.json(
				{ success: false, message: 'Report not available.' },
				{ status: 404 },
			);
		}
		return new NextResponse(cached, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `inline; filename="${share.fileName}"`,
				'Cache-Control': 'public, max-age=3600',
			},
		});
	} catch (error) {
		console.error('Error serving shared report:', error);
		return NextResponse.json(
			{ success: false, message: 'Unable to serve report.' },
			{ status: 500 },
		);
	}
}
