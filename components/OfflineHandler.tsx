// components/OfflineHandler.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WifiOff } from 'lucide-react';
import { useNetworkStore } from '@/store/networkStore';

export default function OfflineHandler({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const isDashboardHomePath = pathname === '/dashboard' || pathname === '/dashboard/';
	const { isOnline } = useNetworkStore();
	const currentPathRef = useRef(pathname);
	const [showOfflineGate, setShowOfflineGate] = useState(false);
	const [offlineGateMessage, setOfflineGateMessage] = useState('');
	const isInitialLoad = useRef(true);
	const OFFLINE_ERROR_MESSAGE =
		'You are offline. Please connect to the internet and try again.';
	const DEFAULT_OFFLINE_GATE_MESSAGE =
		"You're currently offline, so this page can't be loaded. Go back to your previous view and try again when you're connected.";

	// Update current path reference
	useEffect(() => {
		if (isOnline) {
			currentPathRef.current = pathname;
			if (showOfflineGate) setShowOfflineGate(false);
		}
	}, [pathname, isOnline, showOfflineGate]);

	useEffect(() => {
		if (!isDashboardHomePath && showOfflineGate) {
			setShowOfflineGate(false);
		}
	}, [isDashboardHomePath, showOfflineGate]);

	useEffect(() => {
		const handleOfflineFetchWithDetail = (event: Event) => {
			if (!isDashboardHomePath) return;
			const customEvent = event as CustomEvent<{ message?: string }>;
			const nextMessage =
				customEvent.detail?.message || DEFAULT_OFFLINE_GATE_MESSAGE;
			setOfflineGateMessage(nextMessage);
			const navigatorOnline =
				typeof navigator !== 'undefined' ? navigator.onLine : isOnline;
			if (!navigatorOnline && isInitialLoad.current) return;
			setShowOfflineGate(true);
		};
		window.addEventListener('offline:fetch', handleOfflineFetchWithDetail);
		return () => {
			window.removeEventListener('offline:fetch', handleOfflineFetchWithDetail);
		};
	}, [DEFAULT_OFFLINE_GATE_MESSAGE, isDashboardHomePath, isOnline]);
	useEffect(() => {
		isInitialLoad.current = false;
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		if ((window as any).__offlineFetchWrapped) return;

		const originalFetch = window.fetch.bind(window);
		(window as any).__offlineFetchWrapped = true;

		const getRequestMeta = (input: RequestInfo | URL, init?: RequestInit) => {
			if (input instanceof Request) {
				return {
					url: input.url,
					method: input.method || 'GET',
				};
			}
			return {
				url: typeof input === 'string' ? input : input.toString(),
				method: init?.method || 'GET',
			};
		};

		const shouldShowOfflineModal = (url: string, method: string) => {
			const normalizedMethod = method.toUpperCase();
			// Only surface the offline modal for mutating API actions.
			if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod)) {
				return false;
			}
			if (normalizedMethod === 'POST' && url.includes('/api/grades')) {
				return false;
			}
			return url.includes('/api/');
		};

			const CACHEABLE_GET_PATHS = [
				'/api/users',
				'/api/grades',
				'/api/grades/requests',
				'/api/calendar',
			'/api/schedules',
			'/api/settings',
			'/api/notifications',
			'/api/school',
		];

		const shouldCacheGet = (url: string, method: string) => {
			if (method.toUpperCase() !== 'GET') return false;
			try {
				const parsed = new URL(url, window.location.origin);
				if (parsed.origin !== window.location.origin) return false;
				return CACHEABLE_GET_PATHS.some((path) =>
					parsed.pathname.startsWith(path)
				);
			} catch (error) {
				return false;
			}
		};

		const readCachedResponse = async (request: Request) => {
			if (!('caches' in window)) return null;
			try {
				return await caches.match(request);
			} catch (error) {
				return null;
			}
		};

		const getCacheUserKey = () => {
			try {
				const raw = localStorage.getItem('auth-user');
				if (!raw) return 'guest';
				const parsed = JSON.parse(raw);
				const id =
					parsed?.id || parsed?._id || parsed?.username || parsed?.email;
				const role = parsed?.role || 'user';
				return `${role}:${id || 'unknown'}`;
			} catch (error) {
				return 'guest';
			}
		};

		const buildStorageKey = (url: string) => {
			return `api-json:${getCacheUserKey()}:${url}`;
		};

		const readStoredJson = (url: string) => {
			if (typeof window === 'undefined') return null;
			try {
				const raw = localStorage.getItem(buildStorageKey(url));
				return raw ? JSON.parse(raw) : null;
			} catch (error) {
				return null;
			}
		};

		const writeStoredJson = (url: string, data: unknown) => {
			if (typeof window === 'undefined') return;
			try {
				localStorage.setItem(buildStorageKey(url), JSON.stringify(data));
			} catch (error) {
				console.warn('Failed to persist API cache:', error);
			}
		};

		const shouldAllowOffline = (url: string, method: string) => {
			const normalizedMethod = method.toUpperCase();
			return normalizedMethod === 'POST' && url.includes('/api/grades');
		};

		const buildCacheRequest = (
			input: RequestInfo | URL,
			init?: RequestInit,
		) => {
			const base = input instanceof Request ? input : new Request(input, init);
			const headers = new Headers(base.headers);
			headers.set('x-cache-user', getCacheUserKey());
			return new Request(base, { headers });
		};

		const writeCachedResponse = async (request: Request, response: Response) => {
			if (!('caches' in window)) return;
			try {
				const cache = await caches.open('api-runtime-v1');
				await cache.put(request, response);
			} catch (error) {
				console.warn('Failed to cache API response:', error);
			}
		};

		window.fetch = async (...args: Parameters<typeof fetch>) => {
			const { isOnline: storeOnlineState } = useNetworkStore.getState();
			const navigatorOnline =
				typeof navigator !== 'undefined' ? navigator.onLine : storeOnlineState;
			const onlineState = storeOnlineState && navigatorOnline;
			const { url, method } = getRequestMeta(args[0], args[1]);
			const cacheableGet = shouldCacheGet(url, method);
			const request = cacheableGet ? buildCacheRequest(args[0], args[1]) : null;
			const fetchArgs = cacheableGet && request ? [request] : args;
			if (!onlineState) {
				if (shouldAllowOffline(url, method)) {
					return originalFetch(...(args as Parameters<typeof fetch>));
				}
				if (method.toUpperCase() === 'GET') {
					if (cacheableGet) {
						const cached = request ? await readCachedResponse(request) : null;
						if (cached) return cached;
						const stored = readStoredJson(url);
						if (stored) {
							return new Response(JSON.stringify(stored), {
								status: 200,
								headers: { 'Content-Type': 'application/json' },
							});
						}
						return Promise.reject(new Error(OFFLINE_ERROR_MESSAGE));
					}
					// Allow static/non-API GET assets to resolve from browser/service-worker cache.
					return originalFetch(...(args as Parameters<typeof fetch>));
				}
				if (shouldShowOfflineModal(url, method)) {
					// Keep modal triggering explicit to avoid blocking offline refresh UX.
				}
				return Promise.reject(new Error(OFFLINE_ERROR_MESSAGE));
			}
			try {
				const response = await originalFetch(
					...(fetchArgs as Parameters<typeof fetch>),
				);
				if (cacheableGet && response.ok && request) {
					void writeCachedResponse(request, response.clone());
					response
						.clone()
						.json()
						.then((data) => writeStoredJson(url, data))
						.catch(() => null);
				}
				return response;
			} catch (error) {
				if (!navigator.onLine) {
					if (method.toUpperCase() === 'GET' && cacheableGet) {
						const cached = request ? await readCachedResponse(request) : null;
						if (cached) return cached;
						const stored = readStoredJson(url);
						if (stored) {
							return new Response(JSON.stringify(stored), {
								status: 200,
								headers: { 'Content-Type': 'application/json' },
							});
						}
					}
					if (shouldShowOfflineModal(url, method)) {
						// Keep modal triggering explicit to avoid blocking offline refresh UX.
					}
					throw new Error(OFFLINE_ERROR_MESSAGE);
				}
				throw error;
			}
		};

		return () => {
			window.fetch = originalFetch;
			(window as any).__offlineFetchWrapped = false;
		};
	}, []);

	return (
		<>
			{children}
			{isDashboardHomePath && showOfflineGate && (
				<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
					<div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-2xl">
						<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
							<WifiOff className="h-7 w-7 text-muted-foreground" />
						</div>
						<h2 className="mt-4 text-center text-xl font-semibold text-foreground">
							You're Offline
						</h2>
						<p className="mt-2 text-center text-sm text-muted-foreground">
							{offlineGateMessage || DEFAULT_OFFLINE_GATE_MESSAGE}
						</p>
						<div className="mt-6 flex justify-center">
							<button
								type="button"
								onClick={() => setShowOfflineGate(false)}
								className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
							>
								Back
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
