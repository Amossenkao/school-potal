import { create } from 'zustand';
import { User } from '@/types';

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

	login: (loginData: LoginData) => Promise<boolean>;
	verifyOtp: (otp: string) => Promise<boolean>;
	resendOtp: () => Promise<boolean>;
	logout: () => Promise<void>;
	checkAuthStatus: () => Promise<void>;
	clearError: () => void;
	resetOtpState: () => void;
	setUser: (user: User) => void; // Add setUser method
}

const useAuth = create<AuthState>((set, get) => ({
	user: null,
	isLoggedIn: false,
	error: null,
	isLoading: false,
	sessionId: null,
	isAwaitingOtp: false,
	otpContact: null,
	userId: null,

	login: async (loginData: LoginData): Promise<boolean> => {
		set({ isLoading: true, error: null });
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include', // Important for cookies
				body: JSON.stringify({ ...loginData, action: 'login' }),
			});

			const data = await res.json();

			if (!res.ok) {
				set({ error: data.message || 'Invalid credentials', isLoading: false });
				return false;
			}

			if (data.requiresOTP) {
				set({
					sessionId: data.sessionId,
					isAwaitingOtp: true,
					otpContact: data.contact,
					isLoading: false,
					userId: data.userId,
				});
				return false;
			}

			// Cookie-based auth: user info comes from server, no localStorage needed
			set({
				user: data.user,
				isLoggedIn: true,
				error: null,
				isLoading: false,
				sessionId: null,
				isAwaitingOtp: false,
				otpContact: null,
				userId: null,
			});

			return true;
		} catch (error: any) {
			set({ error: error.message || 'Network error', isLoading: false });
			return false;
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
				body: JSON.stringify({ sessionId, otp, action: 'verify_otp', userId }),
			});

			const data = await res.json();

			if (!res.ok) {
				set({ error: data.message || 'Invalid OTP', isLoading: false });
				return false;
			}

			// Cookie-based auth: session cookie is set by server
			set({
				user: data.user,
				isLoggedIn: true,
				error: null,
				isLoading: false,
				sessionId: null,
				isAwaitingOtp: false,
				otpContact: null,
				userId: null,
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
				isLoading: false,
				userId: data.userId,
			});
			return true;
		} catch (error: any) {
			set({ error: error.message || 'Failed to resend OTP', isLoading: false });
			return false;
		}
	},

	logout: async () => {
		set({ isLoading: true });
		try {
			// Call logout endpoint to clear session cookie and Redis data
			await fetch('/api/auth/login', {
				method: 'DELETE',
				credentials: 'include',
			});
		} catch (error) {
			console.warn('Logout request failed:', error);
		}

		// Clear client state
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

			if (res.ok) {
				const data = await res.json();
				console.log('User is authenticated:', data);

				if (data.user) {
					set({ user: data.user, isLoggedIn: true });
				} else {
					// No valid session
					set({
						user: null,
						isLoggedIn: false,
						sessionId: null,
						isAwaitingOtp: false,
						otpContact: null,
						userId: null,
					});
				}
			} else {
				// Invalid or expired session
				set({
					user: null,
					isLoggedIn: false,
					sessionId: null,
					isAwaitingOtp: false,
					otpContact: null,
					userId: null,
				});
			}
		} catch (error) {
			console.error('Auth check failed:', error);
			set({
				user: null,
				isLoggedIn: false,
				sessionId: null,
				isAwaitingOtp: false,
				otpContact: null,
				userId: null,
			});
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

	setUser: (user: User) => set({ user }), // Implement setUser method
}));

export default useAuth;
