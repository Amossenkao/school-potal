import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getSchoolProfile } from '@/lib/mongoose';
import {
	getTenantSyncChannel,
	getUserSyncChannel,
	resolveTenantSyncKey,
} from '@/lib/realtimeSync';
import { createStreamToken } from '@/lib/streamToken';
import { syncDebugError, syncDebugLog, syncDebugWarn } from '@/lib/syncDebug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_TOKEN_TTL_SECONDS = 120;
const MAX_TOKEN_TTL_SECONDS = 600;

const parseTtlSeconds = () => {
	const raw = Number(process.env.SYNC_STREAM_TOKEN_TTL_SECONDS);
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

const resolveStreamUrl = () => {
	const raw = String(process.env.NEXT_PUBLIC_SYNC_STREAM_URL || '').trim();
	if (!raw) return null;
	try {
		const url = new URL(raw);
		if (!url.pathname || url.pathname === '/') {
			url.pathname = '/sync/events';
		}
		return url.toString();
	} catch {
		console.warn('[sync-stream-token] Invalid NEXT_PUBLIC_SYNC_STREAM_URL value.');
		return null;
	}
};

export async function GET(request: NextRequest) {
	const requestId = crypto.randomUUID();
	const startedAt = Date.now();
	try {
		syncDebugLog('stream-token', 'Incoming token request.', {
			requestId,
			host: request.headers.get('host') || null,
			userAgent: request.headers.get('user-agent') || null,
		});

		const currentUser = await authorizeUser(request);
		if (!currentUser) {
			syncDebugWarn('stream-token', 'Unauthorized token request.', {
				requestId,
				durationMs: Date.now() - startedAt,
			});
			return noStoreJson(
				{
					success: false,
					message: 'Unauthorized',
				},
				401,
			);
		}

		const secret = String(process.env.SYNC_STREAM_JWT_SECRET || '').trim();
		if (!secret) {
			console.error(
				'[sync-stream-token] Missing SYNC_STREAM_JWT_SECRET environment variable.',
			);
			syncDebugError('stream-token', 'Missing signing secret.', {
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
			tenantId: currentUser.tenantId,
			host: request.headers.get('host'),
		});
		if (!tenantKey) {
			syncDebugWarn('stream-token', 'Unable to resolve tenant key.', {
				requestId,
				userId: String(currentUser.userId || currentUser.id || ''),
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

		const userId = String(currentUser.userId || currentUser.id || '').trim();
		if (!userId) {
			syncDebugWarn('stream-token', 'Unable to resolve user id.', {
				requestId,
				tenantKey,
				durationMs: Date.now() - startedAt,
			});
			return noStoreJson(
				{
					success: false,
					message: 'Unable to resolve user channel.',
				},
				500,
			);
		}

		const channels = Array.from(
			new Set([getTenantSyncChannel(tenantKey), getUserSyncChannel(tenantKey, userId)]),
		);

		const ttlSeconds = parseTtlSeconds();
		const token = await createStreamToken(
			{
				sub: userId,
				userId,
				tenantKey,
				channels,
			},
			{
				secret,
				expiresInSeconds: ttlSeconds,
			},
		);
		const streamUrl = resolveStreamUrl();
		syncDebugLog('stream-token', 'Issued stream token.', {
			requestId,
			userId,
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
		console.error('[sync-stream-token] Failed to mint stream token:', error);
		syncDebugError('stream-token', 'Unhandled token route failure.', {
			requestId,
			error: error instanceof Error ? error.message : String(error),
			durationMs: Date.now() - startedAt,
		});
		return noStoreJson(
			{
				success: false,
				message: 'Failed to initialize sync stream token.',
			},
			500,
		);
	}
}
