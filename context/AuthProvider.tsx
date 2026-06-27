'use client';

import { useCallback, useEffect, useRef } from 'react';
import Ably from 'ably';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { useNetworkStore } from '@/store/networkStore';
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
	const currentSchool = useSchoolStore((state) => state.school);

	const setBrowserOnline = useNetworkStore((state) => state.setBrowserOnline);
	const markOffline = useNetworkStore((state) => state.markOffline);
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

			// Only run background grade sync if there's a cursor to resume from.
			// If gradesCursor was null at bootstrap, all grades are already present
			// and there's nothing for the background sync to do.
			const activeYear =
				options?.academicYear ||
				useSchoolStore.getState().school?.currentAcademicYear;
			if (activeYear) {
				const CURSOR_KEY = `sync_cursor_grades_${activeYear}`;
				const hasCursor = Boolean(localStorage.getItem(CURSOR_KEY));
				if (hasCursor) {
					useSchoolStore.getState().runBackgroundGradeSync(activeYear);
				}
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

	useEffect(() => {
		const runInitialBootstrap = async () => {
			try {
				await bootstrapAuth({ force: true });
				await ensureSchoolProfile();
			} catch (error) {
				console.error('[AuthProvider] Initial auth bootstrap failed:', error);
			}
		};
		void runInitialBootstrap();

		const handleOnline = () => {
			setBrowserOnline(true);
			void runAuthRefresh({ force: true, trigger: 'online' });
		};
		const handleOffline = () => {
			markOffline('browser-offline');
			setAuthCheckFailed(true);
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}, [
		bootstrapAuth,
		ensureSchoolProfile,
		markOffline,
		runAuthRefresh,
		setAuthCheckFailed,
		setBrowserOnline,
	]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (!user?.isActive) {
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
	console.log("handleRealtimeEvent called", event)
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

	// Only trigger a server round-trip if the event carries no user payload.
	// If payloadUser is present, applyRealtimeEvent already updated the roster
	// in-place — no need to re-fetch from the server.
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
		// Roster already patched in-place by applyRealtimeEvent.
		// Only sync if this impacts the current user's own session data.
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

		client.connection.on('connected', () => {
			setAuthCheckFailed(false);
			void runAuthRefresh({ force: true, trigger: 'ably-connected' });
		});
		client.connection.on('failed', () => {
			if (typeof navigator !== 'undefined' && !navigator.onLine) {
				markOffline('browser-offline');
			}
			setAuthCheckFailed(true);
		});
		client.connection.on('suspended', () => {
			setAuthCheckFailed(true);
		});

		return () => {
			closeRealtimeClient();
			if (syncEventDebounceRef.current !== null) {
				window.clearTimeout(syncEventDebounceRef.current);
				syncEventDebounceRef.current = null;
			}
		};
	}, [
		closeRealtimeClient,
		currentSchool,
		markOffline,
		runAuthRefresh,
		setAuthCheckFailed,
		user?.id,
		user?.isActive,
		user?.role,
		user,
	]);

	useEffect(() => {
		if (typeof navigator === 'undefined') return;
		if (!navigator.onLine && !user) {
			markOffline('browser-offline');
		}
	}, [markOffline, user]);

	return <>{children}</>;
}

