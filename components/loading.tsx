'use client';

import React from 'react';
import { AlertCircle, ArrowLeft, GraduationCap, Home } from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';
import Link from 'next/link';

interface PageLoadingProps {
	message?: string;
	fullScreen?: boolean;
	variant?:
		| 'default'
		| 'minimal'
		| 'dots'
		| 'pulse'
		| 'school'
		| 'not-found'
		| 'dashboard-not-found';
	size?: 'sm' | 'md' | 'lg';
}

// 1. Move SpinnerCore OUTSIDE of PageLoading
const SpinnerCore = ({
	showSchoolBrand = false,
	compact = false,
	currentSchool,
	sizeClass,
	message,
}: {
	showSchoolBrand?: boolean;
	compact?: boolean;
	currentSchool: any;
	sizeClass: string;
	message?: string;
}) => {
	const logo = currentSchool?.logoUrl;
	const schoolShortName = currentSchool?.shortName || currentSchool?.name || '';
	const shouldShowSchoolBrand = Boolean(showSchoolBrand && schoolShortName);

	return (
		<div className="flex flex-col items-center gap-4">
			<div className={`loader-shell ${sizeClass}`}>
				<div className="loader-ring loader-ring-outer" />
				<div className="loader-ring loader-ring-middle" />
				<div className="loader-ring loader-ring-inner" />
				<div className="loader-center">
					{logo ? (
						<div className="relative h-7 w-7">
							<img
								src={logo}
								alt={`${schoolShortName || 'School'} logo`}
								className="h-7 w-7 rounded-full object-cover"
								loading="eager"
								decoding="async"
								onError={(event) => {
									event.currentTarget.style.display = 'none';
									const fallback = event.currentTarget
										.nextElementSibling as HTMLElement | null;
									if (fallback) {
										fallback.style.display = 'grid';
									}
								}}
							/>
							<span className="hidden h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">
								<GraduationCap className="h-4 w-4" />
							</span>
						</div>
					) : currentSchool ? (
						<span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">
							<GraduationCap className="h-4 w-4" />
						</span>
					) : null}
				</div>
			</div>
			{showSchoolBrand && !compact && (
				<p className="text-sm font-semibold tracking-wide text-foreground">
					{schoolShortName} e-Portal
				</p>
			)}
			{message && (
				<p className="max-w-xs text-center text-sm text-muted-foreground">
					{message}
				</p>
			)}
		</div>
	);
};

export const PageLoading = ({
	message = '',
	fullScreen = true,
	variant = 'default',
	size = 'md',
}: PageLoadingProps) => {
	const sizeClasses = {
		sm: 'h-12 w-12',
		md: 'h-16 w-16',
		lg: 'h-20 w-20',
	};

	const currentSchool = useSchoolStore((state) => state.school);

	const containerClasses = fullScreen
		? 'fixed inset-0 z-50 flex items-center justify-center bg-background/92 px-4'
		: 'flex items-center justify-center p-6';

	const renderContent = () => {
		switch (variant) {
			case 'minimal':
				// 2. Pass the necessary props to the extracted component
				return (
					<SpinnerCore
						compact
						currentSchool={currentSchool}
						sizeClass={sizeClasses[size]}
						message={message}
					/>
				);

			case 'dots':
				return (
					<div className="flex flex-col items-center gap-5">
						<div className="flex items-center gap-2">
							<span className="loader-dot" />
							<span className="loader-dot loader-dot-delay-1" />
							<span className="loader-dot loader-dot-delay-2" />
						</div>
						{message && (
							<p className="text-sm text-muted-foreground">{message}</p>
						)}
					</div>
				);

			case 'pulse':
				return (
					<div className="flex flex-col items-center gap-4">
						<div className="loader-pulse" />
						{message && (
							<p className="text-sm text-muted-foreground">{message}</p>
						)}
					</div>
				);

			case 'school':
				return (
					<div className="w-full max-w-sm rounded-3xl border border-border/70 bg-card/95 px-6 py-7 text-center shadow-sm">
						<SpinnerCore
							showSchoolBrand
							currentSchool={currentSchool}
							sizeClass={sizeClasses[size]}
							message={message}
						/>
					</div>
				);

			case 'not-found':
				return (
					<div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
						<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
							<AlertCircle className="h-8 w-8 text-destructive" />
						</div>
						<h1 className="text-2xl font-semibold text-foreground">
							Page Not Found
						</h1>
						<p className="text-sm text-muted-foreground">
							{message || 'The page you requested is unavailable.'}
						</p>
						<Link
							href="/"
							className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						>
							<Home className="h-4 w-4" />
							Go Home
						</Link>
					</div>
				);

			case 'dashboard-not-found':
				return (
					<div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
						<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
							<GraduationCap className="h-8 w-8 text-primary" />
						</div>
						<h1 className="text-2xl font-semibold text-foreground">
							Dashboard Page Not Found
						</h1>
						<p className="text-sm text-muted-foreground">
							{message ||
								'This dashboard section is unavailable for your account.'}
						</p>
						<Link
							href="/dashboard"
							className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to Dashboard
						</Link>
					</div>
				);

			default:
				return (
					<SpinnerCore
						compact={variant !== 'school'}
						currentSchool={currentSchool}
						sizeClass={sizeClasses[size]}
						message={message}
					/>
				);
		}
	};

	return (
		<div className={containerClasses} role="status" aria-live="polite">
			<div className="text-center">{renderContent()}</div>
		</div>
	);
};

// Loading skeleton for specific content areas
export const ContentLoading = ({
	lines = 3,
	className = '',
}: {
	lines?: number;
	className?: string;
}) => (
	<div className={`animate-pulse space-y-4 ${className}`}>
		{Array.from({ length: lines }).map((_, i) => (
			<div key={i} className="space-y-2">
				<div className="h-4 bg-muted rounded w-3/4"></div>
				<div className="h-4 bg-muted rounded w-1/2"></div>
			</div>
		))}
	</div>
);

// Card loading skeleton
export const CardLoading = ({ count = 1 }: { count?: number }) => (
	<div className="grid gap-4">
		{Array.from({ length: count }).map((_, i) => (
			<div
				key={i}
				className="border border-border rounded-lg p-6 animate-pulse"
			>
				<div className="flex items-center space-x-4 mb-4">
					<div className="w-12 h-12 bg-muted rounded-full"></div>
					<div className="space-y-2 flex-1">
						<div className="h-4 bg-muted rounded w-1/3"></div>
						<div className="h-3 bg-muted rounded w-1/2"></div>
					</div>
				</div>
				<div className="space-y-2">
					<div className="h-4 bg-muted rounded"></div>
					<div className="h-4 bg-muted rounded w-5/6"></div>
					<div className="h-4 bg-muted rounded w-4/6"></div>
				</div>
			</div>
		))}
	</div>
);

// Table loading skeleton
export const TableLoading = ({
	rows = 5,
	cols = 4,
}: {
	rows?: number;
	cols?: number;
}) => (
	<div className="border border-border rounded-lg overflow-hidden">
		<div className="bg-muted/50">
			<div className="grid grid-cols-4 gap-4 p-4">
				{Array.from({ length: cols }).map((_, i) => (
					<div key={i} className="h-4 bg-muted rounded animate-pulse"></div>
				))}
			</div>
		</div>
		<div className="divide-y divide-border">
			{Array.from({ length: rows }).map((_, i) => (
				<div key={i} className="grid grid-cols-4 gap-4 p-4 animate-pulse">
					{Array.from({ length: cols }).map((_, j) => (
						<div key={j} className="h-4 bg-muted rounded"></div>
					))}
				</div>
			))}
		</div>
	</div>
);
