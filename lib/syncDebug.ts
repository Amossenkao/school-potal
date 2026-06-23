const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on', 'debug']);

const toNormalizedString = (value: unknown) =>
	String(value ?? '')
		.trim()
		.toLowerCase();

export const isSyncDebugEnabled = () =>
	TRUTHY_VALUES.has(toNormalizedString(process.env.SYNC_DEBUG_LOGS));

const buildPrefix = (scope: string) =>
	`[sync-debug][${scope}][${new Date().toISOString()}]`;

export const syncDebugLog = (
	scope: string,
	message: string,
	data?: Record<string, unknown>,
) => {
	if (!isSyncDebugEnabled()) return;
	if (data) {
		console.log(`${buildPrefix(scope)} ${message}`, data);
		return;
	}
	console.log(`${buildPrefix(scope)} ${message}`);
};

export const syncDebugWarn = (
	scope: string,
	message: string,
	data?: Record<string, unknown>,
) => {
	if (!isSyncDebugEnabled()) return;
	if (data) {
		console.warn(`${buildPrefix(scope)} ${message}`, data);
		return;
	}
	console.warn(`${buildPrefix(scope)} ${message}`);
};

export const syncDebugError = (
	scope: string,
	message: string,
	data?: Record<string, unknown>,
) => {
	if (!isSyncDebugEnabled()) return;
	if (data) {
		console.error(`${buildPrefix(scope)} ${message}`, data);
		return;
	}
	console.error(`${buildPrefix(scope)} ${message}`);
};
