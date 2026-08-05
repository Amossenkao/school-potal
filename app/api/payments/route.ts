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
import {
	buildPaymentItems,
	normalizePayments,
	paymentItemRows,
} from '@/utils/payments';
import {
	auditActorFrom,
	recordAuditEvent,
	studentAuditIdentity,
} from '@/utils/auditTrail';
import { canAdministerPayments, canPayOwnFees } from '@/utils/financialAccess';
import crypto from 'crypto';

const VALID_PAYMENT_METHODS = ['orange', 'lonester'];
const DEFAULT_CURRENCY = 'LRD';

/**
 * Voided receipts are kept for the record but must never count as paid.
 * `{ voidedAt: null }` also matches documents predating the field.
 */
const NOT_VOIDED = { voidedAt: null } as const;

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

			const payments = await models.Payment.find({
				studentId,
				...NOT_VOIDED,
			})
				.sort({ createdAt: -1 })
				.lean();

			const mapped = normalizePayments(payments);

			return NextResponse.json({
				success: true,
				data: { payments: mapped, school: schoolProfile },
			});
		}

		if (sessionUser.role === 'administrator') {
			const studentId = searchParams.get('studentId');
			const filter: Record<string, unknown> = { ...NOT_VOIDED };
			if (studentId) filter.studentId = studentId;

			const payments = await models.Payment.find(filter)
				.sort({ createdAt: -1 })
				.limit(200)
				.lean();

			const mapped = normalizePayments(payments);

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
		const isParent = sessionUser.role === 'parent';

		// Authorization is by permission, not merely by role: an administrator
		// without `record_payments` cannot touch the till, and a family can only
		// pay when the school has online payment switched on.
		if (isAdmin) {
			if (!canAdministerPayments(schoolProfile, sessionUser)) {
				return NextResponse.json(
					{
						success: false,
						message:
							'You do not have permission to record payments. Ask a system administrator for the "record payments" permission.',
					},
					{ status: 403 },
				);
			}
		} else if (isStudent || isParent) {
			if (!canPayOwnFees(schoolProfile, sessionUser)) {
				return NextResponse.json(
					{
						success: false,
						message: 'Online payment is not available for this school.',
					},
					{ status: 403 },
				);
			}
		} else {
			return NextResponse.json(
				{ success: false, message: 'Access denied.' },
				{ status: 403 },
			);
		}

		const { paymentMethod, phoneNumber, studentId } = payload;

		// Families pay through a mobile-money provider; administrators record a
		// payment that already happened, so the provider fields do not apply.
		if (isStudent || isParent) {
			if (!paymentMethod || !phoneNumber) {
				return badRequest('Missing payment method or phone number.');
			}
			if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
				return badRequest(`Invalid payment method. Accepted: ${VALID_PAYMENT_METHODS.join(', ')}.`);
			}
		}

		// A parent's session carries the child they currently have selected, so
		// the pay page does not need to send one explicitly.
		const targetStudentId = isStudent
			? sessionUser.studentId || sessionUser.username
			: isParent
				? studentId || sessionUser.studentId
				: studentId;

		if (!targetStudentId) {
			return badRequest('Missing studentId.');
		}

		// A parent may only pay for a child actually linked to them. Re-checked
		// against the database rather than trusting the cached session.
		if (isParent) {
			const parent = await models.Parent.findById(sessionUser.id).lean();
			const linkedStudentIds = Array.isArray(parent?.studentIds)
				? parent.studentIds
				: [];
			if (!linkedStudentIds.includes(targetStudentId)) {
				return NextResponse.json(
					{
						success: false,
						message: 'You can only pay fees for your linked children.',
					},
					{ status: 403 },
				);
			}
		}

		const academicYear =
			paymentAcademicYear ||
			getCurrentAcademicYearFromSchoolProfile(schoolProfile) ||
			'';

		// The student record is the billing subject; a parent's own session is
		// not it, so only a paying student can be used directly.
		const student = isStudent
			? sessionUser
			: await models.Student.findOne({ studentId: targetStudentId }).lean();

		if (!student) {
			return badRequest(`Student "${targetStudentId}" not found.`);
		}

		// Mirrors the client-side normalization (`studentType ?? 'old'` in
		// useAuth/bootstrap/login), so group-eligible fees (tuition, registration,
		// etc.) resolve identically when the DB record lacks the field.
		const resolvedStudent = {
			...student,
			studentType: (student as any).studentType ?? 'old',
		};

		const classId = resolvedStudent.classId || '';
		const studentGroups = schoolProfile.financialConfig?.studentGroups ?? [];
		const groupIds = resolveStudentGroupIds(resolvedStudent, studentGroups);
		const feeGroups = resolveStudentFeeGroups(classId, schoolProfile, academicYear);

		const allResolvedFees: Array<{
			feeDefId: string;
			feeName: string;
			categoryId: string;
			categoryName: string;
			amount: number;
			currency: string;
			scholarshipId?: string;
			installmentIds?: string[];
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
					scholarshipId: (rf.scheduledFee as any).scholarshipId || undefined,
					installmentIds: rf.installments.map((i) => i.installmentId),
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
		const feeScheduleForYear = schoolProfile.financialConfig?.feeSchedules?.find(
			(s: any) => s.academicYear === academicYear,
		);
		const allScholarships = feeScheduleForYear?.scholarships ?? [];
		const adjustedFees = applyScholarshipsToFees(
			allResolvedFees,
			scholarships,
			allScholarships,
		);

		// Voided receipts must not occupy a fee's outstanding balance.
		const existingPayments = await models.Payment.find({
			studentId: targetStudentId,
			...NOT_VOIDED,
		}).lean();
		const paidByFeeType: Record<string, number> = {};
		for (const row of paymentItemRows(existingPayments)) {
			const key = `${row.feeType}::${row.currency || DEFAULT_CURRENCY}`;
			paidByFeeType[key] = (paidByFeeType[key] || 0) + row.amount;
		}

		let selectedCurrency: string | null = null;
		// Two lines in the same batch can target the same fee, so the running
		// total has to include what earlier lines already claimed.
		const claimedInBatch: Record<string, number> = {};

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

			if (item.installmentId) {
				const installmentIds = matchedFee.installmentIds ?? [];
				if (!installmentIds.includes(item.installmentId)) {
					return badRequest(
						`"${item.installmentId}" is not an installment of fee "${matchedFee.feeName}".`,
					);
				}
			}

			const paidKey = `${matchedFee.feeName}::${currency}`;
			const totalPaidAlready =
				(paidByFeeType[paidKey] || 0) + (claimedInBatch[paidKey] || 0);
			const outstanding = Math.max(0, matchedFee.effectiveAmount - totalPaidAlready);

			if (outstanding <= 0) {
				return badRequest(`"${matchedFee.feeName}" has already been fully paid.`);
			}

			if (amount > outstanding) {
				return badRequest(
					`Payment amount for "${matchedFee.feeName}" exceeds the outstanding balance of ${currency} ${outstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
				);
			}

			claimedInBatch[paidKey] = (claimedInBatch[paidKey] || 0) + amount;
		}

		const now = new Date();
		const paymentDate = now.toISOString().split('T')[0];
		const paymentTime = now.toLocaleTimeString();
		const fullName = `${sessionUser.firstName || ''} ${sessionUser.lastName || ''}`.trim();

		// One batch = one document = one receipt number, covering every item.
		const batchItems = buildPaymentItems(items);
		const paymentDoc = {
			studentId: targetStudentId,
			classId,
			paidBy: fullName,
			items: batchItems,
			totalAmount: batchItems.reduce((sum, item) => sum + item.amount, 0),
			currency: selectedCurrency || DEFAULT_CURRENCY,
			paymentAcademicYear: academicYear,
			paymentDate,
			paymentTime,
			receiptNumber: formatReceiptNumber(),
			paymentMethod:
				isStudent || isParent
					? paymentMethod
					: payload.paymentMethod || 'cash',
			phoneNumber: isStudent || isParent ? phoneNumber : '',
			status: 'success',
		};

		const created = await models.Payment.create(paymentDoc);
		const createdReceipt = normalizePayments([created.toObject()])[0];

		// Identify the payer by name and class, not by ID — the audit trail is
		// read by people, and a student record can later be renamed or deleted.
		const payerIdentity = studentAuditIdentity(
			studentDoc || resolvedStudent,
			schoolProfile,
		);
		const payerLabel = `${payerIdentity.studentName}${
			payerIdentity.className ? ` (${payerIdentity.className})` : ''
		}`;

		await recordAuditEvent(req, {
			category: 'payment',
			action: 'payment.created',
			summary: `Recorded ${createdReceipt.currency} ${createdReceipt.totalAmount.toFixed(2)} for ${payerLabel} across ${batchItems.length} fee${batchItems.length === 1 ? '' : 's'} (receipt ${createdReceipt.receiptNumber})`,
			actor: auditActorFrom(sessionUser),
			target: {
				type: 'payment',
				id: createdReceipt.id,
				label: createdReceipt.receiptNumber,
				studentId: targetStudentId,
				receiptNumber: createdReceipt.receiptNumber,
				studentName: payerIdentity.studentName,
				className: payerIdentity.className,
			},
			before: null,
			after: {
				items: createdReceipt.items,
				totalAmount: createdReceipt.totalAmount,
				paymentMethod: createdReceipt.paymentMethod,
				paymentDate: createdReceipt.paymentDate,
			},
			amount: {
				currency: createdReceipt.currency,
				delta: createdReceipt.totalAmount,
			},
			academicYear: academicYear,
		});

		const allPayments = await models.Payment.find({
			studentId: targetStudentId,
			...NOT_VOIDED,
		})
			.sort({ createdAt: -1 })
			.lean();

		const mappedPayments = normalizePayments(allPayments);
		const receipt = createdReceipt;

		if (isStudent) {
			await updateAllUserSessions(sessionUser.id, { payments: mappedPayments }, {
				onlyUpdateFields: ['payments'],
			});
		} else if (isParent && (student as any)?._id) {
			// Refresh the child's session, not the parent's — payments hang off
			// the student record.
			await updateAllUserSessions(
				String((student as any)._id),
				{ payments: mappedPayments },
				{ onlyUpdateFields: ['payments'] },
			);
		}

		return NextResponse.json({
			success: true,
			message: 'Payment processed successfully.',
			data: { payments: mappedPayments, receipt },
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
