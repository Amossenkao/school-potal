'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';
import { useNetworkStore } from '@/store/networkStore';

const hasCachedAuthUser = () => {
	if (typeof window === 'undefined') return false;
	try {
		return Boolean(localStorage.getItem('auth-user'));
	} catch (error) {
		console.warn('Unable to read auth cache:', error);
		return false;
	}
};

export default function AppNotFoundClient() {
	const pathname = usePathname();
	const { user } = useAuth();
	const isDashboardRoute = pathname.startsWith('/dashboard');
	const router = useRouter();
	const { isOnline } = useNetworkStore();

	useEffect(() => {
		if (!isDashboardRoute || user) return;

		if (isOnline) {
			router.replace('/login');
			return;
		}

		if (hasCachedAuthUser()) {
			router.replace('/dashboard');
			return;
		}

		router.replace('/login');
	}, [isDashboardRoute, user, isOnline, router]);

	if (isDashboardRoute && !user) {
		return <PageLoading variant="school" message="Loading..." />;
	}

	if (isDashboardRoute && user) {
		return <PageLoading variant="dashboard-not-found" />;
	}

	return <PageLoading variant="not-found" />;
}
