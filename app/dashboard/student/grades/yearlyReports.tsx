'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
	Document,
	Page,
	PDFViewer,
	Text,
	View,
	Image,
} from '@react-pdf/renderer';
import styles from './styles';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';

function gradeStyle(score: string | number | null) {
	if (score === null || Number.isNaN(score) || Number(score) < 70) {
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

interface StudentYearlyReport {
	studentId: string;
	studentName: string;
	periods: Record<string, Array<{ subject: string; grade: number | null }>>;
	firstSemesterAverage: Record<string, number | null>;
	secondSemesterAverage: Record<string, number | null>;
	periodAverages: Record<string, number | null>;
	yearlyAverage: number | null;
	ranks: Record<string, number | null>;
}

interface Student {
	id: string;
	name: string;
	className: string;
}

const academicYearOptions = [
	'2024/2025',
	'2023/2024',
	'2022/2023',
	'2021/2022',
];

// Get current academic year (2024/2025 format)
const getCurrentAcademicYear = () => {
	const currentDate = new Date();
	const currentYear = currentDate.getFullYear();
	const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

	// Academic year typically starts in August/September
	// If current month is August (8) or later, we're in the new academic year
	if (currentMonth >= 8) {
		return `${currentYear}/${currentYear + 1}`;
	} else {
		return `${currentYear - 1}/${currentYear}`;
	}
};

function StudentMultiSelect({
	students,
	selectedStudents,
	onSelectionChange,
	className,
}: {
	students: Student[];
	selectedStudents: string[];
	onSelectionChange: (studentIds: string[]) => void;
	className: string;
}) {
	const [searchTerm, setSearchTerm] = useState('');
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const filteredStudents = students.filter((student) =>
		student.name.toLowerCase().includes(searchTerm.toLowerCase())
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

	return (
		<div className="relative" ref={dropdownRef}>
			<label className="block text-sm font-medium mb-1">
				Select Students ({selectedStudents.length} selected)
			</label>
			<div
				className="w-full border border-border px-3 py-2 rounded bg-background text-foreground cursor-pointer min-h-[42px] flex items-center justify-between"
				onClick={() => setIsOpen(!isOpen)}
			>
				<div className="flex-1">
					{selectedStudents.length === 0 ? (
						<span className="text-muted-foreground">Select students...</span>
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
		session: string;
		gradeLevel: string;
		className: string;
		reportType: 'entire-class' | 'selected-students';
		selectedStudents: string[];
	};
	setFilters: React.Dispatch<
		React.SetStateAction<{
			academicYear: string;
			session: string;
			gradeLevel: string;
			className: string;
			reportType: 'entire-class' | 'selected-students';
			selectedStudents: string[];
		}>
	>;
	onSubmit: () => void;
}) {
	const currentSchool = useSchoolStore((state) => state.school);
	const { user } = useAuth();
	const [students, setStudents] = useState<Student[]>([]);
	const [loadingStudents, setLoadingStudents] = useState(false);

	// Get user role and determine access level
	const userRole = user?.role || 'student';
	const isSystemAdmin = userRole === 'system_admin';
	const isTeacher = userRole === 'teacher';
	const isStudent = userRole === 'student';

	// For students, auto-populate their class information
	useEffect(() => {
		if (isStudent && user) {
			// Get user's class information from their profile
			const userSession = user.session;
			const userGradeLevel = user.gradeLevel;
			const userClassId = user.classId;

			setFilters((prev) => ({
				...prev,
				session: userSession || '',
				gradeLevel: userGradeLevel || '',
				className: userClassId || '',
				reportType: 'selected-students',
				selectedStudents: [user.studentId || ''], // Only show their own report
			}));
		}
	}, [isStudent, user, setFilters]);

	// Get available sessions from school profile
	const availableSessions = currentSchool?.classLevels
		? Object.keys(currentSchool.classLevels)
		: [];

	// For non-system-admin users, filter sessions based on user's assignment or default to first session
	const getUserSessions = () => {
		if (isSystemAdmin) {
			return availableSessions;
		}

		// For students, only their session
		if (isStudent && user?.session) {
			return [user.session];
		}

		// For teachers and other roles, you might want to filter based on their assigned session
		// For now, we'll show all available sessions, but you can modify this logic
		// based on how user sessions are stored in your user object
		if (user?.session && availableSessions.includes(user.session)) {
			return [user.session];
		}

		return availableSessions;
	};

	const userAvailableSessions = getUserSessions();

	// Get available grade levels based on selected session
	const availableGradeLevels =
		filters.session && currentSchool?.classLevels?.[filters.session]
			? Object.keys(currentSchool.classLevels[filters.session])
			: [];

	// Get available classes based on session and grade level
	const availableClasses =
		filters.session &&
		filters.gradeLevel &&
		currentSchool?.classLevels?.[filters.session]?.[filters.gradeLevel]?.classes
			? currentSchool.classLevels[filters.session][filters.gradeLevel].classes
			: [];

	// Set default values on component mount
	useEffect(() => {
		if (!filters.academicYear) {
			const currentAcademicYear = getCurrentAcademicYear();
			setFilters((prev) => ({ ...prev, academicYear: currentAcademicYear }));
		}

		// Auto-select session for non-system-admin users if only one session is available
		if (
			!isSystemAdmin &&
			userAvailableSessions.length === 1 &&
			!filters.session &&
			!isStudent // Don't override student auto-selection
		) {
			setFilters((prev) => ({ ...prev, session: userAvailableSessions[0] }));
		}
	}, [
		filters.academicYear,
		filters.session,
		isSystemAdmin,
		userAvailableSessions,
		setFilters,
		isStudent,
	]);

	// Fetch students when class is selected
	useEffect(() => {
		if (filters.className && !isStudent) {
			const fetchStudents = async () => {
				try {
					setLoadingStudents(true);
					const response = await fetch(
						`/api/users?classId=${filters.className}&role=student`
					);
					if (response.ok) {
						const responseData = await response.json();
						if (responseData.success && responseData.data) {
							const mappedStudents = responseData.data.map((student: any) => ({
								id: student.studentId,
								name: `${student.firstName} ${
									student.middleName ? student.middleName + ' ' : ''
								}${student.lastName}`.trim(),
								className: student.classId,
							}));
							setStudents(mappedStudents);
						} else {
							console.error('Invalid response format:', responseData);
							setStudents([]);
						}
					} else {
						console.error('Failed to fetch students');
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
		} else if (isStudent) {
			// For students, set their own data
			if (user) {
				setStudents([
					{
						id: user.studentId || '',
						name: `${user.firstName} ${
							user.middleName ? user.middleName + ' ' : ''
						}${user.lastName}`.trim(),
						className: user.classId || '',
					},
				]);
			}
		} else {
			setStudents([]);
			setFilters((prev) => ({ ...prev, selectedStudents: [] }));
		}
	}, [filters.className, setFilters, isStudent, user]);

	// Reset dependent fields when parent fields change
	useEffect(() => {
		if (filters.reportType === 'entire-class') {
			setFilters((prev) => ({ ...prev, selectedStudents: [] }));
		}
	}, [filters.reportType, setFilters]);

	// Validation for submit button
	const canSubmit =
		filters.academicYear &&
		filters.className &&
		(isSystemAdmin ? filters.session : true) && // System admin must select session
		(filters.reportType === 'entire-class' ||
			filters.selectedStudents.length > 0);

	// Show loading if school profile is not loaded
	if (!currentSchool) {
		return <PageLoading fullScreen={false} />;
	}

	// If user is a student, show simplified view
	if (isStudent) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
				<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
					<h2 className="text-lg font-semibold mb-4 text-center">
						My Report Card
						{user && (
							<span className="block text-xs text-muted-foreground mt-1">
								Welcome, {user.firstName} {user.lastName}
							</span>
						)}
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

					{/* Display read-only class information */}
					<div className="mb-4 p-3 bg-muted/50 rounded border border-border">
						<p className="text-sm text-muted-foreground mb-1">
							Class Information
						</p>
						<p className="text-sm">
							<strong>Session:</strong> {user?.session || 'Not assigned'}
						</p>
						<p className="text-sm">
							<strong>Grade Level:</strong> {user?.gradeLevel || 'Not assigned'}
						</p>
						<p className="text-sm">
							<strong>Class:</strong>{' '}
							{currentSchool?.classLevels?.[user?.session || '']?.[
								user?.gradeLevel || ''
							]?.classes?.find((c: any) => c.classId === user?.classId)?.name ||
								user?.classId ||
								'Not assigned'}
						</p>
					</div>

					<div className="flex gap-2 mt-6">
						<button
							type="button"
							onClick={() => {
								setFilters((prev) => ({
									...prev,
									academicYear: getCurrentAcademicYear(),
								}));
							}}
							className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border"
						>
							Reset
						</button>
						<button
							type="button"
							onClick={onSubmit}
							className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary disabled:opacity-50"
							disabled={!canSubmit}
						>
							View Report
						</button>
					</div>
				</div>
			</div>
		);
	}

	// Regular view for admins and teachers
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
			<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
				<h2 className="text-lg font-semibold mb-4 text-center">
					Filter Report Card
					{isSystemAdmin && (
						<span className="block text-xs text-muted-foreground mt-1">
							System Admin - View All Students
						</span>
					)}
					{user && (
						<span className="block text-xs text-muted-foreground mt-1">
							Welcome, {user.firstName} {user.lastName}
						</span>
					)}
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

				{/* Session selection - shown for all users but may be auto-selected for non-admins */}
				{userAvailableSessions.length > 0 && (
					<div className="mb-4">
						<label className="block text-sm font-medium mb-1">Session</label>
						{userAvailableSessions.length === 1 && !isSystemAdmin ? (
							<div className="w-full border border-border px-3 py-2 rounded bg-muted text-foreground">
								{userAvailableSessions[0]} (Auto-selected)
							</div>
						) : (
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
								{userAvailableSessions.map((session) => (
									<option key={session} value={session}>
										{session}
									</option>
								))}
							</select>
						)}
					</div>
				)}

				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">Grade Level</label>
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
						disabled={!filters.academicYear || !filters.session}
					>
						<option value="">Select Grade Level</option>
						{availableGradeLevels.map((level) => (
							<option key={level} value={level}>
								{level}
							</option>
						))}
					</select>
				</div>

				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">Class</label>
					<select
						value={filters.className}
						onChange={(e) => {
							setFilters((f) => ({
								...f,
								className: e.target.value,
								selectedStudents: [],
								reportType: 'entire-class',
							}));
						}}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
						disabled={!filters.gradeLevel}
					>
						<option value="">Select Class</option>
						{availableClasses.map((classInfo: any) => (
							<option key={classInfo.classId} value={classInfo.classId}>
								{classInfo.name}
							</option>
						))}
					</select>
				</div>

				{filters.className && (
					<div className="mb-4">
						<label className="block text-sm font-medium mb-2">
							Report Type
						</label>
						<div className="flex items-center justify-between p-3 bg-muted/50 rounded border border-border">
							<span className="text-sm">
								{filters.reportType === 'entire-class'
									? 'Entire Class'
									: 'Selected Students'}
							</span>
							<div className="relative inline-block w-12 h-6">
								<input
									type="checkbox"
									checked={filters.reportType === 'selected-students'}
									onChange={(e) => {
										setFilters((prev) => ({
											...prev,
											reportType: e.target.checked
												? 'selected-students'
												: 'entire-class',
										}));
									}}
									className="sr-only"
								/>
								<div
									className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${
										filters.reportType === 'selected-students'
											? 'bg-primary'
											: 'bg-muted-foreground/30'
									}`}
									onClick={() => {
										setFilters((prev) => ({
											...prev,
											reportType:
												prev.reportType === 'entire-class'
													? 'selected-students'
													: 'entire-class',
										}));
									}}
								>
									<div
										className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
											filters.reportType === 'selected-students'
												? 'transform translate-x-6'
												: ''
										}`}
									/>
								</div>
							</div>
						</div>
					</div>
				)}

				{filters.className && filters.reportType === 'selected-students' && (
					<div className="mb-4">
						{loadingStudents ? (
							<div className="flex items-center justify-center py-8">
								<div className="text-sm text-muted-foreground">
									Loading students...
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
								className={filters.className}
							/>
						)}
					</div>
				)}

				<div className="flex gap-2 mt-6">
					<button
						type="button"
						onClick={() => {
							const defaultSession =
								!isSystemAdmin && userAvailableSessions.length === 1
									? userAvailableSessions[0]
									: '';
							setFilters({
								academicYear: getCurrentAcademicYear(),
								session: defaultSession,
								gradeLevel: '',
								className: '',
								reportType: 'entire-class',
								selectedStudents: [],
							});
						}}
						className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border"
					>
						Reset
					</button>
					<button
						type="button"
						onClick={onSubmit}
						className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary disabled:opacity-50"
						disabled={!canSubmit}
					>
						Apply Filter
					</button>
				</div>

				{/* Debug info for development */}
				{process.env.NODE_ENV === 'development' && (
					<div className="mt-4 p-2 bg-muted/20 rounded text-xs">
						<p>
							User: {user?.firstName} {user?.lastName} ({userRole})
						</p>
						<p>Sessions: {userAvailableSessions.join(', ')}</p>
						<p>Current Session: {filters.session || 'None'}</p>
					</div>
				)}
			</div>
		</div>
	);
}

function ReportContent({
	reportFilters,
	onBack,
}: {
	reportFilters: {
		academicYear: string;
		session: string;
		gradeLevel: string;
		className: string;
		selectedStudents: string[];
	};
	onBack: () => void;
}) {
	const [studentsData, setStudentsData] = useState<StudentYearlyReport[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const school = useSchoolStore((state) => state.school);
	const currentSchool = useSchoolStore((state) => state.school);
	const { user } = useAuth();

	useEffect(() => {
		const fetchStudentsData = async () => {
			try {
				setLoading(true);
				setError(null);

				// Get all subjects for the class from school profile
				const classSubjects =
					currentSchool?.classLevels?.[reportFilters.session]?.[
						reportFilters.gradeLevel
					]?.subjects || [];

				// Fetch all students in the class
				const studentsResponse = await fetch(
					`/api/users?classId=${reportFilters.className}&role=student`
				);

				if (!studentsResponse.ok) throw new Error('Failed to fetch students');
				const studentsData = await studentsResponse.json();

				if (!studentsData.success || !studentsData.data) {
					throw new Error('Invalid student data format');
				}

				// If specific students are selected, filter the list
				let studentsToProcess = studentsData.data;
				if (reportFilters.selectedStudents.length > 0) {
					studentsToProcess = studentsData.data.filter((student: any) =>
						reportFilters.selectedStudents.includes(student.studentId)
					);
				}

				// Fetch grades for all students
				const params: any = {
					classId: reportFilters.className,
					academicYear: reportFilters.academicYear,
				};

				// Add session parameter
				if (reportFilters.session) {
					params.session = reportFilters.session;
				}

				const url = new URL('/api/grades', window.location.origin);
				Object.entries(params).forEach(([key, value]) => {
					if (value) url.searchParams.append(key, value as string);
				});

				const gradesResponse = await fetch(url.toString());
				let gradesData = { success: true, data: { report: [] } };

				if (gradesResponse.ok) {
					gradesData = await gradesResponse.json();
				}

				// Normalize the grades response to always be an array
				const existingReports = Array.isArray(gradesData.data?.report)
					? gradesData.data.report
					: gradesData.data?.report
					? [gradesData.data.report]
					: [];

				// Create report data for all students, merging with existing grades
				const reportData = studentsToProcess.map((student: any) => {
					const studentId = student.studentId;
					const studentName = `${student.firstName} ${
						student.middleName ? student.middleName + ' ' : ''
					}${student.lastName}`.trim();

					// Find existing report for this student
					const existingReport = existingReports.find(
						(report: any) => report.studentId === studentId
					);

					// Initialize periods with all subjects
					const periods: Record<
						string,
						Array<{ subject: string; grade: number | null }>
					> = {
						firstPeriod: classSubjects.map((subject) => ({
							subject,
							grade: null,
						})),
						secondPeriod: classSubjects.map((subject) => ({
							subject,
							grade: null,
						})),
						thirdPeriod: classSubjects.map((subject) => ({
							subject,
							grade: null,
						})),
						thirdPeriodExam: classSubjects.map((subject) => ({
							subject,
							grade: null,
						})),
						fourthPeriod: classSubjects.map((subject) => ({
							subject,
							grade: null,
						})),
						fifthPeriod: classSubjects.map((subject) => ({
							subject,
							grade: null,
						})),
						sixthPeriod: classSubjects.map((subject) => ({
							subject,
							grade: null,
						})),
						sixthPeriodExam: classSubjects.map((subject) => ({
							subject,
							grade: null,
						})),
					};

					// Initialize averages and ranks
					const firstSemesterAverage: Record<string, number | null> = {};
					const secondSemesterAverage: Record<string, number | null> = {};
					const periodAverages: Record<string, number | null> = {
						firstPeriod: null,
						secondPeriod: null,
						thirdPeriod: null,
						thirdPeriodExam: null,
						fourthPeriod: null,
						fifthPeriod: null,
						sixthPeriod: null,
						sixthPeriodExam: null,
						firstSemesterAverage: null,
						secondSemesterAverage: null,
					};

					const ranks: Record<string, number | null> = {
						firstPeriod: null,
						secondPeriod: null,
						thirdPeriod: null,
						thirdPeriodExam: null,
						fourthPeriod: null,
						fifthPeriod: null,
						sixthPeriod: null,
						sixthPeriodExam: null,
						firstSemesterAverage: null,
						secondSemesterAverage: null,
						yearly: null,
					};

					// Initialize subject averages with null values
					classSubjects.forEach((subject) => {
						firstSemesterAverage[subject] = null;
						secondSemesterAverage[subject] = null;
					});

					let yearlyAverage: number | null = null;

					// If existing report found, merge the data
					if (existingReport) {
						// Merge period grades
						Object.keys(periods).forEach((period) => {
							if (existingReport.periods[period]) {
								existingReport.periods[period].forEach((gradeEntry: any) => {
									const subjectIndex = periods[period].findIndex(
										(item) => item.subject === gradeEntry.subject
									);
									if (subjectIndex !== -1) {
										periods[period][subjectIndex].grade = gradeEntry.grade;
									}
								});
							}
						});

						// Merge averages
						Object.assign(
							firstSemesterAverage,
							existingReport.firstSemesterAverage || {}
						);
						Object.assign(
							secondSemesterAverage,
							existingReport.secondSemesterAverage || {}
						);
						Object.assign(periodAverages, existingReport.periodAverages || {});
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
				});

				setStudentsData(reportData);
			} catch (err: any) {
				console.error('Error fetching students data:', err);
				setError(err.message || 'Failed to load students data');
			} finally {
				setLoading(false);
			}
		};
		fetchStudentsData();
	}, [
		reportFilters.academicYear,
		reportFilters.session,
		reportFilters.className,
		reportFilters.selectedStudents,
		currentSchool,
	]);

	if (loading) {
		return <PageLoading fullScreen={false} />;
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
				<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6 text-center">
					<h2 className="text-lg font-semibold mb-4 text-destructive">Error</h2>
					<p className="text-muted-foreground mb-6">{error}</p>
					<button
						type="button"
						onClick={onBack}
						className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary"
					>
						← Back to Filter
					</button>
				</div>
			</div>
		);
	}

	if (!studentsData || studentsData.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
				<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6 text-center">
					<h2 className="text-lg font-semibold mb-4">No Data Found</h2>
					<p className="text-muted-foreground mb-6">
						No student data found for the selected academic year and class.
					</p>
					<button
						type="button"
						onClick={onBack}
						className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary"
					>
						← Back to Filter
					</button>
				</div>
			</div>
		);
	}

	// Get class name from school profile
	const getClassName = () => {
		if (
			currentSchool?.classLevels?.[reportFilters.session]?.[
				reportFilters.gradeLevel
			]?.classes
		) {
			const classInfo = currentSchool.classLevels[reportFilters.session][
				reportFilters.gradeLevel
			].classes.find((c: any) => c.classId === reportFilters.className);
			return classInfo ? classInfo.name : reportFilters.className;
		}
		return reportFilters.className;
	};

	const className = getClassName();

	// Get all subjects for the class
	const classSubjects =
		currentSchool?.classLevels?.[reportFilters.session]?.[
			reportFilters.gradeLevel
		]?.subjects || [];

	return (
		<div className="w-full h-screen bg-background flex flex-col">
			<div className="flex justify-between items-center px-8 py-4">
				<div className="text-sm text-muted-foreground">
					{user && `Generated by: ${user.firstName} ${user.lastName}`}
				</div>
				<button
					type="button"
					onClick={onBack}
					className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm"
				>
					← Back to Filter
				</button>
			</div>
			<div className="flex-1">
				<PDFViewer className="w-full h-[calc(100vh-80px)] bg-background">
					<Document
						title={`Report Card for ${className} - ${reportFilters.academicYear}`}
					>
						{studentsData.map((studentData, studentIndex) => {
							const subjects = classSubjects;

							const getGrade = (period: string, subject: string) =>
								studentData.periods[period]?.find((s) => s.subject === subject)
									?.grade ?? null;

							const getOverallSubjectAverage = (subject: string) => {
								const sem1Avg = studentData.firstSemesterAverage[subject];
								const sem2Avg = studentData.secondSemesterAverage[subject];

								if (
									sem1Avg !== null &&
									sem1Avg !== undefined &&
									sem2Avg !== null &&
									sem2Avg !== undefined
								) {
									return Math.round((sem1Avg + sem2Avg) / 2);
								}
								return null;
							};

							return (
								<React.Fragment key={studentIndex}>
									{/* First Page - Grades */}
									<Page size="A4" orientation="landscape" style={styles.page}>
										<View style={styles.topRow}>
											<View style={styles.headerLeft}>
												<Text style={{ fontWeight: 'bold' }}>
													Name: {studentData.studentName}
												</Text>
												<Text>Class: {className}</Text>
												<Text>ID: {studentData.studentId}</Text>
												{reportFilters.session && (
													<Text>Session: {reportFilters.session}</Text>
												)}
											</View>
											<View style={styles.headerRight}>
												<Text style={{ fontWeight: 'bold' }}>
													Academic Year: {reportFilters.academicYear}
												</Text>
											</View>
										</View>
										<View style={styles.gradesContainer}>
											<View style={styles.semester}>
												<Text style={styles.semesterHeader}>
													First Semester
												</Text>
												<View style={styles.tableHeader}>
													<Text style={styles.subjectCell}>Subject</Text>
													<Text style={styles.tableCell}>1st Period</Text>
													<Text style={styles.tableCell}>2nd Period</Text>
													<Text style={styles.tableCell}>3rd Period</Text>
													<Text style={styles.tableCell}>Exam</Text>
													<Text style={styles.tableCell}>Average</Text>
												</View>
												{subjects.map((subject, index) => (
													<View key={index} style={styles.tableRow}>
														<Text style={styles.subjectCell}>{subject}</Text>
														<Text
															style={gradeStyle(
																getGrade('firstPeriod', subject)
															)}
														>
															{getGrade('firstPeriod', subject) ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																getGrade('secondPeriod', subject)
															)}
														>
															{getGrade('secondPeriod', subject) ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																getGrade('thirdPeriod', subject)
															)}
														>
															{getGrade('thirdPeriod', subject) ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																getGrade('thirdPeriodExam', subject)
															)}
														>
															{getGrade('thirdPeriodExam', subject) ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																studentData.firstSemesterAverage[subject]
															)}
														>
															{studentData.firstSemesterAverage[subject] ?? '-'}
														</Text>
													</View>
												))}
												<View
													style={{
														...styles.tableRow,
														backgroundColor: '#f0f8ff',
													}}
												>
													<Text
														style={{
															...styles.subjectCell,
															fontWeight: 'bold',
														}}
													>
														Average
													</Text>
													<Text
														style={gradeStyle(
															studentData.periodAverages.firstPeriod
														)}
													>
														{studentData.periodAverages.firstPeriod?.toFixed(
															1
														) ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															studentData.periodAverages.secondPeriod
														)}
													>
														{studentData.periodAverages.secondPeriod?.toFixed(
															1
														) ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															studentData.periodAverages.thirdPeriod
														)}
													>
														{studentData.periodAverages.thirdPeriod?.toFixed(
															1
														) ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															studentData.periodAverages.thirdPeriodExam
														)}
													>
														{studentData.periodAverages.thirdPeriodExam?.toFixed(
															1
														) ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															studentData.periodAverages.firstSemesterAverage
														)}
													>
														{studentData.periodAverages.firstSemesterAverage?.toFixed(
															1
														) ?? '-'}
													</Text>
												</View>
												<View
													style={{
														...styles.tableRow,
														backgroundColor: '#f0f8ff',
													}}
												>
													<Text
														style={{
															...styles.subjectCell,
															fontWeight: 'bold',
														}}
													>
														Rank
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.firstPeriod ?? '-'}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.secondPeriod ?? '-'}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.thirdPeriod ?? '-'}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.thirdPeriodExam ?? '-'}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.firstSemesterAverage ?? '-'}
													</Text>
												</View>
											</View>
											<View style={styles.lastSemester}>
												<Text style={styles.semesterHeader}>
													Second Semester
												</Text>
												<View style={styles.tableHeader}>
													<Text style={styles.tableCell}>4th Period</Text>
													<Text style={styles.tableCell}>5th Period</Text>
													<Text style={styles.tableCell}>6th Period</Text>
													<Text style={styles.tableCell}>Exam</Text>
													<Text style={styles.tableCell}>Average</Text>
													<Text style={styles.lastCell}>Yearly Average</Text>
												</View>
												{subjects.map((subject, index) => (
													<View key={index} style={styles.tableRow}>
														<Text
															style={gradeStyle(
																getGrade('fourthPeriod', subject)
															)}
														>
															{getGrade('fourthPeriod', subject) ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																getGrade('fifthPeriod', subject)
															)}
														>
															{getGrade('fifthPeriod', subject) ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																getGrade('sixthPeriod', subject)
															)}
														>
															{getGrade('sixthPeriod', subject) ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																getGrade('sixthPeriodExam', subject)
															)}
														>
															{getGrade('sixthPeriodExam', subject) ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																studentData.secondSemesterAverage[subject]
															)}
														>
															{studentData.secondSemesterAverage[subject] ??
																'-'}
														</Text>
														<Text
															style={gradeStyle(
																getOverallSubjectAverage(subject)
															)}
														>
															{getOverallSubjectAverage(subject) ?? '-'}
														</Text>
													</View>
												))}
												<View
													style={{
														...styles.tableRow,
														backgroundColor: '#f0f8ff',
													}}
												>
													<Text
														style={gradeStyle(
															studentData.periodAverages.fourthPeriod
														)}
													>
														{studentData.periodAverages.fourthPeriod?.toFixed(
															1
														) ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															studentData.periodAverages.fifthPeriod
														)}
													>
														{studentData.periodAverages.fifthPeriod?.toFixed(
															1
														) ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															studentData.periodAverages.sixthPeriod
														)}
													>
														{studentData.periodAverages.sixthPeriod?.toFixed(
															1
														) ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															studentData.periodAverages.sixthPeriodExam
														)}
													>
														{studentData.periodAverages.sixthPeriodExam?.toFixed(
															1
														) ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															studentData.periodAverages.secondSemesterAverage
														)}
													>
														{studentData.periodAverages.secondSemesterAverage?.toFixed(
															1
														) ?? '-'}
													</Text>
													<Text style={gradeStyle(studentData.yearlyAverage)}>
														{studentData.yearlyAverage?.toFixed(1) ?? '-'}
													</Text>
												</View>
												<View
													style={{
														...styles.tableRow,
														backgroundColor: '#f0f8ff',
													}}
												>
													<Text style={styles.tableCell}>
														{studentData.ranks.fourthPeriod ?? '-'}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.fifthPeriod ?? '-'}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.sixthPeriod ?? '-'}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.sixthPeriodExam ?? '-'}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.secondSemesterAverage ?? '-'}
													</Text>
													<Text style={styles.lastCell}>
														{studentData.ranks.yearly ?? '-'}
													</Text>
												</View>
											</View>
										</View>
										<View style={styles.bottomSection}>
											<View style={styles.leftBottom}>
												<View style={styles.gradingMethod}>
													<Text style={styles.gradingTitle}>
														METHOD OF GRADING
													</Text>
													<Text style={styles.gradingText}>
														A = 90 - 100 Excellent
													</Text>
													<Text style={styles.gradingText}>
														B = 80 - 89 Very Good
													</Text>
													<Text style={styles.gradingText}>
														C = 75 - 79 Good
													</Text>
													<Text style={styles.gradingText}>
														D = 70 - 74 Fair
													</Text>
													<Text style={styles.gradingText}>
														F = Below 70 Fail
													</Text>
												</View>
											</View>
											<View style={styles.rightBottom}>
												<Text style={styles.promotionText}>
													Yearly Average below 70 will not be eligible for
													promotion.
												</Text>
												<View style={styles.signatureSection}>
													<Text>
														Teachers Remark: ____________________________
													</Text>
													<Text style={{ marginTop: 20 }}>
														Signed: _________________________
													</Text>
													<Text style={{ marginTop: 10, marginLeft: 50 }}>
														Isaac D. Jallah, Class Sponsor
													</Text>
												</View>
											</View>
										</View>
									</Page>
									{/* Second Page - School Info and Parent Section */}
									<Page size="A4" orientation="landscape" style={styles.page}>
										<View style={styles.pageTwoContainer}>
											<View
												style={{
													flex: 1,
													marginRight: 10,
													borderWidth: 1,
													borderColor: '#000',
													padding: 10,
												}}
											>
												<Text style={styles.parentsSectionTitle}>
													TO OUR PARENTS & GUARDIANS
												</Text>
												<Text
													style={{
														fontSize: 10,
														marginTop: 20,
														marginBottom: 30,
														textAlign: 'justify',
														lineHeight: 1.7,
													}}
												>
													This report will be periodically for your inspection.
													It is a pupil progress report by which pupils' work
													could result in lack of study, irregular attendance or
													something that could be connected, special attention
													should be paid to ensure that the child improves.
													Moreover, parent conferences with parent(s) or
													guardians are encouraged, and it will serve to secure
													the best co-operation for your child.
												</Text>
												<Text
													style={{
														fontSize: 12,
														fontWeight: 'bold',
														marginBottom: 30,
														textAlign: 'center',
													}}
												>
													Promotion Statement
												</Text>
												<Text
													style={{
														fontSize: 11,
														marginBottom: 15,
														fontStyle: 'italic',
														color: 'royalblue',
													}}
												>
													This is to certify that{' '}
													<Text style={{ textDecoration: 'underline' }}>
														{studentData.studentName}
													</Text>{' '}
													has satisfactorily completed the work of{' '}
													<Text style={{ textDecoration: 'underline' }}>
														{reportFilters.gradeLevel}
													</Text>
													and is promoted to{' '}
													<Text style={{ textDecoration: 'underline' }}> </Text>
													for Academic Year {reportFilters.academicYear}.
												</Text>
												<View
													style={{
														flexDirection: 'row',
														justifyContent: 'space-between',
														marginBottom: 20,
														marginTop: 40,
													}}
												>
													<Text>Date: ____________________</Text>
													<Text>Principal: __________________</Text>
												</View>
											</View>
											<View
												style={{
													flex: 1,
													marginLeft: 10,
													borderWidth: 1,
													borderColor: '#000',
													padding: 10,
												}}
											>
												<View style={styles.schoolHeader}>
													<Text style={styles.schoolName}>{school?.name}</Text>
													<View>
														<View
															style={{
																alignSelf: 'center',
																marginBottom: 10,
																justifyContent: 'center',
																alignItems: 'center',
																left: -140,
																bottom: -8,
															}}
														>
															<Image
																src={school?.logoUrl2}
																style={{
																	width: 65,
																	height: 65,
																}}
															/>
														</View>
														<Text style={styles.schoolDetails}>
															Daycare, Nursery, Kindergarten, Elem, Junior &
															Senior High
														</Text>
														<Text style={styles.schoolDetails}>
															{school?.address[0]}
														</Text>
														<Text style={styles.schoolDetails}>
															{school?.address[1]}
														</Text>
														<Text style={styles.schoolDetails}>
															Email: {school?.emails[0]}
														</Text>
														<Text style={styles.schoolDetails}>
															Website: www.uca.con.lr
														</Text>
														<View
															style={{
																alignSelf: 'center',
																marginBottom: 10,
																justifyContent: 'center',
																alignItems: 'center',
																top: -130,
																right: -145,
															}}
														>
															<Image
																src={school?.logoUrl}
																style={{
																	width: 65,
																	height: 65,
																}}
															/>
														</View>
													</View>
													<Text style={styles.reportTitle}>
														{reportFilters.gradeLevel?.toUpperCase()} PROGRESS
														REPORT
													</Text>
												</View>
												<View
													style={{
														flexDirection: 'row',
														justifyContent: 'space-between',
														marginBottom: 10,
													}}
												>
													<View style={{ flexDirection: 'column' }}>
														<Text>
															Name:{' '}
															<Text style={{ fontWeight: 'bold' }}>
																{studentData.studentName}
															</Text>
														</Text>
														<Text>
															Class:{' '}
															<Text style={{ fontWeight: 'bold' }}>
																{className}
															</Text>
														</Text>
														{reportFilters.session && (
															<Text>
																Session:{' '}
																<Text style={{ fontWeight: 'bold' }}>
																	{reportFilters.session}
																</Text>
															</Text>
														)}
													</View>
													<View
														style={{
															flexDirection: 'column',
															alignItems: 'flex-start',
														}}
													>
														<Text>
															ID:{' '}
															<Text style={{ fontWeight: 'bold' }}>
																{studentData.studentId}
															</Text>
														</Text>
														<Text>
															Academic Year:{' '}
															<Text style={{ fontWeight: 'bold' }}>
																{reportFilters.academicYear}
															</Text>
														</Text>
													</View>
												</View>
												<Text
													style={{
														fontSize: 12,
														fontWeight: 'bold',
														marginBottom: 10,
														textAlign: 'center',
														marginTop: 15,
													}}
												>
													PARENTS OR GUARDIANS
												</Text>
												<Text
													style={{
														fontSize: 10,
														marginBottom: 12,
														textAlign: 'justify',
														fontStyle: 'italic',
													}}
												>
													Please sign below as evidence that you have examined
													this report with possible recommendation or invitation
													to your son(s) or daughter(s) as this instrument could
													shape your child's destiny.
												</Text>
												<View
													style={{
														borderWidth: 1,
														borderColor: '#000',
														marginBottom: 6,
													}}
												>
													<View
														style={{
															flexDirection: 'row',
															backgroundColor: '#f0f0f0',
															fontSize: 14,
															fontWeight: 'bold',
														}}
													>
														<Text
															style={{
																flex: 2,
																padding: 3,
																borderRight: 0.5,
																borderRightColor: '#000',
																textAlign: 'center',
																fontSize: 8,
															}}
														>
															Parent
														</Text>
														<Text
															style={{
																flex: 3,
																padding: 3,
																borderRight: 0.5,
																borderRightColor: '#000',
																textAlign: 'center',
																fontSize: 8,
															}}
														>
															Class Teacher
														</Text>
														<Text
															style={{
																flex: 3,
																padding: 3,
																textAlign: 'center',
																fontSize: 8,
															}}
														>
															Parent/Guardian
														</Text>
													</View>
													{['1st ', '2nd ', '3rd ', '4th ', '5th ', '6th '].map(
														(row) => (
															<View
																key={row}
																style={{ flexDirection: 'row', minHeight: 15 }}
															>
																<Text
																	style={{
																		flex: 2,
																		padding: 3,
																		borderRight: 0.5,
																		borderRightColor: '#000',
																		borderTop: 0.5,
																		borderTopColor: '#000',
																		textAlign: 'center',
																		fontSize: 10,
																		color: 'royalblue',
																	}}
																>
																	{row}
																</Text>
																<Text
																	style={{
																		flex: 3,
																		padding: 3,
																		borderRight: 0.5,
																		borderRightColor: '#000',
																		borderTop: 0.5,
																		borderTopColor: '#000',
																	}}
																></Text>
																<Text
																	style={{
																		flex: 3,
																		padding: 3,
																		borderTop: 0.5,
																		borderTopColor: '#000',
																	}}
																></Text>
															</View>
														)
													)}
												</View>
												<View style={styles.noteSection}>
													<Text
														style={{
															fontWeight: 'bold',
															marginBottom: 5,
															fontSize: 12,
															textAlign: 'center',
														}}
													>
														Note:
													</Text>
													<Text
														style={{
															textAlign: 'justify',
															fontSize: 10,
															fontStyle: 'italic',
														}}
													>
														When a student mark is 69 or below in any subject
														the parent or guardian should give special attention
														to see that the student does well in all the work
														required by the teacher, otherwise the student will
														probably{' '}
														<Text style={{ fontWeight: 'bold' }}>
															REPEAT THE CLASS.
														</Text>
													</Text>
												</View>
											</View>
										</View>
									</Page>
								</React.Fragment>
							);
						})}
					</Document>
				</PDFViewer>
			</div>
		</div>
	);
}

export default function YearlyReportWrapper() {
	const [showReport, setShowReport] = useState(false);
	const [filters, setFilters] = useState<{
		academicYear: string;
		session: string;
		gradeLevel: string;
		className: string;
		reportType: 'entire-class' | 'selected-students';
		selectedStudents: string[];
	}>({
		academicYear: getCurrentAcademicYear(),
		session: '',
		gradeLevel: '',
		className: '',
		reportType: 'entire-class',
		selectedStudents: [],
	});

	return (
		<div className="w-full h-screen bg-background">
			{!showReport ? (
				<FilterContent
					filters={filters}
					setFilters={setFilters}
					onSubmit={() => setShowReport(true)}
				/>
			) : (
				<ReportContent
					reportFilters={filters}
					onBack={() => setShowReport(false)}
				/>
			)}
		</div>
	);
}
