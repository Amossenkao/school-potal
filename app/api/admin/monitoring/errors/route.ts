import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getRecentErrors, getErrorSummary } from '@/lib/monitoring';
import { errorResponse } from '@/lib/observability/api';
import { getSchoolMeshModels } from '@/models/schoolmesh';

import { authorizeMonitoringRequest } from '../auth';

export async function GET(request: NextRequest) {
	const auth = await authorizeMonitoringRequest(request);
	if (!auth.authorized) return auth.response;

	const severity = request.nextUrl.searchParams.get('severity');
	const moduleName = request.nextUrl.searchParams.get('module');
	const schoolId = request.nextUrl.searchParams.get('schoolId');

	try {
		const [summary, errors, { SystemAlert }] = await Promise.all([
			getErrorSummary().catch(() => ({
				total: 0,
				critical: 0,
				last24Hours: 0,
				affectedSchools: [],
			})),
			getRecentErrors().catch(() => []),
			getSchoolMeshModels(),
		]);
		const alertQuery: Record<string, unknown> = { resolved: false };
		if (severity) alertQuery.severity = severity;
		if (moduleName) alertQuery.module = moduleName;
		if (schoolId) alertQuery.schoolId = schoolId;

		const alerts = await SystemAlert.find(alertQuery).sort({ createdAt: -1 }).limit(50).lean();

		return NextResponse.json({ success: true, data: { summary, errors, alerts } });
	} catch (error) {
		return errorResponse(request, error, 'Failed to load error monitoring', 500, 'monitoring.errors');
	}
}
