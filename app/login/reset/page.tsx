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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';

export default function PasswordChangePage() {
	const router = useRouter();
	const { isLoggedIn, user, isLoading: authLoading } = useAuth();
	const [isInitializing, setIsInitializing] = useState(true);

	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	// Redirect if user is not logged in or mustChangePassword is not set
	useEffect(() => {
		if (!isInitializing && !authLoading) {
			if (!user || !user.mustChangePassword) {
				router.push('/login');
			}
		}
	}, [isInitializing, authLoading, isLoggedIn, user, router]);

	useEffect(() => {
		setIsInitializing(false);
	}, []);

	const passwordsMatch =
		password && confirmPassword && password === confirmPassword;
	const isPasswordValid = password.length >= 8;
	const canSubmit = isPasswordValid && passwordsMatch && !isLoading;

	const handleSubmit = async () => {
		setIsLoading(true);
		try {
			await new Promise((resolve) => setTimeout(resolve, 2000));
			console.log('Password updated successfully');
			// Optionally redirect or show a success message
		} catch (error) {
			console.error('Failed to update password:', error);
		} finally {
			setIsLoading(false);
		}
	};

	if (
		isInitializing ||
		authLoading ||
		!isLoggedIn ||
		!user ||
		!user.mustChangePassword
	) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<PageLoading fullScreen variant="school" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<div className="bg-card rounded-2xl shadow-2xl w-full max-w-md lg:max-w-lg xl:max-w-xl overflow-hidden border border-border">
				{/* Header */}
				<div className="bg-primary px-6 py-6 lg:px-8 lg:py-8 text-center">
					<div className="w-16 h-16 lg:w-20 lg:h-20 bg-primary-foreground rounded-full mx-auto mb-4 flex items-center justify-center">
						<Sparkles className="w-8 h-8 lg:w-10 lg:h-10 text-primary" />
					</div>
					<h1 className="text-2xl lg:text-3xl font-bold text-primary-foreground mb-2">
						Welcome!
					</h1>
					<p className="text-primary-foreground/80 text-sm lg:text-base">
						Set up your secure password to get started
					</p>
				</div>

				<div className="p-6 lg:p-10">
					{/* Instructions */}
					<div className="text-center mb-6 lg:mb-8">
						<p className="text-foreground leading-relaxed text-sm lg:text-base">
							Your account has been successfully created. To get started and
							secure your account, please set a new password below.
						</p>
					</div>

					{/* Security Notice */}
					<div className="bg-accent border border-border rounded-lg p-4 lg:p-5 mb-6 lg:mb-8">
						<div className="flex items-start space-x-3">
							<Shield className="w-5 h-5 lg:w-6 lg:h-6 text-primary mt-0.5 flex-shrink-0" />
							<div>
								<h3 className="text-sm lg:text-base font-medium text-foreground mb-1">
									Security First
								</h3>
								<p className="text-sm lg:text-base text-muted-foreground">
									Create a strong password with at least 8 characters to protect
									your account.
								</p>
							</div>
						</div>
					</div>

					{/* Form */}
					<div className="space-y-6 lg:space-y-8">
						{/* New Password Field */}
						<div className="space-y-2 lg:space-y-3">
							<label
								htmlFor="password"
								className="block text-sm lg:text-base font-medium text-foreground"
							>
								New Password
							</label>
							<div className="relative">
								<input
									id="password"
									type={showPassword ? 'text' : 'password'}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full px-4 py-3 lg:px-5 lg:py-4 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all text-foreground disabled:opacity-50 text-sm lg:text-base"
									placeholder="Enter your new password"
									required
									disabled={isLoading}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 lg:right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
									disabled={isLoading}
								>
									{showPassword ? (
										<EyeOff className="w-5 h-5 lg:w-6 lg:h-6" />
									) : (
										<Eye className="w-5 h-5 lg:w-6 lg:h-6" />
									)}
								</button>
							</div>
							{password && (
								<div className="flex items-center space-x-2 text-sm lg:text-base">
									{isPasswordValid ? (
										<CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-500" />
									) : (
										<div className="w-4 h-4 lg:w-5 lg:h-5 border-2 border-muted-foreground rounded-full"></div>
									)}
									<span
										className={
											isPasswordValid
												? 'text-green-600'
												: 'text-muted-foreground'
										}
									>
										At least 8 characters
									</span>
								</div>
							)}
						</div>

						{/* Confirm Password Field */}
						<div className="space-y-2 lg:space-y-3">
							<label
								htmlFor="confirmPassword"
								className="block text-sm lg:text-base font-medium text-foreground"
							>
								Confirm Password
							</label>
							<div className="relative">
								<input
									id="confirmPassword"
									type={showConfirmPassword ? 'text' : 'password'}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className="w-full px-4 py-3 lg:px-5 lg:py-4 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all text-foreground disabled:opacity-50 text-sm lg:text-base"
									placeholder="Confirm your new password"
									required
									disabled={isLoading}
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									className="absolute right-3 lg:right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
									disabled={isLoading}
								>
									{showConfirmPassword ? (
										<EyeOff className="w-5 h-5 lg:w-6 lg:h-6" />
									) : (
										<Eye className="w-5 h-5 lg:w-6 lg:h-6" />
									)}
								</button>
							</div>
							{confirmPassword && (
								<div className="flex items-center space-x-2 text-sm lg:text-base">
									{passwordsMatch ? (
										<CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-500" />
									) : (
										<div className="w-4 h-4 lg:w-5 lg:h-5 border-2 border-muted-foreground rounded-full"></div>
									)}
									<span
										className={
											passwordsMatch
												? 'text-green-600'
												: 'text-muted-foreground'
										}
									>
										Passwords match
									</span>
								</div>
							)}
						</div>

						{/* Submit Button */}
						<button
							type="button"
							onClick={handleSubmit}
							disabled={!canSubmit}
							className="w-full bg-primary text-primary-foreground py-3 px-4 lg:py-4 lg:px-6 rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center text-sm lg:text-base"
						>
							{isLoading ? (
								<div className="flex items-center">
									<Loader2 className="w-5 h-5 lg:w-6 lg:h-6 animate-spin mr-2" />
									Setting Password...
								</div>
							) : (
								'Set Password & Continue'
							)}
						</button>
					</div>

					{/* Help Text */}
					<div className="mt-6 lg:mt-8 text-center">
						<p className="text-sm lg:text-base text-muted-foreground">
							Need help? Contact our{' '}
							<a
								href="#"
								className="text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline"
							>
								support team
							</a>
						</p>
					</div>
				</div>

				{/* Footer */}
				<div className="bg-muted px-6 py-4 lg:px-8 lg:py-5 text-center border-t border-border">
					<p className="text-xs lg:text-sm text-muted-foreground">
						© 2024 School Management System. All rights reserved.
					</p>
				</div>
			</div>
		</div>
	);
}
