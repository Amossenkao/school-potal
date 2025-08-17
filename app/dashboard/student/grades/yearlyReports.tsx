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
	periods: Record<string, Array<{ subject: string; grade: number }>>;
	periodAverages: Record<string, number>;
	yearlyAverage: number;
	ranks: Record<string, number>;
}

const academicYearOptions = [
	'2024/2025',
	'2023/2024',
	'2022/2023',
	'2021/2022',
];

function FilterContent({
	filters,
	setFilters,
	onSubmit,
}: {
	filters: { academicYear: string };
	setFilters: React.Dispatch<
		React.SetStateAction<{
			academicYear: string;
		}>
	>;
	onSubmit: () => void;
}) {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
			<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
				<h2 className="text-lg font-semibold mb-4 text-center">
					Filter Yearly Report
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
				<div className="flex gap-2 mt-6">
					<button
						type="button"
						onClick={() => {
							setFilters({ academicYear: '' });
						}}
						className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border"
					>
						Reset
					</button>
					<button
						type="button"
						onClick={onSubmit}
						className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary disabled:opacity-50"
						disabled={!filters.academicYear}
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
	reportFilters: { academicYear: string };
	onBack: () => void;
}) {
	const [studentData, setStudentData] = useState<StudentYearlyReport | null>(
		null
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { user } = useAuth();
	const school = useSchoolStore((state) => state.school);

	useEffect(() => {
		const fetchStudentData = async () => {
			try {
				setLoading(true);
				setError(null);

				if (!user?.studentId) {
					throw new Error('Student ID not found');
				}

				const params = {
					studentIds: user.studentId,
					academicYear: reportFilters.academicYear,
					reportType: 'yearly',
				};
				const url = new URL('/api/grades', window.location.origin);
				Object.entries(params).forEach(([key, value]) => {
					if (value) url.searchParams.append(key, value);
				});
				const res = await fetch(url.toString());
				if (!res.ok) throw new Error('Failed to fetch grades');
				const data = await res.json();
				if (!data.success || !data.data || !data.data.report) {
					throw new Error('No yearly student data found.');
				}
				console.log(data.data.report);
				setStudentData(data.data.report);
			} catch (err: any) {
				console.error('Error fetching student data:', err);
				setError(err.message || 'Failed to load student data');
			} finally {
				setLoading(false);
			}
		};
		fetchStudentData();
	}, [reportFilters.academicYear, user?.studentId]);

	if (loading) {
		return (
			<PageLoading message="Loading your yearly report..." fullScreen={false} />
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

	if (!studentData) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
				<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6 text-center">
					<h2 className="text-lg font-semibold mb-4">No Data Found</h2>
					<p className="text-muted-foreground mb-6">
						No yearly report data found for the selected academic year.
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
						title={`Report Card for ${studentData.studentName} - ${reportFilters.academicYear}`}
					>
						{/* First Page - Grades */}
						<Page size="A4" orientation="landscape" style={styles.page}>
							<View style={styles.topRow}>
								<View style={styles.headerLeft}>
									<Text style={{ fontWeight: 'bold' }}>
										Name: {studentData.studentName}
									</Text>
									<Text>Class: {user?.classId}</Text>
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
									{(() => {
										const subjects = Array.from(
											new Set(
												Object.values(studentData.periods).flatMap((p) =>
													p.map((g) => g.subject)
												)
											)
										);

										const getGrade = (period: string, subject: string) =>
											studentData.periods[period]?.find(
												(s) => s.subject === subject
											)?.grade ?? null;

										return subjects.map((subject, index) => {
											const sem1Grades = [
												getGrade('firstPeriod', subject),
												getGrade('secondPeriod', subject),
												getGrade('thirdPeriod', subject),
												getGrade('thirdPeriodExam', subject),
											].filter((g) => g !== null);
											const sem1Avg =
												sem1Grades.length > 0
													? sem1Grades.reduce((a, b) => a! + b!, 0)! /
													  sem1Grades.length
													: null;

											return (
												<View key={index} style={styles.tableRow}>
													<Text style={styles.subjectCell}>{subject}</Text>
													<Text
														style={gradeStyle(getGrade('firstPeriod', subject))}
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
														style={gradeStyle(getGrade('thirdPeriod', subject))}
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
													<Text style={gradeStyle(sem1Avg)}>
														{sem1Avg?.toFixed(0) ?? '-'}
													</Text>
												</View>
											);
										});
									})()}
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
											style={gradeStyle(studentData.periodAverages.firstPeriod)}
										>
											{studentData.periodAverages.firstPeriod?.toFixed(1) ??
												'-'}
										</Text>
										<Text
											style={gradeStyle(
												studentData.periodAverages.secondPeriod
											)}
										>
											{studentData.periodAverages.secondPeriod?.toFixed(1) ??
												'-'}
										</Text>
										<Text
											style={gradeStyle(studentData.periodAverages.thirdPeriod)}
										>
											{studentData.periodAverages.thirdPeriod?.toFixed(1) ??
												'-'}
										</Text>
										<Text
											style={gradeStyle(
												studentData.periodAverages.thirdPeriodExam
											)}
										>
											{studentData.periodAverages.thirdPeriodExam?.toFixed(1) ??
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
									<Text style={styles.semesterHeader}>Second Semester</Text>
									<View style={styles.tableHeader}>
										<Text style={styles.tableCell}>4th Period</Text>
										<Text style={styles.tableCell}>5th Period</Text>
										<Text style={styles.tableCell}>6th Period</Text>
										<Text style={styles.tableCell}>Exam</Text>
										<Text style={styles.tableCell}>Average</Text>
										<Text style={styles.lastCell}>Yearly Average</Text>
									</View>
									{(() => {
										const subjects = Array.from(
											new Set(
												Object.values(studentData.periods).flatMap((p) =>
													p.map((g) => g.subject)
												)
											)
										);

										const getGrade = (period: string, subject: string) =>
											studentData.periods[period]?.find(
												(s) => s.subject === subject
											)?.grade ?? null;

										return subjects.map((subject, index) => {
											const sem1Grades = [
												getGrade('firstPeriod', subject),
												getGrade('secondPeriod', subject),
												getGrade('thirdPeriod', subject),
												getGrade('thirdPeriodExam', subject),
											].filter((g) => g !== null);
											const sem2Grades = [
												getGrade('fourthPeriod', subject),
												getGrade('fifthPeriod', subject),
												getGrade('sixthPeriod', subject),
												getGrade('sixthPeriodExam', subject),
											].filter((g) => g !== null);
											const sem2Avg =
												sem2Grades.length > 0
													? sem2Grades.reduce((a, b) => a! + b!, 0)! /
													  sem2Grades.length
													: null;
											const yearlyGrades = [...sem1Grades, ...sem2Grades];
											const yearlyAvg =
												yearlyGrades.length > 0
													? yearlyGrades.reduce((a, b) => a! + b!, 0)! /
													  yearlyGrades.length
													: null;

											return (
												<View key={index} style={styles.tableRow}>
													<Text
														style={gradeStyle(
															getGrade('fourthPeriod', subject)
														)}
													>
														{getGrade('fourthPeriod', subject) ?? '-'}
													</Text>
													<Text
														style={gradeStyle(getGrade('fifthPeriod', subject))}
													>
														{getGrade('fifthPeriod', subject) ?? '-'}
													</Text>
													<Text
														style={gradeStyle(getGrade('sixthPeriod', subject))}
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
													<Text style={gradeStyle(sem2Avg)}>
														{sem2Avg?.toFixed(0) ?? '-'}
													</Text>
													<Text style={gradeStyle(yearlyAvg)}>
														{yearlyAvg?.toFixed(0) ?? '-'}
													</Text>
												</View>
											);
										});
									})()}
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
											{studentData.periodAverages.fourthPeriod?.toFixed(1) ??
												'-'}
										</Text>
										<Text
											style={gradeStyle(studentData.periodAverages.fifthPeriod)}
										>
											{studentData.periodAverages.fifthPeriod?.toFixed(1) ??
												'-'}
										</Text>
										<Text
											style={gradeStyle(studentData.periodAverages.sixthPeriod)}
										>
											{studentData.periodAverages.sixthPeriod?.toFixed(1) ??
												'-'}
										</Text>
										<Text
											style={gradeStyle(
												studentData.periodAverages.sixthPeriodExam
											)}
										>
											{studentData.periodAverages.sixthPeriodExam?.toFixed(1) ??
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
										<Text style={styles.gradingTitle}>METHOD OF GRADING</Text>
										<Text style={styles.gradingText}>
											A = 90 - 100 Excellent
										</Text>
										<Text style={styles.gradingText}>
											B = 80 - 89 Very Good
										</Text>
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
										This report will be periodically for your inspection. It is
										a pupil progress report by which pupils' work could result
										in lack of study, irregular attendance or something that
										could be connected, special attention should be paid to
										ensure that the child improves. Moreover, parent conferences
										with parent(s) or guardians are encouraged, and it will
										serve to secure the best co-operation for your child.
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
												Daycare, Nursery, Kindergarten, Elem, Junior & Senior
												High
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
													{user?.classId}
												</Text>
											</Text>
										</View>
										<View style={{ flexDirection: 'column' }}>
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
											When a student mark is 69 or below in any subject the
											parent or guardian should give special attention to see
											that the student does well in all the work required by the
											teacher, otherwise the student will probably{' '}
											<Text style={{ fontWeight: 'bold' }}>
												REPEAT THE CLASS.
											</Text>
										</Text>
									</View>
								</View>
							</View>
						</Page>
					</Document>
				</PDFViewer>
			</div>
		</div>
	);
}

export default function StudentYearlyReport() {
	const [showReport, setShowReport] = useState(false);
	const [filters, setFilters] = useState<{
		academicYear: string;
	}>({
		academicYear: '',
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
