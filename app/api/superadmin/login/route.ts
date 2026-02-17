import { NextRequest, NextResponse } from 'next/server';
import {
	createSuperAdminToken,
	setSuperAdminCookie,
} from '@/lib/superAdminAuth';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json().catch(() => ({}));
		const username = String(body?.username || 'super_admin').trim() || 'super_admin';

		const token = createSuperAdminToken(username);
		const response = NextResponse.json({
			success: true,
			message: 'Super admin login successful.',
			user: {
				role: 'super_admin',
				username,
			},
		});

		setSuperAdminCookie(response, token);
		return response;
	} catch (error) {
		console.error('[superadmin/login] Failed:', error);
		return NextResponse.json(
			{ success: false, message: 'Unable to login super admin.' },
			{ status: 500 },
		);
	}
}
