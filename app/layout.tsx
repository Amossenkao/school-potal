import './globals.css';
import type { Metadata } from 'next';
import RootProviders from '@/components/RootProviders';
import { getSchoolProfile } from '@/lib/mongoose';

export async function generateMetadata(): Promise<Metadata> {
	const profileRaw = await getSchoolProfile();
	const profile =
		typeof profileRaw === 'string' ? JSON.parse(profileRaw) : profileRaw;
	const logoUrl = profile?.logoUrl || '/favicon.ico';
	const hasApps = profile?.enabledFeatures?.includes('apps');
	return {
		manifest: hasApps ? '/manifest.webmanifest' : undefined,
		themeColor: hasApps ? '#0f172a' : undefined,
		icons: {
			icon: logoUrl,
			apple: logoUrl,
		},
	};
}

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const profileRaw = await getSchoolProfile();
	const profile =
		typeof profileRaw === 'string' ? JSON.parse(profileRaw) : profileRaw;
	const hasApps = profile?.enabledFeatures?.includes('apps');
	return (
		<html lang="en">
			<head>
				{hasApps && <link rel="manifest" href="/manifest.webmanifest" />}
			</head>
			<body>
				<RootProviders>{children}</RootProviders>
			</body>
		</html>
	);
}
