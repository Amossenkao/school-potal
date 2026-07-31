import type { StorageSummary } from './types';

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

function hasCloudflareConfig() {
	return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

function formatBytes(bytes: number) {
	if (!bytes) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${(bytes / 1024 ** exponent).toFixed(2)} ${units[exponent]}`;
}

async function cloudflareFetch<T>(path: string): Promise<T | null> {
	if (!hasCloudflareConfig()) return null;

	const response = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
		headers: {
			Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
			'Content-Type': 'application/json',
		},
		next: { revalidate: 300 },
	});

	if (!response.ok) {
		throw new Error(`Cloudflare API request failed with ${response.status}`);
	}

	return response.json() as Promise<T>;
}

export async function getR2StorageUsage(): Promise<StorageSummary> {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const bucket = process.env.CLOUDFLARE_R2_BUCKET;

	if (!hasCloudflareConfig() || !bucket) {
		return { usedBytes: 0, used: '0 B', objects: 0, requests: 0, status: 'warning' };
	}

	const payload = await cloudflareFetch<any>(
		`/accounts/${accountId}/r2/buckets/${bucket}/usage`,
	);
	const result = payload?.result ?? {};
	const usedBytes = Number(result.payloadSize || result.storageBytes || result.objectSize || 0);
	const objects = Number(result.objectCount || result.objects || 0);

	return {
		usedBytes,
		used: formatBytes(usedBytes),
		objects,
		requests: Number(result.requests || 0),
		status: 'healthy',
	};
}

export async function getRequestMetrics() {
	const storage = await getR2StorageUsage();
	return {
		requests: storage.requests,
		status: storage.status,
	};
}

export async function getCloudflareHealth() {
	if (!hasCloudflareConfig()) return { status: 'unconfigured' as const };

	try {
		await cloudflareFetch(`/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}`);
		return { status: 'connected' as const };
	} catch (error) {
		return { status: 'error' as const, message: error instanceof Error ? error.message : 'Cloudflare unavailable' };
	}
}
