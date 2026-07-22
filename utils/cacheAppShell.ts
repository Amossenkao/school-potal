//@/utils/cacheAppShell.ts
const RUNTIME_CACHE_NAME = 'runtime-v10';

export async function cacheAppShellDirect(path: '/dashboard' | '/login') {
	if (typeof window === 'undefined' || !('caches' in window)) return;
	try {
		const response = await fetch(path, {
			credentials: 'include',
			cache: 'no-store',
		});
		if (!response.ok) return;
		const cache = await caches.open(RUNTIME_CACHE_NAME);
		await cache.put(path, response.clone());
		if (path === '/dashboard') {
			await cache.put('/dashboard/', response.clone());
		}
	} catch (error) {
		console.warn('Failed to cache app shell:', path, error);
	}
}
