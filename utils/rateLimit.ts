import { redis } from '@/lib/redis';

export type RateLimitResult = {
	allowed: boolean;
	remaining: number;
	retryAfter: number;
	limit: number;
};

export async function checkRateLimit(
	key: string,
	limit: number,
	windowSeconds: number,
): Promise<RateLimitResult> {
	const current = await redis.incr(key);
	if (current === 1) {
		await redis.expire(key, windowSeconds);
	}

	const ttl = await redis.ttl(key);
	const retryAfter = ttl > 0 ? ttl : windowSeconds;
	const remaining = Math.max(0, limit - current);

	return {
		allowed: current <= limit,
		remaining,
		retryAfter,
		limit,
	};
}

export function getRequestIp(headers: Headers): string {
	const forwardedFor = headers.get('x-forwarded-for');
	if (forwardedFor) {
		const first = forwardedFor.split(',')[0]?.trim();
		if (first) return first;
	}
	return headers.get('x-real-ip') || 'unknown';
}
