import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import {
	resolveStudentFeeGroups,
	resolveStudentGroupIds,
	resolveResolvedScheduledFees,
} from '@/utils/resolveStudentFeeGroup';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';
import { updateAllUserSessions } from '@/utils/session';
import crypto from 'crypto';

const VALID_PAYMENT_METHODS = ['orange', 'lonester'];
const DEFAULT_CURRENCY = 'LRD';

const formatReceiptNumber = () =>
	`RCPT-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

const badRequest = (message: string) =>
	NextResponse.json({ success: false, message }, { status: 400 });

export async function POST(req: NextRequest) {
	try {
		const sessionUser = await authorizeUser(req);
		if (!sessionUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		if (sessionUser.role !== 'student') {
			return NextResponse.json(
				{ success: false, message: 'Only students can make payments.' },
				{ status: 403 },
			);
		}

		const payload = await req.json();
		const { items, paymentMethod, phoneNumber, paymentAcademicYear } = payload;

		if (!items || !Array.isArray(items) || items.length === 0 || !paymentMethod || !phoneNumber) {
			return badRequest('Missing payment details.');
		}

		// ── Validate payment method ──────────────────────────────────────────────
		if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
			return badRequest(`Invalid payment method. Accepted: ${VALID_PAYMENT_METHODS.join(', ')}.`);
		}

		const models = await getTenantModels();
		const schoolProfile = await getSchoolProfile();
		if (!schoolProfile) {
			return NextResponse.json(
				{ success: false, message: 'School profile not found.' },
				{ status: 500 },
			);
		}

		const onlinePaymentEnabled = schoolProfile.featureConfig?.enabledFeatures?.includes('online_payment');
		if (!onlinePaymentEnabled) {
			return badRequest('Online payment is not available for this school.');
		}

		// ── Resolve the student's fees from the school profile ───────────────────
		const academicYear =
			paymentAcademicYear ||
			getCurrentAcademicYearFromSchoolProfile(schoolProfile) ||
			'';

		const studentGroups = schoolProfile.financialConfig?.studentGroups ?? [];
		const studentGroupIds = resolveStudentGroupIds(sessionUser, studentGroups);
		const feeGroups = resolveStudentFeeGroups(
			sessionUser.classId,
			schoolProfile,
			academicYear,
		);

		const allResolvedFees: Array<{
			feeDefId: string;
			feeName: string;
			categoryName: string;
			amount: number;
			currency: string;
		}> = [];

		for (const { feeGroup } of feeGroups) {
			const resolved = resolveResolvedScheduledFees(feeGroup, schoolProfile, studentGroupIds);
			for (const rf of resolved) {
				allResolvedFees.push({
					feeDefId: rf.scheduledFee.feeId,
					feeName: rf.feeDefinition?.name || rf.scheduledFee.feeId,
					categoryName: rf.categoryName,
					amount: rf.scheduledFee.amount.amount,
					currency: rf.scheduledFee.amount.currency,
				});
			}
		}

		if (allResolvedFees.length === 0) {
			return badRequest('No fees are configured for your class this academic year.');
		}

		// ── Fetch existing payments for balance computation ──────────────────────
		const studentId = sessionUser.studentId || sessionUser.username;
		const existingPayments = await models.Payment.find({ studentId }).lean();
		const paidByFeeType: Record<string, number> = {};
		for (const p of existingPayments) {
			const key = `${p.feeType}::${p.currency || DEFAULT_CURRENCY}`;
			paidByFeeType[key] = (paidByFeeType[key] || 0) + p.paymentAmount;
		}

		// ── Validate each item ───────────────────────────────────────────────────
		let selectedCurrency: string | null = null;

		for (const item of items) {
			if (item.currency && !selectedCurrency) {
				selectedCurrency = item.currency;
			}

			// 1. Amount must be a positive finite number
			const rawAmount = item.amount;
			if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
				return badRequest(`Payment amount is missing for "${item.feeName || item.label}".`);
			}
			const amount = Number(rawAmount);
			if (!isFinite(amount) || amount <= 0) {
				return badRequest(
					`Invalid payment amount for "${item.feeName || item.label}". Amount must be a positive number.`,
				);
			}
			const currency = item.currency || DEFAULT_CURRENCY;

			// 2. Single currency restriction — all items must share the same currency
			if (selectedCurrency && currency !== selectedCurrency) {
				return badRequest(
					`Mixed currencies are not allowed. This payment uses "${selectedCurrency}", but "${item.feeName || item.label}" is in "${currency}".`,
				);
			}

			// 3. Currency must be recognised by the school
			const validCurrencies = schoolProfile.financialConfig?.currencies ?? [];
			if (validCurrencies.length > 0 && !validCurrencies.some((c: any) => c.code === currency)) {
				return badRequest(
					`Currency "${currency}" is not configured for this school.`,
				);
			}

			// 4. Fee must exist in the student's resolved fee schedule
			const feeName = item.feeName || item.label || '';
			const matchedFee = allResolvedFees.find(
				(f) =>
					(f.feeDefId === item.feeId || f.feeName === feeName) &&
					f.currency === currency,
			);
			if (!matchedFee) {
				return badRequest(
					`Fee "${feeName}" was not found in your fee schedule for this academic year.`,
				);
			}

			// 5. Outstanding balance check
			const paidKey = `${matchedFee.feeName}::${currency}`;
			const totalPaidAlready = paidByFeeType[paidKey] || 0;
			const outstanding = matchedFee.amount - totalPaidAlready;

			if (outstanding <= 0) {
				return badRequest(
					`"${matchedFee.feeName}" has already been fully paid.`,
				);
			}

			if (amount > outstanding) {
				return badRequest(
					`Payment amount for "${matchedFee.feeName}" exceeds the outstanding balance of ${currency} ${outstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
				);
			}
		}

		// ── All validations passed — persist payments ────────────────────────────
		const now = new Date();
		const paymentDate = now.toISOString().split('T')[0];
		const paymentTime = now.toLocaleTimeString();
		const fullName = `${sessionUser.firstName || ''} ${sessionUser.lastName || ''}`.trim();
		const classId = sessionUser.classId || '';

		const paymentDocs = items.map((item: any) => ({
			studentId,
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
			paymentMethod,
			phoneNumber,
			status: 'success',
		}));

		await models.Payment.insertMany(paymentDocs);

		const allPayments = await models.Payment.find({ studentId })
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

		await updateAllUserSessions(sessionUser.id, { payments: mappedPayments }, {
			onlyUpdateFields: ['payments'],
		});

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
