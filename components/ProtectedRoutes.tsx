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
	const { user, startupResolved, isVerifying, isLoggingOut } = useAuth();
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
		if (!startupResolved) return;
		if (isLoggingOut) return;
		if (isAuthenticated) return;
		if (isVerifying) return;
		if (pathname !== '/login') {
			router.replace('/login');
		}
	}, [startupResolved, isVerifying, isLoggingOut, isAuthenticated, pathname, router]);

	useEffect(() => {
		if (
			!startupResolved ||
			!user ||
			user.role === 'system_admin' ||
			!user.mustChangePassword ||
			pathname === '/login/account-setup'
		) {
			return;
		}
		router.replace('/login/account-setup');
	}, [startupResolved, pathname, router, user]);

	// startupResolved is set synchronously during bootstrapAuth (which calls
	// hydrateFromCache before setting the flag). This covers the single render
	// tick before the first effect runs.
	if (!startupResolved) {
		return (
			<PageLoading variant="school" fullScreen={true} message="Loading..." />
		);
	}

	if (isLoggingOut) {
		return (
			<PageLoading
				variant="school"
				fullScreen={true}
				message="Signing out..."
			/>
		);
	}

	if (!isAuthenticated) {
		if (pathname === '/login') {
			return <LoginPage />;
		}
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
