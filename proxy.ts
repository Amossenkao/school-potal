import type { NextRequest } from 'next/server';
import { getSession } from '@/utils/session';
import { UserRole } from './types';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';

export default function proxy() {}

export interface AuthenticatedUser {
	id: string;
	username: string;
	role: string;
	userId: string;
	tenantHost: string;
	[key: string]: any;
}

export async function authenticateRequest(
	request: NextRequest,
): Promise<AuthenticatedUser> {
	// 1. Get sessionId from cookie
	const sessionId = request.cookies.get('sessionId')?.value;

	if (!sessionId) {
		throw new Error('No session ID provided');
	}

	// 2. Look up session using getSession
	const session = (await getSession(sessionId)) as any;

	if (!session || !session.id) {
		throw new Error('Invalid or expired session');
	}

	const requestHost = request.headers.get('host')?.split(':')[0];
	const sessionHost =
		typeof session.tenantId === 'string'
			? session.tenantId.split(':')[0]
			: session.tenantId;
	if (sessionHost && sessionHost !== requestHost) {
		throw new Error('Invalid tenant access');
	}

	const schoolProfile = await getSchoolProfile();
	if (schoolProfile?.isActive === false) {
		throw new Error('School is inactive');
	}

	const models = await getTenantModels();
	const currentUser = await models.User.findById(session.id)
		.select('isActive role')
		.lean();
	if (!currentUser || currentUser.isActive === false) {
		throw new Error('User account is inactive');
	}

	// 4. Return session data as authenticated user
	return session;
}

export async function authorizeUser(
	request: NextRequest,
	requiredRoles?: UserRole[] | UserRole,
) {
	let user;

	try {
		user = await authenticateRequest(request);
		if (
			(Array.isArray(requiredRoles) &&
				!requiredRoles.includes(user.role as UserRole)) ||
			(typeof requiredRoles === 'string' && user.role !== requiredRoles)
		) {
			return false;
		}
	} catch {
		return false;
	}

	return user;
}
