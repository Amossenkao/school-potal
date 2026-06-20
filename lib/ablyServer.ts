import Ably from 'ably';
import {
	buildRealtimeEvent,
	getAuthorizedRealtimeCapabilities,
	resolvePublishChannels,
	resolveTenantSyncKey,
	type AuthorizedRealtimeUser,
	type RealtimeEvent,
	type RealtimeScope,
	type SyncDomain,
} from '@/lib/realtimeTypes';
import { syncDebugLog, syncDebugWarn } from '@/lib/syncDebug';

const getAblyRestClient = () => {
	const apiKey = String(process.env.ABLY_API_KEY || '').trim();
	if (!apiKey) {
		throw new Error('ABLY_API_KEY is missing.');
	}
	return new Ably.Rest(apiKey);
};

const toUniqueStrings = (values?: string[]) => {
	if (!Array.isArray(values)) return [];
	return Array.from(
		new Set(values.map((value) => String(value || '').trim()).filter(Boolean)),
	);
};

export const createAblyTokenRequest = async (options: {
	tenantId: string;
	user?: AuthorizedRealtimeUser | null;
	role?: string | null;
	publicOnly?: boolean;
	clientId?: string;
}) => {
	const rest = getAblyRestClient();
	const capability = getAuthorizedRealtimeCapabilities(options);
	const clientId =
		String(options.clientId || options.user?.id || '').trim() || undefined;
	return rest.auth.createTokenRequest({
		capability: JSON.stringify(capability),
		clientId,
	});
};

export const publishRealtimeEvent = async (params: {
	tenantId: string;
	type?: string;
	domain?: SyncDomain;
	payload?: Record<string, unknown>;
	source?: string;
	reason?: string;
	academicYear?: string | null;
	actorId?: string | null;
	scope?: RealtimeScope;
	targetUserIds?: string[];
}) => {
	const tenantId = resolveTenantSyncKey({ tenantId: params.tenantId });
	if (!tenantId) return;
	const event = buildRealtimeEvent({
		type: params.type,
		domain: params.domain,
		tenantId,
		payload: params.payload,
		source: params.source,
		reason: params.reason,
		academicYear: params.academicYear,
		actorId: params.actorId,
		scope: params.scope,
		targetUserIds: params.targetUserIds,
	});
	const channels = resolvePublishChannels(event);
	const rest = getAblyRestClient();
	await Promise.all(
		channels.map(async (channelName) => {
			const channel = rest.channels.get(channelName);
			await channel.publish(event.type, event);
		}),
	);
	syncDebugLog('publish', 'Published Ably realtime event.', {
		type: event.type,
		tenantId: event.tenantId,
		channels,
		timestamp: event.timestamp,
	});
};

export const publishRealtimeEventSafe = async (params: {
	tenantId: string;
	type?: string;
	domain?: SyncDomain;
	payload?: Record<string, unknown>;
	source?: string;
	reason?: string;
	academicYear?: string | null;
	actorId?: string | null;
	scope?: RealtimeScope;
	targetUserIds?: string[];
}) => {
	try {
		await publishRealtimeEvent(params);
	} catch (error) {
		console.warn(
			'[realtime-sync] Failed to publish Ably realtime event:',
			error,
		);
		syncDebugWarn('publish', 'Failed to publish Ably realtime event.', {
			error: error instanceof Error ? error.message : String(error),
			tenantId: params.tenantId,
			type: params.type,
			domain: params.domain,
			reason: params.reason,
		});
	}
};

export const publishPublicRealtimeEventSafe = async (params: {
	tenantId: string;
	type?: string;
	domain?: SyncDomain;
	payload?: Record<string, unknown>;
	source?: string;
	reason?: string;
	academicYear?: string | null;
	actorId?: string | null;
	scope?: RealtimeScope;
}) => {
	await publishRealtimeEventSafe({
		...params,
		source: params.source || 'system',
	});
};

export const publishRealtimeEventsForAcademicYearsSafe = async (params: {
	tenantId: string;
	type?: string;
	domain?: SyncDomain;
	academicYears?: string[];
	payload?: Record<string, unknown>;
	source?: string;
	reason?: string;
	actorId?: string | null;
	scope?: RealtimeScope;
	targetUserIds?: string[];
}) => {
	const years = toUniqueStrings(params.academicYears);
	if (years.length === 0) {
		await publishRealtimeEventSafe(params);
		return;
	}
	await Promise.all(
		years.map((academicYear) =>
			publishRealtimeEventSafe({
				...params,
				academicYear,
			}),
		),
	);
};

export const getTenantSyncChannel = (tenantId: string) =>
	`school:${String(tenantId || '').trim()}`;

export const getUserSyncChannel = (tenantId: string, userId: string) =>
	`user:${String(tenantId || '').trim()}:${String(userId || '').trim()}`;

export const getTenantPublicSyncChannel = (tenantId: string) =>
	`school:${String(tenantId || '').trim()}`;

export { resolveTenantSyncKey, getAuthorizedRealtimeCapabilities };
