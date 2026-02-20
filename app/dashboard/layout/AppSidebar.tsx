// AppSidebar.tsx
'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';

import { ChevronDown, LogOut } from 'lucide-react';
import useAuth from '@/store/useAuth';
import { generateNavigationItems } from '@/utils/componentsMap';
import { lockBodyScroll } from '@/utils/scrollLock';
import { useSchoolStore } from '@/store/schoolStore';
import { useOfflineNavigationStore } from '@/store/offlineNavigationStore';
import type { SchoolProfile } from '@/types/schoolProfile';
import type { Administrator } from '@/types';
import { PageLoading } from '@/components/loading';

interface NavItem {
	name: string;
	icon: any;
	href?: string;
	isLogout?: boolean;
	category?: string;
	subItems?: NavItem[];
	badgeCount?: number;
}

const getCurrentAcademicYear = () => {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;

	if (currentMonth >= 8) {
		return `${currentYear}-${currentYear + 1}`;
	} else {
		return `${currentYear - 1}-${currentYear}`;
	}
};

const normalizeAcademicYear = (value?: string | null) =>
	String(value || '')
		.replace(/\//g, '-')
		.trim();

const getAcademicYearCandidates = (value?: string | null) => {
	const normalized = normalizeAcademicYear(value);
	if (!normalized) return [];
	const slashVariant = normalized.replace(/-/g, '/');
	return slashVariant === normalized ? [normalized] : [normalized, slashVariant];
};

const getScopedYearArray = (
	byYear: Record<string, any[]>,
	academicYear: string,
): any[] | null => {
	const candidates = getAcademicYearCandidates(academicYear);
	for (const candidate of candidates) {
		if (Object.prototype.hasOwnProperty.call(byYear, candidate)) {
			return Array.isArray(byYear[candidate]) ? byYear[candidate] : [];
		}
	}
	return null;
};

const AppSidebar: React.FC = () => {
	const { user, logout } = useAuth();
	const router = useRouter();
	const {
		isExpanded,
		isMobileOpen,
		isHovered,
		setIsHovered,
		closeMobileSidebar,
	} = useSidebar();
	const pathname = usePathname();
	const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
	const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
		{}
	);
	const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const sidebarRef = useRef<HTMLElement>(null);
	const releaseBodyScrollLock = useRef<(() => void) | null>(null);
	const [initialSetupDone, setInitialSetupDone] = useState(false);
	const [navigationItems, setNavigationItems] = useState<NavItem[]>([]);
	const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(0);
	const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [sidebarTransitionsReady, setSidebarTransitionsReady] = useState(false);
	const { setOfflinePath, offlinePath } = useOfflineNavigationStore();
	const activePath = offlinePath || pathname;

	// Get current school profile
	const currentSchool = useSchoolStore(
		(state) => state.school
	) as SchoolProfile;
	const gradesByAcademicYear = useSchoolStore((state) => state.gradesByAcademicYear);
	const gradeRequestsByAcademicYear = useSchoolStore(
		(state) => state.gradeRequestsByAcademicYear
	);

	const role = user?.role;
	const adminPosition =
		user?.role === 'administrator'
			? (user as Administrator).position
			: undefined;

	const refreshPendingCounts = useCallback(() => {
		if (!user || user.role !== 'system_admin') {
			setPendingSubmissionsCount(0);
			setPendingRequestsCount(0);
			return;
		}

		const academicYear = normalizeAcademicYear(
			currentSchool?.currentAcademicYear || getCurrentAcademicYear()
		);
		if (!academicYear) {
			setPendingSubmissionsCount(0);
			setPendingRequestsCount(0);
			return;
		}

		const scopedGrades =
			getScopedYearArray(gradesByAcademicYear, academicYear) || [];
		const scopedRequests =
			getScopedYearArray(gradeRequestsByAcademicYear, academicYear) || [];

		const statusesBySubmission = new Map<string, Set<string>>();
		scopedGrades.forEach((grade: any) => {
			if (!grade?.submissionId) return;
			if (!statusesBySubmission.has(grade.submissionId)) {
				statusesBySubmission.set(grade.submissionId, new Set());
			}
			statusesBySubmission.get(grade.submissionId)?.add(grade.status);
		});

		const getSubmissionStatus = (statuses: Set<string>) => {
			if (statuses.size === 1) {
				return Array.from(statuses)[0];
			}
			const hasPending = statuses.has('Pending');
			const hasApproved = statuses.has('Approved');
			const hasRejected = statuses.has('Rejected');
			if (hasPending || (hasApproved && hasRejected)) {
				return 'Partially Approved';
			}
			if (hasApproved) return 'Approved';
			if (hasRejected) return 'Rejected';
			return 'Pending';
		};

		const pendingSubmissions = Array.from(statusesBySubmission.values()).filter(
			(statuses) => {
				const status = getSubmissionStatus(statuses);
				return status === 'Pending' || status === 'Partially Approved';
			}
		).length;
		const pendingRequests = scopedRequests.filter(
			(req: any) =>
				req?.status === 'Pending' || req?.status === 'Partially Approved'
		).length;

		setPendingSubmissionsCount(pendingSubmissions);
		setPendingRequestsCount(pendingRequests);
	}, [
		user,
		currentSchool?.currentAcademicYear,
		gradesByAcademicYear,
		gradeRequestsByAcademicYear,
	]);

	useEffect(() => {
		refreshPendingCounts();
	}, [refreshPendingCounts]);

	useEffect(() => {
		const frameId = window.requestAnimationFrame(() => {
			setSidebarTransitionsReady(true);
		});
		return () => window.cancelAnimationFrame(frameId);
	}, []);

	useEffect(() => {
		const handleRefresh = () => {
			refreshPendingCounts();
		};
		window.addEventListener('grading:counts:refresh', handleRefresh);
		return () => {
			window.removeEventListener('grading:counts:refresh', handleRefresh);
		};
	}, [refreshPendingCounts]);

	const prependDashboard = (href: string) => {
		if (!href) return href;
		if (href.startsWith('/dashboard') || href === '/logout') return href;
		return `/dashboard${href.startsWith('/') ? href : `/${href}`}`;
	};

	const isActive = useCallback(
		(href: string) => {
			const fullHref = prependDashboard(href);
			return fullHref === activePath;
		},
		[activePath]
	);

	// Close mobile sidebar when pathname changes (navigation occurs)
	useEffect(() => {
		if (isMobileOpen) {
			closeMobileSidebar();
		}
	}, [pathname, closeMobileSidebar]);

	// Prevent page scroll when mobile sidebar is open
	useEffect(() => {
		if (!isMobileOpen) {
			releaseBodyScrollLock.current?.();
			releaseBodyScrollLock.current = null;
			return;
		}

		releaseBodyScrollLock.current = lockBodyScroll();

		return () => {
			releaseBodyScrollLock.current?.();
			releaseBodyScrollLock.current = null;
		};
	}, [isMobileOpen]);

	// Handle click outside to close mobile sidebar
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				isMobileOpen &&
				sidebarRef.current &&
				!sidebarRef.current.contains(event.target as Node)
			) {
				closeMobileSidebar();
			}
		};

		// Add event listener when mobile sidebar is open
		if (isMobileOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		// Cleanup event listener
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isMobileOpen, closeMobileSidebar]);

	// Generate navigation items when school profile, user role, or admin position changes
	useEffect(() => {
		if (currentSchool && role) {
			try {
				const dynamicNavItems = generateNavigationItems(
					currentSchool,
					role,
					adminPosition
				);

				const unreadNotifications =
					user?.notifications?.filter((n) => !n.read && !n.dismissed).length ||
					0;

				// Add logout item
				const completeNavItems = [
					...dynamicNavItems,
					{
						name: 'Logout',
						icon: LogOut,
						href: '/logout',
						isLogout: true,
					},
				];

				// Prepend dashboard to all hrefs and add notification badge
				const processedNavItems = completeNavItems.map((item) => {
					const newItem = {
						...item,
						href: item.href ? prependDashboard(item.href) : undefined,
						subItems: item.subItems
							? item.subItems.map((sub) => {
									let badgeCount;
									if (sub.name === 'Grade Submissions') {
										badgeCount = pendingSubmissionsCount;
									} else if (sub.name === 'Grade Requests') {
										badgeCount = pendingRequestsCount;
									}
									return {
										...sub,
										href: sub.href ? prependDashboard(sub.href) : undefined,
										badgeCount:
											(badgeCount ?? 0) > 0 ? badgeCount : undefined,
									};
							  })
							: undefined,
						badgeCount:
							item.name === 'Notifications' && unreadNotifications > 0
								? unreadNotifications
								: undefined,
					};
					if (item.name === 'Academics') {
						const totalPending = pendingSubmissionsCount + pendingRequestsCount;
						newItem.badgeCount = totalPending > 0 ? totalPending : undefined;
					}
					if (role === 'system_admin') {
						if (item.name === 'Grading' || item.name === 'Grading System') {
							const totalPending =
								pendingSubmissionsCount + pendingRequestsCount;
							newItem.badgeCount = totalPending > 0 ? totalPending : undefined;
						}
					}
					return newItem;
				});

				setNavigationItems(processedNavItems);
			} catch (error) {
				console.error('Error generating navigation items:', error);
				// Fallback to basic navigation
				setNavigationItems([
					{
						name: 'Dashboard',
						icon: LogOut, // This would be LayoutDashboard, but using LogOut as placeholder
						href: '/dashboard',
					},
					{
						name: 'Logout',
						icon: LogOut,
						href: '/logout',
						isLogout: true,
					},
				]);
			}
		}
	}, [
		currentSchool,
		role,
		adminPosition,
		user?.notifications,
		pendingSubmissionsCount,
		pendingRequestsCount,
	]);

	const handleSubmenuToggle = (itemName: string) => {
		setOpenSubmenu((prev) => (prev === itemName ? null : itemName));
	};

	// Auto-expand submenu if current page is in it
	useEffect(() => {
		if (!initialSetupDone && navigationItems.length > 0) {
			let foundActiveSubmenu = false;
			navigationItems.forEach((nav) => {
				nav.subItems?.forEach((sub) => {
					if (sub.href && isActive(sub.href) && !foundActiveSubmenu) {
						setOpenSubmenu(nav.name);
						foundActiveSubmenu = true;
					}
				});
			});
			setInitialSetupDone(true);
		}
	}, [initialSetupDone, navigationItems, isActive]);

	// Update submenu height when it opens
	useEffect(() => {
		if (openSubmenu) {
			const ref = subMenuRefs.current[openSubmenu];
			if (ref) {
				setSubMenuHeight((prev) => ({
					...prev,
					[openSubmenu]: ref.scrollHeight,
				}));
			}
		}
	}, [openSubmenu]);

	const handleLogout = async () => {
		setIsLoggingOut(true);
		try {
			await logout();
			router.replace('/login');
		} catch (error) {
			console.error('Logout error:', error);
			setIsLoggingOut(false);
		}
	};

	const shouldHandleClientNavigation = (event: React.MouseEvent) => {
		if (event.defaultPrevented) return false;
		if (event.button !== 0) return false;
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return false;
		}
		return true;
	};

	const handleClientNavigate = (href: string) => {
		setOfflinePath(href);
		if (typeof window !== 'undefined') {
			window.history.pushState(null, '', href);
		}
		if (isMobileOpen) {
			closeMobileSidebar();
		}
	};

	const shouldShowLabels = isExpanded || isHovered || isMobileOpen;

	const renderMenuItems = (items: NavItem[]) => (
		<ul className="flex flex-col gap-1">
			{items.map((item) => {
				const subItems = item.subItems;
				const isItemActive = item.href ? isActive(item.href) : false;
				const hasActiveSubItem = subItems?.some(
					(sub) => sub.href && isActive(sub.href)
				);
				const isSubmenuOpen = openSubmenu === item.name;
				const isPrimaryActive = isItemActive || hasActiveSubItem || isSubmenuOpen;
				const primaryItemClass = `group relative flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-theme-sm font-medium transition-all duration-200 ${
					isPrimaryActive
						? 'border-brand-200 bg-brand-50 text-brand-700 shadow-theme-xs dark:border-brand-500/35 dark:bg-brand-500/15 dark:text-brand-300'
						: 'border-transparent text-gray-700 hover:border-brand-100 hover:bg-brand-25 hover:text-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-white/5 dark:hover:text-white'
				} ${
					!shouldShowLabels
						? 'lg:justify-center lg:px-1.5 lg:py-2.5'
						: 'lg:justify-start'
				}`;
				const iconClass = `grid size-8 shrink-0 place-items-center rounded-lg border transition-colors duration-200 ${
					isPrimaryActive
						? 'border-brand-200 bg-brand-100 text-brand-600 dark:border-brand-500/35 dark:bg-brand-500/15 dark:text-brand-300'
						: 'border-gray-200 bg-white text-gray-500 group-hover:border-brand-100 group-hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:border-brand-500/35 dark:group-hover:text-brand-300'
				}`;
				const badgeClass =
					'ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-brand-300 bg-brand-500 px-1.5 text-[10px] font-semibold leading-none text-white shadow-sm dark:border-brand-400/50 dark:bg-brand-500';

				return (
					<li key={item.name}>
						{subItems ? (
							<button
								onClick={() => handleSubmenuToggle(item.name)}
								className={primaryItemClass}
							>
								{isPrimaryActive && (
									<span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-500 dark:bg-brand-400" />
								)}
								<span className={iconClass}>
									<item.icon className="w-5 h-5" />
								</span>
								{shouldShowLabels && (
									<span className="min-w-0 flex-1 text-left leading-5 break-words">
										{item.name}
									</span>
								)}
								{shouldShowLabels && item.badgeCount && item.badgeCount > 0 && (
									<span className={badgeClass}>{item.badgeCount}</span>
								)}
								{shouldShowLabels && (
									<ChevronDown
										className={`ml-2 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
											isSubmenuOpen
												? 'rotate-180 text-brand-600 dark:text-brand-300'
												: ''
										}`}
									/>
								)}
							</button>
						) : item.href ? (
							item.isLogout ? (
								<button
									onClick={handleLogout}
									className={`group relative flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-theme-sm font-medium text-error-600 transition-all duration-200 hover:border-error-200 hover:bg-error-50 dark:text-error-400 dark:hover:border-error-500/35 dark:hover:bg-error-500/15 ${
										!shouldShowLabels
											? 'lg:justify-center lg:px-0 lg:py-2.5'
											: 'lg:justify-start'
									}`}
								>
									<span className="grid size-8 shrink-0 place-items-center rounded-lg border border-error-200 bg-error-50 text-error-500 dark:border-error-500/35 dark:bg-error-500/15 dark:text-error-400">
										<item.icon className="w-5 h-5" />
									</span>
									{shouldShowLabels && (
										<span className="min-w-0 flex-1 text-left leading-5 break-words">
											{item.name}
										</span>
									)}
								</button>
							) : (
								<Link
									href={item.href}
									onClick={(event) => {
										if (!shouldHandleClientNavigation(event)) return;
										event.preventDefault();
										handleClientNavigate(item.href!);
									}}
									className={primaryItemClass}
								>
									{isPrimaryActive && (
										<span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-500 dark:bg-brand-400" />
									)}
									<span className={iconClass}>
										<item.icon className="w-5 h-5" />
									</span>
									{shouldShowLabels && (
										<span className="min-w-0 flex-1 text-left leading-5 break-words">
											{item.name}
										</span>
									)}
									{shouldShowLabels &&
										item.badgeCount &&
										item.badgeCount > 0 && (
											<span className={badgeClass}>{item.badgeCount}</span>
										)}
								</Link>
							)
						) : null}

						{subItems && shouldShowLabels && (
							<div
								ref={(el) => {
									subMenuRefs.current[item.name] = el;
								}}
								className="overflow-hidden transition-all duration-300 ease-in-out"
								style={{
									height: isSubmenuOpen
										? `${subMenuHeight[item.name] || 'auto'}px`
										: '0px',
								}}
							>
								<div className="mt-2 rounded-xl border border-brand-100 bg-brand-25/80 p-2 dark:border-gray-700 dark:bg-gray-900/65">
									<ul className="space-y-1">
										{subItems.map((sub, index) => (
											<li key={`${sub.href || sub.name}-${index}`}>
												<Link
													href={sub.href!}
													onClick={(event) => {
														if (!shouldHandleClientNavigation(event)) return;
														event.preventDefault();
														handleClientNavigate(sub.href!);
													}}
													className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 pr-8 text-theme-sm transition-all duration-200 overflow-visible ${
														isActive(sub.href!)
															? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
															: 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
													}`}
												>
													{sub.icon && (
														<sub.icon
															className={`h-4 w-4 shrink-0 ${
																isActive(sub.href!)
																	? 'text-brand-600 dark:text-brand-300'
																	: 'text-gray-400 dark:text-gray-500'
															}`}
														/>
													)}
													<span className="min-w-0 flex-1 leading-5 break-words">
														{sub.name}
													</span>
													{sub.badgeCount && sub.badgeCount > 0 && (
														<span className="absolute right-2 top-1/2 inline-flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-full border border-brand-300 bg-brand-500 px-1 text-[10px] font-semibold leading-none text-white shadow-sm dark:border-brand-400/50 dark:bg-brand-500">
															{sub.badgeCount}
														</span>
													)}
												</Link>
											</li>
										))}
									</ul>
								</div>
							</div>
						)}
					</li>
				);
			})}
		</ul>
	);

	const sidebarWidthClass =
		isExpanded || isMobileOpen
			? 'w-[260px] sm:w-[290px]'
			: isHovered
			? 'w-[260px] sm:w-[290px]'
			: 'w-[90px]';
	const sidebarTransitionClass = sidebarTransitionsReady
		? 'transform-gpu transition-[width,transform] duration-300 ease-in-out will-change-[width,transform] motion-reduce:transition-none'
		: 'transition-none';
	const sidebarTranslateClass = isMobileOpen
		? 'translate-x-0'
		: '-translate-x-full';
	const sidebarSurfaceClass = isMobileOpen
		? 'bg-white dark:bg-gray-900'
		: 'bg-gradient-to-b from-white via-brand-25/40 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-950';

	// Show loading state if user or school is being fetched
	if (isLoggingOut) {
		return <PageLoading variant="school" message="Signing out..." />;
	}

	if (user === undefined || !currentSchool) {
		return (
			<aside
				className={`fixed top-[var(--app-header-height,4rem)] left-0 z-50 h-[calc(100dvh-var(--app-header-height,4rem))] lg:top-0 lg:h-dvh overflow-hidden border-r border-gray-200 text-gray-900 shadow-theme-lg dark:border-gray-800 dark:text-gray-100 rounded-tr-2xl rounded-br-2xl lg:rounded-tr-none lg:rounded-br-none ${sidebarSurfaceClass} ${sidebarTransitionClass} ${sidebarWidthClass} ${sidebarTranslateClass} lg:translate-x-0`}
			>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute -top-20 -left-16 hidden h-44 w-44 rounded-full bg-brand-200/35 blur-3xl dark:bg-brand-500/20 lg:block"
				/>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute bottom-[-5.5rem] right-[-3rem] hidden h-40 w-40 rounded-full bg-brand-100/55 blur-3xl dark:bg-brand-500/10 lg:block"
				/>
				<div className="relative z-10 flex h-full flex-col px-4 sm:px-5 py-5">
					<div className="hidden lg:flex items-center gap-3 rounded-xl border border-brand-100 bg-white/90 p-3 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900/70">
						<div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse">
							<div className="h-full w-full rounded-lg bg-gray-300/60 dark:bg-gray-600/60" />
						</div>
						<div className="flex-1">
							<div className="mb-2 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
							<div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
						</div>
					</div>
					<div className="flex flex-1 items-center justify-center">
						<div className="animate-pulse rounded-xl border border-brand-100 bg-white/90 px-4 py-2 text-theme-sm font-medium text-gray-500 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-400">
							Loading navigation...
						</div>
					</div>
				</div>
			</aside>
		);
	}

	return (
		<aside
			ref={sidebarRef}
			className={`fixed top-[var(--app-header-height,4rem)] left-0 z-50 h-[calc(100dvh-var(--app-header-height,4rem))] lg:top-0 lg:h-dvh overflow-hidden border-r border-gray-200 text-gray-900 shadow-theme-lg dark:border-gray-800 dark:text-gray-100 rounded-tr-2xl rounded-br-2xl lg:rounded-tr-none lg:rounded-br-none ${sidebarSurfaceClass} ${sidebarTransitionClass} ${sidebarWidthClass} ${sidebarTranslateClass} lg:translate-x-0`}
			onMouseEnter={() => !isExpanded && setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -top-20 -left-16 hidden h-44 w-44 rounded-full bg-brand-200/35 blur-3xl dark:bg-brand-500/20 lg:block"
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute bottom-[-5.5rem] right-[-3rem] hidden h-40 w-40 rounded-full bg-brand-100/55 blur-3xl dark:bg-brand-500/10 lg:block"
			/>

			<div className="relative z-10 flex h-full flex-col px-4 sm:px-5 pb-5 pt-4">
				<Link
					className={`hidden lg:flex items-center rounded-xl border border-brand-100 bg-white/90 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900/70 ${
						shouldShowLabels
							? 'mb-5 gap-3 px-3 py-3 justify-start'
							: 'mb-5 justify-center px-2.5 py-2.5'
					}`}
					href="/"
				>
					<div
						className={`grid place-items-center rounded-xl border border-brand-100 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 ${
							sidebarTransitionsReady
								? 'transition-all duration-300'
								: 'transition-none'
						} ${shouldShowLabels ? 'h-12 w-12' : 'h-14 w-14'}`}
					>
						<img
							src={currentSchool?.logoUrl}
							alt="School logo"
							className="h-10 w-10 object-contain"
						/>
					</div>
					{shouldShowLabels && (
						<div>
							<h1 className="text-base font-bold tracking-[0.02em] text-gray-900 dark:text-gray-100">
								{currentSchool.shortName}
							</h1>
							<p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
								{currentSchool?.slogan || 'Excellence in Education'}
							</p>
						</div>
					)}
				</Link>
				<div className="left-scrollbar flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain">
					<div className="direction-ltr">
						<nav className="flex-1 min-w-0">{renderMenuItems(navigationItems)}</nav>
					</div>
				</div>
			</div>
		</aside>
	);
};

export default AppSidebar;
