'use client';

import { useSidebar } from '@/context/SidebarContext';
import AppHeader from './layout/AppHeader';
import AppSidebar from './layout/AppSidebar';
import React, { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoutes';
import { useNetworkStore } from '@/store/networkStore';
import OfflineHandler from '@/components/OfflineHandler';

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { isExpanded, isHovered, isMobileOpen } = useSidebar();
	const [loading, setLoading] = useState(true);
	const [navigationLoading, setNavigationLoading] = useState(false);
	const pathname = usePathname();
	const previousPathname = useRef(pathname);
	const { isOnline, authCheckFailed } = useNetworkStore();

	useEffect(() => {
		// Don't update loading state if offline
		if (!isOnline && authCheckFailed) {
			setLoading(false);
			setNavigationLoading(false);
			return;
		}

		// Handle route navigation loading
		if (previousPathname.current !== pathname) {
			setNavigationLoading(true);
			previousPathname.current = pathname;
		}

		// Simulate short loading delay
		setLoading(true);
		const timeout = setTimeout(() => {
			setLoading(false);
			setNavigationLoading(false);
		}, 40);

		return () => clearTimeout(timeout);
	}, [pathname, isOnline, authCheckFailed]);

	const mainContentMargin = isMobileOpen
		? 'ml-0'
		: isExpanded || isHovered
		? 'lg:ml-[290px]'
		: 'lg:ml-[90px]';

	return (
		<ProtectedRoute>
			<OfflineHandler>
				<div className="min-h-screen flex bg-background relative overflow-x-hidden">
					{/* Sidebar */}
					<AppSidebar />

					{/* Main content */}
					<div
						className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${mainContentMargin}`}
					>
						{/* Header */}
						<AppHeader />
						{/* Page Content */}
						<main className="py-4 md:py-6 px-0 overflow-x-hidden">
							{children}
						</main>
					</div>

					{/* Mobile overlay */}
					{isMobileOpen && (
						<div className="fixed inset-0 bg-black/20 z-40 lg:hidden" />
					)}
				</div>
			</OfflineHandler>
		</ProtectedRoute>
	);
}
