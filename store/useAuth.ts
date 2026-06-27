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
};

interface AuthState {
	user: User | null;
	isLoggedIn: boolean;
	error: string | null;
	isLoading: boolean;
	userVersion: string | null;
	isBootstrapping: boolean;
	hasBootstrapped: boolean;

	sessionId: string | null;
	isAwaitingOtp: boolean;
	otpContact: string | null;
	userId: string | null;

	login: (loginData: LoginData) => Promise<User | null>;
	verifyOtp: (otp: string) => Promise<boolean>;
	resendOtp: () => Promise<boolean>;
	logout: () => Promise<void>;
	checkAuthStatus: (options?: {
		skipConnectivityCheck?: boolean;
		force?: boolean;
		trigger?: string;
		academicYear?: string;
	}) => Promise<void>;
	bootstrapAuth: (options?: { force?: boolean }) => Promise<void>;

	clearError: () => void;
	resetOtpState: () => void;
	setUser: (user: User | null) => void;
	hydrateFromCache: () => void;
	applyRealtimeEvent: (event: RealtimeEvent) => void;
}

let authCheckPromise: Promise<void> | null = null;
let authBootstrapPromise: Promise<void> | null = null;
let lastAuthCheckCompletedAt = 0;

const AUTH_REQUEST_TIMEOUT_MS = 15000;
const AUTH_LOGIN_TIMEOUT_MS = 15000;
const AUTH_CHECK_DEDUP_MS = 1200;
const AUTH_BOOTSTRAP_TIMEOUT_MS = 15000;
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

const useAuth = create<AuthState>((set, get) => {
	const OFFLINE_REQUESTS_KEY = 'school_portal_offline_requests';
	const LOGOUT_ENDPOINT = '/api/auth/login';

	const enqueueOfflineRequest = (entry: {
		url: string;
		method: string;
		credentials?: RequestCredentials;
		headers?: Record<string, string>;
		body?: string;
	}) => {
		if (typeof window === 'undefined') return;
		try {
			const raw = window.localStorage.getItem(OFFLINE_REQUESTS_KEY);
			const queue = raw ? JSON.parse(raw) : [];
			queue.push({
				...entry,
				id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
				createdAt: Date.now(),
			});
			window.localStorage.setItem(OFFLINE_REQUESTS_KEY, JSON.stringify(queue));
		} catch (error) {
			console.warn('Failed to enqueue offline request:', error);
		}
	};

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

	
const applyBootstrapPayload = (data: any) => {
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
if (academicYear && Array.isArray(data?.grades)) {
	schoolStore.mergeGradesForYear(academicYear, data.grades);
}

	if (academicYear && Array.isArray(data?.gradeRequests)) {
		schoolStore.setGradeRequestsForYear(academicYear, data.gradeRequests);
	}


if (academicYear && typeof window !== 'undefined') {
	const CURSOR_KEY = `sync_cursor_grades_${academicYear}`;

	if (typeof data?.gradesCursor === 'string') {
		// Bootstrap hit the 20k cap — resume from where it stopped
		localStorage.setItem(CURSOR_KEY, data.gradesCursor);
	} else if (Array.isArray(data?.grades) && data.grades.length > 0) {
		// Bootstrap returned all grades — write a resume cursor pointing
		// to the most recent one so future refreshes only fetch new records
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
			}),
		);
	} else {
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
			sessionId: null,
			isAwaitingOtp: false,
			otpContact: null,
			userId: null,
		});
		cacheAuthUser(null);
		clearSessionScopedClientState();
		void clearSessionSensitiveStorage('logout');
		return;
	}

	if (event.type === 'USER_UPDATED' && impactsCurrentUser) {
		const nextUser =
			payload.user && typeof payload.user === 'object' ? payload.user : null;
		if (nextUser) {
			set((state) => ({
				user: state.user
					? ({ ...state.user, ...nextUser } as User)
					: state.user,
			}));
		}
		if (typeof payload.userVersion === 'string') {
			set({ userVersion: payload.userVersion });
		}
	}

	// Grade events and grade requests don't affect authStore state directly,
	// but confirming the connection is healthy prevents false offline indicators
	// for system admins who receive these on the school channel.
	if (
		event.type === 'GRADE_CREATED' ||
		event.type === 'GRADE_UPDATED' ||
		event.type === 'GRADE_CHANGE_REQUESTED' ||
		event.type === 'ANNOUNCEMENT_CREATED'
	) {
		useNetworkStore.getState().setAuthCheckFailed(false);
	}
};

const runDeferredPostLoginBootstrap = (data: any) => {
	if (typeof window === 'undefined') return;
	const schedule =
		window.requestIdleCallback || ((cb) => window.setTimeout(cb, 100));
	schedule(() => {
		void (async () => {
			try {
				clearSessionScopedClientState();
				await clearSessionSensitiveStorage();
				applyBootstrapPayload(data);
				setDashboardStartPath();

				if (data?.user) {
					cacheAuthUser(data.user as User);
				}

				const academicYear = data?.academicYear;
				if (academicYear && typeof data?.gradesCursor === 'string') {
					// Add a timeout so it doesn't block the dashboard redirect
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
		isBootstrapping: true,
		hasBootstrapped: false,

		sessionId: null,
		isAwaitingOtp: false,
		otpContact: null,
		userId: null,

		login: async (loginData: LoginData): Promise<User | null> => {
			set({ isLoading: true, error: null });
			try {
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

				if (data.requiresOTP) {
					set({
						sessionId: data.sessionId,
						isAwaitingOtp: true,
						otpContact: data.contact,
						userId: data.userId,
						isLoading: false,
						hasBootstrapped: true,
						isBootstrapping: false,
					});
					return null;
				}

				set({
					user: data.user,
					isLoggedIn: true,
					isLoading: false,
					sessionId: null,
					isAwaitingOtp: false,
					otpContact: null,
					userId: null,
					error: null,
					hasBootstrapped: true,
					isBootstrapping: false,
				});
				useNetworkStore.getState().setAuthCheckFailed(false);


				setDashboardStartPath();
				cacheAuthUser(data.user as User);
				runDeferredPostLoginBootstrap(data);

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

		verifyOtp: async (otp: string): Promise<boolean> => {
			const { sessionId, userId } = get();
			if (!sessionId) {
				set({ error: 'No active OTP session' });
				return false;
			}
			if (!/^[0-9]{6}$/.test(otp.trim())) {
				set({ error: 'Please enter a valid 6-digit OTP' });
				return false;
			}

			set({ isLoading: true, error: null });
			try {
				const controller = new AbortController();
				const timeoutId = window.setTimeout(
					() =>
						controller.abort(
							createTimeoutAbortReason('OTP verification request'),
						),
					AUTH_LOGIN_TIMEOUT_MS,
				);
				const res = await (async () => {
					try {
						return await fetch('/api/auth/login', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							credentials: 'include',
							body: JSON.stringify({
								sessionId,
								otp,
								action: 'verify_otp',
								userId,
							}),
							signal: controller.signal,
						});
					} finally {
						window.clearTimeout(timeoutId);
					}
				})();

				const data = await res.json().catch(() => ({}));

				if (!res.ok) {
					set({ error: data.message || 'Invalid OTP', isLoading: false });
					return false;
				}

				set({
					user: data.user,
					isLoggedIn: true,
					isLoading: false,
					sessionId: null,
					isAwaitingOtp: false,
					otpContact: null,
					userId: null,
					error: null,
					hasBootstrapped: true,
					isBootstrapping: false,
				});
				useNetworkStore.getState().setAuthCheckFailed(false);
				applyBootstrapPayload(data);
				setDashboardStartPath();
				cacheAuthUser(data.user as User);
				runDeferredPostLoginBootstrap(data);

				return true;
			} catch (error: any) {
				if (isAbortLikeError(error)) {
					set({
						error: REQUEST_TIMEOUT_MESSAGE,
						isLoading: false,
					});
					return false;
				}
				if (isLikelyNetworkError(error)) {
					useNetworkStore.getState().markOffline('otp-verification-failed');
					set({
						error: OFFLINE_REQUEST_MESSAGE,
						isLoading: false,
					});
					return false;
				}
				set({
					error: error.message || 'OTP verification failed',
					isLoading: false,
				});
				return false;
			}
		},

		resendOtp: async (): Promise<boolean> => {
			const { sessionId } = get();
			if (!sessionId) {
				set({ error: 'No active OTP session' });
				return false;
			}
			set({ isLoading: true, error: null });

			try {
				const controller = new AbortController();
				const timeoutId = window.setTimeout(
					() =>
						controller.abort(createTimeoutAbortReason('OTP resend request')),
					AUTH_REQUEST_TIMEOUT_MS,
				);
				const res = await (async () => {
					try {
						return await fetch('/api/auth/login', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							credentials: 'include',
							body: JSON.stringify({ sessionId, action: 'resend_otp' }),
							signal: controller.signal,
						});
					} finally {
						window.clearTimeout(timeoutId);
					}
				})();

				const data = await res.json().catch(() => ({}));

				if (!res.ok) {
					set({
						error: data.message || 'Failed to resend OTP',
						isLoading: false,
					});
					return false;
				}

				set({
					sessionId: data.sessionId,
					otpContact: data.contact,
					userId: data.userId,
					isLoading: false,
				});

				return true;
			} catch (error: any) {
				if (isAbortLikeError(error)) {
					set({
						error: REQUEST_TIMEOUT_MESSAGE,
						isLoading: false,
					});
					return false;
				}
				if (isLikelyNetworkError(error)) {
					useNetworkStore.getState().markOffline('otp-resend-failed');
					set({
						error: OFFLINE_REQUEST_MESSAGE,
						isLoading: false,
					});
					return false;
				}
				set({
					error: error.message || 'Failed to resend OTP',
					isLoading: false,
				});
				return false;
			}
		},

		logout: async () => {
			set({ isLoading: true });
			let queuedOfflineLogout = false;
			const queueOfflineLogout = () => {
				if (queuedOfflineLogout) return;
				enqueueOfflineRequest({
					url: '/api/auth/login',
					method: 'DELETE',
					credentials: 'include',
				});
				queuedOfflineLogout = true;
				if (typeof window !== 'undefined') {
					window.dispatchEvent(
						new CustomEvent('offline:fetch', {
							detail: {
								message:
									'You are offline. Logout request was queued and will sync when you reconnect.',
							},
						}),
					);
				}
			};

			try {
				const isOnline = await useNetworkStore.getState().refreshConnectivity({
					force: true,
					timeoutMs: 2500,
					reason: 'logout',
				});
				if (isOnline) {
					const controller = new AbortController();
					const timeoutId = window.setTimeout(
						() => controller.abort(createTimeoutAbortReason('Logout request')),
						AUTH_REQUEST_TIMEOUT_MS,
					);
					try {
						await fetch('/api/auth/login', {
							method: 'DELETE',
							credentials: 'include',
							signal: controller.signal,
						});
					} finally {
						window.clearTimeout(timeoutId);
					}
				} else {
					queueOfflineLogout();
				}
			} catch (error) {
				if (isLikelyNetworkError(error) || isAbortLikeError(error)) {
					useNetworkStore.getState().markOffline('logout-request-failed');
					queueOfflineLogout();
				}
				if (!isAbortLikeError(error)) {
					console.warn('Logout request failed:', error);
				}
			}

			set({
				user: null,
				isLoggedIn: false,
				error: null,
				isLoading: false,
				sessionId: null,
				isAwaitingOtp: false,
				otpContact: null,
				userId: null,
				userVersion: null,
				isBootstrapping: false,
				hasBootstrapped: true,
			});
			try {
				localStorage.removeItem('auth-user');
			} catch (error) {
				console.warn('Failed to clear auth user cache:', error);
			}
			useSchoolStore.getState().clearCache();
			clearSessionScopedClientState();
			await clearSessionSensitiveStorage(
				'logout',
				queuedOfflineLogout
					? { preserveLocalStorageKeys: [OFFLINE_REQUESTS_KEY] }
					: {},
			);
		},

		applyRealtimeEvent,

		checkAuthStatus: async (options) => {
			const now = Date.now();
			const skipConnectivityCheck = options?.skipConnectivityCheck ?? true;
			const force = options?.force === true;
			const trigger = String(options?.trigger || '').trim();
			const requestedAcademicYear = String(options?.academicYear || '').trim();

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
					useNetworkStore.getState().setAuthCheckFailed(false);
					applyBootstrapPayload(data);

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
				set({ isBootstrapping: true });

				if (!get().user) {
					get().hydrateFromCache();
				}

				if (typeof navigator !== 'undefined' && !navigator.onLine) {
					useNetworkStore.getState().markOffline('browser-offline');
					useNetworkStore.getState().setAuthCheckFailed(true);
					// Complete bootstrap with cached state - don't return early
					const cachedUser = get().user;
					if (cachedUser) {
						set({ isBootstrapping: false, hasBootstrapped: true });
					}
					return;
				}

				const authCheckTask = get().checkAuthStatus({
					skipConnectivityCheck: true,
				});
				if (typeof window === 'undefined') {
					await authCheckTask;
					return;
				}

				let timeoutId: number | null = null;
				const result = await Promise.race([
					authCheckTask.then(() => 'done' as const),
					new Promise<'timeout'>((resolve) => {
						timeoutId = window.setTimeout(
							() => resolve('timeout'),
							AUTH_BOOTSTRAP_TIMEOUT_MS,
						);
					}),
				]);
				if (timeoutId !== null) {
					window.clearTimeout(timeoutId);
				}

				if (result === 'timeout') {
					useNetworkStore.getState().setAuthCheckFailed(true);
					void authCheckTask.catch((error) => {
						console.warn(
							'Background auth check failed after bootstrap timeout:',
							error,
						);
					});
				}
			})()
				.catch((error) => {
					console.error('Auth bootstrap failed:', error);
				})
				.finally(() => {
					set({ isBootstrapping: false, hasBootstrapped: true });
					authBootstrapPromise = null;
				});

			await authBootstrapPromise;
		},

		clearError: () => set({ error: null }),

		resetOtpState: () =>
			set({
				sessionId: null,
				isAwaitingOtp: false,
				otpContact: null,
				error: null,
				userId: null,
			}),

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
