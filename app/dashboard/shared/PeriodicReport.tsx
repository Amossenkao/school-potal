'use client';
import React, {
	useState,
	useEffect,
	useRef,
	useMemo,
	useCallback,
} from 'react';
import { Document, Page, Text, View, Image, pdf } from '@react-pdf/renderer';
import {
	Facebook,
	Mail,
	MessageCircle,
	MessagesSquare,
	Send,
	Twitter,
} from 'lucide-react';
import styles from './styles';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import Spinner from '@/components/ui/spinner';
import AccessDenied from '@/components/AccessDenied';

interface StudentInfo {
	firstName: string;
	middleName: string;
	lastName: string;
	class: string;
	id: string;
	academicYear: string;
	grade: string;
}

// Represents an active student from the /api/users endpoint
interface Student {
	id: string;
	name: string;
	className: string;
}

// Represents grade data from the /api/grades endpoint
interface PeriodicStudentData {
	studentId: string;
	studentName: string;
	subjects: Array<{
		subject: string;
		grade: number;
	}>;
	periodicAverage: number;
	rank: number;
}

const periodOptions = [
	{ id: 'first', label: 'First Period', value: 'first' },
	{ id: 'second', label: 'Second Period', value: 'second' },
	{ id: 'third', label: 'Third Period', value: 'third' },
	{
		id: 'third_period_exam',
		label: 'Third Period Exam',
		value: 'third_period_exam',
	},
	{ id: 'fourth', label: 'Fourth Period', value: 'fourth' },
	{ id: 'fifth', label: 'Fifth Period', value: 'fifth' },
	{ id: 'sixth', label: 'Sixth Period', value: 'sixth' },
	{
		id: 'sixth_period_exam',
		label: 'Sixth Period Exam',
		value: 'sixth_period_exam',
	},
];

const academicYearOptions = [
	'2025-2026',
	'2024-2025',
	'2023-2024',
	'2022-2023',
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

function gradeStyle(score: number | null) {
	if (score === null || Number.isNaN(score) || score < 70) {
		return {
			...styles.tableCell,
			color: 'red',
			fontSize: 10,
			fontWeight: 'bold',
		};
	} else {
		return {
			...styles.tableCell,
			color: 'blue',
			fontSize: 10,
			fontWeight: 'bold',
		};
	}
}

function paginateStudents(
	students: PeriodicStudentData[],
	perPage: number = 3,
): PeriodicStudentData[][] {
	const pages: PeriodicStudentData[][] = [];
	for (let i = 0; i < students.length; i += perPage) {
		const page = students.slice(i, i + perPage);
		if (page.length > 0) {
			pages.push(page);
		}
	}
	return pages;
}

function SchoolHeader({
	student,
	schoolData,
}: {
	student: StudentInfo;
	schoolData: any;
}) {
	if (!schoolData) {
		console.error('SchoolHeader: No school data provided');
		return (
			<View style={{ marginBottom: 7 }}>
				<Text style={{ fontSize: 10, fontWeight: 'bold', textAlign: 'center' }}>
					School Data Loading...
				</Text>
			</View>
		);
	}

	return (
		<View style={{ marginBottom: 7 }}>
			<Text
				style={{
					fontSize: 12,
					fontWeight: 'bold',
					textAlign: 'center',
				}}
			>
				{schoolData.name || 'School Name'}
			</Text>
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					marginBottom: 4,
					gap: 1,
				}}
			>
				<View>
					{(schoolData.logoUrl2 || schoolData.logoUrl) && (
						<Image
							src={schoolData.logoUrl2 || schoolData.logoUrl}
							style={{ width: 32 }}
						/>
					)}
				</View>
				<View style={{ flex: 1, alignItems: 'center' }}>
					{schoolData.address && (
						<Text style={{ fontSize: 8, textAlign: 'center', marginBottom: 1 }}>
							{schoolData.address.join('\n')}
						</Text>
					)}
				</View>
				<View>
					{schoolData.logoUrl && (
						<Image src={schoolData.logoUrl} style={{ width: 32 }} />
					)}
				</View>
			</View>
			<Text
				style={{
					fontWeight: 'bold',
					fontSize: 9,
					textAlign: 'center',
					color: '#1a365d',
					marginBottom: 2,
				}}
			>
				{student.grade.toUpperCase()} PERIODIC REPORT
			</Text>
			<Text style={{ fontSize: 8, textAlign: 'center', marginBottom: 1 }}>
				Academic Year: {student.academicYear} &nbsp;&nbsp; Class:{' '}
				{student.class}
			</Text>
		</View>
	);
}

// Multi-select component for student selection
function StudentMultiSelect({
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

	const filteredStudents = students.filter((student) =>
		student.name.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	// Close dropdown when clicking outside
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

	const handleStudentToggle = (studentId: string) => {
		const newSelection = selectedStudents.includes(studentId)
			? selectedStudents.filter((id) => id !== studentId)
			: [...selectedStudents, studentId];
		onSelectionChange(newSelection);
	};

	const selectedStudentNames = students
		.filter((s) => selectedStudents.includes(s.id))
		.map((s) => s.name);

	const isAllSelected =
		students.length > 0 && selectedStudents.length === students.length;
	const displayText =
		selectedStudents.length === 0
			? 'All students in class...'
			: selectedStudents.length === students.length
				? 'All students in class...'
				: selectedStudents.length <= 3
					? selectedStudentNames.join(', ')
					: `${selectedStudents.length} students selected`;

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
					<span
						className={
							selectedStudents.length === 0 ? 'text-muted-foreground' : ''
						}
					>
						{displayText}
					</span>
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
						{filteredStudents.length === 0 ? (
							<div className="p-3 text-sm text-muted-foreground text-center">
								No students found
							</div>
						) : (
							filteredStudents.map((student) => (
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
										onChange={() => {}}
										className="mr-2"
									/>
									<span className="text-sm">{student.name}</span>
								</div>
							))
						)}
					</div>
					<div className="p-2 border-t border-border bg-muted/50">
						<div className="flex gap-2">
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onSelectionChange(students.map((s) => s.id));
								}}
								className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
								disabled={isAllSelected}
							>
								Select All
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onSelectionChange([]);
								}}
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
}

function FilterContent({
	filters,
	setFilters,
	onSubmit,
}: {
	filters: {
		academicYear: string;
		period: string;
		session: string;
		gradeLevel: string;
		className: string;
		selectedStudents: string[];
	};
	setFilters: React.Dispatch<React.SetStateAction<typeof filters>>;
	onSubmit: (students: Student[]) => void;
}) {
	const { user } = useAuth();
	const school = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
	const [students, setStudents] = useState<Student[]>([]);
	const [loadingStudents, setLoadingStudents] = useState(false);

	const isStudent = user?.role === 'student';
	const isSystemAdmin = user?.role === 'system_admin';
	const getStudentClassIdForYear = useCallback(
		(student: any, academicYear: string) => {
			const yearEntry = Array.isArray(student?.academicYears)
				? student.academicYears.find((ay: any) => ay.year === academicYear)
				: null;
			return yearEntry?.classId || student?.classId || '';
		},
		[],
	);

	// Determine available sessions from the new structure
	const availableSessions = useMemo(
		() => (school?.classLevels ? Object.keys(school.classLevels) : []),
		[school],
	);

	// Determine available grade levels for the selected session
	const availableGradeLevels = useMemo(
		() =>
			filters.session
				? Object.keys(school?.classLevels?.[filters.session] || {})
				: [],
		[school, filters.session],
	);

	// Determine available classes for the selected session and grade level
	const availableClasses = useMemo(
		() =>
			filters.session && filters.gradeLevel
				? school?.classLevels?.[filters.session]?.[filters.gradeLevel]
						?.classes || []
				: [],
		[school, filters.session, filters.gradeLevel],
	);

	// Auto-select session if only one is available
	useEffect(() => {
		if (!isStudent && availableSessions.length === 1) {
			setFilters((prev) => ({
				...prev,
				session: availableSessions[0],
			}));
		}
	}, [isStudent, availableSessions, setFilters]);

	// Auto-select grade level if only one is available for the selected session
	useEffect(() => {
		// Only run if a session is selected and no grade level is set
		if (!isStudent && filters.session && !filters.gradeLevel) {
			// Recalculate inside the effect to avoid unstable dependency
			const currentAvailableGradeLevels = filters.session
				? Object.keys(school?.classLevels?.[filters.session] || {})
				: [];

			if (currentAvailableGradeLevels.length === 1) {
				setFilters((prev) => ({
					...prev,
					gradeLevel: currentAvailableGradeLevels[0],
				}));
			}
		}
	}, [isStudent, filters.session, filters.gradeLevel, setFilters, school]);

	// Fetch students for the selected class
	useEffect(() => {
		const fetchStudents = async () => {
			if (filters.className) {
				setLoadingStudents(true);
				try {
					const cachedUsers = usersByAcademicYear?.[filters.academicYear];
					if (cachedUsers?.students?.length) {
						const filtered = cachedUsers.students.filter(
							(student: any) =>
								getStudentClassIdForYear(student, filters.academicYear) ===
								filters.className,
						);
						const mapped = filtered.map((student: any) => {
							const classId = getStudentClassIdForYear(
								student,
								filters.academicYear,
							);
							return {
								id: student.studentId || student.id,
								name: `${student.firstName} ${student.middleName || ''} ${
									student.lastName
								}`.trim(),
								className: classId,
							};
						});
						setStudents(mapped);
						return;
					}
					const cacheKey = `periodic:students:${filters.academicYear}:${filters.className}`;
					const cached = getClientCache<Student[]>(cacheKey);
					if (cached) {
						setStudents(cached);
						return;
					}
					const response = await fetch(
						`/api/users?classId=${filters.className}&role=student&academicYear=${filters.academicYear}`,
					);
					if (!response.ok) throw new Error('Failed to fetch students');
					const data = await response.json();
					if (data.success && data.data) {
						setUsersForYear(
							filters.academicYear,
							{ students: Array.isArray(data.data) ? data.data : [] },
							{ merge: true },
						);
						const mapped = data.data.map((student: any) => ({
							id: student.studentId,
							name: `${student.firstName} ${student.middleName || ''} ${
								student.lastName
							}`.trim(),
							className: student.classId,
						}));
						setStudents(mapped);
						setClientCache(cacheKey, mapped);
					} else {
						setStudents([]);
					}
				} catch (error) {
					console.error('Error fetching students:', error);
					setStudents([]);
				} finally {
					setLoadingStudents(false);
				}
			} else {
				setStudents([]);
			}
		};

		if (!isStudent) {
			fetchStudents();
		}
	}, [
		filters.className,
		filters.academicYear,
		isStudent,
		usersByAcademicYear,
		setUsersForYear,
		getStudentClassIdForYear,
	]);

	// Set default academic year on component mount
	useEffect(() => {
		if (!filters.academicYear) {
			setFilters((prev) => ({
				...prev,
				academicYear: getCurrentAcademicYear(),
			}));
		}
	}, [filters.academicYear, setFilters]);

	// Auto-populate student's information if user is a student
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
		const classMeta = getClassMetaById(school?.classLevels, classIdForYear);

		setFilters((prev) => {
			const next = {
				...prev,
				session: classMeta?.session || prev.session,
				gradeLevel: classMeta?.level || prev.gradeLevel,
				className: classIdForYear || prev.className,
				selectedStudents: [user.studentId || user.id],
			};
			return next;
		});
	}, [isStudent, user, filters.academicYear, setFilters, school]);

	// Determine what's required for submission
	const canSubmit = isStudent
		? filters.academicYear && filters.period && filters.className
		: filters.academicYear &&
			filters.period &&
			filters.session &&
			filters.gradeLevel &&
			filters.className;

	const handleSubmit = () => {
		if (!canSubmit) return;

		if (isStudent && user) {
			const studentAsList: Student[] = [
				{
					id: user.studentId || user.id,
					name: `${user.firstName || ''} ${user.middleName || ''} ${
						user.lastName || ''
					}`.trim(),
					className: user.classId || '',
				},
			];
			onSubmit(studentAsList);
		} else {
			// If specific students are selected, pass only them. Otherwise, pass all.
			const studentsToSubmit =
				filters.selectedStudents.length > 0
					? students.filter((s) => filters.selectedStudents.includes(s.id))
					: students;
			onSubmit(studentsToSubmit);
		}
	};

	// Show loading if no school data
	if (!school) {
		return <PageLoading fullScreen={false} />;
	}

	const canAccessReport =
		isStudent &&
		school?.settings?.studentSettings.reportAccessPeriods &&
		school?.settings?.studentSettings.reportAccessPeriods.length > 0;

	let filteredPeriodOptions = periodOptions;
	if (isStudent && canAccessReport) {
		filteredPeriodOptions = periodOptions.filter((period) => {
			return school?.settings?.studentSettings.reportAccessPeriods.includes(
				period.id,
			);
		});
	} else if (isStudent && !canAccessReport) {
		return (
			<AccessDenied
				message={`You are currently not allowed to view periodic grades`}
				description=""
			/>
		);
	}

	// For students, check if their profile is complete
	if (isStudent) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
				<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
					{/* Academic Year - Always shown */}
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
									period: '', // Reset period when year changes
								}))
							}
							className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
						>
							<option value="">Select Academic Year</option>
							{academicYearOptions.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
					</div>

					{/* Period - Always shown */}
					<div className="mb-4">
						<label className="block text-sm font-medium mb-1">Period</label>
						<select
							value={filters.period}
							onChange={(e) =>
								setFilters((f) => ({ ...f, period: e.target.value }))
							}
							className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
						>
							<option value="">Select Period</option>
							{filteredPeriodOptions.map((p) => (
								<option key={p.value} value={p.value}>
									{p.label}
								</option>
							))}
						</select>
					</div>

					<div className="flex gap-2 mt-6">
						<button
							type="button"
							onClick={() => {
								if (isStudent && user) {
									// For students, reset but keep auto-populated info
									setFilters({
										academicYear: getCurrentAcademicYear(),
										period: '',
										session: user.session || '',
										gradeLevel: user.gradeLevel || '',
										className: user.classId || '',
										selectedStudents: [user.studentId || user.id],
									});
								}
							}}
							className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border"
						>
							Reset
						</button>
						<button
							type="button"
							onClick={handleSubmit}
							className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary disabled:opacity-50"
							disabled={!canSubmit}
						>
							Apply Filter
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
			<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
				{/* Academic Year - Always shown */}
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
								gradeLevel: '',
								className: '',
								selectedStudents: [],
							}))
						}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
					>
						<option value="">Select Academic Year</option>
						{academicYearOptions.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				</div>

				{/* Period - Always shown */}
				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">Period</label>
					<select
						value={filters.period}
						onChange={(e) =>
							setFilters((f) => ({ ...f, period: e.target.value }))
						}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
					>
						<option value="">Select Period</option>
						{filteredPeriodOptions.map((p) => (
							<option key={p.value} value={p.value}>
								{p.label}
							</option>
						))}
					</select>
				</div>

				{/* Session - Only show if not a student and more than one session is available */}
				{!isStudent && availableSessions.length > 1 && (
					<div className="mb-4">
						<label className="block text-sm font-medium mb-1">Session</label>
						<select
							value={filters.session}
							onChange={(e) =>
								setFilters((f) => ({
									...f,
									session: e.target.value,
									gradeLevel: '',
									className: '',
									selectedStudents: [],
								}))
							}
							className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
							disabled={!filters.academicYear}
						>
							<option value="">Select Session</option>
							{availableSessions.map((session) => (
								<option key={session} value={session}>
									{session}
								</option>
							))}
						</select>
					</div>
				)}

				{/* Grade Level - Only show if not a student and more than one grade level is available */}
				{!isStudent && availableGradeLevels.length >= 1 && (
					<div className="mb-4">
						<label className="block text-sm font-medium mb-1">
							Grade Level
						</label>
						<select
							value={filters.gradeLevel}
							onChange={(e) =>
								setFilters((f) => ({
									...f,
									gradeLevel: e.target.value,
									className: '',
									selectedStudents: [],
								}))
							}
							className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
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

				{/* Class - Only show if not a student */}
				{!isStudent && (
					<div className="mb-4">
						<label className="block text-sm font-medium mb-1">Class</label>
						<select
							value={filters.className}
							onChange={(e) => {
								const selectedClass = availableClasses.find(
									(c) => c.classId === e.target.value,
								);
								setFilters((f) => ({
									...f,
									className: selectedClass?.classId || e.target.value,
									selectedStudents: [],
								}));
							}}
							className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
							disabled={!filters.gradeLevel}
						>
							<option value="">Select Class</option>
							{availableClasses.map((classInfo) => (
								<option key={classInfo.classId} value={classInfo.classId}>
									{classInfo.name}
								</option>
							))}
						</select>
					</div>
				)}

				{/* Student selection - Only for system_admin */}
				{isSystemAdmin && filters.className && (
					<div className="mb-4">
						{loadingStudents ? (
							<div className="flex items-center justify-center py-8">
								<div className="flex items-center gap-2">
									<Spinner size="sm" />
									<div className="text-sm text-muted-foreground">
										Loading students...
									</div>
								</div>
							</div>
						) : (
							<StudentMultiSelect
								students={students}
								selectedStudents={filters.selectedStudents}
								onSelectionChange={(studentIds) => {
									setFilters((prev) => ({
										...prev,
										selectedStudents: studentIds,
									}));
								}}
							/>
						)}
					</div>
				)}

				<div className="flex gap-2 mt-6">
					<button
						type="button"
						onClick={() => {
							// For system_admin, reset everything
							setFilters({
								academicYear: getCurrentAcademicYear(),
								period: '',
								session: '',
								gradeLevel: '',
								className: '',
								selectedStudents: [],
							});
						}}
						className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border"
					>
						Reset
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary disabled:opacity-50"
						disabled={!canSubmit}
					>
						Apply Filter
					</button>
				</div>
			</div>
		</div>
	);
}

// PDF Document Component - Memoized to prevent re-rendering
const PeriodicReportDocument = React.memo(
	({
		studentsData,
		reportFilters,
		subjects,
		className,
		selectedPeriodLabel,
		schoolData,
	}: {
		studentsData: PeriodicStudentData[];
		reportFilters: any;
		subjects: string[];
		className: string;
		selectedPeriodLabel: string;
		schoolData: any;
	}) => {
		// Memoize the pages calculation
		const pages = useMemo(
			() => paginateStudents(studentsData, 3),
			[studentsData],
		);

		// Memoize the title
		const title = useMemo(() => {
			return studentsData.length === 1
				? `Periodic Report - ${studentsData[0].studentName}`
				: reportFilters.selectedStudents.length > 0 &&
					  reportFilters.selectedStudents.length < studentsData.length
					? `Periodic Report - Selected Students - ${selectedPeriodLabel}`
					: `Periodic Report - ${className} - ${selectedPeriodLabel}`;
		}, [
			studentsData,
			reportFilters.selectedStudents,
			selectedPeriodLabel,
			className,
		]);

		return (
			<Document title={title}>
				{pages
					.filter((page) => page.length > 0)
					.map((studentGroup, pageIndex) => (
						<Page
							key={pageIndex}
							size="A4"
							orientation="landscape"
							style={{
								...styles.page,
								paddingTop: 20,
								paddingBottom: 20,
								paddingLeft: 20,
								paddingRight: 20,
							}}
							wrap={false}
						>
							<View
								style={{
									position: 'absolute',
									top: '10%',
									left: '50%',
									transform: 'translate(-50%, -50%)',
									opacity: 0.15,
									zIndex: -1,
								}}
							>
								<Image src={schoolData?.logoUrl} style={{ width: 250 }} />
							</View>

							<View
								style={{
									flexDirection: 'row',
									width: '100%',
									justifyContent: 'flex-start',
									alignItems: 'flex-start',
									flex: 1,
								}}
							>
								{studentGroup.map((studentData, colIdx) => (
									<View
										key={`${pageIndex}-${colIdx}`}
										style={{
											width: '32%',
											marginRight: colIdx < 2 ? '2%' : 0,
											borderWidth: 1,
											borderColor: '#cbd5e1',
											backgroundColor: '#f8fafc',
											borderRadius: 8,
											padding: 8,
											minHeight: 400,
											maxHeight: 'auto',
										}}
									>
										<SchoolHeader
											student={{
												firstName: studentData.studentName?.split(' ')[0] || '',
												middleName:
													studentData.studentName?.split(' ').length > 2
														? studentData.studentName.split(' ')[1]
														: '',
												lastName:
													studentData.studentName?.split(' ').length > 1
														? studentData.studentName.split(' ').slice(-1)[0]
														: '',
												class: className,
												id: studentData.studentId,
												academicYear: reportFilters.academicYear,
												grade: reportFilters.gradeLevel,
											}}
											schoolData={schoolData}
										/>

										<View style={{ marginBottom: 8 }}>
											<Text style={{ fontWeight: 'bold', fontSize: 10 }}>
												{studentData.studentName}
											</Text>
											<Text style={{ fontSize: 9 }}>
												ID: {studentData.studentId}
											</Text>
											<Text style={{ fontSize: 9 }}>
												Period: {selectedPeriodLabel}
											</Text>
											{/* {reportFilters.session && (
												<Text style={{ fontSize: 9 }}>
													Session: {reportFilters.session}
												</Text>
											)} */}
										</View>

										<View style={{ marginTop: 5, flex: 1 }}>
											<View
												style={{
													flexDirection: 'row',
													borderBottomWidth: 1,
													borderBottomColor: '#2d3748',
													marginBottom: 4,
													paddingBottom: 2,
												}}
											>
												<Text
													style={{
														fontWeight: 'bold',
														fontSize: 9,
														width: '60%',
													}}
												>
													Subject
												</Text>
												<Text
													style={{
														fontWeight: 'bold',
														fontSize: 9,
														width: '40%',
														textAlign: 'center',
													}}
												>
													Marks
												</Text>
											</View>
											{subjects.map((subjectName, sidx) => {
												const subject =
													studentData.subjects &&
													studentData.subjects.find(
														(s) =>
															s?.subject?.toLowerCase() ===
															subjectName?.toLowerCase(),
													);
												const mark = subject ? subject.grade : null;
												return (
													<View
														key={sidx}
														style={{
															flexDirection: 'row',
															borderBottomWidth: 1,
															borderBottomColor: '#e2e8f0',
															minHeight: 18,
															alignItems: 'center',
														}}
													>
														<Text
															style={{
																fontSize: 9,
																width: '60%',
																paddingVertical: 1,
															}}
														>
															{subjectName}
														</Text>
														<Text
															style={{
																...gradeStyle(Number(mark)),
																width: '40%',
																textAlign: 'center',
																paddingVertical: 1,
															}}
														>
															{mark !== null ? mark : '-'}
														</Text>
													</View>
												);
											})}
											<View
												style={{
													borderTopWidth: 1,
													borderTopColor: '#2d3748',
													paddingTop: 4,
												}}
											>
												<View
													style={{
														flexDirection: 'row',
														minHeight: 18,
														alignItems: 'center',
													}}
												>
													<Text
														style={{
															fontWeight: 'bold',
															fontSize: 9,
															width: '60%',
															paddingVertical: 1,
														}}
													>
														Periodic Average
													</Text>
													<Text
														style={{
															...styles.tableCell,
															fontWeight: 'bold',
															width: '40%',
															textAlign: 'center',
															fontSize: 9,
														}}
													>
														{studentData.periodicAverage.toFixed(1)}
													</Text>
												</View>
												<View
													style={{
														flexDirection: 'row',
														minHeight: 18,
														alignItems: 'center',
													}}
												>
													<Text
														style={{
															fontWeight: 'bold',
															fontSize: 9,
															width: '60%',
															paddingVertical: 1,
														}}
													>
														Class Rank
													</Text>
													<Text
														style={{
															...styles.tableCell,
															fontWeight: 'bold',
															width: '40%',
															textAlign: 'center',
															fontSize: 9,
														}}
													>
														{studentData.rank || 'N/A'}
													</Text>
												</View>
											</View>
										</View>
									</View>
								))}
							</View>

							{pages.length > 1 && (
								<View
									style={{
										position: 'absolute',
										bottom: 12,
										right: 32,
									}}
								>
									<Text style={{ fontSize: 8, color: '#888' }}>
										Page {pageIndex + 1} of {pages.length}
									</Text>
								</View>
							)}
						</Page>
					))}
			</Document>
		);
	},
);

function ReportContent({
	reportFilters,
	activeStudents,
	onBack,
}: {
	reportFilters: {
		academicYear: string;
		period: string;
		session: string;
		gradeLevel: string;
		className: string;
		selectedStudents: string[];
	};
	activeStudents: Student[];
	onBack: () => void;
}) {
	const [studentsData, setStudentsData] = useState<PeriodicStudentData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
	const [serverKey, setServerKey] = useState<string | null>(null);
	const [pdfGenerating, setPdfGenerating] = useState(false);
	const [inlineError, setInlineError] = useState(false);
	const pdfUrlRef = useRef<string | null>(null);
	const [shareModalOpen, setShareModalOpen] = useState(false);
	const [shareInfo, setShareInfo] = useState<{
		url: string;
		pin: string;
		expiresAt: string;
	} | null>(null);
	const [shareNotice, setShareNotice] = useState('');
	const [shareLoading, setShareLoading] = useState(false);
	const [copiedLink, setCopiedLink] = useState(false);
	const [copiedPin, setCopiedPin] = useState(false);
	const [viewLoading, setViewLoading] = useState(false);
	const resetCopiedTimeoutRef = useRef<number | null>(null);
	const school = useSchoolStore((state) => state.school);
	const { user } = useAuth();
	const isStudent = user?.role === 'student';

	// Memoize school data to prevent unnecessary re-renders
	const schoolData = useMemo(() => school, [school]);

	// Get subjects from school profile based on session, grade level - memoized
	const SUBJECTS = useMemo(() => {
		if (!school) return [];
		if (isStudent && user?.session && user?.classLevel) {
			return (
				school.classLevels?.[user.session]?.[user.classLevel]?.subjects?.map(
					(s) => s.name,
				) || []
			);
		}

		const resolvedMeta =
			reportFilters.session && reportFilters.gradeLevel
				? { session: reportFilters.session, level: reportFilters.gradeLevel }
				: getClassMetaById(school.classLevels, reportFilters.className);

		if (resolvedMeta?.session && resolvedMeta?.level) {
			return (
				school.classLevels?.[resolvedMeta.session]?.[resolvedMeta.level]
					?.subjects?.map((s) => s.name) || []
			);
		}

		return [];
	}, [
		user,
		isStudent,
		school,
		reportFilters.session,
		reportFilters.gradeLevel,
		reportFilters.className,
	]);

	// Get class name from school profile - memoized
	const className = useMemo(() => {
		if (
			school?.classLevels?.[reportFilters.session]?.[reportFilters.gradeLevel]
				?.classes
		) {
			const classInfo = school.classLevels[reportFilters.session][
				reportFilters.gradeLevel
			].classes.find((c: any) => c.classId === reportFilters.className);
			return classInfo ? classInfo.name : reportFilters.className;
		}
		return reportFilters.className;
	}, [
		school,
		reportFilters.session,
		reportFilters.gradeLevel,
		reportFilters.className,
	]);

	// Memoize selected period label
	const selectedPeriodLabel = useMemo(() => {
		return (
			periodOptions.find((p) => p.value === reportFilters.period)?.label ||
			reportFilters.period
		);
	}, [reportFilters.period]);

	// Generate filename for download - memoized
	const fileName = useMemo(() => {
		const timestamp = new Date().toISOString().split('T')[0];
		if (studentsData.length === 1) {
			return `Periodic_Report_${studentsData[0].studentName.replace(
				/\s+/g,
				'_',
			)}_${timestamp}.pdf`;
		}
		return `Periodic_Report_${className.replace(
			/\s+/g,
			'_',
		)}_${selectedPeriodLabel.replace(/\s+/g, '_')}_${timestamp}.pdf`;
	}, [studentsData, className, selectedPeriodLabel]);

	// Memoize the PDF document to prevent re-rendering
	const pdfDocument = useMemo(() => {
		if (studentsData.length === 0 || !schoolData) return null;

		return (
			<PeriodicReportDocument
				studentsData={studentsData}
				reportFilters={reportFilters}
				subjects={SUBJECTS}
				className={className}
				selectedPeriodLabel={selectedPeriodLabel}
				schoolData={schoolData}
			/>
		);
	}, [
		studentsData,
		reportFilters,
		SUBJECTS,
		className,
		selectedPeriodLabel,
		schoolData,
	]);

	useEffect(() => {
		if (!pdfDocument) {
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
		const isMobile =
			typeof navigator !== 'undefined' &&
			/Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);

		pdf(pdfDocument)
			.toBlob()
			.then((blob) => {
				if (cancelled) return;
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
				if (isMobile) {
					setInlineError(true);
				}
			})
			.catch((err) => {
				console.error('Failed to generate PDF blob', err);
				if (!cancelled) setPdfUrl(null);
			})
			.finally(() => {
				if (!cancelled) setPdfGenerating(false);
			});

		return () => {
			cancelled = true;
		};
	}, [pdfDocument]);

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

	// Fetch data only once when component mounts - use useCallback to prevent recreation
	const fetchAndMergeGrades = useCallback(async () => {
		// If there are no active students to display, don't fetch grades.
		if (!activeStudents || activeStudents.length === 0) {
			setStudentsData([]);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const cacheKey = `periodic:report:${reportFilters.academicYear}:${reportFilters.className}:${reportFilters.period}`;
			const cachedReport = getClientCache<PeriodicStudentData[]>(cacheKey);
			if (cachedReport) {
				setStudentsData(cachedReport);
				setLoading(false);
				return;
			}

			const params = new URLSearchParams({
				period: reportFilters.period,
				academicYear: reportFilters.academicYear,
				classId: reportFilters.className,
				session: reportFilters.session,
			});

			// We fetch grades for the whole class to build rank, then filter locally
			const res = await fetch(`/api/grades?${params.toString()}`);
			if (!res.ok) throw new Error('Failed to fetch periodic grades');
			const data = await res.json();

			if (!data.success) {
				throw new Error(data.message || 'Invalid data format from server');
			}
			const gradeReports: PeriodicStudentData[] = Array.isArray(
				data.data?.report,
			)
				? data.data.report
				: data.data?.report
					? [data.data.report]
					: [];
			const gradesMap = new Map<string, PeriodicStudentData>();

			if (Array.isArray(gradeReports)) {
				gradeReports.forEach((report) => {
					if (report && report.studentId) {
						gradesMap.set(report.studentId, report);
					}
				});
			}

			// The final data is based on the activeStudents list
			const finalReportData = activeStudents.map((activeStudent) => {
				const gradeData = gradesMap.get(activeStudent.id);
				if (gradeData) {
					// Student has grades, use the data from the API (including rank from backend)
					return gradeData;
				} else {
					// This active student has no grades, create a default entry (no rank assigned)
					return {
						studentId: activeStudent.id,
						studentName: activeStudent.name,
						subjects: [], // Will result in '-' for all subjects
						periodicAverage: 0,
						rank: NaN, // No rank assigned
					};
				}
			});

			setStudentsData(finalReportData);
			setClientCache(cacheKey, finalReportData);
		} catch (err) {
			console.error('Error fetching and merging grades:', err);
			setError(
				err instanceof Error ? err.message : 'Failed to load report data',
			);
		} finally {
			setLoading(false);
		}
	}, [
		activeStudents,
		reportFilters.period,
		reportFilters.academicYear,
		reportFilters.className,
		reportFilters.session,
	]);

	// Only fetch data once on mount or when filters/students change
	useEffect(() => {
		fetchAndMergeGrades();
	}, [fetchAndMergeGrades]);

	// Stable back handler
	const handleBack = useCallback(() => {
		onBack();
	}, [onBack]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<PageLoading message="Generating Grade Sheet" fullScreen={false} />
			</div>
		);
	}

	// Handle both error cases and no students found cases
	if (error || studentsData.length === 0) {
		const isNoStudentsFound = !error && studentsData.length === 0;

		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
				<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6 text-center">
					<h2 className="text-lg font-semibold mb-4">
						{isNoStudentsFound ? 'No Students Found' : 'No Data Found'}
					</h2>
					<p className="text-muted-foreground mb-6">
						{isNoStudentsFound
							? 'No students were found matching the selected filters.'
							: error ||
								'No periodic student data found for the selected filters.'}
					</p>
					<button
						type="button"
						onClick={handleBack}
						className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary"
					>
						← Back to Filter
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full h-screen bg-background flex flex-col">
			<div className="flex justify-between items-center px-4 sm:px-8 py-4 bg-background border-b border-border">
				<button
					type="button"
					onClick={handleBack}
					className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm"
				>
					← Back to Filter
				</button>

				{/* Download Button */}
				<div className="flex items-center gap-2">
					{isStudent && !inlineError && (
						<button
							type="button"
							onClick={() => {
								if (!pdfBlob || !downloadUrl) return;
								const createShare = (cacheKey: string) =>
									fetch('/api/reports/share', {
										method: 'POST',
										headers: { 'Content-Type': 'application/json' },
										body: JSON.stringify({
											cacheKey,
											fileName,
											reportType: 'periodic',
											createdBy: user?.id || user?._id || user?.studentId || '',
										}),
									}).then((res) => res.json());
								const doShare = (cacheKey: string) => {
									setShareLoading(true);
									createShare(cacheKey).then((data) => {
										if (!data?.shareUrl || !data?.pin) return;
										setShareInfo({
											url: data.shareUrl,
											pin: data.pin,
											expiresAt: data.expiresAt,
										});
										setShareModalOpen(true);
										setCopiedLink(false);
										setCopiedPin(false);
										setShareNotice('');
										setShareLoading(false);
									});
								};
								if (serverKey) {
									doShare(serverKey);
									return;
								}
								fetch('/api/reports/pdf', {
									method: 'POST',
									headers: { 'Content-Type': 'application/pdf' },
									body: pdfBlob,
								})
									.then((res) => res.json())
									.then((data) => {
										if (data?.cacheKey) {
											setServerKey(data.cacheKey);
											doShare(data.cacheKey);
										}
									});
							}}
							disabled={!downloadUrl || pdfGenerating}
							className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm inline-flex items-center gap-2 disabled:opacity-50"
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
							Share Grade Sheet
						</button>
					)}
					<button
						type="button"
						onClick={() => {
							if (!downloadUrl) return;
							const link = document.createElement('a');
							link.href = downloadUrl;
							link.download = fileName;
							document.body.appendChild(link);
							link.click();
							link.remove();
						}}
						disabled={!downloadUrl || pdfGenerating}
						className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm inline-flex items-center gap-2 disabled:opacity-50"
					>
						{pdfGenerating ? (
							<>
								<Spinner size="sm" />
								<span>Preparing PDF...</span>
							</>
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
								<span>Download Grade Sheet</span>
							</>
						)}
					</button>
				</div>
			</div>

			<div className="flex-1 bg-gray-100">
				{pdfUrl ? (
					<div className="w-full" style={{ height: '80vh' }}>
						{inlineError ? (
							<div className="flex items-center justify-center h-full">
								<div className="flex flex-col items-center gap-3">
									<button
										type="button"
										onClick={() => {
											if (!pdfBlob || !downloadUrl) return;
											const openWithKey = (key: string) => {
												const url = `/api/reports/pdf?key=${encodeURIComponent(
													key,
												)}&fileName=${encodeURIComponent(fileName)}`;
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
														window.open(
															downloadUrl,
															'_blank',
															'noopener,noreferrer',
														);
													}
													setViewLoading(false);
												})
												.catch(() => {
													window.open(
														downloadUrl,
														'_blank',
														'noopener,noreferrer',
													);
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
										{viewLoading ? 'Opening...' : 'View Grade Sheet'}
									</button>
									{isStudent && (
										<button
											type="button"
											onClick={() => {
												if (!pdfBlob || !downloadUrl) return;
												const createShare = (cacheKey: string) =>
													fetch('/api/reports/share', {
														method: 'POST',
														headers: { 'Content-Type': 'application/json' },
														body: JSON.stringify({
															cacheKey,
															fileName,
															reportType: 'periodic',
															createdBy:
																user?.id || user?._id || user?.studentId || '',
														}),
													}).then((res) => res.json());
												const doShare = (cacheKey: string) => {
													setShareLoading(true);
													createShare(cacheKey).then((data) => {
														if (!data?.shareUrl || !data?.pin) return;
														setShareInfo({
															url: data.shareUrl,
															pin: data.pin,
															expiresAt: data.expiresAt,
														});
														setShareModalOpen(true);
														setCopiedLink(false);
														setCopiedPin(false);
														setShareLoading(false);
													});
												};
												if (serverKey) {
													doShare(serverKey);
													return;
												}
												fetch('/api/reports/pdf', {
													method: 'POST',
													headers: { 'Content-Type': 'application/pdf' },
													body: pdfBlob,
												})
													.then((res) => res.json())
													.then((data) => {
														if (data?.cacheKey) {
															setServerKey(data.cacheKey);
															doShare(data.cacheKey);
														}
													});
											}}
											disabled={!downloadUrl || pdfGenerating}
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
												: 'Share Grade Sheet'}
										</button>
									)}
								</div>
							</div>
						) : (
							<iframe
								title="Periodic Report PDF"
								className="w-full h-full"
								style={{ border: 'none' }}
								src={pdfUrl}
								onError={() => setInlineError(true)}
							/>
						)}
					</div>
				) : (
					<div className="flex items-center justify-center h-full">
						<div className="text-center">
							{studentsData.length === 0 ? (
								<>
									<p className="text-muted-foreground mb-4">
										No student data available for PDF generation
									</p>
									<button
										type="button"
										onClick={handleBack}
										className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
									>
										← Back to Filter
									</button>
								</>
							) : !schoolData ? (
								<>
									<p className="text-muted-foreground mb-4">
										Waiting for school data...
									</p>
									<Spinner size="lg" />
								</>
							) : (
								<>
									<p className="text-muted-foreground mb-4">
										PDF document is being prepared...
									</p>
									<Spinner size="lg" />
									<div className="mt-4 text-sm text-muted-foreground">
										<p>Students: {studentsData.length}</p>
										<p>Subjects: {SUBJECTS.length}</p>
										<p>Class: {className}</p>
									</div>
								</>
							)}
						</div>
					</div>
				)}
			</div>
			{shareModalOpen && shareInfo && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
					<div className="bg-card w-full max-w-md rounded-xl border border-border shadow-xl">
						<div className="flex items-center justify-between p-4 border-b border-border">
							<h5 className="text-lg font-semibold text-foreground">
								Share Grade Sheet
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
											<svg
												className="h-3.5 w-3.5 text-green-600"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={3}
													d="M5 13l4 4L19 7"
												/>
											</svg>
											Copied
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
											<svg
												className="h-3.5 w-3.5 text-green-600"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={3}
													d="M5 13l4 4L19 7"
												/>
											</svg>
											Copied
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
								</div>
								<div className="flex flex-wrap gap-2">
									{[
										{
											label: 'WhatsApp',
											Icon: MessageCircle,
											build: () =>
												`https://wa.me/?text=${encodeURIComponent(
													`Grade Sheet link: ${shareInfo.url} | PIN: ${shareInfo.pin}`,
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
													`Grade Sheet link: ${shareInfo.url} | PIN: ${shareInfo.pin}`,
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
													'Grade Sheet',
												)}&body=${encodeURIComponent(
													`Grade Sheet link: ${shareInfo.url}\nPIN: ${shareInfo.pin}`,
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

export default function PeriodicReportWrapper() {
	const [showReport, setShowReport] = useState(false);
	const [activeStudents, setActiveStudents] = useState<Student[]>([]);
	const [filters, setFilters] = useState<{
		academicYear: string;
		period: string;
		session: string;
		gradeLevel: string;
		className: string;
		selectedStudents: string[];
	}>({
		academicYear: getCurrentAcademicYear(),
		period: '',
		session: '',
		gradeLevel: '',
		className: '',
		selectedStudents: [],
	});

	// Memoize handlers to prevent unnecessary re-renders
	const handleFilterSubmit = useCallback((students: Student[]) => {
		setActiveStudents(students);
		setShowReport(true);
	}, []);

	const handleBack = useCallback(() => {
		setShowReport(false);
		setActiveStudents([]); // Clear the student list when going back
	}, []);

	// Memoize the filter content to prevent unnecessary re-renders
	const filterContent = useMemo(
		() => (
			<FilterContent
				filters={filters}
				setFilters={setFilters}
				onSubmit={handleFilterSubmit}
			/>
		),
		[filters, handleFilterSubmit],
	);

	// Memoize the report content with a stable key based on filter values
	const reportContent = useMemo(() => {
		if (!showReport) return null;

		// Create a stable key based on filter values to ensure fresh data fetch only when needed
		const filterKey = `${filters.academicYear}-${filters.period}-${
			filters.session
		}-${filters.gradeLevel}-${
			filters.className
		}-${filters.selectedStudents.join(',')}`;

		return (
			<ReportContent
				key={filterKey}
				reportFilters={filters}
				activeStudents={activeStudents}
				onBack={handleBack}
			/>
		);
	}, [showReport, filters, activeStudents, handleBack]);

	return (
		<div className="w-full h-screen bg-background">
			{!showReport ? filterContent : reportContent}
		</div>
	);
}
