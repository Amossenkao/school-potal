// components/dashboard/insightAnalytics.ts
import type { SchoolProfile } from '@/types/schoolProfile';

export type RawGradeRecord = {
	grade?: number | string | null;
	subject?: string | null;
	classId?: string | null;
	period?: string | null;
	status?: string | null;
	studentId?: string | null;
	studentName?: string | null;
};

export type NumericGradeRecord = {
	grade: number;
	subject: string;
	classId: string;
	period: string;
	status?: string;
	studentId: string;
	studentName: string;
};

export type TopPerformerScope =
	| 'yearly'
	| 'subject'
	| 'class'
	| 'period'
	| 'semester';

export type ChartType = 'column' | 'bar' | 'line';

export const CHART_TYPE_OPTIONS: Array<{
	value: ChartType;
	label: string;
}> = [
	{ value: 'column', label: 'Column' },
	{ value: 'bar', label: 'Bar' },
	{ value: 'line', label: 'Line' },
];

export const ALL_PERIODS = [
	'first',
	'second',
	'third',
	'third_period_exam',
	'fourth',
	'fifth',
	'sixth',
	'sixth_period_exam',
] as const;

export const PERIOD_LABELS: Record<string, string> = {
	first: '1st Period',
	second: '2nd Period',
	third: '3rd Period',
	third_period_exam: '3rd Period Exam',
	fourth: '4th Period',
	fifth: '5th Period',
	sixth: '6th Period',
	sixth_period_exam: '6th Period Exam',
};

export const SEMESTER_LABELS: Record<'first' | 'second', string> = {
	first: '1st Semester',
	second: '2nd Semester',
};

// Order matters here: [period1, period2, period3, examPeriod].
// The semester average formula relies on this exact shape.
export const SEMESTER_PERIODS: Record<'first' | 'second', string[]> = {
	first: ['first', 'second', 'third', 'third_period_exam'],
	second: ['fourth', 'fifth', 'sixth', 'sixth_period_exam'],
};

const PERIOD_ALIAS_MAP: Record<string, string> = {
	'third period exam': 'third_period_exam',
	thirdperiodexam: 'third_period_exam',
	'6th period exam': 'sixth_period_exam',
	'6th_period_exam': 'sixth_period_exam',
	'sixth period exam': 'sixth_period_exam',
	sixthperiodexam: 'sixth_period_exam',
};

const isApprovedStatus = (status?: string | null) => {
	if (!status) return true;
	return String(status).trim().toLowerCase() === 'approved';
};

export const normalizePeriod = (period?: string | null) => {
	if (!period) return '';
	const compact = String(period).trim().toLowerCase().replace(/\s+/g, '_');
	if (compact in PERIOD_LABELS) return compact;
	const withSpaces = compact.replace(/_/g, ' ');
	if (withSpaces in PERIOD_ALIAS_MAP) return PERIOD_ALIAS_MAP[withSpaces];
	if (compact in PERIOD_ALIAS_MAP) return PERIOD_ALIAS_MAP[compact];
	return compact;
};

const toNumber = (value?: number | string | null) => {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

export const normalizeNumericGrades = (
	grades: RawGradeRecord[],
	options?: { approvedOnly?: boolean },
): NumericGradeRecord[] => {
	const approvedOnly = options?.approvedOnly !== false;
	return grades.reduce<NumericGradeRecord[]>((accumulator, record) => {
		if (approvedOnly && !isApprovedStatus(record.status)) {
			return accumulator;
		}
		const grade = toNumber(record.grade);
		if (grade === null) return accumulator;

		accumulator.push({
			grade,
			subject: String(record.subject || 'Unknown Subject').trim() || 'Unknown Subject',
			classId: String(record.classId || '').trim(),
			period: normalizePeriod(record.period),
			status: record.status ? String(record.status) : undefined,
			studentId: String(record.studentId || '').trim(),
			studentName: String(record.studentName || '').trim() || 'Unknown Student',
		});
		return accumulator;
	}, []);
};

export const filterGradesByPeriodAndSemester = (
	grades: NumericGradeRecord[],
	selectedPeriod: string,
	selectedSemester: string,
) => {
	if (selectedSemester !== 'all') {
		const semesterPeriods =
			SEMESTER_PERIODS[selectedSemester as 'first' | 'second'] || [];
		return grades.filter((grade) => semesterPeriods.includes(grade.period));
	}
	if (selectedPeriod !== 'all') {
		const normalizedPeriod = normalizePeriod(selectedPeriod);
		return grades.filter((grade) => grade.period === normalizedPeriod);
	}
	return grades;
};

const computeAverage = (values: number[]) => {
	if (values.length === 0) return 0;
	return Number(
		(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1),
	);
};

const computeAverageOrNull = (values: number[]) => {
	if (values.length === 0) return null;
	return Number(
		(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1),
	);
};

/**
 * Semester average formula:
 * 1. Average the three regular periods (first/second/third, or fourth/fifth/sixth).
 * 2. Blend that average with the period-exam grade: (regularAverage + examGrade) / 2.
 * Falls back gracefully if only one side is present.
 */
const computeSemesterSubjectAverage = (
	periodGrades: Map<string, number>,
	semesterPeriods: string[],
) => {
	const [p1, p2, p3, examPeriod] = semesterPeriods;
	const regularValues = [p1, p2, p3]
		.map((period) => periodGrades.get(period))
		.filter((value): value is number => typeof value === 'number');
	const regularAverage = computeAverageOrNull(regularValues);
	const examGrade = periodGrades.get(examPeriod);
	const hasExam = typeof examGrade === 'number';

	if (regularAverage === null && !hasExam) return null;
	if (regularAverage === null) return examGrade as number;
	if (!hasExam) return regularAverage;
	return Number(((regularAverage + examGrade) / 2).toFixed(1));
};

type TopPerformerGradeEntry = {
	subject: string;
	period: string;
	grade: number;
};

const buildSubjectPeriodMap = (entries: TopPerformerGradeEntry[]) => {
	const map = new Map<string, Map<string, number>>();
	entries.forEach((entry) => {
		if (!entry.subject || !entry.period) return;
		if (!map.has(entry.subject)) {
			map.set(entry.subject, new Map<string, number>());
		}
		map.get(entry.subject)!.set(entry.period, entry.grade);
	});
	return map;
};

const computeSemesterOverallFromEntries = (
	entries: TopPerformerGradeEntry[],
	semesterPeriods: string[],
) => {
	const subjectPeriodMap = buildSubjectPeriodMap(entries);
	const subjectAverages: number[] = [];

	subjectPeriodMap.forEach((periodGrades) => {
		const subjectAverage = computeSemesterSubjectAverage(periodGrades, semesterPeriods);
		if (subjectAverage !== null) {
			subjectAverages.push(subjectAverage);
		}
	});

	return computeAverageOrNull(subjectAverages);
};

const computeReportAlignedOverallAverage = (entries: TopPerformerGradeEntry[]) => {
	const hasFirstSemester = entries.some((entry) =>
		SEMESTER_PERIODS.first.includes(entry.period),
	);
	const hasSecondSemester = entries.some((entry) =>
		SEMESTER_PERIODS.second.includes(entry.period),
	);

	const firstSemesterAverage = hasFirstSemester
		? computeSemesterOverallFromEntries(entries, SEMESTER_PERIODS.first)
		: null;
	const secondSemesterAverage = hasSecondSemester
		? computeSemesterOverallFromEntries(entries, SEMESTER_PERIODS.second)
		: null;

	const yearlySource = [firstSemesterAverage, secondSemesterAverage].filter(
		(value): value is number => typeof value === 'number',
	);
	return computeAverageOrNull(yearlySource) ?? 0;
};

export const buildAverageByDimension = (
	grades: NumericGradeRecord[],
	getLabel: (grade: NumericGradeRecord) => string,
) => {
	const grouped = new Map<string, number[]>();
	grades.forEach((grade) => {
		const label = getLabel(grade) || 'Unknown';
		if (!grouped.has(label)) grouped.set(label, []);
		grouped.get(label)!.push(grade.grade);
	});
	return Array.from(grouped.entries())
		.map(([label, values]) => ({
			label,
			average: computeAverage(values),
			count: values.length,
		}))
		.sort((left, right) => right.average - left.average || right.count - left.count);
};

/**
 * Walks schoolProfile.classLevels in its natural (session -> level -> class)
 * order and returns classIds in that same sequence. Used to keep class-based
 * charts/tables aligned with how the school actually lists its classes,
 * instead of sorting by score or alphabetically.
 */
export const getOrderedClassIds = (schoolProfile: SchoolProfile): string[] => {
	const levels = (schoolProfile as any)?.classLevels || {};
	const classIds: string[] = [];
	Object.keys(levels).forEach((session) => {
		const sessionLevels = levels[session] || {};
		Object.keys(sessionLevels).forEach((levelName) => {
			const levelData = sessionLevels[levelName] as any;
			const classes = levelData?.classes || [];
			classes.forEach((klass: any) => {
				if (klass?.classId && !classIds.includes(klass.classId)) {
					classIds.push(klass.classId);
				}
			});
		});
	});
	return classIds;
};

/**
 * Like buildAverageByDimension, but groups by classId and orders the result
 * by the class's position in the school profile rather than by average.
 */
export const buildClassAverages = (
	grades: NumericGradeRecord[],
	schoolProfile: SchoolProfile,
	resolveClassLabel: (classId: string) => string,
) => {
	const grouped = new Map<string, number[]>();
	grades.forEach((grade) => {
		const classId = grade.classId || 'unknown';
		if (!grouped.has(classId)) grouped.set(classId, []);
		grouped.get(classId)!.push(grade.grade);
	});

	const orderedIds = getOrderedClassIds(schoolProfile);
	const orderIndex = new Map(orderedIds.map((id, index) => [id, index]));

	return Array.from(grouped.entries())
		.map(([classId, values]) => ({
			label: resolveClassLabel(classId) || classId,
			classId,
			average: computeAverage(values),
			count: values.length,
		}))
		.sort((left, right) => {
			const leftOrder = orderIndex.has(left.classId)
				? orderIndex.get(left.classId)!
				: Number.MAX_SAFE_INTEGER;
			const rightOrder = orderIndex.has(right.classId)
				? orderIndex.get(right.classId)!
				: Number.MAX_SAFE_INTEGER;
			if (leftOrder !== rightOrder) return leftOrder - rightOrder;
			return left.label.localeCompare(right.label);
		});
};

export const buildPeriodTrend = (grades: NumericGradeRecord[]) => {
	return ALL_PERIODS.map((period) => {
		const values = grades
			.filter((grade) => grade.period === period)
			.map((grade) => grade.grade);
		return {
			key: period,
			label: PERIOD_LABELS[period],
			average: computeAverage(values),
			count: values.length,
		};
	}).filter((entry) => entry.count > 0);
};

/**
 * For each semester, groups grades by subject, computes the
 * (regular-period average + exam grade) / 2 average per subject,
 * then averages across subjects for the semester's overall figure.
 */
export const buildSemesterTrend = (grades: NumericGradeRecord[]) => {
	return (['first', 'second'] as const).map((semester) => {
		const periods = SEMESTER_PERIODS[semester];
		const [p1, p2, p3, examPeriod] = periods;

		const bySubject = new Map<string, NumericGradeRecord[]>();
		let recordCount = 0;
		grades.forEach((grade) => {
			if (!periods.includes(grade.period)) return;
			recordCount += 1;
			if (!bySubject.has(grade.subject)) bySubject.set(grade.subject, []);
			bySubject.get(grade.subject)!.push(grade);
		});

		const subjectAverages: number[] = [];
		bySubject.forEach((subjectGrades) => {
			const regularValues = subjectGrades
				.filter(
					(grade) =>
						grade.period === p1 || grade.period === p2 || grade.period === p3,
				)
				.map((grade) => grade.grade);
			const examValues = subjectGrades
				.filter((grade) => grade.period === examPeriod)
				.map((grade) => grade.grade);

			const regularAverage = computeAverageOrNull(regularValues);
			const examAverage = computeAverageOrNull(examValues);

			let subjectAverage: number | null = null;
			if (regularAverage !== null && examAverage !== null) {
				subjectAverage = Number(((regularAverage + examAverage) / 2).toFixed(1));
			} else if (regularAverage !== null) {
				subjectAverage = regularAverage;
			} else if (examAverage !== null) {
				subjectAverage = examAverage;
			}
			if (subjectAverage !== null) subjectAverages.push(subjectAverage);
		});

		return {
			key: semester,
			label: SEMESTER_LABELS[semester],
			average: computeAverageOrNull(subjectAverages) ?? 0,
			count: recordCount,
		};
	});
};

/**
 * Convenience helper for "Average Grade" style stat cards: pass the full
 * (unfiltered-by-semester) numeric grades plus which semester is selected,
 * and get back that semester's average using the same formula as above.
 */
export const computeSemesterAverageFromGrades = (
	grades: NumericGradeRecord[],
	semester: 'first' | 'second',
) => {
	const [{ average }] = buildSemesterTrend(grades).filter(
		(entry) => entry.key === semester,
	);
	return average ?? 0;
};

export const buildPassFailData = (
	grades: NumericGradeRecord[],
	passMark: number,
) => {
	const passCount = grades.filter((grade) => grade.grade >= passMark).length;
	const failCount = grades.length - passCount;
	return [
		{ label: 'Pass', value: passCount },
		{ label: 'Fail', value: failCount },
	];
};

export const buildGradeBandData = (grades: NumericGradeRecord[]) => {
	const bands = [
		{ label: 'A (90-100)', min: 90, max: 100 },
		{ label: 'B (80-89)', min: 80, max: 89 },
		{ label: 'C (70-79)', min: 70, max: 79 },
		{ label: 'D (60-69)', min: 60, max: 69 },
		{ label: 'F (<60)', min: Number.NEGATIVE_INFINITY, max: 59 },
	];

	return bands.map((band) => ({
		label: band.label,
		value: grades.filter(
			(grade) => grade.grade >= band.min && grade.grade <= band.max,
		).length,
	}));
};

export const getSemesterFromPeriod = (period: string) => {
	const normalizedPeriod = normalizePeriod(period);
	if (SEMESTER_PERIODS.first.includes(normalizedPeriod)) return 'first';
	if (SEMESTER_PERIODS.second.includes(normalizedPeriod)) return 'second';
	return '';
};

export type TopPerformerRow = {
	key: string;
	scopeLabel: string;
	studentId: string;
	studentName: string;
	classLabel: string;
	average: number;
	count: number;
};

export const buildTopPerformerRows = (
	grades: NumericGradeRecord[],
	options: {
		scope: TopPerformerScope;
		limit: number;
		resolveClassLabel?: (classId: string) => string;
		orderedClassIds?: string[];
	},
) => {
	const safeLimit = Math.max(1, options.limit);
	
const grouped = new Map<
	string,
	{
		scopeLabel: string;
		studentId: string;
		studentName: string;
		entries: TopPerformerGradeEntry[];
		classCounts: Map<string, number>;
	}
>();
	// Tracks, for scope === 'class', which raw classId a given scopeLabel
	// (the resolved class name) came from — needed to sort groups by the
	// school profile's class order instead of by score.
	const scopeLabelToClassId = new Map<string, string>();

	const resolveClassLabel = (grade: NumericGradeRecord) => {
		const classLabel = options.resolveClassLabel?.(grade.classId || '') || '';
		return classLabel || grade.classId || 'Unknown Class';
	};

	const resolveScopeLabel = (grade: NumericGradeRecord) => {
		switch (options.scope) {
			case 'subject':
				return grade.subject || 'Unknown Subject';
			case 'class': {
				const label = options.resolveClassLabel?.(grade.classId || '') || '';
				return label || grade.classId || 'Unknown Class';
			}
			case 'period':
				return PERIOD_LABELS[grade.period] || grade.period || 'Unknown Period';
			case 'semester': {
				const semester = getSemesterFromPeriod(grade.period);
				if (semester === 'first') return SEMESTER_LABELS.first;
				if (semester === 'second') return SEMESTER_LABELS.second;
				return 'Unknown Semester';
			}
			case 'yearly':
			default:
				return 'Yearly';
		}
	};

	grades.forEach((grade, index) => {
		const scopeLabel = resolveScopeLabel(grade);
		const classLabel = resolveClassLabel(grade);
		const studentId = grade.studentId || `student-${index}`;
		const studentName = grade.studentName || 'Unknown Student';
		const groupingKey = `${scopeLabel}::${studentId}`;

		if (options.scope === 'class' && grade.classId && !scopeLabelToClassId.has(scopeLabel)) {
			scopeLabelToClassId.set(scopeLabel, grade.classId);
		}

		if (!grouped.has(groupingKey)) {
			grouped.set(groupingKey, {
				scopeLabel,
				studentId,
				studentName,
				entries: [],
				classCounts: new Map<string, number>(),
			});
		}
		const entry = grouped.get(groupingKey)!;
		entry.entries.push({
			subject: grade.subject,
			period: grade.period,
			grade: grade.grade,
		});
		entry.classCounts.set(classLabel, (entry.classCounts.get(classLabel) || 0) + 1);
	});

	const rows: TopPerformerRow[] = Array.from(grouped.values())
		.map((entry) => ({
			classLabel:
				options.scope === 'class'
					? entry.scopeLabel
					: Array.from(entry.classCounts.entries()).sort(
							(left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
					  )[0]?.[0] || 'Unknown Class',
			key: `${entry.scopeLabel}::${entry.studentId}`,
			scopeLabel: entry.scopeLabel,
			studentId: entry.studentId,
			studentName: entry.studentName,
			average:
				options.scope === 'subject' || options.scope === 'period'
					? computeAverage(entry.entries.map((item) => item.grade))
					: computeReportAlignedOverallAverage(entry.entries),
			count: entry.entries.length,
		}))
		.sort(
			(left, right) =>
				right.average - left.average ||
				right.count - left.count ||
				left.studentName.localeCompare(right.studentName),
		)
		.reduce<TopPerformerRow[]>((accumulator, row) => {
			accumulator.push(row);
			return accumulator;
		}, []);

	if (options.scope === 'yearly') {
		return rows.slice(0, safeLimit);
	}

	const groupedByScope = new Map<string, TopPerformerRow[]>();
	rows.forEach((row) => {
		if (!groupedByScope.has(row.scopeLabel)) {
			groupedByScope.set(row.scopeLabel, []);
		}
		groupedByScope.get(row.scopeLabel)!.push(row);
	});

	const classOrderIndex = new Map(
		(options.orderedClassIds || []).map((id, index) => [id, index]),
	);

	const rankedGroups = Array.from(groupedByScope.entries()).sort((left, right) => {
		if (options.scope === 'class' && classOrderIndex.size > 0) {
			const leftClassId = scopeLabelToClassId.get(left[0]) || '';
			const rightClassId = scopeLabelToClassId.get(right[0]) || '';
			const leftOrder = classOrderIndex.has(leftClassId)
				? classOrderIndex.get(leftClassId)!
				: Number.MAX_SAFE_INTEGER;
			const rightOrder = classOrderIndex.has(rightClassId)
				? classOrderIndex.get(rightClassId)!
				: Number.MAX_SAFE_INTEGER;
			if (leftOrder !== rightOrder) return leftOrder - rightOrder;
			return left[0].localeCompare(right[0]);
		}
		const leftTop = left[1][0]?.average ?? 0;
		const rightTop = right[1][0]?.average ?? 0;
		return rightTop - leftTop || left[0].localeCompare(right[0]);
	});

	return rankedGroups.flatMap(([, groupRows]) => groupRows.slice(0, safeLimit));
};

export const formatAxisLabel = (value: string, max = 14) =>
	value.length > max ? `${value.slice(0, max)}…` : value;