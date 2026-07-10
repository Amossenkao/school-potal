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
import { cacheAppShellDirect } from '@/utils/cacheAppShell';

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

	// Initialize store network event hooks once
	useEffect(() => {
		useNetworkStore.getState().initNetworkListeners();
	}, []);

	// Hydrate global caches locally
	useEffect(() => {
		hydrateCache();
		hydrateFromCache();
		void fetchSchool();
	}, [fetchSchool, hydrateCache, hydrateFromCache]);

	// Keep Dashboard shell hot
	useEffect(() => {
		cacheAppShellDirect(useAuth.getState().user ? '/dashboard' : '/login');

		const unsubAuth = useAuth.subscribe((state, prevState) => {
			if (state.user !== prevState.user) {
				cacheAppShellDirect(state.user ? '/dashboard' : '/login');
			}
		});

		const unsubNetwork = useNetworkStore.subscribe((state, prevState) => {
			if (state.isOnline && !prevState.isOnline) {
				cacheAppShellDirect(useAuth.getState().user ? '/dashboard' : '/login');
			}
		});

		return () => {
			unsubAuth();
			unsubNetwork();
		};
	}, []);

	// Service Worker registration logic
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

	// =========================================================================
	// DETERMINISTIC 4-PHASE OFFLINE-TO-ONLINE SYNC PIPELINE
	// =========================================================================
	useEffect(() => {
		const executeSyncPipeline = async () => {
			// Guard clause: Avoid overlapping sync attempts
			if (useNetworkStore.getState().isSyncing) return;
			useNetworkStore.setState({ isSyncing: true });

			console.log('[Sync Pipeline] Commencing catch-up process...');

			try {
				// -------------------------------------------------------------
				// PHASE 1: Session & Connectivity Verification
				// -------------------------------------------------------------
				const isOnline = await useNetworkStore.getState().refreshConnectivity({
					timeoutMs: 2500,
					force: true,
					reason: 'pipeline-verification',
				});
				if (!isOnline) {
					console.warn('[Sync Pipeline] Aborted. Connection verified false.');
					return;
				}

				let isSessionValid = false;
				try {
					await useAuth.getState().checkAuthStatus({
						skipConnectivityCheck: true,
						force: true,
						trigger: 'pipeline-session-validation',
					});
					isSessionValid = !!useAuth.getState().user?.isActive;
				} catch (authError) {
					console.error(
						'[Sync Pipeline] Phase 1 verification request failed:',
						authError,
					);
				}
if (!isSessionValid) {
	console.warn(
		'[Sync Pipeline] No valid session. Clearing secure queues and refreshing public state.',
	);

	// 1. Clear secure outbound queues
	localStorage.removeItem(OFFLINE_REQUESTS_KEY);

	// 2. Reset Auth state
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

	// 3. THE FIX: Fetch the latest public school state so the login page gets the updated config
	await useSchoolStore.getState().fetchSchool();

	// 4. Clear sensitive caches
	clearAllClientCache();
	await clearUserSessionDataCaches({ mode: 'logout' });

	return; // Now it is safe to abort the rest of the authenticated pipeline
}

				// -------------------------------------------------------------
				// PHASE 2: Outbound Queue Replay (Strict FIFO Order)
				// -------------------------------------------------------------
				const raw = localStorage.getItem(OFFLINE_REQUESTS_KEY);
				if (raw) {
					const queued = JSON.parse(raw);
					if (Array.isArray(queued) && queued.length > 0) {
						const remaining: any[] = [];
						let queuedLogoutResolved = false;

						for (const item of queued) {
							try {
								// Inject structural tracking headers for server-side idempotency handling
								const headers = {
									...(item.headers || {}),
									'X-Offline-Sync-Id': item.offlineId || crypto.randomUUID(),
									'X-Offline-Timestamp': String(item.timestamp || Date.now()),
								};

								const res = await fetch(item.url, {
									method: item.method || 'GET',
									headers,
									body: item.body,
									credentials: item.credentials || 'include',
								});

								const method = String(item?.method || 'GET').toUpperCase();
								const url = String(item?.url || '');
								const isLogoutRequest =
									method === 'DELETE' &&
									(url === LOGOUT_ENDPOINT || url.endsWith(LOGOUT_ENDPOINT));

								if (isLogoutRequest && (res.ok || res.status === 401)) {
									queuedLogoutResolved = true;
									break;
								}

								// If request fails due to 5xx error or connection dropping mid-stream, keep it in FIFO queue
								// If it fails due to 4xx (Client Conflict), proceed but drop it to prevent permanent queue blocks
								if (!res.ok && res.status >= 500) {
									remaining.push(item);
								}
							} catch (fetchError) {
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
							localStorage.setItem(
								OFFLINE_REQUESTS_KEY,
								JSON.stringify(remaining),
							);
						} else {
							localStorage.removeItem(OFFLINE_REQUESTS_KEY);
						}
					}
				}

				// -------------------------------------------------------------
				// PHASE 3: Service Worker Synchronization
				// -------------------------------------------------------------
				if (
					hasAppsFeature &&
					'serviceWorker' in navigator &&
					navigator.serviceWorker.controller
				) {
					navigator.serviceWorker.controller.postMessage({
						type: 'flush-grade-queue',
					});
				}

				// -------------------------------------------------------------
				// PHASE 4: Inbound Stream Catch-Up (Full Fallback Rehydration)
				// -------------------------------------------------------------
				await useSchoolStore.getState().fetchSchool();
				const activeYear =
					useSchoolStore.getState().school?.currentAcademicYear;
				if (
					activeYear &&
					useSchoolStore.getState().hasPendingGradeSync(activeYear)
				) {
					useSchoolStore.getState().runBackgroundGradeSync(activeYear);
				}

				console.log('[Sync Pipeline] Pipeline executed successfully.');
			} catch (pipelineError) {
				console.error(
					'[Sync Pipeline] Fatal processing error during recovery:',
					pipelineError,
				);
			} finally {
				useNetworkStore.setState({ isSyncing: false });
			}
		};

		// Run pipeline directly if we boot online
		if (useNetworkStore.getState().isOnline) {
			void executeSyncPipeline();
		}

		// Subscribe cleanly to offline -> online store state changes
		const unsubNetwork = useNetworkStore.subscribe((state, prevState) => {
			if (state.isOnline && !prevState.isOnline) {
				void executeSyncPipeline();
			}
		});

		return () => unsubNetwork();
	}, [hasAppsFeature]);

	useEffect(() => {
		const preferredTheme = localStorage.getItem('user_theme_preference');
		applyTenantThemeToDocument(preferredTheme || school?.themeName);
	}, [school?.themeName]);

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
