import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { authorizeUser } from '@/proxy';


export async function authorizeMonitoringRequest(request: NextRequest) {
	const currentUser = await authorizeUser(request, "superadmin");
	console.log(`Current User: ${currentUser}`)

	if (!currentUser) {
		return {
			authorized: false as const,
			response: NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 }),
		};
	}

	return {
		authorized: true as const,
		user: currentUser,
	};
}
