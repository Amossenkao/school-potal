import {
	areAcademicYearsEqual,
	getAcademicYearCandidates,
	normalizeAcademicYear,
} from '@/utils/academicYear';
import {
	buildSchoolAcademicYearRange,
	getCurrentAcademicYearLabel,
	pickMostRecentAcademicYear,
	sortAcademicYearsDesc,
} from '@/utils/academicYearOptions';

type SchoolProfileLike = {
	currentAcademicYear?: string | null;
	firstAcademicYear?: string | null;
};

type AnyUser = {
	role?: string | null;
	classId?: string | null;
	academicYears?: Array<{ year?: string | null; classId?: string | null }>;
	subjects?: Array<{
		year?: string | null;
		classes?: Array<{ classId?: string | null; subjects?: string[] | null }>;
	}>;
};

const toCanonicalAcademicYear = (value?: string | null) => {
	const normalized = normalizeAcademicYear(value);
	if (!normalized) return '';
	const match = normalized.match(/^(\d{4})-(\d{4})$/);
	if (!match) return normalized;
	return `${match[1]}-${match[2]}`;
};

export const getCurrentAcademicYearFromSchoolProfile = (
	schoolProfile?: SchoolProfileLike | null,
) =>
	toCanonicalAcademicYear(schoolProfile?.currentAcademicYear) ||
	getCurrentAcademicYearLabel();

export const getAcademicYearQueryValues = (academicYear?: string | null) => {
	const canonical = toCanonicalAcademicYear(academicYear);
	const candidates = getAcademicYearCandidates(canonical || academicYear);
	return Array.from(
		new Set(
			[...candidates, canonical].filter(
				(value): value is string => Boolean(value),
			),
		),
	);
};

export const getAcademicYearFilterValue = (academicYear?: string | null) => {
	const values = getAcademicYearQueryValues(academicYear);
	if (values.length === 0) return toCanonicalAcademicYear(academicYear);
	if (values.length === 1) return values[0];
	return { $in: values };
};

export const isAcademicYearAllowed = (
	academicYear: string | null | undefined,
	allowedAcademicYears: Array<string | null | undefined>,
) =>
	Boolean(
		academicYear &&
			Array.isArray(allowedAcademicYears) &&
			allowedAcademicYears.some((year) =>
				areAcademicYearsEqual(year, academicYear),
			),
	);

export const getUserAllowedAcademicYears = (
	user: AnyUser | null | undefined,
	schoolProfile?: SchoolProfileLike | null,
) => {
	const currentAcademicYear =
		getCurrentAcademicYearFromSchoolProfile(schoolProfile);
	const role = String(user?.role || '');

	if (role === 'system_admin') {
		const years = buildSchoolAcademicYearRange(schoolProfile);
		return years.length > 0 ? years : [currentAcademicYear];
	}

	if (role === 'teacher') {
		const years = sortAcademicYearsDesc(
			Array.isArray(user?.subjects)
				? user.subjects.map((entry) => entry?.year || currentAcademicYear)
				: [],
		);
		return years.length > 0 ? years : [currentAcademicYear];
	}

	if (role === 'student' || role === 'administrator') {
		const years = sortAcademicYearsDesc(
			Array.isArray(user?.academicYears)
				? user.academicYears.map((entry) => entry?.year)
				: [],
		);
		return years.length > 0 ? years : [currentAcademicYear];
	}

	return [currentAcademicYear];
};

export const getDefaultAcademicYearForUser = (
	user: AnyUser | null | undefined,
	allowedAcademicYears: Array<string | null | undefined>,
	schoolProfile?: SchoolProfileLike | null,
) => {
	const currentAcademicYear =
		getCurrentAcademicYearFromSchoolProfile(schoolProfile);
	const role = String(user?.role || '');

	if (role === 'system_admin') {
		const currentMatch = allowedAcademicYears.find((year) =>
			areAcademicYearsEqual(year, currentAcademicYear),
		);
		return (
			toCanonicalAcademicYear(currentMatch) ||
			currentAcademicYear ||
			toCanonicalAcademicYear(allowedAcademicYears[0]) ||
			''
		);
	}

	return (
		pickMostRecentAcademicYear(allowedAcademicYears, currentAcademicYear) ||
		currentAcademicYear
	);
};

export type AcademicYearAccessContext = {
	academicYear: string;
	requestedAcademicYear: string | null;
	defaultAcademicYear: string;
	allowedAcademicYears: string[];
	hasAccess: boolean;
};

export const resolveAcademicYearAccessContext = ({
	user,
	schoolProfile,
	requestedAcademicYear,
}: {
	user: AnyUser | null | undefined;
	schoolProfile?: SchoolProfileLike | null;
	requestedAcademicYear?: string | null;
}): AcademicYearAccessContext => {
	const allowedAcademicYears = getUserAllowedAcademicYears(user, schoolProfile);
	const defaultAcademicYear = getDefaultAcademicYearForUser(
		user,
		allowedAcademicYears,
		schoolProfile,
	);
	const fallbackAcademicYear =
		defaultAcademicYear ||
		getCurrentAcademicYearFromSchoolProfile(schoolProfile);
	const normalizedRequested =
		toCanonicalAcademicYear(requestedAcademicYear) || null;

	if (normalizedRequested) {
		const allowedMatch = allowedAcademicYears.find((year) =>
			areAcademicYearsEqual(year, normalizedRequested),
		);
		return {
			academicYear:
				toCanonicalAcademicYear(allowedMatch) || fallbackAcademicYear,
			requestedAcademicYear: normalizedRequested,
			defaultAcademicYear: fallbackAcademicYear,
			allowedAcademicYears,
			hasAccess: Boolean(allowedMatch),
		};
	}

	return {
		academicYear: fallbackAcademicYear,
		requestedAcademicYear: null,
		defaultAcademicYear: fallbackAcademicYear,
		allowedAcademicYears,
		hasAccess: Boolean(fallbackAcademicYear),
	};
};

export const getStudentAcademicYearEntry = (
	student: AnyUser | null | undefined,
	academicYear: string,
) => {
	if (!Array.isArray(student?.academicYears)) return null;
	return (
		student.academicYears.find((entry) =>
			areAcademicYearsEqual(entry?.year, academicYear),
		) || null
	);
};

export const getStudentClassIdForAcademicYear = (
	student: AnyUser | null | undefined,
	academicYear: string,
	options: {
		allowCurrentClassFallback?: boolean;
		currentAcademicYear?: string | null;
		schoolProfile?: SchoolProfileLike | null;
	} = {},
) => {
	const yearEntry = getStudentAcademicYearEntry(student, academicYear);
	if (yearEntry?.classId) return String(yearEntry.classId);

	if (options.allowCurrentClassFallback) {
		const currentAcademicYear =
			toCanonicalAcademicYear(options.currentAcademicYear) ||
			getCurrentAcademicYearFromSchoolProfile(options.schoolProfile);
		if (
			areAcademicYearsEqual(academicYear, currentAcademicYear) &&
			student?.classId
		) {
			return String(student.classId);
		}
	}

	return '';
};

export const getTeacherYearAssignment = (
	teacher: AnyUser | null | undefined,
	academicYear: string,
	options: {
		currentAcademicYear?: string | null;
		schoolProfile?: SchoolProfileLike | null;
	} = {},
) => {
	if (!Array.isArray(teacher?.subjects)) return null;
	const currentAcademicYear =
		toCanonicalAcademicYear(options.currentAcademicYear) ||
		getCurrentAcademicYearFromSchoolProfile(options.schoolProfile);

	return (
		teacher.subjects.find((entry) => {
			const assignmentYear =
				toCanonicalAcademicYear(entry?.year) || currentAcademicYear;
			return areAcademicYearsEqual(assignmentYear, academicYear);
		}) || null
	);
};

export const getTeacherClassIdsForAcademicYear = (
	teacher: AnyUser | null | undefined,
	academicYear: string,
	options: {
		currentAcademicYear?: string | null;
		schoolProfile?: SchoolProfileLike | null;
	} = {},
) => {
	const assignment = getTeacherYearAssignment(teacher, academicYear, options);
	if (!assignment?.classes || !Array.isArray(assignment.classes)) return [];
	return Array.from(
		new Set(
			assignment.classes
				.map((entry) => String(entry?.classId || '').trim())
				.filter(Boolean),
		),
	);
};

export const getTeacherClassAssignmentForAcademicYear = (
	teacher: AnyUser | null | undefined,
	academicYear: string,
	classId: string,
	options: {
		currentAcademicYear?: string | null;
		schoolProfile?: SchoolProfileLike | null;
	} = {},
) => {
	const assignment = getTeacherYearAssignment(teacher, academicYear, options);
	if (!assignment?.classes || !Array.isArray(assignment.classes) || !classId) {
		return null;
	}
	return (
		assignment.classes.find(
			(entry) => String(entry?.classId || '').trim() === classId,
		) || null
	);
};
