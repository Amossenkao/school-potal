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

interface NavItem {
	name: string;
	icon: any;
	href?: string;
	isLogout?: boolean;
	category?: string;
	subItems?: NavItem[];
	badgeCount?: number;
}

const AppSidebar: React.FC = () => {
	const { user, logout } = useAuth();
	const {
		isExpanded,
		isMobileOpen,
		isHovered,
		setIsHovered,
		toggleMobileSidebar,
	} = useSidebar();
	const pathname = usePathname();
	const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
	const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
		{}
	);
	const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const sidebarRef = useRef<HTMLElement>(null);
	const [initialSetupDone, setInitialSetupDone] = useState(false);
	const [navigationItems, setNavigationItems] = useState<NavItem[]>([]);

	// Get current school profile
	const currentSchool = useSchoolStore(
		(state) => state.school
	) as SchoolProfile;

	const role = user?.role;

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
			toggleMobileSidebar();
		}
	}, [pathname, isMobileOpen, toggleMobileSidebar]);

	// Handle click outside to close mobile sidebar
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				isMobileOpen &&
				sidebarRef.current &&
				!sidebarRef.current.contains(event.target as Node)
			) {
				toggleMobileSidebar();
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
	}, [isMobileOpen, toggleMobileSidebar]);

	// Generate navigation items when school profile or user role changes
	useEffect(() => {
		if (currentSchool && role) {
			try {
				const dynamicNavItems = generateNavigationItems(currentSchool, role);

				const unreadNotifications =
					user?.notifications?.filter((n) => !n.read).length || 0;

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
				const processedNavItems = completeNavItems.map((item) => ({
					...item,
					href: item.href ? prependDashboard(item.href) : undefined,
					subItems: item.subItems
						? item.subItems.map((sub) => ({
								...sub,
								href: prependDashboard(sub.href),
						  }))
						: undefined,
					badgeCount:
						item.name === 'Notifications' ? unreadNotifications : undefined,
				}));

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
	}, [currentSchool, role, user?.notifications]);

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
			window.location.href = '/login';
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
								<ul className="mt-2 space-y-1 ml-8 pl-4 border-l border-gray-200 dark:border-gray-700">
									{subItems.map((sub) => (
										<li key={sub.name}>
											<Link
												href={sub.href!}
												className={`menu-dropdown-item flex items-center gap-3 py-2 px-3 rounded-md text-sm transition-colors duration-150 ${
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
												<span>{sub.name}</span>
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
				className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 w-[290px]`}
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
			className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 dark:text-gray-100 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 dark:border-gray-700 ${
				isExpanded || isMobileOpen
					? 'w-[290px]'
					: isHovered
					? 'w-[290px]'
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

			<div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar flex-1">
				<nav className="flex-1">{renderMenuItems(navigationItems)}</nav>
			</div>
		</aside>
	);
};

export default AppSidebar;
