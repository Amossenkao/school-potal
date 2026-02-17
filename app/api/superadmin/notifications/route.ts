import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminClaimsFromRequest } from '@/lib/superAdminAuth';
import { getSuperAdminNotifications } from '@/lib/superAdminNotifications';

export async function GET(request: NextRequest) {
	const claims = getSuperAdminClaimsFromRequest(request);
	if (!claims) {
		return NextResponse.json(
			{ success: false, message: 'Unauthorized' },
			{ status: 401 },
		);
	}

	const { searchParams } = new URL(request.url);
	const limit = Number.parseInt(searchParams.get('limit') || '100', 10);
	const notifications = await getSuperAdminNotifications(limit);

	return NextResponse.json({
		success: true,
		notifications,
	});
}
