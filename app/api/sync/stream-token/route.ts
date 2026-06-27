import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getTenantModels } from '@/models';
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

	const HANDLER_TIMEOUT_MS = 8_000;

	async function handleGetRequest(request: NextRequest): Promise<NextResponse> {
		const requestId = crypto.randomUUID();
		const startedAt = Date.now();
		try {
			syncDebugLog('stream-token', 'Incoming token request.', {
				requestId,
				host: request.headers.get('host') || null,
				userAgent: request.headers.get('user-agent') || null,
			});

			const [currentUser, schoolProfileRaw] = await Promise.all([
				authorizeUser(request),
				getSchoolProfile(),
			]);
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

			// After — use session fields directly, zero DB calls
			const tokenRequest = await createAblyTokenRequest({
				tenantId: tenantKey,
				user: {
					id: currentUser.id,
					role: currentUser.role,
					subjects: currentUser.subjects ?? undefined,
					sponsorClass: currentUser.sponsorClass ?? undefined,
					classId: currentUser.classId ?? undefined,
					academicYears: currentUser.academicYears ?? undefined,
					position: currentUser.position ?? undefined,
				},
				role: currentUser.role,
				clientId: userId,
			});
			syncDebugLog('stream-token', 'Issued stream token.', {
				requestId,
				userId,
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


export async function GET(request: NextRequest) {
	const requestId = crypto.randomUUID();
	try {
		return await Promise.race([
			handleGetRequest(request),
			new Promise<never>((_, reject) =>
				setTimeout(
					() =>
						reject(
							new Error(`stream-token timed out after ${HANDLER_TIMEOUT_MS}ms`),
						),
					HANDLER_TIMEOUT_MS,
				),
			),
		]);
	} catch (error) {
		const isTimeout =
			error instanceof Error && error.message.includes('timed out');
		console.error(
			`[stream-token] ${isTimeout ? 'Timeout' : 'Unhandled error'}:`,
			error,
		);
		return NextResponse.json(
			{ success: false, message: 'Token service temporarily unavailable' },
			{ status: 503, headers: { 'Cache-Control': 'no-store' } },
		);
	}
}
