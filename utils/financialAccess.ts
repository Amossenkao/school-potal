import type { SchoolProfile } from '@/types/schoolProfile';

/**
 * Server-side authorization for money movement.
 *
 * Role alone is not enough: recording a payment rewrites a student's balance
 * and mints a receipt, so an administrator must actually hold the
 * `record_payments` permission, and a family can only pay when the school has
 * switched online payment on.
 *
 * These are the same rules the UI gate uses (utils/componentsMap.ts), stated
 * independently here so the API cannot be bypassed by calling it directly.
 */

const featureEnabled = (
	schoolProfile: SchoolProfile | null | undefined,
	feature: string,
): boolean =>
	Array.isArray(schoolProfile?.featureConfig?.enabledFeatures) &&
	(schoolProfile.featureConfig.enabledFeatures as string[]).includes(feature);

/**
 * Features granted to a role. Parents fall back to the student list when they
 * have no list of their own, matching `getRoleFeatureAccess` in componentsMap.
 */
const roleFeatures = (
	schoolProfile: SchoolProfile | null | undefined,
	role: string,
): string[] => {
	const access = schoolProfile?.featureConfig?.roleFeatureAccess as
		| Record<string, unknown>
		| undefined;
	if (role === 'parent') {
		const own = access?.parent;
		if (Array.isArray(own) && own.length > 0) return own as string[];
		return Array.isArray(access?.student) ? (access.student as string[]) : [];
	}
	const list = access?.[role];
	return Array.isArray(list) ? (list as string[]) : [];
};

/**
 * May record, edit and void payments on behalf of students.
 *
 * Deliberately strict: only an administrator holding `record_payments`. The
 * `isTeacher` escape hatch in `hasFeatureAccess` is not honoured here — an
 * administrator who also teaches does not thereby gain the till.
 */
export function canAdministerPayments(
	schoolProfile: SchoolProfile | null | undefined,
	user: any,
): boolean {
	if (user?.role !== 'administrator') return false;
	if (!featureEnabled(schoolProfile, 'record_payments')) return false;
	const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
	return permissions.includes('record_payments');
}

/**
 * May pay their own (or their child's) fees. Requires the school to have
 * online payment switched on AND the role to hold the fee-payment feature.
 */
export function canPayOwnFees(
	schoolProfile: SchoolProfile | null | undefined,
	user: any,
): boolean {
	const role = user?.role;
	if (role !== 'student' && role !== 'parent') return false;
	if (!featureEnabled(schoolProfile, 'online_payment')) return false;
	if (!featureEnabled(schoolProfile, 'fee_payment')) return false;
	return roleFeatures(schoolProfile, role).includes('fee_payment');
}
