import './globals.css';
import type { Metadata } from 'next';
import RootProviders from '@/components/RootProviders';
import { getSchoolProfile } from '@/lib/mongoose';

export async function generateMetadata(): Promise<Metadata> {
	const profile = await getSchoolProfile();
	const logoUrl = profile?.logoUrl || '/favicon.ico';
	return {
		manifest: '/manifest.webmanifest',
		themeColor: '#0f172a',
		icons: {
			icon: logoUrl,
			apple: logoUrl,
		},
	};
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<head>
				<link rel="manifest" href="/manifest.webmanifest" />
			</head>
			<body>
				<RootProviders>{children}</RootProviders>
			</body>
		</html>
	);
}
