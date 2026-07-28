import type {
	SchoolProfile,
	FeeGroup,
	StudentGroup,
	RuleCondition,
	FeeDefinition,
	PaymentPlan,
	PaymentCategory,
	ScheduledFee,
} from '@/types/schoolProfile';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';

export interface ResolvedFeeGroup {
	sessionName: string;
	feeGroup: FeeGroup;
}

export interface ResolvedScheduledFee {
	scheduledFee: ScheduledFee;
	feeDefinition: FeeDefinition | undefined;
	categoryName: string;
	installmentLabel: string | null;
	paymentPlan: PaymentPlan | undefined;
}

const getFieldValue = (obj: any, path: string): any =>
	path.split('.').reduce((current, key) => current?.[key], obj);

const evaluateCondition = (student: any, condition: RuleCondition): boolean => {
	const fieldValue = getFieldValue(student, condition.field);
	const { value, operator } = condition;
	switch (operator) {
		case 'equals': return fieldValue === value;
		case 'notEquals': return fieldValue !== value;
		case 'contains': return String(fieldValue).includes(String(value));
		case 'notContains': return !String(fieldValue).includes(String(value));
		case 'greaterThan': return Number(fieldValue) > Number(value);
		case 'lessThan': return Number(fieldValue) < Number(value);
		case 'greaterThanOrEquals': return Number(fieldValue) >= Number(value);
		case 'lessThanOrEquals': return Number(fieldValue) <= Number(value);
		case 'in': return Array.isArray(value) && value.includes(fieldValue);
		case 'notIn': return Array.isArray(value) && !value.includes(fieldValue);
		default: return false;
	}
};

export const resolveStudentGroupIds = (
	student: any,
	studentGroups: readonly StudentGroup[],
): string[] =>
	studentGroups
		.filter((g) => g.isActive)
		.filter((g) => g.conditions.every((c) => evaluateCondition(student, c)))
		.map((g) => g.id);

export const resolveStudentFeeGroup = (
	classId: string | undefined,
	schoolProfile: SchoolProfile | null | undefined,
	academicYear?: string,
): ResolvedFeeGroup | null => {
	if (!classId || !schoolProfile?.academicConfig?.classLevels || !schoolProfile?.financialConfig?.feeSchedules) {
		return null;
	}

	const year =
		academicYear || getCurrentAcademicYearFromSchoolProfile(schoolProfile);

	let sessionName = '';

	for (const [sName, session] of Object.entries(schoolProfile.academicConfig.classLevels)) {
		if (!session || typeof session !== 'object') continue;
		for (const level of Object.values(session)) {
			if (!level || typeof level !== 'object') continue;
			const classes = (level as any).classes || [];
			const match = classes.find((c: any) => c.classId === classId);
			if (match) {
				sessionName = sName;
				break;
			}
		}
		if (sessionName) break;
	}

	if (!sessionName) return null;

	const schedule = schoolProfile.financialConfig.feeSchedules.find(
		(s) => s.academicYear === year,
	);
	if (!schedule) return null;

	const sessionFeeSchedule = schedule.sessionFeeSchedules.find(
		(sfs) => sfs.sessionName === sessionName,
	);
	if (!sessionFeeSchedule) return null;

	const feeGroup = sessionFeeSchedule.feeGroups.find(
		(fg) => fg.appliesToClassIds.includes(classId),
	);
	if (!feeGroup) return null;

	return { sessionName, feeGroup };
};

export const resolveStudentFeeGroups = (
	classId: string | undefined,
	schoolProfile: SchoolProfile | null | undefined,
	academicYear?: string,
): ResolvedFeeGroup[] => {
	if (!classId || !schoolProfile?.academicConfig?.classLevels || !schoolProfile?.financialConfig?.feeSchedules) {
		return [];
	}

	const year =
		academicYear || getCurrentAcademicYearFromSchoolProfile(schoolProfile);

	const schedule = schoolProfile.financialConfig.feeSchedules.find(
		(s) => s.academicYear === year,
	);
	if (!schedule) return [];

	const matched: ResolvedFeeGroup[] = [];

	for (const [sessionName, session] of Object.entries(schoolProfile.academicConfig.classLevels)) {
		if (!session || typeof session !== 'object') continue;
		let classInSession = false;
		for (const level of Object.values(session)) {
			if (!level || typeof level !== 'object') continue;
			const classes = (level as any).classes || [];
			if (classes.some((c: any) => c.classId === classId)) {
				classInSession = true;
				break;
			}
		}
		if (!classInSession) continue;

		const sessionFeeSchedule = schedule.sessionFeeSchedules.find(
			(sfs) => sfs.sessionName === sessionName,
		);
		if (!sessionFeeSchedule) continue;

		for (const feeGroup of sessionFeeSchedule.feeGroups) {
			if (feeGroup.appliesToClassIds.includes(classId)) {
				matched.push({ sessionName, feeGroup });
			}
		}
	}

	return matched;
};

export const resolveResolvedScheduledFees = (
	feeGroup: FeeGroup,
	schoolProfile: SchoolProfile,
	studentGroupIds?: string[],
): ResolvedScheduledFee[] => {
	const feeDefinitions = schoolProfile.financialConfig?.feeDefinitions ?? [];
	const paymentPlans = schoolProfile.financialConfig?.paymentPlans ?? [];
	const paymentCategories = schoolProfile.financialConfig?.paymentCategories ?? [];
	const studentGroups = schoolProfile.financialConfig?.studentGroups ?? [];
	const hasAnyActiveGroups = studentGroups.some((g) => g.isActive);
	const plan = paymentPlans.find((p) => p.id === feeGroup.paymentPlanId);

	return feeGroup.scheduledFees
		.filter((sf) => {
			if (!hasAnyActiveGroups) return true;
			if (!sf.applicableStudentGroupIds || sf.applicableStudentGroupIds.length === 0) return true;
			if (!studentGroupIds || studentGroupIds.length === 0) return false;
			return sf.applicableStudentGroupIds.some((id) => studentGroupIds.includes(id));
		})
		.map((sf) => {
			const feeDef = feeDefinitions.find((fd) => fd.id === sf.feeId);
			const cat = paymentCategories.find((c) => c.id === feeDef?.category);
			const installment = sf.dueInstallmentId && plan
				? plan.installments.find((i) => i.id === sf.dueInstallmentId)
				: null;
			return {
				scheduledFee: sf,
				feeDefinition: feeDef,
				categoryName: cat?.name || feeDef?.category || 'Other',
				installmentLabel: installment?.label ?? null,
				paymentPlan: plan,
			};
		});
};
