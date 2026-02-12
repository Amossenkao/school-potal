import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import path from 'path';
import { promises as fs } from 'fs';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';

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

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

const renderPinForm = ({
	token,
	errorMessage,
	schoolName,
	logoUrl,
}: {
	token: string;
	errorMessage?: string;
	schoolName?: string;
	logoUrl?: string;
}) => `<!doctype html>
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
    .portal-label { font-size: 11px; color: #1d4ed8; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; text-align: center; margin: 0 0 10px; }
    .school { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 12px; }
    .logo img { width: 50px; height: 50px; object-fit: contain; border-radius: 8px; background: #fff; border: 1px solid #e2e8f0; padding: 4px; }
    .school-name { font-size: 14px; font-weight: 700; text-align: center; color: #0f172a; margin: 0; }
    .error { color: #b91c1c; background: #fee2e2; border: 1px solid #fecaca; padding: 8px 10px; border-radius: 8px; font-size: 12px; margin-bottom: 12px; }
    input { width: 100%; padding: 10px 12px; font-size: 16px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 12px; }
    button { width: 100%; padding: 10px 12px; font-size: 14px; border: none; background: #2563eb; color: white; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="wrap">
    <form class="card" method="get" action="/api/reports/share">
      <p class="portal-label">Report Sharing Portal</p>
      ${
				schoolName || logoUrl
					? `<div class="school">
          ${
						logoUrl
							? `<div class="logo">
            <img src="${escapeHtml(logoUrl)}" alt="School Logo" />
          </div>`
							: ''
					}
          ${
						schoolName
							? `<p class="school-name">${escapeHtml(schoolName)}</p>`
							: ''
					}
        </div>`
					: ''
			}
      <h1>Enter 4-digit PIN</h1>
      <p>This report is protected. Ask the sender for the PIN.</p>
      ${errorMessage ? `<div class="error">${errorMessage}</div>` : ''}
      <input type="hidden" name="token" value="${escapeHtml(token)}"/>
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
		const school = await getSchoolProfile();
		const schoolName =
			typeof school?.name === 'string' ? school.name : undefined;
		const logoUrl = (
			typeof school?.logoUrl2 === 'string' && school.logoUrl2
				? school.logoUrl2
				: typeof school?.logoUrl === 'string'
					? school.logoUrl
					: undefined
		);

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
			return new NextResponse(renderPinForm({ token, schoolName, logoUrl }), {
				status: 200,
				headers: { 'Content-Type': 'text/html; charset=utf-8' },
			});
		}

		const pinOk = await bcrypt.compare(pin, share.pinHash);
		if (!pinOk) {
			return new NextResponse(
				renderPinForm({
					token,
					errorMessage: 'Invalid PIN. Please try again.',
					schoolName,
					logoUrl,
				}),
				{
					status: 401,
					headers: { 'Content-Type': 'text/html; charset=utf-8' },
				},
			);
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
