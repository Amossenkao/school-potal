// ─── Root layout ──────────────────────────────────────────────────────────────
import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import RootProviders from '@/components/RootProviders';
import DynamicDocumentTitle from '@/components/DynamicDocumentTitle';
import { getSchoolProfile } from '@/lib/mongoose';
import {
	buildTenantThemeCss,
	resolveTenantThemeColor,
} from '@/lib/tenantTheme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toSchoolName = (profile: any) => {
	const rawName = profile?.name || profile?.identity?.name;
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
	const fallbackShort =
		profile?.shortName || profile?.identity?.shortName;
	if (typeof fallbackShort === 'string' && fallbackShort.trim()) {
		return fallbackShort.trim();
	}
	return 'School';
};

const toSchoolShortName = (profile: any, fallbackName: string) => {
	const candidate =
		(typeof (profile?.shortName || profile?.identity?.shortName) === 'string'
			? profile.shortName || profile.identity?.shortName
			: '') ||
		(typeof profile?.initials === 'string' ? profile.initials : '') ||
		fallbackName;
	const normalized = String(candidate || '').trim();
	if (normalized.length <= 1) return fallbackName;
	return normalized;
};

// ─── Blocking restore script ──────────────────────────────────────────────────
// This runs synchronously before the first paint so there is no flash of the
// wrong theme or colour-mode on hard refresh / SSR.
// It mirrors exactly what applyTenantThemeToDocument() + ThemeToggleButton do
// at runtime — the only source of truth is localStorage.
// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
	const profileRaw = await getSchoolProfile();
	const profile =
		typeof profileRaw === 'string' ? JSON.parse(profileRaw) : profileRaw;

	const isSchoolDomain = Boolean(profile);
	const schoolName = isSchoolDomain ? toSchoolName(profile) : 'SchoolMesh';
	const schoolShortName = isSchoolDomain
		? toSchoolShortName(profile, schoolName)
		: 'SchoolMesh';
	const logoUrl = isSchoolDomain
		? profile?.logoUrl || profile?.logoUrl2 || profile?.branding?.logoUrl || profile?.branding?.logoUrl2
		: undefined;
	const hasApps =
		isSchoolDomain && profile?.enabledFeatures?.includes('apps');
	const tenantThemeColor = resolveTenantThemeColor(profile?.themeName);

	let icons: Metadata['icons'];
	if (hasApps) {
		icons = {
			icon: [
				{
					url: '/api/pwa/icon?size=32&mode=logo&format=png',
					sizes: '32x32',
					type: 'image/png',
				},
				{
					url: '/api/pwa/icon?size=192&mode=logo&format=png',
					sizes: '192x192',
					type: 'image/png',
				},
				{
					url: '/api/pwa/icon?size=512&mode=logo&format=png',
					sizes: '512x512',
					type: 'image/png',
				},
			],
			shortcut: ['/api/pwa/icon?size=192&mode=logo&format=png'],
			apple: [
				{
					url: '/api/pwa/icon?size=180&mode=logo&format=png',
					sizes: '180x180',
					type: 'image/png',
				},
			],
		};
	} else if (logoUrl) {
		icons = { icon: logoUrl, apple: logoUrl };
	} else {
		icons = { icon: '/images/SchoolMesh.png', apple: '/images/SchoolMesh.png' };
	}

	return {
		applicationName: schoolShortName,
		title: {
			default: `${schoolShortName} | Home`,
			template: `${schoolShortName} | %s`,
		},
		manifest: hasApps ? '/manifest.webmanifest' : undefined,
		themeColor: hasApps ? tenantThemeColor : undefined,
		icons,
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
						'/api/pwa/icon?size=144&mode=logo&format=png',
				}
			: undefined,
	};
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const profileRaw = await getSchoolProfile();
	const profile =
		typeof profileRaw === 'string' ? JSON.parse(profileRaw) : profileRaw;
	const isSchoolDomain = Boolean(profile);
	const schoolName = isSchoolDomain ? toSchoolName(profile) : 'SchoolMesh';
	const schoolShortName = isSchoolDomain
		? toSchoolShortName(profile, schoolName)
		: 'SchoolMesh';
	const hasApps = isSchoolDomain && profile?.enabledFeatures?.includes('apps');
	const tenantThemeColor = resolveTenantThemeColor(profile?.themeName);
	const tenantThemeCss = buildTenantThemeCss(profile?.themeName);
	const hasSchool = isSchoolDomain;

		return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<DynamicDocumentTitle
					fallbackSchoolShortName={schoolShortName}
					isSchoolDomain={isSchoolDomain}
				/>
				<Script
					id="theme-restore"
					strategy="beforeInteractive"
					src="/theme-restore.js"
				/>

				{tenantThemeCss && (
					<style
						id="tenant-theme"
						dangerouslySetInnerHTML={{ __html: tenantThemeCss }}
					/>
				)}

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
			</head>
			<body>
				<RootProviders hasSchool={hasSchool}>{children}</RootProviders>
			</body>
		</html>
	);
}
