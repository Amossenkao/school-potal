import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getSentryIssueDetail } from '@/lib/monitoring';
import { errorResponse } from '@/lib/observability/api';

import { authorizeMonitoringRequest } from '../../auth';

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ issueId: string }> },
) {
	const auth = await authorizeMonitoringRequest(request);
	if (!auth.authorized) return auth.response;

	const { issueId } = await params;

	try {
		const detail = await getSentryIssueDetail(issueId);

		if (!detail) {
			return NextResponse.json(
				{ success: false, message: 'Issue not found' },
				{ status: 404, headers: { 'Cache-Control': 'no-store' } },
			);
		}

		return NextResponse.json(
			{ success: true, data: detail },
			{ headers: { 'Cache-Control': 'no-store' } },
		);
	} catch (error) {
		return errorResponse(request, error, 'Failed to load issue details', 500, 'monitoring.errors.detail');
	}
}
