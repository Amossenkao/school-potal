'use client';
import React, { useState, useEffect } from 'react';
import {
	Eye,
	EyeOff,
	User,
	Lock,
	Shield,
	BookOpen,
	GraduationCap,
	Users,
	Settings,
	Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';
// import NavBar from '@/components/sections/NavBar';
import { useSchoolStore } from '@/store/schoolStore';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/common/ThemeToggleButton';
import AccessDenied from '@/components/AccessDenied';

const LoginPage = () => {
	const router = useRouter();
	const [selectedRole, setSelectedRole] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [adminPosition, setAdminPosition] = useState('');
	const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
	const [isInitializing, setIsInitializing] = useState(true);
	const [isRedirecting, setIsRedirecting] = useState(false);
	const currentSchool = useSchoolStore((state) => state.school);
	const [loginDisabledError, setLoginDisabledError] = useState('');

	const {
		isLoading,
		isLoggedIn,
		user,
		error,
		isAwaitingOtp,
		otpContact,
		login,
		verifyOtp,
		resendOtp,
		clearError,
		resetOtpState,
		checkAuthStatus,
	} = useAuth();

	const [formData, setFormData] = useState({
		username: '',
		password: '',
		otp: '',
	});

	// Check auth status on mount, then load page
	useEffect(() => {
		let cancelled = false;
		const init = async () => {
			try {
				await checkAuthStatus();
			} finally {
				if (!cancelled) setIsInitializing(false);
			}
		};
		init();
		return () => {
			cancelled = true;
		};
	}, [checkAuthStatus]);

	// If already logged in, redirect immediately (unless handling OTP)
	useEffect(() => {
		if (
			!isInitializing &&
			!isLoading &&
			user &&
			user.isActive &&
			isLoggedIn &&
			!isAwaitingOtp &&
			!isRedirecting
		) {
			setIsRedirecting(true);
			router.push('/dashboard');
		}
	}, [
		isInitializing,
		isLoading,
		user,
		isLoggedIn,
		isAwaitingOtp,
		router,
		isRedirecting,
	]);

	// Show loading while initializing (school data is handled by SchoolProvider)
	if (
		isInitializing ||
		isRedirecting ||
		(isLoggedIn && user && user.isActive && !isAwaitingOtp)
	) {
		return <PageLoading variant="school" />;
	}

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

	const adminPositions = [
		'principal',
		'vpa',
		'vpi',
		'registrar',
		'supervisor',
		'proprietor',
		'secretary',
		'dean',
		'cashier',
	];

	const positionLabels = {
		proprietor: 'Proprietor',
		principal: 'Principal',
		supervisor: 'Supervisor',
		vpa: 'Vice Principal for Academic Affairs',
		dean: 'Dean of Students',
		vpi: 'Vicp Principal for Instruction',
		secretary: 'Secretary',
		registrar: 'Registrar',
		cashier: 'Cashier',
	};

	const handleInputChange = (e: any) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
		if (error) clearError();
		if (loginDisabledError) setLoginDisabledError('');
	};

	const handleLogin = async (e: any) => {
		e.preventDefault();
		if (!formData.username || !formData.password) return;
		if (selectedRole === 'administrator' && !adminPosition) return;

		clearError();
		setLoginDisabledError('');

		// Check if login is disabled for the selected role in school settings
		if (selectedRole !== 'system_admin' && currentSchool?.settings) {
			const roleSettingsKey = `${selectedRole}Settings`;
			const roleSettings = currentSchool.settings[roleSettingsKey];

			if (roleSettings && roleSettings.loginAccess === false) {
				setLoginDisabledError(
					`Login is currently disabled for ${selectedRole}s.`
				);
				return; // Stop the login process
			}
		}

		const loginData = {
			role: selectedRole,
			username: formData.username,
			password: formData.password,
			...(selectedRole === 'administrator' && { position: adminPosition }),
		};

		try {
			const loggedInUser = await login(loginData);

			if (loggedInUser) {
				if (
					loggedInUser.role !== 'system_admin' &&
					loggedInUser.mustChangePassword
				) {
					router.push('/login/account-setup');
				} else {
					setIsRedirecting(true);
					console.log('Login successful, redirecting to dashboard...');
					router.push('/dashboard');
				}
			}
		} catch (err) {
			setIsRedirecting(false);
			console.error('Invalid username or password', err);
		}
	};

	const handleOtpVerification = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.otp || formData.otp.length !== 6) {
			return;
		}

		clearError();

		try {
			const success = await verifyOtp(formData.otp);

			if (success) {
				console.log('OTP verification successful');
			}
		} catch (err) {
			console.error('OTP verification failed:', err);
		}
	};

	const handleResendOtp = async () => {
		try {
			const success = await resendOtp();
			if (success) {
				setFormData((prev) => ({ ...prev, otp: '' }));
			}
		} catch (err) {
			console.error('Failed to resend OTP:', err);
		}
	};

	const resetForm = () => {
		setSelectedRole('');
		setAdminPosition('');
		setFormData({ username: '', password: '', otp: '' });
		setShowPassword(false);
		resetOtpState();
		clearError();
	};

	const changeRole = () => {
		setSelectedRole('');
		setAdminPosition('');
		clearError();
	};

	const changePosition = () => {
		setAdminPosition('');
		clearError();
	};

	return (
		<>
			<div className="absolute top-3 right-5">
				<ThemeToggleButton />
			</div>
			<div className="min-h-screen bg-background">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					{/* School Logo and Header */}
					<div className="text-center mb-12">
						<Link href={'/'}>
							<div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
								{currentSchool?.logoUrl && (
									<img
										src={currentSchool.logoUrl}
										alt={`${currentSchool?.name || 'School'} Logo`}
										className="w-full h-full object-contain"
										onError={(e) => {
											e.currentTarget.style.display = 'none';
										}}
									/>
								)}
							</div>
						</Link>
						<h1 className="text-4xl font-bold text-foreground mb-4">
							{currentSchool?.shortName || 'School'} e-Portal System
						</h1>
						<p className="text-xl text-muted-foreground mb-8">
							Welcome back! Please login to continue
						</p>
					</div>

					<div className="max-w-4xl mx-auto">
						{!selectedRole ? (
							/* Role Selection */
							<div className="bg-card rounded-2xl shadow-lg border border-border p-8">
								<h2 className="text-2xl font-semibold text-foreground text-center mb-8">
									Choose Your Role
								</h2>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
									{roles.map((role) => {
										const IconComponent = role.icon;
										return (
											<button
												key={role.value}
												onClick={() => setSelectedRole(role.value)}
												className="p-6 border-2 border-border rounded-xl hover:border-primary hover:bg-accent transition-all duration-200 flex flex-col items-center space-y-4 group min-h-[160px] justify-center transform hover:scale-[1.02]"
												disabled={isLoading}
											>
												<div
													className={`w-16 h-16 ${role.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}
												>
													<IconComponent className="w-8 h-8 text-white" />
												</div>
												<span className="text-base font-medium text-foreground group-hover:text-primary text-center leading-tight">
													{role.label}
												</span>
											</button>
										);
									})}
								</div>
							</div>
						) : (
							/* Login Form */
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
								{/* Selected Role Info */}
								<div className="lg:col-span-1">
									<div className="bg-card rounded-2xl shadow-lg border border-border p-6 sticky top-8">
										<h3 className="text-lg font-semibold text-foreground mb-4">
											Login Information
										</h3>
										<div className="space-y-4">
											<div className="flex items-center gap-3">
												{React.createElement(
													roles.find((r) => r.value === selectedRole)?.icon ||
														User,
													{
														className: `w-8 h-8 ${
															roles.find((r) => r.value === selectedRole)?.color
														} p-1.5 rounded-lg text-white`,
													}
												)}
												<div className="flex-1">
													<p className="text-sm text-muted-foreground">Role</p>
													<p className="font-medium text-foreground">
														{roles.find((r) => r.value === selectedRole)?.label}
													</p>
												</div>
											</div>
											{selectedRole === 'administrator' && adminPosition && (
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
														<Settings className="w-4 h-4 text-white" />
													</div>
													<div className="flex-1">
														<p className="text-sm text-muted-foreground">
															Position
														</p>
														<p className="font-medium text-foreground">
															{positionLabels[adminPosition]}
														</p>
													</div>
												</div>
											)}
										</div>
										<div className="mt-6 space-y-2">
											<button
												onClick={changeRole}
												className="w-full text-primary hover:text-primary/80 text-sm font-medium flex items-center justify-center disabled:opacity-50 py-2 px-4 border border-border rounded-lg hover:bg-accent transition-colors"
												disabled={isLoading}
											>
												← Change Role
											</button>
											{selectedRole === 'administrator' && adminPosition && (
												<button
													onClick={changePosition}
													className="w-full text-primary hover:text-primary/80 text-sm font-medium flex items-center justify-center disabled:opacity-50 py-2 px-4 border border-border rounded-lg hover:bg-accent transition-colors"
													disabled={isLoading}
												>
													Change Position
												</button>
											)}
										</div>
									</div>
								</div>

								{/* Main Form */}
								<div className="lg:col-span-2">
									<div className="bg-card rounded-2xl shadow-lg border border-border p-8">
										{error && (
											<div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
												<p className="text-sm text-destructive font-medium">
													{error}
												</p>
											</div>
										)}
										{loginDisabledError && (
											<div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
												<p className="text-sm text-destructive font-medium">
													{loginDisabledError}
												</p>
											</div>
										)}

										{selectedRole === 'administrator' && !adminPosition && (
											<div className="mb-8">
												<h3 className="text-xl font-semibold text-foreground mb-6">
													Select Your Position
												</h3>
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
													{adminPositions.map((position) => (
														<button
															key={position}
															onClick={() => setAdminPosition(position)}
															className="text-left p-4 border border-border rounded-lg hover:border-primary hover:bg-accent transition-colors disabled:opacity-50"
															disabled={isLoading}
														>
															<span className="text-sm font-medium text-foreground">
																{positionLabels[position]}
															</span>
														</button>
													))}
												</div>
											</div>
										)}

										{(selectedRole !== 'administrator' || adminPosition) &&
											!isAwaitingOtp && (
												<>
													<h3 className="text-xl font-semibold text-foreground mb-6">
														Login to Your Account
													</h3>
													<form onSubmit={handleLogin} className="space-y-6">
														<div>
															<label className="block text-sm font-medium text-foreground mb-2">
																Username
															</label>
															<div className="relative">
																<User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
																<input
																	type="text"
																	name="username"
																	value={formData.username}
																	onChange={handleInputChange}
																	className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all bg-background text-foreground disabled:opacity-50"
																	placeholder="Enter your username"
																	autoFocus
																	required
																	disabled={isLoading}
																/>
															</div>
														</div>

														<div>
															<label className="block text-sm font-medium text-foreground mb-2">
																Password
															</label>
															<div className="relative">
																<Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
																<input
																	type={showPassword ? 'text' : 'password'}
																	name="password"
																	value={formData.password}
																	onChange={handleInputChange}
																	className="w-full pl-10 pr-12 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all bg-background text-foreground disabled:opacity-50"
																	placeholder="Enter your password"
																	required
																	disabled={isLoading}
																/>
																<button
																	type="button"
																	onClick={() => setShowPassword(!showPassword)}
																	className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
																	disabled={isLoading}
																>
																	{showPassword ? (
																		<EyeOff className="w-5 h-5" />
																	) : (
																		<Eye className="w-5 h-5" />
																	)}
																</button>
															</div>
														</div>

														<button
															type="submit"
															className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
															disabled={
																isLoading ||
																!formData.username ||
																!formData.password ||
																(selectedRole === 'administrator' &&
																	!adminPosition)
															}
														>
															{isLoading ? (
																<div className="flex items-center">
																	<Loader2 className="w-5 h-5 animate-spin mr-2" />
																	Logging in...
																</div>
															) : (
																'Login to Dashboard'
															)}
														</button>

														<div className="text-center">
															<button
																type="button"
																onClick={() => setShowForgotPasswordModal(true)}
																className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50"
																disabled={isLoading}
															>
																Forgot your password?
															</button>
														</div>
													</form>
												</>
											)}

										{isAwaitingOtp && (
											<>
												<h3 className="text-xl font-semibold text-foreground mb-6">
													Verify Your Identity
												</h3>
												<div className="mb-6 p-4 bg-accent rounded-lg border border-border">
													<p className="text-sm text-foreground">
														<strong>OTP sent to:</strong> {otpContact}
													</p>
													<p className="text-xs text-muted-foreground mt-1">
														Please check your phone or email for the
														verification code
													</p>
												</div>

												<form
													onSubmit={handleOtpVerification}
													className="space-y-6"
												>
													<div>
														<label className="block text-sm font-medium text-foreground mb-2">
															Enter OTP Code
														</label>
														<div className="relative">
															<Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
															<input
																type="text"
																name="otp"
																value={formData.otp}
																onChange={handleInputChange}
																className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all bg-background text-foreground disabled:opacity-50 text-center text-lg tracking-widest"
																placeholder="000000"
																maxLength={6}
																required
																disabled={isLoading}
																autoFocus
															/>
														</div>
													</div>

													<button
														type="submit"
														className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
														disabled={
															isLoading ||
															!formData.otp ||
															formData.otp.length !== 6
														}
													>
														{isLoading ? (
															<div className="flex items-center">
																<Loader2 className="w-5 h-5 animate-spin mr-2" />
																Verifying OTP...
															</div>
														) : (
															'Verify OTP & Login'
														)}
													</button>

													<div className="text-center">
														<button
															type="button"
															onClick={handleResendOtp}
															className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50 flex items-center justify-center mx-auto"
															disabled={isLoading}
														>
															{isLoading ? (
																<div className="flex items-center">
																	<Loader2 className="w-4 w-4 animate-spin mr-1" />
																	Sending...
																</div>
															) : (
																'Resend OTP'
															)}
														</button>
													</div>
												</form>
											</>
										)}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="text-center mt-12 py-6 border-t border-border">
						<p className="text-sm text-muted-foreground">
							©2025 {currentSchool?.name || 'Upstairs Christian Academy'}. All
							Rights Reserved
						</p>
					</div>
				</div>

				{/* Forgot Password Modal */}
				{showForgotPasswordModal && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-300">
						<div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-8 relative border border-border animate-in zoom-in-95 duration-300">
							<button
								onClick={() => setShowForgotPasswordModal(false)}
								className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-2xl font-bold"
							>
								×
							</button>
							<div className="text-center">
								<div className="w-16 h-16 bg-secondary rounded-full mx-auto mb-4 flex items-center justify-center">
									<Lock className="w-8 h-8 text-secondary-foreground" />
								</div>
								<h3 className="text-xl font-bold text-foreground mb-4">
									Password Reset Required
								</h3>
								<p className="text-muted-foreground mb-6 leading-relaxed">
									To reset your password, please contact the school
									administrator. They will be able to help you regain access to
									your account.
								</p>
								<div className="bg-accent border border-border rounded-lg p-4 mb-6">
									<p className="text-sm text-foreground">
										<strong>Contact Information:</strong>
										<br />
										Name: Amos Senkao <br />
										Email: senkao.a@outlook.com
										<br />
										Phone: 0776 - 949463
										<br />
										Office: Upstairs Campus
									</p>
								</div>
								<button
									onClick={() => setShowForgotPasswordModal(false)}
									className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
								>
									Got it
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	);
};

export default LoginPage;
