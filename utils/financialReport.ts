import type { SchoolProfile } from '@/types/schoolProfile';
import { resolveStudentFees, type StudentFeeBill } from '@/utils/studentFeeBilling';
import { allocatePaymentsToInstallments } from '@/utils/resolveStudentFeeGroup';

// Amounts below this are treated as zero so floating point residue from
// percentage-based installment splits never shows up as an outstanding balance.
const EPSILON = 0.01;

const IMMEDIATE_ID = '__immediate__';
const IMMEDIATE_LABEL = 'Due Immediately';
const UNASSIGNED_SESSION = 'Unassigned';

const MONTH_LABELS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

export const formatAmount = (value: number): string =>
	(Number.isFinite(value) ? value : 0).toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

export const percentOf = (part: number, total: number): number =>
	total > EPSILON ? Math.round((part / total) * 100) : 0;

export const monthLabel = (key: string): string => {
	const [year, month] = key.split('-');
	const index = Number(month) - 1;
	return `${MONTH_LABELS[index] || month} ${year}`;
};

export interface AmountRow {
	key: string;
	label: string;
	/** Assessed amount before scholarships. */
	gross: number;
	/** Scholarship / waiver value applied. */
	discount: number;
	/** Receivable after scholarships (gross − discount). */
	expected: number;
	collected: number;
	outstanding: number;
	/** Collected as a percentage of expected. */
	rate: number;
}

export interface ClassRow extends AmountRow {
	classId: string;
	session: string;
	level: string;
	studentCount: number;
	categories: CategoryRow[];
}

export interface InstallmentRow {
	key: string;
	label: string;
	expected: number;
	collected: number;
	outstanding: number;
	rate: number;
}

export interface MonthRow {
	key: string;
	label: string;
	transactions: number;
	amount: number;
	cumulative: number;
	/** Share of the year's total collections, 0–100. */
	share: number;
}

export interface ScholarshipRow {
	key: string;
	label: string;
	awards: number;
	discount: number;
}

/** Expected vs collected for one fee category inside a larger bucket. */
export interface CategoryRow {
	key: string;
	label: string;
	expected: number;
	collected: number;
	outstanding: number;
	rate: number;
}

/** One installment milestone, with the fee categories that make it up. */
export interface InstallmentBucket extends InstallmentRow {
	categories: CategoryRow[];
}

export interface SessionInstallments {
	sessionName: string;
	installments: InstallmentBucket[];
}

export interface CurrencySummary {
	studentsBilled: number;
	studentsFullyPaid: number;
	studentsPartiallyPaid: number;
	studentsUnpaid: number;
	gross: number;
	discount: number;
	expected: number;
	collected: number;
	outstanding: number;
	rate: number;
	transactions: number;
	averagePayment: number;
	largestPayment: number;
	firstPaymentDate: string;
	lastPaymentDate: string;
	/** Distinct calendar days on which money came in. */
	activeDays: number;
	averagePerActiveDay: number;
	bestMonthLabel: string;
	bestMonthAmount: number;
}

export interface CurrencyReport {
	code: string;
	label: string;
	symbol: string;
	summary: CurrencySummary;
	byFee: AmountRow[];
	byCategory: AmountRow[];
	bySession: AmountRow[];
	byClass: ClassRow[];
	byInstallment: InstallmentRow[];
	installmentsBySession: SessionInstallments[];
	monthly: MonthRow[];
	scholarships: ScholarshipRow[];
}

export interface FinancialReport {
	academicYear: string;
	generatedAt: string;
	schoolName: string;
	studentsEnrolled: number;
	currencies: CurrencyReport[];
}

interface BillRow {
	studentId: string;
	classId: string;
	bill: StudentFeeBill;
}

interface PaymentLike {
	id: string;
	studentId: string;
	classId?: string;
	feeType: string;
	category?: string;
	paymentAmount: number;
	currency: string;
	paymentDate: string;
	paymentMethod?: string;
}

export interface BuildFinancialReportArgs {
	schoolProfile: SchoolProfile | null | undefined;
	academicYear: string;
	students: any[];
	payments: PaymentLike[];
}

const sameYear = (a?: string, b?: string) =>
	(a || '').replace(/\//g, '-') === (b || '').replace(/\//g, '-');

const makeRow = (key: string, label: string): AmountRow => ({
	key,
	label,
	gross: 0,
	discount: 0,
	expected: 0,
	collected: 0,
	outstanding: 0,
	rate: 0,
});

const finalizeRow = <T extends AmountRow>(row: T): T => {
	row.outstanding = Math.max(0, row.expected - row.collected);
	if (row.outstanding < EPSILON) row.outstanding = 0;
	row.rate = percentOf(row.collected, row.expected);
	return row;
};

/**
 * Builds the complete income + cash inflow picture for one academic year from
 * the same source of truth the student-facing fee pages use: scholarship- and
 * student-group-adjusted fee bills on the expected side, recorded payments on
 * the collected side. Everything is partitioned by currency because fees are
 * quoted per currency and cross-currency totals would be meaningless.
 */
export function buildFinancialReport({
	schoolProfile,
	academicYear,
	students,
	payments,
}: BuildFinancialReportArgs): FinancialReport {
	const empty: FinancialReport = {
		academicYear,
		generatedAt: new Date().toISOString(),
		schoolName: schoolProfile?.identity?.name || 'School',
		studentsEnrolled: students?.length || 0,
		currencies: [],
	};
	if (!schoolProfile || !academicYear) return empty;

	// ── Class metadata + profile-defined ordering ───────────────────────────
	const classMeta: Record<
		string,
		{ session: string; level: string; className: string; rank: number }
	> = {};
	let rank = 0;
	for (const [session, levels] of Object.entries(
		schoolProfile.academicConfig?.classLevels || {},
	)) {
		if (!levels || typeof levels !== 'object') continue;
		for (const [level, levelData] of Object.entries(levels)) {
			if (!levelData || typeof levelData !== 'object') continue;
			for (const cls of (levelData as any).classes ?? []) {
				classMeta[cls.classId] = {
					session,
					level,
					className: cls.name || cls.classId,
					rank: rank++,
				};
			}
		}
	}

	const sessionOrder = Object.keys(schoolProfile.academicConfig?.classLevels || {});
	const installmentOrder = (schoolProfile.financialConfig?.installments || []).map(
		(i) => i.id,
	);

	const getStudentClassId = (student: any): string => {
		const yearEntry = Array.isArray(student?.academicYears)
			? student.academicYears.find((entry: any) => sameYear(entry?.year, academicYear))
			: null;
		return yearEntry?.classId || student?.classId || '';
	};

	// ── Resolved fee bills (scholarships + student groups applied) ──────────
	const billRows: BillRow[] = [];
	const studentClassById: Record<string, string> = {};
	for (const student of students || []) {
		const studentId = String(student?.studentId || student?.username || '');
		if (!studentId) continue;
		const classId = getStudentClassId(student);
		studentClassById[studentId] = classId;
		if (!classId) continue;
		for (const bill of resolveStudentFees(student, schoolProfile, academicYear, classId)) {
			if (!bill.isRequired) continue;
			billRows.push({ studentId, classId, bill });
		}
	}

	// Payments are recorded against either the fee's display name or its id.
	const feeNameById = new Map<string, string>();
	const categoryByFeeName = new Map<string, string>();
	for (const { bill } of billRows) {
		if (bill.feeId && !feeNameById.has(bill.feeId)) feeNameById.set(bill.feeId, bill.feeName);
		if (bill.feeName && !categoryByFeeName.has(bill.feeName)) {
			categoryByFeeName.set(bill.feeName, bill.categoryName || 'Uncategorized');
		}
	}
	const paymentFeeName = (payment: PaymentLike) =>
		feeNameById.get(payment.feeType) || payment.feeType || 'Other';
	const paymentCategory = (payment: PaymentLike) =>
		categoryByFeeName.get(paymentFeeName(payment)) ||
		payment.category ||
		'Uncategorized';
	const paymentClassId = (payment: PaymentLike) =>
		payment.classId || studentClassById[payment.studentId] || 'unassigned';

	// ── Currencies in play, ordered by the school's configured order ────────
	const currencyCodes = new Set<string>();
	for (const { bill } of billRows) currencyCodes.add(bill.currency);
	for (const payment of payments || []) currencyCodes.add(payment.currency);

	const configuredCurrencies = schoolProfile.financialConfig?.currencies || [];
	const orderedCodes = [
		...configuredCurrencies.map((c) => c.code).filter((code) => currencyCodes.has(code)),
		...Array.from(currencyCodes).filter(
			(code) => !configuredCurrencies.some((c) => c.code === code),
		),
	];

	const currencies = orderedCodes.map((code) => {
		const config = configuredCurrencies.find((c) => c.code === code);
		const currencyBills = billRows.filter((row) => row.bill.currency === code);
		const currencyPayments = (payments || []).filter(
			(payment) => payment.currency === code,
		);

		// ── Expected side ────────────────────────────────────────────────────
		const feeRows = new Map<string, AmountRow>();
		const categoryRows = new Map<string, AmountRow>();
		const sessionRows = new Map<string, AmountRow>();
		const classRows = new Map<string, ClassRow>();
		const scholarshipRows = new Map<string, ScholarshipRow>();
		const studentTotals = new Map<
			string,
			{ expected: number; collected: number }
		>();
		const classStudents = new Map<string, Set<string>>();

		let gross = 0;
		let discount = 0;
		let expected = 0;

		// classId → categoryName → { expected, collected }
		const classCategoryTotals = new Map<
			string,
			Map<string, { expected: number; collected: number }>
		>();
		const addClassCategory = (
			classId: string,
			category: string,
			field: 'expected' | 'collected',
			amount: number,
		) => {
			let byCategory = classCategoryTotals.get(classId);
			if (!byCategory) {
				byCategory = new Map();
				classCategoryTotals.set(classId, byCategory);
			}
			const totals = byCategory.get(category) || { expected: 0, collected: 0 };
			totals[field] += amount;
			byCategory.set(category, totals);
		};

		const ensureClassRow = (classId: string): ClassRow => {
			let row = classRows.get(classId);
			if (!row) {
				const meta = classMeta[classId];
				row = {
					...makeRow(classId, meta?.className || (classId === 'unassigned' ? 'Unassigned' : classId)),
					classId,
					session: meta?.session || '—',
					level: meta?.level || '—',
					studentCount: 0,
					categories: [],
				};
				classRows.set(classId, row);
			}
			return row;
		};

		const ensure = (map: Map<string, AmountRow>, key: string, label: string) => {
			let row = map.get(key);
			if (!row) {
				row = makeRow(key, label);
				map.set(key, row);
			}
			return row;
		};

		for (const { studentId, classId, bill } of currencyBills) {
			gross += bill.amount;
			discount += bill.discount;
			expected += bill.effectiveAmount;

			const fee = ensure(feeRows, bill.feeName, bill.feeName);
			fee.gross += bill.amount;
			fee.discount += bill.discount;
			fee.expected += bill.effectiveAmount;

			const categoryName = bill.categoryName || 'Uncategorized';
			const category = ensure(categoryRows, categoryName, categoryName);
			category.gross += bill.amount;
			category.discount += bill.discount;
			category.expected += bill.effectiveAmount;

			const sessionName = bill.sessionName || classMeta[classId]?.session || '—';
			const session = ensure(sessionRows, sessionName, sessionName);
			session.gross += bill.amount;
			session.discount += bill.discount;
			session.expected += bill.effectiveAmount;

			const classRow = ensureClassRow(classId);
			classRow.gross += bill.amount;
			classRow.discount += bill.discount;
			classRow.expected += bill.effectiveAmount;
			addClassCategory(classId, bill.feeName, 'expected', bill.effectiveAmount);

			if (!classStudents.has(classId)) classStudents.set(classId, new Set());
			classStudents.get(classId)!.add(studentId);

			const totals = studentTotals.get(studentId) || { expected: 0, collected: 0 };
			totals.expected += bill.effectiveAmount;
			studentTotals.set(studentId, totals);

			if (bill.discount > EPSILON) {
				const label = bill.scholarshipNames?.length
					? bill.scholarshipNames.join(' + ')
					: 'Discount';
				const scholarship = scholarshipRows.get(label) || {
					key: label,
					label,
					awards: 0,
					discount: 0,
				};
				scholarship.awards += 1;
				scholarship.discount += bill.discount;
				scholarshipRows.set(label, scholarship);
			}
		}

		// ── Collected side ───────────────────────────────────────────────────
		const monthRows = new Map<string, MonthRow>();
		const activeDays = new Set<string>();

		let collected = 0;
		let largestPayment = 0;
		let firstPaymentDate = '';
		let lastPaymentDate = '';

		for (const payment of currencyPayments) {
			const amount = Number(payment.paymentAmount) || 0;
			collected += amount;
			if (amount > largestPayment) largestPayment = amount;

			const feeName = paymentFeeName(payment);
			ensure(feeRows, feeName, feeName).collected += amount;

			const categoryName = paymentCategory(payment);
			ensure(categoryRows, categoryName, categoryName).collected += amount;

			const classId = paymentClassId(payment);
			ensureClassRow(classId).collected += amount;
			addClassCategory(classId, feeName, 'collected', amount);

			const sessionName = classMeta[classId]?.session || '—';
			ensure(sessionRows, sessionName, sessionName).collected += amount;

			const totals = studentTotals.get(payment.studentId) || {
				expected: 0,
				collected: 0,
			};
			totals.collected += amount;
			studentTotals.set(payment.studentId, totals);

			const date = String(payment.paymentDate || '');
			if (date) {
				activeDays.add(date);
				if (!firstPaymentDate || date < firstPaymentDate) firstPaymentDate = date;
				if (!lastPaymentDate || date > lastPaymentDate) lastPaymentDate = date;
				const monthKey = date.slice(0, 7);
				const month = monthRows.get(monthKey) || {
					key: monthKey,
					label: monthLabel(monthKey),
					transactions: 0,
					amount: 0,
					cumulative: 0,
					share: 0,
				};
				month.transactions += 1;
				month.amount += amount;
				monthRows.set(monthKey, month);
			}

		}

		// ── Installment performance, grouped by session ──────────────────────
		interface RawBucket {
			key: string;
			label: string;
			expected: number;
			collected: number;
			categories: Map<string, { expected: number; collected: number }>;
		}
		const sessionBuckets = new Map<string, Map<string, RawBucket>>();

		const addInstallment = (
			sessionName: string,
			key: string,
			label: string,
			category: string,
			field: 'expected' | 'collected',
			amount: number,
		) => {
			let buckets = sessionBuckets.get(sessionName);
			if (!buckets) {
				buckets = new Map();
				sessionBuckets.set(sessionName, buckets);
			}
			let bucket = buckets.get(key);
			if (!bucket) {
				bucket = { key, label, expected: 0, collected: 0, categories: new Map() };
				buckets.set(key, bucket);
			}
			bucket[field] += amount;
			const totals = bucket.categories.get(category) || { expected: 0, collected: 0 };
			totals[field] += amount;
			bucket.categories.set(category, totals);
		};

		const paymentsByStudent = new Map<string, PaymentLike[]>();
		for (const payment of currencyPayments) {
			const list = paymentsByStudent.get(payment.studentId) || [];
			list.push(payment);
			paymentsByStudent.set(payment.studentId, list);
		}

		const consumedPaymentIds = new Set<string>();
		for (const { studentId, classId, bill } of currencyBills) {
			const sessionName =
				bill.sessionName || classMeta[classId]?.session || UNASSIGNED_SESSION;

			if (bill.installments.length === 0) {
				addInstallment(
					sessionName,
					IMMEDIATE_ID,
					IMMEDIATE_LABEL,
					bill.feeName,
					'expected',
					bill.effectiveAmount,
				);
			} else {
				for (const split of bill.installments) {
					addInstallment(
						sessionName,
						split.installmentId,
						split.label,
						bill.feeName,
						'expected',
						split.amount,
					);
				}
			}

			const feePayments = (paymentsByStudent.get(studentId) || []).filter(
				(payment) =>
					payment.feeType === bill.feeName || payment.feeType === bill.feeId,
			);
			for (const payment of feePayments) consumedPaymentIds.add(payment.id);

			if (bill.installments.length === 0) {
				addInstallment(
					sessionName,
					IMMEDIATE_ID,
					IMMEDIATE_LABEL,
					bill.feeName,
					'collected',
					feePayments.reduce(
						(total, payment) => total + (Number(payment.paymentAmount) || 0),
						0,
					),
				);
				continue;
			}
			const allocated = allocatePaymentsToInstallments(
				bill.installments,
				feePayments.map((payment) => ({ amount: Number(payment.paymentAmount) || 0 })),
			);
			for (const split of bill.installments) {
				const amount = allocated[split.installmentId] || 0;
				if (amount > 0) {
					addInstallment(
						sessionName,
						split.installmentId,
						split.label,
						bill.feeName,
						'collected',
						amount,
					);
				}
			}
		}
		// Legacy / unmatched payments land in the immediate bucket of the session
		// their class belongs to, so the installment view reconciles with total
		// collections without being counted once per session.
		for (const payment of currencyPayments) {
			if (consumedPaymentIds.has(payment.id)) continue;
			const sessionName =
				classMeta[paymentClassId(payment)]?.session || UNASSIGNED_SESSION;
			addInstallment(
				sessionName,
				IMMEDIATE_ID,
				IMMEDIATE_LABEL,
				paymentFeeName(payment),
				'collected',
				Number(payment.paymentAmount) || 0,
			);
		}

		// ── Finalize derived values ──────────────────────────────────────────
		const toCategoryRows = (
			totals: Map<string, { expected: number; collected: number }> | undefined,
		): CategoryRow[] =>
			Array.from(totals?.entries() || [])
				.map(([label, value]) => {
					const outstanding = Math.max(0, value.expected - value.collected);
					return {
						key: label,
						label,
						expected: value.expected,
						collected: value.collected,
						outstanding: outstanding < EPSILON ? 0 : outstanding,
						rate: percentOf(value.collected, value.expected),
					};
				})
				.sort((a, b) => b.expected - a.expected || b.collected - a.collected);

		for (const [classId, row] of classRows) {
			row.studentCount = classStudents.get(classId)?.size || 0;
			row.categories = toCategoryRows(classCategoryTotals.get(classId));
			finalizeRow(row);
		}

		const sortByExpected = (a: AmountRow, b: AmountRow) =>
			b.expected - a.expected || b.collected - a.collected;

		const byFee = Array.from(feeRows.values()).map(finalizeRow).sort(sortByExpected);
		const byCategory = Array.from(categoryRows.values())
			.map(finalizeRow)
			.sort(sortByExpected);
		const bySession = Array.from(sessionRows.values())
			.map(finalizeRow)
			.sort((a, b) => {
				const ai = sessionOrder.indexOf(a.key);
				const bi = sessionOrder.indexOf(b.key);
				if (ai !== -1 || bi !== -1) {
					return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
				}
				return sortByExpected(a, b);
			});
		const byClass = Array.from(classRows.values()).sort(
			(a, b) =>
				(classMeta[a.classId]?.rank ?? Number.MAX_SAFE_INTEGER) -
				(classMeta[b.classId]?.rank ?? Number.MAX_SAFE_INTEGER),
		);

		// Installments run in the school's configured due order, with anything
		// payable up front ahead of them.
		const byInstallmentOrder = (a: { key: string }, b: { key: string }) => {
			if (a.key === IMMEDIATE_ID) return -1;
			if (b.key === IMMEDIATE_ID) return 1;
			const ai = installmentOrder.indexOf(a.key);
			const bi = installmentOrder.indexOf(b.key);
			return (
				(ai === -1 ? Number.MAX_SAFE_INTEGER : ai) -
				(bi === -1 ? Number.MAX_SAFE_INTEGER : bi)
			);
		};

		const finalizeInstallment = (bucket: RawBucket): InstallmentBucket => {
			const outstanding = Math.max(0, bucket.expected - bucket.collected);
			return {
				key: bucket.key,
				label: bucket.label,
				expected: bucket.expected,
				collected: bucket.collected,
				outstanding: outstanding < EPSILON ? 0 : outstanding,
				rate: percentOf(bucket.collected, bucket.expected),
				categories: toCategoryRows(bucket.categories),
			};
		};

		const orderedSessionNames = [
			...sessionOrder.filter((name) => sessionBuckets.has(name)),
			...Array.from(sessionBuckets.keys()).filter(
				(name) => !sessionOrder.includes(name),
			),
		];
		const installmentsBySession: SessionInstallments[] = orderedSessionNames.map(
			(sessionName) => ({
				sessionName,
				installments: Array.from(sessionBuckets.get(sessionName)!.values())
					.map(finalizeInstallment)
					.sort(byInstallmentOrder),
			}),
		);

		// School-wide installment totals are the same buckets summed across sessions.
		const flatInstallments = new Map<string, InstallmentRow>();
		for (const session of installmentsBySession) {
			for (const bucket of session.installments) {
				const row = flatInstallments.get(bucket.key) || {
					key: bucket.key,
					label: bucket.label,
					expected: 0,
					collected: 0,
					outstanding: 0,
					rate: 0,
				};
				row.expected += bucket.expected;
				row.collected += bucket.collected;
				flatInstallments.set(bucket.key, row);
			}
		}
		const byInstallment = Array.from(flatInstallments.values())
			.map((row) => {
				row.outstanding = Math.max(0, row.expected - row.collected);
				if (row.outstanding < EPSILON) row.outstanding = 0;
				row.rate = percentOf(row.collected, row.expected);
				return row;
			})
			.sort(byInstallmentOrder);

		let running = 0;
		const monthly = Array.from(monthRows.values())
			.sort((a, b) => a.key.localeCompare(b.key))
			.map((row) => {
				running += row.amount;
				return {
					...row,
					cumulative: running,
					share: percentOf(row.amount, collected),
				};
			});

		const scholarships = Array.from(scholarshipRows.values()).sort(
			(a, b) => b.discount - a.discount,
		);

		let studentsFullyPaid = 0;
		let studentsPartiallyPaid = 0;
		let studentsUnpaid = 0;
		let studentsBilled = 0;
		for (const totals of studentTotals.values()) {
			if (totals.expected <= EPSILON) continue;
			studentsBilled += 1;
			if (totals.collected >= totals.expected - EPSILON) studentsFullyPaid += 1;
			else if (totals.collected > EPSILON) studentsPartiallyPaid += 1;
			else studentsUnpaid += 1;
		}

		const bestMonth = monthly.reduce<MonthRow | null>(
			(best, row) => (!best || row.amount > best.amount ? row : best),
			null,
		);

		const outstanding = Math.max(0, expected - collected);
		const summary: CurrencySummary = {
			studentsBilled,
			studentsFullyPaid,
			studentsPartiallyPaid,
			studentsUnpaid,
			gross,
			discount,
			expected,
			collected,
			outstanding: outstanding < EPSILON ? 0 : outstanding,
			rate: percentOf(collected, expected),
			transactions: currencyPayments.length,
			averagePayment: currencyPayments.length
				? collected / currencyPayments.length
				: 0,
			largestPayment,
			firstPaymentDate,
			lastPaymentDate,
			activeDays: activeDays.size,
			averagePerActiveDay: activeDays.size ? collected / activeDays.size : 0,
			bestMonthLabel: bestMonth?.label || '—',
			bestMonthAmount: bestMonth?.amount || 0,
		};

		return {
			code,
			label: config?.label || code,
			symbol: config?.symbol || '',
			summary,
			byFee,
			byCategory,
			bySession,
			byClass,
			byInstallment,
			installmentsBySession,
			monthly,
			scholarships,
		} satisfies CurrencyReport;
	});

	return {
		academicYear,
		generatedAt: new Date().toISOString(),
		schoolName: schoolProfile.identity?.name || 'School',
		studentsEnrolled: students?.length || 0,
		currencies,
	};
}
