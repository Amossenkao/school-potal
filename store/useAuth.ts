// authStore.ts
import { create } from 'zustand';
import { isEqual } from 'lodash';
import { User } from '@/types';
import { useSchoolStore } from './schoolStore';
import { useNetworkStore } from './networkStore';
import { clearClientCacheByPrefixes } from '@/utils/clientCache';
import { useOfflineNavigationStore } from './offlineNavigationStore';
import { clearUserSessionDataCaches } from '@/utils/sessionPrivacy';

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

	sessionId: string | null;
	isAwaitingOtp: boolean;
	otpContact: string | null;
	userId: string | null;

	login: (loginData: LoginData) => Promise<User | null>;
	verifyOtp: (otp: string) => Promise<boolean>;
	resendOtp: () => Promise<boolean>;
	logout: () => Promise<void>;
	checkAuthStatus: () => Promise<void>;

	clearError: () => void;
	resetOtpState: () => void;
	setUser: (user: User | null) => void;
	hydrateFromCache: () => void;
}

const useAuth = create<AuthState>((set, get) => {
	const OFFLINE_REQUESTS_KEY = 'school_portal_offline_requests';

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

	const clearSessionScopedClientState = () => {
		clearClientCacheByPrefixes(['periodic:', 'semester:', 'yearly:']);
		useOfflineNavigationStore.getState().clearOfflinePath();
	};

	const clearSessionSensitiveStorage = async () => {
		await clearUserSessionDataCaches();
	};

	const setDashboardStartPath = () => {
		useOfflineNavigationStore.getState().setOfflinePath('/dashboard');
	};

	const resolveIdentity = (user: User | null | undefined) => {
		if (!user) return '';
		const extraFields = user as User & { _id?: string; studentId?: string };
		return String(user.id || extraFields._id || extraFields.studentId || '');
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
			const currentUsers = schoolStore.usersByAcademicYear[academicYear];
			const role = data?.user?.role || get().user?.role;
			const shouldReplace =
				role === 'student' || role === 'teacher'
					? !isEqual(currentUsers, data.users)
					: false;
			schoolStore.setUsersForYear(
				academicYear,
				data.users,
				shouldReplace ? { merge: false } : undefined,
			);
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
			const currentGrades = schoolStore.gradesByAcademicYear?.[academicYear] || [];
			if (!isEqual(currentGrades, data.grades)) {
				schoolStore.setGradesForYear(academicYear, data.grades);
			}
		}

		if (academicYear && Array.isArray(data?.gradeRequests)) {
			schoolStore.setGradeRequestsForYear(academicYear, data.gradeRequests);
		}

		if (typeof versions.user === 'string') {
			set({ userVersion: versions.user });
		}
	};

	return {
		user: null,
		isLoggedIn: false,
		error: null,
		isLoading: false,
		userVersion: null,

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

				const data = await res.json();

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
					});
					return null;
				}

				await clearSessionSensitiveStorage();
				applyBootstrapPayload(data);

				set({
					user: data.user,
					isLoggedIn: true,
					isLoading: false,
					sessionId: null,
					isAwaitingOtp: false,
					otpContact: null,
					userId: null,
					error: null,
				});
				clearSessionScopedClientState();
				setDashboardStartPath();
				try {
					localStorage.setItem('auth-user', JSON.stringify(data.user));
				} catch (error) {
					console.warn('Failed to cache auth user:', error);
				}

				return data.user;
			} catch (error: any) {
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
				const res = await fetch('/api/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						sessionId,
						otp,
						action: 'verify_otp',
						userId,
					}),
				});

				const data = await res.json();

				if (!res.ok) {
					set({ error: data.message || 'Invalid OTP', isLoading: false });
					return false;
				}

				await clearSessionSensitiveStorage();
				applyBootstrapPayload(data);

				set({
					user: data.user,
					isLoggedIn: true,
					isLoading: false,
					sessionId: null,
					isAwaitingOtp: false,
					otpContact: null,
					userId: null,
					error: null,
				});
				clearSessionScopedClientState();
				setDashboardStartPath();
				try {
					localStorage.setItem('auth-user', JSON.stringify(data.user));
				} catch (error) {
					console.warn('Failed to cache auth user:', error);
				}

				return true;
			} catch (error: any) {
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
				const res = await fetch('/api/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ sessionId, action: 'resend_otp' }),
				});

				const data = await res.json();

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
				set({
					error: error.message || 'Failed to resend OTP',
					isLoading: false,
				});
				return false;
			}
		},

		logout: async () => {
			set({ isLoading: true });
			const networkState = useNetworkStore.getState();
			const navigatorOnline =
				typeof navigator !== 'undefined' ? navigator.onLine : true;
			const isOnline = networkState.isOnline && navigatorOnline;
			try {
				if (isOnline) {
					const controller = new AbortController();
					const timeoutId = window.setTimeout(() => controller.abort(), 7000);
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
					enqueueOfflineRequest({
						url: '/api/auth/login',
						method: 'DELETE',
						credentials: 'include',
					});
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
				}
			} catch (error) {
				console.warn('Logout request failed:', error);
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
			});
			try {
				localStorage.removeItem('auth-user');
			} catch (error) {
				console.warn('Failed to clear auth user cache:', error);
			}
			useSchoolStore.getState().clearCache();
			clearSessionScopedClientState();
			await clearSessionSensitiveStorage();
		},

		checkAuthStatus: async () => {
			const networkState = useNetworkStore.getState();
			const { setAuthCheckFailed } = networkState;
			const navigatorOnline =
				typeof navigator !== 'undefined' ? navigator.onLine : true;
			const isOnline = networkState.isOnline && navigatorOnline;

			if (!isOnline) {
				setAuthCheckFailed(true);
				if (!get().user) {
					get().hydrateFromCache();
				}
				return;
			}

			try {
				const schoolState = useSchoolStore.getState();
				const activeYear = schoolState.school?.currentAcademicYear;
				const query = new URLSearchParams();
				const usersVersion =
					activeYear != null
						? schoolState.usersVersionByAcademicYear?.[activeYear]
						: null;
				const gradesVersion =
					activeYear != null
						? schoolState.gradesVersionByAcademicYear?.[activeYear]
						: null;
				const calendarVersion =
					activeYear != null
						? schoolState.calendarVersionByAcademicYear?.[activeYear]
						: null;
				const schedulesVersion =
					activeYear != null
						? schoolState.schedulesVersionByAcademicYear?.[activeYear]
						: null;
				const gradeRequestsVersion =
					activeYear != null
						? schoolState.gradeRequestsVersionByAcademicYear?.[activeYear]
						: null;

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
				const timeoutId = window.setTimeout(() => controller.abort(), 7000);
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

				const stillOnline =
					(typeof navigator !== 'undefined' ? navigator.onLine : true) &&
					useNetworkStore.getState().isOnline;

				if (!stillOnline) {
					setAuthCheckFailed(true);
					return;
				}

				setAuthCheckFailed(false);
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
					await clearSessionSensitiveStorage();
				}
			} catch (error) {
				console.error('Auth check failed (network/server error):', error);
				setAuthCheckFailed(true);
			}
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
				set({ user });
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
					set({ user: parsed, isLoggedIn: true });
				}
			} catch (error) {
				console.warn('Failed to hydrate auth user:', error);
			}
		},
	};
});

export default useAuth;
