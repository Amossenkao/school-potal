'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '@/store/useAuth';
import LoginPage from '@/app/login/page';
import { PageLoading } from '@/components/loading';

interface ProtectedRouteProps {
	children: React.ReactNode;
	requiredRole?: string;
	allowedRoles?: string[];
}

// Global flag to track if initial auth check has been completed
let globalAuthInitialized = false;

const ProtectedRoute = ({
	children,
	requiredRole,
	allowedRoles,
}: ProtectedRouteProps) => {
	const { isLoggedIn, user, isLoading, checkAuthStatus } = useAuth();
	const router = useRouter();
	const [initialCheckComplete, setInitialCheckComplete] = useState(
		globalAuthInitialized
	);
	const [hasUnauthorizedAccess, setHasUnauthorizedAccess] = useState(false);
	const [roleCheckComplete, setRoleCheckComplete] = useState(false);

	// Check if this route has role requirements
	const hasRoleRequirements =
		requiredRole || (allowedRoles && allowedRoles.length > 0);

	useEffect(() => {
		const initializeAuth = async () => {
			// Only run the auth check if it hasn't been done globally
			if (!globalAuthInitialized) {
				await checkAuthStatus();
				globalAuthInitialized = true;
			}
			setInitialCheckComplete(true);
		};

		initializeAuth();
	}, [checkAuthStatus]);

	useEffect(() => {
		if (
			initialCheckComplete &&
			!isLoading &&
			(!isLoggedIn || !user?.isActive)
		) {
			// Reset the global flag if user is not logged in
			globalAuthInitialized = false;
			router.replace('/login');
		}
	}, [initialCheckComplete, isLoggedIn, isLoading, router]);

	useEffect(() => {
		// Check for unauthorized access after user data is loaded
		if (initialCheckComplete && !isLoading && isLoggedIn && user) {
			let unauthorized = false;

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

			// Mark role check as complete
			setRoleCheckComplete(true);
		}
	}, [
		initialCheckComplete,
		isLoading,
		isLoggedIn,
		user,
		requiredRole,
		allowedRoles,
		router,
	]);

	// Show full loading screen only during the very first authentication check
	if ((isLoading || !initialCheckComplete) && !globalAuthInitialized) {
		return <PageLoading variant="school" fullScreen={true} />;
	}

	// Show brief loading for role-protected routes while checking permissions
	// if (
	// 	hasRoleRequirements &&
	// 	initialCheckComplete &&
	// 	isLoggedIn &&
	// 	!roleCheckComplete
	// ) {
	// 	return (
	// 		<div className="flex items-center justify-center min-h-[200px]">
	// 			<PageLoading message="Checking permissions..." fullScreen={false} />
	// 		</div>
	// 	);
	// }

	// If not logged in, show login page (this handles cases where redirect might not work)
	if (!isLoggedIn) {
		return <LoginPage />;
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
