import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminClaimsFromRequest } from '@/lib/superAdminAuth';
import {
	deleteSchool,
	getSchoolDetailById,
	updateSchoolProfile,
} from '@/lib/superAdminSchools';

const unauthorized = () =>
	NextResponse.json(
		{ success: false, message: 'Unauthorized' },
		{ status: 401 },
	);

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const claims = getSuperAdminClaimsFromRequest(request);
	if (!claims) return unauthorized();

	try {
		const { id } = await params;
		const payload = await request.json();
		const school = await updateSchoolProfile(id, payload || {});
		return NextResponse.json({
			success: true,
			message: 'School updated successfully.',
			school,
		});
	} catch (error: any) {
		console.error('[superadmin/schools/:id] PUT failed:', error);
		if (error?.code === 11000) {
			return NextResponse.json(
				{ success: false, message: 'Duplicate field value.' },
				{ status: 409 },
			);
		}
		const message = error?.message || 'Failed to update school.';
		const status = message === 'School not found.' ? 404 : 400;
		return NextResponse.json({ success: false, message }, { status });
	}
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const claims = getSuperAdminClaimsFromRequest(request);
	if (!claims) return unauthorized();

	try {
		const { id } = await params;
		const { searchParams } = new URL(request.url);
		const academicYear = searchParams.get('academicYear') || undefined;
		const details = await getSchoolDetailById(id, academicYear);
		return NextResponse.json({
			success: true,
			...details,
		});
	} catch (error: any) {
		console.error('[superadmin/schools/:id] GET failed:', error);
		const message = error?.message || 'Failed to load school details.';
		const status = message === 'School not found.' ? 404 : 400;
		return NextResponse.json({ success: false, message }, { status });
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const claims = getSuperAdminClaimsFromRequest(request);
	if (!claims) return unauthorized();

	try {
		const { id } = await params;
		await deleteSchool(id);
		return NextResponse.json({
			success: true,
			message: 'School deleted successfully.',
		});
	} catch (error: any) {
		console.error('[superadmin/schools/:id] DELETE failed:', error);
		const message = error?.message || 'Failed to delete school.';
		const status = message === 'School not found.' ? 404 : 400;
		return NextResponse.json({ success: false, message }, { status });
	}
}
