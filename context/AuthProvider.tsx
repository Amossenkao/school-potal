// app/providers/AuthProvider.tsx
'use client';

import { useEffect, useRef } from 'react';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { useNetworkStore } from '@/store/networkStore';

export default function AuthProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const { checkAuthStatus, hydrateFromCache, user } = useAuth();
	const setIsOnline = useNetworkStore((state) => state.setIsOnline);
	const setAuthCheckFailed = useNetworkStore(
		(state) => state.setAuthCheckFailed
	);
	const authCheckInFlight = useRef(false);

	useEffect(() => {
		let mounted = true;

		const runAuthCheck = async () => {
			if (authCheckInFlight.current) return;
			authCheckInFlight.current = true;
			const navigatorOnline =
				typeof navigator !== 'undefined' ? navigator.onLine : true;
			setIsOnline(navigatorOnline);
			if (!navigatorOnline) {
				if (!user) {
					hydrateFromCache();
				}
				setAuthCheckFailed(true);
				authCheckInFlight.current = false;
				return;
			}

			try {
				await checkAuthStatus(); // ✅ Ping /api/auth/me
			} catch (err) {
				console.error('[AuthProvider] Failed to reach /api/auth/me:', err);
				setAuthCheckFailed(true);
			} finally {
				authCheckInFlight.current = false;
			}

			if (mounted) {
				const currentSchool = useSchoolStore.getState().school;
				if (!currentSchool) {
					try {
						await useSchoolStore.getState().fetchSchool();
					} catch (err) {
						console.error('[AuthProvider] Failed to fetch school:', err);
					}
				}
			}
		};

		// Initial check
		runAuthCheck();

		// Periodic check: keep lightweight for low-end devices and slow links.
		const interval = setInterval(runAuthCheck, 30000);

		// Listen for browser online/offline events
		const handleOnline = () => {
			setIsOnline(true);
			// When back online, recheck auth immediately
			runAuthCheck();
		};
		const handleOffline = () => {
			setIsOnline(false);
			setAuthCheckFailed(true);
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			mounted = false;
			clearInterval(interval);
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}, [checkAuthStatus, setIsOnline, setAuthCheckFailed]);

	useEffect(() => {
		if (typeof navigator === 'undefined') return;
		if (!navigator.onLine && !user) {
			hydrateFromCache();
		}
	}, [hydrateFromCache, user]);

	return <>{children}</>;
}
