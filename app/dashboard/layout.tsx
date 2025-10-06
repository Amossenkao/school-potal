'use client';

import { useSidebar } from '@/context/SidebarContext';
import AppHeader from './layout/AppHeader';
import AppSidebar from './layout/AppSidebar';
import React, { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { PageLoading } from '@/components/loading';
import ProtectedRoute from '@/components/ProtectedRoutes';
import { useNetworkStore } from '@/store/networkStore';
import { WifiOff } from 'lucide-react';
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
				<div className="min-h-screen flex bg-background relative">
					{/* Sidebar */}
					<AppSidebar />

					{/* Main content */}
					<div
						className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${mainContentMargin}`}
					>
						{/* Header */}
						<AppHeader />
						{/* Page Content */}
						<main className="p-4 md:p-6">
							{!isOnline ? (
								// ✅ Show offline message instead of dashboard content
								<div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
									<div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-6">
										<WifiOff className="w-16 h-16 text-gray-400 dark:text-gray-500" />
									</div>
									<h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
										You're Offline
									</h2>
									<p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
										It looks like you've lost your internet connection. Please
										check your network and try again.
									</p>
									<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md">
										<p className="text-sm text-blue-800 dark:text-blue-300">
											💡 Your dashboard will automatically reload once you're
											back online.
										</p>
									</div>
								</div>
							) : (
								children
							)}
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
