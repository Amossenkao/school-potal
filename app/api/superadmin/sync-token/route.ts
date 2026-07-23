import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { createAblyTokenRequest } from '@/lib/ablyServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStoreJson = (payload: Record<string, unknown>, status = 200) =>
	NextResponse.json(payload, {
		status,
		headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
	});

export async function GET(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request);
		if (!currentUser || currentUser.role !== 'super_admin') {
			return noStoreJson({ success: false, message: 'Forbidden' }, 403);
		}

		const userId = String(currentUser.userId || currentUser.id || '').trim();
		if (!userId) {
			return noStoreJson({ success: false, message: 'Unable to resolve user' }, 500);
		}

		const tokenRequest = await createAblyTokenRequest({
			tenantId: 'superadmin',
			user: { id: currentUser.id, role: 'super_admin' },
			role: 'super_admin',
			clientId: userId,
		});

		return noStoreJson({ success: true, ...tokenRequest });
	} catch (error) {
		console.error('[superadmin/sync-token] Failed to mint token:', error);
		return NextResponse.json(
			{ success: false, message: 'Token service unavailable' },
			{ status: 503, headers: { 'Cache-Control': 'no-store' } },
		);
	}
}
