import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { authorizeUser } from '@/proxy';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import { resolveStudentFees } from '@/utils/studentFeeBilling';
import { updateAllUserSessions } from '@/utils/session';
import {
	buildPaymentItems,
	normalizePayment,
	normalizePayments,
	paymentItemRows,
} from '@/utils/payments';
import { auditActorFrom, recordAuditEvent } from '@/utils/auditTrail';
import { canAdministerPayments } from '@/utils/financialAccess';

/** Voided receipts survive for the record but never count as paid. */
const NOT_VOIDED = { voidedAt: null } as const;

const badRequest = (message: string) =>
	NextResponse.json({ success: false, message }, { status: 400 });

const forbidden = (message: string) =>
	NextResponse.json({ success: false, message }, { status: 403 });

/**
 * Editing or voiding a recorded payment rewrites a student's balance and
 * invalidates a receipt that may already be in someone's hands, so both verbs
 * re-authenticate: an active session is not enough, the acting administrator
 * must re-enter their password on every call.
 */
async function requirePasswordConfirmation(
	req: NextRequest,
	password: unknown,
) {
	const sessionUser = await authorizeUser(req);
	if (!sessionUser) {
		return {
			error: NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			),
		};
	}

	// Same bar as recording a payment: editing or voiding one moves money just
	// as surely, so it takes the `record_payments` permission — not merely an
	// administrator or system_admin role.
	const schoolProfile = await getSchoolProfile();
	if (!canAdministerPayments(schoolProfile, sessionUser)) {
		return {
			error: forbidden(
				'You do not have permission to modify payments. This requires the "record payments" permission.',
			),
		};
	}

	if (typeof password !== 'string' || password.length === 0) {
		return { error: badRequest('Password confirmation is required.') };
	}

	const models = await getTenantModels();
	const actor = await models.User.findById(sessionUser.id).lean();
	if (!actor?.password) {
		return { error: forbidden('Could not verify your account.') };
	}

	const valid = await bcrypt.compare(password, actor.password as string);
	if (!valid) {
		return {
			error: NextResponse.json(
				{ success: false, message: 'Incorrect password.' },
				{ status: 401 },
			),
		};
	}

	return { sessionUser, models };
}

/** Refreshes the affected student's cached session so their portal agrees. */
async function refreshStudentSession(models: any, studentId: string) {
	try {
		const student = await models.Student.findOne({ studentId }).lean();
		if (!student?._id) return;
		const payments = await models.Payment.find({ studentId, ...NOT_VOIDED })
			.sort({ createdAt: -1 })
			.lean();
		await updateAllUserSessions(
			student._id.toString(),
			{ payments: normalizePayments(payments) },
			{ onlyUpdateFields: ['payments'] },
		);
	} catch (error) {
		// A stale session is recoverable on next bootstrap; never fail the write.
		console.error('Failed to refresh student session after payment change:', error);
	}
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const payload = await req.json().catch(() => ({}));
		const auth = await requirePasswordConfirmation(req, payload?.password);
		if ('error' in auth) return auth.error;
		const { models } = auth;

		const existing = await models.Payment.findById(id).lean();
		if (!existing) {
			return NextResponse.json(
				{ success: false, message: 'Payment not found.' },
				{ status: 404 },
			);
		}

		const current = normalizePayment(existing);
		if (current.voidedAt) {
			return badRequest('A voided receipt cannot be edited.');
		}
		const rawItems = Array.isArray(payload?.items) ? payload.items : null;
		if (!rawItems || rawItems.length === 0) {
			return badRequest('A payment must keep at least one item.');
		}

		const items = buildPaymentItems(rawItems);
		for (const item of items) {
			if (!item.feeType) return badRequest('Every item needs a fee.');
			if (!Number.isFinite(item.amount) || item.amount <= 0) {
				return badRequest(`Invalid amount for "${item.feeType}".`);
			}
		}

		// ── Balance guard ────────────────────────────────────────────────────
		// The edited amounts must still fit inside what each fee actually costs.
		// This payment's own current contribution is excluded from "already
		// paid", otherwise editing a receipt down would still look overpaid.
		const schoolProfile = await getSchoolProfile();
		const student = await models.Student.findOne({
			studentId: current.studentId,
		}).lean();

		if (schoolProfile && student) {
			const bills = resolveStudentFees(
				{ ...student, studentType: (student as any).studentType ?? 'old' },
				schoolProfile,
				current.paymentAcademicYear,
				current.classId || undefined,
			);

			const others = await models.Payment.find({
				studentId: current.studentId,
				_id: { $ne: existing._id },
				...NOT_VOIDED,
			}).lean();

			const paidByFee: Record<string, number> = {};
			for (const row of paymentItemRows(others)) {
				if (row.currency !== current.currency) continue;
				paidByFee[row.feeType] = (paidByFee[row.feeType] || 0) + row.amount;
			}

			const claimed: Record<string, number> = {};
			for (const item of items) {
				const bill = bills.find(
					(candidate) =>
						candidate.currency === current.currency &&
						(candidate.feeName === item.feeType ||
							candidate.feeId === item.feeType),
				);
				// Fees that are no longer on the schedule (renamed, removed) can't be
				// bounds-checked; leave them editable rather than blocking a correction.
				if (!bill) continue;

				const alreadyPaid =
					(paidByFee[item.feeType] || 0) + (claimed[item.feeType] || 0);
				const room = Math.max(0, bill.effectiveAmount - alreadyPaid);
				if (item.amount > room + 0.01) {
					return badRequest(
						`${item.feeType}: ${current.currency} ${item.amount.toFixed(2)} exceeds the ${current.currency} ${room.toFixed(2)} still owed on that fee.`,
					);
				}
				claimed[item.feeType] = (claimed[item.feeType] || 0) + item.amount;
			}
		}

		const update: Record<string, unknown> = {
			items,
			totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
		};
		if (typeof payload.paymentMethod === 'string' && payload.paymentMethod) {
			update.paymentMethod = payload.paymentMethod;
		}
		if (typeof payload.paymentDate === 'string' && payload.paymentDate) {
			update.paymentDate = payload.paymentDate;
		}
		// Legacy top-level fee fields would contradict the new items array.
		const unset = {
			feeType: '',
			category: '',
			installmentId: '',
			paymentAmount: '',
		};

		const saved = await models.Payment.findByIdAndUpdate(
			id,
			{ $set: update, $unset: unset },
			{ new: true },
		).lean();

		const after = normalizePayment(saved);

		await recordAuditEvent(req, {
			category: 'payment',
			action: 'payment.updated',
			summary: `Edited receipt ${current.receiptNumber} for ${current.studentId}: ${current.currency} ${current.totalAmount.toFixed(2)} → ${after.totalAmount.toFixed(2)}`,
			actor: auditActorFrom(auth.sessionUser),
			target: {
				type: 'payment',
				id: current.id,
				label: current.receiptNumber,
				studentId: current.studentId,
				receiptNumber: current.receiptNumber,
			},
			before: {
				items: current.items,
				totalAmount: current.totalAmount,
				paymentMethod: current.paymentMethod,
				paymentDate: current.paymentDate,
			},
			after: {
				items: after.items,
				totalAmount: after.totalAmount,
				paymentMethod: after.paymentMethod,
				paymentDate: after.paymentDate,
			},
			amount: {
				currency: current.currency,
				delta: after.totalAmount - current.totalAmount,
			},
			academicYear: current.paymentAcademicYear,
		});

		await refreshStudentSession(models, current.studentId);

		return NextResponse.json({
			success: true,
			message: 'Payment updated.',
			data: { payment: after },
		});
	} catch (error) {
		console.error('PATCH payment error:', error);
		const message =
			error instanceof Error ? error.message : 'Failed to update payment.';
		return NextResponse.json({ success: false, message }, { status: 500 });
	}
}

/**
 * Voids a receipt. Kept as DELETE so existing callers keep working, but the
 * record is never removed: a receipt is an external artefact that someone may
 * be holding, and /api/payments/verify has to be able to say "this was voided
 * on <date> by <name>" rather than "no such receipt". Every balance and
 * collection read filters `voidedAt: null`, so a voided receipt stops counting
 * as paid the moment it is voided.
 */
export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const payload = await req.json().catch(() => ({}));
		const auth = await requirePasswordConfirmation(req, payload?.password);
		if ('error' in auth) return auth.error;
		const { models, sessionUser } = auth;

		const reason = String(payload?.reason || '').trim();
		if (!reason) {
			return badRequest('A reason is required to void a receipt.');
		}

		const existing = await models.Payment.findById(id).lean();
		if (!existing) {
			return NextResponse.json(
				{ success: false, message: 'Payment not found.' },
				{ status: 404 },
			);
		}

		const current = normalizePayment(existing);
		if (current.voidedAt) {
			return badRequest('This receipt has already been voided.');
		}

		const actor = auditActorFrom(sessionUser);

		const voided = await models.Payment.findByIdAndUpdate(
			id,
			{
				$set: {
					voidedAt: new Date(),
					voidedBy: { id: actor.id, name: actor.name },
					voidReason: reason,
				},
			},
			{ new: true },
		).lean();

		await recordAuditEvent(req, {
			category: 'payment',
			action: 'payment.voided',
			summary: `Voided receipt ${current.receiptNumber} for ${current.studentId} (${current.currency} ${current.totalAmount.toFixed(2)}) — ${reason}`,
			actor,
			target: {
				type: 'payment',
				id: current.id,
				label: current.receiptNumber,
				studentId: current.studentId,
				receiptNumber: current.receiptNumber,
			},
			before: { items: current.items, totalAmount: current.totalAmount },
			after: { voided: true, reason },
			// Negative: this is the amount handed back to the outstanding balance.
			amount: { currency: current.currency, delta: -current.totalAmount },
			academicYear: current.paymentAcademicYear,
		});

		await refreshStudentSession(models, current.studentId);

		return NextResponse.json({
			success: true,
			message: 'Receipt voided.',
			data: { payment: normalizePayment(voided) },
		});
	} catch (error) {
		console.error('Void payment error:', error);
		const message =
			error instanceof Error ? error.message : 'Failed to void payment.';
		return NextResponse.json({ success: false, message }, { status: 500 });
	}
}
