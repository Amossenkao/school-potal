import { create } from 'zustand';
import { User } from '@/types';
// import { getCookie } from '@/utils/';

interface LoginData {
	role: string;
	username: string;
	password: string;
	position?: string;
}

// export const demoUser = {
// 	firstName: 'Amos',
// 	lastName: 'Senkao',
// 	role: 'system_admin',
// 	userId: 'SYS2025001',
// 	username: 'amos.senkao',
// 	gender: 'male',
// 	address: 'Logan Town',
// 	phone: '0776949463',
// 	isActive: true,
// };

function getCookie(name: string): string | null {
	if (typeof document === 'undefined') return null;

	try {
		const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
		return match ? decodeURIComponent(match[2]) : null;
	} catch (error) {
		console.error('Error reading cookie:', name, error);
		return null;
	}
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
			// TODO: Only for testing without internet
			// set({
			// 	user: demoUser,
			// 	isLoggedIn: false,
			// 	error: error,
			// 	isLoading: false,
			// 	sessionId: null,
			// 	isAwaitingOtp: false,
			// 	otpContact: null,
			// 	userId: null,
			// });
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
			// Check if user is authenticated via session cookie
			//set({ user: demoUser, isLoggedIn: true }); // TODO: Only for testing without internet
			//return;
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
}));

export default useAuth;
