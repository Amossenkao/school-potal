import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminClaimsFromRequest } from '@/lib/superAdminAuth';

export async function GET(request: NextRequest) {
	const claims = getSuperAdminClaimsFromRequest(request);
	if (!claims) {
		return NextResponse.json(
			{ success: false, message: 'Unauthorized' },
			{ status: 401 },
		);
	}

	return NextResponse.json({
		success: true,
		user: {
			role: claims.role,
			username: claims.username,
		},
	});
}
