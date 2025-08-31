'use client'; // This is now a client component to use hooks and window object

import { useEffect } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import SchoolProvider from '@/context/SchoolContext';
import './globals.css';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { PageLoading } from '@/components/loading';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Get the fetch action and school data from the Zustand store
	const { school, fetchSchool } = useSchoolStore();

	useEffect(() => {
		// Get the host from the browser's window object
		const currentHost = window.location.hostname;

		// Call the fetch action with the host
		fetchSchool(currentHost);
	}, [fetchSchool]); // Runs once on component mount

	// Optional: Show a loading state until the school profile is loaded
	if (!school) {
		return (
			<html lang="en">
				<ThemeProvider>
					<body>
						<PageLoading variant="pulse" message="Loading Home Page..." />
					</body>
				</ThemeProvider>
			</html>
		);
	}

	return (
		<html lang="en">
			<body>
				<SchoolProvider>
					<ThemeProvider>
						<SidebarProvider>{children}</SidebarProvider>
					</ThemeProvider>
				</SchoolProvider>
			</body>
		</html>
	);
}
