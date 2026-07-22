const CACHE_VERSION = 'v10';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;


const STATIC_ASSETS = [
	'/offline',
	'/login',
	'/manifest.webmanifest',
	'/fonts/GreatVibes-Regular.ttf', // add this line
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
  '/api/attendance',
];

const DB_NAME = 'pwa-queue';
const DB_STORE = 'grade-submissions';
const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const AUTH_LOGIN_PATH = '/api/auth/login';

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

const queueMutationRequest = async (request) => {
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
		...keys
			.filter((key) => key !== STATIC_CACHE)
			.map((key) => caches.delete(key)),
		clearQueue().catch(() => undefined),
	]);
};

const flushQueue = async () => {
	const entries = await readQueue();
	let flushedCount = 0;
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
				flushedCount++;
			}
		} catch (error) {
			console.warn('Queue replay failed:', error);
		}
	}
	return flushedCount;
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

			try {
				const loginResponse = await fetch('/login', {
					credentials: 'omit',
					cache: 'no-store',
				});
				if (loginResponse.ok) {
					const html = await loginResponse.text();
					await cache.put(
						'/login',
						new Response(html, {
							status: loginResponse.status,
							statusText: loginResponse.statusText,
							headers: loginResponse.headers,
						}),
					);

					// Extract CSS and JS URLs from the HTML so the page
					// renders correctly on the very first offline load.
					const assetUrls = [];
					const linkRe = /href="(\/_next\/static\/[^"]+\.css)"/g;
					const scriptRe = /src="(\/_next\/static\/[^"]+\.js)"/g;
					let m;
					while ((m = linkRe.exec(html)) !== null) assetUrls.push(m[1]);
					while ((m = scriptRe.exec(html)) !== null) assetUrls.push(m[1]);

					await Promise.allSettled(
						assetUrls.map((url) =>
							fetch(url)
								.then((res) => {
									if (res.ok) return cache.put(url, res);
								})
								.catch(() => {}),
						),
					);
				}
			} catch (error) {
				console.warn('Failed to pre-cache /login shell:', error);
			}
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
		event.waitUntil(
			(async () => {
				const flushedCount = await flushQueue();
				const client = event.source;
				if (client) {
					client.postMessage({ type: 'flush-grade-queue-result', flushedCount });
				}
			})(),
		);
	}
	if (event?.data?.type === 'clear-session-data') {
		event.waitUntil(clearSessionCaches());
	}
	if (event?.data?.type === 'clear-all-data') {
		event.waitUntil(clearAllCachesAndQueues());
	}
	// sw.js — generalize the existing handler
	if (event?.data?.type === 'cache-app-shell') {
		const path = String(event?.data?.path || '');
		if (!['/dashboard', '/login'].includes(path)) return;
		event.waitUntil(
			(async () => {
				const runtimeCache = await caches.open(RUNTIME_CACHE);
				try {
					const response = await fetch(path, {
						credentials: 'include',
						cache: 'no-store',
					});
					if (!response.ok) return;
					await runtimeCache.put(new Request(path), response.clone());
					if (path === '/dashboard') {
						await runtimeCache.put(
							new Request('/dashboard/'),
							response.clone(),
						);
					}
				} catch (error) {
					console.warn('Failed to refresh app shell cache:', path, error);
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

	if (isMutationRequest && isSameOrigin && url.pathname.startsWith('/api/')) {
		const isLoginCredentialRequest =
			url.pathname === AUTH_LOGIN_PATH && request.method !== 'DELETE';
		const isOffline =
			typeof self.navigator === 'undefined' ? false : !self.navigator.onLine;
		if (isOffline && !isLoginCredentialRequest) {
			event.respondWith(queueMutationRequest(request));
			return;
		}
		if (isOffline) {
			event.respondWith(
				new Response(
					JSON.stringify({
						message: 'Request unavailable while offline.',
					}),
					{
						status: 503,
						headers: { 'Content-Type': 'application/json' },
					},
				),
			);
			return;
		}
		const networkRequest = request.clone();
		const queueRequest = request.clone();
		event.respondWith(
			fetch(networkRequest).catch(() => {
				if (!isLoginCredentialRequest) {
					return queueMutationRequest(queueRequest);
				}
				return new Response(
					JSON.stringify({
						message: 'Request unavailable while offline.',
					}),
					{
						status: 503,
						headers: { 'Content-Type': 'application/json' },
					},
				);
			}),
		);
		return;
	}

	if (request.method !== 'GET') return;

	if (request.mode === 'navigate') {
		if (isSameOrigin && url.pathname.startsWith('/api/')) {
			event.respondWith(
				fetch(request).catch(
					() =>
						new Response(
							JSON.stringify({
								message: 'Request unavailable while offline.',
							}),
							{
								status: 503,
								headers: { 'Content-Type': 'application/json' },
							},
						),
				),
			);
			return;
		}

		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.ok) {
						// Clone RIGHT NOW, synchronously, before `response` is returned to the
						// browser and before any async gap (caches.open is itself async).
						const runtimeCopy = response.clone();
						const dashboardCopy1 =
							isSameOrigin && url.pathname.startsWith('/dashboard')
								? response.clone()
								: null;
						const dashboardCopy2 =
							isSameOrigin && url.pathname.startsWith('/dashboard')
								? response.clone()
								: null;

						caches.open(RUNTIME_CACHE).then(async (cache) => {
							await cache.put(request, runtimeCopy);
							if (dashboardCopy1) {
								await cache.put(new Request('/dashboard'), dashboardCopy1);
							}
							if (dashboardCopy2) {
								await cache.put(new Request('/dashboard/'), dashboardCopy2);
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
						(await caches.match('/login')) ||
						(await caches.match('/dashboard')) ||
						(await caches.match('/dashboard/')) ||
						(await caches.match('/'));
					if (appShell) return appShell;

					const offlineFallback = await caches.match('/offline');
					if (offlineFallback) return offlineFallback;
					// Try to find the offline page in any cache
					for (const cacheName of [
						STATIC_CACHE,
						RUNTIME_CACHE,
						API_CACHE,
						'api-runtime-v1',
					]) {
						const cache = await caches.open(cacheName);
						const offlinePage = await cache.match('/offline');
						if (offlinePage) return offlinePage;
					}
					// Fallback for truly uncached scenarios - serve offline page HTML directly
					return new Response(
						`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Offline — School Mesh</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  /* ============ THEME TOKENS ============ */
  :root{
    --amber-1:#f2a65a;
    --amber-2:#e0873c;
    --amber-glow: 242,166,90;
    --ok:#7cb87f;
    --radius:1rem;
  }

  html[data-theme="dark"]{
    --bg-0:#0d1320;
    --bg-1:#131a28;
    --paper:#1b2334;
    --paper-edge:#2a3448;
    --ink:#f2ece0;
    --ink-soft:#9aa3ba;
    --wire:#3c4a63;
    --pill-bg:#232c3f;
    --pill-edge:#323e56;
    --pill-online-bg:rgba(124,184,127,0.14);
    --pill-online-edge:rgba(124,184,127,0.4);
    --card-shadow: 0 30px 60px -20px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03) inset;
    --node-bg:#232c3f;
    --sky-op:1;
  }

  html[data-theme="light"]{
    --bg-0:#f6efdd;
    --bg-1:#efe4c8;
    --paper:#fffdf8;
    --paper-edge:#e8dcbf;
    --ink:#2a2015;
    --ink-soft:#8a7a5c;
    --wire:#cdbf9a;
    --pill-bg:#f2ead9;
    --pill-edge:#e3d5ac;
    --pill-online-bg:#eaf5ea;
    --pill-online-edge:#c7e2c8;
    --card-shadow: 0 30px 60px -24px rgba(120,90,40,0.28), 0 0 0 1px rgba(0,0,0,0.02) inset;
    --node-bg:#fffdf8;
    --sky-op:0.35;
  }

  *{box-sizing:border-box;}
  html,body{margin:0;height:100%;}

  body{
    font-family:'Inter',system-ui,-apple-system,sans-serif;
    background:
      radial-gradient(ellipse 60% 40% at 50% 0%, rgba(var(--amber-glow),0.10), transparent 60%),
      linear-gradient(180deg, var(--bg-0) 0%, var(--bg-1) 100%);
    min-height:100vh;
    overflow:hidden;
    position:relative;
    color:var(--ink);
    transition:background .5s ease, color .5s ease;
  }

  /* ---------- ambient night sky ---------- */
  .sky{
    position:fixed;
    inset:0;
    pointer-events:none;
    z-index:0;
    opacity:var(--sky-op);
    transition:opacity .5s ease;
  }
  .star{
    position:absolute;
    width:2px;height:2px;
    background:rgba(255,255,255,0.55);
    border-radius:50%;
    animation:twinkle 4s ease-in-out infinite;
  }
  html[data-theme="light"] .star{ background:rgba(120,90,40,0.35); }
  @keyframes twinkle{
    0%,100%{opacity:.15; transform:scale(1);}
    50%{opacity:.9; transform:scale(1.4);}
  }
  .dust{
    position:absolute;
    width:3px;height:3px;
    border-radius:50%;
    background:rgba(var(--amber-glow),0.35);
    filter:blur(0.5px);
    animation:float 9s ease-in-out infinite;
  }
  @keyframes float{
    0%{transform:translateY(0) translateX(0); opacity:0;}
    10%{opacity:.7;}
    50%{transform:translateY(-40px) translateX(10px); opacity:.5;}
    90%{opacity:0;}
    100%{transform:translateY(-90px) translateX(-6px); opacity:0;}
  }

  /* ---------- theme toggle ---------- */
  .theme-toggle{
    position:fixed;
    top:1.25rem;
    right:1.25rem;
    z-index:5;
    width:52px;
    height:30px;
    border-radius:999px;
    border:1px solid var(--pill-edge);
    background:var(--pill-bg);
    cursor:pointer;
    display:flex;
    align-items:center;
    padding:3px;
    transition:background .4s ease, border-color .4s ease;
  }
  .theme-toggle:focus-visible{ outline:2px solid var(--amber-1); outline-offset:3px; }
  .toggle-knob{
    width:22px;height:22px;
    border-radius:50%;
    background:linear-gradient(180deg, var(--amber-1), var(--amber-2));
    display:flex;align-items:center;justify-content:center;
    color:#fff;
    box-shadow:0 3px 8px -2px rgba(224,135,60,0.6);
    transform:translateX(0);
    transition:transform .35s cubic-bezier(.4,1.6,.5,1);
  }
  html[data-theme="light"] .toggle-knob{ transform:translateX(22px); }
  .toggle-knob svg{ width:13px;height:13px; }

  /* ---------- layout ---------- */
  .stage{
    position:relative;
    z-index:1;
    min-height:100vh;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    padding:2rem 1.25rem;
  }

  /* ---------- signature: lantern ---------- */
  .lantern-wrap{
    position:relative;
    width:110px;
    height:150px;
    margin-bottom:0.75rem;
  }
  .glow{
    position:absolute;
    left:50%;top:42%;
    width:190px;height:190px;
    transform:translate(-50%,-50%);
    background:radial-gradient(circle, rgba(var(--amber-glow),0.55) 0%, rgba(var(--amber-glow),0.12) 45%, transparent 72%);
    animation:pulseGlow 3.2s ease-in-out infinite;
    filter:blur(2px);
  }
  @keyframes pulseGlow{
    0%,100%{opacity:.65; transform:translate(-50%,-50%) scale(0.94);}
    50%{opacity:1; transform:translate(-50%,-50%) scale(1.06);}
  }
  .lantern{ position:relative; width:100%; height:100%; display:block; }
  .flame{ transform-origin:50% 100%; animation:flicker 2.4s ease-in-out infinite; }
  @keyframes flicker{
    0%,100%{ transform:scaleY(1) scaleX(1) rotate(0deg); }
    20%{ transform:scaleY(1.08) scaleX(0.96) rotate(-1.5deg); }
    45%{ transform:scaleY(0.92) scaleX(1.05) rotate(1deg); }
    70%{ transform:scaleY(1.1) scaleX(0.94) rotate(-0.5deg); }
  }
  .lantern-frame{ fill:var(--paper-edge); stroke:var(--wire); }
  .lantern-glass{ fill:var(--bg-0); opacity:0.55; }

  /* ---------- headline ---------- */
  .eyebrow{
    font-family:'JetBrains Mono', monospace;
    font-size:0.7rem;
    letter-spacing:0.14em;
    text-transform:uppercase;
    color:var(--amber-1);
    margin:0 0 0.4rem;
    display:flex;align-items:center;gap:0.45rem;
  }
  .eyebrow .dot{
    width:6px;height:6px;border-radius:50%;
    background:var(--amber-1);
    box-shadow:0 0 8px 1px rgba(var(--amber-glow),0.8);
    animation:blink 1.6s ease-in-out infinite;
  }
  @keyframes blink{ 0%,100%{opacity:1;} 50%{opacity:.25;} }

  h1.headline{
    font-family:'Fraunces', serif;
    font-weight:600;
    font-size:1.9rem;
    color:var(--ink);
    margin:0 0 1.6rem;
    text-align:center;
    letter-spacing:-0.01em;
  }

  /* ---------- card ---------- */
  .card{
    width:100%;
    max-width:26rem;
    background:var(--paper);
    border:1px solid var(--paper-edge);
    border-radius:var(--radius);
    padding:2rem 1.75rem 1.75rem;
    text-align:center;
    box-shadow:var(--card-shadow);
    position:relative;
    overflow:hidden;
    transition:background .4s ease, border-color .4s ease, box-shadow .4s ease;
  }

  .message{
    font-size:0.92rem;
    line-height:1.6;
    color:var(--ink-soft);
    margin:0 0 1.35rem;
  }
  .message strong{ color:var(--ink); font-weight:600; }

  /* ---------- cached ledger ---------- */
  .ledger{
    display:flex;
    justify-content:center;
    gap:0.55rem;
    margin:0 0 1.5rem;
    flex-wrap:wrap;
  }
  .ledger-item{
    display:flex;
    align-items:center;
    gap:0.35rem;
    font-family:'JetBrains Mono', monospace;
    font-size:0.66rem;
    letter-spacing:0.02em;
    color:var(--ink-soft);
    background:var(--pill-bg);
    border:1px solid var(--pill-edge);
    border-radius:999px;
    padding:0.32rem 0.65rem 0.32rem 0.5rem;
  }
  .ledger-item svg{ width:11px;height:11px; color:var(--amber-1); flex-shrink:0; }

  /* ---------- connection wire ---------- */
  .wire-row{
    display:flex;
    align-items:center;
    justify-content:center;
    gap:0.6rem;
    margin:0 0 1.5rem;
  }
  .node{
    width:30px;height:30px;
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    background:var(--node-bg);
    border:1.5px solid var(--paper-edge);
    color:var(--ink-soft);
    flex-shrink:0;
    transition:background .4s ease, border-color .4s ease;
  }
  .node svg{ width:15px;height:15px; }
  .wire{
    flex:1;
    max-width:96px;
    height:0;
    border-top:2px dashed var(--wire);
    position:relative;
  }
  .wire .pulse{
    position:absolute;
    top:-3.5px;left:0;
    width:7px;height:7px;
    border-radius:50%;
    background:var(--amber-1);
    box-shadow:0 0 6px 1px rgba(var(--amber-glow),0.75);
    animation:travel 1.8s linear infinite;
  }
  @keyframes travel{
    0%{left:0%; opacity:0;}
    8%{opacity:1;}
    92%{opacity:1;}
    100%{left:100%; opacity:0;}
  }

  /* ---------- status pill ---------- */
  .status{
    font-family:'JetBrains Mono', monospace;
    font-size:0.72rem;
    letter-spacing:0.03em;
    color:var(--ink-soft);
    background:var(--pill-bg);
    border:1px solid var(--pill-edge);
    border-radius:999px;
    padding:0.4rem 0.85rem;
    display:inline-flex;
    align-items:center;
    gap:0.5rem;
    margin-bottom:1.5rem;
    transition:all .4s ease;
  }
  .status.online{
    background:var(--pill-online-bg);
    border-color:var(--pill-online-edge);
    color:#3c6b3f;
  }
  html[data-theme="dark"] .status.online{ color:#a9d8ab; }
  .status-dot{
    width:6px;height:6px;border-radius:50%;
    background:var(--ink-soft);
    animation:blink 1.6s ease-in-out infinite;
  }
  .status.online .status-dot{ background:var(--ok); animation:none; }

  /* ---------- button ---------- */
  .retry-btn{
    font-family:'Inter',sans-serif;
    font-weight:600;
    font-size:0.9rem;
    color:#fff;
    background:linear-gradient(180deg, var(--amber-1), var(--amber-2));
    border:none;
    border-radius:0.65rem;
    padding:0.75rem 1.5rem;
    display:inline-flex;
    align-items:center;
    gap:0.55rem;
    cursor:pointer;
    box-shadow:0 8px 20px -6px rgba(224,135,60,0.55);
    transition:transform .15s ease, box-shadow .15s ease;
  }
  .retry-btn:hover{ transform:translateY(-1px); box-shadow:0 10px 24px -6px rgba(224,135,60,0.65); }
  .retry-btn:active{ transform:translateY(0px) scale(0.98); }
  .retry-btn:focus-visible{ outline:2px solid var(--amber-1); outline-offset:3px; }
  .retry-btn svg{ width:16px;height:16px; transition:transform .5s ease; }
  .retry-btn.spinning svg{ animation:spin .7s linear; }
  @keyframes spin{ to{transform:rotate(360deg);} }
  .retry-btn:disabled{ opacity:0.85; cursor:default; }

  .footer-note{
    margin-top:1.6rem;
    font-family:'JetBrains Mono', monospace;
    font-size:0.68rem;
    letter-spacing:0.08em;
    text-transform:uppercase;
    color:var(--ink-soft);
    text-align:center;
    opacity:0.75;
  }

  @media (max-width: 380px){
    h1.headline{ font-size:1.55rem; }
    .card{ padding:1.6rem 1.25rem 1.5rem; }
    .theme-toggle{ top:0.9rem; right:0.9rem; }
  }

  @media (prefers-reduced-motion: reduce){
    *{ animation:none !important; transition:none !important; }
  }
</style>
</head>
<body>

  <div class="sky" id="sky"></div>

  <button class="theme-toggle" id="themeToggle" aria-label="Switch appearance" title="Switch between light and dark">
    <span class="toggle-knob" id="toggleKnob">
      <svg id="knobIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></svg>
    </span>
  </button>

  <div class="stage">

    <div class="lantern-wrap">
      <div class="glow"></div>
      <svg class="lantern" viewBox="0 0 110 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="55" y1="0" x2="55" y2="18" stroke="var(--wire)" stroke-width="2"/>
        <path d="M40 18 H70 L64 30 H46 Z" class="lantern-frame" stroke-width="1.5"/>
        <ellipse cx="55" cy="18" rx="15" ry="3" class="lantern-frame" stroke-width="1"/>
        <path d="M38 30 H72 L78 108 Q55 118 32 108 Z" class="lantern-frame" stroke-width="1.5"/>
        <path d="M45 38 H65 L69 100 Q55 107 41 100 Z" class="lantern-glass"/>
        <line x1="55" y1="38" x2="55" y2="102" stroke="var(--wire)" stroke-width="1"/>
        <g class="flame">
          <path d="M55 55 C48 66 48 78 55 86 C62 78 62 66 55 55 Z" fill="#f2a65a"/>
          <path d="M55 64 C51 71 51 79 55 84 C59 79 59 71 55 64 Z" fill="#fddca0"/>
        </g>
        <path d="M32 108 Q55 118 78 108 L74 120 H36 Z" class="lantern-frame" stroke-width="1.5"/>
        <ellipse cx="55" cy="120" rx="19" ry="3.5" class="lantern-frame" stroke-width="1"/>
        <rect x="42" y="122" width="4" height="8" rx="1.5" class="lantern-frame" stroke-width="1"/>
        <rect x="64" y="122" width="4" height="8" rx="1.5" class="lantern-frame" stroke-width="1"/>
      </svg>
    </div>

    <h1 class="headline">You're offline</h1>

    <div class="card">
      <p class="message">
        Cached lessons, grades, and records are still here for you to <strong>view</strong>.
        Anything new is being <strong>queued</strong> and will sync the moment the
        connection returns.
      </p>

      <div class="ledger">
        <span class="ledger-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          Lessons
        </span>
        <span class="ledger-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Grades
        </span>
        <span class="ledger-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
          Records
        </span>
      </div>

      <div class="wire-row">
        <div class="node" title="This device">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
        </div>
        <div class="wire"><div class="pulse"></div></div>
        <div class="node" title="School Mesh server">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        </div>
      </div>

      <div class="status" id="status">
        <span class="status-dot"></span>
        <span id="statusText">Searching for a signal…</span>
      </div>

      <br>

      <button class="retry-btn" id="retryBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        <span id="retryLabel">Try again</span>
      </button>
    </div>

  </div>

<script>
  // ---------- theme ----------
  var root = document.documentElement;
  var themeToggle = document.getElementById('themeToggle');
  var knobIcon = document.getElementById('knobIcon');

  var sunPath = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  var moonPath = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';

  function applyTheme(theme){
    root.setAttribute('data-theme', theme);
    knobIcon.innerHTML = theme === 'dark' ? moonPath : sunPath;
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var currentTheme = prefersDark ? 'dark' : 'light';
  // default the scene to dark (its natural, lantern-lit state) unless the
  // system explicitly prefers light
  if (!window.matchMedia || window.matchMedia('(prefers-color-scheme: light)').matches !== true) {
    currentTheme = 'dark';
  }
  applyTheme(currentTheme);

  themeToggle.addEventListener('click', function(){
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
  });

  // ---------- ambient sky: stars + drifting dust ----------
  (function(){
    var sky = document.getElementById('sky');
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 40; i++) {
      var s = document.createElement('div');
      s.className = 'star';
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 55 + '%';
      s.style.animationDelay = (Math.random() * 4) + 's';
      frag.appendChild(s);
    }
    for (var j = 0; j < 14; j++) {
      var d = document.createElement('div');
      d.className = 'dust';
      d.style.left = (35 + Math.random() * 30) + '%';
      d.style.top = (30 + Math.random() * 30) + '%';
      d.style.animationDelay = (Math.random() * 9) + 's';
      d.style.animationDuration = (7 + Math.random() * 5) + 's';
      frag.appendChild(d);
    }
    sky.appendChild(frag);
  })();

  // ---------- connectivity ----------
  var statusEl = document.getElementById('status');
  var statusText = document.getElementById('statusText');
  var retryBtn = document.getElementById('retryBtn');
  var retryLabel = document.getElementById('retryLabel');

  function probeConnectivity(){
    return fetch('https://www.gstatic.com/generate_204', { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
      .then(function(){ return true; })
      .catch(function(){ return false; });
  }

  function setOnlineUI(){
    statusEl.classList.add('online');
    statusText.textContent = 'Connection restored — syncing…';
    retryLabel.textContent = 'Reloading…';
    setTimeout(function(){ window.location.reload(); }, 900);
  }

  function setOfflineUI(){
    statusEl.classList.remove('online');
    statusText.textContent = 'Searching for a signal…';
  }

  window.addEventListener('online', function(){
    probeConnectivity().then(function(isOnline){
      if (isOnline) setOnlineUI();
    });
  });
  window.addEventListener('offline', setOfflineUI);

  retryBtn.addEventListener('click', function(){
    retryBtn.classList.add('spinning');
    retryBtn.disabled = true;
    retryLabel.textContent = 'Checking…';
    probeConnectivity().then(function(isOnline){
      if (isOnline) {
        setOnlineUI();
      } else {
        retryBtn.classList.remove('spinning');
        retryBtn.disabled = false;
        retryLabel.textContent = 'Try again';
        statusText.textContent = 'Still offline — searching…';
      }
    });
  });

  setInterval(function(){
    probeConnectivity().then(function(isOnline){
      if (isOnline) setOnlineUI();
    });
  }, 5000);
</script>

</body>
</html>`,
						{
							status: 200,
							headers: { 'Content-Type': 'text/html' },
						},
					);
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
			url.pathname.startsWith('/fonts/') || // add this line
			request.destination === 'script' ||
			request.destination === 'style' ||
			request.destination === 'font' ||
			request.destination === 'image' ||
			request.destination === 'manifest')
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
					.catch(() => {
						if (cached) return cached;
						return Response.error();
					});
			}),
		);
	}
});
