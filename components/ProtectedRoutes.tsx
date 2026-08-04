'use client';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';
import type { PageLoadingProps } from '@/components/loading';

interface ProtectedRouteProps {
	children: React.ReactNode;
	requiredRole?: string;
	allowedRoles?: string[];
	spinnerVariant?: PageLoadingProps['variant'];
}

const ProtectedRoute = ({
	children,
	requiredRole,
	allowedRoles,
	spinnerVariant = 'company',
}: ProtectedRouteProps) => {
	const { user, startupResolved, isLoggingOut } = useAuth();
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

	// NOTE: this component intentionally performs NO navigation. AuthProvider
	// is the single owner of every auth-driven route decision (including the
	// account-setup and unauthenticated redirects that used to live here), and
	// it holds a spinner instead of rendering children whenever the current
	// URL disagrees with where the user belongs. Two components calling
	// router.replace() from overlapping state is precisely what caused the
	// double redirects, so everything below is a passive render guard only.

	if (!startupResolved) {
		return (
			<PageLoading variant={spinnerVariant} fullScreen={true} message="Loading..." />
		);
	}

	if (isLoggingOut) {
		return (
			<PageLoading
				variant={spinnerVariant}
				fullScreen={true}
				message="Signing out..."
			/>
		);
	}

	if (!isAuthenticated) {
		return (
			<PageLoading
				variant={spinnerVariant}
				fullScreen={true}
				message="Redirecting to login..."
			/>
		);
	}

	const activeUser = user!;

	if (
		activeUser.role !== 'system_admin' &&
		activeUser.role !== 'superadmin' &&
		activeUser.mustChangePassword &&
		pathname !== '/login/account-setup'
	) {
		return (
			<PageLoading
				variant={spinnerVariant}
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
