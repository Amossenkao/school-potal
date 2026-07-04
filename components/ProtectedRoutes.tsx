'use client';
import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';

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
	const { user, isBootstrapping, hasBootstrapped, isVerifying, bootstrapAuth } =
		useAuth();
	const router = useRouter();
	const pathname = usePathname();

	const isAuthenticated = Boolean(user?.isActive);

	const hasRoleRequirements = useMemo(
		() => Boolean(requiredRole || (allowedRoles && allowedRoles.length > 0)),
		[requiredRole, allowedRoles],
	);

	const hasUnauthorizedAccess = useMemo(() => {
		if (!user) return false;
		if (requiredRole && user.role !== requiredRole) return true;
		if (
			allowedRoles &&
			allowedRoles.length > 0 &&
			!allowedRoles.includes(user.role)
		) {
			return true;
		}
		return false;
	}, [allowedRoles, requiredRole, user]);

	useEffect(() => {
		void bootstrapAuth();
	}, [bootstrapAuth]);

	// resolves to "not actually logged in").
	useEffect(() => {
		if (!hasBootstrapped) return; // no cache, still resolving initial state
		if (isAuthenticated) return; // authenticated, either from cache or confirmed
		if (isVerifying) return; // background check still running, don't redirect yet

		if (pathname !== '/login') {
			router.replace('/login');
			const fallbackTimer = window.setTimeout(() => {
				if (window.location.pathname !== '/login') {
					window.location.replace('/login');
				}
			}, 1200);
			return () => window.clearTimeout(fallbackTimer);
		}
	}, [hasBootstrapped, isVerifying, isAuthenticated, pathname, router]);

	useEffect(() => {
		if (
			!hasBootstrapped ||
			!user ||
			user.role === 'system_admin' ||
			!user.mustChangePassword ||
			pathname === '/login/account-setup'
		) {
			return;
		}
		router.replace('/login/account-setup');
	}, [hasBootstrapped, pathname, router, user]);

	// No cached user to render optimistically — this is the only case where
	// we genuinely have nothing to show yet.
	// if (!hasBootstrapped) {
	// 	return (
	// 		<PageLoading variant="school" fullScreen={true} message="Loading..." />
	// 	);
	// }

	// Either cache said "logged out", or the background check just confirmed it.
	if (!isAuthenticated) {
		return (
			<PageLoading
				variant="school"
				fullScreen={true}
				message="Redirecting to login..."
			/>
		);
	}

	const activeUser = user!;

	if (
		activeUser.role !== 'system_admin' &&
		activeUser.mustChangePassword &&
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
};

export default ProtectedRoute;
