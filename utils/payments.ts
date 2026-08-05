/**
 * Payments are stored as batches: one transaction, one receipt number, one
 * currency, and one or more fee items.
 *
 * Records written before the batch migration have the fee fields at the top
 * level and no `items` array. `normalizePayment` folds those into a one-item
 * batch, so every reader — API responses, the bootstrap payload, the store —
 * works with a single shape and no consumer needs a legacy branch.
 */

export interface PaymentItem {
	/** References FeeDefinition.id when known; blank on legacy records. */
	feeId?: string;
	/** The fee's display name as recorded at payment time. */
	feeType: string;
	category: string;
	/** Installment.id this line was paid against, when one was chosen. */
	installmentId?: string;
	amount: number;
}

export interface PaymentRecord {
	id: string;
	receiptNumber: string;
	studentId: string;
	classId: string;
	paidBy: string;
	items: PaymentItem[];
	/** Sum of items[].amount. */
	totalAmount: number;
	currency: string;
	paymentAcademicYear: string;
	paymentDate: string;
	paymentTime: string;
	paymentMethod?: string;
	status?: string;
}

/** One fee line with its batch context attached — the unit aggregations use. */
export interface PaymentItemRow extends PaymentItem {
	/** Unique per line: `${paymentId}#${index}`. Use it to de-duplicate. */
	rowId: string;
	paymentId: string;
	itemIndex: number;
	receiptNumber: string;
	studentId: string;
	classId: string;
	paidBy: string;
	currency: string;
	paymentAcademicYear: string;
	paymentDate: string;
	paymentTime: string;
	paymentMethod?: string;
}

const DEFAULT_CURRENCY = 'LRD';

const toNumber = (value: unknown): number => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Coerces a raw payment (Mongo document, API payload, or cached store entry)
 * into the batch shape. Safe to call on already-normalized records.
 */
export function normalizePayment(raw: any): PaymentRecord {
	const currency = raw?.currency || DEFAULT_CURRENCY;

	const rawItems = Array.isArray(raw?.items) ? raw.items : [];
	const items: PaymentItem[] =
		rawItems.length > 0
			? rawItems.map((item: any) => ({
					feeId: item?.feeId || undefined,
					feeType: item?.feeType || item?.feeName || 'fee',
					category: item?.category || item?.categoryName || '',
					installmentId: item?.installmentId || undefined,
					amount: toNumber(item?.amount),
				}))
			: // Legacy single-item record.
				[
					{
						feeId: raw?.feeId || undefined,
						feeType: raw?.feeType || 'fee',
						category: raw?.category || '',
						installmentId: raw?.installmentId || undefined,
						amount: toNumber(raw?.paymentAmount),
					},
				];

	const totalAmount =
		raw?.totalAmount !== undefined && raw?.totalAmount !== null
			? toNumber(raw.totalAmount)
			: items.reduce((sum, item) => sum + item.amount, 0);

	return {
		id: String(raw?.id || raw?._id?.toString?.() || raw?._id || ''),
		receiptNumber: raw?.receiptNumber || '',
		studentId: String(raw?.studentId || ''),
		classId: raw?.classId || '',
		paidBy: raw?.paidBy || '',
		items,
		totalAmount,
		currency,
		paymentAcademicYear: raw?.paymentAcademicYear || '',
		paymentDate: raw?.paymentDate || '',
		paymentTime: raw?.paymentTime || '',
		paymentMethod: raw?.paymentMethod || undefined,
		status: raw?.status || undefined,
	};
}

export const normalizePayments = (raw: any[]): PaymentRecord[] =>
	(Array.isArray(raw) ? raw : []).map(normalizePayment);

/**
 * Explodes batches into per-fee rows carrying their batch context. Aggregations
 * that used to read `payment.paymentAmount` / `payment.feeType` iterate these
 * instead, so a batch of five fees contributes five rows exactly as five
 * separate records used to.
 */
export function paymentItemRows(payments: any[]): PaymentItemRow[] {
	const rows: PaymentItemRow[] = [];
	for (const raw of Array.isArray(payments) ? payments : []) {
		const payment = normalizePayment(raw);
		payment.items.forEach((item, index) => {
			rows.push({
				...item,
				rowId: `${payment.id}#${index}`,
				paymentId: payment.id,
				itemIndex: index,
				receiptNumber: payment.receiptNumber,
				studentId: payment.studentId,
				classId: payment.classId,
				paidBy: payment.paidBy,
				currency: payment.currency,
				paymentAcademicYear: payment.paymentAcademicYear,
				paymentDate: payment.paymentDate,
				paymentTime: payment.paymentTime,
				paymentMethod: payment.paymentMethod,
			});
		});
	}
	return rows;
}

/** Total paid across a set of batches, in one currency. */
export const sumPayments = (payments: any[], currency?: string): number =>
	normalizePayments(payments).reduce(
		(sum, payment) =>
			currency && payment.currency !== currency ? sum : sum + payment.totalAmount,
		0,
	);

/**
 * Amount paid per `${feeType}::${currency}` key, the lookup the fee pages use
 * to work out what a student still owes on each fee.
 */
export function paidByFeeKey(payments: any[]): Record<string, number> {
	const map: Record<string, number> = {};
	for (const row of paymentItemRows(payments)) {
		const feeKey = row.feeType && row.feeType !== 'fee' ? row.feeType : row.category;
		const key = `${feeKey}::${row.currency}`;
		map[key] = (map[key] || 0) + row.amount;
	}
	return map;
}

/** Amount paid per installment id, per currency. */
export function paidByInstallment(
	payments: any[],
): Record<string, Record<string, number>> {
	const map: Record<string, Record<string, number>> = {};
	for (const row of paymentItemRows(payments)) {
		if (!row.installmentId) continue;
		if (!map[row.installmentId]) map[row.installmentId] = {};
		map[row.installmentId][row.currency] =
			(map[row.installmentId][row.currency] || 0) + row.amount;
	}
	return map;
}

/** Shape written to Mongo for a new batch. */
export const buildPaymentItems = (items: any[]): PaymentItem[] =>
	(Array.isArray(items) ? items : []).map((item) => ({
		feeId: item?.feeId || undefined,
		feeType: item?.feeName || item?.feeType || item?.label || '',
		category: item?.categoryName || item?.category || '',
		installmentId: item?.installmentId || undefined,
		amount: toNumber(item?.amount),
	}));
