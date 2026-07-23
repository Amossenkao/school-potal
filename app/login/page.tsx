'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Ably from 'ably';
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
	ChevronRight,
	RefreshCcw,
	Clock,
	AlertCircle,
	LogIn,
	ArrowLeft,
	School,
	KeyRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';
import { useNetworkStore } from '@/store/networkStore';
import Link from 'next/link';
import { ThemeToggleButton } from '@/components/common/ThemeToggleButton';
import type SchoolProfile from '@/types/schoolProfile';
import { useHasSchool } from '@/context/HasSchoolContext';
import SuperAdminLoginPage from '@/app/superadmin/login/page';
import {
	getAuthorizedRealtimeChannels,
	resolveTenantSyncKey,
	type RealtimeEvent,
} from '@/lib/realtimeTypes';

const PUBLIC_SYNC_STREAM_TOKEN_ENDPOINT = '/api/sync/public-stream-token';
const PUBLIC_SYNC_REFRESH_DEBOUNCE_MS = 120;

const resolveRoleLoginDisabledMessage = (role: string, school: any): string => {
	if (!role || role === 'system_admin') return '';
	const roleSettingsKey = `${role}Settings`;
	const roleSettings = school?.settings?.[roleSettingsKey];
	if (roleSettings?.loginAccess === false) {
		return `Login is currently disabled for ${role}s.`;
	}
	return '';
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Left identity strip */
const IdentityStrip = ({
	school,
	selectedRole,
	adminPosition,
	adminPositions,
	roles,
	onChangeRole,
	onChangePosition,
}: {
	school: any;
	selectedRole: string;
	adminPosition: string;
	adminPositions: { id: string; name: string }[];
	roles: {
		value: string;
		label: string;
		icon: React.ElementType;
		colorClass: string;
	}[];
	onChangeRole: () => void;
	onChangePosition: () => void;
}) => {
	const currentRole = roles.find((r) => r.value === selectedRole);
	const currentPos = adminPositions.find((p) => p.id === adminPosition);
	const schoolDisplayName = school?.shortName || school?.name || '';
	const schoolTagline = school?.tagline || school?.slogan || '';
	const hasSchoolBrand = Boolean(
		school?.logoUrl || schoolDisplayName || school?.initials || schoolTagline,
	);

	return (
		<aside
			className="
			hidden lg:flex flex-col w-64 xl:w-72 flex-shrink-0
			border-r border-border bg-muted/30
			px-6 py-8 gap-6
		"
		>
			{/* Logo + school name */}
			{hasSchoolBrand ? (
				<Link href="/" className="flex flex-col gap-4">
					<div
						className="
						w-30 h-30 flex items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-muted/40
					"
					>
						{school?.logoUrl ? (
							<img
								src={school.logoUrl}
								alt={`${schoolDisplayName || 'School'} logo`}
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="h-10 w-10 rounded-full border border-border/60 bg-muted/40" />
						)}
					</div>
					<div>
						<p className="text-base font-semibold text-foreground leading-snug">
							{schoolDisplayName ? `${schoolDisplayName} e-Portal` : 'e-Portal'}
						</p>
						<p className="text-xs text-muted-foreground mt-1 leading-snug">
							{schoolTagline || 'Excellence in Education'}
						</p>
					</div>
				</Link>
			) : (
				<div className="flex flex-col gap-4">
					<div className="h-30 w-30 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
					<div className="space-y-2">
						<div className="h-4 w-24 animate-pulse rounded bg-muted" />
						<div className="h-3 w-28 animate-pulse rounded bg-muted" />
					</div>
				</div>
			)}

			<div className="h-px bg-border" />

			{/* Active selection badges */}
			{selectedRole && (
				<div className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-left-2 duration-200">
					{/* Role badge */}
					<div className="rounded-lg border border-border bg-background p-3 flex flex-col gap-1.5">
						<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
							Role
						</p>
						<div className="flex items-center gap-2">
							{currentRole && (
								<currentRole.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
							)}
							<p className="text-sm font-medium text-foreground truncate">
								{currentRole?.label || selectedRole}
							</p>
						</div>
					</div>

					{/* Position badge (admin only) */}
					{selectedRole === 'administrator' && currentPos && (
						<div
							className="
							rounded-lg border border-border bg-background p-3
							flex flex-col gap-1.5
							animate-in fade-in slide-in-from-left-2 duration-200
						"
						>
							<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
								Position
							</p>
							<div className="flex items-center gap-2">
								<Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
								<p className="text-sm font-medium text-foreground truncate">
									{currentPos.name}
								</p>
							</div>
						</div>
					)}

					{/* Quick-action controls */}
					<div className="flex flex-col gap-1.5 pt-1">
						{selectedRole === 'administrator' && adminPosition && (
							<button
								onClick={onChangePosition}
								className="
									w-full flex items-center justify-center gap-1.5
									text-[11px] text-muted-foreground
									border border-border rounded-lg py-2
									hover:bg-accent hover:text-foreground
									transition-colors
								"
							>
								<RefreshCcw className="w-3 h-3" />
								Change position
							</button>
						)}
						<button
							onClick={onChangeRole}
							className="
								w-full flex items-center justify-center gap-1.5
								text-[11px] text-muted-foreground
								border border-border rounded-lg py-2
								hover:bg-accent hover:text-foreground
								transition-colors
							"
						>
							<ArrowLeft className="w-3 h-3" />
							Change role
						</button>
					</div>
				</div>
			)}

			{/* Footer */}
			<div className="mt-auto text-[10px] text-muted-foreground/60 leading-relaxed">
				<p>
					&copy; {new Date().getFullYear()}{' '}
					{school?.name || 'Upstairs Christian Academy'}.
					<br />
					All Rights Reserved.
				</p>
				<p className="mt-1">
					Powered by{' '}
					<a
						href="https://school-mesh.vercel.app"
						className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
					>
						School Mesh
					</a>{' '}
					v2.4.0
				</p>
			</div>
		</aside>
	);
};

/** Compact role/position indicator for mobile — mirrors IdentityStrip's badges */
const MobileRoleIndicator = ({
	selectedRole,
	adminPosition,
	roles,
	adminPositions,
}: {
	selectedRole: string;
	adminPosition: string;
	roles: {
		value: string;
		label: string;
		icon: React.ElementType;
		colorClass: string;
	}[];
	adminPositions: { id: string; name: string }[];
}) => {
	const currentRole = roles.find((r) => r.value === selectedRole);
	const currentPos = adminPositions.find((p) => p.id === adminPosition);

	if (!currentRole) return null;

	return (
		<div className="lg:hidden flex flex-wrap items-center gap-2 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
			<div
				className="
					flex items-center gap-1.5
					rounded-full border border-border bg-muted/40
					px-3 py-1.5
				"
			>
				<currentRole.icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
				<span className="text-xs font-medium text-foreground">
					{currentRole.label}
				</span>
			</div>

			{selectedRole === 'administrator' && currentPos && (
				<div
					className="
						flex items-center gap-1.5
						rounded-full border border-border bg-muted/40
						px-3 py-1.5
					"
				>
					<Shield className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
					<span className="text-xs font-medium text-foreground">
						{currentPos.name}
					</span>
				</div>
			)}
		</div>
	);
};

/** Inline error banner */
const ErrorBanner = ({
	message,
	icon: Icon = AlertCircle,
	variant = 'error',
}: {
	message: string;
	icon?: React.ElementType;
	variant?: 'error' | 'warning' | 'info';
}) => {
	const styles = {
		error: 'bg-destructive/10 border-destructive/20 text-destructive',
		warning: 'bg-amber-500/10 border-amber-500/30 text-amber-700',
		info: 'bg-primary/10 border-primary/20 text-primary',
	}[variant];

	return (
		<div
			className={`
				flex items-start gap-3 p-3.5 rounded-xl border
				animate-in fade-in duration-200
				${styles}
			`}
		>
			<Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
			<p className="text-sm font-medium leading-snug">{message}</p>
		</div>
	);
};

/** Role selection cards */
const RoleStep = ({
	roles,
	onSelect,
}: {
	roles: {
		value: string;
		label: string;
		icon: React.ElementType;
		colorClass: string;
		description: string;
	}[];
	onSelect: (value: string) => void;
}) => (
	<div className="animate-in fade-in slide-in-from-right-4 duration-300">
		<div className="mb-8">
			<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
				Step 1
			</p>
			<h2 className="text-2xl font-bold text-foreground">Who are you?</h2>
			<p className="text-sm text-muted-foreground mt-1">
				Select your role to access the portal.
			</p>
		</div>

		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			{roles.map((role) => {
				const Icon = role.icon;
				return (
					<button
						key={role.value}
						onClick={() => onSelect(role.value)}
						className="
							group relative text-left
							flex items-center gap-5 p-5
							rounded-2xl border border-border bg-card
							hover:border-primary/40 hover:bg-accent
							transition-all duration-150
							focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none
						"
					>
						<div
							className={`
								w-13 h-13 rounded-xl flex items-center justify-center flex-shrink-0
								${role.colorClass}
							`}
							style={{ width: '3.25rem', height: '3.25rem' }}
						>
							<Icon className="w-6 h-6" />
						</div>
						<div className="min-w-0">
							<p className="text-sm font-semibold text-foreground">
								{role.label}
							</p>
							<p className="text-xs text-muted-foreground mt-1 leading-snug">
								{role.description}
							</p>
						</div>
						<ChevronRight
							className="
								w-4 h-4 text-muted-foreground/40
								ml-auto flex-shrink-0
								translate-x-0 group-hover:translate-x-0.5
								transition-transform
							"
						/>
					</button>
				);
			})}
		</div>
	</div>
);

/** Administrator position picker */
const PositionStep = ({
	positions,
	onSelect,
}: {
	positions: { id: string; name: string }[];
	onSelect: (id: string) => void;
}) => (
	<div className="animate-in fade-in slide-in-from-right-4 duration-300">
		<div className="mb-8">
			<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
				Step 2
			</p>
			<h2 className="text-2xl font-bold text-foreground">
				Identify your office
			</h2>
			<p className="text-sm text-muted-foreground mt-1">
				Choose your administrative position to continue.
			</p>
		</div>

		<div className="flex flex-col gap-2">
			{positions.map((pos) => (
				<button
					key={pos.id}
					onClick={() => onSelect(pos.id)}
					className="
						group flex items-center justify-between
						px-4 py-3.5
						rounded-xl border border-border bg-card
						hover:border-primary/40 hover:bg-accent
						text-left transition-all duration-150
						focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none
					"
				>
					<span className="text-sm font-medium text-foreground">
						{pos.name}
					</span>
					<ChevronRight
						className="
							w-4 h-4 text-muted-foreground/40
							translate-x-0 group-hover:translate-x-0.5
							transition-transform
						"
					/>
				</button>
			))}
		</div>
	</div>
);

/** Sign-in form */
const FormStep = ({
	formData,
	onChange,
	onSubmit,
	isLoading,
	loginDisabledError,
	error,
	offlineError,
	onForgotPassword,
	inputRef,
}: {
	formData: { username: string; password: string };
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onSubmit: (e: React.FormEvent) => void;
	isLoading: boolean;
	loginDisabledError: string;
	error: string | null;
	offlineError: string;
	onForgotPassword: () => void;
	inputRef: React.RefObject<HTMLInputElement>;
}) => {
	const [showPw, setShowPw] = useState(false);

	return (
		<div className="animate-in fade-in slide-in-from-right-4 duration-300">
			<div className="mb-8">
				<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
					Sign in
				</p>
				<h2 className="text-2xl font-bold text-foreground">
					Enter your credentials
				</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Use your portal username and password.
				</p>
			</div>

			{/* Error banners */}
			<div className="flex flex-col gap-2.5 mb-6 empty:hidden">
				{error && <ErrorBanner message={error} />}
				{offlineError && (
					<ErrorBanner message={offlineError} variant="warning" />
				)}
				{loginDisabledError && (
					<ErrorBanner message={loginDisabledError} icon={Shield} />
				)}
			</div>

			<form onSubmit={onSubmit} className="flex flex-col gap-5">
				{/* Username */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						Username
					</label>
					<div className="relative">
						<User
							className="
							absolute left-3 top-1/2 -translate-y-1/2
							w-4 h-4 text-muted-foreground pointer-events-none
						"
						/>
						<input
							type="text"
							name="username"
							value={formData.username}
							onChange={onChange}
							disabled={isLoading || !!loginDisabledError}
							ref={inputRef}
							placeholder="Enter your username"
							required
							autoComplete="username"
							className="
								w-full pl-9 pr-4 py-2.5
								text-sm text-foreground
								bg-muted/40 border border-border rounded-xl
								placeholder:text-muted-foreground/50
								focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
								focus:bg-background
								disabled:opacity-50 disabled:cursor-not-allowed
								transition-all
							"
						/>
					</div>
				</div>

				{/* Password */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						Password
					</label>
					<div className="relative">
						<Lock
							className="
							absolute left-3 top-1/2 -translate-y-1/2
							w-4 h-4 text-muted-foreground pointer-events-none
						"
						/>
						<input
							type={showPw ? 'text' : 'password'}
							name="password"
							value={formData.password}
							onChange={onChange}
							disabled={isLoading || !!loginDisabledError}
							placeholder="••••••••"
							required
							autoComplete="current-password"
							className="
								w-full pl-9 pr-11 py-2.5
								text-sm text-foreground
								bg-muted/40 border border-border rounded-xl
								placeholder:text-muted-foreground/50
								focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
								focus:bg-background
								disabled:opacity-50 disabled:cursor-not-allowed
								transition-all
							"
						/>
						<button
							type="button"
							onClick={() => setShowPw((p) => !p)}
							className="
								absolute right-3 top-1/2 -translate-y-1/2
								text-muted-foreground hover:text-foreground
								transition-colors p-0.5
							"
							aria-label={showPw ? 'Hide password' : 'Show password'}
						>
							{showPw ? (
								<EyeOff className="w-4 h-4" />
							) : (
								<Eye className="w-4 h-4" />
							)}
						</button>
					</div>
				</div>

				{/* Submit */}
				<button
					type="submit"
					disabled={
						isLoading ||
						!!loginDisabledError ||
						!formData.username ||
						!formData.password
					}
					className="
						flex items-center justify-center gap-2
						mt-1 px-6 py-3
						rounded-xl
						bg-primary text-primary-foreground
						text-sm font-semibold
						shadow-sm
						hover:opacity-90 active:scale-[0.98]
						disabled:opacity-40 disabled:cursor-not-allowed
						transition-all duration-150
						focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
					"
				>
					{isLoading ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<LogIn className="w-4 h-4" />
					)}
					{isLoading ? 'Signing in…' : 'Access e-Portal'}
				</button>

				{/* Forgot */}
				<button
					type="button"
					onClick={onForgotPassword}
					className="
						text-xs text-muted-foreground
						hover:text-foreground underline underline-offset-4
						decoration-muted-foreground/30
						transition-colors self-center
					"
				>
					Forgot your credentials?
				</button>
			</form>
		</div>
	);
};

/** Forgot-password modal */
const RecoveryModal = ({
	selectedRole,
	school,
	onClose,
}: {
	selectedRole: string;
	school: any;
	onClose: () => void;
}) => {
	const isSysAdmin = selectedRole === 'system_admin';

	return (
		<div
			className="
				fixed inset-0 z-[100]
				bg-background/70 backdrop-blur-sm
				flex items-center justify-center p-4
				animate-in fade-in duration-200
			"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="
					bg-card border border-border rounded-2xl shadow-xl
					w-full max-w-sm p-7 relative
					animate-in zoom-in-95 fade-in duration-200
				"
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
			>
				<button
					onClick={onClose}
					className="
						absolute top-4 right-4
						text-muted-foreground hover:text-foreground
						transition-colors text-xl leading-none font-bold
					"
					aria-label="Close modal"
				>
					×
				</button>

				{/* Icon */}
				<div
					className="
					w-12 h-12 rounded-2xl
					bg-muted border border-border
					flex items-center justify-center mx-auto mb-5
				"
				>
					<KeyRound className="w-5 h-5 text-muted-foreground" />
				</div>

				<h3
					id="modal-title"
					className="text-lg font-bold text-center text-foreground mb-2"
				>
					Account Recovery
				</h3>
				<p className="text-sm text-muted-foreground text-center mb-5 leading-relaxed">
					{isSysAdmin
						? 'Please contact the system development team for root access recovery.'
						: "Reach out to your school's administrator to initiate a password reset."}
				</p>

				{/* Contact block */}
				<div
					className="
					bg-muted/50 rounded-xl border border-border
					px-4 py-3.5 flex flex-col gap-2.5
				"
				>
					<div className="flex justify-between items-center border-b border-border pb-2">
						<span className="text-xs text-muted-foreground">
							{isSysAdmin ? 'Developer' : 'Admin'}
						</span>
						<span className="text-sm font-semibold text-foreground">
							{isSysAdmin
								? 'Amos Senkao'
								: school?.sysAdmin?.name || 'Amos Senkao'}
						</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-xs text-muted-foreground">Phone</span>
						<span className="text-sm font-semibold text-foreground">
							{isSysAdmin
								? '0776-949463'
								: school?.sysAdmin?.phone || '0776 - 949463'}
						</span>
					</div>
					{isSysAdmin && (
						<div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground border-t border-border mt-0.5">
							<Clock className="w-3 h-3 flex-shrink-0" />
							Support: 8:00 am – 5:00 pm (Mon – Fri)
						</div>
					)}
				</div>

				<button
					onClick={onClose}
					className="
						w-full mt-5 py-2.5 rounded-xl
						bg-muted border border-border
						text-sm font-medium text-foreground
						hover:bg-accent transition-colors
					"
				>
					Close
				</button>
			</div>
		</div>
	);
};

// ─── Main page ─────────────────────────────────────────────────────────────────

const LoginPage = () => {
	const router = useRouter();
	const [selectedRole, setSelectedRole] = useState('');
	const [adminPosition, setAdminPosition] = useState('');
	const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
	const [isRedirecting, setIsRedirecting] = useState(false);
	const [redirectTimedOut, setRedirectTimedOut] = useState(false);
	const currentSchool = useSchoolStore((state) => state.school);
	const setSchool = useSchoolStore((state) => state.setSchool);
	const applyRealtimeEvent = useSchoolStore(
		(state) => state.applyRealtimeEvent,
	);
	const publicSchoolTenantKey = useMemo(
		() =>
			resolveTenantSyncKey({
				schoolProfile: currentSchool,
			}),
		[currentSchool?.dbName, currentSchool?.host],
	);
	const [loginDisabledError, setLoginDisabledError] = useState('');
	const usernameInputRef = useRef<HTMLInputElement>(null);
	const hasSchool = useHasSchool();

	// ── Network store: single source of truth for connectivity ──
	const isOnline = useNetworkStore((state) => state.isOnline);
	const refreshConnectivity = useNetworkStore(
		(state) => state.refreshConnectivity,
	);
	const initNetworkListeners = useNetworkStore(
		(state) => state.initNetworkListeners,
	);
	const offlineError = !isOnline
		? 'You are offline. Please connect to the internet and try again.'
		: '';

	useEffect(() => {
		initNetworkListeners();
	}, [initNetworkListeners]);

	const schoolRefreshInFlightRef = useRef<Promise<SchoolProfile | null> | null>(
		null,
	);

	const {
		isLoading,
		isLoggedIn,
		user,
		error,
		isAwaitingOtp,
		otpContact,
		login,
		verifyOtp,
		clearError,
		isBootstrapping,
		startupResolved,
		isLoggingOut,
	} = useAuth();

	const [formData, setFormData] = useState({
		username: '',
		password: '',
		otp: '',
	});
	const hasSchoolBrand = Boolean(
		currentSchool?.logoUrl ||
			currentSchool?.shortName ||
			currentSchool?.name ||
			currentSchool?.initials ||
			currentSchool?.tagline,
	);

	const dismissKeyboardFocus = useCallback(() => {
		if (typeof document === 'undefined') return;
		const activeElement = document.activeElement as HTMLElement | null;
		if (!activeElement) return;
		if (typeof activeElement.blur === 'function') activeElement.blur();
	}, []);

	const navigateToDashboardWithSpinner = useCallback(() => {
		dismissKeyboardFocus();
		setIsRedirecting(true);

		window.requestAnimationFrame(() => {
			router.push('/dashboard');
		});
	}, [router, dismissKeyboardFocus]);

useEffect(() => {
	if (
		startupResolved &&
		!isBootstrapping &&
		!isLoading &&
		user?.isActive &&
		isLoggedIn &&
		!isLoggingOut &&
		!isAwaitingOtp &&
		!isRedirecting &&
		!redirectTimedOut
	) {
		navigateToDashboardWithSpinner();
	}
}, [
	startupResolved,
	isBootstrapping,
	isLoading,
	user,
	isLoggedIn,
	isLoggingOut,
	isAwaitingOtp,
	isRedirecting,
	redirectTimedOut,
	navigateToDashboardWithSpinner,
]);

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

	const refreshSchoolProfile =
		useCallback(async (): Promise<SchoolProfile | null> => {
			if (schoolRefreshInFlightRef.current) {
				return schoolRefreshInFlightRef.current;
			}

			const refreshPromise = (async () => {
				const response = await fetch('/api/school', {
					cache: 'no-store',
					headers: { 'Cache-Control': 'no-store' },
				});
				if (!response.ok) return null;
				const nextSchool = (await response.json()) as SchoolProfile;
				setSchool(nextSchool);
				return nextSchool;
			})().catch(() => null);

			schoolRefreshInFlightRef.current = refreshPromise;
			try {
				return await refreshPromise;
			} finally {
				if (schoolRefreshInFlightRef.current === refreshPromise) {
					schoolRefreshInFlightRef.current = null;
				}
			}
		}, [setSchool]);

	useEffect(() => {
		let client: Ably.Realtime | null = null;
		let unsubscribe: (() => void) | null = null;
		let refreshTimer: number | null = null;
		const tenantKey =
			publicSchoolTenantKey ||
			resolveTenantSyncKey({
				host: window.location.host,
			});

		const clearRefreshTimer = () => {
			if (!refreshTimer) return;
			window.clearTimeout(refreshTimer);
			refreshTimer = null;
		};

		const closeClient = () => {
			if (unsubscribe) {
				unsubscribe();
				unsubscribe = null;
			}
			if (client) {
				client.close();
				client = null;
			}
		};

		const scheduleRefresh = () => {
			clearRefreshTimer();
			refreshTimer = window.setTimeout(() => {
				refreshTimer = null;
				void refreshSchoolProfile();
			}, PUBLIC_SYNC_REFRESH_DEBOUNCE_MS);
		};

		const connectStream = async () => {
			closeClient();
			if (!tenantKey) return;
			const nextClient = new Ably.Realtime({
				authUrl: PUBLIC_SYNC_STREAM_TOKEN_ENDPOINT,
				authMethod: 'GET',
				withCredentials: true,
			});
			client = nextClient;
			const channels = getAuthorizedRealtimeChannels({
				tenantId: tenantKey,
				publicOnly: true,
			});
			const schoolChannel = channels[0];
			if (!schoolChannel) return;
			const channel = nextClient.channels.get(schoolChannel);
			const listener = (message: any) => {
				const event = message?.data as RealtimeEvent | undefined;
				if (!event || event.tenantId !== tenantKey) return;
				applyRealtimeEvent(event);
				scheduleRefresh();
			};
			channel.subscribe(listener);
			unsubscribe = () => channel.unsubscribe(listener);
		};

		const handleOnline = () => {
			scheduleRefresh();
			void connectStream();
		};
		const handleVisibilityChange = () => {
			if (document.visibilityState !== 'visible') return;
			scheduleRefresh();
			if (!client) void connectStream();
		};

		window.addEventListener('online', handleOnline);
		document.addEventListener('visibilitychange', handleVisibilityChange);
		scheduleRefresh();
		void connectStream();

		return () => {
			window.removeEventListener('online', handleOnline);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			closeClient();
			clearRefreshTimer();
		};
	}, [applyRealtimeEvent, publicSchoolTenantKey, refreshSchoolProfile]);

	useEffect(() => {
		clearError();
		setLoginDisabledError('');
		setFormData({ username: '', password: '', otp: '' });
	}, [selectedRole, adminPosition, clearError]);

	useEffect(() => {
		if (selectedRole !== 'administrator' && adminPosition) setAdminPosition('');
	}, [selectedRole, adminPosition]);

	useEffect(() => {
		setLoginDisabledError(
			resolveRoleLoginDisabledMessage(selectedRole, currentSchool),
		);
	}, [selectedRole, currentSchool]);

	useEffect(() => {
		if (hasSchool && startupResolved && !isBootstrapping && !currentSchool) {
			router.replace('/');
		}
	}, [hasSchool, startupResolved, isBootstrapping, currentSchool, router]);

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
			label: 'Student',
			icon: GraduationCap,
			colorClass:
				'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
			description: 'Results, fees & notices',
		},
		{
			value: 'teacher',
			label: 'Teacher',
			icon: BookOpen,
			colorClass:
				'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
			description: 'Gradebooks & attendance',
		},
		{
			value: 'administrator',
			label: 'Administrator',
			icon: Users,
			colorClass:
				'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
			description: 'School management & oversight',
		},
		{
			value: 'system_admin',
			label: 'System Admin',
			icon: Shield,
			colorClass: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
			description: 'Root access & configuration',
		},
	];

	const adminPositions = currentSchool?.administrativePositions || [];

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
		if (error) clearError();
	};

	const handleLoginSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isOnline) {
			return;
		}
		void refreshConnectivity({
			force: true,
			timeoutMs: 5200,
			reason: 'login-submit',
		});
		const latestSchool = await refreshSchoolProfile();
		const disabledMessage = resolveRoleLoginDisabledMessage(
			selectedRole,
			latestSchool || currentSchool,
		);
		if (disabledMessage) {
			setLoginDisabledError(disabledMessage);
			return;
		}
		if (loginDisabledError) setLoginDisabledError('');

		const loginData = {
			role: selectedRole,
			username: formData.username,
			password: formData.password,
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
		}
	};

	const isBootstrappingSession =
		(!startupResolved || isBootstrapping) &&
		!isRedirecting &&
		Boolean(user?.isActive || isLoggedIn);
	if (isBootstrappingSession)
		return <PageLoading variant="school" message="Loading…" />;

	if (!hasSchool) {
		return <SuperAdminLoginPage />;
	}

	// Determine which main step to show
	const showRoleStep = !selectedRole;
	const showPosStep =
		selectedRole === 'administrator' && !adminPosition && !loginDisabledError;
	const showFormStep =
		selectedRole &&
		(selectedRole !== 'administrator' || !!adminPosition) &&
		!isAwaitingOtp;

	return (
		<>
			{isRedirecting && (
				<PageLoading variant="school" message="Opening dashboard…" />
			)}

			{/* Theme toggle */}
			<div className="fixed top-4 right-4 z-50">
				<ThemeToggleButton />
			</div>

			<div className="min-h-screen bg-background flex flex-col">
				<div className="flex-grow flex flex-col">
					<div className="flex-grow flex items-center justify-center px-4 py-10">
						{/* Card shell */}
						<div
							className="
							w-full max-w-4xl
							bg-card rounded-2xl
							border border-border
							shadow-sm overflow-hidden
							flex flex-col lg:flex-row
						"
						>
							{/* Mobile logo header — visible only on small screens */}
							<div className="lg:hidden flex items-center gap-4 px-6 pt-6 pb-4 border-b border-border">
							{hasSchoolBrand ? (
								<Link href="/" className="flex items-center gap-3">
									<div
										className="
										w-16 h-16 flex items-center justify-center overflow-hidden flex-shrink-0
									"
									>
										{currentSchool?.logoUrl ? (
											<img
												src={currentSchool.logoUrl}
												alt={`${currentSchool.shortName || currentSchool.name || 'School'} logo`}
												className="w-full h-full"
											/>
										) : (
											<div className="h-10 w-10 rounded-full border border-border/60 bg-muted/40" />
										)}
									</div>
									<div>
										<p className="text-sm font-semibold text-foreground leading-snug">
											{currentSchool?.shortName || currentSchool?.name || ''} e-Portal
										</p>
										<p className="text-xs text-muted-foreground mt-0.5 leading-snug">
											{currentSchool?.tagline || 'Excellence in Education'}
										</p>
									</div>
								</Link>
							) : (
								<div className="flex items-center gap-3 w-full">
									<div className="h-12 w-12 shrink-0 animate-pulse rounded-full border border-border/60 bg-muted/40" />
									<div className="flex-1 space-y-2">
										<div className="h-4 w-24 animate-pulse rounded bg-muted" />
										<div className="h-3 w-28 animate-pulse rounded bg-muted" />
									</div>
								</div>
								)}
								
							</div>

							{/* Left identity strip (desktop only) */}
							<IdentityStrip
								school={currentSchool}
								selectedRole={selectedRole}
								adminPosition={adminPosition}
								adminPositions={adminPositions}
								roles={roles}
								onChangeRole={() => {
									setSelectedRole('');
									setAdminPosition('');
									clearError();
									setLoginDisabledError('');
									setFormData({ username: '', password: '', otp: '' });
								}}
								onChangePosition={() => {
									setAdminPosition('');
									clearError();
									setLoginDisabledError('');
									setFormData({ username: '', password: '', otp: '' });
								}}
							/>

							{/* Right content area */}
							<div className="flex-1 flex flex-col px-7 py-8 min-h-[520px]">
								{/* Timed-out redirect notice */}
								{redirectTimedOut && (
									<div
										className="
										mb-5 rounded-xl border border-amber-300 bg-amber-50
										px-4 py-3 text-sm text-amber-900
										flex items-center gap-3
									"
									>
										<AlertCircle className="w-4 h-4 flex-shrink-0" />
										<span>Redirect took too long.</span>
										<button
											type="button"
											onClick={() => {
												setRedirectTimedOut(false);
												if (user?.isActive && isLoggedIn && !isAwaitingOtp) {
													navigateToDashboardWithSpinner();
												}
											}}
											className="ml-auto text-xs font-semibold underline underline-offset-2 hover:no-underline"
										>
											Retry
										</button>
									</div>
								)}

								{/* Mobile role/position indicator — desktop already shows this via IdentityStrip */}
								<MobileRoleIndicator
									selectedRole={selectedRole}
									adminPosition={adminPosition}
									roles={roles}
									adminPositions={adminPositions}
								/>

								{/* ── Step: role selection ── */}
								{showRoleStep && (
									<RoleStep
										roles={roles}
										onSelect={(value) => {
											setSelectedRole(value);
										}}
									/>
								)}

								{/* ── Step: position picker ── */}
								{!showRoleStep && showPosStep && (
									<PositionStep
										positions={adminPositions}
										onSelect={(id) => setAdminPosition(id)}
									/>
								)}

								{/* ── Step: sign-in form ── */}
								{!showRoleStep && !showPosStep && showFormStep && (
									<FormStep
										formData={formData}
										onChange={handleInputChange}
										onSubmit={handleLoginSubmit}
										isLoading={isLoading}
										loginDisabledError={loginDisabledError}
										error={error}
										offlineError={offlineError}
										onForgotPassword={() => setShowForgotPasswordModal(true)}
										inputRef={usernameInputRef}
									/>
								)}

								{/* ── Step: OTP ── */}
								{isAwaitingOtp && (
									<div className="animate-in fade-in slide-in-from-right-4 duration-300">
										<div className="mb-8">
											<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
												Verification
											</p>
											<h2 className="text-2xl font-bold text-foreground">
												Check your messages
											</h2>
											<p className="text-sm text-muted-foreground mt-1">
												{otpContact
													? `A code was sent to ${otpContact}.`
													: 'A one-time code was sent to your registered contact.'}
											</p>
										</div>
										<form
											onSubmit={async (e) => {
												e.preventDefault();
												const verified = await verifyOtp(formData.otp);
												if (verified) navigateToDashboardWithSpinner();
											}}
											className="flex flex-col gap-5"
										>
											<div className="flex flex-col gap-1.5">
												<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
													One-time code
												</label>
												<div className="relative">
													<KeyRound
														className="
														absolute left-3 top-1/2 -translate-y-1/2
														w-4 h-4 text-muted-foreground pointer-events-none
													"
													/>
													<input
														type="text"
														name="otp"
														value={formData.otp}
														onChange={handleInputChange}
														placeholder="e.g. 123456"
														inputMode="numeric"
														maxLength={6}
														required
														className="
															w-full pl-9 pr-4 py-2.5
															text-sm text-foreground tracking-widest
															bg-muted/40 border border-border rounded-xl
															placeholder:text-muted-foreground/50 placeholder:tracking-normal
															focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
															focus:bg-background
															transition-all
														"
													/>
												</div>
											</div>
											<button
												type="submit"
												disabled={isLoading || !formData.otp}
												className="
													flex items-center justify-center gap-2
													px-6 py-3 rounded-xl
													bg-primary text-primary-foreground
													text-sm font-semibold shadow-sm
													hover:opacity-90 active:scale-[0.98]
													disabled:opacity-40 disabled:cursor-not-allowed
													transition-all duration-150
												"
											>
												{isLoading ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : null}
												Verify &amp; sign in
											</button>
										</form>
									</div>
								)}

								{/* Mobile-only role/position switcher */}
								{selectedRole && (
									<div
										className="
										mt-auto pt-6 border-t border-border
										flex flex-wrap gap-2 lg:hidden
									"
									>
										{selectedRole === 'administrator' && adminPosition && (
											<button
												onClick={() => {
													setAdminPosition('');
													clearError();
													setLoginDisabledError('');
													setFormData({ username: '', password: '', otp: '' });
												}}
												className="
													flex items-center gap-1.5
													text-xs text-muted-foreground
													border border-border rounded-lg px-3 py-1.5
													hover:bg-accent transition-colors
												"
											>
												<RefreshCcw className="w-3 h-3" />
												Change position
											</button>
										)}
										<button
											onClick={() => {
												setSelectedRole('');
												setAdminPosition('');
												clearError();
												setLoginDisabledError('');
												setFormData({ username: '', password: '', otp: '' });
											}}
											className="
												flex items-center gap-1.5
												text-xs text-muted-foreground
												border border-border rounded-lg px-3 py-1.5
												hover:bg-accent transition-colors
											"
										>
											<ArrowLeft className="w-3 h-3" />
											Change role
										</button>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Footer */}
					<footer className="py-6 text-center border-t border-border bg-card/50">
						<p className="text-xs text-muted-foreground">
							&copy; {new Date().getFullYear()}{' '}
							{currentSchool?.name || 'Upstairs Christian Academy'}. All Rights
							Reserved.
						</p>
						<p className="text-[10px] text-muted-foreground/50 mt-1">
							Powered by{' '}
							<a
								href="https://school-mesh.vercel.app"
								className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
							>
								School Mesh
							</a>{' '}
							v2.4.0
						</p>
					</footer>
				</div>
			</div>

			{/* Recovery modal */}
			{showForgotPasswordModal && (
				<RecoveryModal
					selectedRole={selectedRole}
					school={currentSchool}
					onClose={() => setShowForgotPasswordModal(false)}
				/>
			)}
		</>
	);
};

export default LoginPage;
