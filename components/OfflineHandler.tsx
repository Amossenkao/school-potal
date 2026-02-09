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
	const { isOnline } = useNetworkStore();
	const currentPathRef = useRef(pathname);
	const [showOfflineGate, setShowOfflineGate] = useState(false);
	const OFFLINE_ERROR_MESSAGE =
		'You are offline. Please connect to the internet and try again.';

	// Update current path reference
	useEffect(() => {
		if (isOnline) {
			currentPathRef.current = pathname;
			if (showOfflineGate) setShowOfflineGate(false);
		}
	}, [pathname, isOnline, showOfflineGate]);

	useEffect(() => {
		const handleOfflineFetch = () => {
			setShowOfflineGate(true);
		};
		window.addEventListener('offline:fetch', handleOfflineFetch);
		return () => {
			window.removeEventListener('offline:fetch', handleOfflineFetch);
		};
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
			return url.includes('/api/');
		};

		const CACHEABLE_GET_PATHS = [
			'/api/users',
			'/api/grades',
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
			const { isOnline: onlineState } = useNetworkStore.getState();
			const { url, method } = getRequestMeta(args[0], args[1]);
			const cacheableGet = shouldCacheGet(url, method);
			const request = cacheableGet
				? args[0] instanceof Request
					? args[0]
					: new Request(url, args[1])
				: null;
			if (!onlineState) {
				if (method.toUpperCase() === 'GET') {
					if (cacheableGet) {
						const cached = request ? await readCachedResponse(request) : null;
						if (cached) return cached;
					}
					return Promise.reject(new Error(OFFLINE_ERROR_MESSAGE));
				}
				if (shouldShowOfflineModal(url, method)) {
					window.dispatchEvent(new CustomEvent('offline:fetch'));
				}
				return Promise.reject(new Error(OFFLINE_ERROR_MESSAGE));
			}
			try {
				const response = await originalFetch(...args);
				if (cacheableGet && response.ok && request) {
					void writeCachedResponse(request, response.clone());
				}
				return response;
			} catch (error) {
				if (!navigator.onLine) {
					if (method.toUpperCase() === 'GET' && cacheableGet) {
						const cached = request ? await readCachedResponse(request) : null;
						if (cached) return cached;
					}
					if (shouldShowOfflineModal(url, method)) {
						window.dispatchEvent(new CustomEvent('offline:fetch'));
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
			{showOfflineGate && (
				<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
					<div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-2xl">
						<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
							<WifiOff className="h-7 w-7 text-muted-foreground" />
						</div>
						<h2 className="mt-4 text-center text-xl font-semibold text-foreground">
							You're Offline
						</h2>
						<p className="mt-2 text-center text-sm text-muted-foreground">
							You're currently offline, so this page can't be loaded. Go back to
							your previous view and try again when you're connected.
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
