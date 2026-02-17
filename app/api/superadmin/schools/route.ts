import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminClaimsFromRequest } from '@/lib/superAdminAuth';
import { createSchool, listSchools } from '@/lib/superAdminSchools';

const unauthorized = () =>
	NextResponse.json(
		{ success: false, message: 'Unauthorized' },
		{ status: 401 },
	);

export async function GET(request: NextRequest) {
	const claims = getSuperAdminClaimsFromRequest(request);
	if (!claims) return unauthorized();

	try {
		const schools = await listSchools();
		return NextResponse.json({ success: true, schools });
	} catch (error) {
		console.error('[superadmin/schools] GET failed:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to load schools.' },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const claims = getSuperAdminClaimsFromRequest(request);
	if (!claims) return unauthorized();

	try {
		const body = await request.json();
		const school = await createSchool(body || {});
		return NextResponse.json(
			{ success: true, message: 'School created successfully.', school },
			{ status: 201 },
		);
	} catch (error: any) {
		console.error('[superadmin/schools] POST failed:', error);
		if (error?.code === 11000) {
			return NextResponse.json(
				{ success: false, message: 'Duplicate school host or dbName.' },
				{ status: 409 },
			);
		}
		return NextResponse.json(
			{ success: false, message: error?.message || 'Failed to create school.' },
			{ status: 400 },
		);
	}
}
