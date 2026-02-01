'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useAuth from '@/store/useAuth';
import LoginPage from '@/app/login/page';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';
import { useNetworkStore } from '@/store/networkStore';

interface ProtectedRouteProps {
	children: React.ReactNode;
	requiredRole?: string;
	allowedRoles?: string[];
}

const ProtectedRoute = ({
	children,
	requiredRole,
	allowedRoles,
}: ProtectedRouteProps) => {
	const { user, isLoading, checkAuthStatus } = useAuth();
	const { school } = useSchoolStore();
	const { isOnline, authCheckFailed } = useNetworkStore();
	const router = useRouter();
	const pathname = usePathname();
	const [initialCheckComplete, setInitialCheckComplete] = useState(false);
	const [hasUnauthorizedAccess, setHasUnauthorizedAccess] = useState(false);
	const [authCheckInProgress, setAuthCheckInProgress] = useState(true);

	// Check if this route has role requirements
	const hasRoleRequirements =
		requiredRole || (allowedRoles && allowedRoles.length > 0);

	// Initial auth check
	useEffect(() => {
		const initializeAuth = async () => {
			setAuthCheckInProgress(true);
			await checkAuthStatus();
			setInitialCheckComplete(true);
			setAuthCheckInProgress(false);
		};

		initializeAuth();
	}, [checkAuthStatus]);

	// Handle initial redirect for unauthenticated users
	useEffect(() => {
		// ✅ Don't redirect if user is offline and auth check failed
		if (authCheckFailed && !isOnline) {
			return; // Stay on the page, show offline message
		}

		// Also check if we have user data in memory - if yes, stay on page even if auth check failed temporarily
		if (user && authCheckFailed && !isOnline) {
			return; // User was authenticated before going offline
		}

		if (
			initialCheckComplete &&
			!authCheckInProgress &&
			!isLoading &&
			(!user || !user?.isActive)
		) {
			if (pathname !== '/login') {
				router.replace('/login');
			}
		}
	}, [
		initialCheckComplete,
		authCheckInProgress,
		isLoading,
		router,
		user?.isActive,
		authCheckFailed,
		isOnline,
		user,
		pathname,
	]);

	// Role-based access control check
	useEffect(() => {
		// Check for unauthorized access after user data is loaded
		if (initialCheckComplete && !isLoading && user) {
			let unauthorized = false;

			// **NEW:** Check if user must change password
			if (
				user.role !== 'system_admin' &&
				user.mustChangePassword &&
				pathname !== '/login/account-setup'
			) {
				router.replace('/login/account-setup');
				return; // Stop further execution
			}

			// Check for specific required role
			if (requiredRole && user.role !== requiredRole) {
				unauthorized = true;
			}

			// Check for allowed roles (if specified)
			if (
				allowedRoles &&
				allowedRoles.length > 0 &&
				!allowedRoles.includes(user.role)
			) {
				unauthorized = true;
			}

			if (unauthorized) {
				setHasUnauthorizedAccess(true);
			} else {
				setHasUnauthorizedAccess(false);
			}
		}
	}, [
		initialCheckComplete,
		isLoading,
		user,
		requiredRole,
		allowedRoles,
		router,
		pathname,
	]);

	// Show full loading screen only during the very first authentication check
	if (isLoading || !initialCheckComplete || authCheckInProgress) {
		return <PageLoading variant="school" fullScreen={true} />;
	}

	// ✅ If offline and auth check failed, don't redirect - let AdminLayout handle the UI
	if (authCheckFailed && !isOnline) {
		return <>{children}</>;
	}

	// If not logged in and no auth check error, show login page
	if (!user) {
		return <LoginPage />;
	}

	// If the user must change their password, show a loading screen while redirecting
	if (
		user?.role !== 'system_admin' &&
		user?.mustChangePassword &&
		pathname !== '/login/account-setup'
	) {
		return <PageLoading variant="school" fullScreen={true} />;
	}

	// Check role-based access if user is logged in
	if (user && hasUnauthorizedAccess) {
		// Show access denied message and stay on page
		return (
			<PageLoading
				variant="dashboard-not-found"
				message=""
				fullScreen={false}
			/>
		);
	}

	// User is authenticated and has proper permissions
	return <>{children}</>;
};

export default ProtectedRoute;
