import type {
	SchoolProfile,
	FeeGroup,
} from '@/types/schoolProfile';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';

interface ResolvedFeeGroup {
	sessionName: string;
	feeGroup: FeeGroup;
}

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

	// Walk classLevels to find which session this classId belongs to
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

	// Find the fee schedule for this academic year
	const schedule = schoolProfile.financialConfig.feeSchedules.find(
		(s) => s.academicYear === year,
	);
	if (!schedule) return null;

	// Find the session fee schedule matching this session
	const sessionFeeSchedule = schedule.sessionFeeSchedules.find(
		(sfs) => sfs.sessionName === sessionName,
	);
	if (!sessionFeeSchedule) return null;

	// Find the fee group that includes this classId
	const feeGroup = sessionFeeSchedule.feeGroups.find(
		(fg) => fg.appliesToClassIds.includes(classId),
	);
	if (!feeGroup) return null;

	return { sessionName, feeGroup };
};
