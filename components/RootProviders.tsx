// @/components/RootProviders.tsx
'use client';

import { useEffect } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import AuthProvider from '@/context/AuthProvider';
import OfflineHandler from '@/components/OfflineHandler';
import toast, { Toaster } from 'react-hot-toast';
import { applyTenantThemeToDocument } from '@/lib/tenantTheme';
import { clearAllClientCache } from '@/utils/clientCache';
import { clearUserSessionDataCaches } from '@/utils/sessionPrivacy';
import { useNetworkStore } from '@/store/networkStore';
import { cacheAppShellDirect } from '@/utils/cacheAppShell';
import {
	initTabSync,
	stopTabSync,
	isTabLeader,
	onLeadershipChange,
	onSyncState,
} from '@/lib/tabSync';
import {
	runLeaderOutboxFlush,
	registerOutboxBackgroundSync,
	requestOutboxFlush,
} from '@/lib/outboxSync';
import { resolveTenantSyncKey } from '@/lib/realtimeSync';
import { isSyncEngineEnabled } from '@/lib/syncFeatureFlag';
import Inactive from './inactive';
import { HasSchoolProvider } from '@/context/HasSchoolContext';

const OFFLINE_REQUESTS_KEY = 'school_portal_offline_requests';
const LOGOUT_ENDPOINT = '/api/auth/login';

// DETERMINISTIC 4-PHASE OFFLINE-TO-ONLINE SYNC PIPELINE (leader-tab only)
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
			useSchoolStore.getState().school?.identity.currentAcademicYear;
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

export default function RootProviders({
	children,
	hasSchool = false,
}: {
	children: React.ReactNode;
	hasSchool?: boolean;
}) {
	const { school, hydrateCache } = useSchoolStore();

	// Initialize store network event hooks once
	useEffect(() => {
		useNetworkStore.getState().initNetworkListeners();
	}, []);

	// Hydrate school metadata cache. Auth cache hydration is handled
	// exclusively by bootstrapAuth in the auth store — no competing caller.
	useEffect(() => {
		hydrateCache();
	}, [hydrateCache]);

	// ── Multi-tab coordination (Phase 3, flag-gated) ──────────────────────
	// Elects a leader tab (Web Locks), keeps followers' sync indicator in
	// sync via BroadcastChannel gossip, and triggers the leader-only
	// pipeline + outbox flush whenever a tab takes the crown.
	const executeLeaderTasks = async () => {
		if (!isTabLeader()) return;
		await runLeaderOutboxFlush();
		void executeSyncPipeline();
	};

	useEffect(() => {
		if (!isSyncEngineEnabled()) return;

		const tenantId = resolveTenantSyncKey({
			schoolProfile: school,
			host: typeof window !== 'undefined' ? window.location.host : null,
		});
		initTabSync({ tenantId: tenantId || undefined });

		let flushInterval: number | null = null;

		const unsubLeadership = onLeadershipChange((isLeader) => {
			if (isLeader) {
				if (flushInterval === null) {
					flushInterval = window.setInterval(() => {
						if (useNetworkStore.getState().isOnline) {
							void runLeaderOutboxFlush();
						}
					}, 30_000);
				}
				if (useNetworkStore.getState().isOnline) {
					void executeLeaderTasks();
				}
			} else if (flushInterval !== null) {
				window.clearInterval(flushInterval);
				flushInterval = null;
			}
		});

		const unsubSyncState = onSyncState((state) => {
			useNetworkStore.getState().setSyncSummary(state.summary);
		});

		void registerOutboxBackgroundSync();

		return () => {
			unsubLeadership();
			unsubSyncState();
			if (flushInterval !== null) {
				window.clearInterval(flushInterval);
			}
			stopTabSync();
		};
	}, [school?.system?.dbName, school?.system?.host]);

	// Follower tabs ping the leader to flush when they rehydrate.
	useEffect(() => {
		if (!isSyncEngineEnabled() || isTabLeader()) return;
		const timer = window.setTimeout(() => {
			requestOutboxFlush();
		}, 1500);
		return () => window.clearTimeout(timer);
	}, []);

	// Keep Dashboard shell hot
	useEffect(() => {
		cacheAppShellDirect('/login');
		void cacheAppShellDirect('/dashboard');

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
	// 4-PHASE OFFLINE-TO-ONLINE SYNC PIPELINE TRIGGER
	// =========================================================================
	useEffect(() => {
		const maybeRunPipeline = () => {
			if (!useNetworkStore.getState().isOnline) return;
			// Without the sync engine flag, run the recovery pipeline in every
			// tab as before. With it, the leader tab owns the pipeline so two
			// tabs never race the same catch-up.
			if (!isSyncEngineEnabled() || isTabLeader()) {
				void executeSyncPipeline();
			}
		};

		maybeRunPipeline();

		const unsubNetwork = useNetworkStore.subscribe((state, prevState) => {
			if (state.isOnline && !prevState.isOnline) {
				maybeRunPipeline();
			}
		});

		return () => unsubNetwork();
	}, []);

	useEffect(() => {
		if (!('serviceWorker' in navigator)) return;
		const handleMessage = (event: MessageEvent) => {
			const data = event?.data;
			if (data?.type !== 'flush-grade-queue-result') return;
			if (data.deadCount > 0) {
				console.warn(
					`[Sync Pipeline] ${data.deadCount} queued request(s) hit the dead-letter limit and were not replayed.`,
				);
			}
			if (data.flushedCount > 0) {
				console.log(
					`[Sync Pipeline] Replayed ${data.flushedCount} queued request(s).`,
				);
			}
		};
		navigator.serviceWorker.addEventListener('message', handleMessage);
		return () =>
			navigator.serviceWorker.removeEventListener('message', handleMessage);
	}, []);

	useEffect(() => {
		const preferredTheme = localStorage.getItem('user_theme_preference');
		applyTenantThemeToDocument(preferredTheme || school?.branding.themeName);
	}, [school?.branding.themeName]);

	return (
		<HasSchoolProvider value={hasSchool}>
			<AuthProvider>
				<ThemeProvider>
					<SidebarProvider>
						<OfflineHandler>
							{school ? school.system?.isActive ? children : <Inactive /> : children}
						</OfflineHandler>
					</SidebarProvider>
					<Toaster
						position="top-right"
						toastOptions={{
							duration: 4000,
							style: {
								borderRadius: '12px',
								padding: '12px 16px',
								fontSize: '14px',
								fontWeight: 500,
							},
							success: {
								iconTheme: { primary: '#10b981', secondary: '#fff' },
							},
							error: {
								iconTheme: { primary: '#ef4444', secondary: '#fff' },
							},
						}}
					/>
				</ThemeProvider>
			</AuthProvider>
		</HasSchoolProvider>
	);
}
