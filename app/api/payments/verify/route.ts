import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import { normalizePayment } from '@/utils/payments';

/**
 * Public receipt verification, reached by scanning the QR on a printed receipt.
 *
 * Deliberately unauthenticated — whoever holds the paper needs to be able to
 * check it — so the response is the minimum needed to confirm authenticity:
 * that the receipt exists, who it was issued to, when, and for how much. It
 * never returns the student's wider balance, contact details, or other
 * receipts, and lookup is by the full random receipt number only.
 */
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const receiptNumber = (searchParams.get('receipt') || '').trim();

		if (!receiptNumber) {
			return NextResponse.json(
				{ success: false, message: 'Missing receipt number.' },
				{ status: 400 },
			);
		}

		const models = await getTenantModels();
		const doc = await models.Payment.findOne({ receiptNumber }).lean();

		if (!doc) {
			return NextResponse.json(
				{
					success: true,
					data: {
						valid: false,
						message: 'No receipt matches this number.',
					},
				},
				{ status: 200 },
			);
		}

		const payment = normalizePayment(doc);
		const schoolProfile = await getSchoolProfile();

		const student = await models.Student.findOne({
			studentId: payment.studentId,
		})
			.select('studentId firstName middleName lastName className')
			.lean();

		const studentName = student
			? [student.firstName, student.middleName, student.lastName]
					.filter(Boolean)
					.join(' ')
					.trim()
			: '';

		// A voided receipt still resolves — someone may be holding the printout,
		// and "this was voided on <date>" is a far more useful answer than
		// "no receipt matches this number".
		if (payment.voidedAt) {
			return NextResponse.json({
				success: true,
				data: {
					valid: false,
					voided: true,
					receiptNumber: payment.receiptNumber,
					schoolName: schoolProfile?.identity?.name || '',
					studentId: payment.studentId,
					studentName,
					className: student?.className || '',
					academicYear: payment.paymentAcademicYear,
					paymentDate: payment.paymentDate,
					currency: payment.currency,
					totalAmount: payment.totalAmount,
					voidedAt: payment.voidedAt,
					voidedBy: payment.voidedBy?.name || '',
					voidReason: payment.voidReason || '',
					message: 'This receipt has been voided and is no longer valid.',
				},
			});
		}

		return NextResponse.json({
			success: true,
			data: {
				valid: true,
				voided: false,
				receiptNumber: payment.receiptNumber,
				schoolName: schoolProfile?.identity?.name || '',
				studentId: payment.studentId,
				studentName,
				className: student?.className || '',
				academicYear: payment.paymentAcademicYear,
				paidBy: payment.paidBy,
				paymentDate: payment.paymentDate,
				paymentTime: payment.paymentTime,
				paymentMethod: payment.paymentMethod || 'cash',
				currency: payment.currency,
				totalAmount: payment.totalAmount,
				items: payment.items.map((item) => ({
					feeType: item.feeType,
					category: item.category,
					amount: item.amount,
				})),
			},
		});
	} catch (error) {
		console.error('Receipt verification error:', error);
		return NextResponse.json(
			{ success: false, message: 'Verification failed.' },
			{ status: 500 },
		);
	}
}
