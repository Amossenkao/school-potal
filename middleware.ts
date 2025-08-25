import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import findSchoolByHost from './lib/schoolStore';
import { getSession } from '@/utils/session';

export type UserRole = 'student' | 'teacher' | 'administrator' | 'system_admin';

function setSchoolCookies(response: NextResponse, school: any) {
	// Server-side cookies (httpOnly)
	response.cookies.set('x-school-id', school.profileId, {
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
	});
	response.cookies.set('x-school-name', school.name.toLowerCase(), {
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
	});
	response.cookies.set('x-db-name', school.dbName, {
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
	});

	// Client-accessible cookies (for client-side components)
	response.cookies.set('school-id', school.profileId, {
		httpOnly: false,
		path: '/',
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
	});
	response.cookies.set('school-name', school.name.toLowerCase(), {
		httpOnly: false,
		path: '/',
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
	});
}

function clearSchoolCookies(response: NextResponse) {
	response.cookies.delete('x-school-id');
	response.cookies.delete('x-school-name');
	response.cookies.delete('x-db-name');
	response.cookies.delete('school-id');
	response.cookies.delete('school-name');
}

export async function middleware(request: NextRequest) {
	const host = request.headers.get('host');

	if (!host) return NextResponse.next();

	const school = await findSchoolByHost(host);
	let response = NextResponse.next();
	console.log('SCHOOL:', school);

	// Set school information in cookies and headers
	if (school) {
		setSchoolCookies(response, school);

		// Add school info to request headers for all routes
		const requestHeaders = new Headers(request.headers);
		requestHeaders.set('x-tenant-host', host);
		requestHeaders.set('x-school-id', school.id);
		requestHeaders.set('x-school-name', school.name);
		requestHeaders.set('x-db-name', school.dbName);

		response = NextResponse.next({
			request: {
				headers: requestHeaders,
			},
		});

		// Re-apply cookies to the new response
		setSchoolCookies(response, school);

		console.log('School cookies and headers set for:', school.name);
	} else {
		clearSchoolCookies(response);
		console.log('No school found for host:', host, '- cookies cleared');

		// Optional: Redirect to a "school not found" page for certain routes
		// Uncomment if you want to handle missing schools
		/*
		if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
			return NextResponse.redirect(new URL('/school-not-found', request.url));
		}
		*/
	}

	return response;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder
		 */
		'/((?!_next/static|_next/image|favicon.ico|public).*)',
	],
};

export const getTenantFromRequest = (req: NextRequest): string | null => {
	// Try to get from headers first (set by middleware)
	const tenantHost = req.headers.get('x-tenant-host');
	if (tenantHost) return tenantHost;

	// Fallback to host header
	return req.headers.get('host');
};

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
