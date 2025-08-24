'use client';
import { useSidebar } from '@/context/SidebarContext';
import AppHeader from './layout/AppHeader';
import AppSidebar from './layout/AppSidebar';
import React, { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { PageLoading } from '@/components/loading';
import ProtectedRoute from '@/components/ProtectedRoutes';

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

	useEffect(() => {
		// Check if we're navigating to a different page
		if (previousPathname.current !== pathname) {
			setNavigationLoading(true);
			previousPathname.current = pathname;
		}

		// Set component loading
		setLoading(true);

		const timeout = setTimeout(() => {
			setLoading(false);
			setNavigationLoading(false);
		}, 40);

		return () => clearTimeout(timeout);
	}, [pathname]);

	const mainContentMargin = isMobileOpen
		? 'ml-0'
		: isExpanded || isHovered
		? 'lg:ml-[290px]'
		: 'lg:ml-[90px]';

	return (
		<ProtectedRoute>
			<div className="min-h-screen flex bg-background">
				<AppSidebar />
				{/*
          THE FIX: Added `min-w-0` here.
          This prevents the flex container from growing beyond its available space,
          which stops the wide table from creating a page-level scrollbar.
        */}
				<div
					className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${mainContentMargin}`}
				>
					<AppHeader />
					<main className="p-4 md:p-6">
						{loading || navigationLoading ? (
							<div className="flex items-center justify-center min-h-[60vh]">
								<PageLoading
									fullScreen={false}
									message="Content Loading, Please wait..."
								/>
							</div>
						) : (
							children
						)}
					</main>
				</div>
			</div>
		</ProtectedRoute>
	);
}
