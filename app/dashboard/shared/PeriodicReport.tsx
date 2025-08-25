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
import Spinner from '@/components/ui/spinner';

interface StudentInfo {
	firstName: string;
	middleName: string;
	lastName: string;
	class: string;
	id: string;
	academicYear: string;
	grade: string;
}

interface Student {
	id: string;
	name: string;
	className: string;
}

interface Subject {
	name: string;
	marks: number;
}

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
	{ value: 'firstPeriod', label: 'First Period' },
	{ value: 'secondPeriod', label: 'Second Period' },
	{ value: 'thirdPeriod', label: 'Third Period' },
	{ value: 'fourthPeriod', label: 'Fourth Period' },
	{ value: 'fifthPeriod', label: 'Fifth Period' },
	{ value: 'sixthPeriod', label: 'Sixth Period' },
];

const academicYearOptions = [
	'2025/2026',
	'2024/2025',
	'2023/2024',
	'2022/2023',
];

// Get current academic year (2024/2025 format)
const getCurrentAcademicYear = () => {
	const currentDate = new Date();
	const currentYear = currentDate.getFullYear();
	const currentMonth = currentDate.getMonth() + 1;

	if (currentMonth >= 8) {
		return `${currentYear}/${currentYear + 1}`;
	} else {
		return `${currentYear - 1}/${currentYear}`;
	}
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
	perPage: number = 3
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

function SchoolHeader({ student }: { student: StudentInfo }) {
	const school = useSchoolStore((state) => state.school);
	return (
		<View style={{ marginBottom: 7 }}>
			<View
				style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}
			>
				<View>
					<Image
						src={school.logoUrl2 || school.logoUrl}
						style={{ width: 35 }}
					/>
				</View>
				<View style={{ flex: 1, alignItems: 'center' }}>
					<Text
						style={{ fontSize: 10, fontWeight: 'bold', textAlign: 'center' }}
					>
						{school.name}
					</Text>
					<Text style={{ fontSize: 7, textAlign: 'center', marginBottom: 1 }}>
						{school.address.join(', ')}
					</Text>
					<Text style={{ fontSize: 7, textAlign: 'center', marginBottom: 1 }}>
						P.O Box 2523 Montserrado County-Liberia
					</Text>
				</View>
				<View>
					<Image src={school.logoUrl} style={{ width: 35 }} />
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
	setFilters: React.Dispatch<
		React.SetStateAction<{
			academicYear: string;
			period: string;
			session: string;
			gradeLevel: string;
			className: string;
			selectedStudents: string[];
		}>
	>;
	onSubmit: () => void;
}) {
	const { user } = useAuth();
	const school = useSchoolStore((state) => state.school);
	const [students, setStudents] = useState<Student[]>([]);
	const [loadingStudents, setLoadingStudents] = useState(false);

	const isStudent = user?.role === 'student';
	const isSystemAdmin = user?.role === 'system_admin';

	// Determine available sessions and grade levels
	const availableSessions = school?.classLevels
		? Object.keys(school.classLevels)
		: [];
	const availableGradeLevels = filters.session
		? Object.keys(school?.classLevels?.[filters.session] || {})
		: [];

	// Auto-select session if only one is available
	useEffect(() => {
		if (isSystemAdmin && !filters.session && availableSessions.length === 1) {
			setFilters((prev) => ({
				...prev,
				session: availableSessions[0],
			}));
		}
	}, [isSystemAdmin, filters.session, availableSessions, setFilters]);

	// Auto-select grade level if only one is available for the selected session
	useEffect(() => {
		if (
			isSystemAdmin &&
			filters.session &&
			!filters.gradeLevel &&
			availableGradeLevels.length === 1
		) {
			setFilters((prev) => ({
				...prev,
				gradeLevel: availableGradeLevels[0],
			}));
		}
	}, [
		isSystemAdmin,
		filters.session,
		filters.gradeLevel,
		availableGradeLevels,
		setFilters,
	]);

	// Fetch students for the selected class
	useEffect(() => {
		const fetchStudents = async () => {
			if (filters.className) {
				setLoadingStudents(true);
				try {
					const response = await fetch(
						`/api/users?classId=${filters.className}&role=student`
					);
					if (!response.ok) throw new Error('Failed to fetch students');
					const data = await response.json();
					if (data.success && data.data) {
						setStudents(
							data.data.map((student: any) => ({
								id: student.studentId,
								name: `${student.firstName} ${student.middleName || ''} ${
									student.lastName
								}`.trim(),
								className: student.classId,
							}))
						);
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
	}, [filters.className, isStudent]);

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
		if (isStudent && user) {
			setFilters((prev) => ({
				...prev,
				session: user.session || prev.session,
				gradeLevel: user.gradeLevel || prev.gradeLevel,
				className: user.classId || prev.className,
				selectedStudents: [user.studentId || user.id],
			}));
		}
	}, [isStudent, user, setFilters]);

	// Determine what's required for submission
	const canSubmit = isStudent
		? filters.academicYear && filters.period
		: filters.academicYear &&
		  filters.period &&
		  filters.session &&
		  filters.gradeLevel &&
		  filters.className;

	// Show loading if no school data
	if (!school) {
		return <PageLoading fullScreen={false} />;
	}

	// For students, check if their profile is complete
	if (isStudent) {
		const isStudentInfoComplete = !!(
			user?.session &&
			user.gradeLevel &&
			user.classId
		);

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
							{periodOptions.map((p) => (
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
							onClick={onSubmit}
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
						{periodOptions.map((p) => (
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
				{!isStudent && availableGradeLevels.length > 1 && (
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
								setFilters((f) => ({
									...f,
									className: e.target.value,
									selectedStudents: [],
								}));
							}}
							className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
							disabled={!filters.gradeLevel}
						>
							<option value="">Select Class</option>
							{filters.gradeLevel &&
								school?.classLevels?.[filters.session]?.[
									filters.gradeLevel
								]?.classes.map((classInfo: any) => (
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
						onClick={onSubmit}
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

function ReportContent({
	reportFilters,
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
	onBack: () => void;
}) {
	const [studentsData, setStudentsData] = useState<PeriodicStudentData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const school = useSchoolStore((state) => state.school);
	const { user } = useAuth();

	const userRole = user?.role;

	// Get subjects from school profile based on session, grade level
	const getSubjectsForGradeLevel = () => {
		if (
			school?.classLevels?.[reportFilters.session]?.[reportFilters.gradeLevel]
				?.subjects
		) {
			return school.classLevels[reportFilters.session][reportFilters.gradeLevel]
				.subjects;
		}

		if (school?.subjects && school.subjects.length > 0) {
			return school.subjects;
		}

		return [
			'Mathematics',
			'English',
			'General Science',
			'Health Science',
			'Vocabulary',
			'Phonics',
			'History',
			'Geography',
			'Literature',
			'Civics',
			'Physical Education',
			'Agriculture',
			'French',
			'Computer',
			'Bible',
		];
	};

	const SUBJECTS = getSubjectsForGradeLevel();

	useEffect(() => {
		const fetchPeriodicGrades = async () => {
			try {
				setLoading(true);
				setError(null);

				const params: any = {
					period: reportFilters.period,
					academicYear: reportFilters.academicYear,
					classId: reportFilters.className,
					session: reportFilters.session,
				};

				// Add studentIds if they exist
				if (reportFilters.selectedStudents.length > 0) {
					params.studentIds = reportFilters.selectedStudents.join(',');
				}

				const url = new URL('/api/grades', window.location.origin);
				Object.entries(params).forEach(([key, value]) => {
					if (value) url.searchParams.append(key, value as string);
				});

				const res = await fetch(url.toString());
				if (!res.ok) throw new Error('Failed to fetch periodic grades');
				const data = await res.json();

				const reportData = Array.isArray(data.data.report)
					? data.data.report
					: [data.data.report];

				if (!data.success || !data.data) {
					throw new Error('Invalid data format received from the server');
				}

				// Check if reportData is empty or contains no valid students
				if (!Array.isArray(reportData) || reportData.length === 0) {
					setStudentsData([]);
				} else {
					// Filter out any null/undefined entries
					const validStudents = reportData.filter(
						(student) => student && student.studentId
					);
					setStudentsData(validStudents);
				}
			} catch (err) {
				console.error('Error fetching periodic grades:', err);
				setError(
					err instanceof Error ? err.message : 'Failed to load report data'
				);
			} finally {
				setLoading(false);
			}
		};

		fetchPeriodicGrades();
	}, [
		reportFilters.academicYear,
		reportFilters.period,
		reportFilters.session,
		reportFilters.className,
		reportFilters.selectedStudents,
	]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<PageLoading
					message="Content Loading, Please wait..."
					fullScreen={false}
				/>
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
						onClick={onBack}
						className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary"
					>
						← Back to Filter
					</button>
				</div>
			</div>
		);
	}

	const pages = paginateStudents(studentsData, 3);
	const selectedPeriodLabel =
		periodOptions.find((p) => p.value === reportFilters.period)?.label ||
		reportFilters.period;

	// Get class name from school profile
	const getClassName = () => {
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
	};

	const className = getClassName();

	const title =
		studentsData.length === 1
			? `Periodic Report - ${studentsData[0].studentName}`
			: reportFilters.selectedStudents.length > 0 &&
			  reportFilters.selectedStudents.length < studentsData.length
			? `Periodic Report - Selected Students - ${selectedPeriodLabel}`
			: `Periodic Report - ${className} - ${selectedPeriodLabel}`;

	return (
		<div className="w-full h-screen bg-background flex flex-col">
			<div className="flex justify-end px-8 py-4">
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
										<Image src={school.logoUrl} style={{ width: 250 }} />
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
														firstName:
															studentData.studentName?.split(' ')[0] || '',
														middleName:
															studentData.studentName?.split(' ').length > 2
																? studentData.studentName.split(' ')[1]
																: '',
														lastName:
															studentData.studentName?.split(' ').length > 1
																? studentData.studentName
																		.split(' ')
																		.slice(-1)[0]
																: '',
														class: className,
														id: studentData.studentId,
														academicYear: reportFilters.academicYear,
														grade: reportFilters.gradeLevel,
													}}
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
													{reportFilters.session && (
														<Text style={{ fontSize: 9 }}>
															Session: {reportFilters.session}
														</Text>
													)}
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
													{SUBJECTS.map((subjectName, sidx) => {
														const subject =
															studentData.subjects &&
															studentData.subjects.find(
																(s) =>
																	s.subject.toLowerCase() ===
																	subjectName.toLowerCase()
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
																{studentData.rank}
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
				</PDFViewer>
			</div>
		</div>
	);
}

export default function PeriodicReportWrapper() {
	const [showReport, setShowReport] = useState(false);
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
