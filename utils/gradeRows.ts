import { normalizeAcademicYear } from '@/utils/academicYear';

const toComparableToken = (grade: any) => {
	const academicYear = normalizeAcademicYear(grade?.academicYear);
	const classId = String(grade?.classId || '').trim();
	const period = String(grade?.period || '').trim();
	const subject = String(grade?.subject || '').trim();
	const studentId = String(
		grade?.studentId || grade?.id || grade?._id || '',
	).trim();
	const gradeValue =
		typeof grade?.grade === 'number' && Number.isFinite(grade.grade)
			? grade.grade.toFixed(4)
			: String(grade?.grade ?? '').trim();
	const status = String(grade?.status || '').trim();
	const rank = Number(grade?.rank);
	const yearlyRank = Number(grade?.yearlyRank);
	return [
		academicYear,
		classId,
		period,
		subject,
		studentId,
		gradeValue,
		status,
		Number.isFinite(rank) ? String(rank) : '',
		Number.isFinite(yearlyRank) ? String(yearlyRank) : '',
	].join('|');
};

export const areGradeRowsEquivalent = (
	leftRows?: any[] | null,
	rightRows?: any[] | null,
) => {
	const left = Array.isArray(leftRows) ? leftRows : [];
	const right = Array.isArray(rightRows) ? rightRows : [];
	if (left.length !== right.length) return false;
	const leftTokens = left.map(toComparableToken).sort();
	const rightTokens = right.map(toComparableToken).sort();
	for (let index = 0; index < leftTokens.length; index += 1) {
		if (leftTokens[index] !== rightTokens[index]) {
			return false;
		}
	}
	return true;
};
