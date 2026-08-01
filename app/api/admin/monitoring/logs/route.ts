import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getRecentLogs, getRecentApplicationLogs } from '@/lib/monitoring';
import { errorResponse } from '@/lib/observability/api';
import type { RecentLog } from '@/lib/monitoring/types';

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

		const sentryLogs = await getRecentApplicationLogs().catch(() => []);

		const matchesFilters = (log: RecentLog) => {
			if (severity && log.level !== severity && !(severity === 'critical' && log.level === 'error')) {
				return false;
			}
			if (moduleName && log.module !== moduleName) return false;
			if (schoolId && log.schoolId !== schoolId && log.tenantId !== schoolId && log.schoolName !== schoolId) {
				return false;
			}
			if (requestId && log.requestId !== requestId) return false;
			if (dateFrom && new Date(log.timestamp) < new Date(dateFrom)) return false;
			if (dateTo && new Date(log.timestamp) > new Date(dateTo)) return false;
			return true;
		};

		const entries = [...sentryLogs.filter(matchesFilters), ...providerLogs.entries.filter(matchesFilters)]
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
					sentry: sentryLogs.length,
					betterstack: providerLogs.entries.length,
				},
			},
		}, { headers: { 'Cache-Control': 'no-store' } });
	} catch (error) {
		return errorResponse(request, error, 'Failed to load logs', 500, 'monitoring.logs');
	}
}
