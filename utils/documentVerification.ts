import type { SchoolProfile } from '@/types/schoolProfile';
import { resolveStudentFees } from '@/utils/studentFeeBilling';
import { paymentItemRows, paidByInstallment } from '@/utils/payments';

/**
 * Real fee-balance math shared by Financial Clearance and Graduation
 * Clearance — both the on-screen/PDF generation path and the `/api/documents/*`
 * endpoints `/verify` hits later call this, so the printed figure and the
 * recomputed figure are always the same computation, never two copies that
 * can drift.
 */

const EPSILON = 0.01;

export interface FeeBalanceLine {
	feeName: string;
	categoryId: string;
	categoryName: string;
	currency: string;
	expected: number;
	collected: number;
	outstanding: number;
}

export interface FeeBalance {
	lines: FeeBalanceLine[];
	expectedByCurrency: Record<string, number>;
	collectedByCurrency: Record<string, number>;
	outstandingByCurrency: Record<string, number>;
}

const addTo = (map: Record<string, number>, currency: string, amount: number) => {
	if (!currency) return;
	map[currency] = (map[currency] || 0) + amount;
};

const clampZero = (value: number) => (value < EPSILON ? 0 : value);

export interface FeeBalanceOptions {
	/**
	 * An `Installment.id` from the school's own `financialConfig.installments`
	 * catalog. Scopes to *everything due through that installment*, cumulative
	 * (using the catalog's own ordering), because a clearance answers "can they
	 * sit this exam", not "did they pay this one slice in isolation". A fee with
	 * no installment split is always due in full regardless of the cutoff — it
	 * was never divided. Omit for the whole year's balance.
	 */
	installmentId?: string | null;
	/** Restrict to one fee category — Graduation Clearance isolates its package. */
	categoryId?: string;
}

export function computeFeeBalance(
	student: any,
	schoolProfile: SchoolProfile | any,
	academicYear: string,
	classId: string,
	payments: any[],
	options: FeeBalanceOptions = {},
): FeeBalance {
	const bills = resolveStudentFees(student, schoolProfile, academicYear, classId).filter(
		(bill) => bill.isRequired,
	);
	const scoped = options.categoryId
		? bills.filter((bill) => bill.categoryId === options.categoryId)
		: bills;

	const rows = paymentItemRows(payments);
	const byInstallment = paidByInstallment(payments);
	// Payments recorded against a fee with no installment split — matched by
	// name, so this only ever double-counts if a school reused a fee's own id
	// as another fee's name, which the fallback below still resolves cleanly.
	const paidByFeeType = new Map<string, number>();
	for (const row of rows) {
		if (row.installmentId) continue;
		const key = `${row.feeType}::${row.currency}`;
		paidByFeeType.set(key, (paidByFeeType.get(key) || 0) + row.amount);
	}

	// The school's own ordered installment catalog decides what "through the
	// 2nd installment" means — never positional guesswork on the fee's own
	// splits, which may skip entries or be stored out of order.
	const catalog: any[] = schoolProfile?.financialConfig?.installments || [];
	const orderOf = new Map<string, number>(
		catalog.map((inst: any, index: number) => [inst.id, index]),
	);
	const cutoffIndex = options.installmentId
		? (orderOf.get(options.installmentId) ?? -1)
		: -1;
	const hasCutoff = Boolean(options.installmentId) && cutoffIndex >= 0;

	const lines: FeeBalanceLine[] = [];
	const expectedByCurrency: Record<string, number> = {};
	const collectedByCurrency: Record<string, number> = {};

	for (const bill of scoped) {
		let expected: number;
		let collected: number;

		if (bill.installments.length === 0 || !hasCutoff) {
			expected = bill.effectiveAmount;
			collected =
				paidByFeeType.get(`${bill.feeName}::${bill.currency}`) ??
				paidByFeeType.get(`${bill.feeId}::${bill.currency}`) ??
				0;
		} else {
			const due = bill.installments.filter(
				(inst) => (orderOf.get(inst.installmentId) ?? Infinity) <= cutoffIndex,
			);
			expected = due.reduce((sum, inst) => sum + inst.amount, 0);
			collected = due.reduce(
				(sum, inst) => sum + (byInstallment[inst.installmentId]?.[bill.currency] || 0),
				0,
			);
		}

		const outstanding = clampZero(Math.max(0, expected - collected));
		lines.push({
			feeName: bill.feeName,
			categoryId: bill.categoryId,
			categoryName: bill.categoryName,
			currency: bill.currency,
			expected,
			collected,
			outstanding,
		});
		addTo(expectedByCurrency, bill.currency, expected);
		addTo(collectedByCurrency, bill.currency, collected);
	}

	const outstandingByCurrency: Record<string, number> = {};
	for (const currency of Object.keys(expectedByCurrency)) {
		outstandingByCurrency[currency] = clampZero(
			Math.max(0, expectedByCurrency[currency] - (collectedByCurrency[currency] || 0)),
		);
	}

	return { lines, expectedByCurrency, collectedByCurrency, outstandingByCurrency };
}

/** True only when every currency's outstanding balance is zero. */
export const isFullyCleared = (balance: FeeBalance): boolean =>
	Object.values(balance.outstandingByCurrency).every((amount) => amount <= 0);
