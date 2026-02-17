import { NextResponse } from 'next/server';
import { clearSuperAdminCookie } from '@/lib/superAdminAuth';

export async function POST() {
	const response = NextResponse.json({
		success: true,
		message: 'Super admin logged out.',
	});
	clearSuperAdminCookie(response);
	return response;
}
