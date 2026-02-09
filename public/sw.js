const CACHE_VERSION = 'v4';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

const STATIC_ASSETS = ['/', '/dashboard', '/offline', '/manifest.webmanifest'];
const API_ALLOWLIST = [
	'/api/users',
	'/api/grades',
	'/api/calendar',
	'/api/schedules',
	'/api/school',
	'/api/notifications',
	'/api/settings',
];

const DB_NAME = 'pwa-queue';
const DB_STORE = 'grade-submissions';

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
		caches
			.open(STATIC_CACHE)
			.then((cache) => cache.addAll(STATIC_ASSETS))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE, API_CACHE].includes(key))
					.map((key) => caches.delete(key))
			)
		)
	);
	self.clients.claim();
});

self.addEventListener('message', (event) => {
	if (event?.data?.type === 'flush-grade-queue') {
		event.waitUntil(flushQueue());
	}
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET' && request.method !== 'POST') return;

	const url = new URL(request.url);
	const isSameOrigin = url.origin === self.location.origin;

if (request.method === 'POST' && isSameOrigin && url.pathname === '/api/grades') {
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
					return new Response(
						JSON.stringify({ queued: true }),
						{
							status: 202,
							headers: { 'Content-Type': 'application/json' },
						}
					);
				})()
			);
		}
		return;
	}

	if (request.method !== 'GET') return;

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const copy = response.clone();
					caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
					return response;
				})
				.catch(() =>
					caches
						.match(request)
						.then((cached) => cached || caches.match('/offline'))
				)
		);
		return;
	}

	if (isSameOrigin && API_ALLOWLIST.some((path) => url.pathname.startsWith(path))) {
		event.respondWith(
			caches.open(API_CACHE).then(async (cache) => {
				const cached = await cache.match(request);
				const fetchPromise = fetch(request)
					.then((response) => {
						if (response.ok) {
							cache.put(request, response.clone());
						}
						return response;
					})
					.catch(() => cached);
				return cached || fetchPromise;
			})
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
						caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
						return response;
					})
					.catch(() => cached);
			})
		);
	}
});
