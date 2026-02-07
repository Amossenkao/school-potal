const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const STATIC_ASSETS = ['/', '/dashboard'];

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
					.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
					.map((key) => caches.delete(key)),
			),
		),
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	const isSameOrigin = url.origin === self.location.origin;

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const copy = response.clone();
					caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
					return response;
				})
				.catch(() =>
					caches.match(request).then((cached) => cached || caches.match('/')),
				),
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
			}),
		);
		return;
	}
});
