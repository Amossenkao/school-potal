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
		if (typeof navigator !== 'undefined') {
			const connection = (navigator as any).connection;
			if (connection?.saveData) return;
			if (['slow-2g', '2g'].includes(connection?.effectiveType)) return;
		}
		const adminPosition =
			user.role === 'administrator' ? (user as any).position : undefined;
		preloadComponentsForUser(school, user.role, adminPosition);
	}, [school, user, isOnline]);

	return null;
}
