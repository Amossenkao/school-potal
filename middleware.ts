import type { NextRequest } from 'next/server';
import { getSession } from '@/utils/session';
import { UserRole } from './types';

export default function middleware() {}

export interface AuthenticatedUser {
	id: string;
	username: string;
	role: string;
	userId: string;
	tenantHost: string;
	[key: string]: any;
}

export async function authenticateRequest(
	request: NextRequest
): Promise<AuthenticatedUser> {
	// 1. Get sessionId from cookie
	const sessionId = request.cookies.get('sessionId')?.value;

	if (!sessionId) {
		throw new Error('No session ID provided');
	}

	// 2. Look up session using getSession
	const session = (await getSession(sessionId)) as any;

	if (!session || !session.userId) {
		throw new Error('Invalid or expired session');
	}

	const requestHost = request.headers.get('host');
	if (session.tenantId && session.tenantId !== requestHost) {
		throw new Error('Invalid tenant access');
	}

	// 4. Return session data as authenticated user
	return session;
}

export async function authorizeUser(
	request: NextRequest,
	requiredRoles?: UserRole[]
) {
	let user;

	try {
		user = await authenticateRequest(request);
		if (
			Array.isArray(requiredRoles) &&
			!requiredRoles.includes(user.role as UserRole)
		) {
			return false;
		}
	} catch {
		return false;
	}

	return user;
}
