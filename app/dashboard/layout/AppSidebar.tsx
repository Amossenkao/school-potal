// AppSidebar.tsx
'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';

import { ChevronDown, LogOut } from 'lucide-react';
import useAuth from '@/store/useAuth';
import { generateNavigationItems } from '@/utils/componentsMap';
import { useSchoolStore } from '@/store/schoolStore';
import type { SchoolProfile } from '@/types/schoolProfile';
import type { Administrator } from '@/types/user';

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

const AppSidebar: React.FC = () => {
	const { user, logout } = useAuth();
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
	const bodyScrollState = useRef<{ overflow: string } | null>(null);
	const htmlScrollState = useRef<{ overflow: string } | null>(null);
	const [initialSetupDone, setInitialSetupDone] = useState(false);
	const [navigationItems, setNavigationItems] = useState<NavItem[]>([]);
	const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(0);
	const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

	// Get current school profile
	const currentSchool = useSchoolStore(
		(state) => state.school
	) as SchoolProfile;

	const role = user?.role;
	const adminPosition =
		user?.role === 'administrator'
			? (user as Administrator).position
			: undefined;

	useEffect(() => {
		const fetchPendingCounts = async () => {
			if (user) {
				try {
					// Fetch pending grade submissions
					if (user.role === 'system_admin') {
						const submissionsRes = await fetch(
							`/api/grades?academicYear=${getCurrentAcademicYear()}`
						);
						if (submissionsRes.ok) {
							const submissionsData = await submissionsRes.json();
							const grades =
								submissionsData?.data?.report?.grades ??
								submissionsData?.data?.grades ??
								[];
							const statusesBySubmission = new Map<string, Set<string>>();
							grades.forEach((grade: any) => {
								if (!grade?.submissionId) return;
								if (!statusesBySubmission.has(grade.submissionId)) {
									statusesBySubmission.set(grade.submissionId, new Set());
								}
								statusesBySubmission
									.get(grade.submissionId)
									?.add(grade.status);
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

							const pendingSubmissions = Array.from(
								statusesBySubmission.values()
							).filter((statuses) => {
								const status = getSubmissionStatus(statuses);
								return status === 'Pending' || status === 'Partially Approved';
							}).length;

							setPendingSubmissionsCount(pendingSubmissions);
						} else {
							setPendingSubmissionsCount(0);
						}
					} else {
						const submissionsRes = await fetch(
							`/api/grades?reportType=gradeSubmission&teacherUsername=${
								user.username
							}&academicYear=${getCurrentAcademicYear()}`
						);
						if (submissionsRes.ok) {
							const submissionsData = await submissionsRes.json();
							const submissions =
								submissionsData?.data?.report?.submissions ?? [];
							const pendingSubmissions = submissions.filter(
								(sub: any) =>
									sub.status === 'Pending' ||
									sub.status === 'Partially Approved'
							).length;
							setPendingSubmissionsCount(pendingSubmissions);
						} else {
							setPendingSubmissionsCount(0);
						}
					}

					// Fetch pending grade change requests
					const requestsRes = await fetch(
						`/api/grades/requests?academicYear=${getCurrentAcademicYear()}`
					);
					if (requestsRes.ok) {
						const requestsData = await requestsRes.json();
						const requests = requestsData?.data?.report ?? [];
						const pendingRequests = requests.filter(
							(req: any) =>
								req.status === 'Pending' || req.status === 'Partially Approved'
						).length;
						setPendingRequestsCount(pendingRequests);
					} else {
						setPendingRequestsCount(0);
					}
				} catch (error) {
					console.error('Failed to fetch pending counts:', error);
				}
			}
		};

		fetchPendingCounts();
	}, [user]);

	const prependDashboard = (href: string) => {
		if (!href) return href;
		if (href.startsWith('/dashboard') || href === '/logout') return href;
		return `/dashboard${href.startsWith('/') ? href : `/${href}`}`;
	};

	const isActive = useCallback(
		(href: string) => {
			const fullHref = prependDashboard(href);
			return fullHref === pathname;
		},
		[pathname]
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
			if (bodyScrollState.current) {
				document.body.style.overflow = bodyScrollState.current.overflow;
				bodyScrollState.current = null;
			}
			if (htmlScrollState.current) {
				document.documentElement.style.overflow =
					htmlScrollState.current.overflow;
				htmlScrollState.current = null;
			}
			return;
		}

		if (!bodyScrollState.current) {
			bodyScrollState.current = {
				overflow: document.body.style.overflow,
			};
		}
		if (!htmlScrollState.current) {
			htmlScrollState.current = {
				overflow: document.documentElement.style.overflow,
			};
		}
		document.body.style.overflow = 'hidden';
		document.documentElement.style.overflow = 'hidden';

		return () => {
			if (bodyScrollState.current) {
				document.body.style.overflow = bodyScrollState.current.overflow;
				bodyScrollState.current = null;
			}
			if (htmlScrollState.current) {
				document.documentElement.style.overflow =
					htmlScrollState.current.overflow;
				htmlScrollState.current = null;
			}
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
										href: prependDashboard(sub.href),
										badgeCount: badgeCount > 0 ? badgeCount : undefined,
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
					if (role === 'system_admin' || role === 'teacher') {
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
		try {
			await logout();
			window.location.href = '/';
		} catch (error) {
			console.error('Logout error:', error);
		}
	};

	const renderMenuItems = (items: NavItem[]) => (
		<ul className="flex flex-col gap-2">
			{items.map((item) => {
				const subItems = item.subItems;
				const isItemActive = item.href ? isActive(item.href) : false;
				const hasActiveSubItem = subItems?.some(
					(sub) => sub.href && isActive(sub.href)
				);

				return (
					<li key={item.name}>
						{subItems ? (
							// Submenu item
							<button
								onClick={() => handleSubmenuToggle(item.name)}
								className={`menu-item group w-full ${
									openSubmenu === item.name || hasActiveSubItem
										? 'menu-item-active'
										: 'menu-item-inactive'
								} ${
									!isExpanded && !isHovered
										? 'lg:justify-center'
										: 'lg:justify-start'
								}`}
							>
								<span
									className={`${
										openSubmenu === item.name || hasActiveSubItem
											? 'menu-item-icon-active'
											: 'menu-item-icon-inactive'
									}`}
								>
									<item.icon className="w-5 h-5" />
								</span>
								{(isExpanded || isHovered || isMobileOpen) && (
									<span className="menu-item-text flex-1 text-left">
										{item.name}
									</span>
								)}
								{(isExpanded || isHovered || isMobileOpen) &&
									item.badgeCount &&
									item.badgeCount > 0 && (
										<span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
											{item.badgeCount}
										</span>
									)}
								{(isExpanded || isHovered || isMobileOpen) && (
									<ChevronDown
										className={`ml-auto w-4 h-4 transition-transform duration-200 ${
											openSubmenu === item.name
												? 'rotate-180 text-blue-600 dark:text-blue-400'
												: ''
										}`}
									/>
								)}
							</button>
						) : item.href ? (
							// Regular navigation item
							item.isLogout ? (
								<button
									onClick={handleLogout}
									className="menu-item group w-full text-left menu-item-inactive hover:bg-red-50 dark:hover:bg-red-900/20"
								>
									<span className="menu-item-icon-inactive text-red-500">
										<item.icon className="w-5 h-5" />
									</span>
									{(isExpanded || isHovered || isMobileOpen) && (
										<span className="menu-item-text text-red-500">
											{item.name}
										</span>
									)}
								</button>
							) : (
								<Link
									href={item.href}
									className={`menu-item group ${
										isItemActive ? 'menu-item-active' : 'menu-item-inactive'
									} ${
										!isExpanded && !isHovered
											? 'lg:justify-center'
											: 'lg:justify-start'
									}`}
								>
									<span
										className={`${
											isItemActive
												? 'menu-item-icon-active'
												: 'menu-item-icon-inactive'
										}`}
									>
										<item.icon className="w-5 h-5" />
									</span>
									{(isExpanded || isHovered || isMobileOpen) && (
										<span className="menu-item-text flex-1">{item.name}</span>
									)}
									{(isExpanded || isHovered || isMobileOpen) &&
										item.badgeCount &&
										item.badgeCount > 0 && (
											<span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
												{item.badgeCount}
											</span>
										)}
								</Link>
							)
						) : null}

						{/* Submenu items */}
						{subItems && (isExpanded || isHovered || isMobileOpen) && (
							<div
								ref={(el) => {
									subMenuRefs.current[item.name] = el;
								}}
								className="overflow-hidden transition-all duration-300 ease-in-out"
								style={{
									height:
										openSubmenu === item.name
											? `${subMenuHeight[item.name] || 'auto'}px`
											: '0px',
								}}
							>
								<ul className="mt-2 space-y-1 ml-5 pl-2 border-l border-gray-200 dark:border-gray-700">
									{subItems.map((sub, index) => (
										<li key={`${sub.href || sub.name}-${index}`}>
											<Link
												href={sub.href!}
												className={`menu-dropdown-item relative flex items-center gap-3 py-2 px-2 pr-8 sm:px-3 rounded-md text-sm transition-colors duration-150 ${
													isActive(sub.href!)
														? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
														: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
												}`}
											>
												{sub.icon && (
													<sub.icon
														className={`w-4 h-4 ${
															isActive(sub.href!)
																? 'text-blue-600 dark:text-blue-400'
																: 'text-gray-400 dark:text-gray-500'
														}`}
													/>
												)}
												<span className="flex-1">{sub.name}</span>
												{sub.badgeCount && sub.badgeCount > 0 && (
													<span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
														{sub.badgeCount}
													</span>
												)}
											</Link>
										</li>
									))}
								</ul>
							</div>
						)}
					</li>
				);
			})}
		</ul>
	);

	// Show loading state if user or school is being fetched
	if (user === undefined || !currentSchool) {
		return (
		<aside
			className={`fixed top-16 lg:top-0 flex flex-col px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-[calc(100dvh-4rem)] lg:h-dvh transition-all duration-300 ease-in-out z-50 border-r border-gray-200 w-[260px] sm:w-[290px] rounded-tr-2xl lg:rounded-tr-none`}
		>
				<div className="flex items-center gap-3 cursor-pointer">
					{/* Logo placeholder */}
					<div className="w-12 h-12 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded animate-pulse">
						<div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
					</div>

					{/* Text placeholder */}
					<div>
						<div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
						<div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
					</div>
				</div>

				<div className="flex items-center justify-center flex-1">
					<div className="animate-pulse text-gray-500">
						Loading navigation...
					</div>
				</div>
			</aside>
		);
	}

	return (
		<aside
			ref={sidebarRef}
			className={`fixed top-16 lg:top-0 flex flex-col px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 dark:text-gray-100 h-[calc(100dvh-4rem)] lg:h-dvh transition-all duration-300 ease-in-out z-50 border-r border-gray-200 dark:border-gray-700 rounded-tr-2xl lg:rounded-tr-none ${
				isExpanded || isMobileOpen
					? 'w-[260px] sm:w-[290px]'
					: isHovered
					? 'w-[260px] sm:w-[290px]'
					: 'w-[90px]'
			} ${
				isMobileOpen ? 'translate-x-0' : '-translate-x-full'
			} lg:translate-x-0`}
			onMouseEnter={() => !isExpanded && setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<Link className="flex items-center gap-3 cursor-pointer my-6" href={'/'}>
				{/* Logo */}
				<div
					className={`flex items-center justify-center transition-all duration-300
			${
				isExpanded && typeof window !== 'undefined' && window.innerWidth >= 1024
					? 'h-12 w-12'
					: 'h-16 w-16'
			}
		`}
				>
					<img
						src={currentSchool?.logoUrl}
						alt="School logo"
						className="max-w-16 object-contain"
					/>
				</div>

				{/* Text section */}
				<div>
					{/* Large screens */}
					<h1 className="text-xl font-bold hidden lg:block">
						{isExpanded || isHovered ? currentSchool.shortName : null}
					</h1>

					{/* Medium screens */}
					<h1 className="text-xl font-bold hidden md:block lg:hidden">
						{currentSchool.initials}
					</h1>

					{/* Small screens */}
					<h1 className="text-xl font-bold md:hidden">
						{/* No text on small screens */}
					</h1>

					{(isExpanded || isHovered) && (
						<p className="text-xs text-muted-foreground hidden sm:block lg:block">
							{currentSchool?.slogan || 'Excellence in Education'}
						</p>
					)}
				</div>
			</Link>

			<div className="flex min-h-0 flex-col overflow-y-auto overscroll-contain duration-300 ease-linear left-scrollbar flex-1 pb-6">
				<div className="direction-ltr">
					<nav className="flex-1">{renderMenuItems(navigationItems)}</nav>
				</div>
			</div>
		</aside>
	);
};

export default AppSidebar;
