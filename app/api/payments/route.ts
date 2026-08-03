import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import {
	resolveStudentFeeGroups,
	resolveStudentGroupIds,
	resolveResolvedScheduledFees,
} from '@/utils/resolveStudentFeeGroup';
import {
	applyScholarshipsToFees,
	resolveStudentScholarshipDefinitions,
} from '@/utils/scholarshipBilling';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';
import { updateAllUserSessions } from '@/utils/session';
import crypto from 'crypto';

const VALID_PAYMENT_METHODS = ['orange', 'lonester'];
const DEFAULT_CURRENCY = 'LRD';

const formatReceiptNumber = () =>
	`RCPT-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

const badRequest = (message: string) =>
	NextResponse.json({ success: false, message }, { status: 400 });

export async function GET(req: NextRequest) {
	try {
		const sessionUser = await authorizeUser(req);
		if (!sessionUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const { searchParams } = new URL(req.url);
		const models = await getTenantModels();
		const schoolProfile = await getSchoolProfile();

		if (sessionUser.role === 'student' || sessionUser.role === 'parent') {
			let studentId = sessionUser.studentId || sessionUser.username;

			if (sessionUser.role === 'parent') {
				const requested = searchParams.get('studentId');
				if (requested) studentId = requested;
				const parent = await models.Parent.findById(
					sessionUser.id,
				).lean();
				const allowedStudentIds = Array.isArray(parent?.studentIds)
					? parent.studentIds
					: [];
				if (!allowedStudentIds.includes(studentId)) {
					return NextResponse.json(
						{
							success: false,
							message:
								'You can only view payments for your linked children.',
						},
						{ status: 403 },
					);
				}
			}

			const payments = await models.Payment.find({ studentId })
				.sort({ createdAt: -1 })
				.lean();

			const mapped = payments.map((p: any) => ({
				id: p._id.toString(),
				receiptNumber: p.receiptNumber,
				studentId: p.studentId,
				classId: p.classId,
				paidBy: p.paidBy,
				feeType: p.feeType,
				category: p.category,
				paymentAmount: p.paymentAmount,
				currency: p.currency || 'LRD',
				paymentAcademicYear: p.paymentAcademicYear,
				paymentDate: p.paymentDate,
				paymentTime: p.paymentTime,
			}));

			return NextResponse.json({
				success: true,
				data: { payments: mapped, school: schoolProfile },
			});
		}

		if (sessionUser.role === 'administrator') {
			const studentId = searchParams.get('studentId');
			const filter: Record<string, unknown> = {};
			if (studentId) filter.studentId = studentId;

			const payments = await models.Payment.find(filter)
				.sort({ createdAt: -1 })
				.limit(200)
				.lean();

			const mapped = payments.map((p: any) => ({
				id: p._id.toString(),
				receiptNumber: p.receiptNumber,
				studentId: p.studentId,
				classId: p.classId,
				paidBy: p.paidBy,
				feeType: p.feeType,
				category: p.category,
				paymentAmount: p.paymentAmount,
				currency: p.currency || 'LRD',
				paymentAcademicYear: p.paymentAcademicYear,
				paymentDate: p.paymentDate,
				paymentTime: p.paymentTime,
				paymentMethod: p.paymentMethod,
			}));

			return NextResponse.json({
				success: true,
				data: { payments: mapped, school: schoolProfile },
			});
		}

		return NextResponse.json(
			{ success: false, message: 'Access denied.' },
			{ status: 403 },
		);
	} catch (error) {
		console.error('GET payments error:', error);
		const message = error instanceof Error ? error.message : 'Failed to fetch payments.';
		return NextResponse.json(
			{ success: false, message },
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	try {
		const sessionUser = await authorizeUser(req);
		if (!sessionUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const payload = await req.json();
		const { items, paymentAcademicYear } = payload;

		if (!items || !Array.isArray(items) || items.length === 0) {
			return badRequest('Missing payment items.');
		}

		const models = await getTenantModels();
		const schoolProfile = await getSchoolProfile();
		if (!schoolProfile) {
			return NextResponse.json(
				{ success: false, message: 'School profile not found.' },
				{ status: 500 },
			);
		}

		const isAdmin = sessionUser.role === 'administrator';
		const isStudent = sessionUser.role === 'student';

		if (!isAdmin && !isStudent) {
			return NextResponse.json(
				{ success: false, message: 'Access denied.' },
				{ status: 403 },
			);
		}

		const { paymentMethod, phoneNumber, studentId } = payload;

		if (isStudent) {
			if (!paymentMethod || !phoneNumber) {
				return badRequest('Missing payment method or phone number.');
			}
			if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
				return badRequest(`Invalid payment method. Accepted: ${VALID_PAYMENT_METHODS.join(', ')}.`);
			}
			const onlinePaymentEnabled = schoolProfile.featureConfig?.enabledFeatures?.includes('online_payment');
			if (!onlinePaymentEnabled) {
				return badRequest('Online payment is not available for this school.');
			}
		}

		if (isAdmin && !studentId) {
			return badRequest('Missing studentId.');
		}

		const academicYear =
			paymentAcademicYear ||
			getCurrentAcademicYearFromSchoolProfile(schoolProfile) ||
			'';

		const targetStudentId = isStudent
			? (sessionUser.studentId || sessionUser.username)
			: studentId;

		const student = isAdmin
			? await models.Student.findOne({ studentId: targetStudentId }).lean()
			: sessionUser;

		if (!student) {
			return badRequest(`Student "${targetStudentId}" not found.`);
		}

		const classId = student.classId || '';
		const studentGroups = schoolProfile.financialConfig?.studentGroups ?? [];
		const groupIds = resolveStudentGroupIds(student, studentGroups);
		const feeGroups = resolveStudentFeeGroups(classId, schoolProfile, academicYear);

		const allResolvedFees: Array<{
			feeDefId: string;
			feeName: string;
			categoryId: string;
			categoryName: string;
			amount: number;
			currency: string;
		}> = [];

		for (const { feeGroup } of feeGroups) {
			const resolved = resolveResolvedScheduledFees(feeGroup, schoolProfile, groupIds);
			for (const rf of resolved) {
				allResolvedFees.push({
					feeDefId: rf.scheduledFee.feeId,
					feeName: rf.feeDefinition?.name || rf.scheduledFee.feeId,
					categoryId: rf.feeDefinition?.category || '',
					categoryName: rf.categoryName,
					amount: rf.scheduledFee.amount.amount,
					currency: rf.scheduledFee.amount.currency,
				});
			}
		}

		if (allResolvedFees.length === 0) {
			return badRequest('No fees are configured for this class this academic year.');
		}

		const studentDoc = await models.Student.findOne({
			studentId: targetStudentId,
		}).lean();
		const scholarships = resolveStudentScholarshipDefinitions(
			{ scholarships: studentDoc?.scholarships || [] },
			schoolProfile,
			academicYear,
		);
		const adjustedFees = applyScholarshipsToFees(allResolvedFees, scholarships);

		const existingPayments = await models.Payment.find({ studentId: targetStudentId }).lean();
		const paidByFeeType: Record<string, number> = {};
		for (const p of existingPayments) {
			const key = `${p.feeType}::${p.currency || DEFAULT_CURRENCY}`;
			paidByFeeType[key] = (paidByFeeType[key] || 0) + p.paymentAmount;
		}

		let selectedCurrency: string | null = null;

		for (const item of items) {
			if (item.currency && !selectedCurrency) {
				selectedCurrency = item.currency;
			}

			const rawAmount = item.amount;
			if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
				return badRequest(`Payment amount is missing for "${item.feeName || item.label}".`);
			}
			const amount = Number(rawAmount);
			if (!isFinite(amount) || amount <= 0) {
				return badRequest(`Invalid payment amount for "${item.feeName || item.label}".`);
			}
			const currency = item.currency || DEFAULT_CURRENCY;

			if (selectedCurrency && currency !== selectedCurrency) {
				return badRequest('Mixed currencies are not allowed.');
			}

			const validCurrencies = schoolProfile.financialConfig?.currencies ?? [];
			if (validCurrencies.length > 0 && !validCurrencies.some((c: any) => c.code === currency)) {
				return badRequest(`Currency "${currency}" is not configured for this school.`);
			}

			const feeName = item.feeName || item.label || '';
			const matchedFee = adjustedFees.find(
				(f) =>
					(f.feeDefId === item.feeId || f.feeName === feeName) &&
					f.currency === currency,
			);
			if (!matchedFee) {
				return badRequest(`Fee "${feeName}" was not found in the fee schedule.`);
			}

			const paidKey = `${matchedFee.feeName}::${currency}`;
			const totalPaidAlready = paidByFeeType[paidKey] || 0;
			const outstanding = Math.max(0, matchedFee.effectiveAmount - totalPaidAlready);

			if (outstanding <= 0) {
				return badRequest(`"${matchedFee.feeName}" has already been fully paid.`);
			}

			if (amount > outstanding) {
				return badRequest(
					`Payment amount for "${matchedFee.feeName}" exceeds the outstanding balance of ${currency} ${outstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
				);
			}
		}

		const now = new Date();
		const paymentDate = now.toISOString().split('T')[0];
		const paymentTime = now.toLocaleTimeString();
		const fullName = `${sessionUser.firstName || ''} ${sessionUser.lastName || ''}`.trim();

		const paymentDocs = items.map((item: any) => ({
			studentId: targetStudentId,
			classId,
			paidBy: fullName,
			feeType: item.feeName || item.label || '',
			category: item.categoryName || item.category || '',
			paymentAmount: Number(item.amount),
			currency: item.currency || DEFAULT_CURRENCY,
			paymentAcademicYear: academicYear,
			paymentDate,
			paymentTime,
			receiptNumber: formatReceiptNumber(),
			paymentMethod: isStudent ? paymentMethod : (payload.paymentMethod || 'cash'),
			phoneNumber: isStudent ? phoneNumber : '',
			status: 'success',
		}));

		await models.Payment.insertMany(paymentDocs);

		const allPayments = await models.Payment.find({ studentId: targetStudentId })
			.sort({ createdAt: -1 })
			.lean();

		const mappedPayments = allPayments.map((p: any) => ({
			id: p._id.toString(),
			receiptNumber: p.receiptNumber,
			studentId: p.studentId,
			classId: p.classId,
			paidBy: p.paidBy,
			feeType: p.feeType,
			category: p.category,
			paymentAmount: p.paymentAmount,
			currency: p.currency,
			paymentAcademicYear: p.paymentAcademicYear,
			paymentDate: p.paymentDate,
			paymentTime: p.paymentTime,
		}));

		if (isStudent) {
			await updateAllUserSessions(sessionUser.id, { payments: mappedPayments }, {
				onlyUpdateFields: ['payments'],
			});
		}

		return NextResponse.json({
			success: true,
			message: 'Payment processed successfully.',
			data: { payments: mappedPayments },
		});
	} catch (error) {
		console.error('Payment error:', error);
		const message = error instanceof Error ? error.message : 'Payment processing failed.';
		return NextResponse.json(
			{ success: false, message },
			{ status: 500 },
		);
	}
}
