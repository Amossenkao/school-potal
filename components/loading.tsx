'use client';

import React from 'react';
import { Loader2, GraduationCap, Home, ArrowLeft } from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

export const PageLoading = ({
	message = 'Loading...',
	fullScreen = true,
	variant = 'default',
	size = 'md',
}: PageLoadingProps) => {
	const sizeClasses = {
		sm: 'w-6 h-6',
		md: 'w-8 h-8',
		lg: 'w-12 h-12',
	};
	const currentSchool = useSchoolStore((state) => state.school);
	const pathname = usePathname();

	const containerClasses = fullScreen
		? 'fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50'
		: 'flex items-center justify-center p-8';

	const renderSpinner = () => {
		switch (variant) {
			case 'minimal':
				return (
					<div className="flex flex-col items-center space-y-4">
						<Loader2
							className={`${sizeClasses[size]} animate-spin text-primary`}
						/>
						{message && (
							<p className="text-sm text-muted-foreground font-medium">
								{message}
							</p>
						)}
					</div>
				);

			case 'dots':
				return (
					<div className="flex flex-col items-center space-y-6">
						<div className="flex space-x-2">
							<div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
							<div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
							<div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
						</div>
						{message && (
							<p className="text-sm text-muted-foreground font-medium">
								{message}
							</p>
						)}
					</div>
				);

			case 'pulse':
				return (
					<div className="flex flex-col items-center space-y-6">
						<div className="relative">
							<div className="w-16 h-16 bg-primary rounded-full animate-pulse"></div>
							<div className="absolute inset-0 w-16 h-16 bg-primary rounded-full animate-ping opacity-25"></div>
						</div>
						{message && (
							<p className="text-sm text-muted-foreground font-medium">
								{message}
							</p>
						)}
					</div>
				);

			case 'school': {
				const isUpstairs =
					currentSchool &&
					(currentSchool.name?.toLowerCase().includes('upstairs') ||
						currentSchool.shortName?.toLowerCase().includes('upstairs'));

				return (
					<div className="flex flex-col items-center space-y-6">
						<div className="relative">
							<div className="w-35 h-35 bg-primary/10 rounded-full flex items-center justify-center">
								{isUpstairs ? (
									<GraduationCap className="w-20 h-20 text-primary animate-pulse" />
								) : currentSchool?.logoUrl ? (
									<>
										<img
											src={currentSchool.logoUrl}
											alt={`${currentSchool.name || 'School'} Logo`}
											className="w-25  object-contain rounded-full"
											onError={(e) => {
												// Hide image and show graduation cap on error
												e.currentTarget.style.display = 'none';
												const fallback = e.currentTarget
													.nextElementSibling as HTMLElement;
												if (fallback) {
													fallback.classList.remove('hidden');
												}
											}}
										/>
										<GraduationCap className="w-20 h-20 text-primary animate-pulse hidden" />
									</>
								) : (
									<GraduationCap className="w-20 h-20 text-primary animate-pulse" />
								)}
							</div>
							<div className="absolute inset-0 w-35 h-35 border-4 border-primary/20 rounded-full animate-spin border-t-primary"></div>
						</div>
						<div className="text-center">
							<p className="text-lg font-semibold text-foreground mb-1">
								{currentSchool?.shortName || 'School'} e-Portal System
							</p>
							{message && (
								<p className="text-sm text-muted-foreground">{message}</p>
							)}
						</div>
					</div>
				);
			}

			case 'not-found':
				return (
					<div className="flex flex-col items-center space-y-8 max-w-md mx-auto">
						<div className="relative">
							<div className="w-32 h-32 bg-destructive/10 rounded-full flex items-center justify-center">
								<span className="text-6xl font-bold text-destructive animate-pulse">
									404
								</span>
							</div>
							<div className="absolute inset-0 w-32 h-32 border-4 border-destructive/20 rounded-full animate-spin border-t-destructive"></div>
						</div>
						<div className="text-center space-y-4">
							<h1 className="text-3xl font-bold text-foreground">
								Page Not Found
							</h1>
							<p className="text-muted-foreground">
								{message || 'The page you are looking for does not exist.'}
							</p>
							<div className="pt-4">
								<Link
									href="/"
									className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
								>
									<Home className="w-4 h-4" />
									Go Home
								</Link>
							</div>
						</div>
					</div>
				);

			case 'dashboard-not-found':
				return (
					<div className="flex flex-col items-center space-y-8 max-w-md mx-auto">
						<div className="relative">
							<div className="w-32 h-32 bg-destructive/10 rounded-full flex items-center justify-center">
								<span className="text-6xl font-bold text-destructive animate-pulse">
									404
								</span>
							</div>
							<div className="absolute inset-0 w-32 h-32 border-4 border-destructive/20 rounded-full animate-spin border-t-destructive"></div>
						</div>
						<div className="text-center space-y-4">
							<h1 className="text-3xl font-bold text-foreground">
								Dashboard Page Not Found
							</h1>
							<p className="text-muted-foreground mb-2">
								{message ||
									'The dashboard page you are looking for does not exist.'}
							</p>
							<div className="flex flex-col sm:flex-row gap-3 pt-4">
								<Link
									href={'/dashboard'}
									className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
								>
									<ArrowLeft className="w-4 h-4" />
									Go Back
								</Link>
							</div>
						</div>
					</div>
				);

			default:
				return (
					<div className="flex flex-col items-center space-y-6">
						<div className="relative">
							<div className="w-16 h-16 border-4 border-border rounded-full"></div>
							<div className="absolute inset-0 w-16 h-16 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
						</div>
						<div className="text-center space-y-2">
							<div className="flex items-center space-x-2">
								<div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
								<p className="text-lg font-medium text-foreground">{message}</p>
								<div className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:0.5s]"></div>
							</div>
							<p className="text-xs text-muted-foreground">
								Please wait while we load your content
							</p>
						</div>
					</div>
				);
		}
	};

	return (
		<div className={containerClasses}>
			<div className="text-center">{renderSpinner()}</div>
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
