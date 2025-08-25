// app/layout.tsx
import SchoolProvider from '@/context/SchoolContext';
import './globals.css';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
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
