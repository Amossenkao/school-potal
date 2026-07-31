import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { errorResponse } from '@/lib/observability/api';
import { getMongoClusterMetrics } from '@/lib/monitoring';
import {
	getLatestTenantDatabaseUsage,
	getTenantDatabaseGrowthTrend,
} from '@/lib/monitoring/collectors/mongodbCollector';

import { authorizeMonitoringRequest } from '../auth';

export async function GET(request: NextRequest) {
	const auth = await authorizeMonitoringRequest(request);
	if (!auth.authorized) return auth.response;

	const schoolId = request.nextUrl.searchParams.get('schoolId');

	try {
		const [cluster, tenants, history] = await Promise.all([
			getMongoClusterMetrics(),
			getLatestTenantDatabaseUsage(),
			getTenantDatabaseGrowthTrend(schoolId || undefined),
		]);

		const selected = schoolId
			? tenants.find((tenant) => tenant.schoolId === schoolId) || null
			: null;

		return NextResponse.json({
			success: true,
			data: {
				cluster,
				tenants,
				history: schoolId ? history : undefined,
				selected,
				generatedAt: new Date().toISOString(),
			},
		});
	} catch (error) {
		return errorResponse(request, error, 'Failed to load database monitoring', 500, 'monitoring.database');
	}
}
