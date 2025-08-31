'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
	const { isLoggedIn, user, isLoading, checkAuthStatus, setUser } = useAuth();
	const router = useRouter();
	const pathname = usePathname();
	const [initialCheckComplete, setInitialCheckComplete] = useState(
		globalAuthInitialized
	);
	const [hasUnauthorizedAccess, setHasUnauthorizedAccess] = useState(false);
	const [roleCheckComplete, setRoleCheckComplete] = useState(false);
	const [authCheckError, setAuthCheckError] = useState<string | null>(null);

	// Refs to store interval and prevent multiple intervals
	const authCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const isCheckingAuthRef = useRef(false);

	// Check if this route has role requirements
	const hasRoleRequirements =
		requiredRole || (allowedRoles && allowedRoles.length > 0);

	// Function to determine if an error indicates no session vs network/other error
	const isSessionError = (error: any): boolean => {
		// Customize this logic based on your API's error responses
		// Examples of session-related errors (adjust based on your API):
		if (error?.response?.status === 401) return true; // Unauthorized
		if (error?.response?.status === 403) return true; // Forbidden
		if (error?.message?.includes('session expired')) return true;
		if (error?.message?.includes('unauthorized')) return true;
		if (error?.message?.includes('authentication failed')) return true;

		// Network errors, server errors, etc. should NOT log out the user
		return false;
	};

	// Function to handle auth check and potential redirect
	const handleAuthCheck = async () => {
		// Prevent multiple simultaneous auth checks
		if (isCheckingAuthRef.current) return;

		try {
			isCheckingAuthRef.current = true;
			setAuthCheckError(null); // Clear any previous errors

			await checkAuthStatus();

			// Get the latest auth state after check
			const authStore = useAuth.getState();

			// Only redirect if we successfully checked auth but user is not logged in or inactive
			if (!authStore.isLoggedIn || !authStore.user?.isActive) {
				// Clear the interval before redirect
				if (authCheckIntervalRef.current) {
					clearInterval(authCheckIntervalRef.current);
					authCheckIntervalRef.current = null;
				}

				// Reset the global flag
				globalAuthInitialized = false;

				// Redirect to login only if we successfully determined no valid session
				router.replace('/login');
			} else {
				setUser(authStore.user);
			}
		} catch (error) {
			console.error('Auth check failed:', error);

			// Only redirect on session-related errors, not network/server errors
			if (isSessionError(error)) {
				// Clear the interval before redirect
				if (authCheckIntervalRef.current) {
					clearInterval(authCheckIntervalRef.current);
					authCheckIntervalRef.current = null;
				}
				globalAuthInitialized = false;
				router.replace('/login');
			} else {
				// For network errors or other non-session errors, don't log out
				// Just set error state and continue with existing session
				setAuthCheckError(
					'Unable to verify session. Please check your connection.'
				);
				console.warn(
					'Auth check failed due to network/server error, maintaining current session'
				);
			}
		} finally {
			isCheckingAuthRef.current = false;
		}
	};

	// Initial auth check
	useEffect(() => {
		const initializeAuth = async () => {
			// Only run the auth check if it hasn't been done globally
			if (!globalAuthInitialized) {
				try {
					await checkAuthStatus();
					globalAuthInitialized = true;
				} catch (error) {
					console.error('Initial auth check failed:', error);

					// Only mark as initialized and potentially redirect for session errors
					if (isSessionError(error)) {
						globalAuthInitialized = true;
					} else {
						// For network errors, mark as initialized but don't redirect
						globalAuthInitialized = true;
						setAuthCheckError(
							'Unable to verify session. Please check your connection.'
						);
					}
				}
			}
			setInitialCheckComplete(true);
		};

		initializeAuth();
	}, [checkAuthStatus]);

	// Set up periodic auth check
	useEffect(() => {
		// Only start the interval if user is logged in and initial check is complete
		if (initialCheckComplete && isLoggedIn && user?.isActive) {
			// Clear any existing interval first
			if (authCheckIntervalRef.current) {
				clearInterval(authCheckIntervalRef.current);
			}

			// Set up new interval for every 15 seconds (changed back from 1 second)
			authCheckIntervalRef.current = setInterval(() => {
				handleAuthCheck();
			}, 15000);
		}

		// Cleanup function
		return () => {
			if (authCheckIntervalRef.current) {
				clearInterval(authCheckIntervalRef.current);
				authCheckIntervalRef.current = null;
			}
		};
	}, [initialCheckComplete, isLoggedIn, user?.isActive]);

	// Handle initial redirect for unauthenticated users
	useEffect(() => {
		if (
			initialCheckComplete &&
			!isLoading &&
			(!isLoggedIn || !user?.isActive)
		) {
			// Only redirect if there's no auth check error (meaning we successfully determined no session)
			if (!authCheckError) {
				// Clear any running interval
				if (authCheckIntervalRef.current) {
					clearInterval(authCheckIntervalRef.current);
					authCheckIntervalRef.current = null;
				}

				// Reset the global flag if user is not logged in
				globalAuthInitialized = false;
				router.replace('/login');
			}
		}
	}, [
		initialCheckComplete,
		isLoggedIn,
		isLoading,
		router,
		user?.isActive,
		authCheckError,
	]);

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
		pathname,
	]);

	// Cleanup interval on component unmount
	useEffect(() => {
		return () => {
			if (authCheckIntervalRef.current) {
				clearInterval(authCheckIntervalRef.current);
				authCheckIntervalRef.current = null;
			}
		};
	}, []);

	// Show full loading screen only during the very first authentication check
	if ((isLoading || !initialCheckComplete) && !globalAuthInitialized) {
		return <PageLoading variant="school" fullScreen={true} />;
	}

	// Show error message if there's an auth check error but user appears to be logged in
	if (authCheckError && isLoggedIn) {
		return (
			<div className="p-4 mb-4 text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-md">
				<p className="text-sm">⚠️ {authCheckError}</p>
				<div className="mt-2">{children}</div>
			</div>
		);
	}

	// If not logged in and no auth check error, show login page
	if (!isLoggedIn && !authCheckError) {
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
