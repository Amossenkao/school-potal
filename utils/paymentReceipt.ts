import type { SchoolProfile } from '@/types/schoolProfile';
import { resolveStudentFees } from '@/utils/studentFeeBilling';
import { allocatePaymentsToInstallments } from '@/utils/resolveStudentFeeGroup';
import {
	normalizePayment,
	paymentItemRows,
	type PaymentRecord,
} from '@/utils/payments';

const EPSILON = 0.01;

const clampZero = (value: number) => (Math.abs(value) < EPSILON ? 0 : value);

export interface ReceiptLine {
	feeType: string;
	category: string;
	installmentLabel?: string;
	/** Paid on this receipt. */
	amountPaid: number;
	/** The fee's assessed amount after scholarships. */
	feeTotal: number;
	/** Still owed on this fee after this receipt. */
	outstanding: number;
}

export interface ReceiptInstallment {
	installmentId: string;
	label: string;
	expected: number;
	paid: number;
	outstanding: number;
}

export interface ReceiptContext {
	payment: PaymentRecord;
	currency: string;
	lines: ReceiptLine[];
	installments: ReceiptInstallment[];
	/** Whole-year position for the student, after this receipt. */
	overall: {
		expected: number;
		outstanding: number;
	};
	/** Total on this receipt. */
	receiptTotal: number;
	student: {
		studentId: string;
		name: string;
		className: string;
	};
	academicYear: string;
	verifyUrl: string;
}

export interface BuildReceiptArgs {
	payment: any;
	student: any;
	schoolProfile: SchoolProfile | null | undefined;
	/**
	 * Every payment for this student. Deduplicated by id internally, because the
	 * store keys payments by academic year in both `2025/2026` and `2025-2026`
	 * forms and a naive flatten counts the same receipt twice.
	 */
	allPayments: any[];
	className?: string;
	origin?: string;
}

const studentName = (student: any): string =>
	student?.fullName ||
	`${student?.firstName || ''} ${student?.lastName || ''}`.trim() ||
	student?.username ||
	String(student?.studentId || 'Unknown');

/**
 * Assembles everything a receipt prints: the lines on this batch, what each fee
 * still owes afterwards, the installment position, and the student's overall
 * balance for the year.
 *
 * Outstanding figures net off every receipt the student holds, not just this
 * one, so a reprint always shows the balance as it stands now.
 */
export function buildReceiptContext({
	payment: rawPayment,
	student,
	schoolProfile,
	allPayments,
	className = '',
	origin = '',
}: BuildReceiptArgs): ReceiptContext {
	const payment = normalizePayment(rawPayment);
	const academicYear = payment.paymentAcademicYear;
	const currency = payment.currency;

	const bills = schoolProfile
		? resolveStudentFees(student, schoolProfile, academicYear, payment.classId || undefined)
		: [];

	// Every line this student has ever paid, in this receipt's currency. The
	// dedupe by payment id is load-bearing: the caller flattens a year-keyed
	// map that can hold the same receipt under two spellings of the year.
	const seenPaymentIds = new Set<string>();
	const uniquePayments = (Array.isArray(allPayments) ? allPayments : []).filter(
		(candidate) => {
			const key = String(candidate?.id || candidate?._id || '');
			if (!key || seenPaymentIds.has(key)) return false;
			seenPaymentIds.add(key);
			return true;
		},
	);

	const studentRows = paymentItemRows(uniquePayments).filter(
		(row) =>
			String(row.studentId) === String(payment.studentId) &&
			row.currency === currency,
	);

	const paidByFee = new Map<string, number>();
	for (const row of studentRows) {
		paidByFee.set(row.feeType, (paidByFee.get(row.feeType) || 0) + row.amount);
	}

	const installmentLabels = new Map<string, string>();
	for (const bill of bills) {
		for (const split of bill.installments) {
			installmentLabels.set(split.installmentId, split.label);
		}
	}

	// ── Lines on this receipt ────────────────────────────────────────────
	const lines: ReceiptLine[] = payment.items.map((item) => {
		const bill = bills.find(
			(candidate) =>
				candidate.currency === currency &&
				(candidate.feeName === item.feeType || candidate.feeId === item.feeType),
		);
		const feeTotal = bill?.effectiveAmount ?? 0;
		const paidAcrossReceipts = paidByFee.get(item.feeType) || 0;
		return {
			feeType: item.feeType,
			category: item.category || bill?.categoryName || '',
			installmentLabel: item.installmentId
				? installmentLabels.get(item.installmentId) || item.installmentId
				: undefined,
			amountPaid: item.amount,
			feeTotal,
			outstanding: clampZero(Math.max(0, feeTotal - paidAcrossReceipts)),
		};
	});

	// ── Installment position across every required fee ───────────────────
	const installmentTotals = new Map<
		string,
		{ label: string; expected: number; paid: number }
	>();
	const ensureInstallment = (id: string, label: string) => {
		let entry = installmentTotals.get(id);
		if (!entry) {
			entry = { label, expected: 0, paid: 0 };
			installmentTotals.set(id, entry);
		}
		return entry;
	};

	for (const bill of bills) {
		if (!bill.isRequired || bill.currency !== currency) continue;
		if (bill.installments.length === 0) continue;

		for (const split of bill.installments) {
			ensureInstallment(split.installmentId, split.label).expected += split.amount;
		}

		// Money paid toward this fee rolls across its installments in due order.
		const feeRows = studentRows.filter((row) => row.feeType === bill.feeName);
		const allocated = allocatePaymentsToInstallments(
			bill.installments,
			feeRows.map((row) => ({ amount: row.amount })),
		);
		for (const split of bill.installments) {
			const amount = allocated[split.installmentId] || 0;
			if (amount > 0) {
				ensureInstallment(split.installmentId, split.label).paid += amount;
			}
		}
	}

	const installments: ReceiptInstallment[] = Array.from(
		installmentTotals.entries(),
	).map(([installmentId, entry]) => ({
		installmentId,
		label: entry.label,
		expected: entry.expected,
		paid: entry.paid,
		outstanding: clampZero(Math.max(0, entry.expected - entry.paid)),
	}));

	// Keep the school's configured due order.
	const order = (schoolProfile?.financialConfig?.installments || []).map(
		(item) => item.id,
	);
	installments.sort((a, b) => {
		const ai = order.indexOf(a.installmentId);
		const bi = order.indexOf(b.installmentId);
		return (
			(ai === -1 ? Number.MAX_SAFE_INTEGER : ai) -
			(bi === -1 ? Number.MAX_SAFE_INTEGER : bi)
		);
	});

	// ── Overall position for the year ────────────────────────────────────
	const expected = bills
		.filter((bill) => bill.isRequired && bill.currency === currency)
		.reduce((sum, bill) => sum + bill.effectiveAmount, 0);
	const paidAcrossReceipts = studentRows.reduce(
		(sum, row) => sum + row.amount,
		0,
	);

	const verifyUrl = `${origin}/verify?receipt=${encodeURIComponent(payment.receiptNumber)}`;

	return {
		payment,
		currency,
		lines,
		installments,
		overall: {
			expected,
			outstanding: clampZero(Math.max(0, expected - paidAcrossReceipts)),
		},
		receiptTotal: payment.totalAmount,
		student: {
			studentId: payment.studentId,
			name: studentName(student),
			className: className || student?.className || '',
		},
		academicYear,
		verifyUrl,
	};
}
