'use client';
import React, {
	useState,
	useEffect,
	useRef,
	useMemo,
	useCallback,
} from 'react';
import {
	Document,
	Page,
	PDFViewer,
	Text,
	View,
	Image,
	pdf,
} from '@react-pdf/renderer';
import styles from './styles';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import Spinner from '@/components/ui/spinner';
import AccessDenied from '@/components/AccessDenied';

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

// Memoized student multi-select component
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
				student.name.toLowerCase().includes(searchTerm.toLowerCase())
			),
		[students, searchTerm]
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
		[selectedStudents, onSelectionChange]
	);

	const selectedStudentNames = useMemo(
		() =>
			students
				.filter((s) => selectedStudents.includes(s.id))
				.map((s) => s.name),
		[students, selectedStudents]
	);

	const handleSelectAll = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onSelectionChange(students.map((s) => s.id));
		},
		[students, onSelectionChange]
	);

	const handleClearAll = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onSelectionChange([]);
		},
		[onSelectionChange]
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

// Memoized filter content component
const FilterContent = React.memo(function FilterContent({
	filters,
	setFilters,
	onSubmit,
}: {
	filters: {
		academicYear: string;
		session: string;
		classLevel: string;
		className: string;
		selectedStudents: string[];
	};
	setFilters: React.Dispatch<
		React.SetStateAction<{
			academicYear: string;
			session: string;
			classLevel: string;
			className: string;
			selectedStudents: string[];
		}>
	>;
	onSubmit: () => void;
}) {
	const currentSchool = useSchoolStore((state) => state.school);
	const { user } = useAuth();
	const [students, setStudents] = useState<Student[]>([]);
	const [loadingStudents, setLoadingStudents] = useState(false);

	const userRole = user?.role || 'student';
	const isSystemAdmin = userRole === 'system_admin';
	const isStudent = userRole === 'student';

	useEffect(() => {
		if (isStudent && user) {
			setFilters((prev) => ({
				...prev,
				session: user.session || '',
				classLevel: user.classLevel || '',
				className: user.classId || '',
				selectedStudents: [user.studentId || ''],
			}));
		}
	}, [isStudent, user, setFilters]);

	const availableSessions = useMemo(
		() =>
			currentSchool?.classLevels ? Object.keys(currentSchool.classLevels) : [],
		[currentSchool?.classLevels]
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
		[filters.session, currentSchool?.classLevels]
	);

	const availableClasses = useMemo(
		() =>
			filters.session &&
			filters.classLevel &&
			currentSchool?.classLevels?.[filters.session]?.[filters.classLevel]
				?.classes
				? currentSchool.classLevels[filters.session][filters.classLevel].classes
				: [],
		[filters.session, filters.classLevel, currentSchool?.classLevels]
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
	}, [filters.academicYear, filters.session, filters.classLevel, userAvailableSessions, availableGradeLevels, availableClasses, setFilters, isStudent]);

	useEffect(() => {
		if (filters.className && !isStudent) {
			const fetchStudents = async () => {
				setLoadingStudents(true);
				try {
					const response = await fetch(
						`/api/users?classId=${filters.className}&role=student`
					);
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
	}, [filters.className, isStudent, setFilters]);

	const canSubmit = useMemo(() => {
		if (isStudent) {
			return !!(
				filters.academicYear &&
				user?.session &&
				user?.classLevel &&
				user?.classId
			);
		}
		return !!(filters.academicYear && filters.className);
	}, [isStudent, filters.academicYear, filters.className, user]);

	// if (!currentSchool) {
	// 	return <PageLoading fullScreen={false} />;
	// }

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
			user?.session &&
			user?.classLevel &&
			user?.classId
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
								Loading students
								<Spinner />
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

// Memoized PDF document component
const PDFDocument = React.memo(function PDFDocument({
	studentsData,
	className,
	classSubjects,
	reportFilters,
	school,
}: {
	studentsData: StudentYearlyReport[];
	className: string;
	classSubjects: string[];
	reportFilters: any;
	school: any;
}) {
	return (
		<Document
			title={`Report Card for ${className} - ${reportFilters.academicYear}`}
		>
			{studentsData.flatMap((studentData) => {
				const subjects = classSubjects;
				const getGrade = (period: string, subject: string) =>
					studentData.periods[period]?.find((s) => s.subject === subject)
						?.grade ?? null;
				const getOverallSubjectAverage = (subject: string) => {
					const sem1Avg = studentData.firstSemesterAverage[subject];
					const sem2Avg = studentData.secondSemesterAverage[subject];
					if (sem1Avg != null && sem2Avg != null) {
						return Math.round((sem1Avg + sem2Avg) / 2);
					}
					return null;
				};

				return [
					<Page
						key={`${studentData.studentId}-grades`}
						size="A4"
						orientation="landscape"
						style={styles.page}
					>
						<View style={styles.topRow}>
							<View style={styles.headerLeft}>
								<Text style={{ fontWeight: 'bold' }}>
									Name: {studentData.studentName}
								</Text>
								<Text>Class: {className.split('-')[0]}</Text>
								<Text>ID: {studentData.studentId}</Text>
							</View>
							<View style={styles.headerRight}>
								<Text style={{ fontWeight: 'bold' }}>
									Academic Year: {reportFilters.academicYear}
								</Text>
							</View>
						</View>
						<View style={styles.gradesContainer}>
							<View style={styles.semester}>
								<Text style={styles.semesterHeader}>First Semester</Text>
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
										<Text style={gradeStyle(getGrade('first', subject))}>
											{getGrade('first', subject) ?? '-'}
										</Text>
										<Text style={gradeStyle(getGrade('second', subject))}>
											{getGrade('second', subject) ?? '-'}
										</Text>
										<Text style={gradeStyle(getGrade('third', subject))}>
											{getGrade('third', subject) ?? '-'}
										</Text>
										<Text
											style={gradeStyle(getGrade('third_period_exam', subject))}
										>
											{getGrade('third_period_exam', subject) ?? '-'}
										</Text>
										<Text
											style={gradeStyle(
												studentData.firstSemesterAverage[subject]
											)}
										>
											{studentData.firstSemesterAverage[subject]?.toFixed(0) ??
												'-'}
										</Text>
									</View>
								))}
								<View
									style={{
										...styles.tableRow,
										backgroundColor: '#f0f8ff',
									}}
								>
									<Text style={{ ...styles.subjectCell, fontWeight: 'bold' }}>
										Average
									</Text>
									<Text style={gradeStyle(studentData.periodAverages.first)}>
										{studentData.periodAverages.first?.toFixed(1) ?? '-'}
									</Text>
									<Text style={gradeStyle(studentData.periodAverages.second)}>
										{studentData.periodAverages.second?.toFixed(1) ?? '-'}
									</Text>
									<Text style={gradeStyle(studentData.periodAverages.third)}>
										{studentData.periodAverages.third?.toFixed(1) ?? '-'}
									</Text>
									<Text
										style={gradeStyle(
											studentData.periodAverages.third_period_exam
										)}
									>
										{studentData.periodAverages.third_period_exam?.toFixed(1) ??
											'-'}
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
									<Text style={{ ...styles.subjectCell, fontWeight: 'bold' }}>
										Rank
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.first ?? '-'}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.second ?? '-'}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.third ?? '-'}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.third_period_exam ?? '-'}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.firstSemesterAverage ?? '-'}
									</Text>
								</View>
							</View>
							<View style={styles.lastSemester}>
								<Text style={styles.semesterHeader}>Second Semester</Text>
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
										<Text style={gradeStyle(getGrade('fourth', subject))}>
											{getGrade('fourth', subject) ?? '-'}
										</Text>
										<Text style={gradeStyle(getGrade('fifth', subject))}>
											{getGrade('fifth', subject) ?? '-'}
										</Text>
										<Text style={gradeStyle(getGrade('sixth', subject))}>
											{getGrade('sixth', subject) ?? '-'}
										</Text>
										<Text
											style={gradeStyle(getGrade('six_period_exam', subject))}
										>
											{getGrade('six_period_exam', subject) ?? '-'}
										</Text>
										<Text
											style={gradeStyle(
												studentData.secondSemesterAverage[subject]
											)}
										>
											{studentData.secondSemesterAverage[subject]?.toFixed(0) ??
												'-'}
										</Text>
										<Text style={gradeStyle(getOverallSubjectAverage(subject))}>
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
									<Text style={gradeStyle(studentData.periodAverages.fourth)}>
										{studentData.periodAverages.fourth?.toFixed(1) ?? '-'}
									</Text>
									<Text style={gradeStyle(studentData.periodAverages.fifth)}>
										{studentData.periodAverages.fifth?.toFixed(1) ?? '-'}
									</Text>
									<Text style={gradeStyle(studentData.periodAverages.sixth)}>
										{studentData.periodAverages.sixth?.toFixed(1) ?? '-'}
									</Text>
									<Text
										style={gradeStyle(
											studentData.periodAverages.six_period_exam
										)}
									>
										{studentData.periodAverages.six_period_exam?.toFixed(1) ??
											'-'}
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
										{studentData.ranks.fourth ?? '-'}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.fifth ?? '-'}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.sixth ?? '-'}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.six_period_exam ?? '-'}
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
									<Text style={styles.gradingTitle}>METHOD OF GRADING</Text>
									<Text style={styles.gradingText}>A = 90 - 100 Excellent</Text>
									<Text style={styles.gradingText}>B = 80 - 89 Very Good</Text>
									<Text style={styles.gradingText}>C = 75 - 79 Good</Text>
									<Text style={styles.gradingText}>D = 70 - 74 Fair</Text>
									<Text style={styles.gradingText}>F = Below 70 Fail</Text>
								</View>
							</View>
							<View style={styles.rightBottom}>
								<Text style={styles.promotionText}>
									Yearly Average below 70 will not be eligible for promotion.
								</Text>
								<View style={styles.signatureSection}>
									<Text>Teachers Remark: ____________________________</Text>
									<Text style={{ marginTop: 15 }}>
										Signed: _________________________
									</Text>
									<Text style={{ marginTop: 3, marginLeft: 50 }}>
										Daniel S. Borbor, Class Sponsor
									</Text>
								</View>
							</View>
						</View>
					</Page>,
					<Page
						key={`${studentData.studentId}-info`}
						size="A4"
						orientation="landscape"
						style={styles.page}
					>
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
									This report will be periodically for your inspection. It is a
									pupil progress report by which pupils' work could result in
									lack of study, irregular attendance or something that could be
									connected, special attention should be paid to ensure that the
									child improves. Moreover, parent conferences with parent(s) or
									guardians are encouraged, and it will serve to secure the best
									co-operation for your child.
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
										{className.split('-')[0]}
									</Text>{' '}
									and is promoted to{' '}
									<Text style={{ textDecoration: 'underline' }}>
										{className.split('-')[0] === 'Grade 10'
											? 'Grade 11'
											: 'Grade 13'}
									</Text>{' '}
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
												left: -145,
												bottom: school.name.toLowerCase().includes('kolleh')
													? -10
													: -18,
											}}
										>
											<Image
												src={school?.logoUrl2 || school?.logoUrl}
												style={{ width: 60 }}
											/>
										</View>
										<Text style={styles.schoolDetails}>
											{school?.address.join('\n')}
										</Text>
										<View
											style={{
												alignSelf: 'center',
												marginBottom: 10,
												justifyContent: 'center',
												alignItems: 'center',
												top: -95, //school?.name
												// .toLowerCase()
												// .split(' ')
												// .includes('kolleh')
												// ? -110
												// : -100,
												right: -145,
											}}
										>
											<Image src={school?.logoUrl} style={{ width: 60 }} />
										</View>
									</View>
									<Text style={styles.reportTitle}>
										{reportFilters.classLevel?.toUpperCase()} PROGRESS REPORT
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
												{className.split('-')[0]}
											</Text>
										</Text>
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
									Please sign below as evidence that you have examined this
									report with possible recommendation or invitation to your
									son(s) or daughter(s) as this instrument could shape your
									child's destiny.
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
										When a student mark is 69 or below in any subject the parent
										or guardian should give special attention to see that the
										student does well in all the work required by the teacher,
										otherwise the student will probably{' '}
										<Text style={{ fontWeight: 'bold' }}>
											REPEAT THE CLASS.
										</Text>
									</Text>
								</View>
							</View>
						</View>
					</Page>,
				];
			})}
		</Document>
	);
});

// Main report content component
function ReportContent({
	reportFilters,
	onBack,
}: {
	reportFilters: {
		academicYear: string;
		session: string;
		classLevel: string;
		className: string;
		selectedStudents: string[];
	};
	onBack: () => void;
}) {
	const [studentsData, setStudentsData] = useState<StudentYearlyReport[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [downloading, setDownloading] = useState(false);

	const school = useSchoolStore((state) => state.school);
	const currentSchool = useSchoolStore((state) => state.school);
	const { user } = useAuth();

	// Memoize computed values to prevent unnecessary recalculations
	const className = useMemo(() => {
		return (
			currentSchool?.classLevels?.[reportFilters.session]?.[
				reportFilters.classLevel
			]?.classes.find((c: any) => c.classId === reportFilters.className)
				?.name || reportFilters.className
		);
	}, [
		currentSchool,
		reportFilters.session,
		reportFilters.classLevel,
		reportFilters.className,
	]);

	const classSubjects = useMemo(() => {
		const subjects =
			currentSchool?.classLevels?.[reportFilters.session]?.[
				reportFilters.classLevel
			]?.subjects || [];
		// Extract just the names from the subject objects
		return subjects.map((subject) =>
			typeof subject === 'string' ? subject : subject.name
		);
	}, [currentSchool, reportFilters.session, reportFilters.classLevel]);

	// Fetch students data effect
	useEffect(() => {
		const fetchStudentsData = async () => {
			try {
				setLoading(true);
				setError(null);

				const isStudent = user?.role === 'student';
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
					const studentsResponse = await fetch(
						`/api/users?classId=${reportFilters.className}&role=student`
					);
					if (!studentsResponse.ok) throw new Error('Failed to fetch students');
					const studentsResult = await studentsResponse.json();
					if (!studentsResult.success || !studentsResult.data) {
						throw new Error('Invalid student data format');
					}

					if (reportFilters.selectedStudents.length > 0) {
						studentsToProcess = studentsResult.data.filter((student: any) =>
							reportFilters.selectedStudents.includes(student.studentId)
						);
					} else {
						studentsToProcess = studentsResult.data;
					}
				}

				const params = new URLSearchParams({
					classId: reportFilters.className,
					academicYear: reportFilters.academicYear,
					session: reportFilters.session,
				});

				if (reportFilters.selectedStudents.length > 0) {
					params.append('studentIds', reportFilters.selectedStudents.join(','));
				}

				const gradesResponse = await fetch(`/api/grades?${params.toString()}`);

				let gradesData = { success: true, data: { report: [] } };
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

				const reportData = studentsToProcess.map((student: any) => {
					const studentId = student.studentId;
					const studentName = `${student.firstName} ${
						student.middleName ? student.middleName + ' ' : ''
					}${student.lastName}`.trim();
					const existingReport = existingReports.find(
						(report: any) => report.studentId === studentId
					);

					const periods: Record<
						string,
						Array<{ subject: string; grade: number | null }>
					> = {
						first: classSubjects.map((subject) => ({
							subject: typeof subject === 'string' ? subject : subject.name, // Handle both cases
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
										(item) => item.subject === gradeEntry.subject
									);
									if (subjectIndex !== -1) {
										periods[period][subjectIndex].grade = gradeEntry.grade;
									}
								});
							}
						});
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
				console.error('Error fetching report data:', err);
				setError(err.message || 'Failed to load report data');
			} finally {
				setLoading(false);
			}
		};

		fetchStudentsData();
	}, [reportFilters]);

	// Memoize the PDF document to prevent re-rendering
	const pdfDocument = useMemo(() => {
		if (!studentsData.length || loading || error) return null;

		return (
			<PDFDocument
				studentsData={studentsData}
				className={className}
				classSubjects={classSubjects}
				reportFilters={reportFilters}
				school={school}
			/>
		);
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
		if (!pdfDocument) return;

		setDownloading(true);
		try {
			const blob = await pdf(pdfDocument).toBlob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `Yearly_Report_${className}_${reportFilters.academicYear}.pdf`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} finally {
			setDownloading(false);
		}
	}, [pdfDocument, className, reportFilters.academicYear]);

	if (!studentsData.length && loading) {
		return <PageLoading fullScreen={false} message="Generating PDF" />;
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
				<button
					type="button"
					onClick={handleDownload}
					className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm flex items-center gap-2"
					disabled={downloading}
				>
					{downloading ? (
						<span>Downloading...</span>
					) : (
						<>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth={1.5}
								stroke="currentColor"
								className="w-5 h-5"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M12 4.5v15m0 0l-6-6m6 6l6-6"
								/>
							</svg>
							Download Report
						</>
					)}
				</button>
			</div>
			<div className="flex-1">
				<PDFViewer className="w-full h-[calc(100vh-80px)] bg-background">
					{pdfDocument}
				</PDFViewer>
			</div>
		</div>
	);
}

// Main component
export default function ReportCardPage() {
	const [filters, setFilters] = useState({
		academicYear: getCurrentAcademicYear(),
		session: '',
		classLevel: '',
		className: '',
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
