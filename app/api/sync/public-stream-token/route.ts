import { NextRequest, NextResponse } from 'next/server';
import { getSchoolProfile } from '@/lib/mongoose';
import {
	getTenantPublicSyncChannel,
	resolveTenantSyncKey,
} from '@/lib/realtimeSync';
import { createStreamToken } from '@/lib/streamToken';
import { syncDebugError, syncDebugLog, syncDebugWarn } from '@/lib/syncDebug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_TOKEN_TTL_SECONDS = 90;
const MAX_TOKEN_TTL_SECONDS = 600;

const parseTtlSeconds = () => {
	const raw = Number(process.env.SYNC_PUBLIC_STREAM_TOKEN_TTL_SECONDS);
	if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TOKEN_TTL_SECONDS;
	return Math.min(MAX_TOKEN_TTL_SECONDS, Math.floor(raw));
};

const noStoreJson = (payload: Record<string, unknown>, status = 200) =>
	NextResponse.json(payload, {
		status,
		headers: {
			'Cache-Control': 'no-store, no-cache, must-revalidate',
		},
	});

const resolveStreamUrl = (request: NextRequest) => {
	const raw = String(process.env.NEXT_PUBLIC_SYNC_STREAM_URL || '').trim();
	if (raw) {
		try {
			const url = new URL(raw);
			if (!url.pathname || url.pathname === '/') {
				url.pathname = '/sync/events';
			}
			return url.toString();
		} catch {
			console.warn(
				'[sync-public-stream-token] Invalid NEXT_PUBLIC_SYNC_STREAM_URL value.',
			);
		}
	}
	const fallback = new URL('/api/sync/public-events', request.url);
	return fallback.toString();
};

export async function GET(request: NextRequest) {
	const requestId = crypto.randomUUID();
	const startedAt = Date.now();
	try {
		syncDebugLog('public-stream-token', 'Incoming public token request.', {
			requestId,
			host: request.headers.get('host') || null,
			userAgent: request.headers.get('user-agent') || null,
		});

		const secret = String(process.env.SYNC_STREAM_JWT_SECRET || '').trim();
		if (!secret) {
			console.error(
				'[sync-public-stream-token] Missing SYNC_STREAM_JWT_SECRET environment variable.',
			);
			syncDebugError('public-stream-token', 'Missing signing secret.', {
				requestId,
				durationMs: Date.now() - startedAt,
			});
			return noStoreJson(
				{
					success: false,
					message: 'Sync stream is not configured.',
				},
				500,
			);
		}

		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const tenantKey = resolveTenantSyncKey({
			schoolProfile,
			host: request.headers.get('host'),
		});
		if (!tenantKey) {
			syncDebugWarn('public-stream-token', 'Unable to resolve tenant key.', {
				requestId,
				durationMs: Date.now() - startedAt,
			});
			return noStoreJson(
				{
					success: false,
					message: 'Unable to resolve tenant channel.',
				},
				500,
			);
		}

		const channels = [getTenantPublicSyncChannel(tenantKey)];
		const publicSubject = `public:${tenantKey}`;
		const ttlSeconds = parseTtlSeconds();
		const token = await createStreamToken(
			{
				sub: publicSubject,
				userId: publicSubject,
				tenantKey,
				channels,
			},
			{
				secret,
				expiresInSeconds: ttlSeconds,
			},
		);
		const streamUrl = resolveStreamUrl(request);
		syncDebugLog('public-stream-token', 'Issued public stream token.', {
			requestId,
			tenantKey,
			channels,
			ttlSeconds,
			streamUrl,
			durationMs: Date.now() - startedAt,
		});

		return noStoreJson({
			success: true,
			token,
			expiresInSeconds: ttlSeconds,
			streamUrl,
		});
	} catch (error) {
		console.error(
			'[sync-public-stream-token] Failed to mint public stream token:',
			error,
		);
		syncDebugError(
			'public-stream-token',
			'Unhandled public token route failure.',
			{
				requestId,
				error: error instanceof Error ? error.message : String(error),
				durationMs: Date.now() - startedAt,
			},
		);
		return noStoreJson(
			{
				success: false,
				message: 'Failed to initialize public sync stream token.',
			},
			500,
		);
	}
}
