import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { recordApplicationError } from '@/lib/observability/applicationLog';
import { getRequestContext } from '@/lib/observability/context';

const MAX_FIELD_LENGTH = 2000;

function truncate(value: unknown) {
	if (typeof value !== 'string') return undefined;
	return value.slice(0, MAX_FIELD_LENGTH);
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json().catch(() => ({}));
		const message = truncate(body.message) || 'Client application error';
		const error = new Error(message);
		error.name = truncate(body.name) || 'ClientError';
		error.stack = truncate(body.stack);

		await recordApplicationError(error, message, {
			...getRequestContext(request),
			errorDigest: truncate(body.digest),
			module: truncate(body.module) || 'client',
			operation: truncate(body.operation) || 'client.runtime_error',
			path: truncate(body.path) || request.headers.get('referer') || undefined,
			metadata: {
				source: 'client',
				componentStack: truncate(body.componentStack),
			},
			source: 'client',
		});

		return NextResponse.json({ success: true });
	} catch {
		return NextResponse.json({ success: false }, { status: 202 });
	}
}
