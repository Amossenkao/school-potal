import { NextResponse } from 'next/server';
import { getSchoolProfile } from '@/lib/mongoose';

export const dynamic = 'force-dynamic';

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
	return 'School Portal';
};

const toShortName = (profile: any, fallbackName: string) => {
	const candidate =
		(typeof profile?.shortName === 'string' ? profile.shortName : '') ||
		(typeof profile?.initials === 'string' ? profile.initials : '') ||
		fallbackName;
	const normalized = String(candidate || '').trim();
	if (normalized.length <= 1) {
		return fallbackName;
	}
	return normalized;
};

export async function GET() {
	const profileRaw = await getSchoolProfile({ bypassCache: true });
	const profile =
		typeof profileRaw === 'string' ? JSON.parse(profileRaw) : profileRaw;
	const hasApps = profile?.enabledFeatures?.includes('apps');
	if (!hasApps) {
		return new NextResponse(null, { status: 404 });
	}

	const fullName = toSchoolName(profile);
	const shortName = toShortName(profile, fullName);
	const themeColor = '#0f172a';
	const icon192 = '/api/pwa/icon?size=192';
	const icon512 = '/api/pwa/icon?size=512';

	return NextResponse.json(
		{
			name: shortName,
			short_name: shortName,
			description: profile?.description || 'School management portal',
			id: '/dashboard',
			start_url: '/dashboard',
			scope: '/',
			display_override: ['standalone', 'browser'],
			display: 'standalone',
			background_color: themeColor,
			theme_color: themeColor,
			icons: [
				{
					src: icon192,
					sizes: '192x192',
					purpose: 'any',
				},
				{
					src: icon512,
					sizes: '512x512',
					purpose: 'any',
				},
				{
					src: icon512,
					sizes: '512x512',
					purpose: 'maskable',
				},
			],
		},
		{
			headers: {
				'Content-Type': 'application/manifest+json',
			},
		},
	);
}
