'use client';
import React, {
	useState,
	useEffect,
	useRef,
	useMemo,
	useCallback,
} from 'react';
import {
	Facebook,
	Mail,
	MessageCircle,
	MessagesSquare,
	Send,
	Twitter,
} from 'lucide-react';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import {
	consumeQueuedShareRequests,
	enqueueShareRequest,
} from '@/utils/shareQueue';
import AccessDenied from '@/components/AccessDenied';
import { drawTextMap, type TextPlacementMap } from '@/utils/pdfText';
import {
	buildReportPage2QrPlacement,
	buildReportPage2Placements,
	buildReportPlacements,
	type RectPlacement,
} from '@/app/dashboard/shared/reportPdfLayout';
import {
	buildReportTemplateUrl,
	DEFAULT_REPORT_TEMPLATE_URL,
	loadReportTemplateBytes,
} from '@/utils/reportTemplate';

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
}

interface Student {
	id: string;
	name: string;
	className: string;
}

// --- Constants & Utilities ---

const academicYearOptions = [
	'2025-2026',
	'2024-2025',
	'2023-2024',
	'2022-2023',
	'2021-2022',
	'2019-2020',
];

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
		? student.academicYears.find((ay: any) => ay.year === academicYear)
		: null;
	return yearEntry?.classId || student?.classId || '';
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
	[student?.firstName, student?.middleName, student?.lastName]
		.map((part) => (typeof part === 'string' ? part.trim() : ''))
		.filter(Boolean)
		.join(' ');

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
		if (Object.prototype.hasOwnProperty.call(report.firstSemesterAverage, subject)) {
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
			(typeof student?.studentName === 'string' ? student.studentName : '');
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
				report.periods[period].find((entry) => entry.subject === subject)?.grade ??
				null;

			report.firstSemesterAverage[subject] = averageNumbers([
				getSubjectGrade('first'),
				getSubjectGrade('second'),
				getSubjectGrade('third'),
				getSubjectGrade('third_period_exam'),
			]);
			report.secondSemesterAverage[subject] = averageNumbers([
				getSubjectGrade('fourth'),
				getSubjectGrade('fifth'),
				getSubjectGrade('sixth'),
				getSubjectGrade('six_period_exam'),
			]);
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
		report.periodAverages.yearlyAverage = report.yearlyAverage;
	});

	return Array.from(reportsByStudentId.values());
};

// --- Student Multi-Select Component ---

const StudentMultiSelect = React.memo(function StudentMultiSelect({
	students,
	selectedStudents,
	onSelectionChange,
}: {
	students: Student[];
	selectedStudents: string[];
	onSelectionChange: (studentIds: string[]) => void;
}) {
	const [searchTerm, setSearchTerm] = useState('');
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const filteredStudents = useMemo(
		() =>
			students.filter((student) =>
				student.name.toLowerCase().includes(searchTerm.toLowerCase()),
			),
		[students, searchTerm],
	);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const handleStudentToggle = useCallback(
		(studentId: string) => {
			const newSelection = selectedStudents.includes(studentId)
				? selectedStudents.filter((id) => id !== studentId)
				: [...selectedStudents, studentId];
			onSelectionChange(newSelection);
		},
		[selectedStudents, onSelectionChange],
	);

	const selectedStudentNames = useMemo(
		() =>
			students
				.filter((s) => selectedStudents.includes(s.id))
				.map((s) => s.name),
		[students, selectedStudents],
	);

	const handleSelectAll = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onSelectionChange(students.map((s) => s.id));
		},
		[students, onSelectionChange],
	);

	const handleClearAll = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onSelectionChange([]);
		},
		[onSelectionChange],
	);

	return (
		<div className="relative" ref={dropdownRef}>
			<label className="block text-sm font-medium mb-1">
				Select Specific Students (Optional)
			</label>
			<div
				className="w-full border border-border px-3 py-2 rounded bg-background text-foreground cursor-pointer min-h-[42px] flex items-center justify-between"
				onClick={() => setIsOpen(!isOpen)}
			>
				<div className="flex-1">
					{selectedStudents.length === 0 ? (
						<span className="text-muted-foreground">
							All students in class...
						</span>
					) : selectedStudents.length <= 3 ? (
						<span>{selectedStudentNames.join(', ')}</span>
					) : (
						<span>{selectedStudents.length} students selected</span>
					)}
				</div>
				<div className="ml-2">
					<svg
						className={`w-4 h-4 transition-transform ${
							isOpen ? 'rotate-180' : ''
						}`}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</div>
			</div>

			{isOpen && (
				<div className="absolute z-10 w-full mt-1 bg-background border border-border rounded shadow-lg max-h-60 overflow-hidden">
					<div className="p-2 border-b border-border">
						<input
							type="text"
							placeholder="Search students..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-foreground"
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
					<div className="max-h-48 overflow-y-auto">
						{filteredStudents.map((student) => (
							<div
								key={student.id}
								className="flex items-center px-3 py-2 hover:bg-muted cursor-pointer"
								onClick={(e) => {
									e.stopPropagation();
									handleStudentToggle(student.id);
								}}
							>
								<input
									type="checkbox"
									checked={selectedStudents.includes(student.id)}
									readOnly
									className="mr-2"
								/>
								<span className="text-sm">{student.name}</span>
							</div>
						))}
					</div>
					<div className="p-2 border-t border-border bg-muted/50">
						<div className="flex gap-2">
							<button
								type="button"
								onClick={handleSelectAll}
								className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
							>
								Select All
							</button>
							<button
								type="button"
								onClick={handleClearAll}
								className="flex-1 px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border"
							>
								Clear All
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
});

interface ReportFilters {
	academicYear: string;
	session: string;
	classLevel: string;
	className: string;
	selectedStudents: string[];
	sponsorName: string; // NEW: Sponsor name field
}

const FilterContent = React.memo(function FilterContent({
	filters,
	setFilters,
	onSubmit,
}: {
	filters: ReportFilters;
	setFilters: React.Dispatch<React.SetStateAction<ReportFilters>>;
	onSubmit: () => void;
}) {
	const currentSchool = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
	const { user } = useAuth();
	const [students, setStudents] = useState<Student[]>([]);
	const [loadingStudents, setLoadingStudents] = useState(false);

	const userRole = user?.role || 'student';
	const isSystemAdmin = userRole === 'system_admin';
	const isStudent = userRole === 'student';

	useEffect(() => {
		if (!isStudent || !user) return;
		const yearEntry = Array.isArray(user.academicYears)
			? user.academicYears.find((ay: any) => ay.year === filters.academicYear)
			: null;
		const classIdForYear =
			yearEntry?.classId ||
			(filters.academicYear === getCurrentAcademicYear()
				? user.classId || ''
				: '');
		const classMeta = getClassMetaById(
			currentSchool?.classLevels,
			classIdForYear,
		);
		const currentStudentId = normalizeStudentId(
			user?.studentId,
			user?.id,
			user?._id,
		);

		setFilters((prev) => ({
			...prev,
			session: classMeta?.session || prev.session,
			classLevel: classMeta?.level || prev.classLevel,
			className: classIdForYear || prev.className,
			selectedStudents: currentStudentId ? [currentStudentId] : [],
		}));
	}, [isStudent, user, filters.academicYear, setFilters, currentSchool]);

	const availableSessions = useMemo(
		() =>
			currentSchool?.classLevels ? Object.keys(currentSchool.classLevels) : [],
		[currentSchool?.classLevels],
	);

	const userAvailableSessions = useMemo(() => {
		if (isSystemAdmin) return availableSessions;
		if (user?.session) return [user.session];
		return availableSessions;
	}, [isSystemAdmin, user?.session, availableSessions]);

	const availableGradeLevels = useMemo(
		() =>
			filters.session && currentSchool?.classLevels?.[filters.session]
				? Object.keys(currentSchool.classLevels[filters.session])
				: [],
		[filters.session, currentSchool?.classLevels],
	);

	const availableClasses = useMemo(
		() =>
			filters.session &&
			filters.classLevel &&
			currentSchool?.classLevels?.[filters.session]?.[filters.classLevel]
				?.classes
				? currentSchool.classLevels[filters.session][filters.classLevel].classes
				: [],
		[filters.session, filters.classLevel, currentSchool?.classLevels],
	);

	useEffect(() => {
		if (!filters.academicYear) {
			setFilters((prev) => ({
				...prev,
				academicYear: getCurrentAcademicYear(),
			}));
		}

		if (userAvailableSessions.length === 1 && !filters.session && !isStudent) {
			setFilters((prev) => ({ ...prev, session: userAvailableSessions[0] }));
		}

		if (
			filters.session &&
			availableGradeLevels.length === 1 &&
			!filters.classLevel &&
			!isStudent
		) {
			setFilters((prev) => ({ ...prev, classLevel: availableGradeLevels[0] }));
		}

		if (
			filters.classLevel &&
			availableClasses.length === 1 &&
			!filters.className &&
			!isStudent
		) {
			setFilters((prev) => ({
				...prev,
				className: availableClasses[0].classId,
			}));
		}
	}, [
		filters.academicYear,
		filters.session,
		filters.classLevel,
		userAvailableSessions,
		availableGradeLevels,
		availableClasses,
		setFilters,
		isStudent,
	]);

	useEffect(() => {
		if (filters.className && !isStudent) {
			const fetchStudents = async () => {
				setLoadingStudents(true);
				try {
					const cachedUsers = usersByAcademicYear?.[filters.academicYear];
					if (cachedUsers?.students?.length) {
						const filtered = cachedUsers.students.filter(
							(student: any) =>
								getStudentClassIdForYear(student, filters.academicYear) ===
								filters.className,
						);
						const mappedStudents = filtered.map((student: any) => {
							const classId = getStudentClassIdForYear(
								student,
								filters.academicYear,
							);
							return {
								id: normalizeStudentId(
									student.studentId,
									student.id,
									student._id,
								),
								name: buildStudentFullName(student),
								className: classId,
							};
						});
						setStudents(mappedStudents);
						return;
					}
					const cacheKey = `yearly:students:${filters.academicYear}:${filters.className}`;
					const cached = getClientCache<Student[]>(cacheKey);
					if (cached) {
						setStudents(cached);
						return;
					}
					const response = await fetch(
						`/api/users?classId=${filters.className}&role=student&academicYear=${filters.academicYear}`,
					);
					const responseData = await response.json();
					if (responseData.success && responseData.data) {
						setUsersForYear(
							filters.academicYear,
							{
								students: Array.isArray(responseData.data)
									? responseData.data
									: [],
							},
							{ merge: true },
						);
						const mappedStudents = responseData.data.map((student: any) => ({
							id: normalizeStudentId(
								student.studentId,
								student.id,
								student._id,
							),
							name: buildStudentFullName(student),
							className: student.classId,
						}));
						setStudents(mappedStudents);
						setClientCache(cacheKey, mappedStudents, OFFLINE_CACHE_TTL_MS);
					} else {
						setStudents([]);
					}
				} catch (error) {
					console.error('Error fetching students:', error);
					setStudents([]);
				} finally {
					setLoadingStudents(false);
				}
			};
			fetchStudents();
		} else {
			setStudents([]);
			if (!isStudent) {
				setFilters((prev) => ({ ...prev, selectedStudents: [] }));
			}
		}
	}, [
		filters.className,
		filters.academicYear,
		isStudent,
		setFilters,
		usersByAcademicYear,
		setUsersForYear,
	]);

	const canSubmit = useMemo(() => {
		if (isStudent) {
			return !!(
				filters.academicYear &&
				filters.session &&
				filters.classLevel &&
				filters.className
			);
		}
		return !!(filters.academicYear && filters.className);
	}, [
		isStudent,
		filters.academicYear,
		filters.className,
		filters.session,
		filters.classLevel,
	]);

	if (
		isStudent &&
		!currentSchool?.settings?.studentSettings.yearlyReportAccess
	) {
		return (
			<AccessDenied
				message="You are currently not allowed to view yearly reports"
				description=""
			/>
		);
	}

	if (isStudent) {
		const isStudentInfoComplete = !!(
			filters.session &&
			filters.classLevel &&
			filters.className
		);
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
				<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
					<h2 className="text-lg font-semibold mb-4 text-center">
						My Report Card
					</h2>
					<div className="mb-4">
						<label className="block text-sm font-medium mb-1">
							Academic Year
						</label>
						<select
							value={filters.academicYear}
							onChange={(e) =>
								setFilters((f) => ({ ...f, academicYear: e.target.value }))
							}
							className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
						>
							{academicYearOptions.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
					</div>
					{!isStudentInfoComplete && (
						<div className="p-3 mb-4 text-center text-sm bg-destructive/10 text-destructive rounded border border-destructive/20">
							Your profile is missing required class information. Please contact
							an administrator.
						</div>
					)}
					<div className="flex gap-2 mt-6">
						<button
							type="button"
							onClick={onSubmit}
							className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
							disabled={!canSubmit}
						>
							View Report
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] py-10">
			<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
				<h2 className="text-lg font-semibold mb-4 text-center">
					Filter Report Card
				</h2>
				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">
						Academic Year
					</label>
					<select
						value={filters.academicYear}
						onChange={(e) =>
							setFilters((f) => ({
								...f,
								academicYear: e.target.value,
								session: '',
								classLevel: '',
								className: '',
								selectedStudents: [],
								// Keep sponsorName
							}))
						}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
					>
						{academicYearOptions.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				</div>

				{userAvailableSessions.length > 1 && (
					<div className="mb-4">
						<label className="block text-sm font-medium mb-1">Session</label>
						<select
							value={filters.session}
							onChange={(e) =>
								setFilters((f) => ({
									...f,
									session: e.target.value,
									classLevel: '',
									className: '',
									selectedStudents: [],
								}))
							}
							className="w-full border border-border px-3 py-2 rounded bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary"
							disabled={!filters.academicYear}
						>
							<option value="">Select Session</option>
							{userAvailableSessions.map((session) => (
								<option key={session} value={session}>
									{session}
								</option>
							))}
						</select>
					</div>
				)}

				{filters.session && availableGradeLevels.length > 1 && (
					<div className="mb-4">
						<label className="block text-sm font-medium mb-1">
							Grade Level
						</label>
						<select
							value={filters.classLevel}
							onChange={(e) =>
								setFilters((f) => ({
									...f,
									classLevel: e.target.value,
									className: '',
									selectedStudents: [],
								}))
							}
							className="w-full border border-border px-3 py-2 rounded bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary"
							disabled={!filters.session}
						>
							<option value="">Select Grade Level</option>
							{availableGradeLevels.map((level) => (
								<option key={level} value={level}>
									{level}
								</option>
							))}
						</select>
					</div>
				)}

				{filters.classLevel && availableClasses.length > 1 && (
					<div className="mb-4">
						<label className="block text-sm font-medium mb-1">Class</label>
						<select
							value={filters.className}
							onChange={(e) =>
								setFilters((f) => ({
									...f,
									className: e.target.value,
									selectedStudents: [],
								}))
							}
							className="w-full border border-border px-3 py-2 rounded bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary"
							disabled={!filters.classLevel}
						>
							<option value="">Select Class</option>
							{availableClasses.map((classInfo: any) => (
								<option key={classInfo.classId} value={classInfo.classId}>
									{classInfo.name}
								</option>
							))}
						</select>
					</div>
				)}

				{filters.className && (
					<div className="mb-4">
						{loadingStudents ? (
							<div className="text-center py-4">
								<InlineLoading size="sm" />
							</div>
						) : (
							<StudentMultiSelect
								students={students}
								selectedStudents={filters.selectedStudents}
								onSelectionChange={(studentIds) =>
									setFilters((prev) => ({
										...prev,
										selectedStudents: studentIds,
									}))
								}
							/>
						)}
					</div>
				)}

				{/* NEW: Optional Sponsor Text Area */}
				{filters.className && (
					<div className="mb-4">
						<label
							htmlFor="sponsor-name"
							className="block text-sm font-medium mb-1"
						>
							Class Sponsor Name (Optional)
						</label>
						<input
							id="sponsor-name"
							type="text"
							value={filters.sponsorName}
							onChange={(e) =>
								setFilters((f) => ({ ...f, sponsorName: e.target.value }))
							}
							placeholder="e.g., Jane Doe"
							className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
						/>
					</div>
				)}
				<div className="flex gap-2 mt-6">
					<button
						type="button"
						onClick={onSubmit}
						className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
						disabled={!canSubmit}
					>
						Apply Filter
					</button>
				</div>
			</div>
		</div>
	);
});

// --- PDF Template Helpers ---
const DEBUG_COORDS = process.env.NEXT_PUBLIC_PDF_DEBUG_COORDS === 'true';
const OFFLINE_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
type LinkValidityOption = '1d' | '2d' | '3d' | '1w' | '1m';
const LINK_VALIDITY_OPTIONS: Array<{ value: LinkValidityOption; label: string }> =
	[
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

const isGradeOrAverageField = (key: string) =>
	/^(p[1-6]|exam[12]|avg[12]|year)_\d{2}$/.test(key) ||
	/^avg_(p[1-6]|exam[12]|sem[12]|year)$/.test(key);

const toNumeric = (value: string | number | null | undefined) => {
	if (typeof value === 'number') return value;
	if (typeof value !== 'string') return Number.NaN;
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : Number.NaN;
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

	return placements;
};

const buildReportVerificationPayload = ({
	studentId,
	studentName,
	className,
	academicYear,
	session,
	schoolShortName,
}: {
	studentId: string;
	studentName: string;
	className: string;
	academicYear: string;
	session: string;
	schoolShortName?: string;
}) =>
	JSON.stringify({
		type: 'yearly_report',
		studentId,
		studentName,
		className,
		academicYear,
		session,
		school: schoolShortName ?? '',
		generatedAt: new Date().toISOString(),
	});

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

// Field naming contract for the PDF template:
// Header: student_name, student_id, class_name, academic_year, sponsor_name
// Row fields (1-based, zero-padded): subject_01, p1_01, p2_01, p3_01, exam1_01, avg1_01,
// p4_01, p5_01, p6_01, exam2_01, avg2_01, year_01 (repeat for each subject row)
// Summary: avg_p1, avg_p2, avg_p3, avg_exam1, avg_sem1, rank_p1, rank_p2, rank_p3,
// rank_exam1, rank_sem1, avg_p4, avg_p5, avg_p6, avg_exam2, avg_sem2, avg_year,
// rank_p4, rank_p5, rank_p6, rank_exam2, rank_sem2, rank_year
// Promotion: promotion_student_name, promotion_from_grade, promotion_to_grade, promotion_year
const buildYearlyFieldMap = ({
	studentData,
	className,
	classSubjects,
	reportFilters,
}: {
	studentData: StudentYearlyReport;
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
}) => {
	const classDisplayName = className.split('-')[0] || className;

	const fields: Record<string, string> = {
		student_name: studentData.studentName,
		student_id: studentData.studentId,
		class_name: classDisplayName,
		academic_year: reportFilters.academicYear,
	};

	const getGrade = (period: string, subject: string) =>
		studentData.periods[period]?.find((s) => s.subject === subject)?.grade ??
		null;
	const getOverallSubjectAverage = (subject: string) => {
		const sem1Avg = studentData.firstSemesterAverage[subject];
		const sem2Avg = studentData.secondSemesterAverage[subject];
		if (sem1Avg != null && sem2Avg != null) {
			return Math.round((sem1Avg + sem2Avg) / 2);
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
			0,
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
			0,
		);
		fields[`year_${row}`] = formatNumber(
			getOverallSubjectAverage(subject),
			0,
		);
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
}: {
	studentData: StudentYearlyReport;
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
	templateBytes: ArrayBuffer;
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
	});
	const font = await filledDoc.embedFont(StandardFonts.Helvetica);
	const boldFont = await filledDoc.embedFont(StandardFonts.HelveticaBold);
	const page1Placements = buildConditionalColorPlacements({
		basePlacements: placements.page1,
		values: fieldMap,
	});
	drawTextMap({
		page: page1,
		values: fieldMap,
		placements: page1Placements,
		fonts: { normal: font, bold: boldFont },
		defaultSize: 9,
		debug: DEBUG_COORDS,
	});
	if (page2) {
		const page2Placements = buildConditionalColorPlacements({
			basePlacements: placements.page2,
			values: fieldMap,
		});
		drawTextMap({
			page: page2,
			values: fieldMap,
			placements: page2Placements,
			fonts: { normal: font, bold: boldFont },
			defaultSize: 9,
			debug: DEBUG_COORDS,
		});
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
	}
	return filledDoc;
};

const generateYearlyReportPdf = async ({
	studentsData,
	className,
	classSubjects,
	reportFilters,
	school,
}: {
	studentsData: StudentYearlyReport[];
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
	school: any;
}) => {
	const templateUrl = buildReportTemplateUrl({
		schoolShortName: school?.shortName,
		session: reportFilters.session,
		classLevel: reportFilters.classLevel,
		reportType: 'yearly',
	});
	const templateBytes = await loadReportTemplateBytes(
		templateUrl,
		DEFAULT_REPORT_TEMPLATE_URL,
	);
	const templateDoc = await PDFDocument.load(templateBytes);
	const [templatePage1, templatePage2] = templateDoc.getPages();
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
			templateBytes,
			placements: {
				page1: page1Placements,
				page2: page2Placements,
				page2Qr: page2QrPlacement,
			},
		});
		const pages = await outDoc.copyPages(
			filledDoc,
			filledDoc.getPageIndices(),
		);
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
	const resetCopiedTimeoutRef = useRef<number | null>(null);
	const hasReportDataRef = useRef(false);
	const showShareNotice = useCallback((message: string, timeoutMs = 4000) => {
		setShareNotice(message);
		if (resetCopiedTimeoutRef.current) {
			window.clearTimeout(resetCopiedTimeoutRef.current);
		}
		resetCopiedTimeoutRef.current = window.setTimeout(() => {
			setShareNotice('');
		}, timeoutMs);
	}, [setShareNotice]);

	const school = useSchoolStore((state) => state.school);
	const currentSchool = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
	const { user } = useAuth();
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

	const classSubjects = useMemo(() => {
		if (!currentSchool) return [];
		const resolvedMeta =
			reportFilters.session && reportFilters.classLevel
				? { session: reportFilters.session, level: reportFilters.classLevel }
				: getClassMetaById(
						currentSchool.classLevels,
						reportFilters.className,
				  );
		const subjects =
			currentSchool?.classLevels?.[resolvedMeta?.session || '']?.[
				resolvedMeta?.level || ''
			]?.subjects || [];
		return subjects.map((subject: any) =>
			typeof subject === 'string' ? subject : subject.name,
		);
	}, [
		currentSchool,
		reportFilters.session,
		reportFilters.classLevel,
		reportFilters.className,
	]);

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

	const uploadPdfToCache = useCallback(async (blob: Blob, signal?: AbortSignal) => {
		const response = await fetch('/api/reports/pdf', {
			method: 'POST',
			headers: { 'Content-Type': 'application/pdf' },
			body: blob,
			signal,
		});
		if (!response.ok) return null;
		const data = await response.json();
		return data?.cacheKey ?? null;
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

	const openWithKey = useCallback(
		(key: string) => {
			const url = `/api/reports/pdf?key=${encodeURIComponent(
				key,
			)}&fileName=${encodeURIComponent(reportFileName)}`;
			window.open(url, '_blank', 'noopener,noreferrer');
		},
		[reportFileName],
	);

	const openWithBlob = useCallback(() => {
		if (!downloadUrl) return;
		window.open(downloadUrl, '_blank', 'noopener,noreferrer');
	}, [downloadUrl]);

	const handleView = useCallback(async () => {
		if (!pdfBlob || !downloadUrl) return;
		if (typeof navigator !== 'undefined' && !navigator.onLine) {
			openWithBlob();
			return;
		}
		if (serverKey) {
			openWithKey(serverKey);
			return;
		}
		setViewLoading(true);
		const controller = new AbortController();
		const timeoutId = window.setTimeout(() => controller.abort(), 8000);
		try {
			const cacheKey = await uploadPdfToCache(pdfBlob, controller.signal);
			if (cacheKey) {
				setServerKey(cacheKey);
				openWithKey(cacheKey);
			} else {
				openWithBlob();
			}
		} catch {
			openWithBlob();
		} finally {
			window.clearTimeout(timeoutId);
			setViewLoading(false);
		}
	}, [
		pdfBlob,
		downloadUrl,
		serverKey,
		openWithKey,
		openWithBlob,
		uploadPdfToCache,
	]);

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
			let cacheKey = serverKey || '';
			if (!cacheKey) {
				const uploadedKey = await uploadPdfToCache(pdfBlob);
				if (uploadedKey) {
					cacheKey = uploadedKey;
					setServerKey(uploadedKey);
				}
			}
			const data = await createShareLink({
				cacheKey,
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
		uploadPdfToCache,
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

				if (isStudent && user) {
					studentsToProcess = [
						{
							studentId: normalizeStudentId(
								user.studentId,
								user.id,
								user._id,
							),
							firstName: user.firstName,
							middleName: user.middleName,
							lastName: user.lastName,
						},
					];
				} else {
					const cachedUsers =
						usersByAcademicYear?.[reportFilters.academicYear];
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
					} else {
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
							studentId: normalizeStudentId(
								student.studentId,
								student.id,
								student._id,
							),
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

				let gradesData = { success: true, data: { report: [] } };
				const offline =
					typeof navigator !== 'undefined' && navigator.onLine === false;

				if (offline && cachedGrades) {
					gradesData = cachedGrades;
				} else if (offline && !cachedGrades) {
					throw new Error(
						'No cached grades found for offline yearly report generation.',
					);
				} else {
					try {
						const gradesResponse = await fetch(`/api/grades?${params.toString()}`);
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
						classSubjects,
						studentsToProcess,
					});
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
								normalizeStudentId(
									report.studentId,
									report.id,
									report._id,
								) === studentId,
						);

						const qrPayload = buildReportVerificationPayload({
							studentId,
							studentName,
							className,
							academicYear: reportFilters.academicYear,
							session: reportFilters.session,
							schoolShortName: school?.shortName,
						});
						const qrCodeDataUrl =
							await generateStudentQrCodeDataUrl(qrPayload);

						const periods: Record<
							string,
							Array<{ subject: string; grade: number | null }>
						> = {
							first: classSubjects.map((subject) => ({
								subject: typeof subject === 'string' ? subject : subject.name,
								grade: null,
							})),
							second: classSubjects.map((subject) => ({
								subject: typeof subject === 'string' ? subject : subject.name,
								grade: null,
							})),
							third: classSubjects.map((subject) => ({
								subject: typeof subject === 'string' ? subject : subject.name,
								grade: null,
							})),
							third_period_exam: classSubjects.map((subject) => ({
								subject: typeof subject === 'string' ? subject : subject.name,
								grade: null,
							})),
							fourth: classSubjects.map((subject) => ({
								subject: typeof subject === 'string' ? subject : subject.name,
								grade: null,
							})),
							fifth: classSubjects.map((subject) => ({
								subject: typeof subject === 'string' ? subject : subject.name,
								grade: null,
							})),
							sixth: classSubjects.map((subject) => ({
								subject: typeof subject === 'string' ? subject : subject.name,
								grade: null,
							})),
							six_period_exam: classSubjects.map((subject) => ({
								subject: typeof subject === 'string' ? subject : subject.name,
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

						classSubjects.forEach((subject) => {
							const subjectName =
								typeof subject === 'string' ? subject : subject.name;
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
		reportFilters,
		user,
		classSubjects,
		className,
		usersByAcademicYear,
		setUsersForYear,
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

		generateYearlyReportPdf({
			studentsData,
			className,
			classSubjects,
			reportFilters,
			school,
		})
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
					setError('Failed to generate PDF. Please verify the template.');
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


	useEffect(() => {
		if (!pdfBlob || pdfGenerating || serverKey) return;
		fetch('/api/reports/pdf', {
			method: 'POST',
			headers: { 'Content-Type': 'application/pdf' },
			body: pdfBlob,
		})
			.then((res) => res.json())
			.then((data) => {
				if (data?.cacheKey) {
					setServerKey(data.cacheKey);
				}
			})
			.catch(() => {
				// Ignore caching errors; fallback will still open via blob.
			});
	}, [pdfBlob, pdfGenerating, serverKey]);

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
											Expires on {new Date(shareInfo.expiresAt).toLocaleString()}.
										</p>
									</div>
									<div className="rounded-lg border border-border bg-muted/40 p-3">
								<p className="text-xs text-muted-foreground mb-1">Share Link</p>
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
											resetCopiedTimeoutRef.current = window.setTimeout(() => {
												setCopiedLink(false);
												setShareNotice('');
											}, 2000);
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
											resetCopiedTimeoutRef.current = window.setTimeout(() => {
												setCopiedPin(false);
												setShareNotice('');
											}, 2000);
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
										<p className="text-xs text-muted-foreground">{shareNotice}</p>
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
	// UPDATED: Initial state for filters now includes sponsorName
	const [filters, setFilters] = useState<ReportFilters>({
		academicYear: getCurrentAcademicYear(),
		session: '',
		classLevel: '',
		className: '',
		selectedStudents: [],
		sponsorName: '', // NEW: Default to empty string
	});

	const [reportStep, setReportStep] = useState(0);

	const handleSubmitFilters = useCallback(() => {
		setReportStep(1);
	}, []);

	const handleBackToFilters = useCallback(() => {
		setReportStep(0);
	}, []);

	return (
		<div className="p-4">
			{reportStep === 0 && (
				<FilterContent
					filters={filters}
					setFilters={setFilters}
					onSubmit={handleSubmitFilters}
				/>
			)}
			{reportStep === 1 && (
				<ReportContent reportFilters={filters} onBack={handleBackToFilters} />
			)}
		</div>
	);
}
