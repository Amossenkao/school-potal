'use client';
import React, {
	useState,
	useEffect,
	useRef,
	useMemo,
	useCallback,
	useId
} from 'react';
import {
	Facebook,
	Mail,
	MessageCircle,
	MessagesSquare,
	Send,
	Twitter,
} from 'lucide-react';
import {
	PDFDocument,
	rgb,
	StandardFonts,
	type PDFFont,
	type PDFPage,
} from 'pdf-lib';
import QRCode from 'qrcode';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';
import { getStudentAllowedAccess } from '@/utils/schoolSettingsAccess';
import useAuth from '@/store/useAuth';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import {
	consumeQueuedShareRequests,
	enqueueShareRequest,
} from '@/utils/shareQueue';
import AccessDenied from '@/components/AccessDenied';
import { SharedFilter, type YearlyReportFilters } from './components/SharedFilter';
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
import {
	drawTextMap,
	type TextPlacement,
	type TextPlacementMap,
} from '@/utils/pdfText';
import {
	buildReportPage2QrPlacement,
	buildReportPage2Placements,
	buildReportPlacements,
	type RectPlacement,
} from '@/app/dashboard/shared/reportPdfLayout';
import { loadReportTemplateBytes } from '@/utils/reportTemplate';
import { areGradeRowsEquivalent } from '@/utils/gradeRows';

// --- Type Definitions ---

const InlineLoading = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => (
	<div className="-m-8">
		<PageLoading fullScreen={false} variant="minimal" size={size} />
	</div>
);

interface StudentYearlyReport {
	studentId: string;
	studentName: string;
	periods: Record<string, Array<{ subject: string; grade: number | null }>>;
	firstSemesterAverage: Record<string, number | null>;
	secondSemesterAverage: Record<string, number | null>;
	periodAverages: Record<string, number | null>;
	yearlyAverage: number | null;
	ranks: Record<string, number | null>;
	qrCodeDataUrl?: string;
	classStudentCount?: number;
}

interface Student {
	id: string;
	name: string;
	className: string;
}

// --- Constants & Utilities ---

const getCurrentAcademicYear = () => {
	const currentDate = new Date();
	const currentYear = currentDate.getFullYear();
	const currentMonth = currentDate.getMonth() + 1;

	if (currentMonth >= 8) {
		return `${currentYear}-${currentYear + 1}`;
	} else {
		return `${currentYear - 1}-${currentYear}`;
	}
};

const getDisplayClassName = (name: string) => {
	// Keep kindergarten classes intact
	if (['k-i', 'k-ii', 'k-1', 'k-2'].includes(name.toLocaleLowerCase())) {
		return name;
	}

	// Remove AM/PM suffixes
	if (name.endsWith(' AM') || name.endsWith(' PM')) {
		return name.slice(0, -3);
	}

	// For classes like Grade 11-A, Grade 11-B, etc.
	if (name.includes('-')) {
		return name.split('-')[0];
	}

	return name;
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

const collectYearlyReportSubjects = (reports: any[]) => {
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
	const reportsByStudentId = new Map<string, StudentYearlyReport>();

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

		const report: StudentYearlyReport = {
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
				yearlyAverage: null,
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

	const ensureSubject = (report: StudentYearlyReport, subject: string) => {
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
		const studentName =
			buildStudentFullName(student) ||
			(typeof student?.fullName === 'string' ? student.fullName : '');
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
		const gradeClassStudentCount = Number(gradeRow?.classStudentCount);
		if (
			Number.isFinite(gradeClassStudentCount) &&
			gradeClassStudentCount > 0 &&
			(typeof report.classStudentCount !== 'number' ||
				gradeClassStudentCount > report.classStudentCount)
		) {
			report.classStudentCount = gradeClassStudentCount;
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

			// 1. First Semester: Average 1st, 2nd, and 3rd periods, then combine with the exam grade
			const firstPeriodsAvg = averageNumbers([
				getSubjectGrade('first'),
				getSubjectGrade('second'),
				getSubjectGrade('third'),
			]);
			const thirdExam = getSubjectGrade('third_period_exam');

			report.firstSemesterAverage[subject] =
				firstPeriodsAvg !== null && thirdExam !== null
					? Number(((firstPeriodsAvg + thirdExam) / 2).toFixed(1))
					: firstPeriodsAvg !== null
						? firstPeriodsAvg
						: thirdExam;

			// 2. Second Semester: Average 4th, 5th, and 6th periods, then combine with the exam grade
			const secondPeriodsAvg = averageNumbers([
				getSubjectGrade('fourth'),
				getSubjectGrade('fifth'),
				getSubjectGrade('sixth'),
			]);
			const sixExam = getSubjectGrade('six_period_exam');

			report.secondSemesterAverage[subject] =
				secondPeriodsAvg !== null && sixExam !== null
					? Number(((secondPeriodsAvg + sixExam) / 2).toFixed(1))
					: secondPeriodsAvg !== null
						? secondPeriodsAvg
						: sixExam;
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

		// 3. Yearly Average: Standard mean of the first and second semester averages
		report.yearlyAverage = averageNumbers([
			report.periodAverages.firstSemesterAverage,
			report.periodAverages.secondSemesterAverage,
		]);
		report.periodAverages.yearlyAverage = report.yearlyAverage;
	});

	const finalReports = Array.from(reportsByStudentId.values());

	// Check if ranks were already populated from grade rows (e.g., pre-computed server-side ranks)
	const hasPrecomputedRanks = finalReports.some((r) =>
		Object.values(r.ranks).some((v) => v !== null),
	);

	if (!hasPrecomputedRanks && finalReports.length > 1) {
		// --- Rank Computation Logic (fallback when no pre-computed ranks) ---
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

		// 1. Compute ranks for all periods and semesters
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

		// 2. Compute Yearly Ranks (stored directly on the report object's ranks)
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

		const totalRanked = validYearlyStudents.length;
		finalReports.forEach((r) => {
			r.classStudentCount = totalRanked;
		});
	} else {
		// Use pre-computed ranks and classStudentCount from grade rows
		finalReports.forEach((r) => {
			if (typeof r.classStudentCount !== 'number' || r.classStudentCount <= 0) {
				r.classStudentCount = finalReports.length;
			}
		});
	}

	return finalReports;
};;


export interface StudentMultiSelectProps {
	students: Student[];
	selectedStudents: string[];
	onSelectionChange: (studentIds: string[]) => void;
	/** Max pills shown in the trigger before "+N more" */
	maxVisiblePills?: number;
	/** Accessible label for the control */
	label?: string;
	/** Panel max-height in px (default 240) */
	panelMaxHeight?: number;
	className?: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
	name
		.split(' ')
		.map((p) => p[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

const getFirstName = (name: string) => name.split(' ')[0];
const getLastName = (name: string) => name.split(' ').slice(1).join(' ');

// ─── Sub-components ──────────────────────────────────────────────────────────

interface ChipProps {
	student: Student;
	isSelected: boolean;
	onToggle: (id: string) => void;
}

const StudentChip = React.memo(function StudentChip({
	student,
	isSelected,
	onToggle,
}: ChipProps) {
	return (
		<div
			role="option"
			aria-selected={isSelected}
			tabIndex={0}
			onClick={() => onToggle(student.id)}
			onKeyDown={(e) => {
				if (e.key === ' ' || e.key === 'Enter') {
					e.preventDefault();
					onToggle(student.id);
				}
			}}
			className={`flex flex-col items-start gap-0.5 p-2 rounded-md cursor-pointer relative transition-colors select-none outline-none min-w-0 border ${
				isSelected
					? 'border-primary bg-accent'
					: 'border-border bg-card'
			}`}
			onFocus={(e) =>
				(e.currentTarget.style.boxShadow =
					'0 0 0 2px hsl(var(--primary))')
			}
			onBlur={(e) => (e.currentTarget.style.boxShadow = '')}
		>
			{/* Avatar */}
			<div
				className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-medium mb-0.5 shrink-0 transition-colors ${
					isSelected
						? 'bg-primary text-primary-foreground'
						: 'bg-muted text-muted-foreground'
				}`}
				aria-hidden="true"
			>
				{getInitials(student.name)}
			</div>

			{/* Name lines */}
			<span
				className={`text-xs font-medium leading-tight truncate max-w-full ${
					isSelected ? 'text-primary' : 'text-foreground'
				}`}
			>
				{getFirstName(student.name)}
			</span>
			<span className="text-[10px] leading-tight text-muted-foreground truncate max-w-full">
				{getLastName(student.name)}
			</span>

			{/* Check mark */}
			<svg
				aria-hidden="true"
				className={`absolute top-[5px] right-1.5 transition-opacity text-primary ${
					isSelected ? 'opacity-100' : 'opacity-0'
				}`}
				width="11"
				height="11"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth={3}
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M20 6L9 17l-5-5" />
			</svg>
		</div>
	);
});

// ─── Main component ──────────────────────────────────────────────────────────

export const StudentMultiSelect = React.memo(function StudentMultiSelect({
	students,
	selectedStudents,
	onSelectionChange,
	maxVisiblePills = 3,
	label = 'Select specific students',
	panelMaxHeight = 240,
	className = '',
}: StudentMultiSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');

	const wrapperRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const panelId = useId();
	const labelId = useId();

	// ── Derived state ────────────────────────────────────────────────────────

	const selectedSet = useMemo(
		() => new Set(selectedStudents),
		[selectedStudents],
	);

	const filteredStudents = useMemo(() => {
		const q = searchTerm.toLowerCase().trim();
		if (!q) return students;
		return students.filter((s) => s.name.toLowerCase().includes(q));
	}, [students, searchTerm]);

	const filteredIds = useMemo(
		() => new Set(filteredStudents.map((s) => s.id)),
		[filteredStudents],
	);

	const selectedStudentObjects = useMemo(
		() => students.filter((s) => selectedSet.has(s.id)),
		[students, selectedSet],
	);

	const visiblePills = selectedStudentObjects.slice(0, maxVisiblePills);
	const overflowCount = selectedStudentObjects.length - maxVisiblePills;

	// ── Handlers ─────────────────────────────────────────────────────────────

	const toggle = useCallback(
		(id: string) => {
			const next = selectedSet.has(id)
				? selectedStudents.filter((sid) => sid !== id)
				: [...selectedStudents, id];
			onSelectionChange(next);
		},
		[selectedStudents, selectedSet, onSelectionChange],
	);

	const handleSelectAll = useCallback(() => {
		const nonFiltered = selectedStudents.filter((id) => !filteredIds.has(id));
		onSelectionChange([
			...new Set([...nonFiltered, ...filteredStudents.map((s) => s.id)]),
		]);
	}, [filteredStudents, selectedStudents, filteredIds, onSelectionChange]);

	const handleClear = useCallback(() => {
		onSelectionChange(selectedStudents.filter((id) => !filteredIds.has(id)));
	}, [selectedStudents, filteredIds, onSelectionChange]);

	const handleInvert = useCallback(() => {
		const nonFiltered = selectedStudents.filter((id) => !filteredIds.has(id));
		const invertedFiltered = filteredStudents
			.filter((s) => !selectedSet.has(s.id))
			.map((s) => s.id);
		onSelectionChange([...nonFiltered, ...invertedFiltered]);
	}, [
		filteredStudents,
		selectedStudents,
		selectedSet,
		filteredIds,
		onSelectionChange,
	]);

	const openPanel = useCallback(() => {
		setIsOpen(true);
		// Defer to let DOM update before focusing
		setTimeout(() => searchRef.current?.focus(), 10);
	}, []);

	const closePanel = useCallback(() => {
		setIsOpen(false);
		setSearchTerm('');
	}, []);

	const togglePanel = useCallback(() => {
		if (isOpen) closePanel();
		else openPanel();
	}, [isOpen, openPanel, closePanel]);

	// ── Outside-click & keyboard dismiss ────────────────────────────────────

	useEffect(() => {
		if (!isOpen) return;

		const onPointerDown = (e: PointerEvent) => {
			if (!wrapperRef.current?.contains(e.target as Node)) closePanel();
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				closePanel();
				triggerRef.current?.focus();
			}
		};

		document.addEventListener('pointerdown', onPointerDown, { capture: true });
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown, {
				capture: true,
			});
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [isOpen, closePanel]);

	// ── Render ───────────────────────────────────────────────────────────────

	const triggerRadius = isOpen ? '8px 8px 0 0' : '8px';

	return (
		<div className={`${className} relative w-full`} ref={wrapperRef}>
			{/* Label */}
			<label id={labelId} className="block text-sm font-medium text-foreground mb-1.5">
				{label}{' '}
				<span className="text-muted-foreground font-normal">(optional)</span>
			</label>

			{/* Trigger */}
			<button
				ref={triggerRef}
				type="button"
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				aria-controls={panelId}
				aria-labelledby={labelId}
				onClick={togglePanel}
				className={`flex items-center gap-1.5 w-full min-h-[40px] py-[5px] px-2.5 cursor-pointer text-left transition-colors outline-none box-border ${
					isOpen
						? 'rounded-t-lg border border-primary border-b-0 bg-card'
						: 'rounded-lg border border-border bg-card'
				}`}
				onFocus={(e) =>
					!isOpen &&
					(e.currentTarget.style.boxShadow =
						'0 0 0 2px hsl(var(--primary))')
				}
				onBlur={(e) => (e.currentTarget.style.boxShadow = '')}
			>
				{/* Pills row */}
				<div className="flex items-center flex-nowrap gap-1 flex-1 overflow-hidden min-w-0">
					{selectedStudentObjects.length === 0 ? (
						<span className="text-sm text-muted-foreground">
							All students included
						</span>
					) : (
						<>
							{visiblePills.map((s) => (
								<span
									key={s.id}
									className="inline-flex items-center gap-0.5 bg-accent text-primary rounded-full py-0.5 pl-1.5 pr-[7px] text-xs font-medium whitespace-nowrap shrink-0"
								>
									{getFirstName(s.name)}
									<span
										role="button"
										aria-label={`Remove ${getFirstName(s.name)}`}
										tabIndex={0}
										onClick={(e) => {
											e.stopPropagation();
											toggle(s.id);
										}}
										onKeyDown={(e) => {
											if (e.key === ' ' || e.key === 'Enter') {
												e.preventDefault();
												e.stopPropagation();
												toggle(s.id);
											}
										}}
										className="cursor-pointer opacity-60 text-[15px] leading-none inline-flex items-center hover:opacity-100"
									>
										×
									</span>
								</span>
							))}

							{overflowCount > 0 && (
								<span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
									+{overflowCount} more
								</span>
							)}
						</>
					)}
				</div>

				{/* Selected count badge */}
				{selectedStudentObjects.length > 0 && (
					<span className="text-[11px] font-medium text-primary bg-accent rounded-full py-px px-[7px] shrink-0 whitespace-nowrap">
						{selectedStudentObjects.length}
					</span>
				)}

				{/* Chevron */}
				<svg
					aria-hidden="true"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					className={`text-muted-foreground shrink-0 transition-transform ${
						isOpen ? 'rotate-180' : 'rotate-0'
					}`}
				>
					<path d="M6 9l6 6 6-6" />
				</svg>
			</button>

			{/* Panel */}
			{isOpen && (
				<div
					id={panelId}
					role="listbox"
					aria-multiselectable="true"
					aria-label="Students"
					className="absolute top-full left-0 right-0 z-50 bg-card border border-primary border-t-0 rounded-b-lg flex flex-col shadow-lg"
				>
					{/* Search */}
					<div className="flex items-center gap-1.5 py-[7px] px-2.5 border-b border-border">
						<svg
							aria-hidden="true"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
							strokeLinecap="round"
							strokeLinejoin="round"
							className="text-muted-foreground shrink-0"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="M21 21l-4.35-4.35" />
						</svg>

						<input
							ref={searchRef}
							type="text"
							placeholder="Search by name…"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							aria-label="Search students"
							className="flex-1 border-none bg-transparent text-[13px] text-foreground outline-none p-0 min-w-0"
						/>

						{searchTerm && (
							<button
								type="button"
								aria-label="Clear search"
								onClick={() => {
									setSearchTerm('');
									searchRef.current?.focus();
								}}
								className="bg-transparent border-none p-0.5 cursor-pointer text-muted-foreground flex items-center shrink-0"
							>
								<svg
									width="13"
									height="13"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth={2.5}
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M18 6L6 18M6 6l12 12" />
								</svg>
							</button>
						)}
					</div>

					{/* Action bar */}
					<div className="flex items-center gap-0 py-1 px-2 border-b border-border bg-muted flex-wrap row-gap-0.5">
						{[
							{ label: 'Select all', handler: handleSelectAll },
							{ label: 'Clear', handler: handleClear },
							{ label: 'Invert', handler: handleInvert },
						].map(({ label: btnLabel, handler }, i) => (
							<React.Fragment key={btnLabel}>
								{i > 0 && (
									<span
										aria-hidden="true"
										className="w-px h-3 bg-border shrink-0 mx-0.5"
									/>
								)}
								<button
									type="button"
									onClick={handler}
									className="text-[11px] text-muted-foreground cursor-pointer py-[3px] px-[7px] rounded bg-transparent border-none transition-colors whitespace-nowrap hover:bg-card hover:text-foreground"
								>
									{btnLabel}
								</button>
							</React.Fragment>
						))}

						<span className="ml-auto text-[11px] text-muted-foreground pl-1 whitespace-nowrap">
							{searchTerm
								? `${filteredStudents.length} of ${students.length}`
								: `${selectedStudents.length} selected`}
						</span>
					</div>

					{/* Student grid — scrollable */}
					<div
						className={`${
							filteredStudents.length > 0
								? 'grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-1 p-2'
								: 'block'
						} overflow-y-auto`}
						style={{ maxHeight: `${panelMaxHeight}px`, WebkitOverflowScrolling: 'touch' }}
					>
						{filteredStudents.length > 0 ? (
							filteredStudents.map((student) => (
								<StudentChip
									key={student.id}
									student={student}
									isSelected={selectedSet.has(student.id)}
									onToggle={toggle}
								/>
							))
						) : (
							<p className="text-center py-6 px-4 text-[13px] text-muted-foreground m-0">
								No students match &ldquo;{searchTerm}&rdquo;
							</p>
						)}
					</div>
				</div>
			)}

			{/* Footer: summary when closed */}
			{!isOpen && selectedStudentObjects.length > 0 && (
				<p className="mt-1.5 text-xs text-muted-foreground">
					{selectedStudentObjects.length <= 3
						? selectedStudentObjects.map((s) => getFirstName(s.name)).join(', ')
						: `${selectedStudentObjects.length} students selected`}
				</p>
			)}
		</div>
	);
});


type ReportFilters = YearlyReportFilters;

// Reusable toggle — drop this just above FilterContent or in a shared ui file
function Toggle({
	id,
	checked,
	onChange,
	label,
}: {
	id: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
}) {
	return (
		<label htmlFor={id} className="flex items-center gap-3 cursor-pointer select-none">
			<div className="relative">
				<input
					id={id}
					type="checkbox"
					checked={checked}
					onChange={(e) => onChange(e.target.checked)}
					className="sr-only"
				/>
				<div
					className={`w-10 h-6 rounded-full transition-colors duration-200 ${
						checked ? 'bg-primary' : 'bg-muted'
					}`}
				/>
				<div
					className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
						checked ? 'translate-x-4' : 'translate-x-0'
					}`}
				/>
			</div>
			<span className="text-sm font-medium">{label}</span>
		</label>
	);
}

// --- PDF Template Helpers ---
const DEBUG_COORDS = process.env.NEXT_PUBLIC_PDF_DEBUG_COORDS === 'true';
const OFFLINE_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const YEARLY_REPORT_PREFS_NAMESPACE = 'yearlyReportPreferences';
const loadYearlyReportPrefs = (
	academicYear?: string,
): Record<string, any> => {
	try {
		if (academicYear) {
			const scopedKey = `${YEARLY_REPORT_PREFS_NAMESPACE}:${academicYear}`;
			const raw = localStorage.getItem(scopedKey);
			if (raw) return JSON.parse(raw);
		}
	} catch {}
	return {};
};

const saveYearlyReportPrefs = (
	prefs: Record<string, any>,
	academicYear?: string,
) => {
	try {
		if (academicYear) {
			const scopedKey = `${YEARLY_REPORT_PREFS_NAMESPACE}:${academicYear}`;
			const existing = loadYearlyReportPrefs(academicYear);
			localStorage.setItem(
				scopedKey,
				JSON.stringify({ ...existing, ...prefs }),
			);
		}
	} catch {}
};

const saveClassPrefs = (
	classPrefs: Record<string, any>,
	academicYear?: string,
	classId?: string,
) => {
	try {
		if (academicYear && classId) {
			const scopedKey = `${YEARLY_REPORT_PREFS_NAMESPACE}:${academicYear}`;
			const existing = loadYearlyReportPrefs(academicYear);
			const merged = { ...(existing[classId] || {}), ...classPrefs };
			localStorage.setItem(
				scopedKey,
				JSON.stringify({ ...existing, [classId]: merged }),
			);
		}
	} catch {}
};

const formatDisplayDate = (isoDate: string): string => {
	if (!isoDate) return '';
	const date = new Date(`${isoDate}T00:00:00`);
	if (Number.isNaN(date.getTime())) return isoDate;
	return date.toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	});
};
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

const PASS_MARK = 70;
const RED_TEXT = { r: 0.85, g: 0.1, b: 0.1 };
const BLUE_TEXT = { r: 0.1, g: 0.25, b: 0.8 };
type PromotionDecision = 'promoted' | 'failed' | 'summer_school' | 'incomplete';
const PROMOTION_COLORS = {
	promoted: { r: 0.1, g: 0.25, b: 0.8 }, // Blue
	failed: { r: 0.85, g: 0.1, b: 0.1 }, // Red
	summer_school: { r: 0.9, g: 0.5, b: 0.1 }, // Orange/Amber
	incomplete: { r: 0.35, g: 0.35, b: 0.35 }, // Gray
};

const isGradeOrAverageField = (key: string) =>
	/^(p[1-6]|exam[12]|avg[12]|year)_\d{2}$/.test(key) ||
	/^avg_(p[1-6]|exam[12]|sem[12]|year)$/.test(key);

const toNumeric = (value: string | number | null | undefined) => {
	if (typeof value === 'number') return value;
	if (typeof value !== 'string') return Number.NaN;
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const resolvePromotionPassMark = (school: any) => {
	const configuredPassMark = Number(
		school?.settings?.gradingSettings?.passMark,
	);
	return Number.isFinite(configuredPassMark) && configuredPassMark > 0
		? configuredPassMark
		: PASS_MARK;
};

const sanitizeTextForPdfFont = (text: string, font: PDFFont) => {
	let sanitized = '';
	for (const char of text) {
		if (char === '\n' || char === '\r') {
			sanitized += char;
			continue;
		}
		if (char === '\t') {
			sanitized += ' ';
			continue;
		}
		try {
			font.encodeText(char);
			sanitized += char;
		} catch {
			sanitized += '?';
		}
	}
	return sanitized;
};

const buildConditionalColorPlacements = ({
	basePlacements,
	values,
}: {
	basePlacements: TextPlacementMap;
	values: Record<string, string | number | null | undefined>;
}): TextPlacementMap => {
	const placements: TextPlacementMap = { ...basePlacements };

	Object.entries(values).forEach(([key, rawValue]) => {
		if (!isGradeOrAverageField(key)) return;
		const score = toNumeric(rawValue);
		if (Number.isNaN(score)) return;

		const entry = basePlacements[key];
		if (!entry) return;

		const color = score < PASS_MARK ? RED_TEXT : BLUE_TEXT;
		placements[key] = Array.isArray(entry)
			? entry.map((p) => ({ ...p, color, font: 'bold' as const }))
			: { ...entry, color, font: 'bold' as const };
	});

	// Handle promotion statement styling based on decision
	const promotionDecision = values.promotion_decision as string;
	if (promotionDecision && basePlacements.promotion_statement) {
		const promotionColor =
			PROMOTION_COLORS[promotionDecision as keyof typeof PROMOTION_COLORS] ||
			BLUE_TEXT;
		placements.promotion_statement = {
			...basePlacements.promotion_statement,
			color: promotionColor,
			font: 'bold',
		};
	}

	return placements;
};

type PromotionStatementSegment = {
	text: string;
	font?: 'normal' | 'bold';
	underline?: boolean;
};




const normalizeClassNameForPromotion = (name?: string) => {
	if (!name) return '';
	return String(name)
		.replace(/\s*-?\s*[A-D]$/i, '')
		.trim();
};

const getClassMetaForPromotion = (classLevels: any, classId: string) => {
	if (!classLevels || !classId) return null;
	for (const [sessionName, session] of Object.entries(classLevels)) {
		if (!session || typeof session !== 'object') continue;
		for (const levelName of Object.keys(session as Record<string, unknown>)) {
			const level: any = (session as any)[levelName];
			if (!Array.isArray(level?.classes)) continue;
			const found = level.classes.find(
				(klass: any) => klass.classId === classId,
			);
			if (!found) continue;
			return {
				classId: String(found.classId || ''),
				name: String(found.name || found.classId || ''),
				session: String(sessionName),
				level: String(levelName),
				baseName: normalizeClassNameForPromotion(found.name || found.classId),
			};
		}
	}
	return null;
};

const getOrderedClassesForPromotionSession = (
	classLevels: any,
	sessionName: string,
) => {
	if (!classLevels?.[sessionName])
		return [] as Array<{
			classId: string;
			name: string;
			session: string;
			level: string;
			baseName: string;
		}>;
	const session = classLevels[sessionName];
	const ordered: Array<{
		classId: string;
		name: string;
		session: string;
		level: string;
		baseName: string;
	}> = [];
	for (const levelName of Object.keys(session)) {
		const level = session[levelName];
		if (!Array.isArray(level?.classes)) continue;
		level.classes.forEach((klass: any) => {
			const name = String(klass?.name || klass?.classId || '').trim();
			const classId = String(klass?.classId || '').trim();
			if (!classId && !name) return;
			ordered.push({
				classId,
				name: name || classId,
				session: sessionName,
				level: String(levelName),
				baseName: normalizeClassNameForPromotion(name || classId),
			});
		});
	}
	return ordered;
};

const resolveNextClassName = ({
	school,
	currentClassId,
	currentClassName,
}: {
	school: any;
	currentClassId: string;
	currentClassName: string;
}) => {
	const classLevels = school?.classLevels;
	const currentMeta = getClassMetaForPromotion(classLevels, currentClassId);

	if (!currentMeta) {
		return getDisplayClassName(currentClassName);
	}

	const ordered = getOrderedClassesForPromotionSession(
		classLevels,
		currentMeta.session,
	);

	const currentIndex = ordered.findIndex(
		(klass) => klass.classId === currentMeta.classId,
	);

	if (currentIndex === -1) {
		return getDisplayClassName(currentClassName);
	}

	let nextClass = ordered
		.slice(currentIndex + 1)
		.find((klass) => klass.baseName !== currentMeta.baseName);
	
	if (!nextClass?.name) {
		switch (school.highestLevel) {
			case "Elementary":
				return "Grade 7"
			case "Junior High":
				return "Grade 10"
		}
	}

	return getDisplayClassName(nextClass?.name || currentClassName);
};

const isCoreMathSubject = (subject: string) => {
	const normalized = subject.toLowerCase().replace(/[^a-z]/g, '');
	return normalized === 'math' || normalized.includes('mathematics');
};

const isCoreEnglishSubject = (subject: string) => {
	const normalized = subject.toLowerCase().replace(/[^a-z]/g, '');
	return normalized === 'english' || normalized.includes('english');
};

const hasIncompleteYearlyReport = (
	studentData: StudentYearlyReport,
	classSubjects: string[],
) => {
	const subjects = classSubjects.length
		? classSubjects
		: mergeSubjectNames(
				Object.values(studentData.periods).flatMap((entries) =>
					Array.isArray(entries) ? entries.map((entry) => entry.subject) : [],
				),
			);

	return subjects.some((subject) =>
		REPORT_PERIOD_KEYS.some((period) => {
			const entry = studentData.periods[period]?.find(
				(row) => row.subject === subject,
			);
			return entry?.grade === null || entry?.grade === undefined;
		}),
	);
};

const getSubjectYearlyAverage = (
	studentData: StudentYearlyReport,
	subject: string,
) => {
	const sem1Avg = studentData.firstSemesterAverage[subject];
	const sem2Avg = studentData.secondSemesterAverage[subject];
	if (sem1Avg != null && sem2Avg != null) {
		return Number(((sem1Avg + sem2Avg) / 2).toFixed(1));
	}
	return null;
};

type PromotionStatementResult = {
	decision: PromotionDecision;
	studentName: string;
	currentClass: string;
	nextClass: string;
};

const buildPromotionStatement = ({
	studentData,
	className,
	classSubjects,
	reportFilters,
	school,
}: {
	studentData: StudentYearlyReport;
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
	school: any;
	}): PromotionStatementResult => {
	
	const currentClass = getDisplayClassName(
		className || reportFilters.className,
	);
	const nextClass = resolveNextClassName({
		school,
		currentClassId: reportFilters.className,
		currentClassName: currentClass,
	});
	const studentFullName = studentData.studentName;
	const passMark = resolvePromotionPassMark(school);

	if (hasIncompleteYearlyReport(studentData, classSubjects)) {
		return {
			decision: 'incomplete',
			studentName: studentFullName,
			currentClass,
			nextClass: '',
		};
	}

	const failedSubjects = classSubjects.filter((subject) => {
		const yearlyAverage = getSubjectYearlyAverage(studentData, subject);
		return yearlyAverage !== null && yearlyAverage < passMark;
	});
	const failedMath = failedSubjects.some(isCoreMathSubject);
	const failedEnglish = failedSubjects.some(isCoreEnglishSubject);
	const failedOtherCount = failedSubjects.filter(
		(subject) => !isCoreMathSubject(subject) && !isCoreEnglishSubject(subject),
	).length;

	let decision: Exclude<PromotionDecision, 'incomplete'> = 'promoted';
	if (failedMath && failedEnglish) {
		decision = 'failed';
	} else if ((failedMath || failedEnglish) && failedOtherCount <= 1) {
		decision = 'summer_school';
	} else if ((failedMath || failedEnglish) && failedOtherCount >= 2) {
		decision = 'failed';
	} else if (failedOtherCount === 3) {
		decision = 'summer_school';
	} else if (failedOtherCount >= 4) {
		decision = 'failed';
	}


	if (decision === 'failed') {
		return {
			decision: 'failed',
			studentName: studentFullName,
			currentClass,
			nextClass: '',
		};
	}

	if (decision === 'summer_school') {
		return {
			decision: 'summer_school',
			studentName: studentFullName,
			currentClass,
			nextClass,
		};
	}

	return {
		decision: 'promoted',
		studentName: studentFullName,
		currentClass,
		nextClass,
	};
};


const generateStudentQrCodeDataUrl = async (payload: string) =>
	QRCode.toDataURL(payload, {
		errorCorrectionLevel: 'M',
		margin: 1,
		width: 256,
		color: {
			dark: '#111111',
			light: '#FFFFFF',
		},
	});

const areNumberMapsEqual = (
	a: Record<string, number | null>,
	b: Record<string, number | null>,
) => {
	if (a === b) return true;
	const aKeys = Object.keys(a);
	const bKeys = Object.keys(b);
	if (aKeys.length !== bKeys.length) return false;
	for (const key of aKeys) {
		if (a[key] !== b[key]) return false;
	}
	return true;
};

const arePeriodRowsEqual = (
	a: Array<{ subject: string; grade: number | null }>,
	b: Array<{ subject: string; grade: number | null }>,
) => {
	if (a === b) return true;
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i += 1) {
		if (a[i].subject !== b[i].subject) return false;
		if (a[i].grade !== b[i].grade) return false;
	}
	return true;
};

const arePeriodsEqual = (
	a: StudentYearlyReport['periods'],
	b: StudentYearlyReport['periods'],
) => {
	if (a === b) return true;
	const aKeys = Object.keys(a);
	const bKeys = Object.keys(b);
	if (aKeys.length !== bKeys.length) return false;
	for (const key of aKeys) {
		if (!arePeriodRowsEqual(a[key] ?? [], b[key] ?? [])) return false;
	}
	return true;
};

const areReportsEqual = (
	prev: StudentYearlyReport[],
	next: StudentYearlyReport[],
) => {
	if (prev === next) return true;
	if (prev.length !== next.length) return false;
	for (let i = 0; i < prev.length; i += 1) {
		const a = prev[i];
		const b = next[i];
		if (a.studentId !== b.studentId) return false;
		if (a.studentName !== b.studentName) return false;
		if (a.yearlyAverage !== b.yearlyAverage) return false;
		if (!arePeriodsEqual(a.periods, b.periods)) return false;
		if (!areNumberMapsEqual(a.firstSemesterAverage, b.firstSemesterAverage))
			return false;
		if (!areNumberMapsEqual(a.secondSemesterAverage, b.secondSemesterAverage))
			return false;
		if (!areNumberMapsEqual(a.periodAverages, b.periodAverages)) return false;
		if (!areNumberMapsEqual(a.ranks, b.ranks)) return false;
	}
	return true;
};

const buildYearlyFieldMap = ({
	studentData,
	className,
	classSubjects,
	reportFilters,
	school,
}: {
	studentData: StudentYearlyReport;
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
	school: any;
}) => {
	const classDisplayName = getDisplayClassName(className || '');

	const fields: Record<string, string> = {
		student_name: studentData.studentName,
		student_id: studentData.studentId,
		class_name: classDisplayName,
		academic_year: reportFilters.academicYear,
		promotion_decision: '',
		teacher_remarks: "Good"
	};
	fields.avg_label = 'Average';

	fields.rank_label = studentData.classStudentCount
		? `Rank out of ${studentData.classStudentCount}`
		: 'Rank';
	
	const promotionResult = buildPromotionStatement({
		studentData,
		className,
		classSubjects,
		reportFilters,
		school,
	});
	fields.promotion_statement = promotionResult.text;
	fields.promotion_decision = promotionResult.decision;

	const getGrade = (period: string, subject: string) =>
		studentData.periods[period]?.find((s) => s.subject === subject)?.grade ??
		null;
	const getOverallSubjectAverage = (subject: string) => {
		const sem1Avg = studentData.firstSemesterAverage[subject];
		const sem2Avg = studentData.secondSemesterAverage[subject];
		if (sem1Avg != null && sem2Avg != null) {
			return Number(((sem1Avg + sem2Avg) / 2).toFixed(1));
		}
		return null;
	};

	classSubjects.forEach((subject, index) => {
		const row = padRowIndex(index);
		fields[`subject_${row}`] = subject;
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
		fields[`year_${row}`] = formatNumber(getOverallSubjectAverage(subject), 1);
	});

	fields.avg_p1 = formatNumber(studentData.periodAverages.first, 1);
	fields.avg_p2 = formatNumber(studentData.periodAverages.second, 1);
	fields.avg_p3 = formatNumber(studentData.periodAverages.third, 1);
	fields.avg_exam1 = formatNumber(
		studentData.periodAverages.third_period_exam,
		1,
	);
	fields.avg_sem1 = formatNumber(
		studentData.periodAverages.firstSemesterAverage,
		1,
	);
	fields.rank_p1 = formatNumber(studentData.ranks.first, 0);
	fields.rank_p2 = formatNumber(studentData.ranks.second, 0);
	fields.rank_p3 = formatNumber(studentData.ranks.third, 0);
	fields.rank_exam1 = formatNumber(studentData.ranks.third_period_exam, 0);
	fields.rank_sem1 = formatNumber(studentData.ranks.firstSemesterAverage, 0);

	fields.avg_p4 = formatNumber(studentData.periodAverages.fourth, 1);
	fields.avg_p5 = formatNumber(studentData.periodAverages.fifth, 1);
	fields.avg_p6 = formatNumber(studentData.periodAverages.sixth, 1);
	fields.avg_exam2 = formatNumber(
		studentData.periodAverages.six_period_exam,
		1,
	);
	fields.avg_sem2 = formatNumber(
		studentData.periodAverages.secondSemesterAverage,
		1,
	);
	fields.avg_year = formatNumber(studentData.yearlyAverage, 1);
	fields.rank_p4 = formatNumber(studentData.ranks.fourth, 0);
	fields.rank_p5 = formatNumber(studentData.ranks.fifth, 0);
	fields.rank_p6 = formatNumber(studentData.ranks.sixth, 0);
	fields.rank_exam2 = formatNumber(studentData.ranks.six_period_exam, 0);
	fields.rank_sem2 = formatNumber(studentData.ranks.secondSemesterAverage, 0);
	fields.rank_year = formatNumber(studentData.ranks.yearly, 0);

	return fields;
};

const fillTemplateForStudent = async ({
	studentData,
	className,
	classSubjects,
	reportFilters,
	templateBytes,
	placements,
	school,
}: {
	studentData: StudentYearlyReport;
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
	templateBytes: ArrayBuffer;
	school: any;
	placements: {
		page1: ReturnType<typeof buildReportPlacements>;
		page2: TextPlacementMap;
		page2Qr: RectPlacement | null;
	};
}) => {
	const filledDoc = await PDFDocument.load(templateBytes);
	const [page1, page2] = filledDoc.getPages();

	const fieldMap = buildYearlyFieldMap({
		studentData,
		className,
		classSubjects,
		reportFilters,
		school,
	});

	const font = await filledDoc.embedFont(StandardFonts.Helvetica);
	const boldFont = await filledDoc.embedFont(StandardFonts.HelveticaBold);
	const fonts = { normal: font, bold: boldFont };

	const page1Placements = buildConditionalColorPlacements({
		basePlacements: placements.page1,
		values: fieldMap,
	});

	drawTextMap({
		page: page1,
		values: fieldMap,
		placements: page1Placements,
		fonts,
		defaultSize: 9,
		debug: DEBUG_COORDS,
	});

	if (!page2) return filledDoc;

	// --- Build promotion fields ---

	const promotionResult = buildPromotionStatement({
		studentData,
		className,
		classSubjects,
		reportFilters,
		school,
	});

	const nextClass = resolveNextClassName({
		school,
		currentClassId: reportFilters.className,
		currentClassName: fieldMap.class_name,
	});

	const isIncomplete = promotionResult.decision === 'incomplete';

	// Always set promotion_name; other fields are empty-string when incomplete
	// so drawTextMap finds a value for every placement key and doesn't throw.
	fieldMap.promotion_name = isIncomplete ? "" : promotionResult.studentName;
	fieldMap.promotion_class = isIncomplete ? '' : promotionResult.currentClass;
	fieldMap.promotion_has = isIncomplete
		? ''
		: promotionResult.decision === 'promoted'
			? 'HAS'
			: 'HAS NOT';
	fieldMap.promotion_decision_text = isIncomplete
		? ''
		: promotionResult.decision === 'promoted'
			? `PROMOTED TO ${nextClass}`
			: promotionResult.decision === 'failed'
				? `REQUIRED TO REPEAT ${promotionResult.currentClass}`
				: promotionResult.decision === 'summer_school'
					? 'REQUIRED TO ATTEND SUMMER SCHOOL'
					: '';


	// Remove legacy keys that no longer exist in placements to avoid
	// "name not found" errors in drawTextMap.
	const { promotion_statement: _s, promotion_decision: _d, ...page2Fields } = fieldMap;

	// --- Build page 2 placements ---

	const promotionColor =
		PROMOTION_COLORS[promotionResult.decision as keyof typeof PROMOTION_COLORS] ??
		BLUE_TEXT;

	const page2BasePlacements: TextPlacementMap = {
		...placements.page2,
		promotion_has: {
			...placements.page2.promotion_has,
			color: isIncomplete ? undefined : promotionColor,
			font: 'bold' as const,
		},
		promotion_decision_text: {
			...placements.page2.promotion_decision_text,
			color: isIncomplete ? undefined : promotionColor,
			font: 'bold' as const,
		},
	};

	const page2Placements = buildConditionalColorPlacements({
		basePlacements: page2BasePlacements,
		values: page2Fields,
	});

	drawTextMap({
		page: page2,
		values: page2Fields,
		placements: page2Placements,
		fonts,
		defaultSize: 9,
		debug: DEBUG_COORDS,
	});

	// --- Draw QR code (optional) ---

	if (placements.page2Qr && studentData.qrCodeDataUrl) {
		try {
			const qrBytes = await fetch(studentData.qrCodeDataUrl).then((res) =>
				res.arrayBuffer(),
			);
			const qrImage = await filledDoc.embedPng(qrBytes);
			page2.drawImage(qrImage, {
				x: placements.page2Qr.x,
				y: placements.page2Qr.y,
				width: placements.page2Qr.width,
				height: placements.page2Qr.height,
			});
		} catch {
			// QR image is optional; don't fail report generation when offline.
		}
	}

	return filledDoc;
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

export const generateYearlyReportPdf = async ({
	studentsData,
	className,
	classSubjects,
	reportFilters,
	school,
	classStudentCount,
}: {
	studentsData: StudentYearlyReport[];
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
	school: any;
	classStudentCount: number;
}) => {
	const schoolName = Array.isArray(school?.name)
		? school.name.filter(Boolean).join(' ')
		: typeof school?.name === 'string'
			? school.name
			: '';

const templateBytes = await loadReportTemplateBytes({
	reportType: 'yearly',
	school: {
		shortName: school?.shortName,
		host: school?.host,
		name: schoolName,
		logoUrl: school?.logoUrl,
		logoUrl2: school?.logoUrl2,
		address: Array.isArray(school?.address) ? school.address : [],
	},
	session: reportFilters.session,
	classLevel: reportFilters.classLevel,
	classSubjects,
	themeId: school?.settings?.reportCardThemes?.[reportFilters.classLevel],
	sponsorName: reportFilters.includeSponsorName ? reportFilters.sponsorName : '',
	includePrincipalSignature: reportFilters.includePrincipalSignature,
	principalSignatureValue: reportFilters.principalSignatureValue,
	includeDate: reportFilters.includeDate,
	dateValue: reportFilters.includeDate ? formatDisplayDate(reportFilters.dateValue) : '',
});
const templateDoc = await PDFDocument.load(templateBytes);
const [templatePage1, templatePage2] = templateDoc.getPages();

// Stamp class-level fields (sponsor name) onto the template once
const templateFont = await templateDoc.embedFont(StandardFonts.Helvetica);
const templateBoldFont = await templateDoc.embedFont(
	StandardFonts.HelveticaBold,
);
const scaleY = templatePage1.getHeight() / 595.28;

const modifiedTemplateBytes = await templateDoc.save();

const page1Placements = buildReportPlacements({
	pageWidth: templatePage1.getWidth(),
	pageHeight: templatePage1.getHeight(),
	subjectCount: classSubjects.length,
});
	const page2Placements = templatePage2
		? buildReportPage2Placements({
				pageWidth: templatePage2.getWidth(),
				pageHeight: templatePage2.getHeight(),
			})
		: {};
	const page2QrPlacement = templatePage2
		? buildReportPage2QrPlacement({
				pageWidth: templatePage2.getWidth(),
				pageHeight: templatePage2.getHeight(),
			})
		: null;
	const outDoc = await PDFDocument.create();

	for (const studentData of studentsData) {
		const filledDoc = await fillTemplateForStudent({
			studentData,
			className,
			classSubjects,
			reportFilters,
			templateBytes: modifiedTemplateBytes,
			school,
			placements: {
				page1: page1Placements,
				page2: page2Placements,
				page2Qr: page2QrPlacement,
			},
		});
		const pages = await outDoc.copyPages(filledDoc, filledDoc.getPageIndices());
		pages.forEach((page) => outDoc.addPage(page));
	}

	return outDoc.save();
};

// --- Main Report Content Component (Blank Screen Fix Implemented) ---

function ReportContent({
	reportFilters,
	onBack,
}: {
	reportFilters: ReportFilters; // Use updated interface
	onBack: () => void;
}) {
	const [studentsData, setStudentsData] = useState<StudentYearlyReport[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [downloading, setDownloading] = useState(false);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
	const [serverKey, setServerKey] = useState<string | null>(null);
	const [pdfGenerating, setPdfGenerating] = useState(false);
	const [inlineError, setInlineError] = useState(false);
	const [inlineDisabled, setInlineDisabled] = useState(false);
	const pdfUrlRef = useRef<string | null>(null);
	const [shareModalOpen, setShareModalOpen] = useState(false);
	const [shareInfo, setShareInfo] = useState<{
		url: string;
		pin: string;
		expiresAt: string;
	} | null>(null);
	const [shareNotice, setShareNotice] = useState('');
	const [shareLoading, setShareLoading] = useState(false);
	const [linkValidity, setLinkValidity] = useState<LinkValidityOption>('1d');
	const [copiedLink, setCopiedLink] = useState(false);
	const [copiedPin, setCopiedPin] = useState(false);
	const [viewLoading, setViewLoading] = useState(false);
	const [resolvedSubjects, setResolvedSubjects] = useState<string[]>([]);
	const resetCopiedTimeoutRef = useRef<number | null>(null);
	const hasReportDataRef = useRef(false);
	const showShareNotice = useCallback(
		(message: string, timeoutMs = 4000) => {
			setShareNotice(message);
			if (resetCopiedTimeoutRef.current) {
				window.clearTimeout(resetCopiedTimeoutRef.current);
			}
			resetCopiedTimeoutRef.current = window.setTimeout(() => {
				setShareNotice('');
			}, timeoutMs);
		},
		[setShareNotice],
	);

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
	const mergeGradesForYear = useSchoolStore((state) => state.mergeGradesForYear);
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
		() => `Yearly_Report_${className}_${reportFilters.academicYear}.pdf`,
		[className, reportFilters.academicYear],
	);

	useEffect(() => {
		hasReportDataRef.current = studentsData.length > 0;
	}, [studentsData.length]);

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

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const checkInlineSupport = () => {
			const isSmallScreen = window.innerWidth < 1024;
			const isMobileUA =
				typeof navigator !== 'undefined' &&
				/Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(
					navigator.userAgent,
				);
			setInlineDisabled(isSmallScreen || isMobileUA);
		};
		checkInlineSupport();
		window.addEventListener('resize', checkInlineSupport);
		return () => window.removeEventListener('resize', checkInlineSupport);
	}, []);

	const createShareLink = useCallback(
		async ({
			cacheKey,
			fileName,
			reportType,
			createdBy,
			linkValidity,
			pdfBlob,
		}: {
			cacheKey: string;
			fileName: string;
			reportType: string;
			createdBy: string;
			linkValidity: LinkValidityOption;
			pdfBlob?: Blob | null;
		}) => {
			const formData = new FormData();
			formData.append('fileName', fileName);
			formData.append('reportType', reportType);
			formData.append('linkValidity', linkValidity);
			if (createdBy) {
				formData.append('createdBy', createdBy);
			}
			if (cacheKey) {
				formData.append('cacheKey', cacheKey);
			}
			if (pdfBlob) {
				formData.append('pdf', pdfBlob, fileName);
			}
			const response = await fetch('/api/reports/share', {
				method: 'POST',
				body: formData,
			});
			if (!response.ok) return null;
			const data = await response.json();
			if (!data?.shareUrl || !data?.pin) return null;
			return {
				url: data.shareUrl as string,
				pin: data.pin as string,
				expiresAt: data.expiresAt as string,
				cacheKey: data.cacheKey as string | undefined,
			};
		},
		[],
	);

	const openShareModal = useCallback(
		(data: { url: string; pin: string; expiresAt: string }) => {
			setShareInfo(data);
			setShareModalOpen(true);
			setCopiedLink(false);
			setCopiedPin(false);
			setShareNotice('');
		},
		[setShareNotice],
	);

	const handleView = useCallback(async () => {
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

	const queueShare = useCallback(async () => {
		if (!pdfBlob) return false;
		const queuedId = await enqueueShareRequest({
			blob: pdfBlob,
			fileName: reportFileName,
			reportType: 'yearly',
			createdBy,
			linkValidity,
		});
		if (queuedId) {
			showShareNotice(
				'You are offline. Share queued and will sync once you are back online.',
			);
			return true;
		}
		showShareNotice('Unable to queue share on this device.');
		return false;
	}, [pdfBlob, reportFileName, createdBy, linkValidity, showShareNotice]);

	const handleShare = useCallback(async () => {
		if (!shareModalOpen) {
			setShareModalOpen(true);
			setShareInfo(null);
			setShareNotice('');
			return;
		}
		if (!pdfBlob || !downloadUrl) return;
		if (typeof navigator !== 'undefined' && !navigator.onLine) {
			await queueShare();
			return;
		}
		setShareLoading(true);
		try {
			const data = await createShareLink({
				cacheKey: '',
				fileName: reportFileName,
				reportType: 'yearly',
				createdBy,
				linkValidity,
				pdfBlob,
			});
			if (!data) {
				showShareNotice('Failed to create share link.');
				return;
			}
			if (data.cacheKey && data.cacheKey !== serverKey) {
				setServerKey(data.cacheKey);
			}
			openShareModal(data);
		} catch (err) {
			console.error('Failed to create share link', err);
			showShareNotice('Failed to create share link.');
		} finally {
			setShareLoading(false);
		}
	}, [
		pdfBlob,
		downloadUrl,
		shareModalOpen,
		serverKey,
		createShareLink,
		reportFileName,
		createdBy,
		linkValidity,
		queueShare,
		openShareModal,
		showShareNotice,
	]);

	const syncQueuedShares = useCallback(async () => {
		await consumeQueuedShareRequests(async (item, blob) => {
			const data = await createShareLink({
				cacheKey: '',
				fileName: item.fileName,
				reportType: item.reportType,
				createdBy: item.createdBy,
				linkValidity: (item.linkValidity || '1d') as LinkValidityOption,
				pdfBlob: blob,
			});
			return Boolean(data?.url);
		});
	}, [createShareLink]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const trySync = () => {
			if (!navigator.onLine) return;
			syncQueuedShares();
		};
		trySync();
		window.addEventListener('online', trySync);
		return () => window.removeEventListener('online', trySync);
	}, [syncQueuedShares]);

	useEffect(() => {
		const fetchStudentsData = async () => {
			const shouldShowLoading = !hasReportDataRef.current;
			if (shouldShowLoading) {
				setLoading(true);
			}
			setError(null);

			try {
				const isStudent = user?.role === 'student';
				let studentsToProcess: any[] = [];
				const selectedStudentIds = reportFilters.selectedStudents
					.map((studentId) => normalizeStudentId(studentId))
					.filter(Boolean);
				const offline =
					typeof navigator !== 'undefined' && navigator.onLine === false;

				if (isStudent && user) {
				studentsToProcess = [
					{
						studentId: normalizeStudentId(user.studentId, user.id, user._id),
						id: user.id,     
						_id: user._id,
						firstName: user.firstName,
						middleName: user.middleName,
						lastName: user.lastName,
						fullName: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
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
								studentId: normalizeStudentId(student.studentId, student.id, student._id),
								id: student.id,      // <-- ADD THIS
								_id: student._id,    // <-- ADD THIS
								firstName: student.firstName,
								middleName: student.middleName,
							lastName: student.lastName,
								fullName: student.fullName || `${student.firstName} ${student.lastName}`.trim(),
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
						const cacheKey = `yearly:students:${reportFilters.academicYear}:${reportFilters.className}`;
						const cached = getClientCache<any[]>(cacheKey);
						if (cached) {
							const mappedCached = cached.map((student: any) => ({
								...student,
								studentId: normalizeStudentId(
									student.studentId,
									student.id,
									student._id,
								),
							}));
							if (selectedStudentIds.length > 0) {
								studentsToProcess = mappedCached.filter((student: any) =>
									selectedStudentIds.includes(student.studentId),
								);
							} else {
								studentsToProcess = mappedCached;
							}
						} else if (!offline) {
							const studentsResponse = await fetch(
								`/api/users?classId=${reportFilters.className}&role=student&academicYear=${reportFilters.academicYear}`,
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
									studentId: normalizeStudentId(student.studentId, student.id, student._id),
									id: student.id,      // <-- ADD THIS
									_id: student._id,    // <-- ADD THIS
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

				const params = new URLSearchParams({
					classId: reportFilters.className,
					academicYear: reportFilters.academicYear,
					session: reportFilters.session,
				});

				if (selectedStudentIds.length > 0) {
					params.append('studentIds', selectedStudentIds.join(','));
				}

				const gradesCacheBaseKey = `yearly:grades:${reportFilters.academicYear}:${reportFilters.session}:${reportFilters.className}`;
				const selectedIdsCacheKey =
					selectedStudentIds.length > 0
						? [...selectedStudentIds].sort().join(',')
						: 'all';
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

				let gradesData: any = { success: true, data: { report: [] } };

				const selectedIdsSet =
					selectedStudentIds.length > 0 ? new Set(selectedStudentIds) : null;
			let usedScopedGrades = false;
			if (canUseScopedGrades) {
				const filteredStoreGrades = scopedGrades.filter((grade: any) => {
					const gradeYear = String(grade?.academicYear || '').trim();
					return (
						grade?.classId === reportFilters.className &&
						areAcademicYearsEqual(gradeYear, reportFilters.academicYear)
					);
				});
				if (filteredStoreGrades.length > 0) {
					gradesData = {
						success: true,
						data: { grades: filteredStoreGrades },
					};
					usedScopedGrades = true;
				}
			}
			if (!usedScopedGrades) {
				if (cachedGrades) {
					gradesData = cachedGrades;
				} else if (offline) {
					throw new Error(
						'No cached grades found for offline yearly report generation.',
					);
				} else {
					try {
						const gradesResponse = await fetch(
							`/api/grades?${params.toString()}`,
						);
						if (!gradesResponse.ok) {
							let message = 'Failed to fetch grades';
							try {
								const errorData = await gradesResponse.json();
								message = errorData?.message || message;
							} catch {
								// Keep default error message if response body is unavailable.
							}
							throw new Error(message);
						}
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
								mergeGradesForYear(
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
					} catch (fetchErr) {
						if (cachedGrades) {
							gradesData = cachedGrades;
						} else {
							throw fetchErr;
						}
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
					...collectYearlyReportSubjects(existingReports),
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
						const studentName = buildStudentFullName(student);
						const existingReport = existingReports.find(
							(report: any) =>
								normalizeStudentId(report.studentId, report.id, report._id) ===
								studentId,
						);

						const verifyId = student.id || student._id || studentId;

						const qrPayload = `${window.location.origin}/verify?id=${verifyId}&academicYear=${encodeURIComponent(reportFilters.academicYear)}`;

						const qrCodeDataUrl = await generateStudentQrCodeDataUrl(qrPayload);

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
					qrCodeDataUrl,
					classStudentCount: existingReport?.classStudentCount ?? undefined
				};
					}),
				);

				setStudentsData((prev) =>
					areReportsEqual(prev, reportData) ? prev : reportData,
				);
				// ONLY stop data loading here. The PDF generation will take over.
				setLoading(false);
			} catch (err: any) {
				console.error('Error fetching report data:', err);
				setError(err.message || 'Failed to load report data');
				setLoading(false);
			}
		};

		fetchStudentsData();
	}, [
		reportFilters.academicYear,
		reportFilters.className,
		reportFilters.session,
		reportFilters.classLevel,
		reportFilters.selectedStudents,
		user?.role,
		user?.studentId,
		user?.id,
		user?._id,
		user?.firstName,
		user?.middleName,
		user?.lastName,
		user?.fullName,
		schoolSubjects,
		className,
		setUsersForYear,
		setGradesForYear,
		mergeGradesForYear,
	]);

	// Generate the PDF using the fillable template
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
			if (resetCopiedTimeoutRef.current) {
				window.clearTimeout(resetCopiedTimeoutRef.current);
				resetCopiedTimeoutRef.current = null;
			}
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
				generateYearlyReportPdf({
					studentsData,
					className,
					classSubjects,
					reportFilters,
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
				console.error('Failed to generate PDF blob', err.message || err);
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
				if (!cancelled) setPdfGenerating(false);
			});

		return () => {
			cancelled = true;
		};
	}, [
		studentsData,
		className,
		classSubjects,
		reportFilters,
		school,
		loading,
		error,
	]);

	// Download handler
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
				{isStudent && !inlineError && !inlineDisabled && !pdfGenerating && (
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
						{shareLoading ? 'Generating Link...' : 'Share Report Card'}
					</button>
				)}
				{!pdfGenerating && (
					<button
						type="button"
						onClick={handleDownload}
						className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm flex items-center gap-2"
						disabled={downloading || pdfGenerating || !downloadUrl}
					>
						{downloading ? (
							<span>Downloading...</span>
						) : (
							<>
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
										d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								Download Report Card
							</>
						)}
					</button>
				)}
			</div>
			{shareNotice && !shareModalOpen && (
				<div className="px-8 pb-2 text-xs text-muted-foreground">
					{shareNotice}
				</div>
			)}
			<div className="flex-1">
				{pdfUrl ? (
					<div className="w-full" style={{ height: '80vh' }}>
						{inlineError || inlineDisabled ? (
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
										{viewLoading ? 'Opening...' : 'View Report Card'}
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
											{shareLoading
												? 'Generating Link...'
												: 'Share Report Card'}
										</button>
									)}
								</div>
							</div>
						) : (
							<iframe
								title="Yearly Report PDF"
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
								Share Report Card
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
															title: 'Report Card',
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
															`Report Card link: ${shareInfo.url} | PIN: ${shareInfo.pin}`,
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
															`Report Card link: ${shareInfo.url} | PIN: ${shareInfo.pin}`,
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
															'Report Card',
														)}&body=${encodeURIComponent(
															`Report Card link: ${shareInfo.url}\nPIN: ${shareInfo.pin}`,
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
													title: 'Report Card',
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

// --- Main Component ---

export default function ReportCardPage() {
	const user = useAuth((state) => state.user);
	const currentSchool = useSchoolStore((state) => state.school)
	const isStudent = user?.role == "student";
	const [filters, setFilters] = useState<ReportFilters>(() => {
		return {
			academicYear: '',
			session: '',
			classLevel: '',
			className: '',
			selectedStudents: [],
			includeSponsorName: false,
			sponsorName: '',
			includePrincipalSignature: false,
			principalSignatureValue: '',
			includeDate: false,
			dateValue: '',
		};
	});

	const studentAccessOptions = useMemo(() => {
		if (!isStudent || !currentSchool) return [];
		return getStudentAllowedAccess(user, currentSchool);
	}, [isStudent, user, currentSchool]);

	// Check if ANY of the years have yearlyReportAccess set to true
	const hasYearlyAccess = studentAccessOptions.some(
		(year: any) => year.yearlyReportAccess === true,
	);

	useEffect(() => {
		if (!filters.academicYear) return;
		const prefs = loadYearlyReportPrefs(filters.academicYear);
		setFilters((prev) => {
			const next = { ...prev };
			if (prefs.includePrincipalSignature !== undefined) next.includePrincipalSignature = prefs.includePrincipalSignature;
			if (prefs.principalSignatureValue !== undefined) next.principalSignatureValue = prefs.principalSignatureValue;
			if (prefs.includeDate !== undefined) next.includeDate = prefs.includeDate;
			if (prefs.dateValue !== undefined) next.dateValue = prefs.dateValue;
			if (filters.className) {
				const classData = prefs[filters.className] || {};
				next.includeSponsorName = classData.includeSponsorName ?? false;
				next.sponsorName = classData.sponsorName ?? '';
			} else {
				next.includeSponsorName = false;
				next.sponsorName = '';
			}
			return next;
		});
	}, [filters.academicYear, filters.className]);

	const [reportStep, setReportStep] = useState(0);

	const handleSubmitFilters = useCallback(() => {
		setReportStep(1);
	}, []);

	const handleBackToFilters = useCallback(() => {
		setReportStep(0);
	}, []);

	// Block if the user is a student and NONE of their years allow yearly access
	if (isStudent && !hasYearlyAccess) {
		return (
			<AccessDenied message="You are currently not allowed to view yearly reports" />
		);
	}

	return (
		<div className="p-4">
			{reportStep === 0 && (
				<SharedFilter<ReportFilters>
					filters={filters}
					setFilters={setFilters}
					onSubmit={handleSubmitFilters}
					reportType="yearly"
					config={{
						gradeLevelField: 'classLevel',
						filterSessionsByUser: true,
						studentViewTitle: 'My Report Card',
						nonStudentViewTitle: 'Filter Report Card',
						renderExtraFields: (f, setF) => {
							const ff = f as ReportFilters;
							return (
								ff.className && (
									<div className="bg-muted/50 rounded-lg p-3 sm:col-span-2">
										<label className="block text-sm font-medium mb-2">
											Report Options
										</label>
										<div className="flex flex-col gap-3">
											<Toggle
												id="include-sponsor-name"
												checked={!!ff.includeSponsorName}
												label="Class Sponsor Name"
												onChange={(checked) => {
													if (checked) {
														const cached = loadYearlyReportPrefs(
															ff.academicYear,
														);
														const classData = cached[ff.className] || {};
														setF((prev) => ({
															...prev,
															includeSponsorName: true,
															sponsorName:
																(prev as ReportFilters).sponsorName ||
																classData.sponsorName ||
																'',
														}));
													} else {
														setF((prev) => ({
															...prev,
															includeSponsorName: false,
														}));
													}
													saveClassPrefs(
														{ includeSponsorName: checked },
														ff.academicYear,
														ff.className,
													);
												}}
											/>
											{ff.includeSponsorName && (
												<input
													id="sponsor-name"
													type="text"
													value={ff.sponsorName}
													onChange={(e) => {
														const value = e.target.value;
														setF((prev) => ({
															...prev,
															sponsorName: value,
														}));
														saveClassPrefs(
															{ sponsorName: value },
															ff.academicYear,
															ff.className,
														);
													}}
													placeholder="e.g., Jane Doe"
													className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
												/>
											)}

											<Toggle
												id="include-principal-signature"
												checked={!!ff.includePrincipalSignature}
												label="Principal's Signature"
												onChange={(checked) => {
													if (checked) {
														const cached = loadYearlyReportPrefs(
															ff.academicYear,
														);
														setF((prev) => ({
															...prev,
															includePrincipalSignature: true,
															principalSignatureValue:
																(prev as ReportFilters)
																	.principalSignatureValue ||
																cached.principalSignatureValue ||
																'',
														}));
													} else {
														setF((prev) => ({
															...prev,
															includePrincipalSignature: false,
														}));
													}
													saveYearlyReportPrefs(
														{ includePrincipalSignature: checked },
														ff.academicYear,
													);
												}}
											/>
											{ff.includePrincipalSignature && (
												<input
													id="principal-signature-value"
													type="text"
													value={ff.principalSignatureValue}
													onChange={(e) => {
														const value = e.target.value;
														setF((prev) => ({
															...prev,
															principalSignatureValue: value,
														}));
														saveYearlyReportPrefs(
															{ principalSignatureValue: value },
															ff.academicYear,
														);
													}}
													placeholder="e.g., Pst. Emmanuel B. Tarr, Sr."
													className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
												/>
											)}

											<Toggle
												id="include-date"
												checked={!!ff.includeDate}
												label="Include Date"
												onChange={(checked) => {
													if (checked) {
														const cached = loadYearlyReportPrefs(
															ff.academicYear,
														);
														setF((prev) => ({
															...prev,
															includeDate: true,
															dateValue:
																(prev as ReportFilters).dateValue ||
																cached.dateValue ||
																'',
														}));
													} else {
														setF((prev) => ({
															...prev,
															includeDate: false,
														}));
													}
													saveYearlyReportPrefs(
														{ includeDate: checked },
														ff.academicYear,
													);
												}}
											/>
											{ff.includeDate && (
												<input
													id="date-value"
													type="date"
													value={ff.dateValue}
													onChange={(e) => {
														const value = e.target.value;
														setF((prev) => ({
															...prev,
															dateValue: value,
														}));
														saveYearlyReportPrefs(
															{ dateValue: value },
															ff.academicYear,
														);
													}}
													className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
												/>
											)}
										</div>
									</div>
								)
							);
						},
					}}
				/>
			)}
			{reportStep === 1 && (
				<ReportContent reportFilters={filters} onBack={handleBackToFilters} />
			)}
		</div>
	);
}
