// app/providers/AuthProvider.tsx
'use client';

import { useEffect } from 'react';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { useNetworkStore } from '@/store/networkStore';

export default function AuthProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const { checkAuthStatus } = useAuth();
	const setIsOnline = useNetworkStore((state) => state.setIsOnline);
	const setAuthCheckFailed = useNetworkStore(
		(state) => state.setAuthCheckFailed
	);

	useEffect(() => {
		let mounted = true;

		const runAuthCheck = async () => {
			if (typeof navigator !== 'undefined' && !navigator.onLine) {
				setIsOnline(false);
				setAuthCheckFailed(true);
				return;
			}
			try {
				await checkAuthStatus(); // ✅ Ping /api/auth/me
				if (mounted) {
					setIsOnline(true);
					setAuthCheckFailed(false); // Auth check succeeded
				}
			} catch (err) {
				if (mounted) {
					setIsOnline(false); // ❌ Network or server issue
					setAuthCheckFailed(true); // Mark that auth check failed
				}
				console.error('[AuthProvider] Failed to reach /api/auth/me:', err);
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

		// Periodic check
		const interval = setInterval(runAuthCheck, 15000);

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

	return <>{children}</>;
}
