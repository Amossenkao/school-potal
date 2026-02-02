type CacheEntry<T> = {
	value: T;
	expiresAt: number;
};

const clientCache = new Map<string, CacheEntry<any>>();

export const getClientCache = <T>(key: string): T | null => {
	if (typeof window === 'undefined') return null;
	const entry = clientCache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		clientCache.delete(key);
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
	clientCache.set(key, {
		value,
		expiresAt: Date.now() + ttlMs,
	});
};

export const clearClientCache = (key: string) => {
	if (typeof window === 'undefined') return;
	clientCache.delete(key);
};
