import { createLogger, type ErrorLogContext, type LogContext } from '@/lib/logger';
import { captureApplicationError, captureApplicationMessage } from '@/lib/observability/sentry';

type ApplicationLogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

interface RecordApplicationLogInput extends LogContext {
	level: ApplicationLogLevel;
	message: string;
	error?: unknown;
	metadata?: Record<string, unknown>;
	source?: string;
}

function normalizeError(error: unknown) {
	if (!error) return {};

	if (error instanceof Error) {
		return {
			errorName: error.name,
			errorDigest: 'digest' in error ? String(error.digest) : undefined,
			stackPreview: error.stack?.split('\n').slice(0, 8).join('\n'),
		};
	}

	return {
		errorName: typeof error,
		stackPreview: String(error),
	};
}

export async function recordApplicationLog(input: RecordApplicationLogInput) {
	const { level, message, error, metadata, source = 'application', ...context } = input;
	const logger = createLogger(context);
	const logPayload = { ...context, metadata, err: error };

	if (level === 'critical') {
		logger.fatal(logPayload, message);
	} else if (level === 'error') {
		logger.error(logPayload, message);
	} else if (level === 'warning') {
		logger.warn(logPayload, message);
	} else if (level === 'debug') {
		logger.debug(logPayload, message);
	} else {
		logger.info(logPayload, message);
	}

	if (level === 'error' || level === 'critical') {
		captureApplicationError(error ?? new Error(message), {
			...context,
			...normalizeError(error),
			source,
			metadata,
		});
	} else if (level === 'warning') {
		captureApplicationMessage(message, 'warning', {
			...context,
			source,
			metadata,
		});
	}
}

export async function recordApplicationError(
	error: unknown,
	message: string,
	context: ErrorLogContext = {},
) {
	await recordApplicationLog({
		...context,
		level: context.errorCode === 'CRITICAL' ? 'critical' : 'error',
		message,
		error,
	});
}
