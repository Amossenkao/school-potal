import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { SemesterReport } from '@/app/templates/semester/SemesterReport';
import { ReportCard } from '@/app/templates/yearly/YearlyReport';
import { THEMES } from '@/app/templates/yearly/YearlyReport';

type ReportTemplateType = 'yearly' | 'semester';
type SemesterKey = 'first' | 'second';

type TemplateSchool = {
	shortName?: string;
	host?: string;
	name?: string;
	logoUrl?: string;
	logoUrl2?: string;
	address?: string[];
};

export type DynamicTemplateRequest = {
	reportType: ReportTemplateType;
	school: TemplateSchool;
	session?: string;
	classLevel?: string;
	classSubjects: string[];
	semester?: SemesterKey;
	themeId?: string;
};

// ---------------------------------------------------------------------------
// Blank-data builders (kept for template generation — no real students yet)
// ---------------------------------------------------------------------------

const buildBlankSubjectMap = (subjects: string[]) =>
	subjects.reduce(
		(acc, subject) => {
			acc[subject] = null;
			return acc;
		},
		{} as Record<string, number | null>,
	);

const buildBlankSemesterData = (subjects: string[]) => {
	const blankMap = buildBlankSubjectMap(subjects);
	const buildRows = () =>
		subjects.map((subject) => ({ subject, grade: null as number | null }));

	return {
		studentId: '',
		studentName: '',
		periods: {
			first: buildRows(),
			second: buildRows(),
			third: buildRows(),
			third_period_exam: buildRows(),
			fourth: buildRows(),
			fifth: buildRows(),
			sixth: buildRows(),
			six_period_exam: buildRows(),
		},
		firstSemesterAverage: { ...blankMap },
		secondSemesterAverage: { ...blankMap },
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
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_THEME_ID = 'midnightSapphire';

const resolveTheme = (themeId?: string) =>
	THEMES.find((t) => t.id === (themeId ?? DEFAULT_THEME_ID)) ??
	THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;

const buildReportFilters = (semester: SemesterKey, classLevel?: string) => ({
	semester,
	classLevel,
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const generateDynamicTemplateBytes = async (
	request: DynamicTemplateRequest,
): Promise<ArrayBuffer> => {
	const {
		reportType,
		school,
		classSubjects,
		classLevel,
		semester: rawSemester,
		themeId,
	} = request;

	const safeSubjects = classSubjects.length ? classSubjects : [''];
	const semester: SemesterKey = rawSemester === 'second' ? 'second' : 'first';
	const blankStudent = buildBlankSemesterData(safeSubjects);
	// Two placeholder cards so the template preview looks representative
	const studentsData =
		reportType === 'semester'
			? [blankStudent, blankStudent] // ← needs 2 so both card regions render
			: [blankStudent];
	const activeTheme = resolveTheme(themeId);

	const document =
		reportType === 'semester' ? (
			<SemesterReport
				studentsData={studentsData}
				className=""
				classSubjects={safeSubjects}
				reportFilters={buildReportFilters(semester)}
				school={school}
			/>
		) : (
			<ReportCard
				studentsData={studentsData}
				className=""
				classSubjects={safeSubjects}
				reportFilters={buildReportFilters(semester, classLevel)}
				school={school}
				classSponsor=""
				activeTheme={activeTheme}
				themeId={activeTheme.id}
			/>
		);
	console.log('document element:', document);
	console.log('SemesterReport:', SemesterReport);
	console.log('ReportCard:', ReportCard);
	const blob = await pdf(document).toBlob();
	return blob.arrayBuffer();
};
