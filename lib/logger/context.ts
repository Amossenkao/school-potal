import type { AsyncLocalStorage } from 'node:async_hooks';

import type { LogContext } from './types';

let serverContext: AsyncLocalStorage<LogContext> | undefined;

const isServer = typeof window === 'undefined';

async function getServerContext() {
	if (!isServer) {
		return undefined;
	}

	if (!serverContext) {
		const { AsyncLocalStorage } = await import('node:async_hooks');
		serverContext = new AsyncLocalStorage<LogContext>();
	}

	return serverContext;
}

export async function runWithLogContext<T>(
	context: LogContext,
	callback: () => T | Promise<T>,
): Promise<T> {
	const storage = await getServerContext();

	if (!storage) {
		return callback();
	}

	return storage.run(context, callback);
}

export async function getLogContext(): Promise<LogContext> {
	const storage = await getServerContext();

	return storage?.getStore() ?? {};
}

export function mergeLogContext(
	baseContext: LogContext,
	nextContext?: LogContext,
): LogContext {
	return {
		...baseContext,
		...nextContext,
	};
}
