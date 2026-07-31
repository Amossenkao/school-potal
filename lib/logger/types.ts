import type { Logger } from 'pino';

export type LogEnvironment = 'development' | 'test' | 'staging' | 'production';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerBindings {
	service: 'schoolmesh';
	environment: LogEnvironment;
	version: string;
}

export interface RequestLogContext extends Record<string, unknown> {
	requestId?: string;
	tenantId?: string;
	schoolId?: string;
	schoolSlug?: string;
	userId?: string;
	role?: string;
	method?: string;
	path?: string;
	statusCode?: number;
	duration?: number;
	ip?: string;
	userAgent?: string;
}

export interface ErrorLogContext extends RequestLogContext {
	errorCode?: string;
	operation?: string;
}

export type LogContext = ErrorLogContext & Record<string, unknown>;

export type SchoolMeshLogger = Logger;
