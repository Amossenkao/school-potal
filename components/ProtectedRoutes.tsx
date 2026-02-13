'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useAuth from '@/store/useAuth';
import LoginPage from '@/app/login/page';
import SchoolHomepage from '@/app/page';
import { PageLoading } from '@/components/loading';
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
	const { user, isLoading, checkAuthStatus, hydrateFromCache } = useAuth();
	const { isOnline, authCheckFailed } = useNetworkStore();
	const router = useRouter();
	const pathname = usePathname();
	const [initialCheckComplete, setInitialCheckComplete] = useState(false);
	const [hasUnauthorizedAccess, setHasUnauthorizedAccess] = useState(false);
	const [authCheckInProgress, setAuthCheckInProgress] = useState(true);
	const [bootstrapTimedOut, setBootstrapTimedOut] = useState(false);

	// Check if this route has role requirements
	const hasRoleRequirements =
		requiredRole || (allowedRoles && allowedRoles.length > 0);

	const initializeAuth = useCallback(async () => {
		setAuthCheckInProgress(true);
		try {
			if (!navigator.onLine || !isOnline) {
				hydrateFromCache();
				setInitialCheckComplete(true);
				return;
			}
			await (async () => {
				let timeoutId: ReturnType<typeof setTimeout> | null = null;
				try {
					await Promise.race([
						checkAuthStatus(),
						new Promise((_, reject) => {
							timeoutId = setTimeout(
								() => reject(new Error('Auth check timeout')),
								7000,
							);
						}),
					]);
				} finally {
					if (timeoutId) {
						clearTimeout(timeoutId);
					}
				}
			})().catch((error) => {
				console.warn('Auth initialization timed out:', error);
			});
			setInitialCheckComplete(true);
		} finally {
			setAuthCheckInProgress(false);
		}
	}, [checkAuthStatus, hydrateFromCache, isOnline]);

	// Initial auth check
	useEffect(() => {
		void initializeAuth();
	}, [initializeAuth]);

	const showingInitialLoading =
		(isLoading || !initialCheckComplete || authCheckInProgress) &&
		!user &&
		isOnline &&
		!authCheckFailed;

	useEffect(() => {
		if (!showingInitialLoading) {
			setBootstrapTimedOut(false);
			return;
		}
		const timer = window.setTimeout(() => {
			setBootstrapTimedOut(true);
		}, 8000);
		return () => window.clearTimeout(timer);
	}, [showingInitialLoading]);

	// Handle initial redirect for unauthenticated users
	useEffect(() => {
		const navigatorOnline =
			typeof navigator !== 'undefined' ? navigator.onLine : true;
		if (!isOnline || !navigatorOnline) {
			if (!user) {
				try {
					const cached = localStorage.getItem('auth-user');
					if (cached) {
						hydrateFromCache();
					}
				} catch (error) {
					// ignore cache errors
				}
			}
			return;
		}

		// ✅ Don't redirect if user is offline and auth check failed
		if (authCheckFailed && !isOnline) {
			return; // Stay on the page, show offline message
		}

		// Also check if we have user data in memory - if yes, stay on page even if auth check failed temporarily
		if (user && authCheckFailed && !isOnline) {
			return; // User was authenticated before going offline
		}

		if (authCheckFailed) {
			return;
		}

		if (!isOnline && !user) {
			try {
				const cached = localStorage.getItem('auth-user');
				if (cached) {
					hydrateFromCache();
					return;
				}
			} catch (error) {
				// ignore cache errors
			}
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
		hydrateFromCache,
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
		if (user) {
			return <>{children}</>;
		}
		if (!isOnline) {
			return <SchoolHomepage />;
		}
			if (authCheckFailed) {
				return (
					<PageLoading
						variant="school"
						fullScreen={true}
						message="Connection issue. Retrying..."
					/>
				);
			}
			if (bootstrapTimedOut) {
				return <LoginPage />;
			}
		return (
			<PageLoading
				variant="school"
				fullScreen={true}
				message="Checking session..."
			/>
		);
	}

	// ✅ If auth check failed, don't redirect - let AdminLayout handle the UI
	if (authCheckFailed) {
		if (user) {
			return <>{children}</>;
		}
		if (!isOnline) {
			return <SchoolHomepage />;
		}
		return <LoginPage />;
	}

	// If not logged in and no auth check error, show login page
	if (!user) {
		if (!isOnline) {
			return <SchoolHomepage />;
		}
		return <LoginPage />;
	}

	// If the user must change their password, show a loading screen while redirecting
	if (
		user?.role !== 'system_admin' &&
		user?.mustChangePassword &&
		pathname !== '/login/account-setup'
	) {
		return (
			<PageLoading
				variant="school"
				fullScreen={true}
				message="Redirecting to account setup..."
			/>
		);
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
