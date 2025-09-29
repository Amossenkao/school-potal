'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useAuth from '@/store/useAuth';
import LoginPage from '@/app/login/page';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';

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
	const { isLoggedIn, user, isLoading } = useAuth();
	const { school } = useSchoolStore();
	const router = useRouter();
	const pathname = usePathname();
	const [initialCheckComplete, setInitialCheckComplete] = useState(false);
	const [hasUnauthorizedAccess, setHasUnauthorizedAccess] = useState(false);

	// Check if this route has role requirements
	const hasRoleRequirements =
		requiredRole || (allowedRoles && allowedRoles.length > 0);

	// Initial auth check
	useEffect(() => {
		const initializeAuth = async () => {
			// For initial load, just check if user is logged in
			setInitialCheckComplete(true);
		};

		initializeAuth();
	}, []);

	// Handle initial redirect for unauthenticated users
	useEffect(() => {
		if (
			initialCheckComplete &&
			!isLoading &&
			(!isLoggedIn || !user?.isActive)
		) {
			router.replace('/login');
		}
	}, [initialCheckComplete, isLoggedIn, isLoading, router, user?.isActive]);

	// Role-based access control check
	useEffect(() => {
		// Check for unauthorized access after user data is loaded
		if (initialCheckComplete && !isLoading && isLoggedIn && user) {
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
		isLoggedIn,
		user,
		requiredRole,
		allowedRoles,
		router,
		pathname,
	]);

	// Show full loading screen only during the very first authentication check
	if (isLoading || !initialCheckComplete) {
		return <PageLoading variant="school" fullScreen={true} />;
	}

	// If not logged in and no auth check error, show login page
	if (!isLoggedIn) {
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
