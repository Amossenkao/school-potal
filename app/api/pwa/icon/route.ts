import { NextRequest, NextResponse } from 'next/server';
import { getSchoolProfile } from '@/lib/mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_SIZE = 192;
const MIN_SIZE = 64;
const MAX_SIZE = 1024;

const IMAGE_CACHE_HEADERS = {
	'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
};

const parseSize = (input: string | null) => {
	const parsed = Number(input);
	if (!Number.isFinite(parsed)) return DEFAULT_SIZE;
	return Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.floor(parsed)));
};

const parseFormat = (input: string | null) => {
	const normalized = String(input || '').trim().toLowerCase();
	return normalized === 'svg' ? 'svg' : 'png';
};

const parseMode = (input: string | null) => {
	const normalized = String(input || '').trim().toLowerCase();
	return normalized === 'avatar' ? 'avatar' : 'auto';
};

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

const toInitials = (value: string) => {
	const parts = String(value || '')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (parts.length === 0) return 'SP';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const toAbsoluteHttpUrl = (value: string, requestUrl: string) => {
	try {
		const url = new URL(value, requestUrl);
		if (!['http:', 'https:'].includes(url.protocol)) return '';
		if (url.pathname === '/api/pwa/icon') return '';
		return url.toString();
	} catch {
		return '';
	}
};

const fetchAndReturnImage = async (url: string) => {
	try {
		const response = await fetch(url, {
			cache: 'no-store',
		});
		if (!response.ok) return null;
		const contentType = String(response.headers.get('content-type') || '');
		if (!contentType.startsWith('image/')) return null;
		if (contentType.includes('image/svg+xml')) return null;
		const body = await response.arrayBuffer();
		if (!body.byteLength) return null;
		return new NextResponse(body, {
			headers: {
				'Content-Type': contentType,
				...IMAGE_CACHE_HEADERS,
			},
		});
	} catch {
		return null;
	}
};

export async function GET(request: NextRequest) {
	const size = parseSize(request.nextUrl.searchParams.get('size'));
	const format = parseFormat(request.nextUrl.searchParams.get('format'));
	const mode = parseMode(request.nextUrl.searchParams.get('mode'));
	const profileRaw = await getSchoolProfile({ bypassCache: true });
	const profile =
		typeof profileRaw === 'string' ? JSON.parse(profileRaw) : profileRaw;
	const schoolName = toSchoolName(profile);
	const initials = toInitials(schoolName);

	if (format === 'svg') {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#0f172a"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="${Math.round(
			size * 0.34,
		)}" font-weight="700">${initials}</text></svg>`;
		return new NextResponse(svg, {
			headers: {
				'Content-Type': 'image/svg+xml; charset=utf-8',
				...IMAGE_CACHE_HEADERS,
			},
		});
	}

	const logoCandidates =
		mode === 'avatar'
			? []
			: [profile?.logoUrl, profile?.logoUrl2]
					.map((value: unknown) => String(value || '').trim())
					.filter(Boolean)
					.map((value) => toAbsoluteHttpUrl(value, request.url))
					.filter(Boolean);

	for (const logoUrl of logoCandidates) {
		const proxiedImage = await fetchAndReturnImage(logoUrl);
		if (proxiedImage) return proxiedImage;
	}

	const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
		schoolName,
	)}&size=${size}&background=0f172a&color=ffffff&bold=true&format=png`;
	const avatarImage = await fetchAndReturnImage(avatarUrl);
	if (avatarImage) return avatarImage;

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#0f172a"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="${Math.round(
		size * 0.34,
	)}" font-weight="700">${initials}</text></svg>`;
	return new NextResponse(svg, {
		headers: {
			'Content-Type': 'image/svg+xml; charset=utf-8',
			...IMAGE_CACHE_HEADERS,
		},
	});
}
