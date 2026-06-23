'use server';
import { cookies, headers } from 'next/headers';
import { getSession } from '@/utils/session';
import { normalizeHost } from '@/utils/host';

export async function getCurrentUser() {
	try {
		const sessionId = (await cookies()).get('sessionId')?.value;
		if (!sessionId) return null;

		const currentUser = await getSession(sessionId);
		if (!currentUser?.id) return null;

		const requestHost = normalizeHost((await headers()).get('host'));
		const sessionHost = normalizeHost(
			typeof currentUser.tenantId === 'string'
				? currentUser.tenantId
				: String(currentUser.tenantId || ''),
		);
		if (requestHost && sessionHost && requestHost !== sessionHost) {
			return null;
		}

		return currentUser;
	} catch (error) {
		console.error('Error getting current user:', error);
		return null;
	}
}
