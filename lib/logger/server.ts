import type { IncomingMessage, ServerResponse } from 'node:http';
import pino from 'pino';
import pinoHttp from 'pino-http';

import type {
	LogContext,
	LogEnvironment,
	LoggerBindings,
	RequestLogContext,
	SchoolMeshLogger,
} from './types';

const environment = (process.env.NODE_ENV || 'development') as LogEnvironment;
const version = process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version || '1.0.0';
const level = process.env.LOG_LEVEL || (environment === 'production' ? 'info' : 'debug');

const base: LoggerBindings = {
	service: 'schoolmesh',
	environment,
	version,
};

const transport =
	environment === 'development'
		? {
				target: 'pino-pretty',
				options: {
					colorize: true,
					ignore: 'pid,hostname',
					messageKey: 'message',
					translateTime: 'SYS:standard',
				},
			}
		: undefined;

export const serverLogger: SchoolMeshLogger = pino({
	base,
	level,
	messageKey: 'message',
	timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
	transport,
	redact: {
		paths: [
			'req.headers.authorization',
			'req.headers.cookie',
			'request.headers.authorization',
			'request.headers.cookie',
			'password',
			'token',
			'accessToken',
			'refreshToken',
			'secret',
			'*.password',
			'*.token',
			'*.accessToken',
			'*.refreshToken',
			'*.secret',
		],
		censor: '[REDACTED]',
	},
});

export function createLogger(context?: LogContext): SchoolMeshLogger {
	return context ? serverLogger.child(context) : serverLogger;
}

export function createRequestLogger(context?: RequestLogContext) {
	return pinoHttp({
		logger: createLogger(context),
		customProps(req: IncomingMessage, res: ServerResponse) {
			return {
				...context,
				method: req.method,
				path: req.url,
				statusCode: res.statusCode,
			};
		},
		customSuccessMessage() {
			return 'request completed';
		},
		customErrorMessage() {
			return 'request failed';
		},
	});
}

export function logApplicationError(
	error: unknown,
	message: string,
	context?: LogContext,
) {
	createLogger(context).error({ err: error }, message);
}

export default serverLogger;
