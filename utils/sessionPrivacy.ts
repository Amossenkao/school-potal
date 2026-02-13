const SENSITIVE_LOCALSTORAGE_KEYS = new Set([
	'auth-user',
	'school_portal_offline_requests',
	'school-cache-v2',
]);

const SENSITIVE_LOCALSTORAGE_PREFIXES = [
	'api-json:',
	'school_portal_client_cache:',
	'schedule:',
];

const SENSITIVE_CACHE_PREFIXES = ['api-', 'runtime-'];
const SENSITIVE_CACHE_NAMES = new Set(['api-runtime-v1']);

const SENSITIVE_INDEXEDDB_NAMES = [
	'school-domain-cache',
	'school-portal',
	'pwa-queue',
];

const deleteIndexedDb = async (name: string) => {
	if (typeof window === 'undefined' || !('indexedDB' in window)) return;
	await new Promise<void>((resolve) => {
		const request = window.indexedDB.deleteDatabase(name);
		request.onsuccess = () => resolve();
		request.onerror = () => resolve();
		request.onblocked = () => resolve();
	});
};

const clearLocalStorageSensitiveData = () => {
	if (typeof window === 'undefined') return;
	try {
		for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
			const key = window.localStorage.key(i);
			if (!key) continue;
			if (SENSITIVE_LOCALSTORAGE_KEYS.has(key)) {
				window.localStorage.removeItem(key);
				continue;
			}
			if (SENSITIVE_LOCALSTORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
				window.localStorage.removeItem(key);
			}
		}
	} catch (error) {
		console.warn('Failed to clear sensitive localStorage data:', error);
	}
};

const clearSensitiveCaches = async () => {
	if (typeof window === 'undefined' || !('caches' in window)) return;
	try {
		const cacheNames = await window.caches.keys();
		await Promise.all(
			cacheNames
				.filter(
					(name) =>
						SENSITIVE_CACHE_NAMES.has(name) ||
						SENSITIVE_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)),
				)
				.map((name) => window.caches.delete(name)),
		);
	} catch (error) {
		console.warn('Failed to clear sensitive Cache Storage entries:', error);
	}
};

const notifyServiceWorker = () => {
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
	try {
		navigator.serviceWorker.controller?.postMessage({
			type: 'clear-session-data',
		});
	} catch (error) {
		console.warn('Failed to notify service worker for session cache clearing:', error);
	}
};

export const clearUserSessionDataCaches = async () => {
	clearLocalStorageSensitiveData();
	await clearSensitiveCaches();
	await Promise.all(SENSITIVE_INDEXEDDB_NAMES.map((name) => deleteIndexedDb(name)));
	notifyServiceWorker();
};

