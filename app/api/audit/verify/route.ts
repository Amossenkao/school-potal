import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getSchoolProfile } from '@/lib/mongoose';
import { validateComponentAccess } from '@/utils/componentsMap';
import { verifyAuditChain } from '@/utils/auditTrail';
import type { Administrator, FeatureKey } from '@/types';

/**
 * Recomputes the hash chain and reports the first break.
 *
 * Detects two distinct kinds of tampering: an edited row (its stored hash no
 * longer matches its own contents) and a removed or reordered row (the next
 * row's `prevHash` no longer points at its predecessor).
 */
export async function GET(req: NextRequest) {
	try {
		const sessionUser = await authorizeUser(req, [
			'administrator',
			'system_admin',
		]);
		if (!sessionUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const schoolProfile = await getSchoolProfile();
		if (!schoolProfile) {
			return NextResponse.json(
				{ success: false, message: 'School profile not found.' },
				{ status: 500 },
			);
		}

		const admin = sessionUser as unknown as Administrator;
		const allowed = validateComponentAccess(
			schoolProfile as any,
			sessionUser.role,
			'financial-audit',
			sessionUser.role === 'administrator'
				? (admin.permissions as FeatureKey[])
				: undefined,
			sessionUser.role === 'administrator' ? admin.isTeacher : undefined,
		);
		if (!allowed) {
			return NextResponse.json(
				{ success: false, message: 'The audit trail is not enabled for you.' },
				{ status: 403 },
			);
		}

		const result = await verifyAuditChain();
		return NextResponse.json({ success: true, data: result });
	} catch (error) {
		console.error('Audit chain verification error:', error);
		const message =
			error instanceof Error ? error.message : 'Verification failed.';
		return NextResponse.json({ success: false, message }, { status: 500 });
	}
}
