import type { SchoolProfile, Installment, FeeInstallment } from '@/types/schoolProfile';
import {
	resolveStudentFeeGroups,
	resolveStudentGroupIds,
	resolveResolvedScheduledFees,
	resolveFeeInstallmentAmounts,
} from '@/utils/resolveStudentFeeGroup';
import {
	applyScholarshipsToFees,
	resolveStudentScholarshipDefinitions,
	type ScholarshipFeeEntry,
} from '@/utils/scholarshipBilling';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';

export interface StudentFeeBill {
	feeKey: string;
	sessionName: string;
	groupName: string;
	feeId: string;
	feeName: string;
	categoryId: string;
	categoryName: string;
	amount: number;
	currency: string;
	isRequired: boolean;
	// Per-fee split entries resolved against the scholarship-adjusted effective amount.
	// Empty array = the (effective) fee is due immediately in full.
	installments: { installmentId: string; label: string; amount: number }[];
	scholarshipId?: string;
	effectiveAmount: number;
	discount: number;
	scholarshipIds: string[];
	scholarshipNames: string[];
}

interface FeeEntry extends ScholarshipFeeEntry {
	feeKey: string;
	feeId: string;
	groupName: string;
	isRequired: boolean;
	sessionName: string;
	installments: readonly FeeInstallment[];
	installmentCatalog: readonly Installment[];
}

/**
 * Resolves a student's assessed fees exactly the way the student-facing
 * FinancialProfile / PayFees pages do: session-correct fee groups, student
 * group eligibility, then scholarships applied on top, with installment splits
 * scaled against the resulting (effective) amount a student actually owes.
 *
 * - `classId` defaults to `student.classId`; pass it explicitly when the class
 *   comes from a per-academic-year enrolment record (e.g. the financial overview).
 * - Only the student's own session is considered, so school-wide aggregations
 *   cannot double count cross-session fee groups (e.g. the "Scholarships" group
 *   that applies to every class).
 */
export const resolveStudentFees = (
	student: any,
	schoolProfile: SchoolProfile | null | undefined,
	academicYear?: string,
	classId?: string,
): StudentFeeBill[] => {
	if (!student || !schoolProfile?.financialConfig) return [];
	const year =
		academicYear || getCurrentAcademicYearFromSchoolProfile(schoolProfile) || '';
	const feeSchedule = schoolProfile.financialConfig.feeSchedules.find(
		(s) => s.academicYear.replace(/\//g, '-') === year.replace(/\//g, '-'),
	);
	if (!feeSchedule) return [];

	const studentGroups = schoolProfile.financialConfig.studentGroups ?? [];
	const groupIds = resolveStudentGroupIds(student, studentGroups);
	const cid = classId || student.classId || '';
	const feeGroups = resolveStudentFeeGroups(cid, schoolProfile, year);

	const entries: FeeEntry[] = [];
	let feeIdx = 0;
	for (const { sessionName, feeGroup } of feeGroups) {
		const rsf = resolveResolvedScheduledFees(feeGroup, schoolProfile, groupIds);
		for (const rf of rsf) {
			entries.push({
				feeKey: `${feeGroup.id}-${rf.scheduledFee.feeId}-${feeIdx}`,
				feeId: rf.scheduledFee.feeId,
				feeName: rf.feeDefinition?.name || rf.scheduledFee.feeId,
				categoryId: rf.feeDefinition?.category || '',
				categoryName: rf.categoryName,
				amount: rf.scheduledFee.amount.amount,
				currency: rf.scheduledFee.amount.currency,
				groupName: feeGroup.name,
				isRequired: rf.scheduledFee.isRequired,
				sessionName,
				scholarshipId: (rf.scheduledFee as any).scholarshipId || undefined,
				installments: rf.scheduledFee.installments,
				installmentCatalog: rf.installmentCatalog,
			});
			feeIdx++;
		}
	}

	const scholarships = resolveStudentScholarshipDefinitions(
		student,
		schoolProfile,
		year,
	);
	const adjusted = applyScholarshipsToFees(
		entries,
		scholarships,
		feeSchedule.scholarships ?? [],
	);

	return adjusted.map((fee) => ({
		feeKey: fee.feeKey,
		sessionName: fee.sessionName,
		groupName: fee.groupName,
		feeId: fee.feeId,
		feeName: fee.feeName,
		categoryId: fee.categoryId,
		categoryName: fee.categoryName,
		amount: fee.amount,
		currency: fee.currency,
		isRequired: fee.isRequired,
		installments: resolveFeeInstallmentAmounts(
			{
				installments: fee.installments,
				amount: { amount: fee.amount, currency: fee.currency },
			},
			fee.installmentCatalog,
			fee.effectiveAmount,
		),
		scholarshipId: fee.scholarshipId,
		effectiveAmount: fee.effectiveAmount,
		discount: fee.discount,
		scholarshipIds: fee.scholarshipIds,
		scholarshipNames: fee.scholarshipNames,
	}));
};
