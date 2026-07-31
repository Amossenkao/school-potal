import type { LogContext, LogLevel } from './types';

type BrowserLogPayload = LogContext & {
	service: 'schoolmesh';
	environment: string;
	version: string;
	timestamp: string;
	level: LogLevel;
	message: string;
};

const environment = process.env.NODE_ENV || 'development';
const version = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

function write(level: LogLevel, message: string, context?: LogContext) {
	const payload: BrowserLogPayload = {
		service: 'schoolmesh',
		environment,
		version,
		timestamp: new Date().toISOString(),
		level,
		message,
		...context,
	};

	const consoleMethod = level === 'fatal' ? 'error' : level;

	if (environment === 'production') {
		console[consoleMethod](JSON.stringify(payload));
		return;
	}

	console[consoleMethod](payload);
}

export const browserLogger = {
	trace: (message: string, context?: LogContext) => write('trace', message, context),
	debug: (message: string, context?: LogContext) => write('debug', message, context),
	info: (message: string, context?: LogContext) => write('info', message, context),
	warn: (message: string, context?: LogContext) => write('warn', message, context),
	error: (message: string, context?: LogContext) => write('error', message, context),
	fatal: (message: string, context?: LogContext) => write('fatal', message, context),
	child: (context: LogContext) => ({
		trace: (message: string, nextContext?: LogContext) =>
			write('trace', message, { ...context, ...nextContext }),
		debug: (message: string, nextContext?: LogContext) =>
			write('debug', message, { ...context, ...nextContext }),
		info: (message: string, nextContext?: LogContext) =>
			write('info', message, { ...context, ...nextContext }),
		warn: (message: string, nextContext?: LogContext) =>
			write('warn', message, { ...context, ...nextContext }),
		error: (message: string, nextContext?: LogContext) =>
			write('error', message, { ...context, ...nextContext }),
		fatal: (message: string, nextContext?: LogContext) =>
			write('fatal', message, { ...context, ...nextContext }),
	}),
};

export default browserLogger;
