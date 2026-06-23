import { areAcademicYearsEqual, normalizeAcademicYear } from '@/utils/academicYear';

type SchoolLike = {
	firstAcademicYear?: string | null;
	currentAcademicYear?: string | null;
};

const toCanonicalAcademicYear = (value?: string | null) => {
	const normalized = normalizeAcademicYear(value);
	if (!normalized) return '';
	const match = normalized.match(/^(\d{4})-(\d{4})$/);
	if (!match) return normalized;
	return `${match[1]}-${match[2]}`;
};

const parseAcademicYearStart = (value?: string | null) => {
	const normalized = toCanonicalAcademicYear(value);
	const match = normalized.match(/^(\d{4})-(\d{4})$/);
	if (!match) return null;
	return Number(match[1]);
};

export const getCurrentAcademicYearLabel = () => {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;
	return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

export const sortAcademicYearsDesc = (
	years: Array<string | null | undefined>,
) => {
	const unique = Array.from(
		new Set(
			years
				.map((year) => toCanonicalAcademicYear(year))
				.filter((year): year is string => Boolean(year)),
		),
	);
	return unique.sort((left, right) => {
		const leftStart = parseAcademicYearStart(left) ?? Number.NEGATIVE_INFINITY;
		const rightStart = parseAcademicYearStart(right) ?? Number.NEGATIVE_INFINITY;
		if (leftStart !== rightStart) return rightStart - leftStart;
		return right.localeCompare(left);
	});
};

export const buildSchoolAcademicYearRange = (school?: SchoolLike | null) => {
	const first = toCanonicalAcademicYear(school?.firstAcademicYear);
	const current = toCanonicalAcademicYear(
		school?.currentAcademicYear || getCurrentAcademicYearLabel(),
	);
	const firstStart = parseAcademicYearStart(first);
	const currentStart = parseAcademicYearStart(current);

	if (firstStart && currentStart && currentStart >= firstStart) {
		const years: string[] = [];
		for (let year = currentStart; year >= firstStart; year -= 1) {
			years.push(`${year}-${year + 1}`);
		}
		return years;
	}

	return sortAcademicYearsDesc([current, first]);
};

export const pickMostRecentAcademicYear = (
	years: Array<string | null | undefined>,
	fallback?: string | null,
) => {
	const sorted = sortAcademicYearsDesc(years);
	if (sorted.length > 0) return sorted[0];
	return toCanonicalAcademicYear(fallback);
};

export const pickCurrentOrMostRecentAcademicYear = (
	years: Array<string | null | undefined>,
	currentYear?: string | null,
) => {
	const sorted = sortAcademicYearsDesc(years);
	if (sorted.length === 0) return toCanonicalAcademicYear(currentYear);
	const current = toCanonicalAcademicYear(currentYear);
	if (current) {
		const matched = sorted.find((year) => areAcademicYearsEqual(year, current));
		if (matched) return matched;
	}
	return sorted[0];
};

export const getStudentAcademicYears = (user: any) =>
	sortAcademicYearsDesc(
		Array.isArray(user?.academicYears)
			? user.academicYears.map((entry: any) => entry?.year)
			: [],
	);

export const getTeacherAcademicYears = (user: any) =>
	sortAcademicYearsDesc(
		Array.isArray(user?.subjects)
			? user.subjects.map((entry: any) => entry?.year)
			: [],
	);

export const filterAcademicYearsByAllowed = (
	candidateYears: Array<string | null | undefined>,
	allowedYears: Array<string | null | undefined>,
) => {
	const candidates = sortAcademicYearsDesc(candidateYears);
	if (!Array.isArray(allowedYears) || allowedYears.length === 0) {
		return candidates;
	}
	const allowed = sortAcademicYearsDesc(allowedYears);
	return candidates.filter((candidate) =>
		allowed.some((year) => areAcademicYearsEqual(candidate, year)),
	);
};

