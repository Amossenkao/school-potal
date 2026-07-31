import * as Sentry from '@sentry/nextjs';

import type { ErrorLogContext, RequestLogContext } from '@/lib/logger';

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
