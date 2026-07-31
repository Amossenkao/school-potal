import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getMonitoringSummary } from '@/lib/monitoring';
import { collectMonitoringSnapshot } from '@/lib/monitoring/collector';
import { errorResponse } from '@/lib/observability/api';
import { getSchoolMeshModels } from '@/models/schoolmesh';

import { authorizeMonitoringRequest } from '../auth';

export async function GET(request: NextRequest) {
	const auth = await authorizeMonitoringRequest(request);
	if (!auth.authorized) return auth.response;

	const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

	try {
		if (refresh) {
			const collected = await collectMonitoringSnapshot();
			return NextResponse.json({ success: true, data: collected.summary });
		}

		const { MonitoringSnapshot } = await getSchoolMeshModels();
		const latest = await MonitoringSnapshot.findOne().sort({ timestamp: -1 }).lean();

		if (latest) {
			return NextResponse.json({ success: true, data: latest, cached: true });
		}

		const summary = await getMonitoringSummary();
		return NextResponse.json({ success: true, data: summary, cached: false });
	} catch (error) {
		return errorResponse(request, error, 'Failed to load monitoring overview', 500, 'monitoring.overview');
	}
}
