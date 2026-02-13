'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { PageLoading } from '@/components/loading';
import VercelUpgrade from '@/components/uca-inactive';
import AuthProvider from '@/context/AuthProvider';
import OfflineHandler from '@/components/OfflineHandler';
import { Toaster } from 'react-hot-toast';

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
	const [bootstrapTimedOut, setBootstrapTimedOut] = useState(false);

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

	const isOffline =
		typeof navigator !== 'undefined' && navigator.onLine === false;
	const waitingForSchoolProfile = !school && !isOffline;

	useEffect(() => {
		if (!waitingForSchoolProfile) {
			setBootstrapTimedOut(false);
			return;
		}
		const timer = window.setTimeout(() => {
			setBootstrapTimedOut(true);
		}, 8000);
		return () => window.clearTimeout(timer);
	}, [waitingForSchoolProfile]);

	const retryBootstrap = useCallback(() => {
		setBootstrapTimedOut(false);
		hydrateCache();
		hydrateFromCache();
		void fetchSchool();
	}, [fetchSchool, hydrateCache, hydrateFromCache]);

	if (waitingForSchoolProfile && !bootstrapTimedOut) {
		return (
			<ThemeProvider>
				<PageLoading variant="pulse" message="Loading portal..." />
			</ThemeProvider>
		);
	}

	if (waitingForSchoolProfile && bootstrapTimedOut) {
		return (
			<ThemeProvider>
				<div className="min-h-screen bg-background flex items-center justify-center p-6">
					<div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
						<h2 className="text-lg font-semibold text-foreground">
							App startup is taking too long
						</h2>
						<p className="mt-2 text-sm text-muted-foreground">
							School profile data could not be restored in time.
						</p>
						<div className="mt-5 flex justify-center gap-3">
							<button
								type="button"
								onClick={retryBootstrap}
								className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
							>
								Retry
							</button>
							<button
								type="button"
								onClick={() => window.location.reload()}
								className="rounded-lg border border-border px-4 py-2 text-foreground hover:bg-accent"
							>
								Reload
							</button>
						</div>
					</div>
				</div>
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
