'use client';

import { useCallback, useMemo } from 'react';
import {
	generateDynamicComponentsMap,
	validateComponentAccess,
	isValidAdministratorPosition,
} from '@/utils/componentsMap';
import { PageLoading } from '@/components/loading';
import DashboardHome from '@/components/DashboardHome';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import type { SchoolProfile } from '@/types/schoolProfile';
import type { Administrator, User } from '@/types';
import { LOADING_POLICY, useLoadingGate } from '@/hooks/useLoadingGate';

const getCookieValue = (name: string) => {
	if (typeof document === 'undefined') return undefined;
	const match = document.cookie.match(
		new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`)
	);
	return match ? decodeURIComponent(match[1]) : undefined;
};

const resolvePageKey = (path: string) => {
	if (!path || path === '/dashboard' || path === '/dashboard/') {
		return 'dashboard';
	}
	const trimmed = path.startsWith('/dashboard/')
		? path.slice('/dashboard/'.length)
		: path;
	return trimmed.split('/')[0] || 'dashboard';
};

function validateAdministratorAccess(
	schoolProfile: SchoolProfile,
	user: User,
	routeKey: string
): boolean {
	if (user.role === 'system_admin') {
		return validateComponentAccess(schoolProfile, 'system_admin', routeKey);
	}
	if (user.role === 'administrator') {
		const adminUser = user as Administrator;
		if (
			!isValidAdministratorPosition(schoolProfile, adminUser.position)
		) {
			return false;
		}
		return validateComponentAccess(
			schoolProfile,
			'administrator',
			routeKey,
			adminUser.position
		);
	}
	return validateComponentAccess(schoolProfile, user.role, routeKey);
}

export default function OfflineRouteRenderer({ path }: { path: string }) {
	const { school, fetchSchool } = useSchoolStore();
	const { user, isLoading, checkAuthStatus } = useAuth();

	const pageKey = useMemo(() => resolvePageKey(path), [path]);
	const waitingForRouteBootstrap = !school || (!user && isLoading);
	const { show: showLoader, timedOut } = useLoadingGate({
		active: waitingForRouteBootstrap,
		delayMs: LOADING_POLICY.routeSpinnerDelayMs,
		timeoutMs: LOADING_POLICY.offlineRestoreTimeoutMs,
	});

	const handleRetryLoading = useCallback(async () => {
		await Promise.allSettled([fetchSchool(), checkAuthStatus()]);
	}, [checkAuthStatus, fetchSchool]);

	if (waitingForRouteBootstrap && !showLoader) {
		return <div className="min-h-[50vh]" />;
	}

	if (waitingForRouteBootstrap && timedOut) {
		return (
			<div className="min-h-[60vh] flex items-center justify-center px-4">
				<div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
					<h2 className="text-xl font-semibold text-foreground">
						This page is taking too long to restore
					</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						The app could not recover school or session data in time. You can
						retry now.
					</p>
					<div className="mt-5 flex justify-center">
						<button
							type="button"
							onClick={() => {
								void handleRetryLoading();
							}}
							className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
						>
							Retry
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (waitingForRouteBootstrap) {
		return <PageLoading variant="school" message="Restoring dashboard..." />;
	}

	if (!user) {
		return (
			<PageLoading
				variant="dashboard-not-found"
				fullScreen={false}
				message="Session unavailable. Please sign in again."
			/>
		);
	}

	const hasAccess = validateAdministratorAccess(
		school,
		user,
		pageKey
	);

	if (!hasAccess) {
		return (
			<PageLoading
				variant="dashboard-not-found"
				fullScreen={false}
				message="Access denied."
			/>
		);
	}

	if (pageKey === 'dashboard') {
		return (
			<div className="dashboard-page px-4 sm:px-6 lg:px-8">
				<DashboardHome user={user} schoolProfile={school} />
			</div>
		);
	}

	const adminPosition =
		user.role === 'administrator'
			? (user as Administrator).position
			: undefined;
	const componentsMap = generateDynamicComponentsMap(
		school,
		user.role,
		adminPosition
	);

	const entry =
		componentsMap[user.role]?.items[pageKey] ||
		componentsMap.shared?.items[pageKey];

	if (!entry || !entry.component) {
		return (
			<PageLoading
				variant="dashboard-not-found"
				fullScreen={false}
				message={`Page "${pageKey}" not found`}
			/>
		);
	}

	const Component = entry.component;
	const theme = getCookieValue('theme') || 'light';
	const userPreferences = getCookieValue('user-preferences');
	const sessionToken = getCookieValue('sessionId');

	const userContext = {
		...user,
		adminPosition:
			user.role === 'administrator'
				? (user as Administrator).position
				: null,
		availablePositions:
			user.role === 'administrator'
				? Object.keys(school.roleFeatureAccess.administrator)
				: [],
	};

	return (
		<Component
			user={userContext}
			schoolProfile={school}
			theme={theme}
			userPreferences={userPreferences}
			sessionToken={sessionToken}
		/>
	);
}
