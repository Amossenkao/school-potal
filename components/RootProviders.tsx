'use client';

import { useEffect } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { PageLoading } from '@/components/loading';
import VercelUpgrade from '@/components/uca-inactive';
import AuthProvider from '@/context/AuthProvider';
import OfflineHandler from '@/components/OfflineHandler';
import { Toaster } from 'react-hot-toast';

export default function RootProviders({
	children,
}: {
	children: React.ReactNode;
}) {
	const { school, fetchSchool, hydrateCache } = useSchoolStore();
	const { hydrateFromCache } = useAuth();
	const hasAppsFeature = Boolean(school?.enabledFeatures?.includes('apps'));
	const hasSchoolProfile = Boolean(school);

	useEffect(() => {
		hydrateCache();
		hydrateFromCache();
		fetchSchool();
	}, [fetchSchool, hydrateCache, hydrateFromCache]);

	useEffect(() => {
		if (!hasSchoolProfile) return;
		if (!('serviceWorker' in navigator)) return;
		const manageServiceWorker = async () => {
			if (!hasAppsFeature) {
				try {
					const registrations = await navigator.serviceWorker.getRegistrations();
					await Promise.all(
						registrations.map((registration) => registration.unregister())
					);
				} catch (error) {
					console.warn('Service worker cleanup failed:', error);
				}
				return;
			}
			if (process.env.NODE_ENV !== 'production') return;
			try {
				await navigator.serviceWorker.register('/sw.js');
			} catch (error) {
				console.warn('Service worker registration failed:', error);
			}
		};
		manageServiceWorker();
	}, [hasAppsFeature, hasSchoolProfile]);

	useEffect(() => {
		if (!hasAppsFeature) return;
		if (!('serviceWorker' in navigator)) return;
		const flushQueue = () => {
			if (navigator.serviceWorker.controller) {
				navigator.serviceWorker.controller.postMessage({
					type: 'flush-grade-queue',
				});
			}
		};
		window.addEventListener('online', flushQueue);
		flushQueue();
		return () => window.removeEventListener('online', flushQueue);
	}, [hasAppsFeature]);

	const isOffline =
		typeof navigator !== 'undefined' && navigator.onLine === false;

	if (!school && !isOffline) {
		return (
			<ThemeProvider>
				<PageLoading variant="pulse" message="" />
			</ThemeProvider>
		);
	}

	return (
		<AuthProvider>
			<ThemeProvider>
				<SidebarProvider>
					<OfflineHandler>
						{school ? (school.isActive ? children : <VercelUpgrade />) : children}
					</OfflineHandler>
				</SidebarProvider>
				<Toaster position="top-right" />
			</ThemeProvider>
		</AuthProvider>
	);
}
