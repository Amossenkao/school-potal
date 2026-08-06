import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import { getClassMetaById } from '@/app/api/chat/utils';
import { computeFeeBalance } from '@/utils/documentVerification';

const NOT_VOIDED = { voidedAt: null } as const;

/**
 * Public Graduation Clearance verification. Recomputes, live: the real
 * itemized fees under the graduation-fee category the school designated
 * (`categoryId`), and the unscoped balance across *every* required fee —
 * matching the letter's "tuition, graduation fees, and all other fees" wording.
 *
 * The narrative facts on the letter (payment deadline, ceremony date, late
 * fee, cutoffs) are not looked up here — nothing persists them, so they
 * travel as query params on the QR itself and the `/verify` page displays
 * them exactly as printed.
 */
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const studentId = (searchParams.get('id') || '').trim();
		const academicYear = (searchParams.get('academicYear') || '').trim();
		const categoryId = (searchParams.get('categoryId') || '').trim();

		if (!studentId || !academicYear) {
			return NextResponse.json(
				{ success: false, message: 'Missing student ID or academic year.' },
				{ status: 400 },
			);
		}

		const models = await getTenantModels();
		const student = await models.Student.findOne({
			$or: [{ _id: studentId }, { studentId }],
		}).lean();

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

		const payments = await models.Payment.find({ studentId: student.studentId, ...NOT_VOIDED }).lean();

		const graduationItems = categoryId
			? computeFeeBalance(student, schoolProfile, academicYear, classId, payments, { categoryId })
			: null;
		const overallBalance = computeFeeBalance(student, schoolProfile, academicYear, classId, payments);

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
				academicYear,
				graduationFees: graduationItems
					? {
							lines: graduationItems.lines,
							totalsByCurrency: graduationItems.expectedByCurrency,
							outstandingByCurrency: graduationItems.outstandingByCurrency,
						}
					: null,
				overallOutstandingByCurrency: overallBalance.outstandingByCurrency,
				schoolName: schoolProfile?.identity?.name || '',
			},
		});
	} catch (error) {
		console.error('Graduation clearance verification error:', error);
		return NextResponse.json(
			{ success: false, message: 'Verification failed.' },
			{ status: 500 },
		);
	}
}
