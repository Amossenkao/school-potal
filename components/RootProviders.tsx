// @/components/RootProviders.tsx
'use client';

import { useEffect } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import VercelUpgrade from '@/components/uca-inactive';
import AuthProvider from '@/context/AuthProvider';
import OfflineHandler from '@/components/OfflineHandler';
import { Toaster } from 'react-hot-toast';
import { applyTenantThemeToDocument } from '@/lib/tenantTheme';
import { clearAllClientCache } from '@/utils/clientCache';
import { clearUserSessionDataCaches } from '@/utils/sessionPrivacy';
import { useNetworkStore } from '@/store/networkStore';

const OFFLINE_REQUESTS_KEY = 'school_portal_offline_requests';
const LOGOUT_ENDPOINT = '/api/auth/login';

export default function RootProviders({
	children,
}: {
	children: React.ReactNode;
}) {
	const { school, fetchSchool, hydrateCache } = useSchoolStore();
	const { hydrateFromCache } = useAuth();
	const hasAppsFeature = Boolean(school?.enabledFeatures?.includes('apps'));

	// RootProviders.tsx
	useEffect(() => {
		hydrateCache();
		hydrateFromCache();
		const taskId = window.setTimeout(() => {
			void fetchSchool();
		}, 0);
		return () => window.clearTimeout(taskId);
	}, [fetchSchool, hydrateCache, hydrateFromCache]);

	// NEW: keep the dashboard shell warm for offline use
useEffect(() => {
	if (!('serviceWorker' in navigator)) return;

	const cacheShell = () => {
		const controller = navigator.serviceWorker.controller;
		if (!controller) return;
		const path = useAuth.getState().user ? '/dashboard' : '/login';
		controller.postMessage({ type: 'cache-app-shell', path });
	};

	cacheShell();
	navigator.serviceWorker.addEventListener('controllerchange', cacheShell);
	window.addEventListener('online', cacheShell);
	return () => {
		navigator.serviceWorker.removeEventListener('controllerchange', cacheShell);
		window.removeEventListener('online', cacheShell);
	};
}, []);

	useEffect(() => {
		if (!('serviceWorker' in navigator)) return;

		let hasReloadedForNewWorker = false;
		const handleControllerChange = () => {
			if (hasReloadedForNewWorker) return;
			hasReloadedForNewWorker = true;
			window.location.reload();
		};

		const requestSkipWaiting = (registration: ServiceWorkerRegistration) => {
			if (!registration.waiting) return;
			registration.waiting.postMessage({ type: 'skip-waiting' });
		};

		const manageServiceWorker = async () => {
			try {
				const registration = await navigator.serviceWorker.register('/sw.js');
				await registration.update().catch(() => undefined);
				requestSkipWaiting(registration);
				registration.addEventListener('updatefound', () => {
					const installing = registration.installing;
					if (!installing) return;
					installing.addEventListener('statechange', () => {
						if (
							installing.state === 'installed' &&
							navigator.serviceWorker.controller
						) {
							requestSkipWaiting(registration);
						}
					});
				});
			} catch (error) {
				console.warn('Service worker registration failed:', error);
			}
		};

		navigator.serviceWorker.addEventListener(
			'controllerchange',
			handleControllerChange,
		);
		manageServiceWorker();
		return () => {
			navigator.serviceWorker.removeEventListener(
				'controllerchange',
				handleControllerChange,
			);
		};
	}, []);

	useEffect(() => {
		const flushOfflineRequests = async () => {
			try {
				const raw = localStorage.getItem(OFFLINE_REQUESTS_KEY);
				if (!raw) return;
				const queued = JSON.parse(raw);
				if (!Array.isArray(queued) || queued.length === 0) {
					localStorage.removeItem(OFFLINE_REQUESTS_KEY);
					return;
				}
				const isOnline = await useNetworkStore.getState().refreshConnectivity({
					timeoutMs: 2200,
					force: true,
					reason: 'flush-offline-requests',
				});
				if (!isOnline) return;
				const remaining: any[] = [];
				let queuedLogoutResolved = false;

				for (const item of queued) {
					try {
						const res = await fetch(item.url, {
							method: item.method || 'GET',
							headers: item.headers || {},
							body: item.body,
							credentials: item.credentials || 'include',
						});
						const method = String(item?.method || 'GET').toUpperCase();
						const url = String(item?.url || '');
						const isLogoutRequest =
							method === 'DELETE' &&
							(url === LOGOUT_ENDPOINT || url.endsWith(LOGOUT_ENDPOINT));
						const logoutResolved =
							isLogoutRequest && (res.ok || res.status === 401);
						if (logoutResolved) {
							queuedLogoutResolved = true;
							continue;
						}
						if (!res.ok) {
							remaining.push(item);
						}
					} catch {
						remaining.push(item);
					}
				}

				if (queuedLogoutResolved) {
					localStorage.removeItem(OFFLINE_REQUESTS_KEY);
					useAuth.setState({
						user: null,
						isLoggedIn: false,
						error: null,
						isLoading: false,
						sessionId: null,
						isAwaitingOtp: false,
						otpContact: null,
						userId: null,
						userVersion: null,
					});
					useSchoolStore.getState().clearCache();
					clearAllClientCache();
					await clearUserSessionDataCaches({ mode: 'logout' });
					return;
				}

				if (remaining.length > 0) {
					localStorage.setItem(OFFLINE_REQUESTS_KEY, JSON.stringify(remaining));
				} else {
					localStorage.removeItem(OFFLINE_REQUESTS_KEY);
				}
			} catch (error) {
				console.warn('Failed to flush offline requests:', error);
			}
		};

		const flushQueue = () => {
			void flushOfflineRequests();
			if (
				hasAppsFeature &&
				'serviceWorker' in navigator &&
				navigator.serviceWorker.controller
			) {
				navigator.serviceWorker.controller.postMessage({
					type: 'flush-grade-queue',
				});
			}
		};
		window.addEventListener('online', flushQueue);
		flushQueue();
		return () => window.removeEventListener('online', flushQueue);
	}, [hasAppsFeature]);

	useEffect(() => {
		applyTenantThemeToDocument(
			localStorage.getItem('user_theme_preference') || school?.themeName,
		);
	}, [localStorage.getItem('user_theme_preference'), school?.themeName]);

	return (
		<AuthProvider>
			<ThemeProvider>
				<SidebarProvider>
					<OfflineHandler>
						{school ? school.isActive ? children : <VercelUpgrade /> : children}
					</OfflineHandler>
				</SidebarProvider>
				<Toaster position="top-right" />
			</ThemeProvider>
		</AuthProvider>
	);
}
