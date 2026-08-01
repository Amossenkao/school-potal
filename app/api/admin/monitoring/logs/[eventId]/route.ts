import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getSentryEventDetail } from '@/lib/monitoring';
import { getIncidentDetail } from '@/lib/monitoring/betterstack';
import { errorResponse } from '@/lib/observability/api';

import { authorizeMonitoringRequest } from '../../auth';

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	const auth = await authorizeMonitoringRequest(request);
	if (!auth.authorized) return auth.response;

	const { eventId } = await params;
	const source = request.nextUrl.searchParams.get('source');

	try {
		const isBetterStack = source === 'betterstack';
		const detail = isBetterStack
			? await getIncidentDetail(eventId)
			: await getSentryEventDetail(eventId);

		if (!detail) {
			return NextResponse.json(
				{ success: false, message: 'Log entry not found' },
				{ status: 404, headers: { 'Cache-Control': 'no-store' } },
			);
		}

		return NextResponse.json(
			{ success: true, data: detail, source: isBetterStack ? 'betterstack' : 'sentry' },
			{ headers: { 'Cache-Control': 'no-store' } },
		);
	} catch (error) {
		return errorResponse(request, error, 'Failed to load log details', 500, 'monitoring.logs.detail');
	}
}
