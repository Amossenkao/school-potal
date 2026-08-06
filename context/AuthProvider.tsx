'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Ably from 'ably';
import useAuth from '@/store/useAuth';
import { useSchoolStore, setCurrentUserRole } from '@/store/schoolStore';
import { useNetworkStore } from '@/store/networkStore';
import { PageLoading } from '@/components/loading';
import { useHasSchool } from '@/context/HasSchoolContext';
import {
	getAuthorizedRealtimeChannels,
	resolveCanonicalTenantKey,
	type AuthorizedRealtimeUser,
	type RealtimeEvent,
} from '@/lib/realtimeTypes';
import { tryMarkEventApplied } from '@/lib/tabSync';
import { isSyncEngineEnabled } from '@/lib/syncFeatureFlag';

const ABLY_SYNC_STREAM_TOKEN_ENDPOINT = '/api/sync/stream-token';
const SYNC_REFRESH_DEBOUNCE_MS = 60;
const SECURITY_SYNC_REASONS = new Set([
	'account-deactivated',
	'password-changed-session-revocation',
	'password-reset',
	'user-deleted',
	'user-password-reset',
]);

const resolveEventDomain = (type: string): string => {
	if (type === 'GRADE_CREATED' || type === 'GRADE_UPDATED') return 'grades';
	if (type === 'GRADE_CHANGE_REQUESTED') return 'gradeRequests';
	if (type === 'ATTENDANCE_CREATED' || type === 'ATTENDANCE_UPDATED')
		return 'attendance';
	if (type === 'TEACHER_ATTENDANCE_SAVED') return 'teacher_attendance';
	if (type === 'EVENT_CREATED' || type === 'EVENT_UPDATED' || type === 'EVENT_DELETED')
		return 'calendar';
	if (type.startsWith('SCHEDULE_')) return 'schedules';
	if (
		type.startsWith('USER_') ||
		type.startsWith('STUDENT_') ||
		type.startsWith('CLASS_')
	) {
		return 'users';
	}
	return 'school';
};

export default function AuthProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const bootstrapAuth = useAuth((state) => state.bootstrapAuth);
	const checkAuthStatus = useAuth((state) => state.checkAuthStatus);
	const user = useAuth((state) => state.user);
	const realtimeUser = user as AuthorizedRealtimeUser;
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
	const hasSchool = useHasSchool();

	const authRefreshInFlight = useRef(false);
	const pendingAuthRefreshRef = useRef<{
		force?: boolean;
		trigger?: string;
		academicYear?: string;
	} | null>(null);
	const syncEventDebounceRef = useRef<number | null>(null);
	const realtimeClientRef = useRef<Ably.Realtime | null>(null);
	const realtimeSubscriptionsRef = useRef<Array<() => void>>([]);
	const [reconnectTrigger, setReconnectTrigger] = useState(0);
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
					useSchoolStore.getState().school?.identity.currentAcademicYear;
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
		// Ably rejects in-flight operations with "Connection closed" when the
		// client is torn down mid-authentication, and unsubscribe() on a channel
		// of an already-closing client can throw too. Neither is recoverable or
		// interesting: we are discarding this client. Left unhandled they surface
		// as uncaught promise rejections from React's effect cleanup.
		realtimeSubscriptionsRef.current.forEach((unsubscribe) => {
			try {
				unsubscribe();
			} catch {
				/* client already gone */
			}
		});
		realtimeSubscriptionsRef.current = [];
		const client = realtimeClientRef.current;
		realtimeClientRef.current = null;
		if (!client) return;
		try {
			client.close();
		} catch {
			/* already closed */
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

	// ── Single owner of every auth-driven navigation decision ─────────────
	// Startup, login and logout all resolve through this one derived
	// destination. Previously six independent effects (three here, two in
	// ProtectedRoute, one in the login page) could each call router.replace /
	// router.push from partially-overlapping state, so which one won depended
	// on React's effect ordering. That is what produced the double redirects
	// and the momentary wrong screen.
	const ownsRoute =
		pathname === '/' ||
		pathname === '/login' ||
		pathname === '/login/account-setup' ||
		pathname.startsWith('/dashboard');

	const destination = useMemo<string | null>(() => {
		// Routes we do not own (public report links, marketing pages, ...)
		// render untouched.
		if (!ownsRoute) return null;
		// School host whose profile has not resolved yet: the root route
		// server-renders the correct shell for this host.
		if (hasSchool && !currentSchool) return '/';
		if (!user?.isActive) return '/login';
		if (
			user.role !== 'system_admin' &&
			user.role !== 'superadmin' &&
			user.mustChangePassword
		) {
			return '/login/account-setup';
		}
		return '/dashboard';
	}, [ownsRoute, hasSchool, currentSchool, user]);

	// Is the current URL already an acceptable home for `destination`?
	const atDestination = useMemo(() => {
		if (!destination) return true;
		// Preserve dashboard deep links rather than collapsing them to /dashboard.
		if (destination === '/dashboard') return pathname.startsWith('/dashboard');
		// `/` server-renders the login screen, so an unauthenticated visitor is
		// already home there. Redirecting `/` → `/login` is pure churn, and it
		// is the redirect every cold PWA launch used to pay (start_url is `/`).
		if (destination === '/login') {
			return pathname === '/login' || pathname === '/';
		}
		return pathname === destination;
	}, [destination, pathname]);

	const startupSettled = startupResolved && !isBootstrapping;

	// Logout clears isLoggingOut in the same commit that clears the user, but
	// the navigation to /login lands a tick later. Without this the spinner
	// would flip "Signing out..." → "Loading..." mid-transition; the user
	// should see one uninterrupted signing-out spinner until /login mounts.
	const signingOutRef = useRef(false);
	useEffect(() => {
		if (isLoggingOut) signingOutRef.current = true;
		else if (atDestination) signingOutRef.current = false;
	}, [isLoggingOut, atDestination]);

	useEffect(() => {
		if (!startupSettled) return;
		// Logout owns its own transition: it flips state exactly once, and the
		// next run of this effect performs the single resulting navigation.
		if (isLoggingOut) return;
		if (!destination || atDestination) return;
		router.replace(destination);
	}, [startupSettled, isLoggingOut, destination, atDestination, router]);

	// Sync user role to schoolStore so applyRealtimeEvent can skip
	// setSchool() for superadmins (they manage schools, they don't have one).
	useEffect(() => {
		setCurrentUserRole(user?.role ?? null);
		return () => setCurrentUserRole(null);
	}, [user?.role]);

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

		// Wait for the school profile to load before creating the Ably
		// client. The token endpoint resolves tenantId from the DB school
		// profile (prioritising system.dbName). If we create the client
		// before currentSchool is available, resolveTenantSyncKey falls
		// back to window.location.host — producing a channel name like
		// "school:ucaliberia.vercel.app" that doesn't match the token's
		// granted capability "school:ucaliberia" (the dbName), causing a
		// 40160 "Channel denied" error.
		if (!currentSchool) return;

		// Profile-only, exactly as the token endpoint resolves it. Passing
		// window.location.host as a fallback here is what produced the mismatch
		// the comment above describes; there is now no host in this path at all.
		const tenantKey = resolveCanonicalTenantKey({ schoolProfile: currentSchool });
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
			user: realtimeUser,
			role: user.role,
		});

		const handleRealtimeEvent = (event: RealtimeEvent) => {
			const academicYear = String(
				event.payload?.academicYear || event.payload?.year || '',
			).trim();

			const applyEvent = (evt: RealtimeEvent) => {
				try {
					useSchoolStore.getState().applyRealtimeEvent(evt);
				} catch (storeError) {
					console.warn(
						'[AuthProvider] schoolStore.applyRealtimeEvent threw:',
						storeError,
					);
				}
				useAuth.getState().applyRealtimeEvent(evt);

				const currentUserId = String(user?.id || '').trim();
				const targetUserIds = Array.isArray(evt.payload?.targetUserIds)
					? evt.payload.targetUserIds.map((v) => String(v || '').trim())
					: [];
				const eventUserId = String(evt.payload?.userId || '').trim();
				const impactsCurrentUser =
					currentUserId &&
					(Boolean(eventUserId && eventUserId === currentUserId) ||
						targetUserIds.includes(currentUserId));

				if (evt.type === 'USER_DISABLED' && impactsCurrentUser) {
					return;
				}

				const reason = String(evt.payload?.reason || '').trim();

				if (SECURITY_SYNC_REASONS.has(reason)) {
					void runAuthRefresh({
						force: true,
						trigger: `ably-security:${evt.type}`,
						academicYear,
					});
					return;
				}

				const hasPayloadUser = Boolean(
					evt.payload?.user && typeof evt.payload.user === 'object',
				);
				const isUserEvent = [
					'USER_CREATED',
					'USER_UPDATED',
					'USER_DISABLED',
					'STUDENT_ADDED',
					'STUDENT_REMOVED',
					'CLASS_UPDATED',
				].includes(evt.type);

				if (isUserEvent && hasPayloadUser) {
					if (impactsCurrentUser) {
						scheduleRefresh({
							force: true,
							trigger: `ably:${evt.type}`,
							academicYear,
						});
					}
					return;
				}

				// School-level changes (features toggled, settings, activation) are
				// already applied to the school store by applyRealtimeEvent above.
				// Skipping the auth refresh avoids applyBootstrapPayload overwriting
				// the store with stale API data from getSchoolProfile().
				if (
					evt.type === 'SCHOOL_UPDATED' ||
					evt.type === 'SCHOOL_DELETED'
				) {
					return;
				}

				// Monitoring/observability events (warnings, system alerts, log
				// aggregation) are not school-data changes. Refreshing on them can
				// create an error → warning → refresh feedback loop, since a sync
				// failure surfaces as a monitoring warning.
				if (
					evt.type === 'APPLICATION_LOG_CREATED' ||
					evt.type === 'APPLICATION_WARNING_CREATED' ||
					evt.type === 'SYSTEM_ALERT_CREATED' ||
					evt.type === 'MONITORING_UPDATED'
				) {
					return;
				}

				scheduleRefresh({
					force: true,
					trigger: `ably:${evt.type}`,
					academicYear,
				});
			};

			// Events produced by the sync engine carry a monotonic seq. Dedupe
			// them across tabs so the same seq is applied exactly once (§6.5).
			// Gated behind the sync-engine flag; legacy events always apply.
			if (
				typeof event.seq === 'number' &&
				isSyncEngineEnabled()
			) {
				const eventId = `${event.type}:${event.tenantId}:${event.seq}`;
				void tryMarkEventApplied({
					eventId,
					domain: resolveEventDomain(event.type),
					academicYear: academicYear || 'unknown',
					seq: event.seq,
				}).then((alreadyApplied) => {
					if (alreadyApplied) return;
					applyEvent(event);
				});
				return;
			}

			applyEvent(event);
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
				// Not every subscribed channel is exclusive to this tenant —
				// platform:events (added by getAuthorizedRealtimeChannels for
				// every user, for cross-tenant observability broadcasts) also
				// carries other event types like SCHOOL_UPDATED/SCHOOL_DELETED
				// for every other school. resolveTenantSyncKey is the single
				// shared helper both client and server use to compute
				// tenantKey, so this equality check is safe and doesn't risk
				// dropping legitimate same-tenant events (the same check is
				// already used successfully in components/inactive.tsx and
				// app/login/page.tsx). Without it, another school's realtime
				// event — e.g. a superadmin editing that school's profile —
				// gets applied to this session too.
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

		/**
		 * A 401 from the token endpoint means the session is gone — the account
		 * was disabled, or the whole school was deactivated and every tenant
		 * session revoked with it. Retrying cannot mint a token for a session
		 * that no longer exists, so reconnecting on a timer just loops forever
		 * while the user sits in a shell that looks logged in but receives
		 * nothing. Hand it to the auth check instead, which resolves the session
		 * properly and redirects to login.
		 */
		const isAuthFailure = () => {
			const code = Number(
				(client.connection.errorReason as any)?.statusCode ?? 0,
			);
			return code === 401 || code === 403;
		};

		const scheduleReconnect = (state: string, delayMs: number) => {
			setAblyState(state as any);
			setAuthCheckFailed(true);
			if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

			if (isAuthFailure()) {
				console.warn(
					`[AuthProvider] Ably ${state} — token endpoint rejected the session; re-checking auth.`,
				);
				closeRealtimeClient();
				if (useAuth.getState().isLoggingOut) return;
				void runAuthRefresh({ force: true, trigger: `ably-unauthorized:${state}` });
				return;
			}

			console.warn(
				`[AuthProvider] Ably connection ${state}, reconnecting in ${delayMs / 1000}s`,
			);
			reconnectTimerRef.current = setTimeout(() => {
				reconnectTimerRef.current = null;
				closeRealtimeClient();
				setReconnectTrigger((n) => n + 1);
			}, delayMs);
		};

		client.connection.on('failed', () => scheduleReconnect('failed', 5000));
		client.connection.on('suspended', () =>
			scheduleReconnect('suspended', 10000),
		);

		return () => {
			if (reconnectTimerRef.current) {
				clearTimeout(reconnectTimerRef.current);
				reconnectTimerRef.current = null;
			}
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
		reconnectTrigger,
		setAblyState,
		setAuthCheckFailed,
		user?.id,
		user?.isActive,
		user?.role,
		realtimeUser?.classId,
		realtimeUser?.academicYears,
		realtimeUser?.subjects,
		realtimeUser?.sponsorClass,
		realtimeUser?.parentChildren,
		// isTeacher administrators store their class assignment in `classes`
		// (see utils/gradeActor.ts) — must resubscribe channels when it changes,
		// same as `subjects` does for teachers.
		(realtimeUser as any)?.classes,
		(realtimeUser as any)?.isTeacher,
	]);

	// The startup decision has not been made yet.
	if (!startupSettled) {
		return (
			<PageLoading
				variant={hasSchool ? 'school' : 'company'}
				fullScreen={true}
				message="Loading..."
			/>
		);
	}

	if (isLoggingOut) {
		return (
			<PageLoading
				variant={hasSchool ? 'school' : 'company'}
				fullScreen={true}
				message="Signing out..."
			/>
		);
	}

	// A transition is pending. Holding the spinner instead of mounting the
	// screen the user is about to leave is what guarantees exactly one screen
	// at a time: no login flash before the dashboard, no dashboard flash
	// before the login page. The effect above is already navigating.
	if (!atDestination) {
		return (
			<PageLoading
				variant={hasSchool ? 'school' : 'company'}
				fullScreen={true}
				message={signingOutRef.current ? 'Signing out...' : 'Loading...'}
			/>
		);
	}

	if (!currentSchool && hasSchool) {
		return (
			<PageLoading
				variant="school"
				fullScreen={true}
				message="Loading..."
			/>
		);
	}

	return <>{children}</>;
}
