import './globals.css';
import type { Metadata } from 'next';
import RootProviders from '@/components/RootProviders';
import { getSchoolProfile } from '@/lib/mongoose';

export async function generateMetadata(): Promise<Metadata> {
	const profile = await getSchoolProfile();
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

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>
				<RootProviders>{children}</RootProviders>
			</body>
		</html>
	);
}
