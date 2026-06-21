'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
	ArrowLeft,
	LogOut,
	Check,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';
import AvatarPicker from '@/components/avatarPicker';
import { Button } from '@/components/ui/button';
import { LOADING_POLICY, useLoadingGate } from '@/hooks/useLoadingGate';

// ─── Ruled-line background texture (notebook aesthetic) ───────────────────────
function NotebookLines() {
	return (
		<svg
			className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]"
			aria-hidden="true"
		>
			<defs>
				<pattern
					id="ruled"
					x="0"
					y="0"
					width="100%"
					height="32"
					patternUnits="userSpaceOnUse"
				>
					<line
						x1="0"
						y1="31.5"
						x2="100%"
						y2="31.5"
						stroke="currentColor"
						strokeWidth="1"
					/>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#ruled)" />
		</svg>
	);
}

// ─── Vertical progress spine ───────────────────────────────────────────────────
function ProgressSpine({
	currentStep,
	totalSteps,
}: {
	currentStep: number;
	totalSteps: number;
}) {
	const pct =
		totalSteps === 1 ? 100 : ((currentStep - 1) / (totalSteps - 1)) * 100;

	return (
		<div
			className="flex flex-col items-center gap-0 mr-6 shrink-0"
			aria-hidden="true"
		>
			{/* Top cap */}
			<div className="w-2 h-2 rounded-full bg-muted-foreground/30" />

			{/* The spine track */}
			<div className="relative w-0.5 flex-1 min-h-[120px] bg-border overflow-hidden rounded-full">
				<div
					className="absolute bottom-0 left-0 w-full bg-primary rounded-full transition-all duration-700 ease-in-out"
					style={{ height: `${pct}%` }}
				/>
			</div>

			{/* Bottom cap */}
			<div
				className={`w-2 h-2 rounded-full transition-colors duration-500 ${
					currentStep === totalSteps ? 'bg-primary' : 'bg-muted-foreground/30'
				}`}
			/>
		</div>
	);
}

// ─── Step dot ─────────────────────────────────────────────────────────────────
function StepDot({
	stepNum,
	currentStep,
	totalSteps,
}: {
	stepNum: number;
	currentStep: number;
	totalSteps: number;
}) {
	const isDone = stepNum < currentStep;
	const isActive = stepNum === currentStep;

	return (
		<div
			className={`
        w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-mono font-bold
        transition-all duration-300
        ${
					isDone
						? 'bg-primary border-primary text-primary-foreground'
						: isActive
							? 'border-primary text-primary bg-primary/10 ring-2 ring-primary/20'
							: 'border-border text-muted-foreground bg-muted'
				}
      `}
		>
			{isDone ? <Check className="w-4 h-4" /> : stepNum}
		</div>
	);
}

// ─── Field wrapper for consistent styling ─────────────────────────────────────
function Field({
	label,
	id,
	children,
}: {
	label: string;
	id: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-1.5">
			<label
				htmlFor={id}
				className="block text-xs font-mono uppercase tracking-widest text-muted-foreground"
			>
				{label}
			</label>
			{children}
		</div>
	);
}

// ─── Validation row ───────────────────────────────────────────────────────────
function ValidationRow({ met, label }: { met: boolean; label: string }) {
	return (
		<div className="flex items-center gap-2 text-xs">
			<span
				className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-200 shrink-0 ${
					met
						? 'bg-primary border-primary text-primary-foreground'
						: 'border-border bg-transparent text-transparent'
				}`}
			>
				<Check className="w-2.5 h-2.5" />
			</span>
			<span className={met ? 'text-primary' : 'text-muted-foreground'}>
				{label}
			</span>
		</div>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────
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

	// Refs for tab-order fix (password → confirm, skip eye-toggle buttons)
	const passwordRef = useRef<HTMLInputElement>(null);
	const confirmPasswordRef = useRef<HTMLInputElement>(null);

	const { show: showSetupLoader } = useLoadingGate({
		active: isInitializing || authLoading,
		delayMs: LOADING_POLICY.routeSpinnerDelayMs,
		timeoutMs: LOADING_POLICY.authTimeoutMs + 600,
	});

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
			setError('');
			setStep(2);
			return;
		}
		await handleSubmitPassword();
	};

	const passwordsMatch =
		password && confirmPassword && password === confirmPassword;
	const isPasswordValid = password.length >= 8;
	const isNotDefault = user && password !== user.username;
	const canSubmitPassword =
		isPasswordValid && passwordsMatch && isNotDefault && !isLoading;

	// Enter key triggers submit on the password step
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && step === totalSteps && canSubmitPassword) {
				e.preventDefault();
				handleSubmitPassword();
			}
		},
		[step, totalSteps, canSubmitPassword],
	);

	// Tab from password field jumps to confirm field, skipping the eye button
	const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Tab' && !e.shiftKey) {
			e.preventDefault();
			confirmPasswordRef.current?.focus();
		}
		if (e.key === 'Enter' && step === totalSteps && canSubmitPassword) {
			e.preventDefault();
			handleSubmitPassword();
		}
	};

	const handleSubmitPassword = async () => {
		if (!canSubmitPassword) return;
		setIsLoading(true);
		setError('');
		setSuccess('');
		try {
			const oldPassword =
				user?.defaultPassword || user?.studentId || user?.username;
			// Send avatar (even the default) so server always receives a value
			const profileData = {
				avatar: avatar || undefined,
				nickName: nickname,
				bio,
			};
			const response = await fetch('/api/users', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					oldPassword,
					newPassword: password,
					...profileData,
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

	// ── Loading guards ────────────────────────────────────────────────────────
	if (isInitializing || authLoading) {
		if (!showSetupLoader) {
			return <div className="min-h-screen bg-background" />;
		}
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<PageLoading
					fullScreen
					variant="school"
					message="Preparing account setup..."
				/>
			</div>
		);
	}

	// ── Step content ──────────────────────────────────────────────────────────
	const renderProfileStep = () => (
		<div className="space-y-6">
			{/* Avatar */}
			{!user?.avatar && (
				<div className="space-y-2">
					<p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
						Profile Picture
					</p>
					<div className="flex justify-center">
						<AvatarPicker
							gender={user?.gender}
							onAvatarSelect={(url) => setAvatar(url)}
							initialAvatarUrl={avatar}
						/>
					</div>
					<p className="text-center text-xs text-muted-foreground">
						A default is pre-selected — pick one or keep it.
					</p>
				</div>
			)}

			{/* Nickname */}
			{!user?.nickName && (
				<Field label="Nickname" id="nickname">
					<div className="relative">
						<UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
						<input
							id="nickname"
							type="text"
							value={nickname}
							onChange={(e) => setNickname(e.target.value)}
							onKeyDown={handleKeyDown}
							className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm"
							placeholder="What should we call you?"
						/>
					</div>
				</Field>
			)}

			{/* Bio */}
			{!user?.bio && (
				<Field label="About You" id="bio">
					<div className="relative">
						<FileText className="absolute left-3 top-3.5 text-muted-foreground w-4 h-4 pointer-events-none" />
						<textarea
							id="bio"
							value={bio}
							onChange={(e) => setBio(e.target.value)}
							className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm resize-none"
							rows={3}
							placeholder="A sentence or two about yourself..."
						/>
					</div>
				</Field>
			)}
		</div>
	);

	const renderPasswordStep = () => (
		<div className="space-y-5" onKeyDown={handleKeyDown}>
			<div className="rounded-lg bg-muted/40 border border-border px-4 py-3 text-sm text-muted-foreground leading-relaxed">
				{isNewUser
					? "Create a strong password you'll remember. It must differ from your default credentials."
					: 'An admin has reset your password. Choose a new one to regain access.'}
			</div>

			{/* New password */}
			<Field label="New Password" id="password">
				<div className="relative">
					<input
						id="password"
						ref={passwordRef}
						type={showPassword ? 'text' : 'password'}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						onKeyDown={handlePasswordKeyDown}
						className="w-full pr-12 pl-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm"
						placeholder="Choose a strong password"
						autoComplete="new-password"
						disabled={isLoading}
					/>
					<button
						type="button"
						tabIndex={-1}
						onClick={() => setShowPassword((v) => !v)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
						aria-label={showPassword ? 'Hide password' : 'Show password'}
					>
						{showPassword ? (
							<EyeOff className="w-4 h-4" />
						) : (
							<Eye className="w-4 h-4" />
						)}
					</button>
				</div>
			</Field>

			{/* Confirm password */}
			<Field label="Confirm Password" id="confirmPassword">
				<div className="relative">
					<input
						id="confirmPassword"
						ref={confirmPasswordRef}
						type={showConfirmPassword ? 'text' : 'password'}
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						onKeyDown={handleKeyDown}
						className="w-full pr-12 pl-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-sm"
						placeholder="Type it once more"
						autoComplete="new-password"
						disabled={isLoading}
					/>
					<button
						type="button"
						tabIndex={-1}
						onClick={() => setShowConfirmPassword((v) => !v)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
						aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
					>
						{showConfirmPassword ? (
							<EyeOff className="w-4 h-4" />
						) : (
							<Eye className="w-4 h-4" />
						)}
					</button>
				</div>
			</Field>

			{/* Live validation checklist */}
			{(password || confirmPassword) && (
				<div className="space-y-2 pl-1">
					<ValidationRow met={isPasswordValid} label="At least 8 characters" />
					<ValidationRow met={!!passwordsMatch} label="Passwords match" />
					<ValidationRow
						met={!!isNotDefault}
						label="Different from your default password"
					/>
				</div>
			)}
		</div>
	);

	// ── Success state ─────────────────────────────────────────────────────────
	if (success) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center p-4">
				<div className="text-center space-y-4 max-w-sm">
					<div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mx-auto">
						<CheckCircle className="w-10 h-10 text-primary" />
					</div>
					<h2 className="text-2xl font-bold text-foreground">
						You're all set.
					</h2>
					<p className="text-muted-foreground text-sm">{success}</p>
					<div className="flex justify-center pt-2">
						<div className="flex gap-1">
							{[0, 1, 2].map((i) => (
								<div
									key={i}
									className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
									style={{ animationDelay: `${i * 0.15}s` }}
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	// ── Main render ───────────────────────────────────────────────────────────
	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<div className="w-full max-w-md lg:max-w-lg xl:max-w-xl">
				{/* ── Card ── */}
				<div className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
					<NotebookLines />

					{/* ── Header band ── */}
					<div className="relative bg-primary px-6 pt-8 pb-6">
						{/* Decorative corner accent */}
						<div className="absolute top-0 right-0 w-24 h-24 bg-primary-foreground/5 rounded-bl-full" />

						<div className="flex items-start gap-4">
							{/* Spine (only shown when multi-step) */}
							{totalSteps > 1 && (
								<div className="flex flex-col items-center mt-1 mr-2">
									{Array.from({ length: totalSteps }, (_, i) => i + 1).map(
										(s, idx) => (
											<React.Fragment key={s}>
												<StepDot
													stepNum={s}
													currentStep={step}
													totalSteps={totalSteps}
												/>
												{idx < totalSteps - 1 && (
													<div
														className={`w-0.5 h-5 transition-colors duration-500 ${
															s < step
																? 'bg-primary-foreground/60'
																: 'bg-primary-foreground/20'
														}`}
													/>
												)}
											</React.Fragment>
										),
									)}
								</div>
							)}

							<div className="flex-1 min-w-0">
								{/* Monospace eyebrow */}
								<p className="text-primary-foreground/60 text-[10px] font-mono uppercase tracking-[0.2em] mb-1">
									{totalSteps > 1
										? `Step ${step} of ${totalSteps}`
										: 'Account Setup'}
								</p>

								<h1 className="text-xl font-bold text-primary-foreground leading-tight">
									{step === 1 && needsProfileUpdate
										? 'Complete Your Profile'
										: 'Set a New Password'}
								</h1>

								<p className="text-primary-foreground/70 text-xs mt-1 leading-relaxed">
									{step === 1 && needsProfileUpdate
										? 'Add a few personal touches to your account.'
										: isNewUser
											? 'Secure your account with a password only you know.'
											: 'An admin reset your password — choose a new one.'}
								</p>
							</div>

							{/* Badge icon */}
							<div className="shrink-0 w-10 h-10 rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 flex items-center justify-center">
								{step === 1 && needsProfileUpdate ? (
									<UserIcon className="w-5 h-5 text-primary-foreground" />
								) : (
									<Shield className="w-5 h-5 text-primary-foreground" />
								)}
							</div>
						</div>
					</div>

					{/* ── Body ── */}
					<div className="relative p-6 lg:p-8 space-y-6">
						{/* Error banner */}
						{error && (
							<div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20">
								<div className="w-1 self-stretch rounded-full bg-destructive shrink-0" />
								<p className="text-sm text-destructive">{error}</p>
							</div>
						)}

						{/* Step content */}
						{step === 1 && needsProfileUpdate
							? renderProfileStep()
							: renderPasswordStep()}

						{/* ── Action row ── */}
						<div className="flex flex-wrap items-center gap-2 pt-2">
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-foreground gap-1.5"
								onClick={async () => {
									await logout();
									router.push('/login');
								}}
							>
								<LogOut className="w-3.5 h-3.5" />
								<span className="text-xs">Log out</span>
							</Button>

							{step > 1 && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setStep(step - 1)}
									className="gap-1.5"
								>
									<ArrowLeft className="w-3.5 h-3.5" />
									<span className="text-xs">Back</span>
								</Button>
							)}

							<div className="flex-1" />

							<Button
								onClick={handleNextStep}
								disabled={
									isLoading || (step === totalSteps && !canSubmitPassword)
								}
								className="gap-2 min-w-[130px]"
							>
								{isLoading ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										<span className="text-sm">Saving…</span>
									</>
								) : step === totalSteps ? (
									<>
										<Check className="w-4 h-4" />
										<span className="text-sm">Finish Setup</span>
									</>
								) : (
									<>
										<span className="text-sm">Continue</span>
										<ArrowRight className="w-4 h-4" />
									</>
								)}
							</Button>
						</div>
					</div>
				</div>

				{/* ── Footer note ── */}
				<p className="text-center text-[11px] text-muted-foreground/50 mt-4 font-mono">
					school mesh · upstairs christian academy
				</p>
			</div>
		</div>
	);
}
