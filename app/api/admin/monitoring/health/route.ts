import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getHealthSummary } from '@/lib/monitoring';
import { errorResponse } from '@/lib/observability/api';

import { authorizeMonitoringRequest } from '../auth';

export async function GET(request: NextRequest) {
	const auth = await authorizeMonitoringRequest(request);
	if (!auth.authorized) return auth.response;

	try {
		const health = await getHealthSummary();
		return NextResponse.json({ success: true, data: health });
	} catch (error) {
		return errorResponse(request, error, 'Failed to load health status', 500, 'monitoring.health');
	}
}
