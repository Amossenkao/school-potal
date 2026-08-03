import type { SchoolProfile, Scholarship } from '@/types/schoolProfile';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';

export interface ScholarshipFeeEntry {
	feeName: string;
	categoryId: string;
	categoryName: string;
	amount: number;
	currency: string;
}

export interface ScholarshipAdjustment {
	effectiveAmount: number;
	discount: number;
	scholarshipIds: string[];
	scholarshipNames: string[];
}

export type ScholarshipAdjustedFee = ScholarshipFeeEntry &
	ScholarshipAdjustment;

const round2 = (value: number): number => Math.round(value * 100) / 100;

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
 * - fixedPayment   → the covered fees' combined total is capped at the fixed `amount`.
 *
 * A `fixedDeduction`/`fixedPayment` scholarship only affects fees that share its
 * currency. `appliesTo` restricts which categories it covers (empty = all).
 * Multiple scholarships are applied sequentially on the remaining effective total.
 */
export const applyScholarshipsToFees = <T extends ScholarshipFeeEntry>(
	fees: readonly T[],
	scholarships: readonly Scholarship[],
): Array<T & ScholarshipAdjustment> => {
	const adjusted: Array<T & ScholarshipAdjustment> = fees.map((fee) => ({
		...fee,
		effectiveAmount: fee.amount,
		discount: 0,
		scholarshipIds: [],
		scholarshipNames: [],
	}));

	for (const scholarship of scholarships) {
		const covered = adjusted.filter(
			(fee) =>
				(!scholarship.appliesTo ||
					scholarship.appliesTo.length === 0 ||
					scholarship.appliesTo.includes(fee.categoryId)) &&
				(scholarship.scholarshipType === 'percentage' ||
					!scholarship.currency ||
					fee.currency === scholarship.currency),
		);
		if (covered.length === 0) continue;

		const currentSum = covered.reduce(
			(sum, fee) => sum + fee.effectiveAmount,
			0,
		);
		if (currentSum <= 0) continue;

		let ratio: number;
		switch (scholarship.scholarshipType) {
			case 'percentage':
				ratio = Math.max(0, 1 - (Number(scholarship.amount) || 0));
				break;
			case 'fixedDeduction':
				ratio = Math.max(
					0,
					(currentSum - (Number(scholarship.amount) || 0)) / currentSum,
				);
				break;
			case 'fixedPayment':
				ratio = Math.min(1, (Number(scholarship.amount) || 0) / currentSum);
				break;
		}

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
