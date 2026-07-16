import type {
	SchoolProfile,
	FeeGroup,
} from '@/types/schoolProfile';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';

interface ResolvedFeeGroup {
	sessionName: string;
	feeGroupKey: string;
	feeGroup: FeeGroup;
}

export const resolveStudentFeeGroup = (
	classId: string | undefined,
	schoolProfile: SchoolProfile | null | undefined,
	academicYear?: string,
): ResolvedFeeGroup | null => {
	if (!classId || !schoolProfile?.classLevels || !schoolProfile?.feeSchedules) {
		return null;
	}

	const year =
		academicYear || getCurrentAcademicYearFromSchoolProfile(schoolProfile);

	// Walk classLevels to find which session this classId belongs to
	let sessionName = '';
	let feeGroupKey = '';

	for (const [sName, session] of Object.entries(schoolProfile.classLevels)) {
		if (!session || typeof session !== 'object') continue;
		for (const level of Object.values(session)) {
			if (!level || typeof level !== 'object') continue;
			const classes = (level as any).classes || [];
			const match = classes.find((c: any) => c.classId === classId);
			if (match) {
				sessionName = sName;
				feeGroupKey = match.feeGroup;
				break;
			}
		}
		if (sessionName) break;
	}

	if (!sessionName || !feeGroupKey) return null;

	const schedule = schoolProfile.feeSchedules[year];
	if (!schedule) return null;

	const sessionGroups = (schedule as any)[sessionName];
	if (!sessionGroups || typeof sessionGroups !== 'object') return null;

	const feeGroup = sessionGroups[feeGroupKey];
	if (!feeGroup || typeof feeGroup !== 'object') return null;

	return { sessionName, feeGroupKey, feeGroup: feeGroup as FeeGroup };
};
