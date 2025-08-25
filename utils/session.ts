import { redis } from '@/lib/redis';

const SESSION_EXPIRY = 60 * 60 * 24; // 1 day in seconds

/**
 * Creates or updates a user session in Redis and indexes it by userId.
 * @param {any} userData - The user data to store in the session. Must include a `userId`.
 * @param {number} expiry - The session expiry time in seconds.
 * @param {string} [sessionId] - An optional existing session ID to overwrite.
 * @returns {Promise<string>} The session ID.
 */
export const createSession = async (
	userData: any,
	expiry: number = SESSION_EXPIRY,
	sessionId?: string
): Promise<string> => {
	if (!userData.userId) {
		throw new Error('User data must include a userId to create a session.');
	}

	const newSessionId = sessionId || crypto.randomUUID();
	const userSessionKey = `user:sessions:${userData.userId}`;

	const pipeline = redis.pipeline();
	pipeline.set(newSessionId, JSON.stringify(userData));
	pipeline.expire(newSessionId, expiry);
	pipeline.sadd(userSessionKey, newSessionId);
	pipeline.expire(userSessionKey, expiry);
	await pipeline.exec();

	return newSessionId;
};

/**
 * Retrieves session data for a given session ID.
 * @param {string} sessionId - The ID of the session to retrieve.
 * @returns {Promise<any | null>} The parsed session data or null if not found.
 */
export const getSession = async (sessionId: string): Promise<any | null> => {
	const sessionData: string | null = await redis.get(sessionId);
	if (!sessionData) {
		return null;
	}
	try {
		return sessionData;
	} catch (error) {
		console.error('Failed to parse session data:', error);
		return null;
	}
};

/**
 * Destroys a single session by its ID.
 * @param {string} sessionId - The ID of the session to destroy.
 * @returns {Promise<number>} The number of keys that were removed.
 */
export const destroySession = async (sessionId: string): Promise<number> => {
	const sessionData = await getSession(sessionId);

	if (sessionData && sessionData.userId) {
		const userSessionKey = `user:sessions:${sessionData.userId}`;
		const pipeline = redis.pipeline();
		pipeline.srem(userSessionKey, sessionId);
		pipeline.del(sessionId);
		const results = await pipeline.exec();
		return results[1][1] as number;
	} else {
		return await redis.del(sessionId);
	}
};

/**
 * Finds all active sessions for a given user and updates them with new data.
 * This is useful for reflecting profile changes across all logged-in devices.
 * @param {string} userId - The ID of the user whose sessions will be updated.
 * @param {any} newUserData - The new user data to write into each session.
 */
export const updateAllUserSessions = async (
	userId: string,
	newUserData: any
): Promise<void> => {
	const userSessionKey = `user:sessions:${userId}`;
	const sessionIds = await redis.smembers(userSessionKey);

	if (sessionIds.length === 0) {
		return;
	}

	const pipeline = redis.pipeline();
	const validSessionIds: string[] = [];

	const ttlPromises = sessionIds.map((sid) => redis.ttl(sid));
	const ttls = await Promise.all(ttlPromises);

	for (let i = 0; i < sessionIds.length; i++) {
		const sid = sessionIds[i];
		const ttl = ttls[i];

		if (ttl > 0) {
			// **THIS IS THE FIX**: Use separate `set` and `expire` calls
			pipeline.set(sid, JSON.stringify(newUserData));
			pipeline.expire(sid, ttl);
			validSessionIds.push(sid);
		}
	}

	const allSessionIds = new Set(sessionIds);
	const validSessionIdsSet = new Set(validSessionIds);
	const staleSessionIds = [...allSessionIds].filter(
		(x) => !validSessionIdsSet.has(x)
	);

	if (staleSessionIds.length > 0) {
		pipeline.srem(userSessionKey, ...staleSessionIds);
	}

	await pipeline.exec();
};

/**
 * Destroys all active sessions for a given user.
 * This is useful for forcing a logout on all devices after a password reset or security event.
 * @param {string} userId - The ID of the user whose sessions will be destroyed.
 * @param {string} [excludeSessionId] - An optional session ID to exclude from destruction (e.g., the current session).
 */
export const destroyAllUserSessions = async (
	userId: string,
	excludeSessionId?: string
): Promise<void> => {
	const userSessionKey = `user:sessions:${userId}`;
	let sessionIds = await redis.smembers(userSessionKey);

	if (excludeSessionId) {
		sessionIds = sessionIds.filter((id) => id !== excludeSessionId);
	}

	if (sessionIds.length > 0) {
		const pipeline = redis.pipeline();
		pipeline.del(...sessionIds);
		pipeline.srem(userSessionKey, ...sessionIds);
		await pipeline.exec();
	}
};
