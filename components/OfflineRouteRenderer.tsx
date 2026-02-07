'use client';

import { useMemo } from 'react';
import {
	generateDynamicComponentsMap,
	validateComponentAccess,
	isValidAdministratorPosition,
} from '@/utils/componentsMap';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import type { SchoolProfile } from '@/types/schoolProfile';
import type { Administrator, User } from '@/types';

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
	const { school } = useSchoolStore();
	const { user, isLoading } = useAuth();

	const pageKey = useMemo(() => resolvePageKey(path), [path]);

	if (!school || isLoading) {
		return <PageLoading message="Loading..." />;
	}

	if (!user) {
		return (
			<PageLoading
				variant="dashboard-not-found"
				fullScreen={false}
				message="User session not available."
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
