import './globals.css';
import type { Metadata } from 'next';
import RootProviders from '@/components/RootProviders';
import DynamicDocumentTitle from '@/components/DynamicDocumentTitle';
import { getSchoolProfile } from '@/lib/mongoose';
import {
	buildTenantThemeCss,
	resolveTenantThemeColor,
} from '@/lib/tenantTheme';

const toSchoolName = (profile: any) => {
	const rawName = profile?.name;
	if (typeof rawName === 'string' && rawName.trim()) {
		return rawName.trim();
	}
	if (Array.isArray(rawName)) {
		const firstNonEmpty = rawName.find(
			(value: unknown) => typeof value === 'string' && value.trim(),
		);
		if (typeof firstNonEmpty === 'string') {
			return firstNonEmpty.trim();
		}
	}
	if (typeof profile?.shortName === 'string' && profile.shortName.trim()) {
		return profile.shortName.trim();
	}
	return 'School';
};

const toSchoolShortName = (profile: any, fallbackName: string) => {
	const candidate =
		(typeof profile?.shortName === 'string' ? profile.shortName : '') ||
		(typeof profile?.initials === 'string' ? profile.initials : '') ||
		fallbackName;
	const normalized = String(candidate || '').trim();
	if (normalized.length <= 1) return fallbackName;
	return normalized;
};

export async function generateMetadata(): Promise<Metadata> {
	const profileRaw = await getSchoolProfile();
	const profile =
		typeof profileRaw === 'string' ? JSON.parse(profileRaw) : profileRaw;
	const logoUrl = profile?.logoUrl || profile?.logoUrl2;
	const hasApps = profile?.enabledFeatures?.includes('apps');
	const schoolName = toSchoolName(profile);
	const schoolShortName = toSchoolShortName(profile, schoolName);
	const tenantThemeColor = resolveTenantThemeColor(profile?.themeName);
	return {
		applicationName: schoolShortName,
		title: {
			default: `${schoolShortName} | Home`,
			template: `${schoolShortName} | %s`,
		},
		manifest: hasApps ? '/manifest.webmanifest' : undefined,
		themeColor: hasApps ? tenantThemeColor : undefined,
		icons: hasApps
			? {
					icon: [
						{
							url: '/api/pwa/icon?size=32&mode=avatar&format=png',
							sizes: '32x32',
							type: 'image/png',
						},
						{
							url: '/api/pwa/icon?size=192&mode=avatar&format=png',
							sizes: '192x192',
							type: 'image/png',
						},
						{
							url: '/api/pwa/icon?size=512&mode=avatar&format=png',
							sizes: '512x512',
							type: 'image/png',
						},
					],
					shortcut: ['/api/pwa/icon?size=192&mode=avatar&format=png'],
					apple: [
						{
							url: '/api/pwa/icon?size=180&mode=avatar&format=png',
							sizes: '180x180',
							type: 'image/png',
						},
					],
				}
			: {
					icon: logoUrl,
					apple: logoUrl,
				},
		appleWebApp: hasApps
			? {
					capable: true,
					title: schoolShortName,
					statusBarStyle: 'default',
				}
			: undefined,
		other: hasApps
			? {
					'mobile-web-app-capable': 'yes',
					'apple-mobile-web-app-capable': 'yes',
					'msapplication-TileColor': tenantThemeColor,
					'msapplication-TileImage':
						'/api/pwa/icon?size=144&mode=avatar&format=png',
				}
			: undefined,
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
	const schoolName = toSchoolName(profile);
	const schoolShortName = toSchoolShortName(profile, schoolName);
	const tenantThemeColor = resolveTenantThemeColor(profile?.themeName);
	const tenantThemeCss = buildTenantThemeCss(profile?.themeName);
	return (
		<html lang="en">
			<head>
				{hasApps && <link rel="manifest" href="/manifest.webmanifest" />}
				{hasApps && (
					<link
						rel="apple-touch-icon"
						sizes="180x180"
						href="/api/pwa/icon?size=180"
					/>
				)}
				{hasApps && (
					<meta
						name="msapplication-TileImage"
						content="/api/pwa/icon?size=144"
					/>
				)}
				{hasApps && (
					<meta name="msapplication-TileColor" content={tenantThemeColor} />
				)}
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
