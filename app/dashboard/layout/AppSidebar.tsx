'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';

import {
	ChevronDown,
	LayoutDashboard,
	MessageCircle,
	UserCircle,
	LogOut,
} from 'lucide-react';
import useAuth from '@/store/useAuth';
import { componentsMap } from '@/utils/componentsMap';
import Logo from '@/components/Logo';
import { useSchoolStore } from '@/store/schoolStore';

interface ComponentItem {
	title: string;
	icon: any;
	category?: string;
	component: any;
}

interface NavItem {
	name: string;
	icon: any;
	href?: string;
	isLogout?: boolean;
	category?: string;
	subItems?: NavItem[];
}

const AppSidebar: React.FC = () => {
	const { user, logout } = useAuth();
	const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
	const pathname = usePathname();
	const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
	const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
		{}
	);
	const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const [initialSetupDone, setInitialSetupDone] = useState(false);
	const currentSchool = useSchoolStore((state) => state.school);

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

	// Convert components map to navigation structure
	const convertComponentsMapToNavItems = (): NavItem[] => {
		const navItems: NavItem[] = [];

		// Add dashboard home
		navItems.push({
			name: 'Dashboard',
			icon: LayoutDashboard,
			href: '/dashboard',
		});

		// Return early if no role
		if (!role) {
			return [
				...navItems,
				{
					name: 'Login Required',
					icon: UserCircle,
					href: '/login',
				},
			];
		}

		// Get role-specific items
		if (componentsMap[role]) {
			const roleSection = componentsMap[role];
			const itemsByCategory: Record<string, NavItem[]> = {};

			// Group items by category
			Object.entries(roleSection.items).forEach(
				([slug, item]: [string, ComponentItem]) => {
					const category = item.category || 'General';

					if (!itemsByCategory[category]) {
						itemsByCategory[category] = [];
					}

					itemsByCategory[category].push({
						name: item.title,
						icon: item.icon,
						href: `/${slug}`,
						category,
					});
				}
			);

			// Convert categories to nav items with sub-items
			Object.entries(itemsByCategory).forEach(([categoryName, items]) => {
				if (items.length === 1) {
					// Single item - add directly (whether it has category or not)
					navItems.push({
						...items[0],
						name: items[0].name,
					});
				} else {
					// Multiple items - create submenu
					navItems.push({
						name: categoryName,
						icon: items[0].icon, // Use first item's icon for the category
						subItems: items,
					});
				}
			});
		}

		// Add shared items
		if (componentsMap.shared) {
			const sharedSection = componentsMap.shared;
			const sharedItemsByCategory: Record<string, NavItem[]> = {};

			// Group shared items by category
			Object.entries(sharedSection.items).forEach(
				([slug, item]: [string, ComponentItem]) => {
					// Skip profile and messages as they're handled separately
					if (slug === 'profile' || slug === 'messages') return;

					const category = item.category || 'Resources';

					if (!sharedItemsByCategory[category]) {
						sharedItemsByCategory[category] = [];
					}

					sharedItemsByCategory[category].push({
						name: item.title,
						icon: item.icon,
						href: `/${slug}`,
						category,
					});
				}
			);

			// Add shared categories
			Object.entries(sharedItemsByCategory).forEach(([categoryName, items]) => {
				if (items.length === 1) {
					navItems.push({
						...items[0],
						name: items[0].name,
					});
				} else {
					navItems.push({
						name: categoryName,
						icon: items[0].icon,
						subItems: items,
					});
				}
			});
		}

		// Add messages and profile from shared
		const sharedItems = componentsMap.shared?.items;
		if (sharedItems?.messages) {
			navItems.push({
				name: 'Messages',
				icon: MessageCircle,
				href: '/messages',
			});
		}

		if (sharedItems?.profile) {
			navItems.push({
				name: 'Profile',
				icon: UserCircle,
				href: '/profile',
			});
		}

		// Add logout
		navItems.push({
			name: 'Logout',
			icon: LogOut,
			href: '/logout',
			isLogout: true,
		});

		return navItems;
	};

	const orderedNavItems = convertComponentsMapToNavItems().map((item) => ({
		...item,
		href: item.href ? prependDashboard(item.href) : undefined,
		subItems: item.subItems
			? item.subItems.map((sub) => ({
					...sub,
					href: prependDashboard(sub.href),
			  }))
			: undefined,
	}));

	const handleSubmenuToggle = (itemName: string) => {
		setOpenSubmenu((prev) => (prev === itemName ? null : itemName));
	};

	// Auto-expand submenu if current page is in it
	useEffect(() => {
		if (!initialSetupDone && orderedNavItems.length > 0) {
			let foundActiveSubmenu = false;
			orderedNavItems.forEach((nav) => {
				nav.subItems?.forEach((sub) => {
					if (sub.href && isActive(sub.href) && !foundActiveSubmenu) {
						setOpenSubmenu(nav.name);
						foundActiveSubmenu = true;
					}
				});
			});
			setInitialSetupDone(true);
		}
	}, [initialSetupDone, orderedNavItems, isActive]);

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
			// Optionally redirect to login page
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
										<span className="menu-item-text">{item.name}</span>
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

	// Show loading state if user is being fetched
	if (user === undefined) {
		return (
			<aside
				className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 w-[290px]`}
			>
				<div className="flex items-center gap-3 cursor-pointer">
					{/* Logo */}
					<div className="w-12 h-12 flex items-center justify-center">
						<img src={currentSchool?.logoUrl} alt="School logo" />
					</div>

					{/* Text section */}
					<div>
						{/* Large screens */}
						<h1 className={`text-xl font-bold hidden lg:block`}>
							{isExpanded ? currentSchool.shortName : null}
						</h1>

						{/* Medium screens (md) */}
						<h1 className="text-xl font-bold hidden md:block lg:hidden">
							{currentSchool.initials}
						</h1>

						{/* Small screens */}
						<h1 className="text-xl font-bold md:hidden">
							{/* Only logo shows on small, so no text */}
						</h1>

						{/* Slogan — only visible when we actually show text */}
						{isExpanded && (
							<p className="text-xs text-muted-foreground hidden sm:block lg:block">
								{currentSchool?.slogan || 'Excellence in Education'}
							</p>
						)}
					</div>
				</div>

				<div className="flex items-center justify-center flex-1">
					<div className="animate-pulse text-gray-500">Loading...</div>
				</div>
			</aside>
		);
	}

	return (
		<aside
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
			${isExpanded && window.innerWidth >= 1024 ? 'h-12 w-12' : 'h-16 w-16'}
		`}
				>
					<img
						src={currentSchool?.logoUrl}
						alt="School logo"
						className=" max-w-16 object-contain"
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
				<nav className="flex-1">{renderMenuItems(orderedNavItems)}</nav>
			</div>
		</aside>
	);
};

export default AppSidebar;
