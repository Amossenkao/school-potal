import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getTenantModels } from '@/models';
import { updateAllUserSessions } from '@/utils/session';

const randomStatus = () => {
	const roll = Math.random();
	if (roll < 0.6) return 'success';
	if (roll < 0.85) return 'pending';
	return 'failed';
};

const formatReceiptNumber = () =>
	`RCPT-${Date.now().toString(36).toUpperCase()}`;

const getAcademicYear = () => {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();
	return currentMonth >= 7
		? `${currentYear}-${currentYear + 1}`
		: `${currentYear - 1}-${currentYear}`;
};

export async function POST(req: NextRequest) {
	try {
		const user = await authorizeUser(req);
		if (!user) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		if (user.role !== 'student') {
			return NextResponse.json(
				{ success: false, message: 'Only students can make payments.' },
				{ status: 403 },
			);
		}

		const payload = await req.json();
		const { paymentType, amount, paymentMethod, phoneNumber } = payload;
		if (!paymentType || !amount || !paymentMethod || !phoneNumber) {
			return NextResponse.json(
				{ success: false, message: 'Missing payment details.' },
				{ status: 400 },
			);
		}

		const models = await getTenantModels();
		const student = await models.Student.findById(user.id);
		if (!student) {
			return NextResponse.json(
				{ success: false, message: 'Student profile not found.' },
				{ status: 404 },
			);
		}

		const status = randomStatus();
		const now = new Date();
		const paymentRecord = {
			id: crypto.randomUUID(),
			receiptNumber: formatReceiptNumber(),
			paidBy: `${student.firstName} ${student.lastName}`.trim(),
			feeType: paymentType,
			category: paymentMethod,
			paymentAmount: Number(amount),
			paymentAcademicYear: getAcademicYear(),
			paymentDate: now.toISOString().split('T')[0],
			paymentTime: now.toTimeString().slice(0, 5),
		};

		if (status !== 'failed') {
			student.financialProfile.paymentRecords.push(paymentRecord);

			const outstanding = student.financialProfile.outstandingBalances || [];
			const matchIndex = outstanding.findIndex(
				(entry: any) =>
					entry.feeType === paymentType && entry.remainingBalance > 0,
			);
			if (matchIndex >= 0) {
				const entry = outstanding[matchIndex];
				const nextBalance = Math.max(0, entry.remainingBalance - Number(amount));
				entry.remainingBalance = nextBalance;
			}

			await student.save();
			await updateAllUserSessions(user.id, { financialProfile: student.financialProfile }, {
				onlyUpdateFields: ['financialProfile'],
			});
		}

		return NextResponse.json({
			success: status === 'success',
			status,
			message:
				status === 'success'
					? 'Payment processed successfully.'
					: status === 'pending'
						? 'Payment is pending confirmation.'
						: 'Payment failed.',
			data: status === 'failed' ? null : paymentRecord,
		});
	} catch (error) {
		console.error('Payment error:', error);
		return NextResponse.json(
			{ success: false, message: 'Payment processing failed.' },
			{ status: 500 },
		);
	}
}
