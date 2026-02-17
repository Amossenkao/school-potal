'use client';

import { useEffect } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import VercelUpgrade from '@/components/uca-inactive';
import AuthProvider from '@/context/AuthProvider';
import OfflineHandler from '@/components/OfflineHandler';
import { Toaster } from 'react-hot-toast';
import { applyTenantThemeToDocument } from '@/lib/tenantTheme';

const OFFLINE_REQUESTS_KEY = 'school_portal_offline_requests';

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
		const taskId = window.setTimeout(() => {
			void fetchSchool();
		}, 0);
		return () => window.clearTimeout(taskId);
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
			try {
				await navigator.serviceWorker.register('/sw.js');
			} catch (error) {
				console.warn('Service worker registration failed:', error);
			}
		};
		manageServiceWorker();
	}, [hasAppsFeature, hasSchoolProfile]);

	useEffect(() => {
		const flushOfflineRequests = async () => {
			if (!navigator.onLine) return;
			try {
				const raw = localStorage.getItem(OFFLINE_REQUESTS_KEY);
				if (!raw) return;
				const queued = JSON.parse(raw);
				if (!Array.isArray(queued) || queued.length === 0) return;
				const remaining: any[] = [];

				for (const item of queued) {
					try {
						const res = await fetch(item.url, {
							method: item.method || 'GET',
							headers: item.headers || {},
							body: item.body,
							credentials: item.credentials || 'include',
						});
						if (!res.ok) {
							remaining.push(item);
						}
					} catch {
						remaining.push(item);
					}
				}

				if (remaining.length > 0) {
					localStorage.setItem(OFFLINE_REQUESTS_KEY, JSON.stringify(remaining));
				} else {
					localStorage.removeItem(OFFLINE_REQUESTS_KEY);
				}
			} catch (error) {
				console.warn('Failed to flush offline requests:', error);
			}
		};

		const flushQueue = () => {
			void flushOfflineRequests();
			if (
				hasAppsFeature &&
				'serviceWorker' in navigator &&
				navigator.serviceWorker.controller
			) {
				navigator.serviceWorker.controller.postMessage({
					type: 'flush-grade-queue',
				});
			}
		};
		window.addEventListener('online', flushQueue);
		flushQueue();
		return () => window.removeEventListener('online', flushQueue);
	}, [hasAppsFeature]);

	useEffect(() => {
		applyTenantThemeToDocument(school?.themeName);
	}, [school?.themeName]);

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
