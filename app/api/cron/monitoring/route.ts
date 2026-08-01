import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { collectMonitoringSnapshot } from '@/lib/monitoring/collector';
import { errorResponse } from '@/lib/observability/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorizedCron(request: NextRequest) {
	if (process.env.VERCEL && request.headers.get('x-vercel-cron') === '1') {
		return true;
	}

	const secret = String(process.env.CRON_SECRET || '').trim();
	if (!secret) return false;

	const bearer = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
	const headerSecret = String(request.headers.get('x-cron-secret') || '').trim();

	return bearer === secret || headerSecret === secret;
}

export async function POST(request: NextRequest) {
	if (!isAuthorizedCron(request)) {
		return NextResponse.json({ success: false, message: 'Forbidden' }, {
			status: 403,
			headers: { 'Cache-Control': 'no-store' },
		});
	}

	try {
		const { summary } = await collectMonitoringSnapshot();
		return NextResponse.json(
			{
				success: true,
				generatedAt: summary.generatedAt,
				systemStatus: summary.systemStatus,
			},
			{ headers: { 'Cache-Control': 'no-store' } },
		);
	} catch (error) {
		return errorResponse(request, error, 'Failed to run monitoring collection', 500, 'monitoring.cron');
	}
}
