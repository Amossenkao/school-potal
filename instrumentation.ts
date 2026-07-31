export async function register() {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		await import('./sentry.server.config');
	}

	if (process.env.NEXT_RUNTIME === 'edge') {
		await import('./sentry.edge.config');
	}
}

export const onRequestError = async (...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>) => {
	const Sentry = await import('@sentry/nextjs');
	const { recordApplicationError } = await import('@/lib/observability/applicationLog');
	const [error, request, context] = args as any[];

	await recordApplicationError(error, 'Unhandled request error', {
		requestId: request?.headers?.get?.('x-request-id') || undefined,
		method: request?.method,
		path: request?.url,
		module: context?.routerKind || 'next',
		operation: context?.routePath || 'next.unhandled_request_error',
	});

	return Sentry.captureRequestError(...args);
};
