import './globals.css';
import type { Metadata } from 'next';
import RootProviders from '@/components/RootProviders';
import DynamicDocumentTitle from '@/components/DynamicDocumentTitle';
import { getSchoolProfile } from '@/lib/mongoose';
import {
	buildTenantThemeCss,
	resolveTenantThemeColor,
} from '@/lib/tenantTheme';

export async function generateMetadata(): Promise<Metadata> {
	const profileRaw = await getSchoolProfile();
	const profile =
		typeof profileRaw === 'string' ? JSON.parse(profileRaw) : profileRaw;
	const logoUrl = profile?.logoUrl || profile?.logoUrl2;
	const hasApps = profile?.enabledFeatures?.includes('apps');
	const schoolShortName = profile?.shortName || profile?.name || 'School';
	const tenantThemeColor = resolveTenantThemeColor(profile?.themeName);
	return {
		title: {
			default: `${schoolShortName} | Home`,
			template: `${schoolShortName} | %s`,
		},
		manifest: hasApps ? '/manifest.webmanifest' : undefined,
		themeColor: hasApps ? tenantThemeColor : undefined,
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
	const schoolShortName = profile?.shortName || profile?.name || 'School';
	const tenantThemeCss = buildTenantThemeCss(profile?.themeName);
	return (
		<html lang="en">
			<head>
				{hasApps && <link rel="manifest" href="/manifest.webmanifest" />}
				{tenantThemeCss && (
					<style
						id="tenant-theme"
						dangerouslySetInnerHTML={{ __html: tenantThemeCss }}
					/>
				)}
			</head>
			<body>
				<DynamicDocumentTitle fallbackSchoolShortName={schoolShortName} />
				<RootProviders>{children}</RootProviders>
				<script
					defer
					src="https://static.cloudflareinsights.com/beacon.min.js"
					data-cf-beacon='{"token": "2641db84ad4c444485ac6fdccee7de50"}'
				></script>
			</body>
		</html>
	);
}
