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

		const models = await getTenantModels();
		let realtimeUser: Record<string, any> | null = null;
		switch (String(currentUser.role || '').toLowerCase()) {
			case 'teacher':
				realtimeUser = await models.Teacher.findById(currentUser.id)
					.select('id role subjects sponsorClass')
					.lean();
				break;
			case 'student':
				realtimeUser = await models.Student.findById(currentUser.id)
					.select('id role classId academicYears')
					.lean();
				break;
			case 'administrator':
				realtimeUser = await models.Administrator.findById(currentUser.id)
					.select('id role academicYears position')
					.lean();
				break;
			default:
				realtimeUser = await models.User.findById(currentUser.id)
					.select('id role')
					.lean();
		}

		const tokenRequest = await createAblyTokenRequest({
			tenantId: tenantKey,
			user: realtimeUser,
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
