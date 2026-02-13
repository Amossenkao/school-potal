'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useAuth from '@/store/useAuth';
import LoginPage from '@/app/login/page';
import SchoolHomepage from '@/app/page';
import { PageLoading } from '@/components/loading';
import { useNetworkStore } from '@/store/networkStore';
import { LOADING_POLICY, useLoadingGate } from '@/hooks/useLoadingGate';

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
	const [authResolved, setAuthResolved] = useState(false);

	// Check if this route has role requirements
	const hasRoleRequirements = useMemo(
		() => Boolean(requiredRole || (allowedRoles && allowedRoles.length > 0)),
		[requiredRole, allowedRoles],
	);
	const hasUnauthorizedAccess = useMemo(() => {
		if (!user) return false;
		if (requiredRole && user.role !== requiredRole) return true;
		if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
			return true;
		}
		return false;
	}, [allowedRoles, requiredRole, user]);

	useEffect(() => {
		hydrateFromCache();
	}, [hydrateFromCache]);

	useEffect(() => {
		let cancelled = false;
		const runAuthBootstrap = async () => {
			if (!user) {
				setAuthResolved(false);
			}

			const navigatorOnline =
				typeof navigator !== 'undefined' ? navigator.onLine : true;
			if (!navigatorOnline || !isOnline) {
				if (!user) {
					hydrateFromCache();
				}
				if (!cancelled) {
					setAuthResolved(true);
				}
				return;
			}

			let timeoutId: ReturnType<typeof setTimeout> | null = null;
			try {
				await Promise.race([
					checkAuthStatus(),
					new Promise<void>((_, reject) => {
						timeoutId = window.setTimeout(
							() => reject(new Error('Auth check timeout')),
							LOADING_POLICY.authTimeoutMs,
						);
					}),
				]);
			} catch (error) {
				console.warn('Auth bootstrap ended early:', error);
			} finally {
				if (timeoutId) {
					window.clearTimeout(timeoutId);
				}
				if (!cancelled) {
					setAuthResolved(true);
				}
			}
		};

		void runAuthBootstrap();
		return () => {
			cancelled = true;
		};
	}, [checkAuthStatus, hydrateFromCache, isOnline, user]);

	const waitingForSession = !authResolved && !user && isOnline && !authCheckFailed;
	const { show: showSessionLoader, timedOut: sessionTimedOut } = useLoadingGate({
		active: waitingForSession,
		delayMs: LOADING_POLICY.routeSpinnerDelayMs,
		timeoutMs: LOADING_POLICY.authTimeoutMs + 400,
	});

	useEffect(() => {
		if (sessionTimedOut) {
			setAuthResolved(true);
		}
	}, [sessionTimedOut]);

	// Handle initial redirect for unauthenticated users
	useEffect(() => {
		const navigatorOnline =
			typeof navigator !== 'undefined' ? navigator.onLine : true;
		if (!isOnline || !navigatorOnline) {
			return;
		}

		if (!authResolved || authCheckFailed) {
			return;
		}

		if (
			authResolved &&
			!isLoading &&
			(!user || !user?.isActive)
		) {
			if (pathname !== '/login') {
				router.replace('/login');
			}
		}
	}, [
		authResolved,
		isLoading,
		router,
		user?.isActive,
		authCheckFailed,
		isOnline,
		user,
		pathname,
	]);

	useEffect(() => {
		if (
			authResolved &&
			user &&
			user.role !== 'system_admin' &&
			user.mustChangePassword &&
			pathname !== '/login/account-setup'
		) {
			router.replace('/login/account-setup');
		}
	}, [authResolved, pathname, router, user]);

	if (user) {
		if (
			user.role !== 'system_admin' &&
			user.mustChangePassword &&
			pathname !== '/login/account-setup'
		) {
			return (
				<PageLoading
					variant="school"
					fullScreen={true}
					message="Preparing account setup..."
				/>
			);
		}
		if (hasRoleRequirements && hasUnauthorizedAccess) {
			return (
				<PageLoading
					variant="dashboard-not-found"
					message="You do not have permission to access this section."
					fullScreen={false}
				/>
			);
		}
		return <>{children}</>;
	}

	if (!isOnline) {
		return <SchoolHomepage />;
	}

	if (!authResolved) {
		if (!showSessionLoader) {
			return <div className="min-h-screen bg-background" />;
		}
		return (
			<PageLoading
				variant="school"
				fullScreen={true}
				message="Restoring your session..."
			/>
		);
	}

	return <LoginPage />;
};

export default ProtectedRoute;
