import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/utils/session';
import { UserRole } from './types';
import { getTenantModels } from '@/models';
import { getSchoolMeshModels } from '@/models/schoolmesh';
import { getSchoolProfile } from '@/lib/mongoose';

// Marketing-only routes that should NOT be accessible on school hosts
const SCHOOLMESH_ONLY_ROUTES = ['/brochure'];

// Routes that should always be skipped (API, static, etc.)
const SKIP_PREFIXES = ['/api', '/_next', '/images', '/fonts'];

function isSchoolMeshHost(host: string): boolean {
	const h = host.toLowerCase().split(':')[0];
	const normalized = h.replace(/[-_]/g, '');
	return normalized.includes('schoolmesh');
}

export default async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const host = request.headers.get('host') || '';

	if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
		return NextResponse.next();
	}

const schoolMesh = isSchoolMeshHost(host);

if (
	!schoolMesh &&
	SCHOOLMESH_ONLY_ROUTES.some((route) => pathname.startsWith(route))
) {
	try {
		const profile = await getSchoolProfile({ host });

		if (profile) {
			const url = request.nextUrl.clone();
			url.pathname = '/__404__';
			return NextResponse.rewrite(url);
		}
	} catch {
		const url = request.nextUrl.clone();
		url.pathname = '/__404__';
		return NextResponse.rewrite(url);
	}
}

return NextResponse.next();
}

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

	// 3. Handle superadmin sessions (schoolmesh database)
	if (session.role === 'superadmin') {
		const { SuperAdmin } = await getSchoolMeshModels();
		const currentUser = await SuperAdmin.findById(session.id)
			.select('isActive role')
			.lean();
		if (!currentUser || currentUser.isActive === false) {
			throw new Error('User account is inactive');
		}
		return session;
	}

	// 4. Handle school user sessions (tenant database)
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

	// 5. Return session data as authenticated user
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
