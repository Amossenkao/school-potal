import { redis } from '@/lib/redis';

const SESSION_EXPIRY = 60 * 60 * 24; // 1 day in seconds

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
	const userSessionKey = `user:sessions:${userData.id}`;
	const tenantSessionKey = `tenant:sessions:${userData.tenantId}`;

	const pipeline = redis.pipeline();
	pipeline.set(newSessionId, JSON.stringify(userData));
	pipeline.expire(newSessionId, expiry);

	pipeline.sadd(userSessionKey, newSessionId);
	pipeline.expire(userSessionKey, expiry);

	if (userData.tenantId) {
		pipeline.sadd(tenantSessionKey, newSessionId);
		pipeline.expire(tenantSessionKey, expiry);
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
	const tenantSessionKey = `tenant:sessions:${tenantId}`;
	const sessionIds = await redis.smembers(tenantSessionKey);

	if (sessionIds.length > 0) {
		const pipeline = redis.pipeline();
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
		const userSessionKey = `user:sessions:${sessionData.id}`;
		const tenantSessionKey = `tenant:sessions:${sessionData.tenantId}`;

		const pipeline = redis.pipeline();
		pipeline.srem(userSessionKey, sessionId);
		if (sessionData.tenantId) pipeline.srem(tenantSessionKey, sessionId);
		pipeline.del(sessionId);

		const results = await pipeline.exec();
		return results ? (results[results.length - 1][1] as number) : 0;
	}

	return await redis.del(sessionId);
};

export const getSession = async (sessionId: string): Promise<any | null> => {
	const sessionData = await redis.get(sessionId);
	if (!sessionData) return null;
	return typeof sessionData === 'string'
		? JSON.parse(sessionData)
		: sessionData;
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
	options: { onlyUpdateFields?: string[] } = {},
): Promise<void> => {
	const userSessionKey = `user:sessions:${id}`;
	const sessionIds = await redis.smembers(userSessionKey);
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
) => {
	const userSessionKey = `user:sessions:${id}`;
	let ids = await redis.smembers(userSessionKey);
	if (excludeSessionId) ids = ids.filter((i) => i !== excludeSessionId);

	if (ids.length > 0) {
		const pipeline = redis.pipeline();
		pipeline.del(...ids);
		pipeline.srem(userSessionKey, ...ids);
		await pipeline.exec();
	}
};
export const getAllUserSessions = async (id: string): Promise<any[]> => {
	const userSessionKey = `user:sessions:${id}`;
	const sessionIds = await redis.smembers(userSessionKey);
	const sessions: any[] = [];

	if (sessionIds.length === 0) return sessions;

	const pipeline = redis.pipeline();
	sessionIds.forEach((sid) => pipeline.get(sid));
	const results = await pipeline.exec();

	results.forEach(([err, data]) => {
		if (!err && data) {
			sessions.push(typeof data === 'string' ? JSON.parse(data) : data);
		}
	});

	return sessions;
};
export const getAllTenantSessions = async (
	tenantId: string,
): Promise<any[]> => {
	const tenantSessionKey = `tenant:sessions:${tenantId}`;
	const sessionIds = await redis.smembers(tenantSessionKey);
	const sessions: any[] = [];

	if (sessionIds.length === 0) return sessions;

	const pipeline = redis.pipeline();
	sessionIds.forEach((sid) => pipeline.get(sid));
	const results = await pipeline.exec();

	results.forEach(([err, data]) => {
		if (!err && data) {
			sessions.push(typeof data === 'string' ? JSON.parse(data) : data);
		}
	});

	return sessions;
};
