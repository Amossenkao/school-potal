import { NextRequest, NextResponse } from 'next/server';
import { getSchoolProfile } from '@/lib/mongoose';
import {
	createAblyTokenRequest,
	resolveTenantSyncKey,
} from '@/lib/realtimeSync';
import { syncDebugError, syncDebugLog, syncDebugWarn } from '@/lib/syncDebug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStoreJson = (payload: Record<string, unknown>, status = 200) =>
	NextResponse.json(payload, {
		status,
		headers: {
			'Cache-Control': 'no-store, no-cache, must-revalidate',
		},
	});

export async function GET(request: NextRequest) {
	const requestId = crypto.randomUUID();
	const startedAt = Date.now();
	try {
		syncDebugLog('public-stream-token', 'Incoming public token request.', {
			requestId,
			host: request.headers.get('host') || null,
			userAgent: request.headers.get('user-agent') || null,
		});

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

		const tokenRequest = await createAblyTokenRequest({
			tenantId: tenantKey,
			publicOnly: true,
			clientId: `public:${tenantKey}`,
		});
		syncDebugLog('public-stream-token', 'Issued public stream token.', {
			requestId,
			tenantKey,
			channels: Object.keys(
				JSON.parse(String(tokenRequest.capability || '{}')),
			),
			durationMs: Date.now() - startedAt,
		});

		return noStoreJson({
			success: true,
			...tokenRequest,
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
