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
	/** Paid toward this fee across every receipt, including this one. */
	paidToDate: number;
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
		paidToDate: number;
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
	/** Every payment for this student, so paid-to-date is complete. */
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
 * "Paid to date" counts every receipt for the student, not just this one, so a
 * reprinted receipt always reflects the balance as it stands now.
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

	// Every line this student has ever paid, in this receipt's currency.
	const studentRows = paymentItemRows(allPayments).filter(
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
		const paidToDate = paidByFee.get(item.feeType) || 0;
		return {
			feeType: item.feeType,
			category: item.category || bill?.categoryName || '',
			installmentLabel: item.installmentId
				? installmentLabels.get(item.installmentId) || item.installmentId
				: undefined,
			amountPaid: item.amount,
			feeTotal,
			paidToDate,
			outstanding: clampZero(Math.max(0, feeTotal - paidToDate)),
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
	const paidToDate = studentRows.reduce((sum, row) => sum + row.amount, 0);

	const verifyUrl = `${origin}/verify?receipt=${encodeURIComponent(payment.receiptNumber)}`;

	return {
		payment,
		currency,
		lines,
		installments,
		overall: {
			expected,
			paidToDate,
			outstanding: clampZero(Math.max(0, expected - paidToDate)),
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
