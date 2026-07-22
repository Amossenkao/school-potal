'use client';
import React, {
	useEffect,
	useRef,
	useState,
	useCallback,
	useMemo,
	memo,
} from 'react';
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

// ── Utilities ────────────────────────────────────────────────────────────────

const getCurrentAcademicYear = () => {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;
	return currentMonth >= 8
		? `${currentYear}-${currentYear + 1}`
		: `${currentYear - 1}-${currentYear}`;
};

const normalizeAcademicYear = (value?: string | null) =>
	String(value || '')
		.replace(/\//g, '-')
		.trim();

const getAcademicYearCandidates = (value?: string | null) => {
	const normalized = normalizeAcademicYear(value);
	if (!normalized) return [];
	const slashVariant = normalized.replace(/-/g, '/');
	return slashVariant === normalized
		? [normalized]
		: [normalized, slashVariant];
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

const prependDashboard = (href: string) => {
	if (!href) return href;
	if (href.startsWith('/dashboard') || href === '/logout') return href;
	return `/dashboard${href.startsWith('/') ? href : `/${href}`}`;
};

// ── Memoized sub-components ───────────────────────────────────────────────────

interface BadgeProps {
	count: number;
}
const Badge = memo(({ count }: BadgeProps) => (
	<span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-brand-300 bg-brand-500 px-1.5 text-[10px] font-semibold leading-none text-white shadow-sm dark:border-brand-400/50 dark:bg-brand-500">
		{count}
	</span>
));
Badge.displayName = 'Badge';

interface SubMenuItemProps {
	item: NavItem;
	isActive: boolean;
	onNavigate: (href: string) => void;
}
const SubMenuItem = memo(({ item, isActive, onNavigate }: SubMenuItemProps) => {
	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			if (
				e.defaultPrevented ||
				e.button !== 0 ||
				e.metaKey ||
				e.ctrlKey ||
				e.shiftKey ||
				e.altKey
			)
				return;
			e.preventDefault();
			onNavigate(item.href!);
		},
		[item.href, onNavigate],
	);

	return (
		<li>
			<Link
				href={item.href!}
				onClick={handleClick}
				className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 pr-8 text-theme-sm transition-colors duration-150 overflow-visible ${
					isActive
						? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
						: 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
				}`}
			>
				{item.icon && (
					<item.icon
						className={`h-4 w-4 shrink-0 ${
							isActive
								? 'text-brand-600 dark:text-brand-300'
								: 'text-gray-400 dark:text-gray-500'
						}`}
					/>
				)}
				<span className="min-w-0 flex-1 leading-5 break-words">
					{item.name}
				</span>
				{item.badgeCount && item.badgeCount > 0 && (
					<span className="absolute right-2 top-1/2 inline-flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-full border border-brand-300 bg-brand-500 px-1 text-[10px] font-semibold leading-none text-white shadow-sm dark:border-brand-400/50 dark:bg-brand-500">
						{item.badgeCount}
					</span>
				)}
			</Link>
		</li>
	);
});
SubMenuItem.displayName = 'SubMenuItem';

interface NavItemComponentProps {
	item: NavItem;
	showLabels: boolean;
	isActive: (href: string) => boolean;
	openSubmenu: string | null;
	onSubmenuToggle: (name: string) => void;
	onNavigate: (href: string, opts?: { keepSubmenuOpen?: boolean }) => void;
	onLogout: () => void;
}

const NavItemComponent = memo(
	({
		item,
		showLabels,
		isActive,
		openSubmenu,
		onSubmenuToggle,
		onNavigate,
		onLogout,
	}: NavItemComponentProps) => {
		const subMenuRef = useRef<HTMLDivElement>(null);
		const subItems = item.subItems;
		const isItemActive = item.href ? isActive(item.href) : false;
		const hasActiveSubItem = subItems?.some(
			(sub) => sub.href && isActive(sub.href),
		);
		const isSubmenuOpen = openSubmenu === item.name;
		const isPrimaryActive = isItemActive || hasActiveSubItem || isSubmenuOpen;

		// Use CSS max-height transition instead of JS-measured height — no layout thrash
		// Compute an accurate max-height from item count so the animation duration
		// matches actual content height (avoids the janky "dead time" of 600px → 50px).
		const SUBMENU_ITEM_HEIGHT = 44; // px: py-2 + text + gap
		const SUBMENU_PADDING = 24; // px: container padding + border
		const submenuStyle = useMemo(
			() => ({
				maxHeight: isSubmenuOpen
					? `${subItems.length * SUBMENU_ITEM_HEIGHT + SUBMENU_PADDING}px`
					: '0px',
				overflow: 'hidden',
				opacity: isSubmenuOpen ? 1 : 0,
				transition: isSubmenuOpen
					? 'max-height 250ms ease-out, opacity 180ms ease-out'
					: 'max-height 200ms ease-in, opacity 120ms ease-in',
			}),
			[isSubmenuOpen, subItems.length],
		);

		const primaryItemClass = `group relative flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-theme-sm font-medium transition-colors duration-150 ${
			isPrimaryActive
				? 'border-brand-200 bg-brand-50 text-brand-700 shadow-theme-xs dark:border-brand-500/35 dark:bg-brand-500/15 dark:text-brand-300'
				: 'border-transparent text-gray-700 hover:border-brand-100 hover:bg-brand-25 hover:text-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-white/5 dark:hover:text-white'
		} ${!showLabels ? 'lg:justify-center lg:px-1.5 lg:py-2.5' : 'lg:justify-start'}`;

		const iconClass = `grid size-8 shrink-0 place-items-center rounded-lg border transition-colors duration-150 ${
			isPrimaryActive
				? 'border-brand-200 bg-brand-100 text-brand-600 dark:border-brand-500/35 dark:bg-brand-500/15 dark:text-brand-300'
				: 'border-gray-200 bg-white text-gray-500 group-hover:border-brand-100 group-hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:border-brand-500/35 dark:group-hover:text-brand-300'
		}`;

		const handleLinkClick = useCallback(
			(e: React.MouseEvent) => {
				if (
					e.defaultPrevented ||
					e.button !== 0 ||
					e.metaKey ||
					e.ctrlKey ||
					e.shiftKey ||
					e.altKey
				)
					return;
				e.preventDefault();
				onNavigate(item.href!);
			},
			[item.href, onNavigate],
		);

		const handleSubNavigate = useCallback(
			(href: string) => {
				onNavigate(href, { keepSubmenuOpen: true });
			},
			[onNavigate],
		);

		if (subItems) {
			return (
				<li>
					<button
						onClick={() => onSubmenuToggle(item.name)}
						className={primaryItemClass}
					>
						{isPrimaryActive && (
							<span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-500 dark:bg-brand-400" />
						)}
						<span className={iconClass}>
							<item.icon className="w-5 h-5" />
						</span>
						{showLabels && (
							<span className="min-w-0 flex-1 text-left leading-5 break-words">
								{item.name}
							</span>
						)}
						{showLabels && item.badgeCount && item.badgeCount > 0 && (
							<Badge count={item.badgeCount} />
						)}
						{showLabels && (
							<ChevronDown
								className={`ml-2 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
									isSubmenuOpen
										? 'rotate-180 text-brand-600 dark:text-brand-300'
										: ''
								}`}
							/>
						)}
					</button>

					{showLabels && (
						<div ref={subMenuRef} style={submenuStyle}>
							<div className="mt-2 rounded-xl border border-brand-100 bg-brand-25/80 p-2 dark:border-gray-700 dark:bg-gray-900/65">
								<ul className="space-y-1">
									{subItems.map((sub, index) => (
										<SubMenuItem
											key={`${sub.href || sub.name}-${index}`}
											item={sub}
											isActive={!!(sub.href && isActive(sub.href))}
											onNavigate={handleSubNavigate}
										/>
									))}
								</ul>
							</div>
						</div>
					)}
				</li>
			);
		}

		if (item.href && item.isLogout) {
			return (
				<li>
					<button
						onClick={() => {
							onLogout();
						}}
						className={`group relative flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-theme-sm font-medium text-error-600 transition-colors duration-150 hover:border-error-200 hover:bg-error-50 dark:text-error-400 dark:hover:border-error-500/35 dark:hover:bg-error-500/15 ${
							!showLabels
								? 'lg:justify-center lg:px-0 lg:py-2.5'
								: 'lg:justify-start'
						}`}
					>
						<span className="grid size-8 shrink-0 place-items-center rounded-lg border border-error-200 bg-error-50 text-error-500 dark:border-error-500/35 dark:bg-error-500/15 dark:text-error-400">
							<item.icon className="w-5 h-5" />
						</span>
						{showLabels && (
							<span className="min-w-0 flex-1 text-left leading-5 break-words">
								{item.name}
							</span>
						)}
					</button>
				</li>
			);
		}

		if (item.href) {
			return (
				<li>
					<Link
						href={item.href}
						onClick={handleLinkClick}
						className={primaryItemClass}
					>
						{isPrimaryActive && (
							<span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-500 dark:bg-brand-400" />
						)}
						<span className={iconClass}>
							<item.icon className="w-5 h-5" />
						</span>
						{showLabels && (
							<span className="min-w-0 flex-1 text-left leading-5 break-words">
								{item.name}
							</span>
						)}
						{showLabels && item.badgeCount && item.badgeCount > 0 && (
							<Badge count={item.badgeCount} />
						)}
					</Link>
				</li>
			);
		}

		return null;
	},
);
NavItemComponent.displayName = 'NavItemComponent';

// ── Main component ────────────────────────────────────────────────────────────

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
	const sidebarRef = useRef<HTMLElement>(null);
	const releaseBodyScrollLock = useRef<(() => void) | null>(null);
	const [initialSetupDone, setInitialSetupDone] = useState(false);
	const [navigationItems, setNavigationItems] = useState<NavItem[]>([]);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [sidebarTransitionsReady, setSidebarTransitionsReady] = useState(false);

	const { setOfflinePath, offlinePath } = useOfflineNavigationStore();
	const activePath = offlinePath || pathname;

	const currentSchool = useSchoolStore(
		(state) => state.school,
	) as SchoolProfile;
	const gradesByAcademicYear = useSchoolStore(
		(state) => state.gradesByAcademicYear,
	);
	const gradeRequestsByAcademicYear = useSchoolStore(
		(state) => state.gradeRequestsByAcademicYear,
	);

	const role = user?.role;
	const adminPosition =
		user?.role === 'administrator'
			? (user as Administrator).position
			: undefined;

	// ── Active path check ─────────────────────────────────────────────────────
	const isActive = useCallback(
		(href: string) => prependDashboard(href) === activePath,
		[activePath],
	);

	// ── Pending counts ────────────────────────────────────────────────────────
	// Memoized so the heavy grade-array scan only runs when store slices change
	const pendingCounts = useMemo(() => {
		if (!user || user.role !== 'system_admin')
			return { submissions: 0, requests: 0 };

		const academicYear = normalizeAcademicYear(
			currentSchool?.currentAcademicYear || getCurrentAcademicYear(),
		);
		if (!academicYear) return { submissions: 0, requests: 0 };

		const scopedGrades =
			getScopedYearArray(gradesByAcademicYear, academicYear) || [];
		const scopedRequests =
			getScopedYearArray(gradeRequestsByAcademicYear, academicYear) || [];

		const statusesBySubmission = new Map<string, Set<string>>();
		for (const grade of scopedGrades) {
			if (!grade?.submissionId) continue;
			if (!statusesBySubmission.has(grade.submissionId)) {
				statusesBySubmission.set(grade.submissionId, new Set());
			}
			statusesBySubmission.get(grade.submissionId)!.add(grade.status);
		}

		const getSubmissionStatus = (statuses: Set<string>) => {
			if (statuses.size === 1) return Array.from(statuses)[0];
			const hasPending = statuses.has('Pending');
			const hasApproved = statuses.has('Approved');
			const hasRejected = statuses.has('Rejected');
			if (hasPending || (hasApproved && hasRejected))
				return 'Partially Approved';
			if (hasApproved) return 'Approved';
			if (hasRejected) return 'Rejected';
			return 'Pending';
		};

		let submissions = 0;
		for (const statuses of statusesBySubmission.values()) {
			const s = getSubmissionStatus(statuses);
			if (s === 'Pending' || s === 'Partially Approved') submissions++;
		}

		const requests = scopedRequests.filter(
			(req: any) =>
				req?.status === 'Pending' || req?.status === 'Partially Approved',
		).length;

		return { submissions, requests };
	}, [
		user,
		currentSchool?.currentAcademicYear,
		gradesByAcademicYear,
		gradeRequestsByAcademicYear,
	]);

	// Destructure memoized counts so primitives flow into the nav-items effect
	const { submissions: pendingSubmissions, requests: pendingRequests } =
		pendingCounts;

	// ── Transition readiness (defer to next frame to avoid first-render flash) ─
	useEffect(() => {
		const id = window.requestAnimationFrame(() =>
			setSidebarTransitionsReady(true),
		);
		return () => window.cancelAnimationFrame(id);
	}, []);

	// ── External event: grading counts refresh ────────────────────────────────
	// A lightweight counter that forces the nav-items effect to re-run when
	// external code dispatches this event (e.g. after a grade submission).
	const [countsRefreshTrigger, setCountsRefreshTrigger] = useState(0);
	useEffect(() => {
		const handler = () => setCountsRefreshTrigger((n) => n + 1);
		window.addEventListener('grading:counts:refresh', handler);
		return () => window.removeEventListener('grading:counts:refresh', handler);
	}, []);

	// ── Close mobile sidebar on navigation ────────────────────────────────────
	useEffect(() => {
		if (isMobileOpen) closeMobileSidebar();
	}, [pathname, closeMobileSidebar]); // intentionally excludes isMobileOpen

	// ── Body scroll lock ──────────────────────────────────────────────────────
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

	// ── Click outside to close mobile sidebar ────────────────────────────────
	useEffect(() => {
		if (!isMobileOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				sidebarRef.current &&
				!sidebarRef.current.contains(e.target as Node)
			) {
				closeMobileSidebar();
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isMobileOpen, closeMobileSidebar]);

	// ── Nav items (only rebuild when school/role/badges change) ──────────────
	const unreadNotifications = useMemo(
		() =>
			user?.notifications?.filter((n: any) => !n.read && !n.dismissed).length ||
			0,
		[user?.notifications],
	);

	useEffect(() => {
		if (!currentSchool || !role) return;
		try {
			const dynamicNavItems = generateNavigationItems(
				currentSchool,
				role,
				adminPosition,
			);
			const totalPending = pendingSubmissions + pendingRequests;

			const completeNavItems: NavItem[] = [
				...dynamicNavItems,
				{ name: 'Logout', icon: LogOut, href: '/logout', isLogout: true },
			];

			const processed = completeNavItems.map((item) => {
				const newItem: NavItem = {
					...item,
					href: item.href ? prependDashboard(item.href) : undefined,
					subItems: item.subItems?.map((sub) => {
						let badgeCount: number | undefined;
						if (sub.name === 'Grade Submissions')
							badgeCount = pendingSubmissions;
						else if (sub.name === 'Grade Requests')
							badgeCount = pendingRequests;
						return {
							...sub,
							href: sub.href ? prependDashboard(sub.href) : undefined,
							badgeCount: badgeCount && badgeCount > 0 ? badgeCount : undefined,
						};
					}),
					badgeCount:
						item.name === 'Notifications' && unreadNotifications > 0
							? unreadNotifications
							: undefined,
				};
				// Grading category badge
				if (
					item.name === 'Academics' ||
					((item.name === 'Grading' || item.name === 'Grading System') &&
						role === 'system_admin')
				) {
					newItem.badgeCount = totalPending > 0 ? totalPending : undefined;
				}
				return newItem;
			});

			setNavigationItems(processed);
		} catch (error) {
			console.error('Error generating navigation items:', error);
			setNavigationItems([
				{ name: 'Dashboard', icon: LogOut, href: '/dashboard' },
				{ name: 'Logout', icon: LogOut, href: '/logout', isLogout: true },
			]);
		}
	}, [
		currentSchool,
		role,
		adminPosition,
		unreadNotifications,
		pendingSubmissions,
		pendingRequests,
		countsRefreshTrigger,
	]);

	// ── Auto-expand submenu for active route (one-time on mount) ─────────────
	useEffect(() => {
		if (initialSetupDone || navigationItems.length === 0) return;
		for (const nav of navigationItems) {
			if (nav.subItems?.some((sub) => sub.href && isActive(sub.href))) {
				setOpenSubmenu(nav.name);
				break;
			}
		}
		setInitialSetupDone(true);
	}, [initialSetupDone, navigationItems, isActive]);

	// ── Handlers ──────────────────────────────────────────────────────────────
	const handleSubmenuToggle = useCallback((itemName: string) => {
		setOpenSubmenu((prev) => (prev === itemName ? null : itemName));
	}, []);

	const handleClientNavigate = useCallback(
		(href: string, options?: { keepSubmenuOpen?: boolean }) => {
			if (!options?.keepSubmenuOpen) setOpenSubmenu(null);
			setOfflinePath(href);
			window.history.pushState(null, '', href);
			if (isMobileOpen) closeMobileSidebar();
		},
		[isMobileOpen, closeMobileSidebar, setOfflinePath],
	);

	const handleLogout = useCallback(async () => {
		setOpenSubmenu(null);
		setIsLoggingOut(true);
		try {
			await logout();
			router.replace('/login');
		} catch {
			setIsLoggingOut(false);
		}
	}, [logout, router]);

	const handleMouseEnter = useCallback(() => {
		if (!isExpanded) setIsHovered(true);
	}, [isExpanded, setIsHovered]);

	const handleMouseLeave = useCallback(() => {
		setIsHovered(false);
	}, [setIsHovered]);

	// ── Derived display state ─────────────────────────────────────────────────
	const shouldShowLabels = isExpanded || isHovered || isMobileOpen;

	// ── Sidebar geometry ─────────────────────────────────────────────────────
	// On desktop (lg+): animate width between collapsed (90px) and expanded (290px).
	// On mobile: width snaps instantly — the sidebar is hidden via translate-x
	// anyway, so animating width only causes layout-reflow jank on low-end phones.
	// `contain: layout style` limits reflow scope to the sidebar subtree.
	const sidebarTransitionClass = sidebarTransitionsReady
		? 'lg:transition-[width] lg:duration-300 lg:ease-in-out'
		: 'transition-none';

	const sidebarWidthClass =
		isExpanded || isMobileOpen || isHovered
			? 'w-[260px] sm:w-[290px]'
			: 'w-[90px]';

	const sidebarTranslateClass = isMobileOpen
		? 'translate-x-0'
		: '-translate-x-full';

	const sidebarSurfaceClass = isMobileOpen
		? 'bg-white dark:bg-gray-900'
		: 'bg-gradient-to-b from-white via-brand-25/40 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-950';

	// ── Early returns ─────────────────────────────────────────────────────────
	if (isLoggingOut) {
		return <PageLoading variant="school" message="Signing out..." />;
	}

	const shellClass = `fixed top-[var(--app-header-height,4rem)] left-0 z-50 h-[calc(100dvh-var(--app-header-height,4rem))] lg:top-0 lg:h-dvh overflow-hidden border-r border-gray-200 text-gray-900 shadow-theme-lg dark:border-gray-800 dark:text-gray-100 rounded-tr-2xl rounded-br-2xl lg:rounded-tr-none lg:rounded-br-none sidebar-contain ${sidebarSurfaceClass} ${sidebarTransitionClass} ${sidebarWidthClass} ${sidebarTranslateClass} lg:translate-x-0`;

	if (user === undefined || !currentSchool) {
		return (
			<aside className={shellClass}>
				<AmbientGlow />
				<div className="relative z-10 flex h-full flex-col px-4 sm:px-5 py-5">
					<div className="hidden lg:flex items-center gap-3 rounded-xl border border-brand-100 bg-white/90 p-3 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900/70">
						<div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
						<div className="flex-1 space-y-2">
							<div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
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
			className={shellClass}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<AmbientGlow />

			<div className="relative z-10 flex h-full flex-col px-4 sm:px-5 pb-5 pt-4">
				{/* School logo / identity */}
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

				{/* Nav list */}
				<div className="left-scrollbar flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain">
					<div className="direction-ltr">
						<nav className="flex-1 min-w-0">
							<ul className="flex flex-col gap-1">
								{navigationItems.map((item) => (
									<NavItemComponent
										key={item.name}
										item={item}
										showLabels={shouldShowLabels}
										isActive={isActive}
										openSubmenu={openSubmenu}
										onSubmenuToggle={handleSubmenuToggle}
										onNavigate={handleClientNavigate}
										onLogout={handleLogout}
									/>
								))}
							</ul>
						</nav>
					</div>
				</div>
			</div>
		</aside>
	);
};

// Extracted so it doesn't re-render with the parent
const AmbientGlow = memo(() => (
	<>
		<div
			aria-hidden="true"
			className="pointer-events-none absolute -top-20 -left-16 hidden h-44 w-44 rounded-full bg-brand-200/35 blur-3xl dark:bg-brand-500/20 lg:block"
		/>
		<div
			aria-hidden="true"
			className="pointer-events-none absolute bottom-[-5.5rem] right-[-3rem] hidden h-40 w-40 rounded-full bg-brand-100/55 blur-3xl dark:bg-brand-500/10 lg:block"
		/>
	</>
));
AmbientGlow.displayName = 'AmbientGlow';

export default AppSidebar;
