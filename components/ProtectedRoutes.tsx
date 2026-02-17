'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useAuth from '@/store/useAuth';
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

			try {
				await checkAuthStatus();
			} catch (error) {
				console.warn('Auth bootstrap ended early:', error);
			} finally {
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
	const { timedOut: sessionTimedOut } = useLoadingGate({
		active: waitingForSession,
		delayMs: LOADING_POLICY.routeSpinnerDelayMs,
		timeoutMs: LOADING_POLICY.authTimeoutMs + 400,
	});

	// Handle initial redirect for unauthenticated users
	useEffect(() => {
		const navigatorOnline =
			typeof navigator !== 'undefined' ? navigator.onLine : true;
		if (!isOnline || !navigatorOnline) {
			return;
		}

		if (!authResolved) {
			return;
		}

		if (authCheckFailed) {
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
		isOnline,
		authCheckFailed,
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
		if (sessionTimedOut) {
			return (
				<div className="min-h-[60vh] flex items-center justify-center px-4">
					<div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
						<h2 className="text-xl font-semibold text-foreground">
							Session restore is taking longer than expected
						</h2>
						<p className="mt-2 text-sm text-muted-foreground">
							We could not confirm your session in time. Retry to continue.
						</p>
						<div className="mt-5 flex justify-center">
							<button
								type="button"
								onClick={() => {
									setAuthResolved(false);
									void checkAuthStatus();
								}}
								className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
							>
								Retry Session Check
							</button>
						</div>
					</div>
				</div>
			);
		}
		return (
			<PageLoading
				variant="school"
				fullScreen={true}
				message="Restoring your session..."
			/>
		);
	}

	if (authCheckFailed && !user) {
		return (
			<div className="min-h-[60vh] flex items-center justify-center px-4">
				<div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
					<h2 className="text-xl font-semibold text-foreground">
						Unable to verify session right now
					</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						This is usually temporary. Retry before signing in again.
					</p>
					<div className="mt-5 flex justify-center">
						<button
							type="button"
							onClick={() => {
								setAuthResolved(false);
								void checkAuthStatus();
							}}
							className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
						>
							Retry Session Check
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<PageLoading
			variant="school"
			fullScreen={true}
			message="Redirecting to login..."
		/>
	);
};

export default ProtectedRoute;
