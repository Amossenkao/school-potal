import { randomUUID } from 'crypto';
import { redis } from '@/lib/redis';

const SUPER_ADMIN_NOTIFICATIONS_KEY = 'superadmin:notifications';
const SUPER_ADMIN_NOTIFICATIONS_LIMIT = 200;

export interface SuperAdminNotification {
	id: string;
	title: string;
	message: string;
	type: 'info' | 'success' | 'warning' | 'error';
	createdAt: string;
	metadata?: Record<string, any>;
}

export const addSuperAdminNotification = async (payload: {
	title: string;
	message: string;
	type?: SuperAdminNotification['type'];
	metadata?: Record<string, any>;
}) => {
	const entry: SuperAdminNotification = {
		id: randomUUID(),
		title: payload.title,
		message: payload.message,
		type: payload.type || 'info',
		createdAt: new Date().toISOString(),
		metadata: payload.metadata,
	};

	try {
		await redis.lpush(SUPER_ADMIN_NOTIFICATIONS_KEY, JSON.stringify(entry));
		await redis.ltrim(
			SUPER_ADMIN_NOTIFICATIONS_KEY,
			0,
			SUPER_ADMIN_NOTIFICATIONS_LIMIT - 1,
		);
	} catch (error) {
		console.warn('[superadmin] Failed to persist notification:', error);
	}

	return entry;
};

export const getSuperAdminNotifications = async (limit = 100) => {
	const maxItems = Math.max(1, Math.min(200, Number(limit) || 100));

	try {
		const rows = await redis.lrange(
			SUPER_ADMIN_NOTIFICATIONS_KEY,
			0,
			maxItems - 1,
		);

		if (!Array.isArray(rows)) return [];

		return rows
			.map((entry) => {
				try {
					if (typeof entry === 'string') {
						return JSON.parse(entry) as SuperAdminNotification;
					}
					return entry as SuperAdminNotification;
				} catch {
					return null;
				}
			})
			.filter((entry): entry is SuperAdminNotification => Boolean(entry));
	} catch (error) {
		console.warn('[superadmin] Failed to load notifications:', error);
		return [];
	}
};
