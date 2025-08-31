'use server';
import { cookies, headers } from 'next/headers';
import { getSession } from '@/utils/session';

export async function getCurrentUser() {
	try {
		const sessionId = (await cookies()).get('sessionId')?.value;

		const currentUser = getSession(sessionId || '');

		if (!currentUser) return null;
		(await headers()).get('host');
		return currentUser;
	} catch (error) {
		console.error('Error getting current user:', error);
		return null;
	}
}
