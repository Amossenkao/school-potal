import type { NextRequest } from 'next/server';

import type { RequestLogContext } from '@/lib/logger';

export function getRequestId(request: NextRequest): string {
	return (
		request.headers.get('x-request-id') ||
		request.headers.get('x-correlation-id') ||
		crypto.randomUUID()
	);
}

export function getTenantContext(request: NextRequest): RequestLogContext {
	const host = request.headers.get('host')?.split(':')[0].toLowerCase();
	const schoolSlug = host?.split('.')[0];

	return {
		tenantId: host,
		schoolSlug,
	};
}

export function getUserContext(request: NextRequest): RequestLogContext {
	const userId = request.headers.get('x-schoolmesh-user-id') || undefined;
	const role = request.headers.get('x-schoolmesh-user-role') || undefined;

	return {
		userId,
		role,
	};
}

export function getRequestContext(
	request: NextRequest,
	requestId = getRequestId(request),
): RequestLogContext {
	return {
		requestId,
		method: request.method,
		path: request.nextUrl.pathname,
		ip:
			request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
			request.headers.get('x-real-ip') ||
			undefined,
		userAgent: request.headers.get('user-agent') || undefined,
		...getTenantContext(request),
		...getUserContext(request),
	};
}
