type CacheEntry<T> = {
	value: T;
	expiresAt: number;
};

const clientCache = new Map<string, CacheEntry<any>>();
const STORAGE_PREFIX = 'school_portal_client_cache:';

const readStoredEntry = <T>(key: string): CacheEntry<T> | null => {
	if (typeof window === 'undefined') return null;
	try {
		const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as CacheEntry<T>;
		if (
			!parsed ||
			typeof parsed !== 'object' ||
			typeof parsed.expiresAt !== 'number'
		) {
			window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
};

const writeStoredEntry = <T>(key: string, entry: CacheEntry<T>) => {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(
			`${STORAGE_PREFIX}${key}`,
			JSON.stringify(entry),
		);
	} catch {
		// Ignore localStorage quota / serialization errors.
	}
};

export const getClientCache = <T>(key: string): T | null => {
	if (typeof window === 'undefined') return null;
	let entry = clientCache.get(key) as CacheEntry<T> | undefined;
	if (!entry) {
		const persistedEntry = readStoredEntry<T>(key);
		if (persistedEntry) {
			clientCache.set(key, persistedEntry);
			entry = persistedEntry;
		}
	}
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		clientCache.delete(key);
		try {
			window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
		} catch {
			// Ignore storage errors.
		}
		return null;
	}
	return entry.value as T;
};

export const setClientCache = <T>(
	key: string,
	value: T,
	ttlMs = 1000 * 60 * 5
) => {
	if (typeof window === 'undefined') return;
	const entry: CacheEntry<T> = {
		value,
		expiresAt: Date.now() + ttlMs,
	};
	clientCache.set(key, entry);
	writeStoredEntry(key, entry);
};

export const clearClientCache = (key: string) => {
	if (typeof window === 'undefined') return;
	clientCache.delete(key);
	try {
		window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
	} catch {
		// Ignore storage errors.
	}
};
