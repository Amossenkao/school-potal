// authStore.ts
import { create } from 'zustand';
import { isEqual } from 'lodash';
import { User } from '@/types';
import { useSchoolStore } from './schoolStore';
import { useNetworkStore } from './networkStore';
import { clearAllClientCache } from '@/utils/clientCache';
import { useOfflineNavigationStore } from './offlineNavigationStore';
import {
	clearUserSessionDataCaches,
	type ClearUserSessionDataOptions,
} from '@/utils/sessionPrivacy';
import type { RealtimeEvent } from '@/lib/realtimeTypes';
import { cacheAppShellDirect } from '@/utils/cacheAppShell';

interface LoginData {
	role: string;
	username: string;
	password: string;
	position?: string;
}

type SyncVersions = {
	user?: string;
	school?: string;
	users?: string;
	calendar?: string;
	schedules?: string;
	grades?: string;
	gradeRequests?: string;
	attendance?: string;
};

interface AuthState {
	user: User | null;
	isLoggedIn: boolean;
	error: string | null;
	isLoading: boolean;
	userVersion: string | null;
	sessionId: string | null;

	// Bootstrap / verification lifecycle
	isBootstrapping: boolean;
	hasBootstrapped: boolean;
	isVerifying: boolean;
	isLoggingOut: boolean;
	startupResolved: boolean;

	login: (loginData: LoginData) => Promise<User | null>;
	logout: () => Promise<void>;
	checkAuthStatus: (options?: {
		skipConnectivityCheck?: boolean;
		force?: boolean;
		trigger?: string;
		academicYear?: string;
	}) => Promise<void>;
	bootstrapAuth: (options?: { force?: boolean }) => Promise<void>;

	clearError: () => void;
	setUser: (user: User | null) => void;
	hydrateFromCache: () => void;
	applyRealtimeEvent: (event: RealtimeEvent) => void;
}

let authCheckPromise: Promise<void> | null = null;
let authBootstrapPromise: Promise<void> | null = null;
let lastAuthCheckCompletedAt = 0;
let authFlowEpoch = 0;

const AUTH_REQUEST_TIMEOUT_MS = 15000;
const AUTH_CHECK_DEDUP_MS = 1200;
const CLIENT_SESSION_PRESENT_COOKIE = 'session-present';
const OFFLINE_REQUEST_MESSAGE =
	'You are offline. Please connect to the internet and try again.';
const REQUEST_TIMEOUT_MESSAGE = 'The request took too long. Please try again.';

const createTimeoutAbortReason = (requestName: string) => {
	try {
		return new DOMException(`${requestName} timed out`, 'TimeoutError');
	} catch {
		return new Error(`${requestName} timed out`);
	}
};

const isAbortLikeError = (error: unknown) => {
	if (!error) return false;
	if (error instanceof DOMException) {
		return error.name === 'AbortError' || error.name === 'TimeoutError';
	}
	if (typeof error === 'object') {
		const candidate = error as { name?: unknown; message?: unknown };
		const name = typeof candidate.name === 'string' ? candidate.name : '';
		if (name === 'AbortError' || name === 'TimeoutError') return true;
		const message =
			typeof candidate.message === 'string' ? candidate.message : '';
		if (/signal is aborted/i.test(message)) return true;
	}
	return false;
};

const isLikelyNetworkError = (error: unknown) => {
	if (isAbortLikeError(error)) return false;
	if (error instanceof TypeError) return true;
	if (typeof error === 'object' && error) {
		const candidate = error as { message?: unknown };
		const message =
			typeof candidate.message === 'string' ? candidate.message : '';
		if (
			/network.?error/i.test(message) ||
			/failed to fetch/i.test(message) ||
			/load failed/i.test(message)
		) {
			return true;
		}
	}
	return false;
};

const getCookieValue = (name: string) => {
	if (typeof document === 'undefined') return '';
	const match = document.cookie.match(
		new RegExp(
			`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`,
		),
	);
	return match ? decodeURIComponent(match[1]) : '';
};

const hasClientSessionCookie = () =>
	Boolean(getCookieValue(CLIENT_SESSION_PRESENT_COOKIE));

const clearClientSessionCookie = () => {
	if (typeof document === 'undefined') return;
	document.cookie = `${CLIENT_SESSION_PRESENT_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
};

const beginAuthMutation = () => {
	authFlowEpoch += 1;
	authCheckPromise = null;
	authBootstrapPromise = null;
	return authFlowEpoch;
};

const useAuth = create<AuthState>((set, get) => {
	const OFFLINE_REQUESTS_KEY = 'school_portal_offline_requests';
	const LOGOUT_ENDPOINT = '/api/auth/login';

	const hasQueuedLogoutRequest = () => {
		if (typeof window === 'undefined') return false;
		try {
			const raw = window.localStorage.getItem(OFFLINE_REQUESTS_KEY);
			if (!raw) return false;
			const queued = JSON.parse(raw);
			if (!Array.isArray(queued)) return false;
			return queued.some((item) => {
				const method = String(item?.method || 'GET').toUpperCase();
				const url = String(item?.url || '');
				return (
					method === 'DELETE' &&
					(url === LOGOUT_ENDPOINT || url.endsWith(LOGOUT_ENDPOINT))
				);
			});
		} catch {
			return false;
		}
	};

	const clearSessionScopedClientState = () => {
		clearAllClientCache();
		useOfflineNavigationStore.getState().clearOfflinePath();
	};

	const clearSessionSensitiveStorage = async (
		mode: 'session' | 'logout' = 'session',
		options: Omit<ClearUserSessionDataOptions, 'mode'> = {},
	) => {
		await clearUserSessionDataCaches({ mode, ...options });
	};

	const setDashboardStartPath = () => {
		useOfflineNavigationStore.getState().setOfflinePath('/dashboard');
	};

	const cacheAuthUser = (user: User | null) => {
		try {
			if (user) {
				localStorage.setItem('auth-user', JSON.stringify(user));
			} else {
				localStorage.removeItem('auth-user');
			}
		} catch (error) {
			console.warn('Failed to cache auth user:', error);
		}
	};

	const resolveIdentity = (user: User | null | undefined) => {
		if (!user) return '';
		const extraFields = user as User & { _id?: string; studentId?: string };
		return String(user.id || extraFields._id || extraFields.studentId || '');
	};

	const getScopedVersion = (
		versionMap: Record<string, string> | undefined,
		preferredYear?: string | null,
	) => {
		if (!versionMap || typeof versionMap !== 'object') return null;

		const candidateYears: string[] = [];
		if (preferredYear) {
			candidateYears.push(preferredYear);
			if (preferredYear.includes('/')) {
				candidateYears.push(preferredYear.replace(/\//g, '-'));
			}
			if (preferredYear.includes('-')) {
				candidateYears.push(preferredYear.replace(/-/g, '/'));
			}
		}

		for (const year of candidateYears) {
			const version = versionMap[year];
			if (typeof version === 'string') return version;
		}

		for (const version of Object.values(versionMap)) {
			if (typeof version === 'string') return version;
		}

		return null;
	};

const applyBootstrapPayload = (
	data: any,
	options: { gradesStrategy?: 'replace' | 'merge' } = {},
) => {
	const gradesStrategy = options.gradesStrategy ?? 'replace';
	const schoolStore = useSchoolStore.getState();
	const versions: SyncVersions =
		data?.versions && typeof data.versions === 'object' ? data.versions : {};
	const academicYear = data?.academicYear;

	if (data?.school !== undefined && data?.school !== null) {
		schoolStore.setSchool(data.school);
	}
	if (typeof versions.school === 'string') {
		schoolStore.setSchoolVersion(versions.school);
	}

	if (academicYear && versions) {
		schoolStore.setDomainVersionsForYear(academicYear, {
			users:
				typeof versions.users === 'string'
					? versions.users
					: typeof data?.usersVersion === 'string'
						? data.usersVersion
						: undefined,
			calendar:
				typeof versions.calendar === 'string' ? versions.calendar : undefined,
			grades: typeof versions.grades === 'string' ? versions.grades : undefined,
			gradeRequests:
				typeof versions.gradeRequests === 'string'
					? versions.gradeRequests
					: undefined,
			schedules:
				typeof versions.schedules === 'string' ? versions.schedules : undefined,
			attendance:
				typeof versions.attendance === 'string'
					? versions.attendance
					: undefined,
		});
	}

	if (academicYear && data?.users) {
		schoolStore.setUsersForYear(academicYear, data.users);
	}

	if (academicYear && Array.isArray(data?.calendarEvents)) {
		schoolStore.setCalendarForYear(academicYear, data.calendarEvents);
	}

	if (academicYear && data?.schedules && typeof data.schedules === 'object') {
		schoolStore.setSchedulesForYear(academicYear, data.schedules);
	}

	// Grades: only a fresh login baseline (`login()`, gradesStrategy === 'replace')
	// should overwrite the store outright. Every other caller (periodic
	// checkAuthStatus / /api/auth/me pings, realtime-triggered refreshes) must
	// merge, or it will clobber grades that a background sync or optimistic
	// local patch already merged in.
	if (academicYear && Array.isArray(data?.grades)) {
		if (gradesStrategy === 'merge') {
			schoolStore.mergeGradesForYear(academicYear, data.grades);
		} else {
			schoolStore.setGradesForYear(academicYear, data.grades);
		}
	}

	if (academicYear && Array.isArray(data?.gradeRequests)) {
		schoolStore.setGradeRequestsForYear(academicYear, data.gradeRequests);
	}

	if (academicYear && Array.isArray(data?.attendance)) {
		schoolStore.setAttendanceForYear(academicYear, data.attendance);
	}

	if (academicYear && typeof window !== 'undefined') {
		const CURSOR_KEY = `sync_cursor_grades_${academicYear}`;

		if (typeof data?.gradesCursor === 'string') {
			// Bootstrap hit the cap — resume from where it stopped
			localStorage.setItem(CURSOR_KEY, data.gradesCursor);
		} else if (Array.isArray(data?.grades) && data.grades.length > 0) {
			// Bootstrap returned all grades — write a full resume cursor so
			// background-parallel sees remaining = 0 and skips unnecessary fetches.
			// NOTE: this branch only runs for a `replace`-strategy payload (login),
			// since a `merge`-strategy payload (e.g. /api/auth/me) may legitimately
			// return a small/partial `data.grades` slice that must NOT be treated
			// as "the complete set" for cursor purposes.
			if (gradesStrategy === 'replace') {
				const grades = data.grades;
				let latestGrade = grades[0];
				for (const grade of grades) {
					const gradeTime = new Date(grade.lastUpdated || 0).getTime();
					const latestTime = new Date(latestGrade.lastUpdated || 0).getTime();
					if (
						gradeTime > latestTime ||
						(gradeTime === latestTime &&
							String(grade._id) > String(latestGrade._id))
					) {
						latestGrade = grade;
					}
				}
				localStorage.setItem(
					CURSOR_KEY,
					JSON.stringify({
						lastUpdated: latestGrade.lastUpdated,
						_id: latestGrade._id,
						totalCount: grades.length,
						fetchedCount: grades.length,
						chunkSize: 30_000,
					}),
				);
			}
		} else if (gradesStrategy === 'replace') {
			// No grades at all on a fresh login baseline — clear any stale
			// cursor from a previous session. A merge-strategy call with no
			// grades tells us nothing about total state, so leave the cursor
			// (and whatever sync progress it represents) untouched.
			localStorage.removeItem(CURSOR_KEY);
		}
	}

	if (typeof versions.user === 'string') {
		set({ userVersion: versions.user });
	}
};

	const applyRealtimeEvent = (event: RealtimeEvent) => {
		const payload = (event?.payload || {}) as Record<string, unknown>;
		const affectedUserIds = new Set<string>(
			Array.isArray(payload.targetUserIds)
				? payload.targetUserIds
						.map((value) => String(value || '').trim())
						.filter(Boolean)
				: [],
		);
		const payloadUserId = String(payload.userId || '').trim();
		if (payloadUserId) affectedUserIds.add(payloadUserId);
		const currentUserId = String(get().user?.id || '').trim();
		const impactsCurrentUser =
			affectedUserIds.size === 0 ||
			(currentUserId ? affectedUserIds.has(currentUserId) : false);

		if (event.type === 'USER_DISABLED' && impactsCurrentUser) {
			set({
				user: null,
				isLoggedIn: false,
				isLoading: false,
				userVersion: null,
				error: 'Your account has been disabled.',
			});
			cacheAuthUser(null);
			clearClientSessionCookie();
			clearSessionScopedClientState();
			void clearSessionSensitiveStorage('logout');
			return;
		}

		if (event.type === 'USER_UPDATED' && impactsCurrentUser) {
			const nextUser =
				payload.user && typeof payload.user === 'object' ? payload.user : null;
			if (nextUser) {
				set((state) => {
					const updated = state.user
						? ({ ...state.user, ...nextUser } as User)
						: (nextUser as User);
					useSchoolStore.getState().pruneGradesForUser(updated);
					return { user: updated };
				});
			}
			if (typeof payload.userVersion === 'string') {
				set({ userVersion: payload.userVersion });
			}
		}

		if (
			event.type === 'GRADE_CREATED' ||
			event.type === 'GRADE_UPDATED' ||
			event.type === 'GRADE_CHANGE_REQUESTED' ||
			event.type === 'ANNOUNCEMENT_CREATED'
		) {
			useNetworkStore.getState().setAuthCheckFailed(false);
		}
	};

const runDeferredPostLoginBootstrap = (
	data: any,
	shouldClearPreviousSession: boolean,
) => {
	if (typeof window === 'undefined') return;
	const schedule =
		window.requestIdleCallback || ((cb) => window.setTimeout(cb, 100));
	schedule(() => {
		void (async () => {
			try {
				if (shouldClearPreviousSession) {
					clearSessionScopedClientState();
					await clearSessionSensitiveStorage();
					setDashboardStartPath();
					if (data?.user) cacheAuthUser(data.user as User);
				}

				const academicYear = data?.academicYear;
				if (academicYear && typeof data?.gradesCursor === 'string') {
					setTimeout(() => {
						useSchoolStore.getState().runBackgroundGradeSync(academicYear, {
							gradesCursor: data.gradesCursor,
							mode: 'background-parallel',
						});
					}, 2500);
				}
			} catch (error) {
				console.warn('Deferred login bootstrap hydration failed:', error);
			}
		})();
	});
};

	return {
		user: null,
		isLoggedIn: false,
		error: null,
		isLoading: false,
		userVersion: null,
		sessionId: null,

		isBootstrapping: true,
		hasBootstrapped: false,
		isVerifying: false,
		isLoggingOut: false,
		startupResolved: false,
		login: async (loginData: LoginData): Promise<User | null> => {
			beginAuthMutation();
			set({ isLoading: true, error: null });
			try {
				// Capture the previously cached identity BEFORE login overwrites anything.
				const previousCachedUser = (() => {
					try {
						const raw = localStorage.getItem('auth-user');
						return raw ? (JSON.parse(raw) as User) : null;
					} catch {
						return null;
					}
				})();

				const res = await fetch('/api/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ ...loginData, action: 'login' }),
				});

				const data = await res.json().catch(() => ({}));

				if (!res.ok) {
					set({
						error: data.message || 'Invalid credentials',
						isLoading: false,
					});
					return null;
				}

				set({
					user: data.user,
					isLoggedIn: true,
					isLoading: false,
					error: null,
					hasBootstrapped: true,
					isBootstrapping: false,
					isVerifying: false,
					startupResolved: true,
				});
				useNetworkStore.getState().setAuthCheckFailed(false);
				applyBootstrapPayload(data);

				setDashboardStartPath();
				cacheAuthUser(data.user as User);
				try {
					window.history.replaceState(null, '', '/dashboard');
				} catch {}

				// Only wipe the previous session's caches if a DIFFERENT user just
				// logged in on this device. Otherwise we'd delete the IndexedDB
				// snapshots, RUNTIME_CACHE shell, and API_CACHE entries we just
				// wrote for offline use, moments after writing them.
				const previousIdentity = resolveIdentity(previousCachedUser);
				const nextIdentity = resolveIdentity(data.user as User);
				const isDifferentUser = Boolean(
					previousIdentity && nextIdentity && previousIdentity !== nextIdentity,
				);

				runDeferredPostLoginBootstrap(data, isDifferentUser);

				return data.user;
			} catch (error: any) {
				if (isAbortLikeError(error)) {
					set({ error: REQUEST_TIMEOUT_MESSAGE, isLoading: false });
					return null;
				}
				if (isLikelyNetworkError(error)) {
					useNetworkStore.getState().markOffline('login-request-failed');
					set({ error: OFFLINE_REQUEST_MESSAGE, isLoading: false });
					return null;
				}
				set({ error: error.message || 'Network error', isLoading: false });
				return null;
			}
		},

		logout: async () => {
			beginAuthMutation();
			// Mark logout in progress immediately. This is the ONLY signal
			// ProtectedRoute needs — user/isLoggedIn stay untouched until
			// everything below has actually finished.
			set({ isLoading: true, isLoggingOut: true });

			let wasOnline = false;

			try {
				wasOnline =
					typeof navigator !== 'undefined' && navigator.onLine
						? await useNetworkStore.getState().refreshConnectivity({
								force: true,
								timeoutMs: 2500,
								reason: 'logout',
							})
						: false;
				if (wasOnline) {
					const controller = new AbortController();
					const timeoutId = window.setTimeout(
						() => controller.abort(createTimeoutAbortReason('Logout request')),
						AUTH_REQUEST_TIMEOUT_MS,
					);
					try {
						const response = await fetch('/api/auth/login', {
							method: 'DELETE',
							credentials: 'include',
							signal: controller.signal,
						});
						if (!response.ok && response.status !== 401) {
							throw new Error(`Logout failed with status ${response.status}`);
						}
					} finally {
						window.clearTimeout(timeoutId);
					}
				}
			} catch (error) {
				if (isLikelyNetworkError(error) || isAbortLikeError(error)) {
					useNetworkStore.getState().markOffline('logout-request-failed');
					wasOnline = false;
				}
				if (!isAbortLikeError(error)) {
					console.warn('Logout request failed:', error);
				}
			}

			// Clear the UI state as soon as the server response is in hand. The
			// subsequent cache/IndexedDB/Service Worker cleanup can run in the
			// background without keeping the signing-out spinner visible.
			set({
				user: null,
				isLoggedIn: false,
				error: null,
				isLoading: false,
				userVersion: null,
				isBootstrapping: false,
				hasBootstrapped: true,
				isVerifying: false,
				isLoggingOut: false,
				startupResolved: true,
			});
			clearClientSessionCookie();
			try {
				window.history.replaceState(null, '', '/login');
			} catch {}

			void (async () => {
				try {
					localStorage.removeItem('auth-user');
				} catch (error) {
					console.warn('Failed to clear auth user cache:', error);
				}
				useSchoolStore.getState().clearCache();
				clearSessionScopedClientState();
				await clearSessionSensitiveStorage('logout');

				// Only worth re-priming the SW's cached shell if we're actually online —
				// offline, /login is already precached, and this fetch would just hang
				// or fail for no benefit while the user waits.
				if (wasOnline) {
					try {
						await cacheAppShellDirect('/login');
					} catch (error) {
						console.warn('Failed to pre-cache login shell:', error);
					}
				}
			})().catch((error) => {
				console.warn('Logout cleanup failed:', error);
			});
		},

		applyRealtimeEvent,

		checkAuthStatus: async (options) => {
			const requestEpoch = authFlowEpoch;
			const now = Date.now();
			const skipConnectivityCheck = options?.skipConnectivityCheck ?? true;
			const force = options?.force === true;
			const trigger = String(options?.trigger || '').trim();
			const requestedAcademicYear = String(options?.academicYear || '').trim();

			if (get().isLoggingOut) return;
			if (typeof window !== 'undefined' && !hasClientSessionCookie()) {
				if (get().user || get().isLoggedIn) {
					set({ user: null, isLoggedIn: false, userVersion: null });
					cacheAuthUser(null);
				}
				useNetworkStore.getState().setAuthCheckFailed(false);
				lastAuthCheckCompletedAt = Date.now();
				return;
			}
			if (authCheckPromise) {
				return authCheckPromise;
			}
			if (!force && now - lastAuthCheckCompletedAt < AUTH_CHECK_DEDUP_MS) {
				return;
			}

			if (hasQueuedLogoutRequest()) {
				set({
					user: null,
					isLoggedIn: false,
					userVersion: null,
				});
				useNetworkStore.getState().setAuthCheckFailed(false);
				lastAuthCheckCompletedAt = Date.now();
				return;
			}

			if (!skipConnectivityCheck) {
				const networkState = useNetworkStore.getState();
				const isOnline = await networkState.refreshConnectivity({
					timeoutMs: 15000,
					reason: 'auth-check',
				});

				if (!isOnline) {
					useNetworkStore.getState().setAuthCheckFailed(true);
					if (!get().user) {
						get().hydrateFromCache();
					}
					lastAuthCheckCompletedAt = Date.now();
					return;
				}
			} else if (typeof navigator !== 'undefined' && !navigator.onLine) {
				useNetworkStore.getState().markOffline('browser-offline');
				useNetworkStore.getState().setAuthCheckFailed(true);
				if (!get().user) {
					get().hydrateFromCache();
				}
				lastAuthCheckCompletedAt = Date.now();
				return;
			}

			authCheckPromise = (async () => {
				try {
					const schoolState = useSchoolStore.getState();
					const preferredYear =
						requestedAcademicYear || schoolState.school?.currentAcademicYear;
					const query = new URLSearchParams();
					const usersVersion = getScopedVersion(
						schoolState.usersVersionByAcademicYear,
						preferredYear,
					);
					const gradesVersion = getScopedVersion(
						schoolState.gradesVersionByAcademicYear,
						preferredYear,
					);
					const calendarVersion = getScopedVersion(
						schoolState.calendarVersionByAcademicYear,
						preferredYear,
					);
					const schedulesVersion = getScopedVersion(
						schoolState.schedulesVersionByAcademicYear,
						preferredYear,
					);
					const gradeRequestsVersion = getScopedVersion(
						schoolState.gradeRequestsVersionByAcademicYear,
						preferredYear,
					);
					const attendanceVersion = getScopedVersion(
						schoolState.attendanceVersionByAcademicYear,
						preferredYear,
					);

					if (typeof usersVersion === 'string') {
						query.set('v_users', String(usersVersion));
						query.set('usersVersion', String(usersVersion));
					}
					if (typeof gradesVersion === 'string') {
						query.set('v_grades', gradesVersion);
					}
					if (typeof calendarVersion === 'string') {
						query.set('v_calendar', calendarVersion);
					}
					if (typeof schedulesVersion === 'string') {
						query.set('v_schedules', schedulesVersion);
					}
					if (typeof gradeRequestsVersion === 'string') {
						query.set('v_grade_requests', gradeRequestsVersion);
					}
					if (typeof attendanceVersion === 'string') {
						query.set('v_attendance', attendanceVersion);
					}
					if (typeof schoolState.schoolVersion === 'string') {
						query.set('v_school', schoolState.schoolVersion);
					}
					if (typeof get().userVersion === 'string') {
						query.set('v_user', get().userVersion as string);
					}
					if (requestedAcademicYear) {
						query.set('academicYear', requestedAcademicYear);
					}
					if (trigger) {
						query.set('sync_trigger', trigger);
					}

					const url = query.toString()
						? `/api/auth/me?${query.toString()}`
						: '/api/auth/me';
					const controller = new AbortController();
					const timeoutId = window.setTimeout(
						() =>
							controller.abort(
								createTimeoutAbortReason('Auth status check request'),
							),
						AUTH_REQUEST_TIMEOUT_MS,
					);
					const res = await (async () => {
						try {
							return await fetch(url, {
								method: 'GET',
								credentials: 'include',
								signal: controller.signal,
							});
						} finally {
							window.clearTimeout(timeoutId);
						}
					})();

					if (!res.ok && res.status !== 401 && res.status !== 403) {
						throw new Error(`Server status ${res.status}`);
					}

					const data = await res.json().catch(() => ({}));

					// If logout started while the request was in flight, discard
					// the response — logout must win over every background process.
					if (get().isLoggingOut || requestEpoch !== authFlowEpoch) return;

					useNetworkStore.getState().setAuthCheckFailed(false);
					applyBootstrapPayload(data, { gradesStrategy: 'merge' });

					if (Object.prototype.hasOwnProperty.call(data, 'user') && data.user) {
						const previousIdentity = resolveIdentity(get().user);
						const nextIdentity = resolveIdentity(data.user as User);
						if (
							previousIdentity &&
							nextIdentity &&
							previousIdentity !== nextIdentity
						) {
							clearSessionScopedClientState();
							await clearSessionSensitiveStorage();
							setDashboardStartPath();
						}
						if (!isEqual(data.user, get().user)) {
							set({ user: data.user, isLoggedIn: true });
						} else if (!get().isLoggedIn) {
							set({ isLoggedIn: true });
						}
						try {
							localStorage.setItem('auth-user', JSON.stringify(data.user));
						} catch (error) {
							console.warn('Failed to cache auth user:', error);
						}
					} else if (Object.prototype.hasOwnProperty.call(data, 'user')) {
						const hasAuthenticatedState = Boolean(
							get().isLoggedIn || get().user,
						);
						if (hasAuthenticatedState) {
							set({ user: null, isLoggedIn: false, userVersion: null });
							try {
								localStorage.removeItem('auth-user');
							} catch (error) {
								console.warn('Failed to clear auth user cache:', error);
							}
							clearClientSessionCookie();
							clearSessionScopedClientState();
							await clearSessionSensitiveStorage('logout');
						}
					}
				} catch (error) {
					if (isLikelyNetworkError(error)) {
						useNetworkStore.getState().markOffline('auth-check-failed');
						if (!get().user) {
							get().hydrateFromCache();
						}
					}
					if (!isAbortLikeError(error)) {
						console.error('Auth check failed (network/server error):', error);
					}
					useNetworkStore.getState().setAuthCheckFailed(true);
				}
			})().finally(() => {
				lastAuthCheckCompletedAt = Date.now();
				authCheckPromise = null;
			});

			await authCheckPromise;
		},

		bootstrapAuth: async ({ force = false } = {}) => {
			if (authBootstrapPromise) {
				return authBootstrapPromise;
			}
			if (get().hasBootstrapped && !force) {
				return;
			}

			authBootstrapPromise = (async () => {
				useSchoolStore.getState().hydrateCache();
				if (!useSchoolStore.getState().school) {
					await useSchoolStore.getState().fetchSchool();
				}

				get().hydrateFromCache();
				const hasCachedUser = Boolean(get().user?.isActive);
				const hasSessionCookie =
					typeof window === 'undefined' ? false : hasClientSessionCookie();

				set({
					isBootstrapping: false,
					hasBootstrapped: true,
					isVerifying: hasCachedUser && hasSessionCookie,
					startupResolved: true,
				});

				if (!hasCachedUser || !hasSessionCookie) {
					return;
				}

				if (typeof navigator !== 'undefined' && !navigator.onLine) {
					useNetworkStore.getState().markOffline('browser-offline');
					useNetworkStore.getState().setAuthCheckFailed(true);
					set({ isVerifying: false });
					return;
				}

				// 3. Confirm with the server in the background. No timeout
				// truncating it since it isn't blocking anything anymore.
				try {
					await get().checkAuthStatus({
						skipConnectivityCheck: true,
						force: true,
					});
				} catch (error) {
					console.warn('Auth bootstrap verification failed:', error);
				} finally {
					set({ isVerifying: false });
				}
			})().finally(() => {
				authBootstrapPromise = null;
			});

			await authBootstrapPromise;
		},

		clearError: () => set({ error: null }),

		setUser: (user: User | null) => {
			const currentUser = get().user;
			if (!isEqual(currentUser, user)) {
				set({ user, isLoggedIn: Boolean(user?.isActive) });
				try {
					if (user) {
						localStorage.setItem('auth-user', JSON.stringify(user));
					} else {
						localStorage.removeItem('auth-user');
						set({ userVersion: null });
					}
				} catch (error) {
					console.warn('Failed to sync auth user cache:', error);
				}
			}
		},
		hydrateFromCache: () => {
			try {
				if (hasQueuedLogoutRequest()) {
					localStorage.removeItem('auth-user');
					set({ user: null, isLoggedIn: false, userVersion: null });
					return;
				}
				if (!hasClientSessionCookie()) {
					localStorage.removeItem('auth-user');
					set({ user: null, isLoggedIn: false, userVersion: null });
					return;
				}
				const cached = localStorage.getItem('auth-user');
				if (!cached) return;
				const parsed = JSON.parse(cached) as User;
				if (parsed) {
					set({ user: parsed, isLoggedIn: Boolean(parsed?.isActive) });
				}
			} catch (error) {
				console.warn('Failed to hydrate auth user:', error);
			}
		},
	};
});

export default useAuth;
