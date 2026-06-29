import './globals.css';
import type { Metadata } from 'next';
import RootProviders from '@/components/RootProviders';
import DynamicDocumentTitle from '@/components/DynamicDocumentTitle';
import { getSchoolProfile } from '@/lib/mongoose';
import {
	buildTenantThemeCss,
	resolveTenantThemeColor,
} from '@/lib/tenantTheme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Blocking restore script ──────────────────────────────────────────────────
// This runs synchronously before the first paint so there is no flash of the
// wrong theme or colour-mode on hard refresh / SSR.
// It mirrors exactly what applyTenantThemeToDocument() + ThemeToggleButton do
// at runtime — the only source of truth is localStorage.
const THEME_RESTORE_SCRIPT = `
(function () {
  try {
    // ── 1. Dark / light mode ────────────────────────────────────────────────
    // Adjust the localStorage key below if ThemeToggleButton uses a different one.
    var mode = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = mode === 'dark' || (mode !== 'light' && prefersDark);
    document.documentElement.classList.toggle('dark', dark);

    // ── 2. Tenant theme ─────────────────────────────────────────────────────
    // Setting data-theme lets CSS selectors in globals.css restore variables
    // instantly without waiting for the JS bundle.
    // applyTenantThemeToDocument() must also call setAttribute('data-theme', name)
    // so the attribute stays in sync whenever the user changes themes at runtime.
    var theme = localStorage.getItem('user_theme_preference');
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (_) {
    // localStorage unavailable (private browsing edge-cases) — silently skip.
  }
})();
`.trim();

// ─── Metadata ─────────────────────────────────────────────────────────────────

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
	const hasApps = profile?.enabledFeatures?.includes('apps');
	const schoolName = toSchoolName(profile);
	const schoolShortName = toSchoolShortName(profile, schoolName);
	const tenantThemeColor = resolveTenantThemeColor(profile?.themeName);
	const tenantThemeCss = buildTenantThemeCss(profile?.themeName);

	return (
		// Suppress hydration warning: the blocking script mutates classList and
		// data-theme before React hydrates, so a mismatch is expected and harmless.
		<html lang="en" suppressHydrationWarning>
			<head>
				{/*
				 * ── Blocking theme-restore script ────────────────────────────────────
				 * Must be the FIRST child of <head> so it runs before any stylesheet or
				 * element is painted. Restores dark-mode class and data-theme attribute
				 * from localStorage synchronously, eliminating flash on hard refresh.
				 */}
				<script dangerouslySetInnerHTML={{ __html: THEME_RESTORE_SCRIPT }} />

				{/* Server-side tenant theme — used as the SSR baseline / fallback.
				    At runtime applyTenantThemeToDocument() takes over and the
				    data-theme attribute drives per-user overrides via CSS. */}
				{tenantThemeCss && (
					<style
						id="tenant-theme"
						dangerouslySetInnerHTML={{ __html: tenantThemeCss }}
					/>
				)}

				{/* PWA / manifest tags */}
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
				<DynamicDocumentTitle fallbackSchoolShortName={schoolShortName} />
				<RootProviders>{children}</RootProviders>
			</body>
		</html>
	);
}
