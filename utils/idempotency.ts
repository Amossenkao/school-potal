import { redis } from '@/lib/redis';

const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_STORED_BODY_BYTES = 256 * 1024;

export const IDEMPOTENCY_HEADERS = [
	'x-idempotency-key',
	'x-offline-sync-id',
] as const;

export const readIdempotencyKey = (request: Request): string | undefined => {
	for (const header of IDEMPOTENCY_HEADERS) {
		const value = request.headers.get(header);
		if (value && String(value).trim()) return String(value).trim();
	}
	return undefined;
};

type StoredResult = {
	status: number;
	body: unknown;
	at: number;
};

const cacheKey = (key: string) => `idempotency:${key}`;

export async function runIdempotent<T extends Record<string, unknown>>(options: {
	key: string | null;
	scope: string;
	handler: () => Promise<{ status: number; body: T }>;
}): Promise<{ status: number; body: T; replayed: boolean }> {
	const key = options.key ? `${options.scope}:${options.key}` : null;
	if (!key) {
		const fresh = await options.handler();
		return { ...fresh, replayed: false };
	}

	try {
		const existing = await redis.get(cacheKey(key));
		let parsed: StoredResult | null = null;
		if (typeof existing === 'string') {
			try {
				parsed = JSON.parse(existing) as StoredResult;
			} catch {
				parsed = null;
			}
		} else if (existing && typeof existing === 'object') {
			parsed = existing as StoredResult;
		}

		if (parsed && parsed.status >= 200 && parsed.status < 300) {
			return {
				status: parsed.status,
				body: parsed.body as T,
				replayed: true,
			};
		}
	} catch (error) {
		console.warn('Idempotency lookup failed; proceeding without dedup.', error);
	}

	const fresh = await options.handler();
	if (fresh.status >= 200 && fresh.status < 300) {
		try {
			const serialized = JSON.stringify(fresh.body);
			if (serialized.length <= MAX_STORED_BODY_BYTES) {
				const stored: StoredResult = {
					status: fresh.status,
					body: fresh.body,
					at: Date.now(),
				};
				await redis.set(cacheKey(key), JSON.stringify(stored), {
					ex: IDEMPOTENCY_TTL_SECONDS,
				});
			}
		} catch (error) {
			console.warn('Failed to store idempotency record.', error);
		}
	}
	return { ...fresh, replayed: false };
}
