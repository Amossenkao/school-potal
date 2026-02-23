'use client';

import { useEffect, useRef } from 'react';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { useNetworkStore } from '@/store/networkStore';

const AUTH_REFRESH_INTERVAL_MS = 8000;

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

	useEffect(() => {
		let mounted = true;

		const ensureSchoolProfile = async () => {
			if (!mounted) return;
			const currentSchool = useSchoolStore.getState().school;
			if (currentSchool) return;
			try {
				await useSchoolStore.getState().fetchSchool();
			} catch (error) {
				console.error('[AuthProvider] Failed to fetch school profile:', error);
			}
		};

		const runPeriodicAuthRefresh = async (forceConnectivity = false) => {
			if (authRefreshInFlight.current) return;
			authRefreshInFlight.current = true;
			try {
				const online = await refreshConnectivity({
					force: forceConnectivity,
					timeoutMs: 2800,
					reason: 'auth-provider-refresh',
				});
				if (!online) {
					setAuthCheckFailed(true);
					return;
				}
				await checkAuthStatus();
				await ensureSchoolProfile();
			} catch (error) {
				console.error('[AuthProvider] Periodic auth refresh failed:', error);
				setAuthCheckFailed(true);
			} finally {
				authRefreshInFlight.current = false;
			}
		};

		const runInitialBootstrap = async () => {
			try {
				await bootstrapAuth({ force: true });
				await ensureSchoolProfile();
			} catch (error) {
				console.error('[AuthProvider] Initial auth bootstrap failed:', error);
			}
		};
		void runInitialBootstrap();

		const interval = window.setInterval(() => {
			void runPeriodicAuthRefresh(false);
		}, AUTH_REFRESH_INTERVAL_MS);

		const handleOnline = () => {
			setBrowserOnline(true);
			void runPeriodicAuthRefresh(true);
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
			void runPeriodicAuthRefresh(true);
		};
		connection?.addEventListener?.('change', handleConnectionChange);

		return () => {
			mounted = false;
			window.clearInterval(interval);
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
			connection?.removeEventListener?.('change', handleConnectionChange);
		};
	}, [
		bootstrapAuth,
		checkAuthStatus,
		refreshConnectivity,
		setAuthCheckFailed,
		setBrowserOnline,
		markOffline,
	]);

	useEffect(() => {
		if (typeof navigator === 'undefined') return;
		if (!navigator.onLine && !user) {
			markOffline('browser-offline');
		}
	}, [markOffline, user]);

	return <>{children}</>;
}
