'use client';
import React, {
	useState,
	useEffect,
	useRef,
	useMemo,
	useCallback,
} from 'react';
import { PDFDocument, StandardFonts } from 'pdf-lib';
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
import { drawTextMap } from '@/utils/pdfText';
import { buildReportPlacements } from '@/app/dashboard/shared/reportPdfLayout';
import {
	buildReportTemplateUrl,
	DEFAULT_REPORT_TEMPLATE_URL,
	loadReportTemplateBytes,
} from '@/utils/reportTemplate';

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

const academicYearOptions = [
	'2025-2026',
	'2024-2025',
	'2023-2024',
	'2022-2023',
	'2021-2022',
	'2019-2020',
];

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
		? student.academicYears.find((ay: any) => ay.year === academicYear)
		: null;
	return yearEntry?.classId || student?.classId || '';
};

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
	semester: 'first' | 'second' | '';
	selectedStudents: string[];
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

		setFilters((prev) => ({
			...prev,
			session: classMeta?.session || prev.session,
			classLevel: classMeta?.level || prev.classLevel,
			className: classIdForYear || prev.className,
			selectedStudents: [user.studentId || ''],
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
								id: student.studentId || student.id,
								name: `${student.firstName} ${
									student.middleName ? student.middleName + ' ' : ''
								}${student.lastName}`.trim(),
								className: classId,
							};
						});
						setStudents(mappedStudents);
						return;
					}
					const cacheKey = `semester:students:${filters.academicYear}:${filters.className}`;
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
							id: student.studentId,
							name: `${student.firstName} ${
								student.middleName ? student.middleName + ' ' : ''
							}${student.lastName}`.trim(),
							className: student.classId,
						}));
						setStudents(mappedStudents);
						setClientCache(cacheKey, mappedStudents);
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
				filters.semester &&
				filters.session &&
				filters.classLevel &&
				filters.className
			);
		}
		return !!(filters.academicYear && filters.className && filters.semester);
	}, [
		isStudent,
		filters.academicYear,
		filters.className,
		filters.semester,
		filters.session,
		filters.classLevel,
	]);

	const allowedSemesters =
		currentSchool?.settings?.studentSettings?.reportAccessSemesters || [];
	const hasSemesterAccess = !isStudent || allowedSemesters.length > 0;
	const filteredSemesterOptions =
		isStudent && hasSemesterAccess
			? semesterOptions.filter((option) =>
					allowedSemesters.includes(option.value),
			  )
			: semesterOptions;

	useEffect(() => {
		if (!isStudent || !hasSemesterAccess) return;
		if (filteredSemesterOptions.length === 1 && !filters.semester) {
			setFilters((prev) => ({
				...prev,
				semester: filteredSemesterOptions[0]
					.value as ReportFilters['semester'],
			}));
		} else if (
			filters.semester &&
			!filteredSemesterOptions.find((opt) => opt.value === filters.semester)
		) {
			setFilters((prev) => ({ ...prev, semester: '' }));
		}
	}, [
		isStudent,
		hasSemesterAccess,
		filteredSemesterOptions,
		filters.semester,
		setFilters,
	]);

	if (isStudent && !hasSemesterAccess) {
		return (
			<AccessDenied
				message="You are currently not allowed to view semester reports"
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
						My Semester Report
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
					<div className="mb-4">
						<label className="block text-sm font-medium mb-1">Semester</label>
						<select
							value={filters.semester}
							onChange={(e) =>
								setFilters((f) => ({
									...f,
									semester: e.target.value as ReportFilters['semester'],
								}))
							}
							className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
						>
							<option value="">Select Semester</option>
							{filteredSemesterOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
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
					Filter Semester Report
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

				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">Semester</label>
					<select
						value={filters.semester}
						onChange={(e) =>
							setFilters((f) => ({
								...f,
								semester: e.target.value as ReportFilters['semester'],
							}))
						}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
					>
						<option value="">Select Semester</option>
						{semesterOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>

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

	const isFirstSemester = reportFilters.semester === 'first';
	const isSecondSemester = reportFilters.semester === 'second';

	classSubjects.forEach((subject, index) => {
		const row = padRowIndex(index);
		fields[`subject_${row}`] = subject;
		fields[`p1_${row}`] = '-';
		fields[`p2_${row}`] = '-';
		fields[`p3_${row}`] = '-';
		fields[`exam1_${row}`] = '-';
		fields[`avg1_${row}`] = '-';
		fields[`p4_${row}`] = '-';
		fields[`p5_${row}`] = '-';
		fields[`p6_${row}`] = '-';
		fields[`exam2_${row}`] = '-';
		fields[`avg2_${row}`] = '-';
		fields[`year_${row}`] = '-';

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
				0,
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
				0,
			);
		}
	});

	fields.avg_p1 = isFirstSemester
		? formatNumber(studentData.periodAverages.first, 1)
		: '-';
	fields.avg_p2 = isFirstSemester
		? formatNumber(studentData.periodAverages.second, 1)
		: '-';
	fields.avg_p3 = isFirstSemester
		? formatNumber(studentData.periodAverages.third, 1)
		: '-';
	fields.avg_exam1 = isFirstSemester
		? formatNumber(studentData.periodAverages.third_period_exam, 1)
		: '-';
	fields.avg_sem1 = isFirstSemester
		? formatNumber(studentData.periodAverages.firstSemesterAverage, 1)
		: '-';

	fields.avg_p4 = isSecondSemester
		? formatNumber(studentData.periodAverages.fourth, 1)
		: '-';
	fields.avg_p5 = isSecondSemester
		? formatNumber(studentData.periodAverages.fifth, 1)
		: '-';
	fields.avg_p6 = isSecondSemester
		? formatNumber(studentData.periodAverages.sixth, 1)
		: '-';
	fields.avg_exam2 = isSecondSemester
		? formatNumber(studentData.periodAverages.six_period_exam, 1)
		: '-';
	fields.avg_sem2 = isSecondSemester
		? formatNumber(studentData.periodAverages.secondSemesterAverage, 1)
		: '-';
	fields.avg_year = '-';

	fields.rank_p1 = isFirstSemester
		? formatNumber(studentData.ranks.first, 0)
		: '-';
	fields.rank_p2 = isFirstSemester
		? formatNumber(studentData.ranks.second, 0)
		: '-';
	fields.rank_p3 = isFirstSemester
		? formatNumber(studentData.ranks.third, 0)
		: '-';
	fields.rank_exam1 = isFirstSemester
		? formatNumber(studentData.ranks.third_period_exam, 0)
		: '-';
	fields.rank_sem1 = isFirstSemester
		? formatNumber(studentData.ranks.firstSemesterAverage, 0)
		: '-';

	fields.rank_p4 = isSecondSemester
		? formatNumber(studentData.ranks.fourth, 0)
		: '-';
	fields.rank_p5 = isSecondSemester
		? formatNumber(studentData.ranks.fifth, 0)
		: '-';
	fields.rank_p6 = isSecondSemester
		? formatNumber(studentData.ranks.sixth, 0)
		: '-';
	fields.rank_exam2 = isSecondSemester
		? formatNumber(studentData.ranks.six_period_exam, 0)
		: '-';
	fields.rank_sem2 = isSecondSemester
		? formatNumber(studentData.ranks.secondSemesterAverage, 0)
		: '-';
	fields.rank_year = '-';

	fields.promotion_student_name = '';
	fields.promotion_from_grade = '';
	fields.promotion_to_grade = '';
	fields.promotion_year = '';

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
	studentData: StudentSemesterReport;
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
	templateBytes: ArrayBuffer;
	placements: ReturnType<typeof buildReportPlacements>;
}) => {
	const filledDoc = await PDFDocument.load(templateBytes);
	const [page] = filledDoc.getPages();
	const fieldMap = buildSemesterFieldMap({
		studentData,
		className,
		classSubjects,
		reportFilters,
	});
	const font = await filledDoc.embedFont(StandardFonts.Helvetica);
	const boldFont = await filledDoc.embedFont(StandardFonts.HelveticaBold);
	drawTextMap({
		page,
		values: fieldMap,
		placements,
		fonts: { normal: font, bold: boldFont },
		defaultSize: 9,
		debug: DEBUG_COORDS,
	});
	return filledDoc;
};

const generateSemesterReportPdf = async ({
	studentsData,
	className,
	classSubjects,
	reportFilters,
	school,
}: {
	studentsData: StudentSemesterReport[];
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
	school: any;
}) => {
	const templateUrl = buildReportTemplateUrl({
		schoolShortName: school?.shortName,
		session: reportFilters.session,
		classLevel: reportFilters.classLevel,
		reportType: 'semester',
	});
	const templateBytes = await loadReportTemplateBytes(
		templateUrl,
		DEFAULT_REPORT_TEMPLATE_URL,
	);
	const templateDoc = await PDFDocument.load(templateBytes);
	const [templatePage] = templateDoc.getPages();
	const placements = buildReportPlacements({
		pageWidth: templatePage.getWidth(),
		pageHeight: templatePage.getHeight(),
		subjectCount: classSubjects.length,
	});
	const outDoc = await PDFDocument.create();

	for (const studentData of studentsData) {
		const filledDoc = await fillTemplateForStudent({
			studentData,
			className,
			classSubjects,
			reportFilters,
			templateBytes,
			placements,
		});
		const pages = await outDoc.copyPages(
			filledDoc,
			filledDoc.getPageIndices(),
		);
		pages.forEach((page) => outDoc.addPage(page));
	}

	return outDoc.save();
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
	const [shareInfo, setShareInfo] = useState<{
		url: string;
		pin: string;
		expiresAt: string;
	} | null>(null);
	const [copiedLink, setCopiedLink] = useState(false);
	const [copiedPin, setCopiedPin] = useState(false);
	const [shareNotice, setShareNotice] = useState('');
	const pdfUrlRef = useRef<string | null>(null);
	const resetCopiedTimeoutRef = useRef<number | null>(null);

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
		() =>
			`Semester_Report_${className}_${reportFilters.academicYear}_${reportFilters.semester}.pdf`,
		[className, reportFilters.academicYear, reportFilters.semester],
	);

	const handleShare = useCallback(async () => {
		if (!pdfBlob || !downloadUrl) return;
		setShareLoading(true);
		try {
			const formData = new FormData();
			formData.append('fileName', reportFileName);
			formData.append('reportType', 'semester');
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
	}, [pdfBlob, downloadUrl, reportFileName, createdBy, serverKey]);

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
		const fetchStudentsData = async () => {
			setLoading(true);
			setError(null);

			try {
				let studentsToProcess: any[] = [];

				if (isStudent && user) {
					studentsToProcess = [
						{
							studentId: user.studentId,
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
							studentId: student.studentId || student.id,
							firstName: student.firstName,
							middleName: student.middleName,
							lastName: student.lastName,
						}));
						if (reportFilters.selectedStudents.length > 0) {
							studentsToProcess = mapped.filter((student: any) =>
								reportFilters.selectedStudents.includes(student.studentId),
							);
						} else {
							studentsToProcess = mapped;
						}
					}
					const cacheKey = `semester:students:${reportFilters.academicYear}:${reportFilters.className}`;
					const cached = getClientCache<any[]>(cacheKey);
					if (cached) {
						if (reportFilters.selectedStudents.length > 0) {
							studentsToProcess = cached.filter((student: any) =>
								reportFilters.selectedStudents.includes(student.studentId),
							);
						} else {
							studentsToProcess = cached;
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
							studentId: student.studentId || student.id,
							firstName: student.firstName,
							middleName: student.middleName,
							lastName: student.lastName,
						}));
						setClientCache(cacheKey, mapped);

						if (reportFilters.selectedStudents.length > 0) {
							studentsToProcess = mapped.filter((student: any) =>
								reportFilters.selectedStudents.includes(student.studentId),
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
				if (reportFilters.semester) {
					params.append('semester', reportFilters.semester);
				}

				if (reportFilters.selectedStudents.length > 0) {
					params.append('studentIds', reportFilters.selectedStudents.join(','));
				}

				let gradesData = { success: true, data: { report: [] } };
				const gradesResponse = await fetch(`/api/grades?${params.toString()}`);
				if (gradesResponse.ok) {
					gradesData = await gradesResponse.json();
				} else {
					const errorData = await gradesResponse.json();
					throw new Error(errorData.message || 'Failed to fetch grades');
				}

				let existingReports: any[] = [];
				if (Array.isArray(gradesData.data?.report)) {
					existingReports = gradesData.data.report;
				} else if (
					gradesData.data?.report &&
					typeof gradesData.data.report === 'object'
				) {
					existingReports = [gradesData.data.report];
				}

				const reportData = await Promise.all(
					studentsToProcess.map(async (student: any) => {
						const studentId = student.studentId;
						const studentName = `${student.firstName} ${
							student.middleName ? student.middleName + ' ' : ''
						}${student.lastName}`.trim();
						const existingReport = existingReports.find(
							(report: any) => report.studentId === studentId,
						);

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
						};
					}),
				);

				setStudentsData(reportData);
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
		usersByAcademicYear,
		setUsersForYear,
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

		generateSemesterReportPdf({
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
				{isStudent && !inlineError && !forceInlineFallback && !pdfGenerating && (
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
										onClick={() => {
											if (!pdfBlob || !downloadUrl) return;
											const openWithKey = (key: string) => {
												const url = `/api/reports/pdf?key=${encodeURIComponent(
													key,
												)}&fileName=${encodeURIComponent(
													reportFileName,
												)}`;
												window.open(url, '_blank', 'noopener,noreferrer');
											};
											if (serverKey) {
												openWithKey(serverKey);
												return;
											}
											setViewLoading(true);
											fetch('/api/reports/pdf', {
												method: 'POST',
												headers: { 'Content-Type': 'application/pdf' },
												body: pdfBlob,
											})
												.then((res) => res.json())
												.then((data) => {
													if (data?.cacheKey) {
														setServerKey(data.cacheKey);
														openWithKey(data.cacheKey);
													} else {
														window.open(downloadUrl, '_blank', 'noopener,noreferrer');
													}
													setViewLoading(false);
												})
												.catch(() => {
													window.open(downloadUrl, '_blank', 'noopener,noreferrer');
													setViewLoading(false);
												});
										}}
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
			{shareModalOpen && shareInfo && (
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
							<div>
								<p className="text-sm text-muted-foreground">
									This link expires in 24 hours.
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
							<div className="flex justify-end gap-2">
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

export default function SemesterReport() {
	const [filters, setFilters] = useState<ReportFilters>({
		academicYear: getCurrentAcademicYear(),
		session: '',
		classLevel: '',
		className: '',
		semester: '',
		selectedStudents: [],
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
