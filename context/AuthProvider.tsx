'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Ably from 'ably';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { useNetworkStore } from '@/store/networkStore';
import { PageLoading } from '@/components/loading';
import {
	getAuthorizedRealtimeChannels,
	resolveTenantSyncKey,
	type RealtimeEvent,
} from '@/lib/realtimeTypes';

const ABLY_SYNC_STREAM_TOKEN_ENDPOINT = '/api/sync/stream-token';
const SYNC_REFRESH_DEBOUNCE_MS = 60;
const SECURITY_SYNC_REASONS = new Set([
	'account-deactivated',
	'password-changed-session-revocation',
	'password-reset',
	'user-deleted',
	'user-password-reset',
]);

export default function AuthProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const bootstrapAuth = useAuth((state) => state.bootstrapAuth);
	const checkAuthStatus = useAuth((state) => state.checkAuthStatus);
	const user = useAuth((state) => state.user);
	const startupResolved = useAuth((state) => state.startupResolved);
	const isBootstrapping = useAuth((state) => state.isBootstrapping);
	const isLoggingOut = useAuth((state) => state.isLoggingOut);
	const currentSchool = useSchoolStore((state) => state.school);
	const router = useRouter();
	const pathname = usePathname();

	const setAblyState = useNetworkStore((state) => state.setAblyState);
	const setAuthCheckFailed = useNetworkStore(
		(state) => state.setAuthCheckFailed,
	);

	const authRefreshInFlight = useRef(false);
	const pendingAuthRefreshRef = useRef<{
		force?: boolean;
		trigger?: string;
		academicYear?: string;
	} | null>(null);
	const syncEventDebounceRef = useRef<number | null>(null);
	const realtimeClientRef = useRef<Ably.Realtime | null>(null);
	const realtimeSubscriptionsRef = useRef<Array<() => void>>([]);
	const initialRouteResolvedRef = useRef(false);
	const [isResolvingInitialRoute, setIsResolvingInitialRoute] = useState(true);

	const ensureSchoolProfile = useCallback(async () => {
		const currentSchool = useSchoolStore.getState().school;
		if (currentSchool) return;
		try {
			await useSchoolStore.getState().fetchSchool();
		} catch (error) {
			console.error('[AuthProvider] Failed to fetch school profile:', error);
		}
	}, []);

	const runAuthRefresh = useCallback(
		async (options?: {
			force?: boolean;
			trigger?: string;
			academicYear?: string;
		}) => {
			// Do not run any background auth refresh if the user is
			// logging out — logout must win over every other process.
			if (useAuth.getState().isLoggingOut) return;
			if (authRefreshInFlight.current) {
				const previous = pendingAuthRefreshRef.current;
				pendingAuthRefreshRef.current = {
					force: Boolean(previous?.force) || Boolean(options?.force),
					trigger: options?.trigger || previous?.trigger,
					academicYear: options?.academicYear || previous?.academicYear,
				};
				return;
			}
			authRefreshInFlight.current = true;
			try {
				await checkAuthStatus({
					skipConnectivityCheck: true,
					force: options?.force === true,
					trigger: options?.trigger,
					academicYear: options?.academicYear,
				});
				await ensureSchoolProfile();

				const activeYear =
					options?.academicYear ||
					useSchoolStore.getState().school?.currentAcademicYear;
				if (
					activeYear &&
					useSchoolStore.getState().hasPendingGradeSync(activeYear)
				) {
					useSchoolStore.getState().runBackgroundGradeSync(activeYear);
				}
			} catch (error) {
				console.error('[AuthProvider] Auth refresh failed:', error);
				setAuthCheckFailed(true);
			} finally {
				authRefreshInFlight.current = false;
				const pending = pendingAuthRefreshRef.current;
				pendingAuthRefreshRef.current = null;
				if (pending) {
					void runAuthRefresh(pending);
				}
			}
		},
		[checkAuthStatus, ensureSchoolProfile, setAuthCheckFailed],
	);

	const closeRealtimeClient = useCallback(() => {
		realtimeSubscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
		realtimeSubscriptionsRef.current = [];
		if (realtimeClientRef.current) {
			realtimeClientRef.current.close();
			realtimeClientRef.current = null;
		}
	}, []);

	// Initial bootstrap run on mount
	useEffect(() => {
		const runInitialBootstrap = async () => {
			try {
				await ensureSchoolProfile();
				await bootstrapAuth({ force: true });
			} catch (error) {
				console.error('[AuthProvider] Initial auth bootstrap failed:', error);
			}
		};
		void runInitialBootstrap();
	}, [bootstrapAuth, ensureSchoolProfile]);

	useEffect(() => {
		if (!startupResolved || isBootstrapping) return;
		if (initialRouteResolvedRef.current) return;

		const ownsStartupRoute =
			pathname === '/' ||
			pathname === '/login' ||
			pathname === '/login/account-setup' ||
			pathname.startsWith('/dashboard');

		if (!ownsStartupRoute) {
			initialRouteResolvedRef.current = true;
			setIsResolvingInitialRoute(false);
			return;
		}

		const destination = user?.isActive
			? user.role !== 'system_admin' && user.mustChangePassword
				? '/login/account-setup'
				: pathname.startsWith('/dashboard') ? pathname : '/dashboard'
			: '/login';

		if (pathname === destination) {
			initialRouteResolvedRef.current = true;
			setIsResolvingInitialRoute(false);
			return;
		}

		if (!user?.isActive) {
			initialRouteResolvedRef.current = true;
			setIsResolvingInitialRoute(false);
			router.replace(destination);
			return;
		}

		router.replace(destination);
	}, [isBootstrapping, pathname, router, startupResolved, user]);

	useEffect(() => {
		if (!startupResolved || isBootstrapping) return;
		if (!initialRouteResolvedRef.current) return;
		if (isLoggingOut) return;
		if (user?.isActive) return;
		if (pathname === '/login') return;
		if (
			pathname === '/' ||
			pathname.startsWith('/dashboard') ||
			pathname.startsWith('/login')
		) {
			router.replace('/login');
		}
	}, [
		isBootstrapping,
		isLoggingOut,
		pathname,
		router,
		startupResolved,
		user?.isActive,
	]);

	// Ably Streaming Channel Setup and Connection Listeners
	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (!user?.isActive || useAuth.getState().isLoggingOut) {
			closeRealtimeClient();
			if (syncEventDebounceRef.current !== null) {
				window.clearTimeout(syncEventDebounceRef.current);
				syncEventDebounceRef.current = null;
			}
			return;
		}

		const tenantKey = resolveTenantSyncKey({
			schoolProfile: currentSchool,
			host: window.location.host,
		});
		if (!tenantKey) return;

		const scheduleRefresh = (options?: {
			force?: boolean;
			trigger?: string;
			academicYear?: string;
		}) => {
			if (syncEventDebounceRef.current !== null) {
				window.clearTimeout(syncEventDebounceRef.current);
			}
			syncEventDebounceRef.current = window.setTimeout(() => {
				syncEventDebounceRef.current = null;
				void runAuthRefresh({
					force: options?.force === true,
					trigger: options?.trigger || 'stream-sync',
					academicYear: options?.academicYear,
				});
			}, SYNC_REFRESH_DEBOUNCE_MS);
		};

		const client = new Ably.Realtime({
			authUrl: ABLY_SYNC_STREAM_TOKEN_ENDPOINT,
			authMethod: 'GET',
			withCredentials: true,
		});
		realtimeClientRef.current = client;
		realtimeSubscriptionsRef.current = [];

		const channels = getAuthorizedRealtimeChannels({
			tenantId: tenantKey,
			user: user as any,
			role: user.role,
		});

		const handleRealtimeEvent = (event: RealtimeEvent) => {
			console.log('handleRealtimeEvent called', event);
			useSchoolStore.getState().applyRealtimeEvent(event);
			useAuth.getState().applyRealtimeEvent(event);

			const currentUserId = String(user?.id || '').trim();
			const targetUserIds = Array.isArray(event.payload?.targetUserIds)
				? event.payload.targetUserIds.map((v) => String(v || '').trim())
				: [];
			const eventUserId = String(event.payload?.userId || '').trim();
			const impactsCurrentUser =
				currentUserId &&
				(Boolean(eventUserId && eventUserId === currentUserId) ||
					targetUserIds.includes(currentUserId));

			if (event.type === 'USER_DISABLED' && impactsCurrentUser) {
				return;
			}

			const academicYear = String(event.payload?.academicYear || '').trim();
			const reason = String(event.payload?.reason || '').trim();

			if (SECURITY_SYNC_REASONS.has(reason)) {
				void runAuthRefresh({
					force: true,
					trigger: `ably-security:${event.type}`,
					academicYear,
				});
				return;
			}

			const hasPayloadUser = Boolean(
				event.payload?.user && typeof event.payload.user === 'object',
			);
			const isUserEvent = [
				'USER_CREATED',
				'USER_UPDATED',
				'USER_DISABLED',
				'STUDENT_ADDED',
				'STUDENT_REMOVED',
				'CLASS_UPDATED',
			].includes(event.type);

			if (isUserEvent && hasPayloadUser) {
				if (impactsCurrentUser) {
					scheduleRefresh({
						force: true,
						trigger: `ably:${event.type}`,
						academicYear,
					});
				}
				return;
			}

			scheduleRefresh({
				force: true,
				trigger: `ably:${event.type}`,
				academicYear,
			});
		};

		channels.forEach((channelName) => {
			const channel = client.channels.get(channelName);
			const listener = (message: any) => {
				const event = message?.data as RealtimeEvent | undefined;
				if (
					!event ||
					typeof event.type !== 'string' ||
					typeof event.tenantId !== 'string'
				) {
					return;
				}
				if (event.tenantId !== tenantKey) return;
				handleRealtimeEvent(event);
			};
			channel.subscribe(listener);
			realtimeSubscriptionsRef.current.push(() =>
				channel.unsubscribe(listener),
			);
		});

		// Pipe state directly to the store
		client.connection.on('connected', () => {
			setAblyState('connected');
			setAuthCheckFailed(false);
			// Do not trigger auth refresh if the user is logging out —
			// logout must win over every other authentication process.
			if (useAuth.getState().isLoggingOut) return;
			void runAuthRefresh({ force: true, trigger: 'ably-connected' });
		});

		client.connection.on('failed', () => {
			setAblyState('failed');
			setAuthCheckFailed(true);
		});

		client.connection.on('suspended', () => {
			setAblyState('suspended');
			setAuthCheckFailed(true);
		});

		return () => {
			setAblyState('disconnected');
			closeRealtimeClient();
			if (syncEventDebounceRef.current !== null) {
				window.clearTimeout(syncEventDebounceRef.current);
				syncEventDebounceRef.current = null;
			}
		};
	}, [
		closeRealtimeClient,
		currentSchool,
		runAuthRefresh,
		setAblyState,
		setAuthCheckFailed,
		user?.id,
		user?.isActive,
		user?.role,
		user,
	]);

	if (!startupResolved || isBootstrapping || isResolvingInitialRoute) {
		return <PageLoading variant="school" fullScreen={true} message="Loading..." />;
	}

	if (!currentSchool) {
		return (
			<PageLoading
				variant="school"
				fullScreen={true}
				message="Redirecting..."
			/>
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

	return <>{children}</>;
}
