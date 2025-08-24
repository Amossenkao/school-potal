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
import styles from '../../shared/styles';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';

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
	userRole,
}: {
	filters: {
		academicYear: string;
		period: string;
		session: string;
		gradeLevel: string;
		className: string;
		reportType: 'entire-class' | 'selected-students';
		selectedStudents: string[];
	};
	setFilters: React.Dispatch<
		React.SetStateAction<{
			academicYear: string;
			period: string;
			session: string;
			gradeLevel: string;
			className: string;
			reportType: 'entire-class' | 'selected-students';
			selectedStudents: string[];
		}>
	>;
	onSubmit: () => void;
	userRole: string;
}) {
	const currentSchool = useSchoolStore((state: any) => state.school);
	const [students, setStudents] = useState<Student[]>([]);
	const [loadingStudents, setLoadingStudents] = useState(false);

	// Get available sessions and grade levels from school profile
	const availableSessions = currentSchool?.classLevels
		? Object.keys(currentSchool.classLevels)
		: [];
	const availableGradeLevels =
		filters.session && currentSchool?.classLevels?.[filters.session]
			? Object.keys(currentSchool.classLevels[filters.session])
			: [];
	const availableClasses =
		filters.session &&
		filters.gradeLevel &&
		currentSchool?.classLevels?.[filters.session]?.[filters.gradeLevel]?.classes
			? currentSchool.classLevels[filters.session][filters.gradeLevel].classes
			: [];

	// Set default academic year on component mount
	useEffect(() => {
		if (!filters.academicYear) {
			const currentAcademicYear = getCurrentAcademicYear();
			setFilters((prev) => ({ ...prev, academicYear: currentAcademicYear }));
		}
	}, [filters.academicYear, setFilters]);

	// Fetch students when class is selected
	useEffect(() => {
		if (filters.className) {
			const fetchStudents = async () => {
				try {
					setLoadingStudents(true);
					const response = await fetch(
						`/api/users?classId=${filters.className}&role=student`
					);
					if (response.ok) {
						const responseData = await response.json();
						if (responseData.success && responseData.data) {
							// Map the response data to the expected format
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
		} else {
			setStudents([]);
			setFilters((prev) => ({ ...prev, selectedStudents: [] }));
		}
	}, [filters.className, setFilters]);

	// Reset selected students when switching back to entire class
	useEffect(() => {
		if (filters.reportType === 'entire-class') {
			setFilters((prev) => ({ ...prev, selectedStudents: [] }));
		}
	}, [filters.reportType, setFilters]);

	const canSubmit =
		filters.academicYear &&
		filters.period &&
		filters.session &&
		filters.gradeLevel &&
		filters.className &&
		(filters.reportType === 'entire-class' ||
			(filters.reportType === 'selected-students' &&
				filters.selectedStudents.length > 0));

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
			<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
				<h2 className="text-lg font-semibold mb-4 text-center">
					Filter Periodic Report
					{userRole === 'system_admin' && (
						<span className="block text-xs text-muted-foreground mt-1">
							System Admin - View All Students
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

				{userRole === 'system_admin' && (
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
						disabled={
							!filters.academicYear ||
							(userRole === 'system_admin' && !filters.session)
						}
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
							const selectedClass = availableClasses.find(
								(c) => c.classId === e.target.value
							);
							setFilters((f) => ({
								...f,
								className: selectedClass?.classId || e.target.value,
								reportType: 'entire-class',
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
							setFilters({
								academicYear: getCurrentAcademicYear(),
								period: '',
								session: '',
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
			</div>
		</div>
	);
}

function ReportContent({
	reportFilters,
	onBack,
	userRole,
}: {
	reportFilters: {
		academicYear: string;
		period: string;
		session: string;
		gradeLevel: string;
		className: string;
		reportType: 'entire-class' | 'selected-students';
		selectedStudents: string[];
	};
	onBack: () => void;
	userRole: string;
}) {
	const [studentsData, setStudentsData] = useState<PeriodicStudentData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const school = useSchoolStore((state) => state.school);
	const currentSchool = useSchoolStore((state: any) => state.school);

	// Get subjects from school profile
	const getSubjectsForGradeLevel = () => {
		if (
			currentSchool?.classLevels?.[reportFilters.session]?.[
				reportFilters.gradeLevel
			]?.subjects
		) {
			return currentSchool.classLevels[reportFilters.session][
				reportFilters.gradeLevel
			].subjects;
		}
		// Fallback to default subjects if not found in school profile
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
				};

				// Add session for system admin
				if (userRole === 'system_admin' && reportFilters.session) {
					params.session = reportFilters.session;
				}

				// Conditionally add studentIds if they exist
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

				// Normalize the response to always be an array
				const reportData = Array.isArray(data.data.report)
					? data.data.report
					: [data.data.report];

				// Check for invalid format after normalization
				if (!data.success || !data.data || !Array.isArray(reportData)) {
					throw new Error('Invalid data format received from the server');
				}

				setStudentsData(reportData);
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
		userRole,
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
						No periodic student data found for the selected filters.
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

	const title =
		studentsData.length === 1
			? `Periodic Report - ${studentsData[0].studentName}`
			: reportFilters.reportType === 'selected-students'
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
													{userRole === 'system_admin' &&
														reportFilters.session && (
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

export default function PeriodicReportWrapper({
	userRole = 'teacher',
}: {
	userRole?: string;
}) {
	const [showReport, setShowReport] = useState(false);
	const [filters, setFilters] = useState<{
		academicYear: string;
		period: string;
		session: string;
		gradeLevel: string;
		className: string;
		reportType: 'entire-class' | 'selected-students';
		selectedStudents: string[];
	}>({
		academicYear: getCurrentAcademicYear(),
		period: '',
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
					userRole={userRole}
				/>
			) : (
				<ReportContent
					reportFilters={filters}
					onBack={() => setShowReport(false)}
					userRole={userRole}
				/>
			)}
		</div>
	);
}
