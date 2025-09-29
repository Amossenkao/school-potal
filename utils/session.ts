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
	const sessionData = await redis.get(sessionId);
	if (!sessionData) {
		return null;
	}

	try {
		// Check if sessionData is already an object
		if (typeof sessionData === 'object') {
			return sessionData;
		}

		// If it's a string, try to parse it as JSON
		if (typeof sessionData === 'string') {
			return JSON.parse(sessionData);
		}

		// If it's neither string nor object, return as is
		return sessionData;
	} catch (error) {
		console.error(
			'Failed to parse session data:',
			error,
			'Raw data:',
			sessionData
		);

		// If JSON parsing fails, check if it's already a valid object
		if (typeof sessionData === 'object' && sessionData !== null) {
			return sessionData;
		}

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
 * Intelligently merges new data with existing session data
 * @param {any} existingSession - The current session data
 * @param {any} newUserData - The new user data to merge
 * @param {string[]} preserveFields - Fields that should never be overwritten
 * @returns {any} The merged session data
 */
const mergeSessionData = (
	existingSession: any,
	newUserData: any,
	preserveFields: string[] = [
		'sessionId',
		'loginTime',
		'lastActivity',
		'ipAddress',
		'userAgent',
		'csrfToken',
	]
): any => {
	// Start with existing session to preserve structure
	const merged = { ...existingSession };

	// Update with new user data, but preserve critical session fields
	Object.keys(newUserData).forEach((key) => {
		if (!preserveFields.includes(key) && newUserData[key] !== undefined) {
			merged[key] = newUserData[key];
		}
	});

	// Always preserve the session timestamp to prevent logout
	if (existingSession.lastActivity) {
		merged.lastActivity = existingSession.lastActivity;
	}

	return merged;
};

/**
 * Finds all active sessions for a given user and updates them with new data.
 * This preserves session-specific data while updating user information.
 * @param {string} userId - The ID of the user whose sessions will be updated.
 * @param {any} newUserData - The new user data to write into each session.
 * @param {object} options - Configuration options
 * @param {boolean} options.safeMerge - Whether to merge with existing session data (default: true)
 * @param {string[]} options.preserveFields - Additional fields to preserve during merge
 * @param {string[]} options.onlyUpdateFields - If provided, only update these specific fields
 */
export const updateAllUserSessions = async (
	userId: string,
	newUserData: any,
	options: {
		safeMerge?: boolean;
		preserveFields?: string[];
		onlyUpdateFields?: string[];
	} = {}
): Promise<void> => {
	const { safeMerge = true, preserveFields = [], onlyUpdateFields } = options;

	const userSessionKey = `user:sessions:${userId}`;
	let sessionIds: string[] = [];

	try {
		sessionIds = await redis.smembers(userSessionKey);
	} catch (error) {
		console.error(`Failed to get session IDs for user ${userId}:`, error);
		return;
	}

	if (sessionIds.length === 0) {
		return;
	}

	try {
		// Get existing sessions and their TTLs in parallel
		const [existingSessionsResults, ttlResults] = await Promise.all([
			Promise.allSettled(sessionIds.map((sid) => getSession(sid))),
			Promise.allSettled(sessionIds.map((sid) => redis.ttl(sid))),
		]);

		const pipeline = redis.pipeline();
		const validSessionIds: string[] = [];
		const defaultPreserveFields = [
			'sessionId',
			'loginTime',
			'lastActivity',
			'ipAddress',
			'userAgent',
			'csrfToken',
		];
		const allPreserveFields = [...defaultPreserveFields, ...preserveFields];

		for (let i = 0; i < sessionIds.length; i++) {
			const sid = sessionIds[i];
			const ttlResult = ttlResults[i];
			const sessionResult = existingSessionsResults[i];

			// Skip if we couldn't get TTL or it's expired
			if (
				ttlResult.status === 'rejected' ||
				(ttlResult.status === 'fulfilled' && ttlResult.value <= 0)
			) {
				continue;
			}

			const ttl = ttlResult.value as number;

			try {
				let dataToStore = newUserData;

				// If safeMerge is enabled and we have existing session data
				if (
					safeMerge &&
					sessionResult.status === 'fulfilled' &&
					sessionResult.value
				) {
					const existingSession = sessionResult.value;

					// If onlyUpdateFields is specified, only update those fields
					if (onlyUpdateFields && onlyUpdateFields.length > 0) {
						dataToStore = { ...existingSession };
						onlyUpdateFields.forEach((field) => {
							if (newUserData[field] !== undefined) {
								dataToStore[field] = newUserData[field];
							}
						});
					} else {
						// Merge with existing session data
						dataToStore = mergeSessionData(
							existingSession,
							newUserData,
							allPreserveFields
						);
					}
				}

				// Ensure we maintain the userId
				dataToStore.userId = userId;

				// Store the updated session
				pipeline.set(sid, JSON.stringify(dataToStore));
				pipeline.expire(sid, ttl);
				validSessionIds.push(sid);
			} catch (error) {
				console.error(`Failed to prepare session data for ${sid}:`, error);
			}
		}

		// Clean up stale session IDs from the user's session set
		const allSessionIds = new Set(sessionIds);
		const validSessionIdsSet = new Set(validSessionIds);
		const staleSessionIds = [...allSessionIds].filter(
			(x) => !validSessionIdsSet.has(x)
		);

		if (staleSessionIds.length > 0) {
			pipeline.srem(userSessionKey, ...staleSessionIds);
		}

		await pipeline.exec();

		console.log(
			`Updated ${validSessionIds.length} sessions for user ${userId}`
		);
	} catch (error) {
		console.error(`Failed to update sessions for user ${userId}:`, error);
		throw error; // Re-throw to let caller handle the error
	}
};

/**
 * Updates only specific fields in user sessions (safer than full update)
 * @param {string} userId - The ID of the user whose sessions will be updated
 * @param {object} fieldUpdates - Object containing the fields to update
 * @param {string[]} preserveFields - Additional fields to preserve during update
 */
export const updateUserSessionFields = async (
	userId: string,
	fieldUpdates: { [key: string]: any },
	preserveFields: string[] = []
): Promise<void> => {
	await updateAllUserSessions(userId, fieldUpdates, {
		safeMerge: true,
		preserveFields,
		onlyUpdateFields: Object.keys(fieldUpdates),
	});
};

/**
 * Updates a single session with new data
 * @param {string} sessionId - The session ID to update
 * @param {any} newData - The new data to merge into the session
 * @param {boolean} safeMerge - Whether to merge with existing data (default: true)
 */
export const updateSession = async (
	sessionId: string,
	newData: any,
	safeMerge: boolean = true
): Promise<boolean> => {
	try {
		const ttl = await redis.ttl(sessionId);
		if (ttl <= 0) {
			return false; // Session expired or doesn't exist
		}

		let dataToStore = newData;

		if (safeMerge) {
			const existingSession = await getSession(sessionId);
			if (existingSession) {
				dataToStore = mergeSessionData(existingSession, newData);
			}
		}

		await redis.setex(sessionId, ttl, JSON.stringify(dataToStore));
		return true;
	} catch (error) {
		console.error(`Failed to update session ${sessionId}:`, error);
		return false;
	}
};

/**
 * Updates only the notifications field in user sessions
 * @param {string} userId - The ID of the user whose sessions will be updated
 * @param {any[]} notifications - The new notifications array
 */
export const updateUserSessionNotifications = async (
	userId: string,
	notifications: any[]
): Promise<void> => {
	await updateUserSessionFields(userId, { notifications });
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
