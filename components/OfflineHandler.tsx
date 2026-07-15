// components/OfflineHandler.tsx
'use client';

import { useEffect } from 'react';
import { useNetworkStore } from '@/store/networkStore';

export default function OfflineHandler({
	children,
}: {
	children: React.ReactNode;
}) {
	const OFFLINE_ERROR_MESSAGE =
		'You are offline. Please connect to the internet and try again.';

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

		const shouldQueueOfflineMutation = (url: string, method: string) => {
			const normalizedMethod = method.toUpperCase();
			const isMutationMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
				normalizedMethod,
			);
			if (!isMutationMethod) return false;
			try {
				const parsed = new URL(url, window.location.origin);
				const isLoginCredentialRequest =
					parsed.pathname === '/api/auth/login' && normalizedMethod !== 'DELETE';
				return (
					parsed.origin === window.location.origin &&
					parsed.pathname.startsWith('/api/') &&
					!isLoginCredentialRequest
				);
			} catch (error) {
				return url.startsWith('/api/') && url !== '/api/auth/login';
			}
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

		const isConnectivityProbe = (url: string) => {
			return (
				url === 'https://www.gstatic.com/generate_204' ||
				url.includes('gstatic.com/generate_204')
			);
		};

		const isSameOriginApiRequest = (url: string) => {
			try {
				const parsed = new URL(url, window.location.origin);
				return (
					parsed.origin === window.location.origin &&
					parsed.pathname.startsWith('/api/')
				);
			} catch {
				return url.startsWith('/api/');
			}
		};

		const isAbortLikeError = (error: unknown) => {
			if (!error) return false;
			if (error instanceof DOMException) {
				return error.name === 'AbortError' || error.name === 'TimeoutError';
			}
			if (typeof error === 'object') {
				const candidate = error as { name?: unknown; message?: unknown };
				const name = typeof candidate.name === 'string' ? candidate.name : '';
				if (name === 'AbortError' || name === 'TimeoutError') return true;
				const message =
					typeof candidate.message === 'string' ? candidate.message : '';
				return /signal is aborted/i.test(message);
			}
			return false;
		};

		const isLikelyNetworkError = (error: unknown) => {
			if (isAbortLikeError(error)) return false;
			if (error instanceof TypeError) return true;
			if (typeof error === 'object' && error) {
				const candidate = error as { message?: unknown };
				const message =
					typeof candidate.message === 'string' ? candidate.message : '';
				return /network.?error/i.test(message) || /failed to fetch/i.test(message);
			}
			return false;
		};

		const verifyConnectivity = async (reason: string) => {
			if (typeof navigator !== 'undefined' && !navigator.onLine) {
				return false;
			}
			try {
				return await useNetworkStore.getState().refreshConnectivity({
					timeoutMs: 15000,
					reason,
				});
			} catch {
				return false;
			}
		};

		window.fetch = async (...args: Parameters<typeof fetch>) => {
			const { url, method } = getRequestMeta(args[0], args[1]);
			if (isConnectivityProbe(url)) {
				return originalFetch(...(args as Parameters<typeof fetch>));
			}

			const apiRequest = isSameOriginApiRequest(url);
			let { isOnline: onlineState } = useNetworkStore.getState();
			if (!onlineState && apiRequest) {
				onlineState = await verifyConnectivity('offline-fetch-guard');
			}

			const cacheableGet = shouldCacheGet(url, method);
			const request = cacheableGet ? buildCacheRequest(args[0], args[1]) : null;
			const fetchArgs = cacheableGet && request ? [request] : args;
			if (!onlineState) {
				if (shouldQueueOfflineMutation(url, method)) {
					return originalFetch(...(args as Parameters<typeof fetch>));
				}
				if (!apiRequest) {
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
					return originalFetch(...(args as Parameters<typeof fetch>));
				}
				return Promise.reject(new Error(OFFLINE_ERROR_MESSAGE));
			}
			try {
				const response = await originalFetch(
					...(fetchArgs as Parameters<typeof fetch>),
				);
				if (apiRequest && !useNetworkStore.getState().isOnline) {
					void verifyConnectivity('offline-fetch-recover');
				}
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
				if (isLikelyNetworkError(error)) {
					if (!apiRequest) {
						throw error;
					}
					const isOnline = await verifyConnectivity('fetch-request-failed');
					if (isOnline) {
						throw error;
					}
					useNetworkStore.getState().markOffline('fetch-request-failed');
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

	return <>{children}</>;
}
