'use client';

import { useEffect } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
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
	const { school, fetchSchool } = useSchoolStore();

	useEffect(() => {
		fetchSchool();
	}, [fetchSchool]);

	useEffect(() => {
		if (process.env.NODE_ENV !== 'production') return;
		if (!('serviceWorker' in navigator)) return;
		const register = async () => {
			try {
				await navigator.serviceWorker.register('/sw.js');
			} catch (error) {
				console.warn('Service worker registration failed:', error);
			}
		};
		register();
	}, []);

	useEffect(() => {
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
	}, []);

	if (!school) {
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
						{school.isActive ? children : <VercelUpgrade />}
					</OfflineHandler>
				</SidebarProvider>
				<Toaster position="top-right" />
			</ThemeProvider>
		</AuthProvider>
	);
}