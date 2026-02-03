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
				if (data.academicYear && data.users) {
					useSchoolStore
						.getState()
						.setUsersForYear(data.academicYear, data.users);
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
				if (data.academicYear && data.users) {
					useSchoolStore
						.getState()
						.setUsersForYear(data.academicYear, data.users);
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
			useSchoolStore.getState().clearCache();
			useBootstrapStore.getState().clearBootstrap();
		},

		// MODIFIED: Only clear user state if the server explicitly returns no user,
		// or if a true network error occurs, set authCheckFailed flag.
		checkAuthStatus: async () => {
			const { setAuthCheckFailed } = useNetworkStore.getState();

			try {
				const res = await fetch('/api/auth/me', {
					method: 'GET',
					credentials: 'include',
				});

				// We throw here for a non-401/200, but rely on the subsequent logic for a 401 (logged out)
				if (!res.ok && res.status !== 401) {
					throw new Error(`Server status ${res.status}`);
				}

				const data = await res.json().catch(() => ({}));

				console.log('Auth status:', data);

				// Auth check succeeded, clear network failure flag
				setAuthCheckFailed(false);

				if (
					data.school &&
					!isEqual(data.school, useSchoolStore.getState().school)
				) {
					useSchoolStore.getState().setSchool(data.school);
				}
				if (data.academicYear && data.users) {
					useSchoolStore
						.getState()
						.setUsersForYear(data.academicYear, data.users);
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

				if (data.user) {
					// Server confirms user is logged in
					if (!isEqual(data.user, get().user)) {
						set({ user: data.user, isLoggedIn: true });
					} else if (!get().isLoggedIn) {
						set({ isLoggedIn: true });
					}

				} else {
					// Server explicitly says the user is NOT logged in (e.g., 401/200 with null user)
					if (get().isLoggedIn) {
						set({ user: null, isLoggedIn: false });
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
			}
		},
	};
});

export default useAuth;
