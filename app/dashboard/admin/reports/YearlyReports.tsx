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

function gradeStyle(score: string | number | null) {
	if (score === null || Number(score) < 70) {
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

interface StudentReportCardData {
	studentId: string;
	name: string;
	subjects: {
		[subject: string]: {
			firstSemester: {
				ca1: number | null;
				ca2: number | null;
				ca3: number | null;
				exam: number | null;
				average: number | null;
			};
			secondSemester: {
				ca1: number | null;
				ca2: number | null;
				ca3: number | null;
				exam: number | null;
				average: number | null;
			};
			yearlyAverage: number | null;
		};
	};
	ranks: {
		firstSemester: { [period: string]: number | null };
		secondSemester: { [period: string]: number | null };
		yearlyRank: number | null;
	};
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

const classOptionsByLevel = {
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
	'Junior High': ['7th Grade', '8th Grade', '9th Grade'],
	'Senior High': ['10th Grade', '11th Grade', '12th Grade'],
};

function FilterContent({
	filters,
	setFilters,
	onSubmit,
}: {
	filters: { academicYear: string; gradeLevel: string; className: string };
	setFilters: React.Dispatch<
		React.SetStateAction<{
			academicYear: string;
			gradeLevel: string;
			className: string;
		}>
	>;
	onSubmit: () => void;
}) {
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
						onChange={(e) =>
							setFilters((f) => ({ ...f, className: e.target.value }))
						}
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
				<div className="flex gap-2 mt-6">
					<button
						type="button"
						onClick={() => {
							setFilters({ academicYear: '', gradeLevel: '', className: '' });
						}}
						className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border"
					>
						Reset
					</button>
					<button
						type="button"
						onClick={onSubmit}
						className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary disabled:opacity-50"
						disabled={!filters.academicYear || !filters.className}
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
	reportFilters: { academicYear: string; className: string };
	onBack: () => void;
}) {
	const [studentsData, setStudentsData] = useState<StudentReportCardData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const school = useSchoolStore((state) => state.school);

	useEffect(() => {
		const fetchStudentsData = async () => {
			try {
				setLoading(true);
				setError(null);
				const params = {
					gradeLevel: reportFilters.className,
					academicYear: reportFilters.academicYear,
					reportType: 'reportcard',
				};
				const url = new URL('/api/grades', window.location.origin);
				Object.entries(params).forEach(([key, value]) => {
					if (value) url.searchParams.append(key, value);
				});
				const res = await fetch(url.toString());
				if (!res.ok) throw new Error('Failed to fetch grades');
				const data = await res.json();
				if (!data.success || !data.data || !Array.isArray(data.data.grades)) {
					throw new Error('Invalid data format received from the server');
				}
				setStudentsData(data.data.grades);
				setLoading(false);
			} catch (err) {
				console.error('Error fetching students data:', err);
				setError('Failed to load students data');
				setLoading(false);
			}
		};
		fetchStudentsData();
	}, [reportFilters.academicYear, reportFilters.className]);

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
							const subjectNames = Object.keys(studentData.subjects);
							const studentsReportSubjects = subjectNames.map(
								(name) => studentData.subjects[name]
							);

							// Calculate periodic averages
							const calculatePeriodicAverage = (
								periodKey: string,
								semesterKey: 'firstSemester' | 'secondSemester'
							) => {
								const grades = subjectNames
									.map(
										(subject) =>
											studentData.subjects[subject][semesterKey][periodKey]
									)
									.filter((grade) => grade !== null) as number[];
								if (grades.length === 0) return null;
								const avg =
									grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
								return parseFloat(avg.toFixed(2));
							};

							const periodicAverages = {
								firstSemester: {
									ca1: calculatePeriodicAverage('ca1', 'firstSemester'),
									ca2: calculatePeriodicAverage('ca2', 'firstSemester'),
									ca3: calculatePeriodicAverage('ca3', 'firstSemester'),
									exam: calculatePeriodicAverage('exam', 'firstSemester'),
									average: calculatePeriodicAverage('average', 'firstSemester'),
								},
								secondSemester: {
									ca1: calculatePeriodicAverage('ca1', 'secondSemester'),
									ca2: calculatePeriodicAverage('ca2', 'secondSemester'),
									ca3: calculatePeriodicAverage('ca3', 'secondSemester'),
									exam: calculatePeriodicAverage('exam', 'secondSemester'),
									average: calculatePeriodicAverage(
										'average',
										'secondSemester'
									),
								},
								yearlyAverage: 0, // Will be calculated below
							};

							const allYearlyAverages = subjectNames
								.map((subject) => studentData.subjects[subject].yearlyAverage)
								.filter((avg) => avg !== null) as number[];

							if (allYearlyAverages.length > 0) {
								periodicAverages.yearlyAverage = parseFloat(
									(
										allYearlyAverages.reduce((sum, avg) => sum + avg, 0) /
										allYearlyAverages.length
									).toFixed(2)
								);
							}

							return (
								<React.Fragment key={studentIndex}>
									{/* First Page - Grades */}
									<Page size="A4" orientation="landscape" style={styles.page}>
										{/* Watermark */}
										<View
											style={{
												position: 'absolute',
												top: '50%',
												left: '50%',
												transform: 'translate(150%, 50%)',
												opacity: 0.1,
												zIndex: -1,
											}}
										>
											<Image
												src={school.logoUrl}
												style={{
													width: 200,
													height: 200,
													opacity: 0.1,
												}}
											/>
										</View>

										{/* Header */}
										<View style={styles.topRow}>
											<View style={styles.headerLeft}>
												<Text style={{ fontWeight: 'bold' }}>
													Name: {studentData.name}
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

										{/* Grades Table */}
										<View style={styles.gradesContainer}>
											{/* First Semester */}
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
												{subjectNames.map((subjectName, index) => (
													<View key={index} style={styles.tableRow}>
														<Text style={styles.subjectCell}>
															{subjectName}
														</Text>
														<Text
															style={gradeStyle(
																studentData.subjects[subjectName].firstSemester
																	.ca1
															)}
														>
															{studentData.subjects[subjectName].firstSemester
																.ca1 ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																studentData.subjects[subjectName].firstSemester
																	.ca2
															)}
														>
															{studentData.subjects[subjectName].firstSemester
																.ca2 ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																studentData.subjects[subjectName].firstSemester
																	.ca3
															)}
														>
															{studentData.subjects[subjectName].firstSemester
																.ca3 ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																studentData.subjects[subjectName].firstSemester
																	.exam
															)}
														>
															{studentData.subjects[subjectName].firstSemester
																.exam ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																studentData.subjects[subjectName].firstSemester
																	.average
															)}
														>
															{studentData.subjects[subjectName].firstSemester
																.average ?? '-'}
														</Text>
													</View>
												))}
												{/* Periodic Average Row */}
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
														Periodic Average
													</Text>
													<Text
														style={gradeStyle(
															periodicAverages.firstSemester.ca1
														)}
													>
														{periodicAverages.firstSemester.ca1 ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															periodicAverages.firstSemester.ca2
														)}
													>
														{periodicAverages.firstSemester.ca2 ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															periodicAverages.firstSemester.ca3
														)}
													>
														{periodicAverages.firstSemester.ca3 ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															periodicAverages.firstSemester.exam
														)}
													>
														{periodicAverages.firstSemester.exam ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															periodicAverages.firstSemester.average
														)}
													>
														{periodicAverages.firstSemester.average ?? '-'}
													</Text>
												</View>
												{/* Rank Row */}
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
														{studentData.ranks.firstSemester.ca1}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.firstSemester.ca2}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.firstSemester.ca3}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.firstSemester.exam}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.firstSemester.average}
													</Text>
												</View>
											</View>
											{/* Second Semester */}
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
												{subjectNames.map((subjectName, index) => (
													<View key={index} style={styles.tableRow}>
														<Text
															style={gradeStyle(
																studentData.subjects[subjectName].secondSemester
																	.ca1
															)}
														>
															{studentData.subjects[subjectName].secondSemester
																.ca1 ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																studentData.subjects[subjectName].secondSemester
																	.ca2
															)}
														>
															{studentData.subjects[subjectName].secondSemester
																.ca2 ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																studentData.subjects[subjectName].secondSemester
																	.ca3
															)}
														>
															{studentData.subjects[subjectName].secondSemester
																.ca3 ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																studentData.subjects[subjectName].secondSemester
																	.exam
															)}
														>
															{studentData.subjects[subjectName].secondSemester
																.exam ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																studentData.subjects[subjectName].secondSemester
																	.average
															)}
														>
															{studentData.subjects[subjectName].secondSemester
																.average ?? '-'}
														</Text>
														<Text
															style={gradeStyle(
																studentData.subjects[subjectName].yearlyAverage
															)}
														>
															{studentData.subjects[subjectName]
																.yearlyAverage ?? '-'}
														</Text>
													</View>
												))}
												{/* Periodic Average Row */}
												<View
													style={{
														...styles.tableRow,
														backgroundColor: '#f0f8ff',
													}}
												>
													<Text
														style={gradeStyle(
															periodicAverages.secondSemester.ca1
														)}
													>
														{periodicAverages.secondSemester.ca1 ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															periodicAverages.secondSemester.ca2
														)}
													>
														{periodicAverages.secondSemester.ca2 ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															periodicAverages.secondSemester.ca3
														)}
													>
														{periodicAverages.secondSemester.ca3 ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															periodicAverages.secondSemester.exam
														)}
													>
														{periodicAverages.secondSemester.exam ?? '-'}
													</Text>
													<Text
														style={gradeStyle(
															periodicAverages.secondSemester.average
														)}
													>
														{periodicAverages.secondSemester.average ?? '-'}
													</Text>
													<Text
														style={gradeStyle(periodicAverages.yearlyAverage)}
													>
														{periodicAverages.yearlyAverage || '-'}
													</Text>
												</View>
												{/* Rank Row */}
												<View
													style={{
														...styles.tableRow,
														backgroundColor: '#f0f8ff',
													}}
												>
													<Text style={styles.tableCell}>
														{studentData.ranks.secondSemester.ca1}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.secondSemester.ca2}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.secondSemester.ca3}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.secondSemester.exam}
													</Text>
													<Text style={styles.tableCell}>
														{studentData.ranks.secondSemester.average}
													</Text>
													<Text style={styles.lastCell}>
														{studentData.ranks.yearlyRank}
													</Text>
												</View>
											</View>
										</View>
										{/* Bottom Section */}
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
														{'Class Sponsor'}, Class Sponsor
													</Text>
												</View>
											</View>
										</View>
									</Page>
									{/* Second Page - School Info and Parent Section */}
									<Page size="A4" orientation="landscape" style={styles.page}>
										{/* Watermark */}
										<View
											style={{
												position: 'absolute',
												top: '50%',
												left: '50%',
												transform: 'translate(100%, 1%)',
												opacity: 0.2,
												zIndex: -1,
											}}
										>
											<Image
												src={school.logoUrl}
												style={{
													width: 200,
													height: 200,
													opacity: 0.1,
												}}
											/>
										</View>
										{/* Two Column Container */}
										<View style={styles.pageTwoContainer}>
											{/* Left Column - Promotion Statement */}
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
														{studentData.name}
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
												{/* QR Code placeholder */}
												<View
													style={{
														width: 80,
														height: 80,
														backgroundColor: '#e2e8f0',
														alignSelf: 'center',
														marginTop: 80,
														justifyContent: 'center',
														alignItems: 'center',
														borderWidth: 1,
														borderColor: '#000',
														left: -120,
													}}
												>
													<Text style={{ fontSize: 8, textAlign: 'center' }}>
														QR CODE{'\n'}PLACEHOLDER
													</Text>
												</View>
											</View>
											{/* Right Column - School Information */}
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
													<Text style={styles.schoolName}>{school.name}</Text>
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
																src={school.logoUrl2}
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
															{school.address[0]}
														</Text>
														<Text style={styles.schoolDetails}>
															{school.address[1]}
														</Text>
														<Text style={styles.schoolDetails}>
															Email: {school.emails[0]}
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
																src={school.logoUrl}
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
												<View style={styles.studentInfo}>
													<View
														style={{
															display: 'flex',
															flexDirection: 'row',
															gap: 14,
														}}
													>
														<Text>
															Name:{' '}
															<Text style={{ fontWeight: 'bold' }}>
																{studentData.name}
															</Text>
														</Text>
														<Text>
															ID:{' '}
															<Text style={{ fontWeight: 'bold' }}>
																{studentData.studentId}
															</Text>
														</Text>
													</View>
													<View style={{ flexDirection: 'row', gap: 78 }}>
														<Text>
															Class:{' '}
															<Text style={{ fontWeight: 'bold' }}>
																{reportFilters.className}
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

export default function ReportCardWrapper() {
	const [showReport, setShowReport] = useState(false);
	const [filters, setFilters] = useState<{
		academicYear: string;
		gradeLevel: string;
		className: string;
	}>({
		academicYear: '',
		gradeLevel: '',
		className: '',
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
