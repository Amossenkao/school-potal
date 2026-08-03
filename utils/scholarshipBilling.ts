import type { SchoolProfile, Scholarship } from '@/types/schoolProfile';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';

export interface ScholarshipFeeEntry {
	feeName: string;
	categoryId: string;
	categoryName: string;
	amount: number;
	currency: string;
	/** Set when the fee is the auto-generated "{name} Payment" fee for a scholarship. */
	scholarshipId?: string;
}

export interface ScholarshipAdjustment {
	effectiveAmount: number;
	discount: number;
	scholarshipIds: string[];
	scholarshipNames: string[];
}

export type ScholarshipAdjustedFee = ScholarshipFeeEntry &
	ScholarshipAdjustment;

export const scholarshipPaymentFeeName = (scholarshipName: string): string =>
	`${String(scholarshipName || '').trim()} Payment`;

const round2 = (value: number): number => Math.round(value * 100) / 100;

const normFeeName = (name: string): string => String(name || '').trim().toLowerCase();

/**
 * Resolves a student's assigned scholarships (stored as scholarship ids OR
 * legacy names) against the fee schedule for the given academic year.
 */
export const resolveStudentScholarshipDefinitions = (
	student: any,
	schoolProfile: SchoolProfile | null | undefined,
	academicYear?: string,
): Scholarship[] => {
	if (!student || !schoolProfile?.financialConfig?.feeSchedules) return [];
	const year =
		academicYear || getCurrentAcademicYearFromSchoolProfile(schoolProfile);
	const schedule = schoolProfile.financialConfig.feeSchedules.find(
		(s) => s.academicYear === year,
	);
	if (!schedule) return [];
	const assigned = Array.isArray(student.scholarships)
		? student.scholarships
		: [];
	if (assigned.length === 0) return [];
	return schedule.scholarships.filter((scholarship) =>
		assigned.some(
			(key: string) =>
				key === scholarship.id || key === scholarship.name,
		),
	);
};

/**
 * Applies scholarships to a list of assessed fees, producing the amount the
 * student actually owes (`effectiveAmount`) per fee.
 *
 * Semantics:
 * - percentage     → each covered fee is reduced by `amount` (a decimal rate, e.g. 0.10 = 10%).
 * - fixedDeduction → the covered fees' combined total is reduced by the fixed `amount`.
 * - fixedPayment   → the covered fees are fully settled (effectiveAmount = 0) and the
 *                    student owes a single "{name} Payment" fee equal to the scholarship
 *                    amount instead. The payment fee is only owed by scholarship
 *                    beneficiaries; `allScholarships` (all defined for the year) is used
 *                    to drop those payment fees from non-beneficiaries' lists.
 *
 * A `fixedDeduction`/`fixedPayment` scholarship only affects fees that share its
 * currency (fixedPayment also settles covered items regardless of currency).
 * `appliesTo` restricts which categories it covers (empty = all).
 * Multiple scholarships are applied sequentially on the remaining effective total.
 */
export const applyScholarshipsToFees = <T extends ScholarshipFeeEntry>(
	fees: readonly T[],
	scholarships: readonly Scholarship[],
	allScholarships?: readonly Scholarship[],
): Array<T & ScholarshipAdjustment> => {
	const definedFixedPayments = (allScholarships ?? scholarships).filter(
		(s) => s.scholarshipType === 'fixedPayment',
	);
	const paymentFeeKeys = new Set(
		definedFixedPayments.map((s) => normFeeName(scholarshipPaymentFeeName(s.name))),
	);
	const isPaymentFee = (fee: T): boolean =>
		Boolean(
			fee.scholarshipId ||
				paymentFeeKeys.has(normFeeName(fee.feeName)),
		);

	const assignedIds = new Set(scholarships.map((s) => s.id));
	const assignedNames = new Set(scholarships.map((s) => s.name));

	// Drop "{name} Payment" fees belonging to fixedPayment scholarships the
	// student does NOT have.
	const kept = fees.filter((fee) => {
		if (!fee.scholarshipId) {
			const key = normFeeName(fee.feeName);
			for (const s of definedFixedPayments) {
				if (key !== normFeeName(scholarshipPaymentFeeName(s.name))) continue;
				return assignedIds.has(s.id) || assignedNames.has(s.name);
			}
			return true;
		}
		return (
			assignedIds.has(fee.scholarshipId) ||
			assignedNames.has(fee.scholarshipId)
		);
	});

	const adjusted: Array<T & ScholarshipAdjustment> = kept.map((fee) => ({
		...fee,
		effectiveAmount: fee.amount,
		discount: 0,
		scholarshipIds: [],
		scholarshipNames: [],
	}));

	for (const scholarship of scholarships) {
		const isFixedPayment = scholarship.scholarshipType === 'fixedPayment';

		const covered = adjusted.filter(
			(fee) =>
				!isPaymentFee(fee) &&
				(!scholarship.appliesTo ||
					scholarship.appliesTo.length === 0 ||
					scholarship.appliesTo.includes(fee.categoryId)) &&
				(scholarship.scholarshipType === 'percentage' ||
					scholarship.scholarshipType === 'fixedPayment' ||
					!scholarship.currency ||
					fee.currency === scholarship.currency),
		);

		if (isFixedPayment) {
			for (const fee of covered) {
				fee.effectiveAmount = 0;
				fee.scholarshipIds.push(scholarship.id);
				fee.scholarshipNames.push(scholarship.name);
			}
			const paymentFee = adjusted.find((fee) => {
				if (fee.scholarshipId) return fee.scholarshipId === scholarship.id;
				return (
					normFeeName(fee.feeName) ===
					normFeeName(scholarshipPaymentFeeName(scholarship.name))
				);
			});
			if (paymentFee) {
				paymentFee.effectiveAmount = Number(scholarship.amount) || 0;
				paymentFee.scholarshipIds.push(scholarship.id);
				paymentFee.scholarshipNames.push(scholarship.name);
			}
			continue;
		}

		if (covered.length === 0) continue;

		const currentSum = covered.reduce(
			(sum, fee) => sum + fee.effectiveAmount,
			0,
		);
		if (currentSum <= 0) continue;

		const ratio =
			scholarship.scholarshipType === 'percentage'
				? Math.max(0, 1 - (Number(scholarship.amount) || 0))
				: Math.max(
						0,
						(currentSum - (Number(scholarship.amount) || 0)) / currentSum,
					);

		for (const fee of covered) {
			fee.effectiveAmount = round2(fee.effectiveAmount * ratio);
			fee.scholarshipIds.push(scholarship.id);
			fee.scholarshipNames.push(scholarship.name);
		}
	}

	for (const fee of adjusted) {
		fee.discount = round2(fee.amount - fee.effectiveAmount);
	}
	return adjusted;
};
