const CACHE_VERSION = 'v7';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
	'/',
	'/login',
	'/dashboard',
	'/dashboard/',
	'/offline',
	'/manifest.webmanifest',
];
const API_ALLOWLIST = [
	'/api/users',
	'/api/grades',
	'/api/grades/requests',
	'/api/calendar',
	'/api/schedules',
	'/api/school',
	'/api/notifications',
	'/api/settings',
];

const DB_NAME = 'pwa-queue';
const DB_STORE = 'grade-submissions';
const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const openQueueDb = () =>
	new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(DB_STORE)) {
				db.createObjectStore(DB_STORE, { keyPath: 'id' });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});

const enqueueRequest = async (entry) => {
	const db = await openQueueDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(DB_STORE, 'readwrite');
		tx.objectStore(DB_STORE).put(entry);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
};

const readQueue = async () => {
	const db = await openQueueDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(DB_STORE, 'readonly');
		const request = tx.objectStore(DB_STORE).getAll();
		request.onsuccess = () => resolve(request.result || []);
		request.onerror = () => reject(request.error);
	});
};

const clearQueueItem = async (id) => {
	const db = await openQueueDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(DB_STORE, 'readwrite');
		tx.objectStore(DB_STORE).delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
};

const clearQueue = async () => {
	const db = await openQueueDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(DB_STORE, 'readwrite');
		tx.objectStore(DB_STORE).clear();
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
};

const clearSessionCaches = async () => {
	await Promise.all([
		caches.delete(API_CACHE),
		caches.delete(RUNTIME_CACHE),
		caches.delete('api-runtime-v1'),
		clearQueue().catch(() => undefined),
	]);
};

const clearAllCachesAndQueues = async () => {
	const keys = await caches.keys();
	await Promise.all([
		...keys.map((key) => caches.delete(key)),
		clearQueue().catch(() => undefined),
	]);
};

const flushQueue = async () => {
	const entries = await readQueue();
	for (const entry of entries) {
		try {
			const res = await fetch(entry.url, {
				method: entry.method,
				headers: entry.headers,
				body: entry.body,
				credentials: 'include',
			});
			if (res.ok) {
				await clearQueueItem(entry.id);
			}
		} catch (error) {
			console.warn('Queue replay failed:', error);
		}
	}
};

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(STATIC_CACHE);
			await Promise.allSettled(
				STATIC_ASSETS.map((asset) =>
					cache.add(asset).catch((error) => {
						console.warn('Failed to pre-cache static asset:', asset, error);
					}),
				),
			);
			await self.skipWaiting();
		})(),
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter(
							(key) => ![STATIC_CACHE, RUNTIME_CACHE, API_CACHE].includes(key),
						)
						.map((key) => caches.delete(key)),
				),
			),
	);
	self.clients.claim();
});

self.addEventListener('message', (event) => {
	if (event?.data?.type === 'skip-waiting') {
		event.waitUntil(self.skipWaiting());
	}
	if (event?.data?.type === 'flush-grade-queue') {
		event.waitUntil(flushQueue());
	}
	if (event?.data?.type === 'clear-session-data') {
		event.waitUntil(clearSessionCaches());
	}
	if (event?.data?.type === 'clear-all-data') {
		event.waitUntil(clearAllCachesAndQueues());
	}
	if (event?.data?.type === 'cache-dashboard-shell') {
		const path = String(event?.data?.path || '');
		if (!path.startsWith('/dashboard')) return;
		event.waitUntil(
			(async () => {
				const runtimeCache = await caches.open(RUNTIME_CACHE);
				const normalized = path.startsWith('/') ? path : `/${path}`;
				try {
					const response = await fetch(normalized, {
						method: 'GET',
						credentials: 'include',
						cache: 'no-store',
					});
					if (!response.ok) return;
					await runtimeCache.put(new Request(normalized), response.clone());
					await runtimeCache.put(new Request('/dashboard'), response.clone());
					await runtimeCache.put(new Request('/dashboard/'), response.clone());
				} catch (error) {
					console.warn('Failed to refresh dashboard shell cache:', error);
				}
			})(),
		);
	}
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const isMutationRequest = MUTATION_METHODS.includes(request.method);
	if (request.method !== 'GET' && !isMutationRequest) return;

	const url = new URL(request.url);
	const isSameOrigin = url.origin === self.location.origin;

	if (
		isMutationRequest &&
		isSameOrigin &&
		url.pathname.startsWith('/api/grades')
	) {
		const isOffline =
			typeof self.navigator === 'undefined' ? false : !self.navigator.onLine;
		if (isOffline) {
			event.respondWith(
				(async () => {
					const cloned = request.clone();
					const body = await cloned.text();
					const headers = {};
					cloned.headers.forEach((value, key) => {
						headers[key] = value;
					});
					const entry = {
						id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
						url: request.url,
						method: request.method,
						headers,
						body,
						timestamp: Date.now(),
					};
					await enqueueRequest(entry);
					return new Response(JSON.stringify({ queued: true }), {
						status: 202,
						headers: { 'Content-Type': 'application/json' },
					});
				})(),
			);
		}
		return;
	}

	if (request.method !== 'GET') return;

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.ok) {
						caches.open(RUNTIME_CACHE).then(async (cache) => {
							await cache.put(request, response.clone());
							if (isSameOrigin && url.pathname.startsWith('/dashboard')) {
								await cache.put(new Request('/dashboard'), response.clone());
								await cache.put(new Request('/dashboard/'), response.clone());
							}
						});
					}
					return response;
				})
				.catch(async () => {
					const cached = await caches.match(request);
					if (cached) return cached;

					// Dashboard uses a client-side route shell. If a deep dashboard URL
					// was never fetched directly, fall back to cached /dashboard shell.
					if (isSameOrigin && url.pathname.startsWith('/dashboard')) {
						const dashboardShell =
							(await caches.match('/dashboard')) ||
							(await caches.match('/dashboard/'));
						if (dashboardShell) return dashboardShell;
					}

					const appShell =
						(await caches.match('/')) ||
						(await caches.match('/login')) ||
						(await caches.match('/dashboard')) ||
						(await caches.match('/dashboard/'));
					if (appShell) return appShell;

					return caches.match('/offline');
				}),
		);
		return;
	}

	if (
		isSameOrigin &&
		API_ALLOWLIST.some((path) => url.pathname.startsWith(path))
	) {
		event.respondWith(
			caches.open(API_CACHE).then(async (cache) => {
				try {
					// Network-first prevents stale cross-session API payloads
					// (e.g., previous user's dashboard data) from being shown online.
					const response = await fetch(request);
					if (response.ok) {
						cache.put(request, response.clone());
					}
					return response;
				} catch (error) {
					const cached = await cache.match(request);
					if (cached) return cached;
					throw error;
				}
			}),
		);
		return;
	}

	if (
		isSameOrigin &&
		(url.pathname.startsWith('/_next/static/') ||
			request.destination === 'script' ||
			request.destination === 'style' ||
			request.destination === 'font' ||
			request.destination === 'image')
	) {
		event.respondWith(
			caches.match(request).then((cached) => {
				if (cached) return cached;
				return fetch(request)
					.then((response) => {
						const copy = response.clone();
						caches
							.open(RUNTIME_CACHE)
							.then((cache) => cache.put(request, copy));
						return response;
					})
					.catch(() => cached);
			}),
		);
	}
});
