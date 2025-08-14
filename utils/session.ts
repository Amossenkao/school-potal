import { redis } from '@/lib/redis';
//import { demoUser } from '@/store/useAuth'; // TODO: Only for testing without internet

const SESSION_EXPIRY = 60 * 60 * 24; // 1 day

export const createSession = async (
	userData: any,
	expiry: number = SESSION_EXPIRY,
	sessionId?: string
) => {
	if (!sessionId) {
		sessionId = crypto.randomUUID();
	}
	await redis.set(sessionId, JSON.stringify(userData));
	await redis.expire(sessionId, expiry);

	await redis.expire(sessionId, expiry);
	return sessionId;
};

export const getSession = async (sessionId: string) => {
	//return demoUser; // TODO: Only for testing without internet
	const sessionData: string = (await redis.get(sessionId)) || '';
	return sessionData;
};

export const destroySession = async (sessionId: string) => {
	return await redis.del(sessionId);
};
