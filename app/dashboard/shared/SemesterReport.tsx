'use client';
import React, {
	useState,
	useEffect,
	useRef,
	useMemo,
	useCallback,
} from 'react';
import {
	PDFDocument,
	StandardFonts,
	rgb,
	type PDFFont,
	type PDFPage,
} from 'pdf-lib';
import {
	Facebook,
	Mail,
	MessageCircle,
	MessagesSquare,
	Send,
	Twitter,
} from 'lucide-react';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import AccessDenied from '@/components/AccessDenied';
import { getStudentAllowedAccess } from '@/utils/schoolSettingsAccess';
import { drawTextMap } from '@/utils/pdfText';
import { buildSemesterCardPlacements } from '@/app/dashboard/shared/reportPdfLayout';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';
import {
	buildSchoolAcademicYearRange,
	getStudentAcademicYears,
	getTeacherAcademicYears,
	pickCurrentOrMostRecentAcademicYear,
	pickMostRecentAcademicYear,
} from '@/utils/academicYearOptions';
import { loadReportTemplateBytes } from '@/utils/reportTemplate';
import { areGradeRowsEquivalent } from '@/utils/gradeRows';

import StudentMultiSelect from './components/StudentMultiSelect';
import { SharedFilter, FilterConfig, SemesterReportFilters } from './components/SharedFilter';

const InlineLoading = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => (
	<div className="-m-8">
		<PageLoading fullScreen={false} variant="minimal" size={size} />
	</div>
);

interface StudentSemesterReport {
	studentId: string;
	studentName: string;
	periods: Record<string, Array<{ subject: string; grade: number | null }>>;
	firstSemesterAverage: Record<string, number | null>;
	secondSemesterAverage: Record<string, number | null>;
	periodAverages: Record<string, number | null>;
	yearlyAverage: number | null;
	ranks: Record<string, number | null>;
	qrCodeDataUrl?: string;
}

interface Student {
	id: string;
	name: string;
	className: string;
}

const semesterOptions = [
	{ value: 'first', label: '1st Semester' },
	{ value: 'second', label: '2nd Semester' },
];

const getCurrentAcademicYear = () => {
	const currentDate = new Date();
	const currentYear = currentDate.getFullYear();
	const currentMonth = currentDate.getMonth() + 1;

	if (currentMonth >= 8) {
		return `${currentYear}-${currentYear + 1}`;
	}
	return `${currentYear - 1}-${currentYear}`;
};

const getClassMetaById = (classLevels: any, classId?: string) => {
	if (!classLevels || !classId) return null;
	for (const [session, levels] of Object.entries(classLevels)) {
		if (!levels || typeof levels !== 'object') continue;
		for (const [level, levelData] of Object.entries(levels as any)) {
			if (!levelData?.classes || !Array.isArray(levelData.classes)) continue;
			const found = levelData.classes.find(
				(cls: any) => cls.classId === classId,
			);
			if (found) {
				return { session, level, name: found.name };
			}
		}
	}
	return null;
};

const getStudentClassIdForYear = (student: any, academicYear: string) => {
	const yearEntry = Array.isArray(student?.academicYears)
		? student.academicYears.find((ay: any) =>
				areAcademicYearsEqual(ay.year, academicYear),
			)
		: null;
	if (yearEntry?.classId) return yearEntry.classId;

	const historicalClassId = String(
		student?.historicalClass?.classId || '',
	).trim();
	const historicalAcademicYear = String(
		student?.historicalClass?.academicYear || '',
	).trim();
	if (
		historicalClassId &&
		(!historicalAcademicYear ||
			areAcademicYearsEqual(historicalAcademicYear, academicYear))
	) {
		return historicalClassId;
	}

	const directClassId = String(student?.classId || '').trim();
	if (directClassId) return directClassId;

	const currentClassId = String(student?.currentClass?.classId || '').trim();
	if (currentClassId) return currentClassId;

	return '';
};

const normalizeStudentId = (...ids: Array<unknown>) => {
	for (const id of ids) {
		if (id === null || id === undefined) continue;
		const normalized = String(id).trim();
		if (normalized) return normalized;
	}
	return '';
};

const buildStudentFullName = (student: any) =>
	student?.fullName ||
	[student?.firstName, student?.middleName, student?.lastName]
		.filter(Boolean)
		.join(' ');

const resolveStudentDisplayName = (student: any, fallbackName = '') => {
	const fullName = buildStudentFullName(student);
	if (fullName) return fullName;

	const cachedName =
		typeof student?.name === 'string' ? student.name.trim() : '';
	if (cachedName) return cachedName;

	const apiName =
		typeof student?.studentName === 'string' ? student.studentName.trim() : '';
	if (apiName) return apiName;

	return fallbackName;
};

const mergeSubjectNames = (subjects: Array<unknown>) => {
	const result: string[] = [];
	const seen = new Set<string>();
	subjects.forEach((value) => {
		const normalized = String(value || '').trim();
		if (!normalized || seen.has(normalized)) return;
		seen.add(normalized);
		result.push(normalized);
	});
	return result;
};

const collectSemesterReportSubjects = (reports: any[]) => {
	if (!Array.isArray(reports)) return [] as string[];
	const subjects: Array<unknown> = [];
	reports.forEach((report) => {
		if (report?.periods && typeof report.periods === 'object') {
			Object.values(report.periods).forEach((entries: any) => {
				if (!Array.isArray(entries)) return;
				entries.forEach((entry: any) => {
					subjects.push(entry?.subject);
				});
			});
		}
		if (
			report?.firstSemesterAverage &&
			typeof report.firstSemesterAverage === 'object'
		) {
			subjects.push(...Object.keys(report.firstSemesterAverage));
		}
		if (
			report?.secondSemesterAverage &&
			typeof report.secondSemesterAverage === 'object'
		) {
			subjects.push(...Object.keys(report.secondSemesterAverage));
		}
	});
	return mergeSubjectNames(subjects);
};

const REPORT_PERIOD_KEYS = [
	'first',
	'second',
	'third',
	'third_period_exam',
	'fourth',
	'fifth',
	'sixth',
	'six_period_exam',
] as const;

type ReportPeriodKey = (typeof REPORT_PERIOD_KEYS)[number];

const normalizeReportPeriodKey = (period: unknown): ReportPeriodKey | null => {
	const normalized = String(period || '').trim();
	if (normalized === 'sixth_period_exam') return 'six_period_exam';
	if (REPORT_PERIOD_KEYS.includes(normalized as ReportPeriodKey)) {
		return normalized as ReportPeriodKey;
	}
	return null;
};

const createPeriodBuckets = (subjects: string[]) =>
	REPORT_PERIOD_KEYS.reduce(
		(acc, period) => {
			acc[period] = subjects.map((subject) => ({
				subject,
				grade: null as number | null,
			}));
			return acc;
		},
		{} as Record<
			ReportPeriodKey,
			Array<{ subject: string; grade: number | null }>
		>,
	);

const averageNumbers = (values: Array<number | null | undefined>) => {
	const numericValues = values.filter(
		(value): value is number =>
			typeof value === 'number' && Number.isFinite(value),
	);
	if (!numericValues.length) return null;
	const sum = numericValues.reduce((total, value) => total + value, 0);
	return Number((sum / numericValues.length).toFixed(1));
};

const buildReportsFromGradeRows = ({
	grades,
	classSubjects,
	studentsToProcess,
}: {
	grades: any[];
	classSubjects: string[];
	studentsToProcess: any[];
}) => {
	const normalizedSubjects = classSubjects.map((subject) => String(subject));
	const reportsByStudentId = new Map<string, StudentSemesterReport>();

	const ensureStudentReport = (studentId: string, studentName = '') => {
		const existingReport = reportsByStudentId.get(studentId);
		if (existingReport) {
			if (!existingReport.studentName && studentName) {
				existingReport.studentName = studentName;
			}
			return existingReport;
		}

		const periods = createPeriodBuckets(normalizedSubjects);
		const firstSemesterAverage: Record<string, number | null> = {};
		const secondSemesterAverage: Record<string, number | null> = {};
		normalizedSubjects.forEach((subject) => {
			firstSemesterAverage[subject] = null;
			secondSemesterAverage[subject] = null;
		});

		const report: StudentSemesterReport = {
			studentId,
			studentName,
			periods,
			firstSemesterAverage,
			secondSemesterAverage,
			periodAverages: {
				first: null,
				second: null,
				third: null,
				third_period_exam: null,
				fourth: null,
				fifth: null,
				sixth: null,
				six_period_exam: null,
				firstSemesterAverage: null,
				secondSemesterAverage: null,
			},
			yearlyAverage: null,
			ranks: {
				first: null,
				second: null,
				third: null,
				third_period_exam: null,
				fourth: null,
				fifth: null,
				sixth: null,
				six_period_exam: null,
				firstSemesterAverage: null,
				secondSemesterAverage: null,
				yearly: null,
			},
		};
		reportsByStudentId.set(studentId, report);
		return report;
	};

	const ensureSubject = (report: StudentSemesterReport, subject: string) => {
		if (
			Object.prototype.hasOwnProperty.call(report.firstSemesterAverage, subject)
		) {
			return;
		}
		REPORT_PERIOD_KEYS.forEach((periodKey) => {
			report.periods[periodKey].push({ subject, grade: null });
		});
		report.firstSemesterAverage[subject] = null;
		report.secondSemesterAverage[subject] = null;
	};

	studentsToProcess.forEach((student) => {
		const studentId = normalizeStudentId(
			student?.studentId,
			student?.id,
			student?._id,
		);
		if (!studentId) return;
		const studentName = resolveStudentDisplayName(student);
		ensureStudentReport(studentId, studentName);
	});

	grades.forEach((gradeRow) => {
		const studentId = normalizeStudentId(
			gradeRow?.studentId,
			gradeRow?.id,
			gradeRow?._id,
		);
		if (!studentId) return;
		const period = normalizeReportPeriodKey(gradeRow?.period);
		if (!period) return;

		const subject = String(gradeRow?.subject || '').trim();
		if (!subject) return;

		const studentName =
			typeof gradeRow?.studentName === 'string' ? gradeRow.studentName : '';
		const report = ensureStudentReport(studentId, studentName);
		ensureSubject(report, subject);
		if (gradeRow?.ranks && typeof gradeRow.ranks === 'object') {
			Object.entries(gradeRow.ranks).forEach(([rankKey, rankValue]) => {
				if (!Object.prototype.hasOwnProperty.call(report.ranks, rankKey))
					return;
				const parsedRank = Number(rankValue);
				if (!Number.isFinite(parsedRank) || parsedRank <= 0) return;
				const currentRank = report.ranks[rankKey];
				report.ranks[rankKey] =
					typeof currentRank === 'number' && Number.isFinite(currentRank)
						? Math.min(currentRank, parsedRank)
						: parsedRank;
			});
		}
		const periodRank = Number(gradeRow?.rank);
		if (Number.isFinite(periodRank) && periodRank > 0) {
			const currentRank = report.ranks[period];
			report.ranks[period] =
				typeof currentRank === 'number' && Number.isFinite(currentRank)
					? Math.min(currentRank, periodRank)
					: periodRank;
		}
		const yearlyRank = Number(gradeRow?.yearlyRank);
		if (Number.isFinite(yearlyRank) && yearlyRank > 0) {
			const currentRank = report.ranks.yearly;
			report.ranks.yearly =
				typeof currentRank === 'number' && Number.isFinite(currentRank)
					? Math.min(currentRank, yearlyRank)
					: yearlyRank;
		}

		const subjectIndex = report.periods[period].findIndex(
			(entry) => entry.subject === subject,
		);
		if (subjectIndex === -1) return;

		const gradeValue =
			typeof gradeRow?.grade === 'number' && Number.isFinite(gradeRow.grade)
				? gradeRow.grade
				: null;
		report.periods[period][subjectIndex].grade = gradeValue;
	});

	reportsByStudentId.forEach((report) => {
		const subjects = Object.keys(report.firstSemesterAverage);
		subjects.forEach((subject) => {
			const getSubjectGrade = (period: ReportPeriodKey) =>
				report.periods[period].find((entry) => entry.subject === subject)
					?.grade ?? null;

			const p1 = getSubjectGrade('first');
			const p2 = getSubjectGrade('second');
			const p3 = getSubjectGrade('third');
			const exam1 = getSubjectGrade('third_period_exam');

			const sem1PeriodAvg = averageNumbers([p1, p2, p3]);
			report.firstSemesterAverage[subject] =
				sem1PeriodAvg !== null && exam1 !== null
					? Number(((sem1PeriodAvg + exam1) / 2).toFixed(1))
					: null;

			const p4 = getSubjectGrade('fourth');
			const p5 = getSubjectGrade('fifth');
			const p6 = getSubjectGrade('sixth');
			const exam2 = getSubjectGrade('six_period_exam');

			const sem2PeriodAvg = averageNumbers([p4, p5, p6]);
			report.secondSemesterAverage[subject] =
				sem2PeriodAvg !== null && exam2 !== null
					? Number(((sem2PeriodAvg + exam2) / 2).toFixed(1))
					: null;
		});

		REPORT_PERIOD_KEYS.forEach((periodKey) => {
			report.periodAverages[periodKey] = averageNumbers(
				report.periods[periodKey].map((entry) => entry.grade),
			);
		});

		report.periodAverages.firstSemesterAverage = averageNumbers(
			Object.values(report.firstSemesterAverage),
		);
		report.periodAverages.secondSemesterAverage = averageNumbers(
			Object.values(report.secondSemesterAverage),
		);
		report.yearlyAverage = averageNumbers([
			report.periodAverages.firstSemesterAverage,
			report.periodAverages.secondSemesterAverage,
		]);
	});

	const finalReports = Array.from(reportsByStudentId.values());

	const hasPrecomputedRanks = finalReports.some((r) =>
		Object.values(r.ranks).some((v) => v !== null),
	);

	if (!hasPrecomputedRanks && finalReports.length > 1) {
		const rankKeys = [
			'first',
			'second',
			'third',
			'third_period_exam',
			'fourth',
			'fifth',
			'sixth',
			'six_period_exam',
			'firstSemesterAverage',
			'secondSemesterAverage',
		] as const;

		rankKeys.forEach((key) => {
			const validStudents = finalReports
				.filter((r) => r.periodAverages[key] !== null)
				.map((r) => ({ id: r.studentId, score: r.periodAverages[key] as number }))
				.sort((a, b) => b.score - a.score);

			let currentRank = 1;
			validStudents.forEach((student, index) => {
				if (index > 0 && student.score < validStudents[index - 1].score) {
					currentRank = index + 1;
				}
				const report = reportsByStudentId.get(student.id);
				if (report) {
					report.ranks[key] = currentRank;
				}
			});
		});

		const validYearlyStudents = finalReports
			.filter((r) => r.yearlyAverage !== null)
			.map((r) => ({ id: r.studentId, score: r.yearlyAverage as number }))
			.sort((a, b) => b.score - a.score);

		let yearlyCurrentRank = 1;
		validYearlyStudents.forEach((student, index) => {
			if (index > 0 && student.score < validYearlyStudents[index - 1].score) {
				yearlyCurrentRank = index + 1;
			}
			const report = reportsByStudentId.get(student.id);
			if (report) {
				report.ranks.yearly = yearlyCurrentRank;
			}
		});
	}

	return finalReports;
};

interface ReportFilters {
	academicYear: string;
	session: string;
	classLevel: string;
	className: string;
	semester: 'first' | 'second' | '';
	selectedStudents: string[];
}


// --- PDF Template Helpers ---
const DEBUG_COORDS = process.env.NEXT_PUBLIC_PDF_DEBUG_COORDS === 'true';
const OFFLINE_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
type LinkValidityOption = '1d' | '2d' | '3d' | '1w' | '1m';
const LINK_VALIDITY_OPTIONS: Array<{
	value: LinkValidityOption;
	label: string;
}> = [
	{ value: '1d', label: '1 day (Default)' },
	{ value: '2d', label: '2 days' },
	{ value: '3d', label: '3 days' },
	{ value: '1w', label: '1 week' },
	{ value: '1m', label: '1 month' },
];

const padRowIndex = (index: number) => String(index + 1).padStart(2, '0');

const formatNumber = (value: number | null | undefined, decimals = 0) => {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return '-';
	}
	return value.toFixed(decimals);
};

const buildSemesterFieldMap = ({
	studentData,
	className,
	classSubjects,
	reportFilters,
}: {
	studentData: StudentSemesterReport;
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
}) => {
	const semesterLabel =
		semesterOptions.find((opt) => opt.value === reportFilters.semester)
			?.label || '';
	const reportTitle = `${
		reportFilters.classLevel || ''
	} ${semesterLabel} Report`.toLocaleUpperCase();

	const fields: Record<string, string> = {
		student_name: studentData.studentName,
		student_id: studentData.studentId,
		class_name: className || 'N/A',
		academic_year: reportFilters.academicYear,
		report_title: reportTitle.trim(),
		semester: semesterLabel, // Added semesterLabel here
		semesterLabel: semesterLabel, // Secondary camelCase option for template flexibility
		period_header_1: reportFilters.semester === 'first' ? '1st Pd' : '4th Pd',
		period_header_2: reportFilters.semester === 'first' ? '2nd Pd' : '5th Pd',
		period_header_3: reportFilters.semester === 'first' ? '3rd Pd' : '6th Pd',
		period_header_4: 'Exam',
		period_header_5: 'Average',
	};

	const getGrade = (period: string, subject: string) =>
		studentData.periods[period]?.find((s) => s.subject === subject)?.grade ??
		null;

	const isFirstSemester = reportFilters.semester === 'first';
	const isSecondSemester = reportFilters.semester === 'second';

	classSubjects.forEach((subject, index) => {
		const row = padRowIndex(index);
		fields[`subject_${row}`] = subject;
		fields[`p1_${row}`] = '';
		fields[`p2_${row}`] = '';
		fields[`p3_${row}`] = '';
		fields[`exam1_${row}`] = '';
		fields[`avg1_${row}`] = '';
		fields[`p4_${row}`] = '';
		fields[`p5_${row}`] = '';
		fields[`p6_${row}`] = '';
		fields[`exam2_${row}`] = '';
		fields[`avg2_${row}`] = '';
		fields[`year_${row}`] = '';

		if (isFirstSemester) {
			fields[`p1_${row}`] = formatNumber(getGrade('first', subject), 0);
			fields[`p2_${row}`] = formatNumber(getGrade('second', subject), 0);
			fields[`p3_${row}`] = formatNumber(getGrade('third', subject), 0);
			fields[`exam1_${row}`] = formatNumber(
				getGrade('third_period_exam', subject),
				0,
			);
			fields[`avg1_${row}`] = formatNumber(
				studentData.firstSemesterAverage[subject],
				1,
			);
		} else if (isSecondSemester) {
			fields[`p4_${row}`] = formatNumber(getGrade('fourth', subject), 0);
			fields[`p5_${row}`] = formatNumber(getGrade('fifth', subject), 0);
			fields[`p6_${row}`] = formatNumber(getGrade('sixth', subject), 0);
			fields[`exam2_${row}`] = formatNumber(
				getGrade('six_period_exam', subject),
				0,
			);
			fields[`avg2_${row}`] = formatNumber(
				studentData.secondSemesterAverage[subject],
				1,
			);
		}
	});

	fields.avg_p1 = isFirstSemester
		? formatNumber(studentData.periodAverages.first, 1)
		: '';
	fields.avg_p2 = isFirstSemester
		? formatNumber(studentData.periodAverages.second, 1)
		: '';
	fields.avg_p3 = isFirstSemester
		? formatNumber(studentData.periodAverages.third, 1)
		: '';
	fields.avg_exam1 = isFirstSemester
		? formatNumber(studentData.periodAverages.third_period_exam, 1)
		: '';
	fields.avg_sem1 = isFirstSemester
		? formatNumber(studentData.periodAverages.firstSemesterAverage, 1)
		: '';

	fields.avg_p4 = isSecondSemester
		? formatNumber(studentData.periodAverages.fourth, 1)
		: '';
	fields.avg_p5 = isSecondSemester
		? formatNumber(studentData.periodAverages.fifth, 1)
		: '';
	fields.avg_p6 = isSecondSemester
		? formatNumber(studentData.periodAverages.sixth, 1)
		: '';
	fields.avg_exam2 = isSecondSemester
		? formatNumber(studentData.periodAverages.six_period_exam, 1)
		: '';
	fields.avg_sem2 = isSecondSemester
		? formatNumber(studentData.periodAverages.secondSemesterAverage, 1)
		: '';
	fields.avg_year = '';

	fields.rank_p1 = isFirstSemester
		? formatNumber(studentData.ranks.first, 0)
		: '';
	fields.rank_p2 = isFirstSemester
		? formatNumber(studentData.ranks.second, 0)
		: '';
	fields.rank_p3 = isFirstSemester
		? formatNumber(studentData.ranks.third, 0)
		: '';
	fields.rank_exam1 = isFirstSemester
		? formatNumber(studentData.ranks.third_period_exam, 0)
		: '';
	fields.rank_sem1 = isFirstSemester
		? formatNumber(studentData.ranks.firstSemesterAverage, 0)
		: '';

	fields.rank_p4 = isSecondSemester
		? formatNumber(studentData.ranks.fourth, 0)
		: '';
	fields.rank_p5 = isSecondSemester
		? formatNumber(studentData.ranks.fifth, 0)
		: '';
	fields.rank_p6 = isSecondSemester
		? formatNumber(studentData.ranks.sixth, 0)
		: '';
	fields.rank_exam2 = isSecondSemester
		? formatNumber(studentData.ranks.six_period_exam, 0)
		: '';
	fields.rank_sem2 = isSecondSemester
		? formatNumber(studentData.ranks.secondSemesterAverage, 0)
		: '';
	fields.rank_year = '';

	fields.promotion_student_name = '';
	fields.promotion_from_grade = '';
	fields.promotion_to_grade = '';
	fields.promotion_year = '';

	return fields;
};

const LOW_SCORE_COLOR = { r: 1, g: 0, b: 0 };
const PASSING_SCORE_COLOR = { r: 0, g: 0, b: 1 };

const isGradeFieldKey = (key: string) =>
	/^(p[1-6]|exam[12]|avg[12]|year)_\d{2}$/.test(key);
const isAverageFieldKey = (key: string) => key.startsWith('avg_');
const isRankFieldKey = (key: string) => key.startsWith('rank_');

const toNumberOrNull = (value: string | number | null | undefined) => {
	if (value === null || value === undefined) return null;
	const n = Number(value);
	return Number.isNaN(n) ? null : n;
};

const getStyledPlacements = ({
	basePlacements,
	values,
}: {
	basePlacements: ReturnType<typeof buildSemesterCardPlacements>;
	values: Record<string, string | number | null | undefined>;
}) => {
	const styled = Object.fromEntries(
		Object.entries(basePlacements).map(([key, placementEntry]) => {
			const entries = Array.isArray(placementEntry)
				? placementEntry.map((placement) => ({ ...placement }))
				: [{ ...placementEntry }];
			const numeric = toNumberOrNull(values[key]);
			const isGradeLike = isGradeFieldKey(key) || isAverageFieldKey(key);
			const isRank = isRankFieldKey(key);

			const result = entries.map((placement) => {
				if (isGradeLike) {
					const next = { ...placement, font: 'bold' as const };
					if (numeric !== null) {
						next.color = numeric < 70 ? LOW_SCORE_COLOR : PASSING_SCORE_COLOR;
					}
					return next;
				}
				if (isRank) {
					return { ...placement, font: 'bold' as const };
				}
				return placement;
			});

			return [key, Array.isArray(placementEntry) ? result : result[0]];
		}),
	);

	return styled as ReturnType<typeof buildSemesterCardPlacements>;
};

const drawStudentOnPage = ({
	page,
	studentData,
	className,
	classSubjects,
	reportFilters,
	placements,
	font,
	boldFont,
}: {
	page: PDFPage;
	studentData: StudentSemesterReport;
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
	placements: ReturnType<typeof buildSemesterCardPlacements>;
	font: PDFFont;
	boldFont: PDFFont;
}) => {
	const fieldMap = buildSemesterFieldMap({
		studentData,
		className,
		classSubjects,
		reportFilters,
	});
	const styledPlacements = getStyledPlacements({
		basePlacements: placements,
		values: fieldMap,
	});
	drawTextMap({
		page,
		values: fieldMap,
		placements: styledPlacements,
		fonts: { normal: font, bold: boldFont },
		defaultSize: 9,
		debug: DEBUG_COORDS,
	});
};

const fillTemplateForStudentPair = async ({
	leftStudentData,
	rightStudentData,
	className,
	classSubjects,
	reportFilters,
	templateBytes,
	leftPlacements,
	rightPlacements,
}: {
	leftStudentData: StudentSemesterReport;
	rightStudentData?: StudentSemesterReport;
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
	templateBytes: ArrayBuffer;
	leftPlacements: ReturnType<typeof buildSemesterCardPlacements>;
	rightPlacements: ReturnType<typeof buildSemesterCardPlacements>;
}) => {
	const filledDoc = await PDFDocument.load(templateBytes);
	const [page] = filledDoc.getPages();
	const font = await filledDoc.embedFont(StandardFonts.Helvetica);
	const boldFont = await filledDoc.embedFont(StandardFonts.HelveticaBold);
	drawStudentOnPage({
		page,
		studentData: leftStudentData,
		className,
		classSubjects,
		reportFilters,
		placements: leftPlacements,
		font,
		boldFont,
	});
	if (rightStudentData) {
		drawStudentOnPage({
			page,
			studentData: rightStudentData,
			className,
			classSubjects,
			reportFilters,
			placements: rightPlacements,
			font,
			boldFont,
		});
	} else {
		// If odd student count, hide the entire right template card so the
		// last page looks like a single-student report card.
		page.drawRectangle({
			x: 296,
			y: 0,
			width: page.getWidth() - 296,
			height: page.getHeight(),
			color: rgb(1, 1, 1),
		});
	}
	return filledDoc;
};

const generateSemesterReportPdf = async ({
	studentsData,
	className,
	classSubjects,
	reportFilters,
	schoolShortName,
	school,
}: {
	studentsData: StudentSemesterReport[];
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
	schoolShortName?: string;
	school?: any;
}) => {
	const schoolName = Array.isArray(school?.name)
		? school.name.filter(Boolean).join(' ')
		: typeof school?.name === 'string'
			? school.name
			: '';

	const templateBytes = await loadReportTemplateBytes({
		reportType: 'semester',
		school: {
			shortName: schoolShortName || school?.shortName,
			host: school?.host,
			name: schoolName,
			logoUrl: school?.logoUrl,
			logoUrl2: school?.logoUrl2,
			address: Array.isArray(school?.address) ? school.address : [],
		},
		session: reportFilters.session,
		classLevel: reportFilters.classLevel,
		classSubjects,
		semester: reportFilters.semester === 'second' ? 'second' : 'first',
	});
	const templateDoc = await PDFDocument.load(templateBytes);
	const [templatePage] = templateDoc.getPages();
	const leftPlacements = buildSemesterCardPlacements({
		pageWidth: templatePage.getWidth(),
		pageHeight: templatePage.getHeight(),
		subjectCount: classSubjects.length,
		cardOffsetX: 0,
	});
	const rightPlacements = buildSemesterCardPlacements({
		pageWidth: templatePage.getWidth(),
		pageHeight: templatePage.getHeight(),
		subjectCount: classSubjects.length,
		cardOffsetX: 286.64,
	});
	const outDoc = await PDFDocument.create();

	for (let index = 0; index < studentsData.length; index += 2) {
		const leftStudentData = studentsData[index];
		const rightStudentData = studentsData[index + 1];
		const filledDoc = await fillTemplateForStudentPair({
			leftStudentData,
			rightStudentData,
			className,
			classSubjects,
			reportFilters,
			templateBytes,
			leftPlacements,
			rightPlacements,
		});
		const pages = await outDoc.copyPages(filledDoc, filledDoc.getPageIndices());
		pages.forEach((page) => outDoc.addPage(page));
	}

	return outDoc.save();
};

const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		const buffer = await res.arrayBuffer();
		const b64 = Buffer.from(buffer).toString('base64');
		const contentType = res.headers.get('content-type') || 'image/png';
		return `data:${contentType};base64,${b64}`;
	} catch {
		return null;
	}
};

function ReportContent({
	reportFilters,
	onBack,
}: {
	reportFilters: ReportFilters;
	onBack: () => void;
}) {
	const [studentsData, setStudentsData] = useState<StudentSemesterReport[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
	const [pdfGenerating, setPdfGenerating] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [serverKey, setServerKey] = useState<string | null>(null);
	const [inlineError, setInlineError] = useState(false);
	const [viewLoading, setViewLoading] = useState(false);
	const [forceInlineFallback, setForceInlineFallback] = useState(false);
	const [shareModalOpen, setShareModalOpen] = useState(false);
	const [shareLoading, setShareLoading] = useState(false);
	const [linkValidity, setLinkValidity] = useState<LinkValidityOption>('1d');
	const [shareInfo, setShareInfo] = useState<{
		url: string;
		pin: string;
		expiresAt: string;
	} | null>(null);
	const [copiedLink, setCopiedLink] = useState(false);
	const [copiedPin, setCopiedPin] = useState(false);
	const [shareNotice, setShareNotice] = useState('');
	const [resolvedSubjects, setResolvedSubjects] = useState<string[]>([]);
	const pdfUrlRef = useRef<string | null>(null);
	const resetCopiedTimeoutRef = useRef<number | null>(null);

	const school = useSchoolStore((state) => state.school);
	const currentSchool = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const gradesByAcademicYear = useSchoolStore(
		(state) => state.gradesByAcademicYear,
	);
	const gradesVersionByAcademicYear = useSchoolStore(
		(state) => state.gradesVersionByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
	const setGradesForYear = useSchoolStore((state) => state.setGradesForYear);
	const user = useAuth((state) => state.user);
	const isStudent = user?.role === 'student';
	const createdBy = useMemo(
		() => user?.id || user?._id || user?.studentId || '',
		[user],
	);

	const className = useMemo(() => {
		const classInfo = currentSchool?.classLevels?.[reportFilters.session]?.[
			reportFilters.classLevel
		]?.classes.find((c: any) => c.classId === reportFilters.className);
		return classInfo?.name || reportFilters.className;
	}, [
		currentSchool,
		reportFilters.session,
		reportFilters.classLevel,
		reportFilters.className,
	]);

	const reportFileName = useMemo(
		() =>
			`Semester_Report_${className}_${reportFilters.academicYear}_${reportFilters.semester}.pdf`,
		[className, reportFilters.academicYear, reportFilters.semester],
	);

	const handleShare = useCallback(async () => {
		if (!shareModalOpen) {
			setShareModalOpen(true);
			setShareInfo(null);
			setShareNotice('');
			return;
		}
		if (!pdfBlob || !downloadUrl) return;
		setShareLoading(true);
		try {
			const formData = new FormData();
			formData.append('fileName', reportFileName);
			formData.append('reportType', 'semester');
			formData.append('linkValidity', linkValidity);
			if (createdBy) {
				formData.append('createdBy', createdBy);
			}
			if (serverKey) {
				formData.append('cacheKey', serverKey);
			}
			formData.append('pdf', pdfBlob, reportFileName);
			const response = await fetch('/api/reports/share', {
				method: 'POST',
				body: formData,
			});
			if (!response.ok) return;
			const data = await response.json();
			if (!data?.shareUrl || !data?.pin) return;
			if (data.cacheKey && data.cacheKey !== serverKey) {
				setServerKey(data.cacheKey);
			}
			setShareInfo({
				url: data.shareUrl,
				pin: data.pin,
				expiresAt: data.expiresAt,
			});
			setShareModalOpen(true);
			setCopiedLink(false);
			setCopiedPin(false);
			setShareNotice('');
		} finally {
			setShareLoading(false);
		}
	}, [
		shareModalOpen,
		pdfBlob,
		downloadUrl,
		reportFileName,
		linkValidity,
		createdBy,
		serverKey,
	]);

	const schoolSubjectsRef = useRef<string[]>([]);
	const schoolSubjects = useMemo(() => {
		if (!currentSchool) return schoolSubjectsRef.current;
		const classMeta = getClassMetaById(
			currentSchool.classLevels,
			reportFilters.className,
		);
		const resolvedMeta =
			classMeta ||
			(!reportFilters.className &&
			reportFilters.session &&
			reportFilters.classLevel
				? { session: reportFilters.session, level: reportFilters.classLevel }
				: null);
		const subjects =
			currentSchool?.classLevels?.[resolvedMeta?.session || '']?.[
				resolvedMeta?.level || ''
			]?.subjects || [];
		const next = mergeSubjectNames(
			subjects.map((subject: any) =>
				typeof subject === 'string' ? subject : subject?.name,
			),
		);
		if (schoolSubjectsRef.current.join('||') === next.join('||')) {
			return schoolSubjectsRef.current;
		}
		schoolSubjectsRef.current = next;
		return next;
	}, [
		currentSchool,
		reportFilters.session,
		reportFilters.classLevel,
		reportFilters.className,
	]);
	const classSubjects = useMemo(
		() => mergeSubjectNames([...schoolSubjects, ...resolvedSubjects]),
		[schoolSubjects, resolvedSubjects],
	);
	const classSubjectsKey = useMemo(
		() => classSubjects.join('||'),
		[classSubjects],
	);
	const selectedStudentsKey = useMemo(
		() =>
			reportFilters.selectedStudents
				.map((studentId) => normalizeStudentId(studentId))
				.filter(Boolean)
				.join(','),
		[reportFilters.selectedStudents],
	);

	useEffect(() => {
		let cancelled = false;
		const fetchStudentsData = async () => {
			setLoading(true);
			setError(null);

			try {
				let studentsToProcess: any[] = [];
				const selectedStudentIds = reportFilters.selectedStudents
					.map((studentId) => normalizeStudentId(studentId))
					.filter(Boolean);
				const selectedIdsCacheKey =
					selectedStudentIds.length > 0
						? [...selectedStudentIds].sort().join(',')
						: 'all';
				const reportCacheKey = `semester:report:${reportFilters.academicYear}:${reportFilters.session}:${reportFilters.className}:${reportFilters.semester}:${selectedIdsCacheKey}`;
				const cachedReport =
					getClientCache<StudentSemesterReport[]>(reportCacheKey);
				const offline =
					typeof navigator !== 'undefined' && navigator.onLine === false;
				if (cachedReport && offline) {
					if (cancelled) return;
					setStudentsData(cachedReport);
					const cachedSubjects = mergeSubjectNames([
						...schoolSubjects,
						...collectSemesterReportSubjects(cachedReport),
					]);
					setResolvedSubjects((prev) =>
						prev.join('||') === cachedSubjects.join('||')
							? prev
							: cachedSubjects,
					);
					setLoading(false);
					return;
				}

				if (isStudent && user) {
					studentsToProcess = [
						{
							studentId: normalizeStudentId(user.studentId, user.id, user._id),
							firstName: user.firstName,
							middleName: user.middleName,
							lastName: user.lastName,
						},
					];
				} else {
					const cachedUsers = getScopedAcademicYearValue(
						usersByAcademicYear,
						reportFilters.academicYear,
					).value;
					if (cachedUsers?.students?.length) {
						const filtered = cachedUsers.students.filter(
							(student: any) =>
								getStudentClassIdForYear(
									student,
									reportFilters.academicYear,
								) === reportFilters.className,
						);
						const mapped = filtered.map((student: any) => ({
							studentId: normalizeStudentId(
								student.studentId,
								student.id,
								student._id,
							),
							name: resolveStudentDisplayName(student),
							firstName: student.firstName,
							middleName: student.middleName,
							lastName: student.lastName,
						}));
						if (selectedStudentIds.length > 0) {
							studentsToProcess = mapped.filter((student: any) =>
								selectedStudentIds.includes(student.studentId),
							);
						} else {
							studentsToProcess = mapped;
						}
					}
					if (studentsToProcess.length === 0) {
						const cacheKey = `semester:students:${reportFilters.academicYear}:${reportFilters.className}`;
						const cached = getClientCache<any[]>(cacheKey);
						if (cached) {
							const mappedCached = cached.map((student: any) => ({
								...student,
								studentId: normalizeStudentId(
									student.studentId,
									student.id,
									student._id,
								),
								name: resolveStudentDisplayName(student),
							}));
							if (selectedStudentIds.length > 0) {
								studentsToProcess = mappedCached.filter((student: any) =>
									selectedStudentIds.includes(student.studentId),
								);
							} else {
								studentsToProcess = mappedCached;
							}
						} else {
							if (offline) {
								// Continue. We'll derive student roster from cached grades below.
							} else {
								const studentsResponse = await fetch(
									`/api/users?classId=${reportFilters.className}&role=student&academicYear=${reportFilters.academicYear}`,
									{ cache: 'no-store' },
								);
								if (!studentsResponse.ok)
									throw new Error('Failed to fetch students');
								const studentsResult = await studentsResponse.json();
								if (!studentsResult.success || !studentsResult.data) {
									throw new Error('Invalid student data format');
								}

								setUsersForYear(
									reportFilters.academicYear,
									{
										students: Array.isArray(studentsResult.data)
											? studentsResult.data
											: [],
									},
									{ merge: true },
								);

								const mapped = studentsResult.data.map((student: any) => ({
									studentId: normalizeStudentId(
										student.studentId,
										student.id,
										student._id,
									),
									name: resolveStudentDisplayName(student),
									firstName: student.firstName,
									middleName: student.middleName,
									lastName: student.lastName,
								}));
								setClientCache(cacheKey, mapped, OFFLINE_CACHE_TTL_MS);

								if (selectedStudentIds.length > 0) {
									studentsToProcess = mapped.filter((student: any) =>
										selectedStudentIds.includes(student.studentId),
									);
								} else {
									studentsToProcess = mapped;
								}
							}
						}
					}
				}

				const params = new URLSearchParams({
					classId: reportFilters.className,
					academicYear: reportFilters.academicYear,
					session: reportFilters.session,
				});
				if (reportFilters.semester) {
					params.append('semester', reportFilters.semester);
				}

				if (selectedStudentIds.length > 0) {
					params.append('studentIds', selectedStudentIds.join(','));
				}

				let gradesData: any = { success: true, data: { report: [] } };
				const gradesCacheBaseKey = `semester:grades:${reportFilters.academicYear}:${reportFilters.session}:${reportFilters.className}:${reportFilters.semester}`;
				const gradesCacheKey = `${gradesCacheBaseKey}:${selectedIdsCacheKey}`;
				const cachedGrades =
					getClientCache<any>(gradesCacheKey) ??
					getClientCache<any>(`${gradesCacheBaseKey}:all`);
				const scopedGrades = getScopedAcademicYearValue(
					gradesByAcademicYear,
					reportFilters.academicYear,
				).value;
				const hasScopedGradesVersion =
					typeof getScopedAcademicYearValue(
						gradesVersionByAcademicYear,
						reportFilters.academicYear,
					).value === 'string';
				const canUseScopedGrades =
					Array.isArray(scopedGrades) &&
					scopedGrades.length > 0 &&
					(offline || hasScopedGradesVersion);

				const selectedIdsSet =
					selectedStudentIds.length > 0 ? new Set(selectedStudentIds) : null;
				if (canUseScopedGrades) {
					const filteredStoreGrades = scopedGrades.filter((grade: any) => {
						const gradeYear = String(grade?.academicYear || '').trim();
						return (
							grade?.classId === reportFilters.className &&
							areAcademicYearsEqual(gradeYear, reportFilters.academicYear)
						);
					});
				gradesData = {
					success: true,
					data: { grades: filteredStoreGrades },
				};
			} else if (cachedGrades) {
				gradesData = cachedGrades;
			} else if (offline) {
				throw new Error(
					'No cached grades found for offline semester report generation.',
				);
			} else {
					try {
						const gradesResponse = await fetch(
							`/api/grades?${params.toString()}`,
							{ cache: 'no-store' },
						);
						if (gradesResponse.ok) {
							gradesData = await gradesResponse.json();
							if (Array.isArray(gradesData?.data?.grades)) {
								const existingScopedGrades = getScopedAcademicYearValue(
									gradesByAcademicYear,
									reportFilters.academicYear,
								).value;
								if (
									!areGradeRowsEquivalent(
										existingScopedGrades,
										gradesData.data.grades,
									)
								) {
									setGradesForYear(
										reportFilters.academicYear,
										gradesData.data.grades,
									);
								}
							}
							setClientCache(gradesCacheKey, gradesData, OFFLINE_CACHE_TTL_MS);
							if (selectedIdsCacheKey === 'all') {
								setClientCache(
									`${gradesCacheBaseKey}:all`,
									gradesData,
									OFFLINE_CACHE_TTL_MS,
								);
							}
						} else {
							const errorData = await gradesResponse.json();
							throw new Error(errorData.message || 'Failed to fetch grades');
						}
					} catch (fetchErr) {
						if (cachedGrades) {
							gradesData = cachedGrades;
						} else {
							throw fetchErr;
						}
					}
				}

				let existingReports: any[] = [];
				if (Array.isArray(gradesData.data?.report)) {
					existingReports = gradesData.data.report;
				} else if (
					gradesData.data?.report &&
					typeof gradesData.data.report === 'object'
				) {
					existingReports = [gradesData.data.report];
				} else if (Array.isArray(gradesData.data?.grades)) {
					existingReports = buildReportsFromGradeRows({
						grades: gradesData.data.grades,
						classSubjects: schoolSubjects,
						studentsToProcess,
					});
				}
				if (selectedIdsSet) {
					existingReports = existingReports.filter((report: any) => {
						const reportStudentId = normalizeStudentId(
							report?.studentId,
							report?.id,
							report?._id,
						);
						return selectedIdsSet.has(reportStudentId);
					});
				}
				const fetchedSubjects = mergeSubjectNames([
					...schoolSubjects,
					...collectSemesterReportSubjects(existingReports),
				]);
				const subjectsForReport =
					fetchedSubjects.length > 0 ? fetchedSubjects : schoolSubjects;
				setResolvedSubjects((prev) =>
					prev.join('||') === fetchedSubjects.join('||')
						? prev
						: fetchedSubjects,
				);

				if (studentsToProcess.length === 0 && existingReports.length > 0) {
					studentsToProcess = existingReports
						.map((report: any) => {
							const studentId = normalizeStudentId(
								report?.studentId,
								report?.id,
								report?._id,
							);
							if (!studentId) return null;
							const studentName =
								typeof report?.studentName === 'string'
									? report.studentName.trim()
									: '';
							return {
								studentId,
								name: studentName || studentId,
								firstName: studentName || studentId,
								middleName: '',
								lastName: '',
							};
						})
						.filter(Boolean) as any[];
				}

				const reportData = await Promise.all(
					studentsToProcess.map(async (student: any) => {
						const studentId = normalizeStudentId(
							student.studentId,
							student.id,
							student._id,
						);
						const existingReport = existingReports.find(
							(report: any) =>
								normalizeStudentId(report.studentId, report.id, report._id) ===
								studentId,
						);
						const studentName = resolveStudentDisplayName(
							student,
							typeof existingReport?.studentName === 'string'
								? existingReport.studentName
								: '',
						);

						const periods: Record<
							string,
							Array<{ subject: string; grade: number | null }>
						> = {
							first: subjectsForReport.map((subject) => ({
								subject,
								grade: null,
							})),
							second: subjectsForReport.map((subject) => ({
								subject,
								grade: null,
							})),
							third: subjectsForReport.map((subject) => ({
								subject,
								grade: null,
							})),
							third_period_exam: subjectsForReport.map((subject) => ({
								subject,
								grade: null,
							})),
							fourth: subjectsForReport.map((subject) => ({
								subject,
								grade: null,
							})),
							fifth: subjectsForReport.map((subject) => ({
								subject,
								grade: null,
							})),
							sixth: subjectsForReport.map((subject) => ({
								subject,
								grade: null,
							})),
							six_period_exam: subjectsForReport.map((subject) => ({
								subject,
								grade: null,
							})),
						};

						const firstSemesterAverage: Record<string, number | null> = {};
						const secondSemesterAverage: Record<string, number | null> = {};
						const periodAverages: Record<string, number | null> = {
							first: null,
							second: null,
							third: null,
							third_period_exam: null,
							fourth: null,
							fifth: null,
							sixth: null,
							six_period_exam: null,
							firstSemesterAverage: null,
							secondSemesterAverage: null,
						};
						const ranks: Record<string, number | null> = {
							first: null,
							second: null,
							third: null,
							third_period_exam: null,
							fourth: null,
							fifth: null,
							sixth: null,
							six_period_exam: null,
							firstSemesterAverage: null,
							secondSemesterAverage: null,
							yearly: null,
						};

						subjectsForReport.forEach((subject) => {
							const subjectName = subject;
							firstSemesterAverage[subjectName] = null;
							secondSemesterAverage[subjectName] = null;
						});
						let yearlyAverage: number | null = null;

						if (existingReport) {
							Object.keys(periods).forEach((period) => {
								if (existingReport.periods[period]) {
									existingReport.periods[period].forEach((gradeEntry: any) => {
										const subjectIndex = periods[period].findIndex(
											(item) => item.subject === gradeEntry.subject,
										);
										if (subjectIndex !== -1) {
											periods[period][subjectIndex].grade = gradeEntry.grade;
										}
									});
								}
							});
							Object.assign(
								firstSemesterAverage,
								existingReport.firstSemesterAverage || {},
							);
							Object.assign(
								secondSemesterAverage,
								existingReport.secondSemesterAverage || {},
							);
							Object.assign(
								periodAverages,
								existingReport.periodAverages || {},
							);
							Object.assign(ranks, existingReport.ranks || {});
							yearlyAverage = existingReport.yearlyAverage;
						}

						return {
							studentId,
							studentName,
							periods,
							firstSemesterAverage,
							secondSemesterAverage,
							periodAverages,
							yearlyAverage,
							ranks,
						};
					}),
				);

				setStudentsData(reportData);
				setClientCache(reportCacheKey, reportData, OFFLINE_CACHE_TTL_MS);
				if (!cancelled) setLoading(false);
			} catch (err: any) {
				console.error('Error fetching report data:', err);
				if (!cancelled) {
					setError(err.message || 'Failed to load report data');
					setLoading(false);
				}
			}
		};

		fetchStudentsData();
		return () => {
			cancelled = true;
		};
	}, [
		reportFilters.academicYear,
		reportFilters.className,
		reportFilters.session,
		reportFilters.semester,
		selectedStudentsKey,
		user?.studentId,
		user?.id,
		user?._id,
		user?.firstName,
		user?.middleName,
		user?.lastName,
		schoolSubjects,
		setUsersForYear,
		setGradesForYear,
		isStudent,
	]);

	useEffect(() => {
		if (!studentsData.length || loading || error) {
			if (pdfUrlRef.current) {
				URL.revokeObjectURL(pdfUrlRef.current);
				pdfUrlRef.current = null;
			}
			setPdfUrl(null);
			setDownloadUrl(null);
			setPdfBlob(null);
			setServerKey(null);
			setInlineError(false);
			return;
		}

		let cancelled = false;
		setPdfGenerating(true);
		const isIOS =
			typeof navigator !== 'undefined' &&
			/iPad|iPhone|iPod/.test(navigator.userAgent);

		Promise.all([
			school?.logoUrl
				? fetchImageAsBase64(school.logoUrl)
				: Promise.resolve(null),
			school?.logoUrl2
				? fetchImageAsBase64(school.logoUrl2)
				: Promise.resolve(null),
		])
			.then(([logoUrl, logoUrl2]) =>
				generateSemesterReportPdf({
					studentsData,
					className,
					classSubjects,
					reportFilters,
					schoolShortName: school?.shortName,
					school: {
						...school,
						logoUrl: logoUrl ?? undefined,
						logoUrl2: logoUrl2 ?? undefined,
					},
				}),
			)
			.then((pdfBytes) => {
				if (cancelled) return;
				const blob = new Blob([pdfBytes], { type: 'application/pdf' });
				if (pdfUrlRef.current) {
					URL.revokeObjectURL(pdfUrlRef.current);
				}
				const objectUrl = URL.createObjectURL(blob);
				pdfUrlRef.current = objectUrl;
				setDownloadUrl(objectUrl);
				setPdfBlob(blob);
				setServerKey(null);
				setInlineError(false);
				if (isIOS) {
					const reader = new FileReader();
					reader.onloadend = () => {
						if (cancelled) return;
						setPdfUrl(
							typeof reader.result === 'string' ? reader.result : objectUrl,
						);
					};
					reader.readAsDataURL(blob);
				} else {
					setPdfUrl(objectUrl);
				}
			})
			.catch((err) => {
				console.error('Failed to generate PDF blob', err);
				if (!cancelled) {
					setPdfUrl(null);
					setError(
						err instanceof Error && err.message
							? err.message
							: 'Failed to generate PDF. Please verify the template.',
					);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setPdfGenerating(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [
		studentsData,
		className,
		classSubjectsKey,
		reportFilters,
		school,
		school?.shortName,
		loading,
		error,
	]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const media = window.matchMedia('(max-width: 768px)');
		const apply = () => setForceInlineFallback(media.matches);
		apply();
		if (media.addEventListener) {
			media.addEventListener('change', apply);
			return () => media.removeEventListener('change', apply);
		}
		media.addListener(apply);
		return () => media.removeListener(apply);
	}, []);

	const handleView = useCallback(() => {
		const targetUrl = downloadUrl || pdfUrl;
		if (!targetUrl) return;
		setViewLoading(true);
		try {
			const popup = window.open(targetUrl, '_blank', 'noopener,noreferrer');
			if (!popup) {
				window.location.assign(targetUrl);
			}
		} finally {
			setViewLoading(false);
		}
	}, [downloadUrl, pdfUrl]);

	const handleDownload = useCallback(async () => {
		if (!downloadUrl) return;
		setDownloading(true);
		try {
			const a = document.createElement('a');
			a.href = downloadUrl;
			a.download = reportFileName;
			document.body.appendChild(a);
			a.click();
			a.remove();
		} finally {
			setDownloading(false);
		}
	}, [downloadUrl, reportFileName]);

	if (loading) {
		return <PageLoading fullScreen={false} variant="minimal" size="lg" />;
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] py-10">
				<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6 text-center">
					<h2 className="text-lg font-semibold mb-4 text-destructive">Error</h2>
					<p className="text-muted-foreground mb-6">{error}</p>
					<button
						type="button"
						onClick={onBack}
						className="px-4 py-2 bg-primary text-primary-foreground rounded"
					>
						← Back to Filter
					</button>
				</div>
			</div>
		);
	}

	if (studentsData.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] py-10">
				<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6 text-center">
					<h2 className="text-lg font-semibold mb-4">No Student Found</h2>
					<p className="text-muted-foreground mb-6">
						No student found matching the selected filters.
					</p>
					<button
						type="button"
						onClick={onBack}
						className="px-4 py-2 bg-primary text-primary-foreground rounded"
					>
						← Back to Filter
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full h-screen bg-background flex flex-col">
			<div className="flex justify-between items-center px-8 py-4 gap-2 flex-wrap">
				<button
					type="button"
					onClick={onBack}
					className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm"
				>
					← Back to Filter
				</button>
				{isStudent &&
					!inlineError &&
					!forceInlineFallback &&
					!pdfGenerating && (
						<button
							type="button"
							onClick={handleShare}
							disabled={!downloadUrl || pdfGenerating || shareLoading}
							className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm inline-flex items-center gap-2"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M16 6l-4-4-4 4"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 2v14"
								/>
							</svg>
							{shareLoading ? 'Generating Link...' : 'Share Report'}
						</button>
					)}
				{!pdfGenerating && (
					<button
						type="button"
						onClick={handleDownload}
						className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm flex items-center gap-2"
						disabled={downloading || pdfGenerating || !downloadUrl}
					>
						{downloading ? <span>Downloading...</span> : 'Download Report'}
					</button>
				)}
			</div>
			<div className="flex-1">
				{pdfUrl ? (
					<div className="w-full" style={{ height: '80vh' }}>
						{inlineError || forceInlineFallback ? (
							<div className="flex items-center justify-center h-full">
								<div className="flex flex-col items-center gap-3">
									<button
										type="button"
										onClick={handleView}
										disabled={!downloadUrl || pdfGenerating || viewLoading}
										className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm inline-flex items-center gap-2"
									>
										<svg
											className="w-4 h-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
											/>
											<circle cx="12" cy="12" r="3" />
										</svg>
										{viewLoading ? 'Opening...' : 'View Report'}
									</button>
									{isStudent && !pdfGenerating && (
										<button
											type="button"
											onClick={handleShare}
											disabled={!downloadUrl || pdfGenerating || shareLoading}
											className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm inline-flex items-center gap-2"
										>
											<svg
												className="w-4 h-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"
												/>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M16 6l-4-4-4 4"
												/>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 2v14"
												/>
											</svg>
											{shareLoading ? 'Generating Link...' : 'Share Report'}
										</button>
									)}
								</div>
							</div>
						) : (
							<iframe
								title="Semester Report PDF"
								className="w-full h-full"
								style={{ border: 'none' }}
								src={pdfUrl}
								onError={() => setInlineError(true)}
							/>
						)}
					</div>
				) : (
					<div className="flex items-center justify-center h-full">
						<InlineLoading size="lg" />
					</div>
				)}
			</div>
			{shareModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
					<div className="bg-card w-full max-w-md rounded-xl border border-border shadow-xl">
						<div className="flex items-center justify-between p-4 border-b border-border">
							<h5 className="text-lg font-semibold text-foreground">
								Share Semester Report
							</h5>
							<button
								type="button"
								onClick={() => setShareModalOpen(false)}
								className="p-2 rounded-full hover:bg-muted transition-colors"
							>
								<svg
									className="h-4 w-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
						<div className="p-4 space-y-4">
							<div className="rounded-lg border border-border bg-muted/40 p-3">
								<p className="text-xs text-muted-foreground mb-1">
									Link validity
								</p>
								<select
									value={linkValidity}
									onChange={(e) =>
										setLinkValidity(e.target.value as LinkValidityOption)
									}
									className="w-full border border-border px-2 py-2 rounded bg-background text-foreground text-sm"
								>
									{LINK_VALIDITY_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>
							{shareInfo && (
								<>
									<div>
										<p className="text-sm text-muted-foreground">
											Expires on{' '}
											{new Date(shareInfo.expiresAt).toLocaleString()}.
										</p>
									</div>
									<div className="rounded-lg border border-border bg-muted/40 p-3">
										<p className="text-xs text-muted-foreground mb-1">
											Share Link
										</p>
										<p className="text-sm break-all">{shareInfo.url}</p>
										<button
											type="button"
											onClick={async () => {
												try {
													await navigator.clipboard.writeText(shareInfo.url);
													setShareNotice('Link copied.');
													setCopiedLink(true);
													if (resetCopiedTimeoutRef.current) {
														window.clearTimeout(resetCopiedTimeoutRef.current);
													}
													resetCopiedTimeoutRef.current = window.setTimeout(
														() => {
															setCopiedLink(false);
															setShareNotice('');
														},
														2000,
													);
												} catch {
													setShareNotice('Copy failed.');
												}
											}}
											className="mt-2 px-3 py-1.5 text-xs rounded border border-border hover:bg-muted"
										>
											{copiedLink ? (
												<span className="inline-flex items-center gap-1">
													<span className="text-green-600">✓</span>
													<span>Copied</span>
												</span>
											) : (
												'Copy Link'
											)}
										</button>
									</div>
									<div className="rounded-lg border border-border bg-muted/40 p-3">
										<p className="text-xs text-muted-foreground mb-1">PIN</p>
										<p className="text-2xl font-semibold tracking-widest">
											{shareInfo.pin}
										</p>
										<button
											type="button"
											onClick={async () => {
												try {
													await navigator.clipboard.writeText(shareInfo.pin);
													setShareNotice('PIN copied.');
													setCopiedPin(true);
													if (resetCopiedTimeoutRef.current) {
														window.clearTimeout(resetCopiedTimeoutRef.current);
													}
													resetCopiedTimeoutRef.current = window.setTimeout(
														() => {
															setCopiedPin(false);
															setShareNotice('');
														},
														2000,
													);
												} catch {
													setShareNotice('Copy failed.');
												}
											}}
											className="mt-2 px-3 py-1.5 text-xs rounded border border-border hover:bg-muted"
										>
											{copiedPin ? (
												<span className="inline-flex items-center gap-1">
													<span className="text-green-600">✓</span>
													<span>Copied</span>
												</span>
											) : (
												'Copy PIN'
											)}
										</button>
									</div>
									{shareNotice && (
										<p className="text-xs text-muted-foreground">
											{shareNotice}
										</p>
									)}
									<div className="rounded-lg border border-border bg-muted/30 p-3">
										<div className="flex items-center justify-between mb-2">
											<p className="text-xs text-muted-foreground">
												Share on social media
											</p>
											<button
												type="button"
												onClick={() => {
													if (navigator.share) {
														navigator.share({
															title: 'Semester Report',
															text: `PIN: ${shareInfo.pin}`,
															url: shareInfo.url,
														});
													}
												}}
												className="px-2 py-1 text-[11px] rounded border border-border hover:bg-muted"
											>
												Share via
											</button>
										</div>
										<div className="flex flex-wrap gap-2">
											{[
												{
													label: 'WhatsApp',
													Icon: MessageCircle,
													build: () =>
														`https://wa.me/?text=${encodeURIComponent(
															`Semester report link: ${shareInfo.url} | PIN: ${shareInfo.pin}`,
														)}`,
												},
												{
													label: 'Facebook',
													Icon: Facebook,
													build: () =>
														`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
															shareInfo.url,
														)}&quote=${encodeURIComponent(`PIN: ${shareInfo.pin}`)}`,
												},
												{
													label: 'Messenger',
													Icon: MessagesSquare,
													build: () =>
														`fb-messenger://share/?link=${encodeURIComponent(
															shareInfo.url,
														)}&app_id=${encodeURIComponent(
															process.env.NEXT_PUBLIC_FB_APP_ID || '',
														)}&ref=${encodeURIComponent(`PIN: ${shareInfo.pin}`)}`,
												},
												{
													label: 'X',
													Icon: Twitter,
													build: () =>
														`https://twitter.com/intent/tweet?text=${encodeURIComponent(
															`Semester report link: ${shareInfo.url} | PIN: ${shareInfo.pin}`,
														)}`,
												},
												{
													label: 'Telegram',
													Icon: Send,
													build: () =>
														`https://t.me/share/url?url=${encodeURIComponent(
															shareInfo.url,
														)}&text=${encodeURIComponent(`PIN: ${shareInfo.pin}`)}`,
												},
												{
													label: 'Email',
													Icon: Mail,
													build: () =>
														`mailto:?subject=${encodeURIComponent(
															'Semester Report',
														)}&body=${encodeURIComponent(
															`Semester report link: ${shareInfo.url}\nPIN: ${shareInfo.pin}`,
														)}`,
												},
											].map((item) => (
												<button
													key={item.label}
													type="button"
													onClick={() => window.open(item.build(), '_blank')}
													className="px-3 py-1.5 text-xs rounded border border-border hover:bg-muted inline-flex items-center gap-2"
												>
													<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted">
														<item.Icon className="h-3.5 w-3.5 text-muted-foreground" />
													</span>
													{item.label}
												</button>
											))}
										</div>
									</div>
								</>
							)}
							<div className="flex justify-end gap-2">
								{!shareInfo ? (
									<button
										type="button"
										onClick={handleShare}
										disabled={shareLoading || !downloadUrl || pdfGenerating}
										className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm disabled:opacity-50"
									>
										{shareLoading ? 'Generating Link...' : 'Generate'}
									</button>
								) : (
									<button
										type="button"
										onClick={() => {
											if (navigator.share) {
												navigator.share({
													title: 'Semester Report',
													text: `PIN: ${shareInfo.pin}`,
													url: shareInfo.url,
												});
											}
										}}
										className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm"
									>
										Share
									</button>
								)}
								<button
									type="button"
									onClick={() => setShareModalOpen(false)}
									className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm"
								>
									Done
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default function SemesterReportWrapper() {
	const [showReport, setShowReport] = useState(false);
	const [activeStudents, setActiveStudents] = useState<Student[]>([]);
	const user = useAuth((state) => state.user);
	const currentSchool = useSchoolStore((state) => state.school);
	const isStudent = user?.role == 'student';

	const studentAccessOptions = useMemo(() => {
		if (!isStudent || !currentSchool) return [];
		return getStudentAllowedAccess(user, currentSchool);
	}, [isStudent, user, currentSchool]);

	const allowedSemesters = studentAccessOptions
		.map((year: any) => year.semesters || [])
		.flat();

	const [filters, setFilters] = useState<SemesterReportFilters>({
		academicYear: '',
		semester: '',
		session: '',
		classLevel: '',
		className: '',
		selectedStudents: [],
	});

	const handleFilterSubmit = useCallback((students?: Student[]) => {
		setActiveStudents(students || []);
		setShowReport(true);
	}, []);

	const handleBack = useCallback(() => {
		setShowReport(false);
		setActiveStudents([]);
	}, []);

	// 1. Calculate the allowed semesters for the SPECIFICALLY selected year
	const allowedSemestersForSelectedYear = useMemo(() => {
		if (!isStudent) return [];

		const currentYearAccess = studentAccessOptions.find((opt: any) =>
			areAcademicYearsEqual(opt.academicYear, filters.academicYear),
		);
		return currentYearAccess?.semesters || [];
	}, [isStudent, studentAccessOptions, filters.academicYear]);

	// 2. Update your filterConfig to filter the options array
	const filterConfig: FilterConfig<SemesterReportFilters> = useMemo(
		() => ({
			gradeLevelField: 'classLevel',
			nonStudentViewTitle: 'Filter Semester Reports',
			studentViewTitle: 'My Semester Report',
			extraFilter: {
				field: 'semester',
				label: 'Semester',

				options: semesterOptions
					// Filter the base options to only include what the student has access to
					.filter(
						(s) =>
							!isStudent || allowedSemestersForSelectedYear.includes(s.value),
					)
					.map((s) => ({ value: s.value, label: s.label })),
			},
			// ... [Keep your other existing config properties]
		}),
		[isStudent, allowedSemestersForSelectedYear],
	);

	const filterContent = useMemo(
		() => (
			<SharedFilter
				filters={filters}
				setFilters={setFilters}
				onSubmit={handleFilterSubmit}
				config={filterConfig}
				reportType="semester"
			/>
		),
		[filters, handleFilterSubmit, filterConfig],
	);

	const reportContent = useMemo(() => {
		if (!showReport) return null;
		const filterKey = `${filters.academicYear}-${filters.semester}-${filters.session}-${filters.classLevel}-${filters.className}-${filters.selectedStudents.join(',')}`;

		return (
			<ReportContent
				key={filterKey}
				reportFilters={filters}
				activeStudents={activeStudents}
				onBack={handleBack}
			/>
		);
	}, [showReport, filters, activeStudents, handleBack]);

	if (isStudent && allowedSemesters.length === 0) {
		return (
			<AccessDenied message="You are currently not allowed to view semester reports" />
		);
	}

	return (
		<div className="w-full h-screen bg-background">
			{!showReport ? filterContent : reportContent}
		</div>
	);
}