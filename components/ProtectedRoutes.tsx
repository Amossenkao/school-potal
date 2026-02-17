'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';
import { useNetworkStore } from '@/store/networkStore';

interface ProtectedRouteProps {
	children: React.ReactNode;
	requiredRole?: string;
	allowedRoles?: string[];
}

const hasCachedAuthUser = () => {
	if (typeof window === 'undefined') return false;
	try {
		return Boolean(localStorage.getItem('auth-user'));
	} catch (error) {
		console.warn('Unable to read auth cache:', error);
		return false;
	}
};

const ProtectedRoute = ({
	children,
	requiredRole,
	allowedRoles,
}: ProtectedRouteProps) => {
	const { user, checkAuthStatus, hydrateFromCache } = useAuth();
	const { isOnline } = useNetworkStore();
	const router = useRouter();
	const pathname = usePathname();
	const [isBootstrapping, setIsBootstrapping] = useState(true);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const hasSeenAuthenticatedUser = useRef(false);

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
		let cancelled = false;

		if (hasCachedAuthUser()) {
			hydrateFromCache();
		}

		const finishBootstrap = () => {
			if (!cancelled) {
				setIsBootstrapping(false);
			}
		};

		const runInitialAuthCheck = async () => {
			const navigatorOnline =
				typeof navigator !== 'undefined' ? navigator.onLine : true;
			if (!navigatorOnline || !isOnline) {
				finishBootstrap();
				return;
			}
			try {
				await checkAuthStatus();
			} catch (error) {
				console.warn('Initial auth verification failed:', error);
			} finally {
				finishBootstrap();
			}
		};
		void runInitialAuthCheck();

		const bootstrapTimeout = window.setTimeout(() => {
			finishBootstrap();
		}, 5000);

		return () => {
			cancelled = true;
			window.clearTimeout(bootstrapTimeout);
		};
	}, [checkAuthStatus, hydrateFromCache, isOnline]);

	useEffect(() => {
		if (user?.isActive) {
			hasSeenAuthenticatedUser.current = true;
			setIsSigningOut(false);
		}
	}, [user?.isActive]);

	useEffect(() => {
		if (isBootstrapping) return;

		if (user?.isActive) return;

		if (hasSeenAuthenticatedUser.current) {
			setIsSigningOut(true);
			return;
		}

		if (pathname !== '/login') {
			router.replace('/login');
		}
	}, [isBootstrapping, pathname, router, user?.isActive]);

	useEffect(() => {
		if (!isSigningOut) return;
		if (pathname === '/login') return;

		const timer = window.setTimeout(() => {
			router.replace('/login');
		}, 140);

		return () => {
			window.clearTimeout(timer);
		};
	}, [isSigningOut, pathname, router]);

	useEffect(() => {
		if (
			!isBootstrapping &&
			user &&
			user.role !== 'system_admin' &&
			user.mustChangePassword &&
			pathname !== '/login/account-setup'
		) {
			router.replace('/login/account-setup');
		}
	}, [isBootstrapping, pathname, router, user]);

	if (isSigningOut) {
		return (
			<PageLoading
				variant="school"
				fullScreen={true}
				message="Signing out..."
			/>
		);
	}

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

	if (isBootstrapping) {
		return (
			<PageLoading
				variant="school"
				fullScreen={true}
				message="Loading..."
			/>
		);
	}

	return (
		<PageLoading
			variant="school"
			fullScreen={true}
			message="Loading..."
		/>
	);
};

export default ProtectedRoute;
