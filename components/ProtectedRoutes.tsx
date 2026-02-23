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
	const {
		user,
		isBootstrapping,
		hasBootstrapped,
		bootstrapAuth,
	} = useAuth();
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
		if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
			return true;
		}
		return false;
	}, [allowedRoles, requiredRole, user]);

	useEffect(() => {
		void bootstrapAuth();
	}, [bootstrapAuth]);

	useEffect(() => {
		if (!hasBootstrapped || isBootstrapping) return;
		if (isAuthenticated) return;
		if (pathname !== '/login') {
			router.replace('/login');
			const fallbackTimer = window.setTimeout(() => {
				if (window.location.pathname !== '/login') {
					window.location.replace('/login');
				}
			}, 1200);
			return () => window.clearTimeout(fallbackTimer);
		}
	}, [hasBootstrapped, isBootstrapping, isAuthenticated, pathname, router]);

	useEffect(() => {
		if (
			!hasBootstrapped ||
			isBootstrapping ||
			!user ||
			user.role === 'system_admin' ||
			!user.mustChangePassword ||
			pathname === '/login/account-setup'
		) {
			return;
		}
		router.replace('/login/account-setup');
	}, [hasBootstrapped, isBootstrapping, pathname, router, user]);

	if (!hasBootstrapped || isBootstrapping) {
		return (
			<PageLoading
				variant="school"
				fullScreen={true}
				message="Loading..."
			/>
		);
	}

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
