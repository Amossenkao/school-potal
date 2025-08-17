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
	periods: Record<string, Array<{ subject: string; grade: number }>>;
	firstSemesterAverage: Record<string, number>;
	secondSemesterAverage: Record<string, number>;
	periodAverages: Record<string, number>;
	yearlyAverage: number;
	ranks: Record<string, number>;
}

// Interfaces from PeriodicReports.tsx
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

const gradeLevels = [
	'Self Contained',
	'Elementry',
	'Junior High',
	'Senior High',
];

const classOptionsByLevel: { [key: string]: string[] } = {
	'Self Contained': [
		'Daycare',
		'Nursery',
		'K-I',
		'K-II',
		'1st Grade',
		'2nd Grade',
		'3rd Grade',
	],
	Elementry: ['4th Grade', '5th Grade', '6th Grade'],
	'Junior High': ['7th Grade', '8th Grade', 'Grade 9A'],
	'Senior High': ['Grade 10A', '11th Grade', '12th Grade'],
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
		gradeLevel: string;
		className: string;
		reportType: 'entire-class' | 'selected-students';
		selectedStudents: string[];
	};
	setFilters: React.Dispatch<
		React.SetStateAction<{
			academicYear: string;
			gradeLevel: string;
			className: string;
			reportType: 'entire-class' | 'selected-students';
			selectedStudents: string[];
		}>
	>;
	onSubmit: () => void;
}) {
	const [students, setStudents] = useState<Student[]>([]);
	const [loadingStudents, setLoadingStudents] = useState(false);

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

	// Reset selected students when switching report type
	useEffect(() => {
		if (filters.reportType === 'entire-class') {
			setFilters((prev) => ({ ...prev, selectedStudents: [] }));
		}
	}, [filters.reportType, setFilters]);

	const canSubmit = filters.academicYear && filters.className;

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
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
						disabled={!filters.academicYear}
					>
						<option value="">Select Grade Level</option>
						{gradeLevels.map((level) => (
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
						{filters.gradeLevel &&
							classOptionsByLevel[filters.gradeLevel].map((c) => (
								<option key={c} value={c}>
									{c}
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
							setFilters({
								academicYear: '',
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
}: {
	reportFilters: {
		academicYear: string;
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

	useEffect(() => {
		const fetchStudentsData = async () => {
			try {
				setLoading(true);
				setError(null);
				const params: any = {
					classId: reportFilters.className,
					academicYear: reportFilters.academicYear,
				};

				// Conditionally add studentIds if they exist
				if (reportFilters.selectedStudents.length > 0) {
					params.studentIds = reportFilters.selectedStudents.join(',');
				}

				const url = new URL('/api/grades', window.location.origin);
				Object.entries(params).forEach(([key, value]) => {
					if (value) url.searchParams.append(key, value as string);
				});
				const res = await fetch(url.toString());
				if (!res.ok) throw new Error('Failed to fetch grades');
				const data = await res.json();

				// Normalize the response to always be an array
				const reportData = Array.isArray(data.data.report)
					? data.data.report
					: [data.data.report];

				if (!data.success || !data.data || !Array.isArray(reportData)) {
					throw new Error('Invalid data format received from the server');
				}
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
		reportFilters.className,
		reportFilters.selectedStudents,
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

	const allSubjects = Array.from(
		new Set(
			studentsData.flatMap((student) =>
				Object.values(student.periods).flatMap((p) => p.map((g) => g.subject))
			)
		)
	);

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
					<Document
						title={`Report Card for ${reportFilters.className} - ${reportFilters.academicYear}`}
					>
						{studentsData.map((studentData, studentIndex) => {
							const subjects = Object.keys(studentData.firstSemesterAverage);

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
												<Text>Class: {reportFilters.className}</Text>
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
														B = 00 - 89 Very Good
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
													<Text style={{ textDecoration: 'underline' }}> </Text>
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
														JUNIOR HIGH PROGRESS REPORT
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
																{reportFilters.className}
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
		gradeLevel: string;
		className: string;
		reportType: 'entire-class' | 'selected-students';
		selectedStudents: string[];
	}>({
		academicYear: '',
		gradeLevel: '',
		className: '',
		reportType: 'entire-class',
		selectedStudents: [],
	});

	// This useEffect is used to correctly update the selected students when the class changes
	const [students, setStudents] = useState<Student[]>([]);
	const [loadingStudents, setLoadingStudents] = useState(false);

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
					} else {
						setStudents([]);
					}
				} catch (error) {
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

	// Reset selected students when switching report type
	useEffect(() => {
		if (filters.reportType === 'entire-class') {
			setFilters((prev) => ({ ...prev, selectedStudents: [] }));
		}
	}, [filters.reportType, setFilters]);

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
