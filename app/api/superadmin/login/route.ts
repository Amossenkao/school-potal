import { NextRequest, NextResponse } from 'next/server';
import {
	createSuperAdminToken,
	setSuperAdminCookie,
} from '@/lib/superAdminAuth';

const DEMO_SUPER_ADMIN_USERNAME = 'super_admin';
const DEMO_SUPER_ADMIN_PASSWORD = 'senkao91';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json().catch(() => ({}));
		const username = String(body?.username || '').trim();
		const password = String(body?.password || '');

		if (
			username !== DEMO_SUPER_ADMIN_USERNAME ||
			password !== DEMO_SUPER_ADMIN_PASSWORD
		) {
			return NextResponse.json(
				{
					success: false,
					message: 'Invalid super admin credentials.',
				},
				{ status: 401 },
			);
		}

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
