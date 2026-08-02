import { redis } from '@/lib/redis';

const SESSION_EXPIRY = 60 * 60 * 24; // 1 day in seconds

type SessionMutationOptions = {
	onlyUpdateFields?: string[];
	tenantId?: string;
};

const trim = (value: unknown) => String(value || '').trim();

const getUserSessionKey = (id: string) => `user:sessions:${id}`;

const getTenantSessionKey = (tenantId: string) =>
	`tenant:sessions:${tenantId}`;

const getTenantUserSessionKey = (tenantId: string, id: string) =>
	`tenant:user:sessions:${tenantId}:${id}`;

const getSetMembers = async (key: string): Promise<string[]> => {
	const members = await redis.smembers(key);
	return members.map((member) => trim(member)).filter(Boolean);
};

const getSessionIdsForUser = async (
	id: string,
	tenantId?: string,
): Promise<string[]> => {
	const normalizedId = trim(id);
	const normalizedTenantId = trim(tenantId);
	if (!normalizedId) return [];

	const ids = new Set<string>(await getSetMembers(getUserSessionKey(normalizedId)));
	if (normalizedTenantId) {
		const scopedIds = await getSetMembers(
			getTenantUserSessionKey(normalizedTenantId, normalizedId),
		);
		scopedIds.forEach((sid) => ids.add(sid));
	}

	if (!normalizedTenantId) return Array.from(ids);

	const filtered: string[] = [];
	for (const sid of ids) {
		const sessionData = await getSession(sid);
		if (
			trim(sessionData?.id) === normalizedId &&
			trim(sessionData?.tenantId) === normalizedTenantId
		) {
			filtered.push(sid);
		}
	}
	return filtered;
};

/**
 * Creates or updates a session indexed by 'id' and 'tenantId'.
 */
export const createSession = async (
	userData: any,
	expiry: number = SESSION_EXPIRY,
	sessionId?: string,
): Promise<string> => {
	if (!userData.id) {
		throw new Error('User data must include an id to create a session.');
	}

	const newSessionId = sessionId || crypto.randomUUID();
	const userSessionKey = getUserSessionKey(userData.id);
	const tenantSessionKey = getTenantSessionKey(userData.tenantId);

	const pipeline = redis.pipeline();
	pipeline.set(newSessionId, JSON.stringify(userData));
	pipeline.expire(newSessionId, expiry);

	pipeline.sadd(userSessionKey, newSessionId);
	pipeline.expire(userSessionKey, expiry);

	if (userData.tenantId) {
		pipeline.sadd(tenantSessionKey, newSessionId);
		pipeline.expire(tenantSessionKey, expiry);
		pipeline.sadd(
			getTenantUserSessionKey(userData.tenantId, userData.id),
			newSessionId,
		);
		pipeline.expire(
			getTenantUserSessionKey(userData.tenantId, userData.id),
			expiry,
		);
	}

	await pipeline.exec();
	return newSessionId;
};

/**
 * Destroys all active sessions for a specific tenant (school).
 */
export const destroyAllTenantSessions = async (
	tenantId: string,
): Promise<void> => {
	const tenantSessionKey = getTenantSessionKey(tenantId);
	const sessionIds = await getSetMembers(tenantSessionKey);

	if (sessionIds.length > 0) {
		const pipeline = redis.pipeline();

		for (const sid of sessionIds) {
			const sessionData = await getSession(sid);
			if (sessionData?.id) {
				pipeline.srem(getUserSessionKey(sessionData.id), sid);
				if (sessionData.tenantId) {
					pipeline.srem(
						getTenantUserSessionKey(sessionData.tenantId, sessionData.id),
						sid,
					);
				}
			}
		}

		pipeline.del(...sessionIds);
		pipeline.del(tenantSessionKey);
		await pipeline.exec();
	}
};

/**
 * Destroys a single session and its index references.
 */
export const destroySession = async (sessionId: string): Promise<number> => {
	const sessionData = await getSession(sessionId);

	if (sessionData?.id) {
		const userSessionKey = getUserSessionKey(sessionData.id);
		const tenantSessionKey = getTenantSessionKey(sessionData.tenantId);

		const pipeline = redis.pipeline();
		pipeline.srem(userSessionKey, sessionId);
		if (sessionData.tenantId) pipeline.srem(tenantSessionKey, sessionId);
		if (sessionData.tenantId) {
			pipeline.srem(
				getTenantUserSessionKey(sessionData.tenantId, sessionData.id),
				sessionId,
			);
		}
		pipeline.del(sessionId);

		const results = (await pipeline.exec()) as Array<[unknown, unknown]> | null;
		const deleted = results?.[results.length - 1]?.[1];
		return typeof deleted === 'number' ? deleted : 0;
	}

	return await redis.del(sessionId);
};

export const getSession = async (sessionId: string): Promise<any | null> => {
	const sessionData = await redis.get(sessionId);
	if (!sessionData) return null;
	if (typeof sessionData !== 'string') return sessionData;
	try {
		return JSON.parse(sessionData);
	} catch {
		return null;
	}
};

/**
 * Merges new data while preserving 'id' and 'tenantId'.
 */
const mergeSessionData = (existingSession: any, newUserData: any): any => {
	const preserveFields = ['sessionId', 'loginTime', 'tenantId', 'id'];
	const merged = { ...existingSession };
	Object.keys(newUserData).forEach((key) => {
		if (!preserveFields.includes(key) && newUserData[key] !== undefined) {
			merged[key] = newUserData[key];
		}
	});
	return merged;
};

export const updateAllUserSessions = async (
	id: string, // Changed from userId
	newUserData: any,
	options: SessionMutationOptions = {},
): Promise<void> => {
	const sessionIds = await getSessionIdsForUser(id, options.tenantId);
	if (sessionIds.length === 0) return;

	const pipeline = redis.pipeline();
	for (const sid of sessionIds) {
		const ttl = await redis.ttl(sid);
		if (ttl <= 0) continue;

		const existing = await getSession(sid);
		if (existing) {
			const dataToStore = options.onlyUpdateFields
				? {
						...existing,
						...Object.fromEntries(
							options.onlyUpdateFields.map((f) => [f, newUserData[f]]),
						),
					}
				: mergeSessionData(existing, newUserData);

			dataToStore.id = id;
			pipeline.set(sid, JSON.stringify(dataToStore));
			pipeline.expire(sid, ttl);
		}
	}
	await pipeline.exec();
};

export const updateUserSessionNotifications = async (
	id: string,
	notifications: any[],
) => {
	await updateAllUserSessions(
		id,
		{ notifications },
		{ onlyUpdateFields: ['notifications'] },
	);
};

export const destroyAllUserSessions = async (
	id: string,
	excludeSessionId?: string,
	options: { tenantId?: string } = {},
) => {
	const userSessionKey = getUserSessionKey(id);
	let ids = await getSessionIdsForUser(id, options.tenantId);
	if (excludeSessionId) ids = ids.filter((i) => i !== excludeSessionId);

	if (ids.length > 0) {
		const pipeline = redis.pipeline();
		for (const sid of ids) {
			const sessionData = await getSession(sid);
			pipeline.del(sid);
			pipeline.srem(userSessionKey, sid);
			if (sessionData?.tenantId) {
				pipeline.srem(getTenantSessionKey(sessionData.tenantId), sid);
			}
			if (sessionData?.tenantId && sessionData?.id) {
				pipeline.srem(
					getTenantUserSessionKey(sessionData.tenantId, sessionData.id),
					sid,
				);
			}
		}
		await pipeline.exec();
	}
};
export const getAllUserSessions = async (id: string): Promise<any[]> => {
	const userSessionKey = getUserSessionKey(id);
	const sessionIds = await getSetMembers(userSessionKey);
	const sessions: any[] = [];

	if (sessionIds.length === 0) return sessions;

	const pipeline = redis.pipeline();
	sessionIds.forEach((sid) => pipeline.get(sid));
	const results = (await pipeline.exec()) as Array<[unknown, unknown]> | null;

	(results || []).forEach(([err, data]) => {
		if (!err && data) {
			if (typeof data === 'string') {
				try {
					sessions.push(JSON.parse(data));
				} catch {
					// skip corrupt session entry
				}
			} else {
				sessions.push(data);
			}
		}
	});

	return sessions;
};
export const getAllTenantSessions = async (
	tenantId: string,
): Promise<any[]> => {
	const tenantSessionKey = getTenantSessionKey(tenantId);
	const sessionIds = await getSetMembers(tenantSessionKey);
	const sessions: any[] = [];

	if (sessionIds.length === 0) return sessions;

	const pipeline = redis.pipeline();
	sessionIds.forEach((sid) => pipeline.get(sid));
	const results = (await pipeline.exec()) as Array<[unknown, unknown]> | null;

	(results || []).forEach(([err, data]) => {
		if (!err && data) {
			if (typeof data === 'string') {
				try {
					sessions.push(JSON.parse(data));
				} catch {
					// skip corrupt session entry
				}
			} else {
				sessions.push(data);
			}
		}
	});

	return sessions;
};
