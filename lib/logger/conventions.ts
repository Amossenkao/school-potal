import type { LogLevel } from './types';

export const logLevels: Record<string, LogLevel> = {
	trace: 'trace',
	debug: 'debug',
	info: 'info',
	warn: 'warn',
	error: 'error',
	fatal: 'fatal',
};

export const logMessages = {
	requestCompleted: 'request completed',
	requestFailed: 'request failed',
	authenticationFailed: 'authentication failed',
	authorizationDenied: 'authorization denied',
	tenantResolutionFailed: 'tenant resolution failed',
	operationFailed: 'operation failed',
} as const;

export const logFields = {
	requestId: 'requestId',
	tenantId: 'tenantId',
	schoolId: 'schoolId',
	schoolSlug: 'schoolSlug',
	userId: 'userId',
	role: 'role',
	method: 'method',
	path: 'path',
	statusCode: 'statusCode',
	duration: 'duration',
	operation: 'operation',
	errorCode: 'errorCode',
} as const;
