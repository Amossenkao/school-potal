import { createLogger, type ErrorLogContext, type LogContext } from '@/lib/logger';
import { captureApplicationError } from '@/lib/observability/sentry';
import { getSchoolMeshModels } from '@/models/schoolmesh';

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

	try {
		const { ApplicationLog } = await getSchoolMeshModels();
		await ApplicationLog.create({
			level,
			message,
			...context,
			...normalizeError(error),
			source,
			metadata,
		});
	} catch (writeError) {
		logger.warn({ err: writeError }, 'failed to persist application log');
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

	captureApplicationError(error, context);
}
