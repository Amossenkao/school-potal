'use client';

import { useEffect } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { useNetworkStore } from '@/store/networkStore';
import { preloadComponentsForUser } from '@/utils/componentsMap';

export default function PrefetchDashboardChunks() {
	const { school } = useSchoolStore();
	const { user } = useAuth();
	const { isOnline } = useNetworkStore();

	useEffect(() => {
		if (!school || !user || !isOnline) return;

		const runPrefetch = () => {
			const adminPosition =
				user.role === 'administrator' ? (user as any).position : undefined;
			preloadComponentsForUser(school, user.role, adminPosition);
		};

		if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
			const idleId = (window as any).requestIdleCallback(runPrefetch, {
				timeout: 2000,
			});
			return () => {
				(window as any).cancelIdleCallback?.(idleId);
			};
		}

		const timeoutId = window.setTimeout(runPrefetch, 150);
		return () => window.clearTimeout(timeoutId);
	}, [school, user, isOnline]);

	return null;
}
