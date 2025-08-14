import SchoolProvider from '@/context/SchoolContext';
import './globals.css';
// import { Outfit } from 'next/font/google';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';

// const outfit = Outfit({
// 	subsets: ['latin'],
// });

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>
				<ThemeProvider>
					<SchoolProvider>
						<SidebarProvider>{children}</SidebarProvider>
					</SchoolProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
