import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getR2StorageUsage, getRequestMetrics } from '@/lib/monitoring';
import { errorResponse } from '@/lib/observability/api';

import { authorizeMonitoringRequest } from '../auth';

export async function GET(request: NextRequest) {
	const auth = await authorizeMonitoringRequest(request);
	if (!auth.authorized) return auth.response;

	try {
		const [storage, requests] = await Promise.all([getR2StorageUsage(), getRequestMetrics()]);
		return NextResponse.json({ success: true, data: { ...storage, requestMetrics: requests } });
	} catch (error) {
		return errorResponse(request, error, 'Failed to load storage metrics', 500, 'monitoring.storage');
	}
}
