import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import { getClassMetaById } from '@/app/api/chat/utils';

/**
 * Public attestation verification, reached by scanning an attestation
 * letter's QR. There is no issued-document record to look up — the letter's
 * claim is simply "this student was enrolled here" — so this recomputes that
 * fact live from the `Student` collection every time, the same live-recompute
 * philosophy `/api/reports/verify` already uses for report cards.
 */
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const studentId = (searchParams.get('id') || '').trim();
		const academicYear = (searchParams.get('academicYear') || '').trim();

		if (!studentId || !academicYear) {
			return NextResponse.json(
				{ success: false, message: 'Missing student ID or academic year.' },
				{ status: 400 },
			);
		}

		const models = await getTenantModels();
		// New attestation QR links carry the student's internal `_id`; older
		// links may still carry the human `studentId`. Query by the right key to
		// avoid Mongo casting a non-ObjectId string to `_id` and throwing.
		const isObjectId = /^[0-9a-f]{24}$/i.test(studentId);
		const student = await models.Student.findOne(
			isObjectId
				? { $or: [{ _id: studentId }, { studentId }] }
				: { studentId },
		).lean();

		if (!student) {
			return NextResponse.json({
				success: true,
				data: { valid: false, message: 'No matching student record was found.' },
			});
		}

		let classId: string = student.classId ?? '';
		if (Array.isArray(student.academicYears)) {
			const yearEntry = student.academicYears.find(
				(entry: any) => String(entry?.year || '').replace(/\//g, '-') === academicYear.replace(/\//g, '-'),
			);
			if (yearEntry?.classId) classId = yearEntry.classId;
		}

		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile: any =
			typeof schoolProfileRaw === 'string' ? JSON.parse(schoolProfileRaw) : (schoolProfileRaw ?? {});
		const classMeta = getClassMetaById(schoolProfile?.academicConfig?.classLevels, classId);

		const studentName =
			[student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ').trim() ||
			String(student.studentId || '');

		return NextResponse.json({
			success: true,
			data: {
				valid: true,
				studentId: student.studentId,
				studentName,
				className: classMeta?.className || student.className || '',
				program: classMeta?.className || student.className || '',
				academicYear,
				schoolName: schoolProfile?.identity?.name || '',
			},
		});
	} catch (error) {
		console.error('Attestation verification error:', error);
		return NextResponse.json(
			{ success: false, message: 'Verification failed.' },
			{ status: 500 },
		);
	}
}
