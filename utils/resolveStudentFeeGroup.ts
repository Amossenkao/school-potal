import type {
	SchoolProfile,
	FeeGroup,
	StudentGroup,
	RuleCondition,
	FeeDefinition,
	Installment,
	FeeInstallment,
	PaymentCategory,
	ScheduledFee,
	Money,
} from '@/types/schoolProfile';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';

export interface ResolvedFeeGroup {
	sessionName: string;
	feeGroup: FeeGroup;
}

export interface ResolvedInstallment {
	installmentId: string;
	label: string;
	percentage?: number;
	fixedAmount?: Money;
}

export interface ResolvedScheduledFee {
	scheduledFee: ScheduledFee;
	feeDefinition: FeeDefinition | undefined;
	categoryName: string;
	// Per-fee split entries with labels resolved from the global installment catalog.
	// Empty array = fee is due immediately (full amount).
	installments: ResolvedInstallment[];
	// The school-wide installment catalog (ordered by due order).
	installmentCatalog: readonly Installment[];
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
	const paymentCategories = schoolProfile.financialConfig?.paymentCategories ?? [];
	const studentGroups = schoolProfile.financialConfig?.studentGroups ?? [];
	const installmentCatalog = schoolProfile.financialConfig?.installments ?? [];
	const hasAnyActiveGroups = studentGroups.some((g) => g.isActive);

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
			const installments = (sf.installments ?? []).map((fi) => {
				const inst = installmentCatalog.find((i) => i.id === fi.installmentId);
				return {
					installmentId: fi.installmentId,
					label: inst?.label || fi.installmentId,
					percentage: fi.percentage,
					fixedAmount: fi.fixedAmount,
				};
			});
			return {
				scheduledFee: sf,
				feeDefinition: feeDef,
				categoryName: cat?.name || feeDef?.category || 'Other',
				installments,
				installmentCatalog,
			};
		});
};

export interface InstallmentAmount {
	installmentId: string;
	label: string;
	amount: number;
}

// Computes how much of a fee's (possibly scholarship-reduced) effective amount is
// due at each installment. Percentage entries scale with the effective amount;
// fixed-amount entries are absolute but are scaled down proportionally if the
// implied total would exceed the effective amount.
export const resolveFeeInstallmentAmounts = (
	fee: Pick<ScheduledFee, 'installments' | 'amount'>,
	installments: readonly Installment[],
	effectiveAmount: number,
): InstallmentAmount[] => {
	const splits = (fee.installments ?? []).map((fi) => {
		const inst = installments.find((i) => i.id === fi.installmentId);
		const label = inst?.label || fi.installmentId;
		if (fi.fixedAmount?.amount != null) {
			return {
				installmentId: fi.installmentId,
				label,
				amount: Number(fi.fixedAmount.amount) || 0,
				isFixed: true,
			};
		}
		return {
			installmentId: fi.installmentId,
			label,
			amount: (Number(fi.percentage) || 0) * effectiveAmount,
			isFixed: false,
		};
	});

	const fixedSum = splits.reduce((a, s) => a + (s.isFixed ? s.amount : 0), 0);
	const pctSum = splits.reduce((a, s) => a + (s.isFixed ? 0 : s.amount), 0);
	if (fixedSum + pctSum > effectiveAmount + 0.000001 && fixedSum > 0) {
		const scale = Math.max(0, effectiveAmount - pctSum) / fixedSum;
		for (const s of splits) {
			if (s.isFixed) s.amount = s.amount * scale;
		}
	}

	return splits.map(({ installmentId, label, amount }) => ({
		installmentId,
		label,
		amount,
	}));
};

// Greedily allocates a student's payments for a fee across its installments in
// order: each installment's amount is satisfied before overflow rolls into the
// next. Returns collected amount per installmentId.
export const allocatePaymentsToInstallments = (
	installmentAmounts: InstallmentAmount[],
	payments: { amount: number }[],
): Record<string, number> => {
	const collected: Record<string, number> = {};
	let pool = payments.reduce((a, p) => a + (Number(p.amount) || 0), 0);
	for (const split of installmentAmounts) {
		const take = Math.min(split.amount, Math.max(0, pool));
		collected[split.installmentId] = take;
		pool -= take;
		if (pool <= 0) break;
	}
	for (const split of installmentAmounts) {
		if (collected[split.installmentId] === undefined) {
			collected[split.installmentId] = 0;
		}
	}
	return collected;
};
