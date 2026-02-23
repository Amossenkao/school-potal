import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
	'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
	Pragma: 'no-cache',
	Expires: '0',
	'Surrogate-Control': 'no-store',
};

export async function GET() {
	return new NextResponse(null, {
		status: 204,
		headers: noStoreHeaders,
	});
}

export async function HEAD() {
	return new NextResponse(null, {
		status: 204,
		headers: noStoreHeaders,
	});
}
