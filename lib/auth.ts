'use server';
import { cookies, headers } from 'next/headers';
import { getSession } from '@/utils/session';

export async function getCurrentUser() {
	try {
		const sessionId = (await cookies()).get('sessionId')?.value;
		if (!sessionId) return null;

		const currentUser = await getSession(sessionId);
		if (!currentUser?.id) return null;

		const requestHost = (await headers()).get('host')?.split(':')[0];
		const sessionHost =
			typeof currentUser.tenantId === 'string'
				? currentUser.tenantId.split(':')[0]
				: currentUser.tenantId;
		if (requestHost && sessionHost && requestHost !== sessionHost) {
			return null;
		}

		return currentUser;
	} catch (error) {
		console.error('Error getting current user:', error);
		return null;
	}
}
