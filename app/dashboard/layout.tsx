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

export default function AdminLayout({
	children: _children,
}: {
	children: React.ReactNode;
}) {
	const { isExpanded, isHovered, isMobileOpen } = useSidebar();
	const pathname = usePathname();
	const previousPathname = useRef(pathname);
	const [layoutTransitionsReady, setLayoutTransitionsReady] = useState(false);
	const { offlinePath, setOfflinePath } = useOfflineNavigationStore();
	const { isOnline } = useNetworkStore();
	const activePath = offlinePath || pathname;

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
	}, [setOfflinePath]);

	useEffect(() => {
		const frameId = window.requestAnimationFrame(() => {
			setLayoutTransitionsReady(true);
		});
		return () => window.cancelAnimationFrame(frameId);
	}, []);


	const mainContentMargin = isMobileOpen
		? 'ml-0'
		: isExpanded || isHovered
		? 'lg:ml-[290px]'
		: 'lg:ml-[90px]';

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
							? 'transition-all duration-300 ease-in-out'
							: 'transition-none'
					} ${mainContentMargin}`}
				>
					{/* Header */}
					<AppHeader />
					{/* Page Content */}
					<main className="py-4 md:py-6 px-0 overflow-x-hidden">
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
