type SessionClearMode = 'session' | 'logout';

export type ClearUserSessionDataOptions = {
	mode?: SessionClearMode;
	preserveLocalStorageKeys?: string[];
};

const LOCALSTORAGE_PRESERVED_KEYS = new Set([
	'school-profile',
	'theme',
	'user_theme_preference',
	'teacherGradeDrafts',
]);

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

const KNOWN_INDEXEDDB_NAMES = [
	'school-domain-cache',
	'school-portal',
	'pwa-queue',
];

type IndexedDbFactoryWithDatabases = IDBFactory & {
	databases?: () => Promise<Array<{ name?: string | null }>>;
};

const deleteIndexedDb = async (name: string) => {
	if (typeof window === 'undefined' || !('indexedDB' in window)) return;
	await new Promise<void>((resolve) => {
		const request = window.indexedDB.deleteDatabase(name);
		request.onsuccess = () => resolve();
		request.onerror = () => resolve();
		request.onblocked = () => resolve();
	});
};

const clearSessionStorage = () => {
	if (typeof window === 'undefined') return;
	try {
		window.sessionStorage.clear();
	} catch (error) {
		console.warn('Failed to clear sessionStorage data:', error);
	}
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

const clearLocalStorageForLogout = (preservedKeys: Set<string>) => {
	if (typeof window === 'undefined') return;
	try {
		for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
			const key = window.localStorage.key(i);
			if (!key) continue;
			if (LOCALSTORAGE_PRESERVED_KEYS.has(key) || preservedKeys.has(key)) continue;
			window.localStorage.removeItem(key);
		}
	} catch (error) {
		console.warn('Failed to clear localStorage data for logout:', error);
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

const STATIC_CACHE_PRESERVE_PREFIX = 'static-';

const clearAllCaches = async () => {
	if (typeof window === 'undefined' || !('caches' in window)) return;
	try {
		const cacheNames = await window.caches.keys();
		await Promise.all(
			cacheNames
				.filter((name) => !name.startsWith(STATIC_CACHE_PRESERVE_PREFIX))
				.map((name) => window.caches.delete(name)),
		);
	} catch (error) {
		console.warn('Failed to clear Cache Storage entries:', error);
	}
};

const getIndexedDbNamesToDelete = async (mode: SessionClearMode) => {
	if (typeof window === 'undefined' || !('indexedDB' in window)) return [] as string[];
	const names = new Set<string>(KNOWN_INDEXEDDB_NAMES);

	if (mode !== 'logout') {
		return Array.from(names);
	}

	try {
		const factory = window.indexedDB as IndexedDbFactoryWithDatabases;
		if (typeof factory.databases !== 'function') {
			return Array.from(names);
		}
		const databases = await factory.databases();
		for (const db of databases || []) {
			const name = typeof db?.name === 'string' ? db.name.trim() : '';
			if (name) names.add(name);
		}
	} catch (error) {
		console.warn('Failed to enumerate IndexedDB databases for logout cleanup:', error);
	}

	return Array.from(names);
};

const clearIndexedDb = async (mode: SessionClearMode) => {
	const names = await getIndexedDbNamesToDelete(mode);
	await Promise.all(names.map((name) => deleteIndexedDb(name)));
};

const postMessageToWorker = (target: ServiceWorker | null | undefined, data: unknown) => {
	if (!target) return;
	try {
		target.postMessage(data);
	} catch {
		// Ignore worker post message failures.
	}
};

const notifyServiceWorker = async (mode: SessionClearMode) => {
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
	const data = {
		type: mode === 'logout' ? 'clear-all-data' : 'clear-session-data',
	};
	try {
		postMessageToWorker(navigator.serviceWorker.controller, data);
		const registrations = await navigator.serviceWorker.getRegistrations();
		registrations.forEach((registration) => {
			postMessageToWorker(registration.active, data);
			postMessageToWorker(registration.waiting, data);
			postMessageToWorker(registration.installing, data);
		});
	} catch (error) {
		console.warn('Failed to notify service worker for session cache clearing:', error);
	}
};

export const clearUserSessionDataCaches = async (
	options: ClearUserSessionDataOptions = {},
) => {
	const mode = options.mode || 'session';
	const preservedLocalStorageKeys = new Set(
		Array.isArray(options.preserveLocalStorageKeys)
			? options.preserveLocalStorageKeys
					.map((key) => String(key || '').trim())
					.filter((key) => key.length > 0)
			: [],
	);
	if (mode === 'logout') {
		clearLocalStorageForLogout(preservedLocalStorageKeys);
	} else {
		clearLocalStorageSensitiveData();
	}
	clearSessionStorage();

	if (mode === 'logout') {
		await clearAllCaches();
	} else {
		await clearSensitiveCaches();
	}

	await clearIndexedDb(mode);
	await notifyServiceWorker(mode);
};

