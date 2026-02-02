'use client';
import React, {
	useState,
	useEffect,
	useRef,
	useMemo,
	useCallback,
} from 'react';
import QRCode from 'qrcode';
import {
	Document,
	Page,
	Text,
	View,
	Image,
	pdf,
} from '@react-pdf/renderer';
import styles from './styles'; // Assuming styles is defined elsewhere
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import Spinner from '@/components/ui/spinner';
import AccessDenied from '@/components/AccessDenied';

// --- Type Definitions ---

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
	qrCodeDataUrl: string;
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
			const found = levelData.classes.find((cls: any) => cls.classId === classId);
			if (found) {
				return { session, level, name: found.name };
			}
		}
	}
	return null;
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
			classIdForYear
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
					const response = await fetch(
						`/api/users?classId=${filters.className}&role=student&academicYear=${filters.academicYear}`
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

// --- QR Code Component ---

function ReportQRCode({ qrDataUrl }: { qrDataUrl: string }) {
	return qrDataUrl ? (
		<Image src={qrDataUrl} style={{ width: '99%', height: '99%' }} />
	) : (
		<Text style={{ fontSize: 8, textAlign: 'center' }}>
			QR Code Unavailable
		</Text>
	);
}

// --- Watermark Style ---
const watermarkStyle = {
	position: 'absolute',
	opacity: 0.1, // Low transparency
	// Watermark image size and centering will be determined by the parent View
};

const PDFDocument = React.memo(function PDFDocument({
	studentsData,
	className,
	classSubjects,
	reportFilters,
	school,
	classSponsor,
}: {
	studentsData: StudentYearlyReport[];
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters; // Use updated interface
	school: any;
	classSponsor: string | undefined;
}) {
	// Logic to determine the sponsor name to display
	const sponsorToDisplay = useMemo(() => {
		// 1. First priority: Sponsor name from the filter override
		if (reportFilters.sponsorName.trim()) {
			return reportFilters.sponsorName.trim();
		}
		// 2. Second priority: Sponsor name from the server data (classSponsor)
		if (classSponsor) {
			return classSponsor;
		}
		// 3. Fallback: No sponsor name will be displayed
		return null;
	}, [reportFilters.sponsorName, classSponsor]);

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
								{/* WATERMARK 1: First Semester Table */}
								{school?.logoUrl && (
									<Image
										src={school.logoUrl}
										style={{
											...watermarkStyle,
											width: '40%', // Adjust size
											// height: '50%', // Adjust size
											top: '25%', // Center vertically
											left: '35%', // Center horizontally
										}}
									/>
								)}
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
								{/* WATERMARK 2: Second Semester Table */}
								{school?.logoUrl && (
									<Image
										src={school.logoUrl}
										style={{
											...watermarkStyle,
											width: '40%', // Adjust size
											// height: '50%', // Adjust size
											top: '25%', // Center vertically
											left: '25%', // Center horizontally
										}}
									/>
								)}
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
								{/* UPDATED SPONSOR SECTION LOGIC - WATERMARK 3 REMOVED FROM HERE */}
								<View style={styles.signatureSection}>
									<Text>Teachers Remark: ____________________________</Text>
									<View style={{ marginTop: 15, alignItems: 'center' }}>
										<Text>Signed: _________________________</Text>
										<Text style={{ marginTop: 3 }}>
											{sponsorToDisplay ? `${sponsorToDisplay}, ` : ''}Class
											Sponsor
										</Text>
									</View>
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
									position: 'relative', // Set relative positioning to contain watermark
								}}
							>
								{/* WATERMARK 3: Corrected position on Page 2 (Left Column) */}
								{(school?.logoUrl2 || school?.logoUrl) && (
									<Image
										src={school?.logoUrl2 || school?.logoUrl}
										style={{
											...watermarkStyle,
											width: '45%', // Adjust size
											// height: '30%', // Adjust size
											top: '40%', // Positioned near the Date/Principal area, above QR
											left: '25%', // Center horizontally
										}}
									/>
								)}
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
									This report is provided periodically to help you monitor your
									child’s progress. It highlights areas such as study habits and
									attendance that may need improvement. Parent-teacher
									conferences are encouraged to ensure your child’s continued
									success.
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
											: 'Grade 12'}
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

									<View
										style={{
											position: 'absolute',
											left: 15,
											top: 100,
											textAlign: 'center',
											width: '100%',
										}}
									>
										<View
											style={{
												display: 'flex',
												gap: 10,
												justifyContent: 'center',
												width: '100%',
												fontSize: 12,
											}}
										>
											<View
												style={{
													borderWidth: 1,
													borderColor: '#000',
													borderStyle: 'dashed',
													borderRadius: 5,
													width: 100,
													height: 100,
												}}
											>
												<ReportQRCode qrDataUrl={studentData.qrCodeDataUrl} />
											</View>

											<Text style={{ width: '100%', textAlign: 'left' }}>
												Scan the QR Code to verify the authenticity of this
												report.
											</Text>
										</View>
									</View>
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
												top: -95,
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
											Period
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
													{row} Period
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
	const [classSponsor, setClassSponsor] = useState<string | undefined>(
		undefined
	);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
	const [serverKey, setServerKey] = useState<string | null>(null);
	const [pdfGenerating, setPdfGenerating] = useState(false);
	const [inlineError, setInlineError] = useState(false);
	const pdfUrlRef = useRef<string | null>(null);

	const school = useSchoolStore((state) => state.school);
	const currentSchool = useSchoolStore((state) => state.school);
	const { user } = useAuth();

	const className = useMemo(() => {
		const classInfo = currentSchool?.classLevels?.[reportFilters.session]?.[
			reportFilters.classLevel
		]?.classes.find((c: any) => c.classId === reportFilters.className);

		if (classInfo && classInfo.classSponsor) {
			setClassSponsor(classInfo.classSponsor);
		} else {
			setClassSponsor(undefined);
		}

		return classInfo?.name || reportFilters.className;
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
		return subjects.map((subject: any) =>
			typeof subject === 'string' ? subject : subject.name
		);
	}, [currentSchool, reportFilters.session, reportFilters.classLevel]);

	useEffect(() => {
		const fetchStudentsData = async () => {
			setLoading(true);
			setError(null);

			try {
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

				const reportData = await Promise.all(
					studentsToProcess.map(async (student: any) => {
						const studentId = student.studentId;
						const studentName = `${student.firstName} ${
							student.middleName ? student.middleName + ' ' : ''
						}${student.lastName}`.trim();
						const existingReport = existingReports.find(
							(report: any) => report.studentId === studentId
						);

						let qrCodeDataUrl = '';
						if (typeof window !== 'undefined' && studentId) {
							const origin = window.location.origin;
							const verifyUrl = `${origin}/verify?id=${reportFilters.academicYear.replace(
								'-',
								studentId
							)}`;
							try {
								// QR Code generation is also synchronous and can take time, but less than PDF
								qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
									errorCorrectionLevel: 'H',
									width: 100,
								});
							} catch (error) {
								console.error(
									'Error generating QR code for student:',
									studentId,
									error
								);
							}
						}

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
							Object.assign(
								periodAverages,
								existingReport.periodAverages || {}
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
					})
				);

				setStudentsData(reportData);
				// ONLY stop data loading here. The PDF generation (useMemo) will take over.
				setLoading(false);
			} catch (err: any) {
				console.error('Error fetching report data:', err);
				setError(err.message || 'Failed to load report data');
				setLoading(false);
			}
		};

		fetchStudentsData();
	}, [reportFilters, user, classSubjects, className]);

	// Memoize the PDF document - This is the blocking operation
	const pdfDocument = useMemo(() => {
		// Only proceed if data is loaded and no error
		if (!studentsData.length || loading || error) {
			return null;
		}

		// The expensive, synchronous PDF component creation happens here.
		const component = (
			<PDFDocument
				studentsData={studentsData}
				className={className}
				classSubjects={classSubjects}
				reportFilters={reportFilters}
				school={school}
				classSponsor={classSponsor}
			/>
		);

		return component;
	}, [
		studentsData,
		className,
		classSubjects,
		reportFilters,
		school,
		loading, // Keep loading here to re-evaluate after data fetch
		error,
		classSponsor,
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
			return;
		}

		let cancelled = false;
		setPdfGenerating(true);
		const isIOS =
			typeof navigator !== 'undefined' &&
			/iPad|iPhone|iPod/.test(navigator.userAgent);
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
						setPdfUrl(typeof reader.result === 'string' ? reader.result : objectUrl);
					};
					reader.readAsDataURL(blob);
				} else {
					setPdfUrl(objectUrl);
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

	// Download handler
	const handleDownload = useCallback(async () => {
		if (!downloadUrl) return;
		setDownloading(true);
		try {
			const a = document.createElement('a');
			a.href = downloadUrl;
			a.download = `Yearly_Report_${className}_${reportFilters.academicYear}.pdf`;
			document.body.appendChild(a);
			a.click();
			a.remove();
		} finally {
			setDownloading(false);
		}
	}, [downloadUrl, className, reportFilters.academicYear]);

	if (loading) {
		return <PageLoading fullScreen={false} message="Loading report" />;
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
					disabled={downloading || pdfGenerating || !downloadUrl}
				>
					{pdfGenerating ? (
						<span>Preparing PDF...</span>
					) : downloading ? (
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
				<button
					type="button"
					onClick={() => {
						if (!pdfBlob || !downloadUrl) return;
						const openWithKey = (key: string) => {
							const url = `/api/reports/pdf?key=${encodeURIComponent(
								key
							)}&fileName=${encodeURIComponent(
								`Yearly_Report_${className}_${reportFilters.academicYear}.pdf`
							)}`;
							window.open(url, '_blank', 'noopener,noreferrer');
						};
						if (serverKey) {
							openWithKey(serverKey);
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
									openWithKey(data.cacheKey);
								} else {
									window.open(downloadUrl, '_blank', 'noopener,noreferrer');
								}
							})
							.catch(() => {
								window.open(downloadUrl, '_blank', 'noopener,noreferrer');
							});
					}}
					disabled={!downloadUrl || pdfGenerating}
					className="px-3 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm"
				>
					Open PDF
				</button>
			</div>
			<div className="flex-1">
				{pdfUrl ? (
					<div className="w-full" style={{ height: '80vh' }}>
						{inlineError ? (
							<div className="flex items-center justify-center h-full text-center text-muted-foreground">
								<div>
									<p>Inline PDF preview is not supported on this device.</p>
									<p className="mt-2">Use “Open PDF” to view it.</p>
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
						<div className="text-center text-muted-foreground">
							Preparing PDF...
						</div>
					</div>
				)}
			</div>
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
