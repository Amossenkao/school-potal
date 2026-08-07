import {
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';

// Generic Cloudflare R2 object storage helpers. Deliberately knows nothing about
// avatars so other surfaces (e.g. SchoolProfile branding.logoUrl) can reuse it.
//
// Note: CLOUDFLARE_API_TOKEN (used by lib/monitoring/cloudflare.ts) is a REST API
// token and cannot write objects. Object writes need the separate S3-compatible
// credentials below.

let client: S3Client | null = null;

export function isR2Configured() {
	return Boolean(
		process.env.CLOUDFLARE_ACCOUNT_ID &&
			process.env.CLOUDFLARE_R2_BUCKET &&
			process.env.R2_ACCESS_KEY_ID &&
			process.env.R2_SECRET_ACCESS_KEY &&
			process.env.R2_PUBLIC_BASE_URL,
	);
}

function getClient() {
	if (client) return client;

	client = new S3Client({
		region: 'auto',
		endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
			secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
		},
	});

	return client;
}

function getPublicBase() {
	return (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
}

export function publicUrlFor(key: string) {
	return `${getPublicBase()}/${key.replace(/^\/+/, '')}`;
}

/**
 * Inverse of publicUrlFor. Returns null when the URL is not served from our own
 * public base — this is the guard that makes deletion safe, since callers may pass
 * arbitrary URLs (DiceBear, Cloudinary, anything a user pasted).
 */
export function keyFromPublicUrl(url: string): string | null {
	const base = getPublicBase();
	if (!base || !url) return null;

	let parsed: URL;
	let parsedBase: URL;
	try {
		parsed = new URL(url);
		parsedBase = new URL(base);
	} catch {
		return null;
	}

	if (parsed.origin !== parsedBase.origin) return null;

	const basePath = parsedBase.pathname.replace(/\/+$/, '');
	if (basePath && !parsed.pathname.startsWith(`${basePath}/`)) return null;

	const key = decodeURIComponent(parsed.pathname.slice(basePath.length)).replace(
		/^\/+/,
		'',
	);
	return key || null;
}

export async function putObject({
	key,
	body,
	contentType,
	cacheControl = 'public, max-age=31536000, immutable',
}: {
	key: string;
	body: Buffer | Uint8Array;
	contentType: string;
	cacheControl?: string;
}): Promise<string> {
	await getClient().send(
		new PutObjectCommand({
			Bucket: process.env.CLOUDFLARE_R2_BUCKET,
			Key: key,
			Body: body,
			ContentType: contentType,
			CacheControl: cacheControl,
		}),
	);

	return publicUrlFor(key);
}

export async function deleteObject(key: string): Promise<void> {
	await getClient().send(
		new DeleteObjectCommand({
			Bucket: process.env.CLOUDFLARE_R2_BUCKET,
			Key: key,
		}),
	);
}
