import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getRecentLogs } from '@/lib/monitoring';
import { errorResponse } from '@/lib/observability/api';
import { getSchoolMeshModels } from '@/models/schoolmesh';

import { authorizeMonitoringRequest } from '../auth';

export async function GET(request: NextRequest) {
	const auth = await authorizeMonitoringRequest(request);
	if (!auth.authorized) return auth.response;

	const severity = request.nextUrl.searchParams.get('severity');
	const moduleName = request.nextUrl.searchParams.get('module');
	const schoolId = request.nextUrl.searchParams.get('schoolId');
	const dateFrom = request.nextUrl.searchParams.get('dateFrom');
	const dateTo = request.nextUrl.searchParams.get('dateTo');
	const requestId = request.nextUrl.searchParams.get('requestId');

	try {
		const { ApplicationLog } = await getSchoolMeshModels();
		const providerLogs = await getRecentLogs().catch((error) => ({
			summary: { errors: 0, warnings: 0 },
			entries: [{
				id: 'betterstack-unavailable',
				timestamp: new Date().toISOString(),
				level: 'warning' as const,
				message: error instanceof Error ? error.message : 'Better Stack logs unavailable',
				module: 'observability',
				source: 'betterstack',
			}],
		}));
		const query: Record<string, unknown> = {};

		if (severity) {
			query.level = severity === 'critical' ? 'critical' : severity;
		}

		if (moduleName) query.module = moduleName;
		if (schoolId) query.$or = [{ schoolId }, { schoolSlug: schoolId }, { tenantId: schoolId }];
		if (requestId) query.requestId = requestId;
		if (dateFrom || dateTo) {
			query.createdAt = {
				...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
				...(dateTo ? { $lte: new Date(dateTo) } : {}),
			};
		}

		const applicationLogs = await ApplicationLog.find(query).sort({ createdAt: -1 }).limit(100).lean();
		const normalizedApplicationLogs = applicationLogs.map((log: any) => ({
			id: String(log._id),
			timestamp: log.createdAt?.toISOString?.() || new Date().toISOString(),
			level: log.level === 'critical' ? 'error' : log.level,
			message: log.message,
			requestId: log.requestId,
			schoolId: log.schoolId,
			schoolName: log.schoolName,
			tenantId: log.tenantId,
			module: log.module,
			operation: log.operation,
			path: log.path,
			method: log.method,
			statusCode: log.statusCode,
			errorName: log.errorName,
			errorCode: log.errorCode,
			stackPreview: log.stackPreview,
			source: log.source,
		}));

		const entries = [...normalizedApplicationLogs, ...providerLogs.entries]
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
			.slice(0, 100);
		const summary = {
			errors: entries.filter((entry) => entry.level === 'error').length,
			warnings: entries.filter((entry) => entry.level === 'warning').length,
		};

		return NextResponse.json({
			success: true,
			data: {
				summary,
				entries,
				sources: {
					application: normalizedApplicationLogs.length,
					betterstack: providerLogs.entries.length,
				},
			},
		});
	} catch (error) {
		return errorResponse(request, error, 'Failed to load logs', 500, 'monitoring.logs');
	}
}
