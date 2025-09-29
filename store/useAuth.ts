// authStore.ts
import { create } from 'zustand';
import { isEqual } from 'lodash';
import { User } from '@/types';
import { useSchoolStore } from './schoolStore';

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
		},

		checkAuthStatus: async () => {
			try {
				const res = await fetch('/api/auth/me', {
					method: 'GET',
					credentials: 'include',
				});

				const data = await res.json().catch(() => ({}));

				console.log('Auth status:', data);

				if (
					data.school &&
					!isEqual(data.school, useSchoolStore.getState().school)
				) {
					useSchoolStore.getState().setSchool(data.school);
				}

				if (data.user && !isEqual(data.user, get().user)) {
					set({ user: data.user, isLoggedIn: true });
				}

				if (!data.user && get().isLoggedIn) {
					set({ user: null, isLoggedIn: false });
				}
			} catch (error) {
				console.error('Auth check failed:', error);
				// set({
				// 	user: null,
				// 	isLoggedIn: false,
				// 	sessionId: null,
				// 	isAwaitingOtp: false,
				// 	otpContact: null,
				// 	userId: null,
				// });
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
