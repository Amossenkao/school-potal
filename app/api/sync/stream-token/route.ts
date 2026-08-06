import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getSchoolProfile } from '@/lib/mongoose';
import {
	createAblyTokenRequest,
	resolveCanonicalTenantKey,
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

	const HANDLER_TIMEOUT_MS = 20_000;

	async function handleGetRequest(request: NextRequest): Promise<NextResponse> {
		const requestId = crypto.randomUUID();
		const startedAt = Date.now();
		try {
			syncDebugLog('stream-token', 'Incoming token request.', {
				requestId,
				host: request.headers.get('host') || null,
				userAgent: request.headers.get('user-agent') || null,
			});

			const t0 = Date.now();
			const [currentUser, schoolProfileRaw] = await Promise.all([
				authorizeUser(request),
				getSchoolProfile(),
			]);
			const t1 = Date.now();
			syncDebugLog('stream-token', 'Auth + profile resolved.', {
				requestId,
				durationMs: t1 - t0,
			});
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
			// Profile-only. `currentUser.tenantId` and the request host both carry
			// the *host*, and a token minted for `school:<host>` is refused at
			// subscribe time with 40160 because the client names its channels from
			// `system.dbName`. Better to fail here, where the client retries, than
			// to hand back a token that cannot work.
			const tenantKey = resolveCanonicalTenantKey({ schoolProfile });
			const role = String(currentUser.role || '').toLowerCase();
			// A superadmin signs in on the platform host, which owns no school
			// profile, so there is no tenant key to resolve — and none is needed:
			// their capability is the wildcard set (school:*, superadmin:*,
			// platform:events), which names no specific tenant. Requiring a key
			// here refused their token outright with a 500 and left the console
			// looping on "Client configured authentication provider request
			// failed". Every other role is still held to a resolvable key.
			if (!tenantKey && role !== 'superadmin') {
				syncDebugWarn('stream-token', 'Unable to resolve tenant key.', {
					requestId,
					role,
					userId: String(currentUser.userId || currentUser.id || ''),
					host: request.headers.get('host') || null,
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

			const tToken = Date.now();
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
					// Parents subscribe to each child's class + user channels, so the
					// token capability must include them. Session payloads carry the
					// hydrated parentChildren (see app/api/auth/me/route.ts).
					parentChildren: Array.isArray(currentUser.parentChildren)
						? currentUser.parentChildren
						: undefined,
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
				authMs: t1 - t0,
				tokenMs: Date.now() - tToken,
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
