'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';

export default function NotFound() {
	const pathname = usePathname();
	const { isLoggedIn, checkAuthStatus, isLoading } = useAuth();
	const [authChecked, setAuthChecked] = useState(false);
	const isDashboardRoute = pathname.startsWith('/dashboard');
	const router = useRouter();

	useEffect(() => {
		const initAuth = async () => {
			await checkAuthStatus();
			setAuthChecked(true);
		};
		initAuth();
	}, [checkAuthStatus]);

	// Handle navigation after auth is checked
	useEffect(() => {
		if (authChecked && !isLoading) {
			if (isDashboardRoute && !isLoggedIn) {
				router.replace('/login');
			}
		}
	}, [authChecked, isLoading, isDashboardRoute, isLoggedIn, router]);

	// Show loading while checking auth
	// if (!authChecked || isLoading) {
	// 	return (
	// 		<div className="flex items-center justify-center h-screen">
	// 			<PageLoading
	// 				fullScreen={false}
	// 				variant="school"
	// 				size="lg"
	// 				message="Checking authentication..."
	// 			/>
	// 		</div>
	// 	);
	// }

	// If it's a dashboard route and user is not logged in, show loading while redirecting
	if (isDashboardRoute && !isLoggedIn) {
		return (
			<div className="flex items-center justify-center h-screen">
				<PageLoading
					// fullScreen={false}
					variant="school"
					// size="lg"
					// message="Redirecting to login..."
				/>
			</div>
		);
	}

	// If it's a dashboard route and user is logged in, show dashboard 404
	if (isDashboardRoute && isLoggedIn) {
		return <PageLoading variant="dashboard-not-found" message="" />;
	}

	return <PageLoading variant="not-found" message="" />;
}
