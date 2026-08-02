import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { recordApplicationLog } from '@/lib/observability/applicationLog';
import { getRequestContext } from '@/lib/observability/context';

const MAX_FIELD_LENGTH = 2000;

function truncate(value: unknown) {
	if (typeof value !== 'string') return undefined;
	return value.slice(0, MAX_FIELD_LENGTH);
}

function toNumber(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

// Accepts fire-and-forget sync telemetry from the leader tab: flush outcomes,
// reconcile errors, checksum mismatches, and 409 conflicts. Records them as
// structured application logs for the sync observability dashboard (§Phase 4).
export async function POST(request: NextRequest) {
	try {
		const body = await request.json().catch(() => ({}));
		const event = truncate(body.event) || 'cycle';
		const level =
			event === 'error' || event === 'checksum-mismatch' || event === 'conflict'
				? ('warning' as const)
				: ('info' as const);
		const metrics =
			body.metrics && typeof body.metrics === 'object' ? body.metrics : {};

		await recordApplicationLog({
			level,
			message: `sync.${event}`,
			...getRequestContext(request),
			operation: `sync.${event}`,
			module: 'sync',
			path: truncate(body.path) || request.nextUrl.pathname,
			metadata: {
				source: 'client-sync',
				domain: truncate(body.domain),
				academicYear: truncate(body.academicYear),
				seq: toNumber(body.seq),
				...metrics,
			},
			source: 'client-sync',
		});

		return NextResponse.json({ success: true });
	} catch {
		return NextResponse.json({ success: false }, { status: 202 });
	}
}
