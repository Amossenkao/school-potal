'use client';

import { useCallback, useEffect, useRef } from 'react';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { useNetworkStore } from '@/store/networkStore';

const SYNC_STREAM_ENDPOINT = '/api/sync/events';
const SYNC_REFRESH_DEBOUNCE_MS = 180;

export default function AuthProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const bootstrapAuth = useAuth((state) => state.bootstrapAuth);
	const checkAuthStatus = useAuth((state) => state.checkAuthStatus);
	const user = useAuth((state) => state.user);

	const setBrowserOnline = useNetworkStore((state) => state.setBrowserOnline);
	const markOffline = useNetworkStore((state) => state.markOffline);
	const setAuthCheckFailed = useNetworkStore(
		(state) => state.setAuthCheckFailed,
	);
	const refreshConnectivity = useNetworkStore(
		(state) => state.refreshConnectivity,
	);

	const authRefreshInFlight = useRef(false);
	const syncEventDebounceRef = useRef<number | null>(null);
	const syncEventSourceRef = useRef<EventSource | null>(null);

	const ensureSchoolProfile = useCallback(async () => {
		const currentSchool = useSchoolStore.getState().school;
		if (currentSchool) return;
		try {
			await useSchoolStore.getState().fetchSchool();
		} catch (error) {
			console.error('[AuthProvider] Failed to fetch school profile:', error);
		}
	}, []);

	const runAuthRefresh = useCallback(
		async (options?: { forceConnectivity?: boolean; reason?: string }) => {
			if (authRefreshInFlight.current) return;
			authRefreshInFlight.current = true;
			try {
				const online = await refreshConnectivity({
					force: options?.forceConnectivity ?? false,
					timeoutMs: 2800,
					reason: options?.reason || 'auth-provider-refresh',
				});
				if (!online) {
					setAuthCheckFailed(true);
					return;
				}
				await checkAuthStatus();
				await ensureSchoolProfile();
			} catch (error) {
				console.error('[AuthProvider] Auth refresh failed:', error);
				setAuthCheckFailed(true);
			} finally {
				authRefreshInFlight.current = false;
			}
		},
		[checkAuthStatus, ensureSchoolProfile, refreshConnectivity, setAuthCheckFailed],
	);

	useEffect(() => {
		const runInitialBootstrap = async () => {
			try {
				await bootstrapAuth({ force: true });
				await ensureSchoolProfile();
			} catch (error) {
				console.error('[AuthProvider] Initial auth bootstrap failed:', error);
			}
		};
		void runInitialBootstrap();

		const handleOnline = () => {
			setBrowserOnline(true);
			void runAuthRefresh({
				forceConnectivity: true,
				reason: 'auth-provider-online',
			});
		};
		const handleOffline = () => {
			markOffline('browser-offline');
			setAuthCheckFailed(true);
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		const connection =
			typeof navigator !== 'undefined'
				? (navigator as Navigator & {
						connection?: EventTarget;
				  }).connection
				: undefined;
		const handleConnectionChange = () => {
			void runAuthRefresh({
				forceConnectivity: true,
				reason: 'auth-provider-connection-change',
			});
		};
		connection?.addEventListener?.('change', handleConnectionChange);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
			connection?.removeEventListener?.('change', handleConnectionChange);
		};
	}, [
		bootstrapAuth,
		ensureSchoolProfile,
		markOffline,
		runAuthRefresh,
		setAuthCheckFailed,
		setBrowserOnline,
	]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (!user?.isActive) {
			syncEventSourceRef.current?.close();
			syncEventSourceRef.current = null;
			if (syncEventDebounceRef.current !== null) {
				window.clearTimeout(syncEventDebounceRef.current);
				syncEventDebounceRef.current = null;
			}
			return;
		}

		const scheduleRefresh = (reason: string) => {
			if (syncEventDebounceRef.current !== null) {
				window.clearTimeout(syncEventDebounceRef.current);
			}
			syncEventDebounceRef.current = window.setTimeout(() => {
				syncEventDebounceRef.current = null;
				void runAuthRefresh({ reason });
			}, SYNC_REFRESH_DEBOUNCE_MS);
		};

		const source = new EventSource(SYNC_STREAM_ENDPOINT);
		syncEventSourceRef.current = source;

		const onReady = () => {
			setAuthCheckFailed(false);
		};
		const onSync = () => {
			scheduleRefresh('sync-event');
		};
		const onError = () => {
			if (typeof navigator !== 'undefined' && !navigator.onLine) {
				markOffline('browser-offline');
				setAuthCheckFailed(true);
			}
		};

		source.addEventListener('ready', onReady as EventListener);
		source.addEventListener('sync', onSync as EventListener);
		source.addEventListener('error', onError as EventListener);

		return () => {
			source.removeEventListener('ready', onReady as EventListener);
			source.removeEventListener('sync', onSync as EventListener);
			source.removeEventListener('error', onError as EventListener);
			source.close();
			if (syncEventSourceRef.current === source) {
				syncEventSourceRef.current = null;
			}
			if (syncEventDebounceRef.current !== null) {
				window.clearTimeout(syncEventDebounceRef.current);
				syncEventDebounceRef.current = null;
			}
		};
	}, [markOffline, runAuthRefresh, setAuthCheckFailed, user?.id, user?.isActive]);

	useEffect(() => {
		if (typeof navigator === 'undefined') return;
		if (!navigator.onLine && !user) {
			markOffline('browser-offline');
		}
	}, [markOffline, user]);

	return <>{children}</>;
}
