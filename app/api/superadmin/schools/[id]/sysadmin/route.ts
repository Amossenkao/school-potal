import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminClaimsFromRequest } from '@/lib/superAdminAuth';
import {
	createSchoolSystemAdmin,
	updateSchoolSystemAdmin,
} from '@/lib/superAdminSchools';

const unauthorized = () =>
	NextResponse.json(
		{ success: false, message: 'Unauthorized' },
		{ status: 401 },
	);

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const claims = getSuperAdminClaimsFromRequest(request);
	if (!claims) return unauthorized();

	try {
		const { id } = await params;
		const payload = await request.json();
		const school = await createSchoolSystemAdmin(id, payload || {});
		return NextResponse.json({
			success: true,
			message: 'System admin created successfully.',
			school,
		});
	} catch (error: any) {
		console.error('[superadmin/schools/:id/sysadmin] POST failed:', error);
		if (error?.code === 11000) {
			return NextResponse.json(
				{ success: false, message: 'Duplicate username, phone, or email.' },
				{ status: 409 },
			);
		}
		const message = error?.message || 'Failed to create system admin.';
		const status =
			message === 'School not found.'
				? 404
				: message.includes('already has a system admin')
					? 409
					: 400;
		return NextResponse.json({ success: false, message }, { status });
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const claims = getSuperAdminClaimsFromRequest(request);
	if (!claims) return unauthorized();

	try {
		const { id } = await params;
		const payload = await request.json();
		const school = await updateSchoolSystemAdmin(id, payload || {});
		return NextResponse.json({
			success: true,
			message: 'System admin updated successfully.',
			school,
		});
	} catch (error: any) {
		console.error('[superadmin/schools/:id/sysadmin] PUT failed:', error);
		if (error?.code === 11000) {
			return NextResponse.json(
				{ success: false, message: 'Duplicate username, phone, or email.' },
				{ status: 409 },
			);
		}
		const message = error?.message || 'Failed to update system admin.';
		const status =
			message === 'School not found.'
				? 404
				: message.includes('No existing system admin')
					? 404
					: 400;
		return NextResponse.json({ success: false, message }, { status });
	}
}
