'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
	Eye,
	EyeOff,
	User,
	Lock,
	Shield,
	BookOpen,
	GraduationCap,
	Users,
	Loader2,
	ChevronLeft,
	RefreshCcw,
	Clock,
	AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';
import { useNetworkStore } from '@/store/networkStore';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/common/ThemeToggleButton';
import Script from 'next/script';

const hasCachedAuthUser = () => {
	if (typeof window === 'undefined') return false;
	try {
		return Boolean(localStorage.getItem('auth-user'));
	} catch (error) {
		console.warn('Unable to read auth cache:', error);
		return false;
	}
};

type TurnstileRenderOptions = {
	sitekey: string;
	theme?: 'light' | 'dark' | 'auto';
	size?: 'normal' | 'compact' | 'flexible';
	execution?: 'render' | 'execute';
	appearance?: 'always' | 'execute' | 'interaction-only';
	callback?: (token: string) => void;
	'error-callback'?: () => void;
	'expired-callback'?: () => void;
	'timeout-callback'?: () => void;
};

type TurnstileApi = {
	render: (
		container: string | HTMLElement,
		options: TurnstileRenderOptions,
	) => string;
	execute: (widgetId: string) => void;
	reset: (widgetId: string) => void;
	remove: (widgetId: string) => void;
};

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

const LoginPage = () => {
	const router = useRouter();
	const [selectedRole, setSelectedRole] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [adminPosition, setAdminPosition] = useState('');
	const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
	const [isInitializing, setIsInitializing] = useState(true);
	const [isRedirecting, setIsRedirecting] = useState(false);
	const [redirectTimedOut, setRedirectTimedOut] = useState(false);
	const currentSchool = useSchoolStore((state) => state.school);
	const [loginDisabledError, setLoginDisabledError] = useState('');
	const [offlineError, setOfflineError] = useState('');
	const usernameInputRef = useRef<HTMLInputElement>(null);
	const turnstileContainerRef = useRef<HTMLDivElement>(null);
	const turnstileWidgetIdRef = useRef<string | null>(null);
	const turnstileResolveRef = useRef<((token: string) => void) | null>(null);
	const turnstileRejectRef = useRef<((error: Error) => void) | null>(null);
	const [isTurnstileReady, setIsTurnstileReady] = useState(false);
	const [isVerifyingTurnstile, setIsVerifyingTurnstile] = useState(false);
	const turnstileSiteKey =
		process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || '';
	const { isOnline } = useNetworkStore();
	const previousOnline = useRef(isOnline);

	const {
		isLoading,
		isLoggedIn,
		user,
		error, // Auth error (e.g., "Invalid username or password")
		isAwaitingOtp,
		otpContact,
		login,
		verifyOtp,
		clearError,
		checkAuthStatus,
		hydrateFromCache,
	} = useAuth();

	const [formData, setFormData] = useState({
		username: '',
		password: '',
		otp: '',
	});

	const dismissKeyboardFocus = useCallback(() => {
		if (typeof document === 'undefined') return;
		const activeElement = document.activeElement as HTMLElement | null;
		if (!activeElement) return;
		if (typeof activeElement.blur === 'function') {
			activeElement.blur();
		}
	}, []);

	const navigateToDashboardWithSpinner = useCallback(() => {
		dismissKeyboardFocus();
		setIsRedirecting(true);
		window.requestAnimationFrame(() => {
			router.push('/dashboard');
		});
	}, [router, dismissKeyboardFocus]);

	const rejectPendingTurnstile = useCallback((message: string) => {
		if (turnstileRejectRef.current) {
			turnstileRejectRef.current(new Error(message));
		}
		turnstileResolveRef.current = null;
		turnstileRejectRef.current = null;
	}, []);

	const resetTurnstileWidget = useCallback(() => {
		const widgetId = turnstileWidgetIdRef.current;
		if (!widgetId || typeof window === 'undefined' || !window.turnstile) return;
		window.turnstile.reset(widgetId);
	}, []);

	const ensureTurnstileWidget = useCallback(() => {
		if (!turnstileSiteKey) {
			throw new Error(
				'Login security is not configured. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY.',
			);
		}
		if (typeof window === 'undefined' || !window.turnstile) {
			throw new Error('Security verification is still loading. Please retry.');
		}
		if (!turnstileContainerRef.current) {
			throw new Error('Verification widget is not ready yet. Please retry.');
		}
		if (turnstileWidgetIdRef.current) {
			return turnstileWidgetIdRef.current;
		}

		const widgetId = window.turnstile.render(turnstileContainerRef.current, {
			sitekey: turnstileSiteKey,
			theme: 'auto',
			size: 'normal',
			execution: 'execute',
			appearance: 'execute',
			callback: (token: string) => {
				const resolve = turnstileResolveRef.current;
				turnstileResolveRef.current = null;
				turnstileRejectRef.current = null;
				setIsVerifyingTurnstile(false);
				if (resolve) {
					resolve(token);
				}
			},
			'error-callback': () => {
				setIsVerifyingTurnstile(false);
				rejectPendingTurnstile('Security verification failed. Please try again.');
				resetTurnstileWidget();
			},
			'expired-callback': () => {
				setIsVerifyingTurnstile(false);
				rejectPendingTurnstile(
					'Security verification expired. Please verify again.',
				);
				resetTurnstileWidget();
			},
			'timeout-callback': () => {
				setIsVerifyingTurnstile(false);
				rejectPendingTurnstile(
					'Security verification timed out. Please verify again.',
				);
				resetTurnstileWidget();
			},
		});

		turnstileWidgetIdRef.current = widgetId;
		return widgetId;
	}, [
		rejectPendingTurnstile,
		resetTurnstileWidget,
		turnstileSiteKey,
	]);

	const executeTurnstileVerification = useCallback(async () => {
		if (!isTurnstileReady) {
			throw new Error('Security verification is loading. Please wait a moment.');
		}

		const widgetId = ensureTurnstileWidget();
		setIsVerifyingTurnstile(true);

		return await new Promise<string>((resolve, reject) => {
			turnstileResolveRef.current = resolve;
			turnstileRejectRef.current = reject;
			try {
				window.turnstile?.execute(widgetId);
			} catch (error) {
				setIsVerifyingTurnstile(false);
				turnstileResolveRef.current = null;
				turnstileRejectRef.current = null;
				reject(error instanceof Error ? error : new Error('Verification failed.'));
			}
		});
	}, [ensureTurnstileWidget, isTurnstileReady]);

	// Bootstrap from local storage first, then verify session in background.
	useEffect(() => {
		let cancelled = false;

		if (hasCachedAuthUser()) {
			hydrateFromCache();
		}
		if (!cancelled) {
			setIsInitializing(false);
		}

		const runBackgroundAuthCheck = async () => {
			try {
				await checkAuthStatus();
			} catch (error) {
				console.warn('Background auth verification failed:', error);
			}
		};
		void runBackgroundAuthCheck();

		return () => {
			cancelled = true;
		};
	}, [checkAuthStatus, hydrateFromCache]);

	// Re-check auth when coming back online
	useEffect(() => {
		if (!previousOnline.current && isOnline) {
			checkAuthStatus();
		}
		previousOnline.current = isOnline;
	}, [isOnline, checkAuthStatus]);

	useEffect(() => {
		const canShowLoginForm =
			selectedRole &&
			(selectedRole !== 'administrator' || Boolean(adminPosition)) &&
			!isAwaitingOtp;
		if (!canShowLoginForm || !isTurnstileReady || !turnstileSiteKey) return;
		try {
			ensureTurnstileWidget();
		} catch {
			// Widget can still be created on submit retry.
		}
	}, [
		selectedRole,
		adminPosition,
		isAwaitingOtp,
		isTurnstileReady,
		turnstileSiteKey,
		ensureTurnstileWidget,
	]);

	useEffect(() => {
		return () => {
			rejectPendingTurnstile('Security verification was cancelled.');
			if (
				typeof window !== 'undefined' &&
				window.turnstile &&
				turnstileWidgetIdRef.current
			) {
				window.turnstile.remove(turnstileWidgetIdRef.current);
			}
			turnstileWidgetIdRef.current = null;
		};
	}, [rejectPendingTurnstile]);

	// Redirect if logged in
	useEffect(() => {
		if (
			!isInitializing &&
			!isLoading &&
			user?.isActive &&
			isLoggedIn &&
			!isAwaitingOtp &&
			!isRedirecting
		) {
			navigateToDashboardWithSpinner();
		}
	}, [
		isInitializing,
		isLoading,
		user,
		isLoggedIn,
		isAwaitingOtp,
		isRedirecting,
		navigateToDashboardWithSpinner,
	]);

	// Prevent redirect loading from hanging forever if navigation stalls.
	useEffect(() => {
		if (!isRedirecting) {
			setRedirectTimedOut(false);
			return;
		}
		const timer = window.setTimeout(() => {
			setRedirectTimedOut(true);
			setIsRedirecting(false);
		}, 8000);
		return () => window.clearTimeout(timer);
	}, [isRedirecting]);

	/**
	 * Reset credentials only when login context changes (role/position).
	 * Do not tie this to school-profile updates; auth polling can update
	 * school payloads on 401 and should not wipe typed form values.
	 */
	useEffect(() => {
		clearError();
		setLoginDisabledError('');
		setFormData({ username: '', password: '', otp: '' });
	}, [selectedRole, adminPosition, clearError]);

	// Evaluate school-configured login access without resetting credentials.
	useEffect(() => {
		setLoginDisabledError('');
		if (!selectedRole || selectedRole === 'system_admin') return;
		if (!currentSchool?.settings) return;
		const roleSettingsKey = `${selectedRole}Settings`;
		const roleSettings = (currentSchool.settings as any)[roleSettingsKey];
		if (roleSettings && roleSettings.loginAccess === false) {
			setLoginDisabledError(`Login is currently disabled for ${selectedRole}s.`);
		}
	}, [selectedRole, currentSchool]);

	useEffect(() => {
		if (!selectedRole) return;
		if (selectedRole === 'administrator' && !adminPosition) return;
		if (isAwaitingOtp) return;
		if (isRedirecting) return;
		if (user?.isActive && isLoggedIn) return;
		if (isLoading || loginDisabledError) return;
		requestAnimationFrame(() => {
			usernameInputRef.current?.focus();
		});
	}, [
		selectedRole,
		adminPosition,
		isAwaitingOtp,
		isRedirecting,
		isLoading,
		loginDisabledError,
		user,
		isLoggedIn,
	]);

	const roles = [
		{
			value: 'student',
			label: 'Student/Parent',
			icon: GraduationCap,
			color: 'bg-blue-500',
		},
		{
			value: 'teacher',
			label: 'Teacher',
			icon: BookOpen,
			color: 'bg-green-500',
		},
		{
			value: 'administrator',
			label: 'School Administrator',
			icon: Users,
			color: 'bg-purple-500',
		},
		{
			value: 'system_admin',
			label: 'System Admin',
			icon: Shield,
			color: 'bg-red-500',
		},
	];

	const adminPositions = currentSchool?.administrativePositions || [];

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
		// Clear errors immediately when user starts fixing their input
		if (error) clearError();
		if (loginDisabledError) setLoginDisabledError('');
		if (offlineError) setOfflineError('');
	};

	const handleLoginSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (loginDisabledError) return;
		if (!isOnline) {
			setOfflineError(
				"You are offline. Please connect to the internet and try again."
			);
			return;
		}
		setOfflineError('');

		let turnstileToken = '';
		try {
			turnstileToken = await executeTurnstileVerification();
		} catch (verificationError) {
			const message =
				verificationError instanceof Error
					? verificationError.message
					: 'Security verification failed. Please try again.';
			setOfflineError(message);
			return;
		}

		const loginData = {
			role: selectedRole,
			username: formData.username,
			password: formData.password,
			turnstileToken,
			...(selectedRole === 'administrator' && { position: adminPosition }),
		};

		const loggedInUser = await login(loginData);
		if (loggedInUser) {
			if (
				loggedInUser.role !== 'system_admin' &&
				loggedInUser.mustChangePassword
			) {
				dismissKeyboardFocus();
				router.push('/login/account-setup');
			} else {
				navigateToDashboardWithSpinner();
			}
		} else {
			resetTurnstileWidget();
		}
	};

	const isBootstrappingSession = isInitializing && !isRedirecting;
	if (isBootstrappingSession) {
		return <PageLoading variant="school" message="Loading..." />;
	}

	return (
		<>
			<Script
				src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
				strategy="afterInteractive"
				onLoad={() => {
					setIsTurnstileReady(true);
					setOfflineError('');
				}}
				onError={() => {
					setIsTurnstileReady(false);
					setOfflineError(
						'Security verification failed to load. Refresh and try again.',
					);
				}}
			/>
			{isRedirecting && (
				<PageLoading variant="school" message="Opening dashboard..." />
			)}
			<div className="absolute top-3 right-5">
				<ThemeToggleButton />
			</div>
			<div className="min-h-screen bg-background flex flex-col">
				<div className="flex-grow max-w-6xl mx-auto px-4 py-8 w-full">
					{/* Header */}
					<div className="text-center mb-12">
						<Link href="/">
							<div className="w-24 h-24 mx-auto mb-6">
								{currentSchool?.logoUrl && (
									<img
										src={currentSchool.logoUrl}
										alt="Logo"
										className="w-full h-full object-contain"
									/>
								)}
							</div>
						</Link>
						<h1 className="text-3xl font-bold text-foreground">
							{currentSchool?.shortName || 'School'} e-Portal System
						</h1>
						<p className="text-muted-foreground mt-2">
							{currentSchool?.tagline || 'Excellence in Education'}
						</p>
					</div>

						<div className="max-w-4xl mx-auto">
							{redirectTimedOut && (
								<div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
									Login redirect took too long. You can continue here or try
									again.
									<button
										type="button"
										onClick={() => {
											setRedirectTimedOut(false);
											if (user?.isActive && isLoggedIn && !isAwaitingOtp) {
												navigateToDashboardWithSpinner();
											} else {
												void checkAuthStatus();
											}
										}}
										className="ml-3 rounded border border-amber-500 px-3 py-1 text-sm font-medium hover:bg-amber-100"
									>
										Retry
									</button>
								</div>
							)}
							{!selectedRole ? (
							/* Step 1: Role Selection */
							<div className="bg-card rounded-2xl shadow-lg border border-border p-8 animate-in fade-in duration-500">
								<h2 className="text-2xl font-semibold text-center mb-8">
									Choose Your Role
								</h2>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
									{roles.map((role) => (
										<button
											key={role.value}
											onClick={() => setSelectedRole(role.value)}
											className="p-6 border-2 border-border rounded-xl hover:border-primary hover:bg-accent transition-all flex flex-col items-center space-y-4 group"
										>
											<div
												className={`w-16 h-16 ${role.color} rounded-xl flex items-center justify-center`}
											>
												<role.icon className="w-8 h-8 text-white" />
											</div>
											<span className="font-medium">{role.label}</span>
										</button>
									))}
								</div>
							</div>
						) : (
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
								{/* Left Sidebar */}
								<div className="lg:col-span-1">
									<div className="bg-card rounded-2xl shadow-lg border border-border p-6 sticky top-8 space-y-4">
										<h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
											Your Selection
										</h3>
										<div className="space-y-3">
											<div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
												{React.createElement(
													roles.find((r) => r.value === selectedRole)?.icon ||
														User,
													{
														className: `w-8 h-8 ${roles.find((r) => r.value === selectedRole)?.color} p-1.5 rounded-lg text-white`,
													},
												)}
												<div>
													<p className="text-[10px] uppercase text-muted-foreground">
														Role
													</p>
													<p className="font-bold text-sm">
														{roles.find((r) => r.value === selectedRole)?.label}
													</p>
												</div>
											</div>
											{selectedRole === 'administrator' && adminPosition && (
												<div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg animate-in slide-in-from-left-2">
													<Shield className="w-5 h-5 text-primary" />
													<div>
														<p className="text-[10px] uppercase text-primary font-bold">
															Position
														</p>
														<p className="font-bold text-sm">
															{
																adminPositions.find(
																	(p) => p.id === adminPosition,
																)?.name
															}
														</p>
													</div>
												</div>
											)}
										</div>
										<div className="pt-4 space-y-2 border-t border-border">
											{selectedRole === 'administrator' && adminPosition && (
												<button
													onClick={() => setAdminPosition('')}
													className="w-full flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
												>
													<RefreshCcw className="w-3 h-3" /> Change Position
												</button>
											)}
											<button
												onClick={() => setSelectedRole('')}
												className="w-full flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg border border-border hover:bg-accent transition-colors"
											>
												<ChevronLeft className="w-3 h-3" /> Switch Main Role
											</button>
										</div>
									</div>
								</div>

								{/* Main Content Area */}
								<div className="lg:col-span-2">
									<div className="bg-card rounded-2xl shadow-lg border border-border p-8 min-h-[400px]">
										{/* Authentication Error (Incorrect Credentials) */}
										{error && (
											<div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 animate-in shake-1">
												<AlertCircle className="h-5 w-5 text-destructive" />
												<p className="text-sm text-destructive font-semibold">
													{error}
												</p>
											</div>
										)}
										{offlineError && (
											<div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3 animate-in shake-1">
												<AlertCircle className="h-5 w-5 text-amber-600" />
												<p className="text-sm text-amber-700 font-semibold">
													{offlineError}
												</p>
											</div>
										)}

										{/* System/Role Disabled Error */}
										{loginDisabledError && (
											<div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 animate-in shake-1">
												<Shield className="h-5 w-5 text-destructive" />
												<p className="text-sm text-destructive font-semibold">
													{loginDisabledError}
												</p>
											</div>
										)}

										{/* Step 2: Administrator Position Picker */}
										{selectedRole === 'administrator' &&
											!adminPosition &&
											!loginDisabledError && (
												<div className="animate-in fade-in slide-in-from-right-4">
													<h3 className="text-xl font-bold mb-6">
														Identify Your Office
													</h3>
													<div className="grid grid-cols-1 gap-3">
														{adminPositions.map((pos) => (
															<button
																key={pos.id}
																onClick={() => setAdminPosition(pos.id)}
																className="text-left p-4 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all flex justify-between items-center group"
															>
																<span className="font-medium group-hover:text-primary">
																	{pos.name}
																</span>
																<ChevronLeft className="w-4 h-4 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
															</button>
														))}
													</div>
												</div>
											)}

										{/* Step 3: Input Form */}
										{(selectedRole !== 'administrator' || adminPosition) &&
											!isAwaitingOtp && (
												<form
													onSubmit={handleLoginSubmit}
													className="space-y-6 animate-in fade-in"
												>
													<div className="mb-2">
														<h3 className="text-xl font-bold">Sign In</h3>
														<p className="text-sm text-muted-foreground">
															Enter your portal credentials below.
														</p>
													</div>
													<div className="space-y-4">
														<div className="space-y-1.5">
															<label className="text-sm font-medium">
																Username
															</label>
															<div className="relative">
																<User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
																<input
																	type="text"
																	name="username"
																	value={formData.username}
																	onChange={handleInputChange}
																	disabled={isLoading || !!loginDisabledError}
																	ref={usernameInputRef}
																	className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
																	placeholder="Enter your username"
																	required
																/>
															</div>
														</div>
														<div className="space-y-1.5">
															<label className="text-sm font-medium">
																Password
															</label>
															<div className="relative">
																<Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
																<input
																	type={showPassword ? 'text' : 'password'}
																	name="password"
																	value={formData.password}
																	onChange={handleInputChange}
																	disabled={isLoading || !!loginDisabledError}
																	className="w-full pl-10 pr-12 py-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
																	placeholder="••••••••"
																	required
																/>
																<button
																	type="button"
																	onClick={() => setShowPassword(!showPassword)}
																	className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
																>
																	{showPassword ? (
																		<EyeOff className="w-4 h-4" />
																	) : (
																		<Eye className="w-4 h-4" />
																	)}
																</button>
															</div>
														</div>
													</div>
													<button
														type="submit"
														disabled={
															isLoading ||
															isVerifyingTurnstile ||
															!!loginDisabledError ||
															!formData.username ||
															!formData.password
														}
														className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
													>
														{isVerifyingTurnstile ? (
															<>
																<Loader2 className="w-5 h-5 animate-spin mr-2" />
																Verifying...
															</>
														) : isLoading ? (
															<Loader2 className="w-5 h-5 animate-spin mr-2" />
														) : (
															'Access e-Portal'
														)}
													</button>
													<div
														className={`overflow-hidden transition-all duration-300 ${
															isVerifyingTurnstile
																? 'max-h-24 opacity-100'
																: 'max-h-0 opacity-0'
														}`}
													>
														<div className="pt-3 flex justify-center">
															<div ref={turnstileContainerRef} />
														</div>
													</div>
													<div className="text-center">
														<button
															type="button"
															onClick={() => setShowForgotPasswordModal(true)}
															className="text-sm text-primary font-medium hover:underline"
														>
															Forgot your credentials?
														</button>
													</div>
												</form>
											)}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<footer className="w-full py-8 mt-auto border-t border-border bg-card/50">
					<div className="max-w-6xl mx-auto px-4 text-center">
						<p className="text-sm text-muted-foreground">
							&copy; {new Date().getFullYear()}{' '}
							{currentSchool?.name || 'Upstairs Christian Academy'}. All Rights
							Reserved.
						</p>
						<p className="text-[10px] text-muted-foreground/60 mt-1">
							Powered by SMS e-Portal v2.4.0
						</p>
					</div>
				</footer>
			</div>

			{/* Recovery Modal */}
			{showForgotPasswordModal && (
				<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
					<div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-8 relative border border-border">
						<button
							onClick={() => setShowForgotPasswordModal(false)}
							className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-2xl font-bold transition-colors"
						>
							×
						</button>
						<div className="text-center">
							<div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
								<Shield className="w-8 h-8 text-primary" />
							</div>
							<h3 className="text-xl font-bold mb-4">Account Recovery</h3>
							<p className="text-muted-foreground mb-6 text-sm">
								{selectedRole === 'system_admin'
									? 'Please contact the system development team for root access recovery.'
									: "Please reach out to your school's administrator to initiate a password reset."}
							</p>

							<div className="bg-muted p-4 rounded-xl text-left text-sm space-y-2 border border-border">
								{selectedRole === 'system_admin' ? (
									<div className="flex flex-col gap-2">
										<div className="flex justify-between border-b border-border/50 pb-2 text-foreground">
											<span className="text-muted-foreground">Developer:</span>
											<span className="font-semibold text-sm">Amos Senkao</span>
										</div>
										<div className="flex justify-between border-b border-border/50 pb-2 text-foreground">
											<span className="text-muted-foreground">Phone:</span>
											<span className="font-semibold text-sm">0776-949463</span>
										</div>
										<div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
											<Clock className="w-3 h-3" />
											<span>Support: 8:00 am - 5:00 pm (Mon - Fri)</span>
										</div>
									</div>
								) : (
									<div className="flex flex-col gap-2">
										<div className="flex justify-between border-b border-border/50 pb-2 text-foreground">
											<span className="text-muted-foreground">Admin:</span>
											<span className="font-semibold text-sm">
												{currentSchool?.sysAdmin?.name || 'Amos Senkao'}
											</span>
										</div>
										<div className="flex justify-between border-b border-border/50 pb-2 text-foreground">
											<span className="text-muted-foreground">Phone:</span>
											<span className="font-semibold text-sm">
												{currentSchool?.sysAdmin?.phone || '0776 - 949463'}
											</span>
										</div>
									</div>
								)}
							</div>

							<button
								onClick={() => setShowForgotPasswordModal(false)}
								className="w-full mt-6 bg-primary text-primary-foreground py-3 rounded-lg font-bold"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default LoginPage;
