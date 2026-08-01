import * as Sentry from '@sentry/nextjs';

import type { ErrorLogContext, LogContext, RequestLogContext } from '@/lib/logger';

export function configureSentryScope(context: RequestLogContext) {
	Sentry.setContext('schoolmesh', {
		requestId: context.requestId,
		tenantId: context.tenantId,
		schoolId: context.schoolId,
		schoolSlug: context.schoolSlug,
	});

	if (context.userId || context.role) {
		Sentry.setUser({
			id: context.userId,
			role: context.role,
		});
	}

	if (context.requestId) {
		Sentry.setTag('requestId', context.requestId);
	}

	if (context.tenantId) {
		Sentry.setTag('tenantId', context.tenantId);
	}
}

export function captureApplicationError(error: unknown, context?: ErrorLogContext) {
	if (context) {
		configureSentryScope(context);
	}

	return Sentry.captureException(error, {
		tags: {
			requestId: context?.requestId,
			tenantId: context?.tenantId,
			schoolId: context?.schoolId,
			schoolSlug: context?.schoolSlug,
			operation: context?.operation,
			errorCode: context?.errorCode,
		},
		extra: context,
	});
}

export function captureApplicationMessage(
	message: string,
	level: 'info' | 'warning' | 'error',
	context?: LogContext,
) {
	if (context) {
		configureSentryScope(context);
	}

	return Sentry.captureMessage(message, {
		level,
		tags: {
			requestId: context?.requestId ? String(context.requestId) : undefined,
			tenantId: context?.tenantId ? String(context.tenantId) : undefined,
			schoolId: context?.schoolId ? String(context.schoolId) : undefined,
			schoolSlug: context?.schoolSlug ? String(context.schoolSlug) : undefined,
			operation: context?.operation ? String(context.operation) : undefined,
			errorCode: context?.errorCode ? String(context.errorCode) : undefined,
			module: context?.module ? String(context.module) : undefined,
		},
		extra: context,
	});
}
