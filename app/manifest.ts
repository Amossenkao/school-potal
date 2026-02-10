import type { MetadataRoute } from 'next';
import { getSchoolProfile } from '@/lib/mongoose';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
	const profileRaw = await getSchoolProfile();
	const profile =
		typeof profileRaw === 'string' ? JSON.parse(profileRaw) : profileRaw;
	const name = profile?.name?.[0] || profile?.shortName || 'School Portal';
	const shortName = profile?.shortName || profile?.initials || name;
	const logoUrl = profile?.logoUrl || '/favicon.ico';
	const logoAltUrl = profile?.logoUrl2 || logoUrl;
	const getType = (url: string) => {
		const lowered = url.toLowerCase();
		if (lowered.endsWith('.svg')) return 'image/svg+xml';
		if (lowered.endsWith('.jpg') || lowered.endsWith('.jpeg')) return 'image/jpeg';
		if (lowered.endsWith('.webp')) return 'image/webp';
		return 'image/png';
	};

	return {
		name,
		short_name: shortName,
		description: profile?.description || 'School management portal',
		start_url: '/dashboard',
		scope: '/',
		display: 'standalone',
		background_color: '#0f172a',
		theme_color: '#0f172a',
		icons: [
			{
				src: logoUrl,
				sizes: '192x192',
				type: getType(logoUrl),
			},
			{
				src: logoAltUrl,
				sizes: '512x512',
				type: getType(logoAltUrl),
			},
			{
				src: logoAltUrl,
				sizes: '512x512',
				type: getType(logoAltUrl),
				purpose: 'maskable',
			},
		],
	};
}
