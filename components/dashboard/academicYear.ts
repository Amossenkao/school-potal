import type { SchoolProfile } from '@/types/schoolProfile';

export type AcademicYearOption = { value: string; label: string };

export const buildAcademicYearOptions = (
	schoolProfile: SchoolProfile,
): AcademicYearOption[] => {
	const current = schoolProfile.currentAcademicYear || '';
	const first = schoolProfile.firstAcademicYear || '';
	const parseStart = (value: string) => {
		const match = value.match(/^(\d{4})/);
		return match ? Number(match[1]) : null;
	};
	const startYear = parseStart(first);
	const endYear = parseStart(current);
	if (startYear && endYear && endYear >= startYear) {
		const years: AcademicYearOption[] = [];
		for (let year = endYear; year >= startYear; year -= 1) {
			years.push({
				value: `${year}-${year + 1}`,
				label: `${year}-${year + 1}`,
			});
		}
		return years;
	}
	if (current) {
		return [{ value: current, label: current }];
	}
	return [];
};

export const getClassNameById = (
	schoolProfile: SchoolProfile,
	classId?: string,
) => {
	if (!classId) return '';
	const levels = schoolProfile.classLevels || {};
	for (const session of Object.values(levels)) {
		if (!session || typeof session !== 'object') continue;
		for (const level of Object.values(session)) {
			if (!level || typeof level !== 'object') continue;
			const classes = (level as any).classes || [];
			const match = classes.find((klass: any) => klass.classId === classId);
			if (match) return match.name || classId;
		}
	}
	return classId;
};

export const getClassLevelLabel = (
	schoolProfile: SchoolProfile,
	classId?: string,
) => {
	if (!classId) return '';
	const levels = schoolProfile.classLevels || {};
	const sessionNames = Object.keys(levels).filter(Boolean);
	const includeSession = sessionNames.length > 1;
	for (const [sessionName, session] of Object.entries(levels)) {
		if (!session || typeof session !== 'object') continue;
		for (const [levelName, level] of Object.entries(session as any)) {
			if (!level || typeof level !== 'object') continue;
			const classes = (level as any).classes || [];
			const match = classes.find((klass: any) => klass.classId === classId);
			if (match) {
				return includeSession ? `${sessionName} - ${levelName}` : levelName;
			}
		}
	}
	return '';
};
