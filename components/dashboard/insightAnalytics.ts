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

export const buildSemesterTrend = (grades: NumericGradeRecord[]) => {
	return (['first', 'second'] as const).map((semester) => {
		const periods = SEMESTER_PERIODS[semester];
		const values = grades
			.filter((grade) => periods.includes(grade.period))
			.map((grade) => grade.grade);
		return {
			key: semester,
			label: SEMESTER_LABELS[semester],
			average: computeAverage(values),
			count: values.length,
		};
	});
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
	},
) => {
	const safeLimit = Math.max(1, options.limit);
	const grouped = new Map<
		string,
		{
			scopeLabel: string;
			studentId: string;
			studentName: string;
			values: number[];
			classCounts: Map<string, number>;
		}
	>();

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

		if (!grouped.has(groupingKey)) {
			grouped.set(groupingKey, {
				scopeLabel,
				studentId,
				studentName,
				values: [],
				classCounts: new Map<string, number>(),
			});
		}
		const entry = grouped.get(groupingKey)!;
		entry.values.push(grade.grade);
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
			average: computeAverage(entry.values),
			count: entry.values.length,
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

	const rankedGroups = Array.from(groupedByScope.entries()).sort((left, right) => {
		const leftTop = left[1][0]?.average ?? 0;
		const rightTop = right[1][0]?.average ?? 0;
		return rightTop - leftTop || left[0].localeCompare(right[0]);
	});

	return rankedGroups.flatMap(([, groupRows]) => groupRows.slice(0, safeLimit));
};

export const formatAxisLabel = (value: string, max = 14) =>
	value.length > max ? `${value.slice(0, max)}…` : value;
