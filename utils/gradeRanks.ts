type PeriodicSubjectGrade = { subject: string; grade: number };

export interface GradeRecordLike {
	classId: string;
	period: string;
	studentId: string;
	studentName?: string;
	subject: string;
	grade: number;
}

export interface StudentPeriodicReport {
	studentId: string;
	studentName: string;
	subjects: PeriodicSubjectGrade[];
	periodicAverage: number;
	rank: number;
	incompletes: number;
	passes: number;
	fails: number;
}

export interface StudentYearlyReport {
	studentId: string;
	studentName: string;
	periods: Record<string, PeriodicSubjectGrade[]>;
	firstSemesterAverage: Record<string, number>;
	secondSemesterAverage: Record<string, number>;
	yearlySubjectAverages: Record<string, number>;
	periodAverages: Record<string, number>;
	yearlyAverage: number;
	ranks: Record<string, number>;
	classStudentCount?: number;
}

type RankedGradeRow<T extends GradeRecordLike> = T & {
	rank: number | null;
	yearlyRank: number | null;
	ranks: Record<string, number | null>;
	classStudentCount?: number;
};

function getStats(grades: Array<{ grade: number }>) {
	const validGrades = grades.filter(
		(g) => typeof g.grade === 'number' && !Number.isNaN(g.grade),
	);
	const incompletes = grades.length - validGrades.length;
	const passes = validGrades.filter((g) => g.grade >= 70).length;
	const fails = validGrades.length - passes;
	const average =
		validGrades.length > 0
			? validGrades.reduce((acc, g) => acc + g.grade, 0) / validGrades.length
			: 0;
	return {
		incompletes,
		passes,
		fails,
		average: Number(average.toFixed(1)),
		totalStudents: grades.length,
	};
}

function removeDuplicateSubjects(
	grades: Array<{ subject: string; grade: number }>,
) {
	const subjectMap = new Map<string, number>();
	grades.forEach((grade) => {
		subjectMap.set(grade.subject, grade.grade);
	});
	return Array.from(subjectMap.entries()).map(([subject, grade]) => ({
		subject,
		grade,
	}));
}

export function normalizeYearlyPeriodKey(period: string) {
	if (period === 'sixth_period_exam') return 'six_period_exam';
	return period;
}

export function calculateRanks(
	students: Array<{ studentId: string; average: number }>,
) {
	if (students.length === 0) return [];
	const studentsWithRoundedAvg = students.map((student) => ({
		...student,
		roundedAverage: Number(student.average.toFixed(1)),
	}));
	const sortedStudents = [...studentsWithRoundedAvg].sort(
		(a, b) => b.roundedAverage - a.roundedAverage,
	);
	let currentRank = 1;
	for (let i = 0; i < sortedStudents.length; i += 1) {
		if (
			i > 0 &&
			sortedStudents[i].roundedAverage < sortedStudents[i - 1].roundedAverage
		) {
			currentRank = i + 1;
		}
		(sortedStudents[i] as any).rank = currentRank;
	}
	return sortedStudents;
}

export function processClassPeriodicReport(
	grades: GradeRecordLike[],
	classId: string,
	period: string,
	studentIds?: string[],
): StudentPeriodicReport[] {
	const studentsMap = new Map<string, StudentPeriodicReport>();

	grades
		.filter(
			(g) =>
				g.classId === classId && normalizeYearlyPeriodKey(g.period) === period,
		)
		.forEach((g) => {
			if (!studentsMap.has(g.studentId)) {
				studentsMap.set(g.studentId, {
					studentId: g.studentId,
					studentName: g.studentName || g.studentId,
					subjects: [],
					periodicAverage: 0,
					rank: 0,
					incompletes: 0,
					passes: 0,
					fails: 0,
				});
			}
			studentsMap
				.get(g.studentId)!
				.subjects.push({ subject: g.subject, grade: g.grade });
		});

	const studentsWithAverages = Array.from(studentsMap.values()).map(
		(student) => {
			const cleanedSubjects = removeDuplicateSubjects(student.subjects);
			const stats = getStats(cleanedSubjects);
			return {
				...student,
				subjects: cleanedSubjects,
				periodicAverage: stats.average,
				incompletes: stats.incompletes,
				passes: stats.passes,
				fails: stats.fails,
			};
		},
	);

	const rankedData = calculateRanks(
		studentsWithAverages.map((s) => ({
			studentId: s.studentId,
			average: s.periodicAverage,
		})),
	);

	studentsWithAverages.forEach((student) => {
		const rankData = rankedData.find((r) => r.studentId === student.studentId);
		student.rank = (rankData as any)?.rank || 0;
	});

	let result = studentsWithAverages.sort((a, b) => a.rank - b.rank);
	if (studentIds && studentIds.length > 0) {
		result = result.filter((student) => studentIds.includes(student.studentId));
	}

	return result;
}

export function processClassYearlyReport(
	grades: GradeRecordLike[],
	classId: string,
	studentIds?: string[],
): StudentYearlyReport[] {
	const studentsMap = new Map<string, StudentYearlyReport>();
	const subjectsSet = new Set<string>();

	grades
		.filter((g) => g.classId === classId)
		.forEach((g) => {
			if (!studentsMap.has(g.studentId)) {
				studentsMap.set(g.studentId, {
					studentId: g.studentId,
					studentName: g.studentName || g.studentId,
					periods: {},
					firstSemesterAverage: {},
					secondSemesterAverage: {},
					yearlySubjectAverages: {},
					periodAverages: {},
					yearlyAverage: 0,
					ranks: {},
				});
			}
			subjectsSet.add(g.subject);
			const student = studentsMap.get(g.studentId)!;
			const normalizedPeriod = normalizeYearlyPeriodKey(g.period);
			if (!student.periods[normalizedPeriod]) {
				student.periods[normalizedPeriod] = [];
			}
			student.periods[normalizedPeriod].push({
				subject: g.subject,
				grade: g.grade,
			});
		});

	studentsMap.forEach((student) => {
		const allSubjects = Array.from(subjectsSet);
		Object.keys(student.periods).forEach((period) => {
			student.periods[period] = removeDuplicateSubjects(
				student.periods[period],
			);
		});

		allSubjects.forEach((subject) => {
			const getGradeForPeriod = (period: string) =>
				student.periods[period]?.find((g) => g.subject === subject)?.grade;
			const firstSemGrades = [
				getGradeForPeriod('first'),
				getGradeForPeriod('second'),
				getGradeForPeriod('third'),
			].filter((g): g is number => g !== undefined);
			if (firstSemGrades.length > 0) {
				const avg =
					firstSemGrades.reduce((a, b) => a + b, 0) / firstSemGrades.length;
				const exam = getGradeForPeriod('third_period_exam');
				student.firstSemesterAverage[subject] = Number(
					(exam !== undefined ? (avg + exam) / 2 : avg).toFixed(1),
				);
			}

			const secondSemGrades = [
				getGradeForPeriod('fourth'),
				getGradeForPeriod('fifth'),
				getGradeForPeriod('sixth'),
			].filter((g): g is number => g !== undefined);
			if (secondSemGrades.length > 0) {
				const avg =
					secondSemGrades.reduce((a, b) => a + b, 0) / secondSemGrades.length;
				const exam = getGradeForPeriod('six_period_exam');
				student.secondSemesterAverage[subject] = Number(
					(exam !== undefined ? (avg + exam) / 2 : avg).toFixed(1),
				);
			}

			const firstAvg = student.firstSemesterAverage[subject];
			const secondAvg = student.secondSemesterAverage[subject];
			if (firstAvg !== undefined && secondAvg !== undefined) {
				student.yearlySubjectAverages[subject] = Number(
					((firstAvg + secondAvg) / 2).toFixed(1),
				);
			} else if (firstAvg !== undefined) {
				student.yearlySubjectAverages[subject] = firstAvg;
			} else if (secondAvg !== undefined) {
				student.yearlySubjectAverages[subject] = secondAvg;
			}
		});

		for (const period in student.periods) {
			student.periodAverages[period] = getStats(
				student.periods[period],
			).average;
		}

		const firstSemAvgs = Object.values(student.firstSemesterAverage).filter(
			(avg) => !Number.isNaN(avg) && avg > 0,
		);
		if (firstSemAvgs.length > 0) {
			student.periodAverages.firstSemesterAverage = Number(
				(firstSemAvgs.reduce((a, b) => a + b, 0) / firstSemAvgs.length).toFixed(
					1,
				),
			);
		}
		const secondSemAvgs = Object.values(student.secondSemesterAverage).filter(
			(avg) => !Number.isNaN(avg) && avg > 0,
		);
		if (secondSemAvgs.length > 0) {
			student.periodAverages.secondSemesterAverage = Number(
				(
					secondSemAvgs.reduce((a, b) => a + b, 0) / secondSemAvgs.length
				).toFixed(1),
			);
		}

		// Reconciled Overall Yearly Average Calculation matching Frontend convention exactly:
		const fSemAvg = student.periodAverages.firstSemesterAverage;
		const sSemAvg = student.periodAverages.secondSemesterAverage;

		if (typeof fSemAvg === 'number' && typeof sSemAvg === 'number') {
			student.yearlyAverage = Number(((fSemAvg + sSemAvg) / 2).toFixed(1));
		} else if (typeof fSemAvg === 'number') {
			student.yearlyAverage = fSemAvg;
		} else if (typeof sSemAvg === 'number') {
			student.yearlyAverage = sSemAvg;
		} else {
			student.yearlyAverage = 0;
		}
		student.periodAverages.yearlyAverage = student.yearlyAverage;
	});

	const studentsArray = Array.from(studentsMap.values());
	const allPeriodsAndAverages = [
		...new Set(
			grades
				.filter((g) => g.classId === classId)
				.map((g) => normalizeYearlyPeriodKey(g.period)),
		),
		'firstSemesterAverage',
		'secondSemesterAverage',
	];

	allPeriodsAndAverages.forEach((period) => {
		const rankCandidates = studentsArray
			.map((s) => ({
				studentId: s.studentId,
				average: s.periodAverages[period],
			}))
			.filter(
				(entry) =>
					typeof entry.average === 'number' &&
					!Number.isNaN(entry.average) &&
					entry.average > 0,
			) as Array<{ studentId: string; average: number }>;
		if (rankCandidates.length === 0) return;

		const periodRanks = calculateRanks(rankCandidates);
		periodRanks.forEach((r) => {
			const student = studentsMap.get(r.studentId);
			if (student) student.ranks[period] = (r as any).rank;
		});
	});

	const yearlyRankCandidates = studentsArray
		.map((s) => ({
			studentId: s.studentId,
			average: s.yearlyAverage,
		}))
		.filter((entry) => entry.average > 0);
	if (yearlyRankCandidates.length > 0) {
		const yearlyRanks = calculateRanks(yearlyRankCandidates);
		yearlyRanks.forEach((r) => {
			const student = studentsMap.get(r.studentId);
			if (student) student.ranks.yearly = (r as any).rank;
		});
	}

	let finalResult = studentsArray.sort(
		(a, b) => (a.ranks.yearly || Infinity) - (b.ranks.yearly || Infinity),
	);

	if (studentIds && studentIds.length > 0) {
		finalResult = finalResult.filter((student) =>
			studentIds.includes(student.studentId),
		);
	}

	const totalRanked = yearlyRankCandidates.length;
	finalResult.forEach((r) => {
		r.classStudentCount = totalRanked;
	});

	return finalResult;
}

export function attachRanksToGrades<T extends GradeRecordLike>(
	grades: T[],
	rankingSourceGrades?: GradeRecordLike[],
): RankedGradeRow<T>[] {
	if (!Array.isArray(grades) || grades.length === 0) return [];

	const sourceRows =
		Array.isArray(rankingSourceGrades) && rankingSourceGrades.length > 0
			? rankingSourceGrades
			: grades;

	const classIds = new Set<string>();
	sourceRows.forEach((row) => {
		const classId = String(row?.classId || '').trim();
		if (classId) classIds.add(classId);
	});

	const rankMap = new Map<string, Record<string, number | null>>();
	const periodRankMap = new Map<string, number>();
	const yearlyRankMap = new Map<string, number>();
	const classStudentCountMap = new Map<string, number>();

	Array.from(classIds).forEach((classId) => {
		const classGrades = sourceRows.filter((row) => row.classId === classId);
		const yearlyReports = processClassYearlyReport(classGrades, classId);
		yearlyReports.forEach((report) => {
			const key = `${classId}::${report.studentId}`;
			const ranks: Record<string, number | null> = {};
			Object.entries(report.ranks || {}).forEach(([rankKey, value]) => {
				ranks[rankKey] =
					typeof value === 'number' && Number.isFinite(value) ? value : null;
			});
			rankMap.set(key, ranks);
			if (typeof report.ranks?.yearly === 'number') {
				yearlyRankMap.set(key, report.ranks.yearly);
			}
			if (
				typeof report.classStudentCount === 'number' &&
				Number.isFinite(report.classStudentCount)
			) {
				classStudentCountMap.set(classId, report.classStudentCount);
			}
		});

		const periodSet = new Set<string>();
		classGrades.forEach((row) => {
			const normalizedPeriod = normalizeYearlyPeriodKey(
				String(row?.period || ''),
			);
			if (normalizedPeriod) periodSet.add(normalizedPeriod);
		});
		Array.from(periodSet).forEach((period) => {
			const periodicRows = processClassPeriodicReport(
				classGrades,
				classId,
				period,
			);
			periodicRows.forEach((row) => {
				periodRankMap.set(`${classId}::${period}::${row.studentId}`, row.rank);
			});
		});
	});

	return grades.map((grade) => {
		const classId = String(grade?.classId || '').trim();
		const studentId = String(grade?.studentId || '').trim();
		const normalizedPeriod = normalizeYearlyPeriodKey(
			String(grade?.period || ''),
		);
		const baseKey = `${classId}::${studentId}`;
		const ranks = rankMap.get(baseKey) || {};
		const periodRank = periodRankMap.get(
			`${classId}::${normalizedPeriod}::${studentId}`,
		);
		const yearlyRank = yearlyRankMap.get(baseKey);
		const classStudentCount = classStudentCountMap.get(classId);

		return {
			...grade,
			rank:
				typeof periodRank === 'number' && Number.isFinite(periodRank)
					? periodRank
					: null,
			yearlyRank:
				typeof yearlyRank === 'number' && Number.isFinite(yearlyRank)
					? yearlyRank
					: null,
			ranks,
			...(typeof classStudentCount === 'number' && Number.isFinite(classStudentCount)
				? { classStudentCount }
				: {}),
		};
	});
}
