'use client';

import { useSidebar } from '@/context/SidebarContext';
import AppHeader from './layout/AppHeader';
import AppSidebar from './layout/AppSidebar';
import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoutes';
import { useOfflineNavigationStore } from '@/store/offlineNavigationStore';
import { useNetworkStore } from '@/store/networkStore';
import OfflineRouteRenderer from '@/components/OfflineRouteRenderer';
import PrefetchDashboardChunks from '@/components/PrefetchDashboardChunks';
import OfflineBanner from '@/components/OfflineBanner';
import { useHasSchool } from '@/context/HasSchoolContext';
import SuperAdminSidebar from '@/app/superadmin/SuperAdminSidebar';
import SuperAdminHeader from '@/app/superadmin/SuperAdminHeader';

export default function AdminLayout({
	children: _children,
}: {
	children: React.ReactNode;
}) {
	const {
		isExpanded,
		isHovered,
		isMobileOpen,
		toggleSidebar,
		toggleMobileSidebar,
	} = useSidebar();
	const pathname = usePathname();
	const previousPathname = useRef(pathname);
	const previousDesktopMarginRef = useRef(290);
	const [layoutTransitionsReady, setLayoutTransitionsReady] = useState(false);
	const [contentSlideOffset, setContentSlideOffset] = useState(0);
	const { offlinePath, setOfflinePath } = useOfflineNavigationStore();
	const { isOnline } = useNetworkStore();
	const activePath = isOnline ? pathname : offlinePath || pathname;

	useEffect(() => {
		if (!offlinePath) {
			setOfflinePath(pathname);
		}
	}, [offlinePath, pathname, setOfflinePath]);

	useEffect(() => {
		if (previousPathname.current !== pathname) {
			setOfflinePath(pathname);
			previousPathname.current = pathname;
		}
	}, [pathname, setOfflinePath]);

	useEffect(() => {
		if (!isOnline) return;
		if (!('serviceWorker' in navigator)) return;
		if (!navigator.serviceWorker.controller) return;
		navigator.serviceWorker.controller.postMessage({
			type: 'cache-dashboard-shell',
			path: pathname,
		});
	}, [isOnline, pathname]);

	useEffect(() => {
		const handlePopState = () => {
			setOfflinePath(window.location.pathname);
		};
		window.addEventListener('popstate', handlePopState);
		return () => window.removeEventListener('popstate', handlePopState);
	}, [setOfflinePath]);

	useEffect(() => {
		if (isOnline) return;
		const handleLinkClick = (event: MouseEvent) => {
			if (event.defaultPrevented) return;
			if (event.button !== 0) return;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
				return;
			}
			const target = event.target as HTMLElement | null;
			const anchor = target?.closest('a');
			if (!anchor) return;
			if (anchor.hasAttribute('download')) return;
			const href = anchor.getAttribute('href');
			if (!href || !href.startsWith('/dashboard')) return;
			if (anchor.target && anchor.target !== '_self') return;
			event.preventDefault();
			setOfflinePath(href);
			window.history.pushState(null, '', href);
		};
		document.addEventListener('click', handleLinkClick);
		return () => document.removeEventListener('click', handleLinkClick);
	}, [setOfflinePath, isOnline]);

	useEffect(() => {
		const frameId = window.requestAnimationFrame(() => {
			setLayoutTransitionsReady(true);
		});
		return () => window.cancelAnimationFrame(frameId);
	}, []);

	useEffect(() => {
		if (!layoutTransitionsReady) return;
		if (typeof window === 'undefined') return;

		const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
		const nextDesktopMargin =
			isMobileOpen || !isDesktop ? 0 : isExpanded || isHovered ? 290 : 90;
		const previousDesktopMargin = previousDesktopMarginRef.current;
		previousDesktopMarginRef.current = nextDesktopMargin;

		if (!isDesktop || isMobileOpen || previousDesktopMargin === nextDesktopMargin) {
			setContentSlideOffset(0);
			return;
		}

		setContentSlideOffset(previousDesktopMargin - nextDesktopMargin);
		const frameId = window.requestAnimationFrame(() => {
			setContentSlideOffset(0);
		});

		return () => window.cancelAnimationFrame(frameId);
	}, [isExpanded, isHovered, isMobileOpen, layoutTransitionsReady]);


	const mainContentMargin = isMobileOpen
		? 'ml-0'
		: isExpanded || isHovered
		? 'lg:ml-[290px]'
		: 'lg:ml-[90px]';

	const hasSchool = useHasSchool();

	if (!hasSchool) {
		const mainContentMargin = isMobileOpen
			? 'ml-0'
			: isExpanded || isHovered
			? 'lg:ml-[290px]'
			: 'lg:ml-[90px]';

		return (
			<div className="min-h-screen flex bg-background relative">
				<SuperAdminSidebar />
				<div
					className={`flex-1 min-w-0 ${
						layoutTransitionsReady
							? 'transition-transform duration-300 ease-in-out motion-reduce:transition-none'
							: 'transition-none'
					} ${mainContentMargin}`}
					style={
						contentSlideOffset !== 0
							? { transform: `translate3d(${contentSlideOffset}px, 0, 0)` }
							: undefined
					}
				>
					<SuperAdminHeader
						isMobileOpen={isMobileOpen}
						onToggleSidebar={toggleSidebar}
						onToggleMobileSidebar={toggleMobileSidebar}
					/>
					<main className="px-4 sm:px-6 lg:px-8 overflow-x-hidden pb-4 md:pb-6 pt-[calc(var(--app-header-height,4rem)+1rem)] lg:pt-4">
						{_children}
					</main>
				</div>
				{isMobileOpen && (
					<div className="fixed inset-x-0 bottom-0 top-[var(--app-header-height,4rem)] bg-black/20 z-30 lg:hidden" />
				)}
			</div>
		);
	}

	return (
		<ProtectedRoute>
			<div className="min-h-screen flex bg-background relative">
				<PrefetchDashboardChunks />
				{/* Sidebar */}
				<AppSidebar />

				{/* Main content */}
				<div
					className={`flex-1 min-w-0 ${
						layoutTransitionsReady
							? 'transition-transform duration-300 ease-in-out motion-reduce:transition-none'
							: 'transition-none'
					} ${mainContentMargin}`}
					style={
						contentSlideOffset !== 0
							? { transform: `translate3d(${contentSlideOffset}px, 0, 0)` }
							: undefined
					}
				>
				{/* Header */}
				<AppHeader
					isMobileOpen={isMobileOpen}
					onToggleSidebar={toggleSidebar}
					onToggleMobileSidebar={toggleMobileSidebar}
				/>
				<OfflineBanner />
				{/* Page Content */}
					<main className="px-0 overflow-x-hidden pb-4 md:pb-6 pt-[calc(var(--app-header-height,4rem)+1rem)] lg:pt-4">
						<OfflineRouteRenderer path={activePath} />
					</main>
				</div>

				{/* Mobile overlay */}
				{isMobileOpen && (
					<div className="fixed inset-x-0 bottom-0 top-[var(--app-header-height,4rem)] bg-black/20 z-30 lg:hidden" />
				)}
			</div>
		</ProtectedRoute>
	);
}
