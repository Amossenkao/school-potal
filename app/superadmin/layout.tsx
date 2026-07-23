'use client';

import { SidebarProvider } from '@/context/SidebarContext';
import SuperAdminSidebar from './SuperAdminSidebar';
import SuperAdminHeader from './SuperAdminHeader';
import { useSidebar } from '@/context/SidebarContext';
import { usePathname } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

function SuperAdminShell({ children }: { children: React.ReactNode }) {
	const { isExpanded, isHovered, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
	const pathname = usePathname();
	const previousDesktopMarginRef = useRef(290);
	const [layoutTransitionsReady, setLayoutTransitionsReady] = useState(false);
	const [contentSlideOffset, setContentSlideOffset] = useState(0);

	useEffect(() => {
		const frameId = window.requestAnimationFrame(() => setLayoutTransitionsReady(true));
		return () => window.cancelAnimationFrame(frameId);
	}, []);

	useEffect(() => {
		if (!layoutTransitionsReady) return;
		if (typeof window === 'undefined') return;
		const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
		const nextDesktopMargin = isMobileOpen || !isDesktop ? 0 : isExpanded || isHovered ? 290 : 90;
		const previousDesktopMargin = previousDesktopMarginRef.current;
		previousDesktopMarginRef.current = nextDesktopMargin;
		if (!isDesktop || isMobileOpen || previousDesktopMargin === nextDesktopMargin) {
			setContentSlideOffset(0);
			return;
		}
		setContentSlideOffset(previousDesktopMargin - nextDesktopMargin);
		const frameId = window.requestAnimationFrame(() => setContentSlideOffset(0));
		return () => window.cancelAnimationFrame(frameId);
	}, [isExpanded, isHovered, isMobileOpen, layoutTransitionsReady]);

	const mainContentMargin = isMobileOpen ? 'ml-0' : isExpanded || isHovered ? 'lg:ml-[290px]' : 'lg:ml-[90px]';

	return (
		<div className="min-h-screen flex bg-background relative">
			<SuperAdminSidebar />
			<div
				className={`flex-1 min-w-0 ${
					layoutTransitionsReady ? 'transition-transform duration-300 ease-in-out motion-reduce:transition-none' : 'transition-none'
				} ${mainContentMargin}`}
				style={contentSlideOffset !== 0 ? { transform: `translate3d(${contentSlideOffset}px, 0, 0)` } : undefined}
			>
				<SuperAdminHeader isMobileOpen={isMobileOpen} onToggleSidebar={toggleSidebar} onToggleMobileSidebar={toggleMobileSidebar} />
				<main className="px-4 sm:px-6 lg:px-8 overflow-x-hidden pb-4 md:pb-6 pt-[calc(var(--app-header-height,4rem)+1rem)] lg:pt-4">
					{children}
				</main>
			</div>
			{isMobileOpen && (
				<div className="fixed inset-x-0 bottom-0 top-[var(--app-header-height,4rem)] bg-black/20 z-30 lg:hidden" />
			)}
		</div>
	);
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
	return <SuperAdminLayoutInner>{children}</SuperAdminLayoutInner>;
}

function SuperAdminLayoutInner({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();

	if (pathname === '/superadmin/login') {
		return <>{children}</>;
	}

	return (
		<SidebarProvider>
			<SuperAdminShell>{children}</SuperAdminShell>
		</SidebarProvider>
	);
}
