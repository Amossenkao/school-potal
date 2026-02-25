import { redis } from '@/lib/redis';
import { normalizeHost } from '@/utils/host';
import { syncDebugLog, syncDebugWarn } from '@/lib/syncDebug';

export type SyncDomain =
	| 'school'
	| 'users'
	| 'calendar'
	| 'schedules'
	| 'grades'
	| 'gradeRequests'
	| 'user';

type SyncScope = {
	classIds?: string[];
	roles?: string[];
	userIds?: string[];
};

export type SyncEvent = {
	eventId: string;
	type: string;
	version: 1;
	schemaVersion: 1;
	ts: number;
	tenantKey: string;
	domain: SyncDomain;
	academicYear: string | null;
	changedAt: string;
	actorId: string | null;
	reason: string;
	targetUserIds?: string[];
	scope?: SyncScope;
};

const DEFAULT_REASON = 'data-changed';

const sanitizeChannelSegment = (value: string) =>
	String(value || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9:_-]/g, '_');

const toTrimmedString = (value: unknown) => {
	if (typeof value !== 'string') return '';
	return value.trim();
};

const createEventId = () => {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const toUniqueStrings = (values?: string[]) => {
	if (!Array.isArray(values)) return [];
	return Array.from(
		new Set(values.map((value) => String(value || '').trim()).filter(Boolean)),
	);
};

const toScope = (scope?: SyncScope) => {
	if (!scope) return undefined;
	const nextScope: SyncScope = {};

	const classIds = toUniqueStrings(scope.classIds);
	if (classIds.length > 0) nextScope.classIds = classIds;

	const roles = toUniqueStrings(scope.roles);
	if (roles.length > 0) nextScope.roles = roles;

	const userIds = toUniqueStrings(scope.userIds);
	if (userIds.length > 0) nextScope.userIds = userIds;

	if (
		!nextScope.classIds &&
		!nextScope.roles &&
		!nextScope.userIds
	) {
		return undefined;
	}
	return nextScope;
};

const toTenantCandidate = (value: unknown) => {
	const raw = toTrimmedString(value);
	if (!raw) return '';
	return normalizeHost(raw) || raw;
};

export const resolveTenantSyncKey = (options: {
	schoolProfile?: any;
	tenantId?: string | null;
	host?: string | null;
}) => {
	// Prefer canonical tenant identity to avoid host alias splits
	// (e.g. localhost vs LAN IP resulting in different channels).
	const candidates = [
		options.schoolProfile?.dbName,
		options.schoolProfile?.host,
		options.tenantId,
		options.host,
	];
	for (const candidate of candidates) {
		const resolved = toTenantCandidate(candidate);
		if (resolved) return resolved;
	}
	return '';
};

export const getTenantSyncChannel = (tenantKey: string) =>
	`sync:tenant:${sanitizeChannelSegment(tenantKey)}`;

export const getUserSyncChannel = (tenantKey: string, userId: string) =>
	`sync:user:${sanitizeChannelSegment(tenantKey)}:${sanitizeChannelSegment(
		userId,
	)}`;

export const publishSyncEvent = async (params: {
	tenantKey: string;
	domain: SyncDomain;
	academicYear?: string | null;
	actorId?: string | null;
	reason?: string;
	scope?: SyncScope;
	targetUserIds?: string[];
}) => {
	const tenantKey = toTenantCandidate(params.tenantKey);
	if (!tenantKey) return;
	const targetUserIds = toUniqueStrings(params.targetUserIds);
	const timestamp = Date.now();
	const reason = toTrimmedString(params.reason) || DEFAULT_REASON;

	const event: SyncEvent = {
		eventId: createEventId(),
		type: `${params.domain}.${reason}`,
		version: 1,
		schemaVersion: 1,
		ts: timestamp,
		tenantKey,
		domain: params.domain,
		academicYear: toTrimmedString(params.academicYear) || null,
		changedAt: new Date(timestamp).toISOString(),
		actorId: toTrimmedString(params.actorId) || null,
		reason,
	};
	if (targetUserIds.length > 0) {
		event.targetUserIds = targetUserIds;
	}
	const scope = toScope(params.scope);
	if (scope) {
		event.scope = scope;
	}

	await redis.publish(getTenantSyncChannel(tenantKey), event);
	syncDebugLog('publish', 'Published tenant sync event.', {
		eventId: event.eventId,
		type: event.type,
		reason: event.reason,
		domain: event.domain,
		tenantKey,
		academicYear: event.academicYear,
		hasScope: Boolean(event.scope),
		targetUserCount: targetUserIds.length,
	});

	if (targetUserIds.length === 0) return;

	await Promise.all(
		targetUserIds.map((userId) =>
			redis.publish(getUserSyncChannel(tenantKey, userId), event),
		),
	);
	syncDebugLog('publish', 'Published user-targeted sync events.', {
		eventId: event.eventId,
		tenantKey,
		targetUserIds,
	});
};

export const publishSyncEventSafe = async (params: {
	tenantKey: string;
	domain: SyncDomain;
	academicYear?: string | null;
	actorId?: string | null;
	reason?: string;
	scope?: SyncScope;
	targetUserIds?: string[];
}) => {
	try {
		await publishSyncEvent(params);
	} catch (error) {
		console.warn('[realtime-sync] Failed to publish sync event:', error);
		syncDebugWarn('publish', 'Failed to publish sync event.', {
			error: error instanceof Error ? error.message : String(error),
			tenantKey: params.tenantKey,
			domain: params.domain,
			reason: params.reason || DEFAULT_REASON,
		});
	}
};

export const publishSyncEventsForAcademicYearsSafe = async (params: {
	tenantKey: string;
	domain: SyncDomain;
	academicYears?: string[];
	actorId?: string | null;
	reason?: string;
	scope?: SyncScope;
	targetUserIds?: string[];
}) => {
	const years = toUniqueStrings(params.academicYears);
	if (years.length === 0) {
		await publishSyncEventSafe({
			tenantKey: params.tenantKey,
			domain: params.domain,
			actorId: params.actorId,
			reason: params.reason,
			scope: params.scope,
			targetUserIds: params.targetUserIds,
		});
		return;
	}

	await Promise.all(
		years.map((academicYear) =>
			publishSyncEventSafe({
				tenantKey: params.tenantKey,
				domain: params.domain,
				academicYear,
				actorId: params.actorId,
				reason: params.reason,
				scope: params.scope,
				targetUserIds: params.targetUserIds,
			}),
		),
	);
};
