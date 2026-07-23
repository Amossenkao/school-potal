'use client';

import React, { memo, useRef, useEffect, useState } from 'react';
import { Menu, X, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';

type Props = {
	isMobileOpen: boolean;
	onToggleSidebar: () => void;
	onToggleMobileSidebar: () => void;
};

const SuperAdminHeader = memo(function SuperAdminHeader({ isMobileOpen, onToggleSidebar, onToggleMobileSidebar }: Props) {
	const router = useRouter();
	const headerRef = useRef<HTMLElement>(null);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const { theme, toggleTheme } = useTheme();

	useEffect(() => {
		const headerEl = headerRef.current;
		if (!headerEl) return;
		const updateHeaderHeight = () => {
			const height = headerEl.getBoundingClientRect().height;
			document.documentElement.style.setProperty('--app-header-height', `${height}px`);
		};
		updateHeaderHeight();
		let resizeObserver: ResizeObserver | null = null;
		if (typeof ResizeObserver !== 'undefined') {
			resizeObserver = new ResizeObserver(updateHeaderHeight);
			resizeObserver.observe(headerEl);
		}
		window.addEventListener('resize', updateHeaderHeight);
		return () => {
			window.removeEventListener('resize', updateHeaderHeight);
			if (resizeObserver) resizeObserver.disconnect();
		};
	}, []);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setDropdownOpen(false);
			}
		};
		if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [dropdownOpen]);

	const handleToggle = () => {
		if (window.innerWidth >= 1024) onToggleSidebar();
		else onToggleMobileSidebar();
	};

	const handleLogout = () => {
		setDropdownOpen(false);
		sessionStorage.removeItem('superadmin_auth');
		router.replace('/superadmin/login');
	};

	return (
		<header
			ref={headerRef}
			className="fixed inset-x-0 top-0 lg:sticky lg:top-0 flex w-full bg-white border-gray-200 z-50 dark:border-gray-800 dark:bg-gray-900 lg:border-b"
		>
			<div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
				<div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
					<button
						className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg z-40 dark:border-gray-800 lg:flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
						onClick={handleToggle}
						aria-label="Toggle Sidebar"
					>
						{isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</button>
					<div className="lg:hidden">
						<p className="text-sm font-semibold text-gray-800 dark:text-white">SchoolMesh Admin</p>
					</div>
					<div className="ml-auto flex items-center gap-3">
						<div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
							<div className="h-2 w-2 rounded-full bg-green-500" />
							Demo Mode
						</div>
						{/* Profile dropdown */}
						<div className="relative" ref={dropdownRef}>
							<button
								onClick={() => setDropdownOpen(!dropdownOpen)}
								className="flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3 hover:bg-gray-100 transition-colors dark:hover:bg-gray-800"
							>
								<img
									src="https://ui-avatars.com/api/?name=Super+Admin&background=465fff&color=fff"
									alt="Admin"
									className="h-8 w-8 rounded-full object-cover"
								/>
								<div className="hidden sm:block text-left">
									<p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">Super Admin</p>
									<p className="text-[11px] text-gray-500 leading-tight">Platform Admin</p>
								</div>
								<ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
							</button>

								{dropdownOpen && (
								<div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-gray-800 dark:bg-gray-900 z-[60]">
									<div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
										<p className="text-sm font-semibold text-gray-900 dark:text-white">Super Admin</p>
										<p className="text-xs text-gray-500">admin@schoolmesh.app</p>
									</div>
									<div className="py-1.5">
										<button
											onClick={toggleTheme}
											className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-800"
										>
											{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
											{theme === 'dark' ? 'Light mode' : 'Dark mode'}
										</button>
										<button
											onClick={handleLogout}
											className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-900/10"
										>
											<LogOut className="h-4 w-4" />
											Sign out
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</header>
	);
});

export default SuperAdminHeader;
