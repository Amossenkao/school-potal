'use client';

import React, { useEffect, useState } from 'react';
import {
	Eye,
	EyeOff,
	Shield,
	CheckCircle,
	Lock,
	Sparkles,
	Loader2,
	User as UserIcon,
	FileText,
	Camera,
	ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';
import AvatarPicker from '@/app/avatars/page';
import { Button } from '@/components/ui/button';

export default function AccountSetupPage() {
	const router = useRouter();
	const { user, logout, isLoading: authLoading, setUser } = useAuth();
	const [isInitializing, setIsInitializing] = useState(true);
	const [step, setStep] = useState(1);

	// Form state
	const [avatar, setAvatar] = useState(user?.avatar || '');
	const [nickname, setNickname] = useState(user?.nickName || '');
	const [bio, setBio] = useState(user?.bio || '');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	// UI state
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	useEffect(() => {
		if (!authLoading) {
			if (!user || !user.mustChangePassword) {
				router.push('/login');
			}
			setIsInitializing(false);
		}
	}, [authLoading, user, router]);

	const isNewUser = user && user.passwordChangedAt === null;
	const needsProfileUpdate =
		isNewUser && (!user?.avatar || !user?.nickName || !user?.bio);
	const totalSteps = needsProfileUpdate ? 2 : 1;

	const handleNextStep = async () => {
		if (step === 1 && needsProfileUpdate) {
			if (!avatar && !nickname && !bio) {
				setStep(2);
				return;
			}
			setIsLoading(true);
			setError('');
			try {
				const profileData = {
					avatar,
					nickName: nickname,
					bio,
				};
				const response = await fetch('/api/users', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(profileData),
				});
				const data = await response.json();
				if (!response.ok) {
					throw new Error(data.message || 'Failed to update profile.');
				}
				setUser(data.data.user); // Update user in the store
				setStep(2);
			} catch (error: any) {
				setError(error.message);
			} finally {
				setIsLoading(false);
			}
		} else {
			await handleSubmitPassword();
		}
	};

	const passwordsMatch =
		password && confirmPassword && password === confirmPassword;
	const isPasswordValid = password.length >= 8;
	const isNotDefault = user && password !== user.username;
	const canSubmitPassword =
		isPasswordValid && passwordsMatch && isNotDefault && !isLoading;

	const handleSubmitPassword = async () => {
		if (!canSubmitPassword) return;
		setIsLoading(true);
		setError('');
		setSuccess('');
		try {
			const response = await fetch('/api/users', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					oldPassword: user.username,
					newPassword: password,
				}),
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || 'Failed to update password.');
			}
			setSuccess('Account setup complete! Redirecting to dashboard...');
			setUser({ ...user, mustChangePassword: false });
			setTimeout(() => {
				router.push('/dashboard');
			}, 2000);
		} catch (error: any) {
			setError(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	if (isInitializing || authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<PageLoading fullScreen variant="school" />
			</div>
		);
	}

	const renderStepContent = () => {
		if (step === 1 && needsProfileUpdate) {
			return (
				<div className="space-y-6">
					<div className="text-center">
						<h2 className="text-2xl font-bold">Complete Your Profile</h2>
						<p className="text-muted-foreground">
							Let's get your account set up with some personal touches.
						</p>
					</div>
					{!user?.avatar && (
						<div className="flex flex-col items-center">
							<label className="block text-sm font-medium text-foreground mb-2">
								Choose an Avatar
							</label>
							<AvatarPicker
								gender={user?.gender}
								onAvatarSelect={setAvatar}
								initialAvatarUrl={avatar}
							/>
						</div>
					)}
					{!user?.nickName && (
						<div>
							<label
								htmlFor="nickname"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Nickname
							</label>
							<div className="relative">
								<UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
								<input
									id="nickname"
									type="text"
									value={nickname}
									onChange={(e) => setNickname(e.target.value)}
									className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background"
									placeholder="e.g., Alex"
								/>
							</div>
						</div>
					)}
					{!user?.bio && (
						<div>
							<label
								htmlFor="bio"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Bio
							</label>
							<div className="relative">
								<FileText className="absolute left-3 top-3 text-muted-foreground w-5 h-5" />
								<textarea
									id="bio"
									value={bio}
									onChange={(e) => setBio(e.target.value)}
									className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background"
									rows={3}
									placeholder="Tell us a little about yourself..."
								/>
							</div>
						</div>
					)}
				</div>
			);
		}

		return (
			<div className="space-y-6">
				<div className="text-center">
					<h2 className="text-2xl font-bold">Set Your New Password</h2>
					<p className="text-muted-foreground">
						{isNewUser
							? 'Create a strong, unique password to secure your account.'
							: 'Your password was reset by an administrator. Please set a new password to continue.'}
					</p>
				</div>
				{/* New Password Field */}
				<div className="space-y-2">
					<label
						htmlFor="password"
						className="block text-sm font-medium text-foreground"
					>
						New Password
					</label>
					<div className="relative">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-4 py-3 bg-background border border-border rounded-lg"
							placeholder="Enter your new password"
							required
							disabled={isLoading}
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
						>
							{showPassword ? (
								<EyeOff className="w-5 h-5" />
							) : (
								<Eye className="w-5 h-5" />
							)}
						</button>
					</div>
					{password && (
						<div className="flex items-center space-x-2 text-sm">
							{isPasswordValid ? (
								<CheckCircle className="w-4 h-4 text-green-500" />
							) : (
								<div className="w-4 h-4 border-2 border-muted-foreground rounded-full"></div>
							)}
							<span
								className={
									isPasswordValid ? 'text-green-600' : 'text-muted-foreground'
								}
							>
								At least 8 characters
							</span>
						</div>
					)}
				</div>

				{/* Confirm Password Field */}
				<div className="space-y-2">
					<label
						htmlFor="confirmPassword"
						className="block text-sm font-medium text-foreground"
					>
						Confirm Password
					</label>
					<div className="relative">
						<input
							id="confirmPassword"
							type={showConfirmPassword ? 'text' : 'password'}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="w-full px-4 py-3 bg-background border border-border rounded-lg"
							placeholder="Confirm your new password"
							required
							disabled={isLoading}
						/>
						<button
							type="button"
							onClick={() => setShowConfirmPassword(!showConfirmPassword)}
							className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
						>
							{showConfirmPassword ? (
								<EyeOff className="w-5 h-5" />
							) : (
								<Eye className="w-5 h-5" />
							)}
						</button>
					</div>
					{confirmPassword && (
						<div className="flex items-center space-x-2 text-sm">
							{passwordsMatch ? (
								<CheckCircle className="w-4 h-4 text-green-500" />
							) : (
								<div className="w-4 h-4 border-2 border-muted-foreground rounded-full"></div>
							)}
							<span
								className={
									passwordsMatch ? 'text-green-600' : 'text-muted-foreground'
								}
							>
								Passwords match
							</span>
						</div>
					)}
				</div>

				{password && confirmPassword && (
					<div className="flex items-center space-x-2 text-sm">
						{isNotDefault ? (
							<CheckCircle className="w-4 h-4 text-green-500" />
						) : (
							<div className="w-4 h-4 border-2 border-muted-foreground rounded-full"></div>
						)}
						<span
							className={
								isNotDefault ? 'text-green-600' : 'text-muted-foreground'
							}
						>
							Not the same as default password
						</span>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<div className="bg-card rounded-2xl shadow-2xl w-full max-w-md lg:max-w-lg xl:max-w-xl overflow-hidden border border-border">
				<div className="bg-primary px-6 py-6 text-center">
					<div className="w-16 h-16 bg-primary-foreground rounded-full mx-auto mb-4 flex items-center justify-center">
						<Sparkles className="w-8 h-8 text-primary" />
					</div>
					<h1 className="text-2xl font-bold text-primary-foreground mb-2">
						Account Setup
					</h1>
					<p className="text-primary-foreground/80 text-sm">
						Step {needsProfileUpdate ? step : 1} of {totalSteps}
					</p>
				</div>
				<div className="p-6 lg:p-10">
					{success ? (
						<div className="text-center space-y-4">
							<CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
							<h2 className="text-2xl font-bold text-foreground">Success!</h2>
							<p className="text-muted-foreground">{success}</p>
						</div>
					) : (
						<>
							{error && (
								<div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
									<p className="text-sm text-destructive font-medium">
										{error}
									</p>
								</div>
							)}
							{renderStepContent()}
							<div className="mt-8 flex justify-between items-center">
								{step > 1 && (
									<Button variant="outline" onClick={() => setStep(step - 1)}>
										Previous
									</Button>
								)}
								<div className="flex-grow"></div>
								<Button
									onClick={handleNextStep}
									disabled={
										isLoading || (step === totalSteps && !canSubmitPassword)
									}
								>
									{isLoading ? (
										<Loader2 className="w-5 h-5 animate-spin" />
									) : step === totalSteps ? (
										'Finish Setup'
									) : (
										<>
											Next <ArrowRight className="w-4 h-4 ml-2" />
										</>
									)}
								</Button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
