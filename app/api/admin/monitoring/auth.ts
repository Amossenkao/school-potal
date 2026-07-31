import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { authorizeUser } from '@/proxy';

const MONITORING_ROLES = ['system_admin', 'superadmin'] as const;

export async function authorizeMonitoringRequest(request: NextRequest) {
	const currentUser = await authorizeUser(request, [...MONITORING_ROLES]);

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
