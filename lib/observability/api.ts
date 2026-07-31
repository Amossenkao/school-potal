import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { recordApplicationError } from '@/lib/observability/applicationLog';
import { getRequestContext } from '@/lib/observability/context';

export async function errorResponse(
	request: NextRequest,
	error: unknown,
	message: string,
	status = 500,
	operation?: string,
) {
	await recordApplicationError(error, message, {
		...getRequestContext(request),
		operation,
		statusCode: status,
	});

	return NextResponse.json(
		{ success: false, message: error instanceof Error ? error.message : message },
		{ status },
	);
}
