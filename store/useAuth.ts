// authStore.ts
import { create } from 'zustand';
import { isEqual } from 'lodash';
import { User } from '@/types';
import { useSchoolStore } from './schoolStore';
import { useNetworkStore } from './networkStore'; // NEW IMPORT

interface LoginData {
	role: string;
	username: string;
	password: string;
	position?: string;
}

interface AuthState {
	user: User | null;
	isLoggedIn: boolean;
	error: string | null;
	isLoading: boolean;

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
	return {
		user: null,
		isLoggedIn: false,
		error: null,
		isLoading: false,

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

				// If API returns a school, set it
				if (data.school !== undefined && data.school !== null) {
					useSchoolStore.getState().setSchool(data.school);
				}
				if (data.academicYear && typeof data.usersVersion === 'number') {
					useSchoolStore
						.getState()
						.setUsersVersionForYear(data.academicYear, data.usersVersion);
				}
				if (data.academicYear && data.users) {
					const schoolState = useSchoolStore.getState();
					const currentUsers = schoolState.usersByAcademicYear[data.academicYear];
					const role = data.user?.role || get().user?.role;
					const shouldReplace =
						role === 'student' || role === 'teacher'
							? !isEqual(currentUsers, data.users)
							: false;

					schoolState.setUsersForYear(
						data.academicYear,
						data.users,
						shouldReplace ? { merge: false } : undefined,
					);
				}
				if (data.academicYear && data.calendarEvents) {
					useSchoolStore
						.getState()
						.setCalendarForYear(data.academicYear, data.calendarEvents);
				}
				if (data.academicYear && data.schedules) {
					useSchoolStore
						.getState()
						.setSchedulesForYear(data.academicYear, data.schedules);
				}
				if (data.academicYear && Array.isArray(data.grades)) {
					const schoolState = useSchoolStore.getState();
					const currentGrades =
						schoolState.gradesByAcademicYear?.[data.academicYear] || [];
					if (!isEqual(currentGrades, data.grades)) {
						schoolState.setGradesForYear(data.academicYear, data.grades);
					}
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
				});
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

				if (data.school !== undefined && data.school !== null) {
					useSchoolStore.getState().setSchool(data.school);
				}
				if (data.academicYear && typeof data.usersVersion === 'number') {
					useSchoolStore
						.getState()
						.setUsersVersionForYear(data.academicYear, data.usersVersion);
				}
				if (data.academicYear && data.users) {
					const schoolState = useSchoolStore.getState();
					const currentUsers = schoolState.usersByAcademicYear[data.academicYear];
					const role = data.user?.role || get().user?.role;
					const shouldReplace =
						role === 'student' || role === 'teacher'
							? !isEqual(currentUsers, data.users)
							: false;

					schoolState.setUsersForYear(
						data.academicYear,
						data.users,
						shouldReplace ? { merge: false } : undefined,
					);
				}
				if (data.academicYear && data.calendarEvents) {
					useSchoolStore
						.getState()
						.setCalendarForYear(data.academicYear, data.calendarEvents);
				}
				if (data.academicYear && data.schedules) {
					useSchoolStore
						.getState()
						.setSchedulesForYear(data.academicYear, data.schedules);
				}
				if (data.academicYear && Array.isArray(data.grades)) {
					const schoolState = useSchoolStore.getState();
					const currentGrades =
						schoolState.gradesByAcademicYear?.[data.academicYear] || [];
					if (!isEqual(currentGrades, data.grades)) {
						schoolState.setGradesForYear(data.academicYear, data.grades);
					}
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
				});
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
			try {
				await fetch('/api/auth/login', {
					method: 'DELETE',
					credentials: 'include',
				});
			} catch (error) {
				console.warn('Logout request failed:', error);
			}

			// Clear client state and clear school explicitly on logout
			set({
				user: null,
				isLoggedIn: false,
				error: null,
				isLoading: false,
				sessionId: null,
				isAwaitingOtp: false,
				otpContact: null,
				userId: null,
			});
			try {
				localStorage.removeItem('auth-user');
			} catch (error) {
				console.warn('Failed to clear auth user cache:', error);
			}
			useSchoolStore.getState().clearCache();
		},

		// MODIFIED: Only clear user state if the server explicitly returns no user,
		// or if a true network error occurs, set authCheckFailed flag.
		checkAuthStatus: async () => {
			const networkState = useNetworkStore.getState();
			const { setAuthCheckFailed } = networkState;
			const navigatorOnline =
				typeof navigator !== 'undefined' ? navigator.onLine : true;
			const isOnline = networkState.isOnline && navigatorOnline;

			if (!isOnline) {
				// Avoid clearing auth when offline; rely on cached user instead.
				setAuthCheckFailed(true);
				if (!get().user) {
					get().hydrateFromCache();
				}
				return;
			}

			try {
				const schoolState = useSchoolStore.getState();
				const activeYear = schoolState.school?.currentAcademicYear;
				const usersVersion =
					activeYear != null
						? schoolState.usersVersionByAcademicYear?.[activeYear]
						: null;
				const query = new URLSearchParams();
				if (typeof usersVersion === 'number') {
					query.set('usersVersion', String(usersVersion));
				}
				const url = query.toString()
					? `/api/auth/me?${query.toString()}`
					: '/api/auth/me';
				const res = await fetch(url, {
					method: 'GET',
					credentials: 'include',
				});

				// We throw here for a non-401/200, but rely on the subsequent logic for a 401 (logged out)
				if (!res.ok && res.status !== 401) {
					throw new Error(`Server status ${res.status}`);
				}

				const data = await res.json().catch(() => ({}));

				console.log('Auth status:', data);

				const stillOnline =
					(typeof navigator !== 'undefined' ? navigator.onLine : true) &&
					useNetworkStore.getState().isOnline;

				if (!stillOnline) {
					// If we lost connectivity mid-flight, keep cached auth state.
					setAuthCheckFailed(true);
					return;
				}

				// Auth check succeeded, clear network failure flag
				setAuthCheckFailed(false);

				if (
					data.school &&
					!isEqual(data.school, useSchoolStore.getState().school)
				) {
					useSchoolStore.getState().setSchool(data.school);
				}
				if (data.academicYear && typeof data.usersVersion === 'number') {
					useSchoolStore
						.getState()
						.setUsersVersionForYear(data.academicYear, data.usersVersion);
				}
				if (data.academicYear && data.users) {
					const schoolState = useSchoolStore.getState();
					const currentUsers = schoolState.usersByAcademicYear[data.academicYear];
					const role = data.user?.role || get().user?.role;
					const shouldReplace =
						role === 'student' || role === 'teacher'
							? !isEqual(currentUsers, data.users)
							: false;

					schoolState.setUsersForYear(
						data.academicYear,
						data.users,
						shouldReplace ? { merge: false } : undefined,
					);
				}
				if (data.academicYear && data.calendarEvents) {
					useSchoolStore
						.getState()
						.setCalendarForYear(data.academicYear, data.calendarEvents);
				}
				if (data.academicYear && data.schedules) {
					useSchoolStore
						.getState()
						.setSchedulesForYear(data.academicYear, data.schedules);
				}
				if (data.academicYear && Array.isArray(data.grades)) {
					const schoolState = useSchoolStore.getState();
					const currentGrades =
						schoolState.gradesByAcademicYear?.[data.academicYear] || [];
					if (!isEqual(currentGrades, data.grades)) {
						schoolState.setGradesForYear(data.academicYear, data.grades);
					}
				}

				if (data.user) {
					// Server confirms user is logged in
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

				} else {
					// Server explicitly says the user is NOT logged in (e.g., 401/200 with null user)
					if (get().isLoggedIn) {
						set({ user: null, isLoggedIn: false });
					}
					try {
						localStorage.removeItem('auth-user');
					} catch (error) {
						console.warn('Failed to clear auth user cache:', error);
					}
				}
			} catch (error) {
				// CATCH: Network error (e.g., fetch failed) or non-401 server error
				console.error('Auth check failed (network/server error):', error);

				// Keep current user state, but set the flag to signal the network issue
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
