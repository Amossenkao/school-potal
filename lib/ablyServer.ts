import Ably from 'ably';
import {
	buildRealtimeEvent,
	getAuthorizedRealtimeCapabilities,
	resolveCanonicalTenantKey,
	resolvePublishChannels,
	resolveTenantSyncKey,
	type AuthorizedRealtimeUser,
	type RealtimeEvent,
	type RealtimeScope,
	type SyncDomain,
} from '@/lib/realtimeTypes';
import { syncDebugLog, syncDebugWarn } from '@/lib/syncDebug';

// After
let _ablyRestClient: Ably.Rest | null = null;
const getAblyRestClient = (): Ably.Rest => {
  if (_ablyRestClient) return _ablyRestClient;
  const apiKey = String(process.env.ABLY_API_KEY || '').trim();
  if (!apiKey) throw new Error('ABLY_API_KEY is missing.');
  _ablyRestClient = new Ably.Rest(apiKey);
  return _ablyRestClient;
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
	seq?: number;
}) => {
	const tenantId = resolveTenantSyncKey({ tenantId: params.tenantId });
	if (!tenantId) {
		// Returning quietly here means an event simply never happens, with
		// nothing in the logs to say so — the caller could not resolve a tenant
		// key and every subscriber waits forever for a message that was never
		// sent. Say so.
		console.warn(
			'[realtime-sync] Dropped event: caller supplied no tenant key.',
			{ type: params.type, domain: params.domain, reason: params.reason },
		);
		syncDebugWarn('publish', 'Dropped event: no tenant key.', {
			type: params.type,
			domain: params.domain,
			reason: params.reason,
		});
		return;
	}
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
		seq: params.seq,
	});
	const channels = resolvePublishChannels(event);
	const rest = getAblyRestClient();
	await Promise.all(
		channels.map(async (channelName) => {
			const channel = rest.channels.get(channelName);
			await channel.publish(event.type, event);
		}),
	);
	// Ungated on purpose. The gated variant below only speaks when
	// SYNC_DEBUG_LOGS is set, which meant a successful publish left no trace at
	// all — indistinguishable in the logs from a publish that never ran. This
	// one line is what tells you the event actually left the server, and on
	// which channels.
	console.log('[realtime-sync] Published', event.type, 'to', channels.join(', '));
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
	seq?: number;
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
			seq: typeof params.seq === 'number' ? params.seq : undefined,
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
	seq?: number;
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
	seq?: number;
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

export {
	resolveCanonicalTenantKey,
	resolveTenantSyncKey,
	getAuthorizedRealtimeCapabilities,
};
