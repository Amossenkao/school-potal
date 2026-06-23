'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';

export default function AppNotFoundClient() {
	const pathname = usePathname();
	const { user, bootstrapAuth, hasBootstrapped, isBootstrapping } = useAuth();
	const isDashboardRoute = pathname.startsWith('/dashboard');
	const router = useRouter();

	useEffect(() => {
		if (!isDashboardRoute) return;
		void bootstrapAuth();
	}, [bootstrapAuth, isDashboardRoute]);

	useEffect(() => {
		if (!isDashboardRoute) return;
		if (!hasBootstrapped || isBootstrapping) return;
		if (user) return;
		router.replace('/login');
	}, [isDashboardRoute, hasBootstrapped, isBootstrapping, user, router]);

	if (isDashboardRoute && (!hasBootstrapped || isBootstrapping)) {
		return <PageLoading variant="school" message="Loading..." />;
	}

	if (isDashboardRoute && !user) {
		return <PageLoading variant="school" message="Loading..." />;
	}

	if (isDashboardRoute && user) {
		return <PageLoading variant="dashboard-not-found" />;
	}

	return <PageLoading variant="not-found" />;
}
