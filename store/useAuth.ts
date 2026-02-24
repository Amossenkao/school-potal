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

interface LoginData {
	role: string;
	username: string;
	password: string;
	position?: string;
	turnstileToken?: string;
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
	}) => Promise<void>;
	bootstrapAuth: (options?: { force?: boolean }) => Promise<void>;

	clearError: () => void;
	resetOtpState: () => void;
	setUser: (user: User | null) => void;
	hydrateFromCache: () => void;
}

let authCheckPromise: Promise<void> | null = null;
let authBootstrapPromise: Promise<void> | null = null;
let lastAuthCheckCompletedAt = 0;

const AUTH_REQUEST_TIMEOUT_MS = 7000;
const AUTH_LOGIN_TIMEOUT_MS = 9000;
const AUTH_CHECK_DEDUP_MS = 1200;
const AUTH_BOOTSTRAP_TIMEOUT_MS = 10000;
const OFFLINE_REQUEST_MESSAGE =
	'You are offline. Please connect to the internet and try again.';
const REQUEST_TIMEOUT_MESSAGE =
	'The request took too long. Please try again.';
const LOGIN_TIMEOUT_MESSAGE =
	'Login is taking longer than expected. Please try again.';

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
					typeof versions.schedules === 'string'
						? versions.schedules
						: undefined,
			});
		}

		if (academicYear && data?.users) {
			// Bootstrap payload is authoritative for the current year; avoid expensive deep merge/compare.
			schoolStore.setUsersForYear(academicYear, data.users, { merge: false });
		}

		if (academicYear && Array.isArray(data?.calendarEvents)) {
			schoolStore.setCalendarForYear(academicYear, data.calendarEvents);
		}

		if (
			academicYear &&
			data?.schedules &&
			typeof data.schedules === 'object'
		) {
			schoolStore.setSchedulesForYear(academicYear, data.schedules);
		}

		if (academicYear && Array.isArray(data?.grades)) {
			schoolStore.setGradesForYear(academicYear, data.grades);
		}

		if (academicYear && Array.isArray(data?.gradeRequests)) {
			schoolStore.setGradeRequestsForYear(academicYear, data.gradeRequests);
		}

		if (typeof versions.user === 'string') {
			set({ userVersion: versions.user });
		}
	};

	const runDeferredPostLoginBootstrap = (data: any) => {
		if (typeof window === 'undefined') return;
		window.setTimeout(() => {
			void (async () => {
				try {
					clearSessionScopedClientState();
					await clearSessionSensitiveStorage();
					applyBootstrapPayload(data);
					setDashboardStartPath();
					if (data?.user) {
						cacheAuthUser(data.user as User);
					}
				} catch (error) {
					console.warn('Deferred login bootstrap hydration failed:', error);
				}
			})();
		}, 0);
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
				const controller = new AbortController();
				const timeoutId = window.setTimeout(
					() => controller.abort(createTimeoutAbortReason('Login request')),
					AUTH_LOGIN_TIMEOUT_MS,
				);
				const res = await (async () => {
					try {
						return await fetch('/api/auth/login', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							credentials: 'include',
							body: JSON.stringify({ ...loginData, action: 'login' }),
							signal: controller.signal,
						});
					} finally {
						window.clearTimeout(timeoutId);
					}
				})();

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
				applyBootstrapPayload(data);
				setDashboardStartPath();
				cacheAuthUser(data.user as User);
				runDeferredPostLoginBootstrap(data);

				return data.user;
			} catch (error: any) {
				if (isAbortLikeError(error)) {
					set({ error: LOGIN_TIMEOUT_MESSAGE, isLoading: false });
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
						controller.abort(createTimeoutAbortReason('OTP verification request')),
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
					() => controller.abort(createTimeoutAbortReason('OTP resend request')),
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

		checkAuthStatus: async (options) => {
			const now = Date.now();
			const skipConnectivityCheck = options?.skipConnectivityCheck ?? false;
			if (authCheckPromise) {
				return authCheckPromise;
			}
			if (now - lastAuthCheckCompletedAt < AUTH_CHECK_DEDUP_MS) {
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
					timeoutMs: 2800,
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
					const preferredYear = schoolState.school?.currentAcademicYear;
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

					if (!res.ok && res.status !== 401) {
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
						if (get().isLoggedIn) {
							set({ user: null, isLoggedIn: false, userVersion: null });
						}
						try {
							localStorage.removeItem('auth-user');
						} catch (error) {
							console.warn('Failed to clear auth user cache:', error);
						}
						clearSessionScopedClientState();
						await clearSessionSensitiveStorage('logout');
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
			})()
				.finally(() => {
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
				let bootstrapTimedOut = false;
				const bootstrapTimeoutId =
					typeof window !== 'undefined'
						? window.setTimeout(() => {
								bootstrapTimedOut = true;
								useNetworkStore.getState().setAuthCheckFailed(true);
						  }, AUTH_BOOTSTRAP_TIMEOUT_MS)
						: null;

				try {
					if (!get().user) {
						get().hydrateFromCache();
					}

					if (typeof navigator !== 'undefined' && !navigator.onLine) {
						useNetworkStore.getState().markOffline('browser-offline');
						useNetworkStore.getState().setAuthCheckFailed(true);
						return;
					}

					await get().checkAuthStatus({ skipConnectivityCheck: true });
					if (bootstrapTimedOut) {
						return;
					}
				} finally {
					if (bootstrapTimeoutId !== null) {
						window.clearTimeout(bootstrapTimeoutId);
					}
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
