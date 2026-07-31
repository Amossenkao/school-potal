import type { LogLevel, RequestLogContext } from '@/lib/logger';

const environment = process.env.NODE_ENV || 'development';
const version = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

const levelNumbers: Record<LogLevel, number> = {
	trace: 10,
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	fatal: 60,
};

export function logEdgeRequest(level: LogLevel, message: string, context: RequestLogContext) {
	const payload = {
		level: levelNumbers[level],
		service: 'schoolmesh',
		environment,
		version,
		timestamp: new Date().toISOString(),
		...context,
		message,
	};

	const consoleMethod = level === 'fatal' ? 'error' : level;
	console[consoleMethod](JSON.stringify(payload));
}
