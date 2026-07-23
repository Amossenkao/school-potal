'use client';

import React, { memo, useRef, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

type Props = {
	isMobileOpen: boolean;
	onToggleSidebar: () => void;
	onToggleMobileSidebar: () => void;
};

const SuperAdminHeader = memo(function SuperAdminHeader({ isMobileOpen, onToggleSidebar, onToggleMobileSidebar }: Props) {
	const headerRef = useRef<HTMLElement>(null);

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

	const handleToggle = () => {
		if (window.innerWidth >= 1024) onToggleSidebar();
		else onToggleMobileSidebar();
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
					</div>
				</div>
			</div>
		</header>
	);
});

export default SuperAdminHeader;
