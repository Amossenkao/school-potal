'use client';
import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';
import LoginPage from '@/app/login/page';

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
	const { user, hasBootstrapped, isVerifying, bootstrapAuth } =
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

	// Keep the URL in sync in the background, but don't gate what's on screen
	// on this — we render LoginPage directly below instead of a loader.
	useEffect(() => {
		if (!hasBootstrapped) return;
		if (isAuthenticated) return;
		if (isVerifying) return;
		if (pathname !== '/login') {
			router.replace('/login');
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

	// Still resolving the initial auth check (cache/cookie lookup) — this is
	// the only case where a generic loader makes sense, since we don't yet
	// know whether to show the protected content or the login page.
	if (!hasBootstrapped || isVerifying) {
		return (
			<PageLoading variant="school" fullScreen={true} message="Loading..." />
		);
	}

	if (!isAuthenticated) {
		return <LoginPage />;
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
