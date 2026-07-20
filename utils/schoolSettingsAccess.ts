import type {
	SchoolProfile,
} from '@/types/schoolProfile';
import { getScopedAcademicYearValue } from '@/utils/academicYear';

// Assuming SchoolProfile type definition exists in your project
export const getStudentAllowedAccess = (student: any, schoolProfile: SchoolProfile) => {
  const allowedYearsConfig = schoolProfile?.settings?.studentSettings?.reportAccessByYear || {};
  
  if (!student.academicYears || !Array.isArray(student.academicYears)) {
    return [];
  }

  return student.academicYears
    .filter((year: any) => allowedYearsConfig[year.year]?.enabled)
    .map((year: any) => ({
      academicYear: year.year,
      ...allowedYearsConfig[year.year]
    }));
};

export const getTeacherAllowedAccess = (teacher: any, schoolProfile: any) => {
  const permissionsConfig = schoolProfile?.settings?.teacherSettings?.permissionsByYear || {};

  if (!teacher.subjects || !Array.isArray(teacher.subjects)) {
    return [];
  }

  return teacher.subjects
		.filter((subject: any) => permissionsConfig[subject.year]?.enabled)
		.map((subject: any) => ({
			academicYear: subject.year,
			...permissionsConfig[subject.year],
		}));
};

export function getStudentReportAccessForYear(
	schoolProfile: Pick<SchoolProfile, 'settings'> | null | undefined,
	academicYear: string,
) {
	const reportAccess =
		schoolProfile?.settings?.studentSettings?.reportAccessByYear;
	const { value } = getScopedAcademicYearValue(reportAccess, academicYear);
	return value;
}

export function isYearlyReportAccessAllowed(
	schoolProfile: Pick<SchoolProfile, 'settings'> | null | undefined,
	academicYear: string,
): boolean {
	const access = getStudentReportAccessForYear(schoolProfile, academicYear);
	if (!access?.enabled) return false;
	return access.yearlyReportAccess;
}

export function isPeriodReportAccessAllowed(
	schoolProfile: Pick<SchoolProfile, 'settings'> | null | undefined,
	academicYear: string,
	period: string,
): boolean {
	const access = getStudentReportAccessForYear(schoolProfile, academicYear);
	if (!access?.enabled) return false;
	return (access.periods as string[]).includes(period);
}

export function isSemesterReportAccessAllowed(
	schoolProfile: Pick<SchoolProfile, 'settings'> | null | undefined,
	academicYear: string,
	semester: string,
): boolean {
	const access = getStudentReportAccessForYear(schoolProfile, academicYear);
	if (!access?.enabled) return false;
	return (access.semesters as string[]).includes(semester);
}




// ---------------------------------------------------------------------------
// Teacher settings helpers  (permissionsByYear)
// ---------------------------------------------------------------------------

export function getTeacherPermissionsForYear(
	schoolProfile: Pick<SchoolProfile, 'settings'> | null | undefined,
	academicYear: string,
) {
	const permissionsByYear =
		schoolProfile?.settings?.teacherSettings?.permissionsByYear;
	const { value } = getScopedAcademicYearValue(permissionsByYear, academicYear);
	return value;
}

export function isGradeSubmissionAllowedForYear(
	schoolProfile: Pick<SchoolProfile, 'settings'> | null | undefined,
	academicYear: string,
	period: string,
): boolean {
	const perms = getTeacherPermissionsForYear(schoolProfile, academicYear);
	if (!perms?.enabled || !perms.gradeSubmission?.enabled) return false;
	return (perms.gradeSubmission.periods as string[]).includes(period);
}

export function isGradeChangeRequestAllowedForYear(
	schoolProfile: Pick<SchoolProfile, 'settings'> | null | undefined,
	academicYear: string,
	period: string,
): boolean {
	const perms = getTeacherPermissionsForYear(schoolProfile, academicYear);
	if (!perms?.enabled || !perms.gradeChangeRequest?.enabled) return false;
	return (perms.gradeChangeRequest.periods as string[]).includes(period);
}

export function getAllowedGradeSubmissionAcademicYears(
	schoolProfile: Pick<SchoolProfile, 'settings'> | null | undefined,
): string[] {
	const permissionsByYear =
		schoolProfile?.settings?.teacherSettings?.permissionsByYear;
	if (!permissionsByYear) return [];
	return Object.keys(permissionsByYear).filter(
		(year) =>
			permissionsByYear[year]?.enabled &&
			permissionsByYear[year]?.gradeSubmission?.enabled,
	);
}

export function getAllowedGradeSubmissionPeriods(
	schoolProfile: Pick<SchoolProfile, 'settings'> | null | undefined,
	academicYear: string,
): string[] {
	const perms = getTeacherPermissionsForYear(schoolProfile, academicYear);
	if (!perms?.enabled || !perms.gradeSubmission?.enabled) return [];
	return perms.gradeSubmission.periods as string[];
}

export function getAllowedViewGradeSubmissionsAcademicYears(
	schoolProfile: Pick<SchoolProfile, 'settings'> | null | undefined,
): string[] {
	const permissionsByYear =
		schoolProfile?.settings?.teacherSettings?.permissionsByYear;
	if (!permissionsByYear) return [];
	return Object.keys(permissionsByYear).filter(
		(year) =>
			permissionsByYear[year]?.enabled &&
			permissionsByYear[year]?.viewGradeSubmissions?.enabled,
	);
}

export function getAllowedGradeChangeRequestAcademicYears(
	schoolProfile: Pick<SchoolProfile, 'settings'> | null | undefined,
): string[] {
	const permissionsByYear =
		schoolProfile?.settings?.teacherSettings?.permissionsByYear;
	if (!permissionsByYear) return [];
	return Object.keys(permissionsByYear).filter(
		(year) =>
			permissionsByYear[year]?.enabled &&
			permissionsByYear[year]?.gradeChangeRequest?.enabled,
	);
}

export function getAllowedGradeChangeRequestPeriods(
	schoolProfile: Pick<SchoolProfile, 'settings'> | null | undefined,
	academicYear: string,
): string[] {
	const perms = getTeacherPermissionsForYear(schoolProfile, academicYear);
	if (!perms?.enabled || !perms.gradeChangeRequest?.enabled) return [];
	return perms.gradeChangeRequest.periods as string[];
}

export function getAllowedViewMastersAcademicYears(
	schoolProfile: Pick<SchoolProfile, 'settings'> | null | undefined,
): string[] {
	const permissionsByYear =
		schoolProfile?.settings?.teacherSettings?.permissionsByYear;
	if (!permissionsByYear) return [];
	return Object.keys(permissionsByYear).filter(
		(year) =>
			permissionsByYear[year]?.enabled &&
			permissionsByYear[year]?.viewMasters?.enabled,
	);
}
