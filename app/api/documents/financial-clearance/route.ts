import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import { getClassMetaById } from '@/app/api/chat/utils';
import { computeFeeBalance } from '@/utils/documentVerification';

const NOT_VOIDED = { voidedAt: null } as const;

/**
 * Public Financial Clearance verification, reached by scanning a clearance
 * card's QR. Recomputes the student's real payment status live from `Payment`
 * records rather than trusting anything printed on the card — nothing about
 * this document is persisted, so a scan is always the current truth, not a
 * frozen snapshot of what was true when it was printed.
 */
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const studentId = (searchParams.get('id') || '').trim();
		const academicYear = (searchParams.get('academicYear') || '').trim();
		const period = (searchParams.get('period') || '').trim();
		// An `Installment.id` from the school's own catalog, not a label.
		const installmentId = (searchParams.get('installmentId') || '').trim();

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
		const balance = computeFeeBalance(student, schoolProfile, academicYear, classId, payments, {
			installmentId,
		});
		const installmentLabel =
			(schoolProfile?.financialConfig?.installments || []).find(
				(inst: any) => inst.id === installmentId,
			)?.label || '';

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
				period,
				installmentId,
				installment: installmentLabel,
				expectedByCurrency: balance.expectedByCurrency,
				collectedByCurrency: balance.collectedByCurrency,
				outstandingByCurrency: balance.outstandingByCurrency,
				schoolName: schoolProfile?.identity?.name || '',
			},
		});
	} catch (error) {
		console.error('Financial clearance verification error:', error);
		return NextResponse.json(
			{ success: false, message: 'Verification failed.' },
			{ status: 500 },
		);
	}
}
