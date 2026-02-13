'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';
import { useNetworkStore } from '@/store/networkStore';

export default function NotFound() {
	const pathname = usePathname();
	const { user } = useAuth();
	const isDashboardRoute = pathname.startsWith('/dashboard');
	const router = useRouter();
	const { isOnline } = useNetworkStore();

	useEffect(() => {
		if (isDashboardRoute && !user && isOnline) {
			router.replace('/login');
		}
	}, [isDashboardRoute, user, isOnline, router]);

	if (isDashboardRoute && !user) {
		if (!isOnline) {
			return (
				<PageLoading
					variant="dashboard-not-found"
					fullScreen={false}
					message="You're offline. Reconnect to verify access."
				/>
			);
		}
		return <PageLoading variant="school" message="Redirecting to login..." />;
	}

	if (isDashboardRoute && user) {
		return <PageLoading variant="dashboard-not-found" />;
	}

	return <PageLoading variant="not-found" />;
}
