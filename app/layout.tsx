'use client'; // This is now a client component to use hooks and window object

import { useEffect } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import './globals.css';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { PageLoading } from '@/components/loading';
import Inactive from './inactive';
import AuthProvider from '@/context/AuthProvider';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Get the fetch action and school data from the Zustand store
	const { school, fetchSchool } = useSchoolStore();

	useEffect(() => {
		// Call the fetch action with the host
		fetchSchool();
	}, [fetchSchool]);

	// Optional: Show a loading state until the school profile is loaded
	if (!school) {
		return (
			<html lang="en">
				<ThemeProvider>
					<body>
						<PageLoading variant="pulse" message="" />
					</body>
				</ThemeProvider>
			</html>
		);
	}

	return (
		<html lang="en">
			<body>
				<AuthProvider>
					<ThemeProvider>
						<SidebarProvider>
							{school.isActive ? (
								children
							) : (
								<Inactive schoolName={school.name} />
							)}
						</SidebarProvider>
					</ThemeProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
