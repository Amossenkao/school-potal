import type { LogContext } from './types';

export * from './types';
export { logFields, logLevels, logMessages } from './conventions';
export { browserLogger } from './browser';
export { createLogger, createRequestLogger, logApplicationError, serverLogger } from './server';
export { getLogContext, mergeLogContext, runWithLogContext } from './context';

export async function logger(context?: LogContext) {
	if (typeof window === 'undefined') {
		const { createLogger } = await import('./server');

		return createLogger(context);
	}

	const { browserLogger } = await import('./browser');

	return context ? browserLogger.child(context) : browserLogger;
}
