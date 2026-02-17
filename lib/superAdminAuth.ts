import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export const SUPER_ADMIN_COOKIE_NAME = 'superAdminSession';

const SUPER_ADMIN_SECRET =
	process.env.SUPER_ADMIN_JWT_SECRET ||
	process.env.JWT_SECRET ||
	'super-admin-dev-secret';

const SUPER_ADMIN_TOKEN_TTL_SECONDS = 60 * 60 * 12;

export interface SuperAdminClaims {
	role: 'super_admin';
	username: string;
	iat?: number;
	exp?: number;
}

export const createSuperAdminToken = (username: string) =>
	jwt.sign(
		{
			role: 'super_admin',
			username,
		},
		SUPER_ADMIN_SECRET,
		{ expiresIn: SUPER_ADMIN_TOKEN_TTL_SECONDS },
	) as string;

export const verifySuperAdminToken = (
	token?: string | null,
): SuperAdminClaims | null => {
	if (!token) return null;

	try {
		const decoded = jwt.verify(token, SUPER_ADMIN_SECRET) as SuperAdminClaims;
		if (decoded?.role !== 'super_admin') return null;
		return decoded;
	} catch {
		return null;
	}
};

export const setSuperAdminCookie = (response: NextResponse, token: string) => {
	response.cookies.set(SUPER_ADMIN_COOKIE_NAME, token, {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: SUPER_ADMIN_TOKEN_TTL_SECONDS,
		secure: process.env.NODE_ENV === 'production',
	});
};

export const clearSuperAdminCookie = (response: NextResponse) => {
	response.cookies.set(SUPER_ADMIN_COOKIE_NAME, '', {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		expires: new Date(0),
		secure: process.env.NODE_ENV === 'production',
	});
};

export const getSuperAdminClaimsFromRequest = (
	request: NextRequest,
): SuperAdminClaims | null => {
	const token = request.cookies.get(SUPER_ADMIN_COOKIE_NAME)?.value;
	return verifySuperAdminToken(token);
};
