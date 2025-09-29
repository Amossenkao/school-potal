'use client';
import React, { useState, useEffect } from 'react';
import {
	Document,
	Page,
	PDFViewer,
	Text,
	View,
	Image,
} from '@react-pdf/renderer';
import { PageLoading } from '@/components/loading';

// Styles for the PDF
const styles = {
	page: {
		flexDirection: 'column',
		backgroundColor: '#FFFFFF',
		padding: 15,
		fontSize: 9,
	},
	schoolHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 15,
		borderBottom: 2,
		borderBottomColor: '#000',
		paddingBottom: 10,
	},
	schoolInfo: {
		flexDirection: 'column',
		alignItems: 'center',
		flex: 1,
	},
	schoolName: {
		fontSize: 16,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 3,
	},
	schoolDetails: {
		fontSize: 8,
		textAlign: 'center',
		marginBottom: 1,
	},
	reportTitle: {
		fontSize: 12,
		fontWeight: 'bold',
		textAlign: 'center',
		marginTop: 8,
		color: '#1a365d',
	},
	teacherSection: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 12,
		padding: 8,
		backgroundColor: '#f7fafc',
		borderWidth: 1,
		borderColor: '#000',
	},
	teacherInfo: {
		fontSize: 10,
		fontWeight: 'bold',
	},
	table: {
		borderWidth: 1,
		borderColor: '#000',
		marginBottom: 15,
	},
	tableHeader: {
		flexDirection: 'row',
		backgroundColor: '#2d3748',
		color: '#ffffff',
		fontWeight: 'bold',
		fontSize: 7,
		minHeight: 30,
	},
	tableRow: {
		flexDirection: 'row',
		borderBottom: 1,
		borderBottomColor: '#000',
		minHeight: 20,
	},
	noCell: {
		width: 25,
		padding: 3,
		borderRight: 1,
		borderRightColor: '#000',
		textAlign: 'center',
		justifyContent: 'center',
		fontSize: 7,
	},
	studentNameCell: {
		width: 100,
		padding: 3,
		borderRight: 1,
		borderRightColor: '#000',
		justifyContent: 'center',
		fontSize: 7,
	},
	gradeCell: {
		width: 40,
		padding: 3,
		borderRight: 1,
		borderRightColor: '#000',
		textAlign: 'center',
		justifyContent: 'center',
		fontSize: 7,
	},
	headerCell: {
		padding: 3,
		borderRight: 1,
		borderRightColor: '#ffffff',
		textAlign: 'center',
		justifyContent: 'center',
	},
	footer: {
		marginTop: 15,
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	gradingScale: {
		flex: 1,
		marginRight: 20,
	},
	gradingTitle: {
		fontWeight: 'bold',
		marginBottom: 4,
		fontSize: 10,
	},
	gradingText: {
		fontSize: 8,
		marginBottom: 1,
	},
	signature: {
		flex: 1,
		alignItems: 'flex-end',
	},
};

// Data for filters
const academicYearOptions = ['2024/2025', '2023/2024', '2022/2023'];
const gradeLevelOptions = ['Junior High', 'Senior High'];
const classOptionsByLevel = {
	'Junior High': ['7', '7B', '8A', '8B', '9A', '9B'],
	'Senior High': ['10A', '10B', '11A', '11B', '12A', '12B'],
};
const subjectOptionsByClass = {
	'7': ['Mathematics', 'English', 'Science', 'History'],
	'7B': ['Mathematics', 'English', 'Science', 'Geography'],
	// Add other classes and their subjects
};

function gradeStyle(score) {
	if (score === null || score === undefined) {
		return {
			...styles.gradeCell,
			backgroundColor: '#ffeb3b',
			color: '#d32f2f',
			fontWeight: 'bold',
		};
	}
	return {
		...styles.gradeCell,
		color: Number(score) < 70 ? 'red' : 'blue',
	};
}

function FilterContent({ filters, setFilters, onSubmit }) {
	const handleGradeLevelChange = (level) => {
		setFilters((f) => ({
			...f,
			gradeLevel: level,
			className: '',
			subject: '',
		}));
	};

	const handleClassChange = (className) => {
		setFilters((f) => ({ ...f, className, subject: '' }));
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
			<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
				<h2 className="text-lg font-semibold mb-4 text-center">
					Filter Grade Sheet
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
								subject: '',
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
						onChange={(e) => handleGradeLevelChange(e.target.value)}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
						disabled={!filters.academicYear}
					>
						<option value="">Select Grade Level</option>
						{gradeLevelOptions.map((level) => (
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
						onChange={(e) => handleClassChange(e.target.value)}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
						disabled={!filters.gradeLevel}
					>
						<option value="">Select Class</option>
						{filters.gradeLevel &&
							classOptionsByLevel[filters.gradeLevel]?.map((c) => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
					</select>
				</div>
				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">Subject</label>
					<select
						value={filters.subject}
						onChange={(e) =>
							setFilters((f) => ({ ...f, subject: e.target.value }))
						}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
						disabled={!filters.className}
					>
						<option value="">Select Subject</option>
						{filters.className &&
							subjectOptionsByClass[filters.className]?.map((s) => (
								<option key={s} value={s}>
									{s}
								</option>
							))}
					</select>
				</div>
				<div className="flex gap-2 mt-6">
					<button
						type="button"
						onClick={() => {
							setFilters({
								academicYear: '',
								gradeLevel: '',
								className: '',
								subject: '',
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
						disabled={
							!filters.academicYear || !filters.className || !filters.subject
						}
					>
						Apply Filter
					</button>
				</div>
			</div>
		</div>
	);
}

function ReportContent({ filters, onClose }) {
	const [reportData, setReportData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchGrades = async () => {
			if (!filters.academicYear || !filters.className || !filters.subject) {
				setReportData(null);
				setLoading(false);
				return;
			}
			setLoading(true);
			setError(null);
			try {
				const { academicYear, className, subject } = filters;
				const gradeLevelForApi = className.match(/\d+/)?.[0];

				if (!gradeLevelForApi) {
					throw new Error(
						'Invalid class selected. Could not determine grade level.'
					);
				}

				const params = new URLSearchParams({
					academicYear,
					gradeLevel: gradeLevelForApi,
					subject,
				});

				const res = await fetch(`/api/grades?${params.toString()}`);
				if (!res.ok) {
					const errorData = await res.json();
					throw new Error(errorData.message || 'Failed to fetch grade data');
				}
				const data = await res.json();
				console.log('DATA:', data);
				if (data.success && data.data.grades.length > 0) {
					const periodApiToPdfMap = {
						firstPeriod: 'p1',
						secondPeriod: 'p2',
						thirdPeriod: 'p3',
						thirdPeriodExam: 'exam1',
						fourthPeriod: 'p4',
						fifthPeriod: 'p5',
						sixthPeriod: 'p6',
						sixthPeriodExam: 'exam2',
					};

					const studentDataMap = new Map();
					const statsByPdfPeriod = {};

					data.data.grades.forEach((periodData) => {
						const pdfPeriodKey = periodApiToPdfMap[periodData.period];
						if (pdfPeriodKey) {
							statsByPdfPeriod[pdfPeriodKey] = periodData.stats;
						}

						periodData.grades.forEach((studentGrade) => {
							if (!studentDataMap.has(studentGrade.studentId)) {
								studentDataMap.set(studentGrade.studentId, {
									studentId: studentGrade.studentId,
									name: studentGrade.name,
									grades: {},
								});
							}
							const student = studentDataMap.get(studentGrade.studentId);
							if (pdfPeriodKey) {
								student.grades[pdfPeriodKey] = studentGrade.grade;
							}
						});
					});

					studentDataMap.forEach((student) => {
						const sem1 = [
							student.grades.p1,
							student.grades.p2,
							student.grades.p3,
							student.grades.exam1,
						].filter((g) => g != null);
						student.grades.sem1Avg =
							sem1.length > 0
								? sem1.reduce((a, b) => a + b, 0) / sem1.length
								: null;

						const sem2 = [
							student.grades.p4,
							student.grades.p5,
							student.grades.p6,
							student.grades.exam2,
						].filter((g) => g != null);
						student.grades.sem2Avg =
							sem2.length > 0
								? sem2.reduce((a, b) => a + b, 0) / sem2.length
								: null;

						const yearly = [...sem1, ...sem2];
						student.grades.yearlyAvg =
							yearly.length > 0
								? yearly.reduce((a, b) => a + b, 0) / yearly.length
								: null;
					});

					const allStudents = Array.from(studentDataMap.values());
					['sem1Avg', 'sem2Avg', 'yearlyAvg'].forEach((key) => {
						const grades = allStudents
							.map((s) => s.grades[key])
							.filter((g) => g != null);
						statsByPdfPeriod[key] = {
							incompletes: allStudents.length - grades.length,
							passes: grades.filter((g) => g >= 70).length,
							fails: grades.filter((g) => g < 70).length,
							average:
								grades.length > 0
									? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(
											1
									  )
									: 'N/A',
						};
					});

					setReportData({
						students: allStudents,
						stats: statsByPdfPeriod,
						teacher: data.data.grades[0]?.teacher, // Assuming teacher is consistent
					});
				} else {
					setReportData(null);
					setError('No grade data found for the selected criteria.');
				}
			} catch (e) {
				setError(e.message);
			} finally {
				setLoading(false);
			}
		};

		fetchGrades();
	}, [filters]);

	if (loading) {
		return <PageLoading message="Loading report data..." fullScreen={false} />;
	}

	if (error) {
		return (
			<div className="text-center p-8">
				<p className="text-red-500">{error}</p>
				<button
					onClick={onClose}
					className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
				>
					Back to Filters
				</button>
			</div>
		);
	}

	if (!reportData) {
		return (
			<div className="text-center p-8">
				<p>No data available for this selection.</p>
				<button
					onClick={onClose}
					className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
				>
					Back to Filters
				</button>
			</div>
		);
	}

	const { students, stats } = reportData;
	const studentsPerPage = 25;
	const paginatedStudents = [];
	for (let i = 0; i < students.length; i += studentsPerPage) {
		paginatedStudents.push(students.slice(i, i + studentsPerPage));
	}

	const periods = [
		'p1',
		'p2',
		'p3',
		'exam1',
		'sem1Avg',
		'p4',
		'p5',
		'p6',
		'exam2',
		'sem2Avg',
		'yearlyAvg',
	];

	return (
		<div className="w-full h-screen bg-background flex flex-col">
			<div className="flex justify-end px-8 py-4">
				<button
					type="button"
					onClick={onClose}
					className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm"
				>
					← Back to Filter
				</button>
			</div>
			<div className="flex-1">
				<PDFViewer className="w-full h-[calc(100vh-80px)] bg-background">
					<Document
						title={`Master Grade Sheet - ${filters.subject} - ${filters.className}`}
					>
						{paginatedStudents.map((studentsChunk, pageIndex) => {
							const isLastPage = pageIndex === paginatedStudents.length - 1;

							return (
								<Page key={pageIndex} size="A4" style={styles.page}>
									{/* Header, Watermark etc. */}
									<View style={styles.teacherSection}>
										<Text style={styles.teacherInfo}>
											Subject: {filters.subject}
										</Text>
										<Text style={styles.teacherInfo}>
											Class: {filters.className}
										</Text>
										<Text style={styles.teacherInfo}>
											Academic Year: {filters.academicYear}
										</Text>
										<Text style={styles.teacherInfo}>
											Page: {pageIndex + 1} of {paginatedStudents.length}
										</Text>
									</View>

									{/* Grade Table */}
									<View style={styles.table}>
										{/* Table Header */}
										<View style={styles.tableHeader}>
											<View style={[styles.headerCell, { width: 25 }]}>
												<Text>No.</Text>
											</View>
											<View style={[styles.headerCell, { width: 100 }]}>
												<Text>Student Name</Text>
											</View>
											{[
												'1st Pd',
												'2nd Pd',
												'3rd Pd',
												'Exam',
												'Average',
												'4th Pd',
												'5th Pd',
												'6th Pd',
												'Exam',
												'Average',
												'Yearly\nAverage',
											].map((label, i) => (
												<View
													key={i}
													style={[
														styles.headerCell,
														{ width: i === 4 || i === 9 || i === 10 ? 45 : 40 },
													]}
												>
													<Text>{label}</Text>
												</View>
											))}
										</View>

										{/* Student Rows */}
										{studentsChunk.map((student, idx) => {
											const no = pageIndex * studentsPerPage + idx + 1;
											return (
												<View key={student.studentId} style={styles.tableRow}>
													<View style={styles.noCell}>
														<Text>{no}</Text>
													</View>
													<View style={styles.studentNameCell}>
														<Text>{student.name}</Text>
														<Text style={{ fontSize: 6, color: '#666' }}>
															ID: {student.studentId}
														</Text>
													</View>
													{periods.map((key, i) => (
														<Text
															key={key}
															style={{
																...gradeStyle(student.grades[key]),
																width: i === 4 || i === 9 || i === 10 ? 45 : 40,
															}}
														>
															{student.grades[key] != null
																? Number(student.grades[key]).toFixed(1)
																: 'INC'}
														</Text>
													))}
												</View>
											);
										})}

										{isLastPage && (
											<>
												<View
													style={[
														styles.tableRow,
														{ backgroundColor: '#fed7d7' },
													]}
												>
													<View style={styles.noCell}>
														<Text></Text>
													</View>
													<View style={styles.studentNameCell}>
														<Text style={{ fontWeight: 'bold' }}>
															Incompletes
														</Text>
													</View>
													{periods.map((p, i) => (
														<Text
															key={p}
															style={{
																...styles.gradeCell,
																width: i === 4 || i === 9 || i === 10 ? 45 : 40,
															}}
														>
															{stats[p]?.incompletes ?? 0}
														</Text>
													))}
												</View>
												<View
													style={[
														styles.tableRow,
														{ backgroundColor: '#d4edda' },
													]}
												>
													<View style={styles.noCell}>
														<Text></Text>
													</View>
													<View style={styles.studentNameCell}>
														<Text style={{ fontWeight: 'bold' }}>Pass</Text>
													</View>
													{periods.map((p, i) => (
														<Text
															key={p}
															style={{
																...styles.gradeCell,
																width: i === 4 || i === 9 || i === 10 ? 45 : 40,
															}}
														>
															{stats[p]?.passes ?? 0}
														</Text>
													))}
												</View>
												<View
													style={[
														styles.tableRow,
														{ backgroundColor: '#f8d7da' },
													]}
												>
													<View style={styles.noCell}>
														<Text></Text>
													</View>
													<View style={styles.studentNameCell}>
														<Text style={{ fontWeight: 'bold' }}>Fail</Text>
													</View>
													{periods.map((p, i) => (
														<Text
															key={p}
															style={{
																...styles.gradeCell,
																width: i === 4 || i === 9 || i === 10 ? 45 : 40,
															}}
														>
															{stats[p]?.fails ?? 0}
														</Text>
													))}
												</View>
												<View
													style={[
														styles.tableRow,
														{ backgroundColor: '#e2e3e5' },
													]}
												>
													<View style={styles.noCell}>
														<Text></Text>
													</View>
													<View style={styles.studentNameCell}>
														<Text style={{ fontWeight: 'bold' }}>
															Class Average
														</Text>
													</View>
													{periods.map((p, i) => (
														<Text
															key={p}
															style={{
																...styles.gradeCell,
																width: i === 4 || i === 9 || i === 10 ? 45 : 40,
															}}
														>
															{stats[p]?.average ?? 'N/A'}
														</Text>
													))}
												</View>
											</>
										)}
									</View>
								</Page>
							);
						})}
					</Document>
				</PDFViewer>
			</div>
		</div>
	);
}

function MasterGradeSheet() {
	const [filters, setFilters] = useState({
		academicYear: '',
		gradeLevel: '',
		className: '',
		subject: '',
	});
	const [showReport, setShowReport] = useState(false);

	return (
		<div className="w-full h-screen bg-background">
			{!showReport ? (
				<FilterContent
					filters={filters}
					setFilters={setFilters}
					onSubmit={() => setShowReport(true)}
				/>
			) : (
				<ReportContent filters={filters} onClose={() => setShowReport(false)} />
			)}
		</div>
	);
}

export default MasterGradeSheet;
