import React from 'react';
import {
	Document,
	Page,
	Text,
	View,
	Image,
	StyleSheet,
} from '@react-pdf/renderer';
import {
	REPORT_CARD_THEMES,
	DEFAULT_REPORT_CARD_THEME,
	ReportTheme,
} from '@/types/reportCardTheme';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface StudentYearlyReport {
	studentId: string;
	studentName: string;
	periods: Record<string, Array<{ subject: string; grade: number | null }>>;
	firstSemesterAverage: Record<string, number | null>;
	secondSemesterAverage: Record<string, number | null>;
	periodAverages: Record<string, number | null>;
	yearlyAverage: number | null;
	ranks: Record<string, number | null>;
	qrCodeDataUrl?: string;
}

export interface ReportFilters {
	academicYear: string;
	session: string;
	classLevel: string;
	className: string;
	selectedStudents: string[];
	sponsorName: string;
}

// Sytling

const styles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		backgroundColor: '#ffffff',
		margin: 0,
		padding: 25,
		fontSize: 12,
	},

	// Header section
	topRow: {
		flexDirection: 'row',
		marginTop: 15,
		marginBottom: 20,
		borderBottom: 1,
		borderBottomColor: '#787',
		overflow: 'hidden',
	},

	headerLeft: {
		flexDirection: 'column',
		width: 700,
		gap: 6,
		paddingBottom: 4,
	},

	headerRight: {
		flexDirection: 'column',
		justifyContent: 'flex-end',
		width: 700,
		paddingLeft: 120,
		paddingBottom: 4,
	},

	// Main grades section
	gradesContainer: {
		flexDirection: 'row',
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#000',
		gap: 40,
		borderTopRightRadius: 4,
		borderTopLeftRadius: 4,
	},

	semester: {
		flex: 1,
		borderRight: 1,
		borderRightColor: '#000',
		borderTopLeftRadius: 4,
	},

	lastSemester: {
		flex: 1,
		borderLeft: 1,
		borderTopRightRadius: 4,
	},

	semesterHeader: {
		backgroundColor: '#f0f0f0',
		padding: 5,
		textAlign: 'center',
		borderBottom: 1,
		borderBottomColor: '#000',
		fontWeight: 'bold',
	},

	// Table styles

	subjectCell: {
		flex: 2,
		padding: 2,
		borderRight: 0.5,
		borderRightColor: '#000',
		textAlign: 'left',
		fontSize: 8,
		fontWeight: 'bold',
	},

	tableHeader: {
		flexDirection: 'row',
		backgroundColor: '#f0f0f0',
		borderBottom: 1,
		borderBottomColor: '#000',
		fontSize: 14,
		fontWeight: 'bold',
	},

	tableRow: {
		flexDirection: 'row',
		borderBottom: 0.5,
		borderBottomColor: '#000',
		height: 16,
		fontSize: 12,
	},

	tableCell: {
		flex: 1,
		padding: 2,
		borderRight: 0.5,
		borderRightColor: '#000',
		textAlign: 'center',
		fontSize: 8,
	},

	lastCell: {
		flex: 1,
		padding: 2,
		textAlign: 'center',
		fontSize: 8,
		justifyContent: 'center',
		alignContent: 'center',
		alignItems: 'center',
	},

	// Bottom section
	bottomSection: {
		flexDirection: 'row',
		marginTop: 10,
		justifyContent: 'space-around',
	},

	leftBottom: {
		flex: 1,
		marginRight: 40,
	},

	rightBottom: {
		flex: 1,
	},

	gradingMethod: {
		marginTop: -4,
		marginBottom: 10,
		paddingTop: 5,
		paddingRight: 5,
		paddingLeft: 5,
		paddingBottom: 0,
	},

	gradingTitle: {
		fontWeight: 'bold',
		marginBottom: 5,
		textAlign: 'center',
	},

	gradingText: {
		fontSize: 10,
		marginBottom: 2,
	},

	promotionText: {
		fontWeight: 'bold',
		marginBottom: 10,
		fontSize: 10,
		paddingLeft: 50,
	},

	signatureSection: {
		marginTop: 20,
		paddingLeft: 50,
	},

	// Second page styles

	pageTwoContainer: {
		flexDirection: 'row',
		height: '100%',
		gap: 25,
		borderTopWidth: 1,
		borderBottomWidth: 1,
	},
	schoolHeader: {
		textAlign: 'center',
		marginBottom: 20,
	},

	schoolName: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 15,
		marginTop: 10,
	},

	schoolDetails: {
		fontSize: 10,
		marginBottom: 2,
		top: -75,
	},

	reportTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		fontFamily: 'Times-Bold',
		letterSpacing: 1.2,
		textTransform: 'uppercase',
		color: '#1f2937',
		backgroundColor: '#f7f1e3',
		borderWidth: 1,
		borderColor: '#b58900',
		borderRadius: 2,
		paddingVertical: 4,
		paddingHorizontal: 10,
		alignSelf: 'center',
		marginTop: -70,
	},

	studentInfo: {
		marginBottom: 15,
		fontSize: 12,
		gap: 4,
		paddingLeft: 20,
	},

	parentsSection: {
		marginTop: 20,
		borderWidth: 1,
		borderColor: '#000',
	},

	parentsSectionTitle: {
		fontWeight: 'bold',
		marginTop: 10,
		marginBottom: 10,
		textAlign: 'center',
	},

	noteSection: {
		marginTop: 15,
		fontSize: 8,
	},
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function gradeStyle(score: string | number | null) {
	if (score === null || score === '' || Number.isNaN(score)) {
		return styles.tableCell;
	}
	if (Number(score) < 70) {
		return {
			...styles.tableCell,
			color: 'red',
			fontSize: 10,
			fontWeight: 'bold',
		};
	}
	return {
		...styles.tableCell,
		color: 'blue',
		fontSize: 10,
		fontWeight: 'bold',
	};
}

const watermarkStyle = {
	position: 'absolute' as const,
	opacity: 0.1,
};

// ─────────────────────────────────────────────
// ThemedProgressReportHeader
// ─────────────────────────────────────────────

function ThemedProgressReportHeader({
	theme,
	classLevel,
}: {
	theme: ReportTheme;
	classLevel: string;
}) {
	const label = `${(classLevel ?? '').toUpperCase()} PROGRESS REPORT`;
	const cornerSize = 7;
	const cornerThickness = 1.5;

	const getLabelStyle = (length: number) => {
		if (length <= 27) return { fontSize: 13, letterSpacing: 2, width: '90%' };
		if (length <= 30) return { fontSize: 11, letterSpacing: 1.5, width: '92%' };
		if (length <= 34)
			return { fontSize: 12, letterSpacing: 1.25, width: '95%' };
		return { fontSize: 9, letterSpacing: 0.5, width: '98%' };
	};

	const { fontSize, letterSpacing, width } = getLabelStyle(label.length);

	return (
		<View style={{ marginBottom: 10, alignItems: 'center', marginTop: 30 }}>
			<View style={{ width }}>
				{/* Top-left bracket corner */}
				<View style={{ position: 'absolute', left: 0 }}>
					<View
						style={{
							width: cornerSize,
							height: cornerThickness,
							backgroundColor: theme.accentColor,
						}}
					/>
					<View
						style={{
							width: cornerThickness,
							height: cornerSize,
							backgroundColor: theme.accentColor,
						}}
					/>
				</View>
				{/* Top-right bracket corner */}
				<View style={{ position: 'absolute', top: 0, right: 0 }}>
					<View
						style={{
							width: cornerSize,
							height: cornerThickness,
							backgroundColor: theme.accentColor,
						}}
					/>
					<View
						style={{
							width: cornerThickness,
							height: cornerSize,
							backgroundColor: theme.accentColor,
							alignSelf: 'flex-end',
						}}
					/>
				</View>

				{/* Content */}
				<View
					style={{
						paddingVertical: 8,
						paddingHorizontal: 16,
						backgroundColor: theme.headerBarBg,
						marginHorizontal: 2,
					}}
				>
					<Text
						style={{
							fontSize,
							fontWeight: 'bold',
							color: theme.headerBarText,
							letterSpacing,
							textAlign: 'center',
						}}
					>
						{label}
					</Text>
				</View>

				{/* Bottom-left bracket corner */}
				<View style={{ position: 'absolute', bottom: 0, left: 0 }}>
					<View
						style={{
							width: cornerThickness,
							height: cornerSize,
							backgroundColor: theme.accentColor,
						}}
					/>
					<View
						style={{
							width: cornerSize,
							height: cornerThickness,
							backgroundColor: theme.accentColor,
						}}
					/>
				</View>
				{/* Bottom-right bracket corner */}
				<View style={{ position: 'absolute', bottom: 0, right: 0 }}>
					<View
						style={{
							width: cornerThickness,
							height: cornerSize,
							backgroundColor: theme.accentColor,
							alignSelf: 'flex-end',
						}}
					/>
					<View
						style={{
							width: cornerSize,
							height: cornerThickness,
							backgroundColor: theme.accentColor,
						}}
					/>
				</View>
			</View>
		</View>
	);
}
// ─────────────────────────────────────────────
// PromotionStatement
// ─────────────────────────────────────────────

function PromotionStatement({ theme }: { theme: ReportTheme }) {
	return (
		<View style={{ marginBottom: 16 }}>
			<Text
				style={{
					fontSize: 16,
					fontWeight: 'bold',
					textAlign: 'center',
					color: theme.sectionTitleColor,
					marginBottom: 12,
					letterSpacing: 0.3,
				}}
			>
				Promotion Statement
			</Text>
		</View>
	);
}

// ─────────────────────────────────────────────
// PDFDocument
// ─────────────────────────────────────────────

interface PDFDocumentProps {
	studentsData: StudentYearlyReport[];
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
	school: any;
	classSponsor: string | undefined;
	activeTheme?: ReportTheme;
	themeId?: string;
}

export const ReportCard = React.memo(function PDFDocument({
	studentsData,
	className,
	classSubjects,
	reportFilters,
	school,
	classSponsor,
	activeTheme: passedActiveTheme,
	themeId,
}: PDFDocumentProps) {
	const activeTheme =
		passedActiveTheme ||
		REPORT_CARD_THEMES.find((t) => t.id === themeId) ||
		DEFAULT_REPORT_CARD_THEME;

	const getDisplayClassName = (name: string) => {
		if (name === 'K-I' || name === 'K-II') {
			return name;
		}

		if (name.endsWith(' AM') || name.endsWith(' PM')) {
			return name.slice(0, -3);
		}

		if (name.includes('-')) {
			return name.split('-')[0];
		}

		return name;
	};

	const classLabel = className ? getDisplayClassName(className) : '';
	const schoolAddressFirstLine = Array.isArray(school?.address)
		? Array.isArray(school.address[0])
			? school.address[0].join('\n')
			: school.address[0] || ''
		: '';

	const schoolAddress = Array.isArray(school?.address)
		? school.address.slice(1).join('\n')
		: '';

	const accentLeft = {
		borderLeftWidth: 3,
		borderLeftColor: activeTheme.accentColor,
		paddingLeft: 6,
	};

	const themedTHCell = {
		...styles.tableCell,
		color: activeTheme.tableHeaderText,
		fontWeight: 'bold' as const,
		fontSize: 9,
		backgroundColor: activeTheme.tableHeaderBg,
	};
	const themedTHSubject = {
		...styles.subjectCell,
		backgroundColor: activeTheme.tableHeaderBg,
		color: activeTheme.tableHeaderText,
		fontWeight: 'bold' as const,
		fontSize: 10,
	};

	return (
		<Document title="Report Card Template">
			{studentsData.flatMap((studentData) => {
				const subjects = classSubjects;
				const getGrade = (period: string, subject: string) =>
					studentData.periods[period]?.find((s) => s.subject === subject)
						?.grade ?? null;
				const getOverallSubjectAverage = (subject: string) => {
					const sem1Avg = studentData.firstSemesterAverage[subject];
					const sem2Avg = studentData.secondSemesterAverage[subject];
					if (sem1Avg != null && sem2Avg != null) {
						return Number(((sem1Avg + sem2Avg) / 2).toFixed(1));
					}
					return null;
				};

				return [
					// ── Page 1: Grades ────────────────────────────
					<Page
						key={`${studentData.studentId}-grades`}
						size="A4"
						orientation="landscape"
						style={{ ...styles.page, paddingTop: 5 }}
					>
						<View style={styles.topRow}>
							<View style={styles.headerLeft}>
								<Text style={{ fontWeight: 'bold' }}>
									Name: {studentData.studentName}
								</Text>
								<Text>Class: {classLabel}</Text>
								<Text>ID: {studentData.studentId}</Text>
							</View>
							<View style={styles.headerRight}>
								<Text style={{ fontWeight: 'bold' }}>
									Academic Year: {reportFilters.academicYear}
								</Text>
							</View>
						</View>

						<View style={styles.gradesContainer}>
							{/* First Semester */}
							<View style={styles.semester}>
								{school?.logoUrl && (
									<Image
										src={school.logoUrl}
										style={{
											...watermarkStyle,
											width: '40%',
											top: '25%',
											left: '35%',
										}}
									/>
								)}
								<Text
									style={{
										...styles.semesterHeader,
										backgroundColor: activeTheme.semesterHeaderBg,
										color: activeTheme.semesterHeaderText,
									}}
								>
									First Semester
								</Text>
								<View style={styles.tableHeader}>
									<Text style={themedTHSubject}>Subject</Text>
									<Text style={themedTHCell}>1st Period</Text>
									<Text style={themedTHCell}>2nd Period</Text>
									<Text style={themedTHCell}>3rd Period</Text>
									<Text style={themedTHCell}>Exam</Text>
									<Text style={themedTHCell}>Average</Text>
								</View>
								{subjects.map((subject, index) => (
									<View key={index} style={styles.tableRow}>
										<Text style={styles.subjectCell}>{''}</Text>
										<Text style={gradeStyle(getGrade('first', subject))}>
											{getGrade('first', subject) ?? ''}
										</Text>
										<Text style={gradeStyle(getGrade('second', subject))}>
											{getGrade('second', subject) ?? ''}
										</Text>
										<Text style={gradeStyle(getGrade('third', subject))}>
											{getGrade('third', subject) ?? ''}
										</Text>
										<Text
											style={gradeStyle(getGrade('third_period_exam', subject))}
										>
											{getGrade('third_period_exam', subject) ?? ''}
										</Text>
										<Text
											style={gradeStyle(
												studentData.firstSemesterAverage[subject],
											)}
										>
											{studentData.firstSemesterAverage[subject]?.toFixed(1) ??
												''}
										</Text>
									</View>
								))}
								{/* Average row */}
								<View
									style={{
										...styles.tableRow,
										backgroundColor: activeTheme.rowAltBg,
									}}
								>
									<Text style={{ ...styles.subjectCell, fontWeight: 'bold' }}>
										Average
									</Text>
									<Text style={gradeStyle(studentData.periodAverages.first)}>
										{studentData.periodAverages.first?.toFixed(1) ?? ''}
									</Text>
									<Text style={gradeStyle(studentData.periodAverages.second)}>
										{studentData.periodAverages.second?.toFixed(1) ?? ''}
									</Text>
									<Text style={gradeStyle(studentData.periodAverages.third)}>
										{studentData.periodAverages.third?.toFixed(1) ?? ''}
									</Text>
									<Text
										style={gradeStyle(
											studentData.periodAverages.third_period_exam,
										)}
									>
										{studentData.periodAverages.third_period_exam?.toFixed(1) ??
											''}
									</Text>
									<Text
										style={gradeStyle(
											studentData.periodAverages.firstSemesterAverage,
										)}
									>
										{studentData.periodAverages.firstSemesterAverage?.toFixed(
											1,
										) ?? ''}
									</Text>
								</View>
								{/* Rank row */}
								<View
									style={{
										...styles.tableRow,
										backgroundColor: activeTheme.rowAltBg,
									}}
								>
									<Text style={{ ...styles.subjectCell, fontWeight: 'bold' }}>
										Rank
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.first ?? ''}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.second ?? ''}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.third ?? ''}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.third_period_exam ?? ''}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.firstSemesterAverage ?? ''}
									</Text>
								</View>
							</View>

							{/* Second Semester */}
							<View style={styles.lastSemester}>
								{school?.logoUrl && (
									<Image
										src={school.logoUrl}
										style={{
											...watermarkStyle,
											width: '40%',
											top: '25%',
											left: '25%',
										}}
									/>
								)}
								<Text
									style={{
										...styles.semesterHeader,
										backgroundColor: activeTheme.semesterHeaderBg,
										color: activeTheme.semesterHeaderText,
									}}
								>
									Second Semester
								</Text>
								<View style={styles.tableHeader}>
									<Text style={{ ...themedTHCell, fontSize: 10 }}>
										4th Period
									</Text>
									<Text style={themedTHCell}>5th Period</Text>
									<Text style={themedTHCell}>6th Period</Text>
									<Text style={themedTHCell}>Exam</Text>
									<Text style={themedTHCell}>Average</Text>
									<Text style={themedTHCell}>Yearly Ave</Text>
								</View>
								{subjects.map((subject, index) => (
									<View key={index} style={styles.tableRow}>
										<Text style={gradeStyle(getGrade('fourth', subject))}>
											{getGrade('fourth', subject) ?? ''}
										</Text>
										<Text style={gradeStyle(getGrade('fifth', subject))}>
											{getGrade('fifth', subject) ?? ''}
										</Text>
										<Text style={gradeStyle(getGrade('sixth', subject))}>
											{getGrade('sixth', subject) ?? ''}
										</Text>
										<Text
											style={gradeStyle(getGrade('six_period_exam', subject))}
										>
											{getGrade('six_period_exam', subject) ?? ''}
										</Text>
										<Text
											style={gradeStyle(
												studentData.secondSemesterAverage[subject],
											)}
										>
											{studentData.secondSemesterAverage[subject]?.toFixed(1) ??
												''}
										</Text>
										<Text style={gradeStyle(getOverallSubjectAverage(subject))}>
											{getOverallSubjectAverage(subject)?.toFixed(1) ?? ''}
										</Text>
									</View>
								))}
								{/* Average row */}
								<View
									style={{
										...styles.tableRow,
										backgroundColor: activeTheme.rowAltBg,
									}}
								>
									<Text style={gradeStyle(studentData.periodAverages.fourth)}>
										{studentData.periodAverages.fourth?.toFixed(1) ?? ''}
									</Text>
									<Text style={gradeStyle(studentData.periodAverages.fifth)}>
										{studentData.periodAverages.fifth?.toFixed(1) ?? ''}
									</Text>
									<Text style={gradeStyle(studentData.periodAverages.sixth)}>
										{studentData.periodAverages.sixth?.toFixed(1) ?? ''}
									</Text>
									<Text
										style={gradeStyle(
											studentData.periodAverages.six_period_exam,
										)}
									>
										{studentData.periodAverages.six_period_exam?.toFixed(1) ??
											''}
									</Text>
									<Text
										style={gradeStyle(
											studentData.periodAverages.secondSemesterAverage,
										)}
									>
										{studentData.periodAverages.secondSemesterAverage?.toFixed(
											1,
										) ?? ''}
									</Text>
									<Text style={gradeStyle(studentData.yearlyAverage)}>
										{studentData.yearlyAverage?.toFixed(1) ?? ''}
									</Text>
								</View>
								{/* Rank row */}
								<View
									style={{
										...styles.tableRow,
										backgroundColor: activeTheme.rowAltBg,
									}}
								>
									<Text style={styles.tableCell}>
										{studentData.ranks.fourth ?? ''}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.fifth ?? ''}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.sixth ?? ''}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.six_period_exam ?? ''}
									</Text>
									<Text style={styles.tableCell}>
										{studentData.ranks.secondSemesterAverage ?? ''}
									</Text>
									<Text style={styles.lastCell}>
										{studentData.ranks.yearly ?? ''}
									</Text>
								</View>
							</View>
						</View>

						{/* Bottom section */}
						<View style={styles.bottomSection}>
							<View style={styles.leftBottom}>
								<View style={styles.gradingMethod}>
									<View
										style={{
											backgroundColor: activeTheme.headerBarBg,
											borderRadius: 4,
											paddingVertical: 3,
											paddingHorizontal: 7,
											marginBottom: 4,
										}}
									>
										<Text
											style={{
												...styles.gradingTitle,
												color: activeTheme.semesterHeaderText,
												marginBottom: 0,
												letterSpacing: 0.6,
											}}
										>
											METHOD OF GRADING
										</Text>
									</View>
									<View
										style={{
											flexDirection: 'row',
											justifyContent: 'space-between',
										}}
									>
										<View style={{ flex: 1, marginRight: 4 }}>
											{[
												{ grade: 'A', label: '90 - 100 Excellent' },
												{ grade: 'B', label: '80 - 89 Very Good' },
												{ grade: 'C', label: '75 - 79 Good' },
											].map(({ grade, label }) => (
												<View
													key={grade}
													style={{
														flexDirection: 'row',
														alignItems: 'center',
														borderWidth: 1,
														borderColor: '#93c5fd',
														backgroundColor: '#eff6ff',
														borderRadius: 4,
														paddingVertical: 2,
														paddingHorizontal: 4,
														marginBottom: 2,
													}}
												>
													<Text
														style={{
															fontSize: 10,
															fontWeight: 'bold',
															color: '#1d4ed8',
															marginRight: 5,
														}}
													>
														{grade}
													</Text>
													<Text
														style={{
															...styles.gradingText,
															color: '#1d4ed8',
															marginBottom: 0,
														}}
													>
														{label}
													</Text>
												</View>
											))}
										</View>
										<View style={{ flex: 1, marginLeft: 4 }}>
											<View
												style={{
													flexDirection: 'row',
													alignItems: 'center',
													borderWidth: 1,
													borderColor: '#93c5fd',
													backgroundColor: '#eff6ff',
													borderRadius: 4,
													paddingVertical: 2,
													paddingHorizontal: 4,
													marginBottom: 2,
												}}
											>
												<Text
													style={{
														fontSize: 10,
														fontWeight: 'bold',
														color: '#1d4ed8',
														marginRight: 5,
													}}
												>
													D
												</Text>
												<Text
													style={{
														...styles.gradingText,
														color: '#1d4ed8',
														marginBottom: 0,
													}}
												>
													70 - 74 Fair
												</Text>
											</View>
											<View
												style={{
													flexDirection: 'row',
													alignItems: 'center',
													borderWidth: 1,
													borderColor: '#fca5a5',
													backgroundColor: '#fef2f2',
													borderRadius: 4,
													paddingVertical: 2,
													paddingHorizontal: 4,
												}}
											>
												<Text
													style={{
														fontSize: 10,
														fontWeight: 'bold',
														color: '#dc2626',
														marginRight: 5,
													}}
												>
													F
												</Text>
												<Text
													style={{
														...styles.gradingText,
														color: '#dc2626',
														marginBottom: 0,
													}}
												>
													Below 70 Fail
												</Text>
											</View>
										</View>
									</View>
								</View>
							</View>
							<View style={styles.rightBottom}>
								<Text
									style={{
										...styles.promotionText,
										color: activeTheme.sectionTitleColor,
										borderBottomWidth: 1,
										borderBottomColor: activeTheme.accentColor,
										paddingBottom: 4,
									}}
								>
									Yearly Average below 70 will not be eligible for promotion.
								</Text>
								<View style={styles.signatureSection}>
									<Text>Teachers Remark: ____________________________</Text>
									<View style={{ marginTop: 25, alignItems: 'center' }}>
										<Text>Signed: _________________________</Text>
									</View>
								</View>
							</View>
						</View>
					</Page>,

					// ── Page 2: Info ──────────────────────────────
					<Page
						key={`${studentData.studentId}-info`}
						size="A4"
						orientation="landscape"
						style={{ ...styles.page, backgroundColor: '#ffffff' }}
					>
						<View style={styles.pageTwoContainer}>
							{/* ── LEFT PANEL ── */}
							<View
								style={{
									flex: 1,
									marginRight: 10,
									borderWidth: 2,
									borderColor: activeTheme.borderColor,
									borderRadius: 6,
									padding: 12,
									paddingTop: 17,
									position: 'relative',
									backgroundColor: '#ffffff',
									overflow: 'hidden',
								}}
							>
								{/* FIX 3: null guard — only render watermark if a logo URL exists */}
								{(school?.logoUrl2 || school?.logoUrl) && (
									<Image
										src={school.logoUrl2 || school.logoUrl}
										style={{
											...watermarkStyle,
											width: '45%',
											top: '35%',
											left: '25%',
										}}
									/>
								)}

								<Text
									style={{
										...styles.parentsSectionTitle,
										color: activeTheme.sectionTitleColor,
										marginBottom: 6,
									}}
								>
									TO OUR PARENTS & GUARDIANS
								</Text>
								<Text
									style={{
										fontSize: 9,
										marginBottom: 12,
										textAlign: 'justify',
										lineHeight: 1.6,
									}}
								>
									This report is provided periodically to help you monitor your
									child's progress. It highlights areas such as study habits and
									attendance that may need improvement. Parent-teacher
									conferences are encouraged to ensure your child's continued
									success.
								</Text>

								<PromotionStatement theme={activeTheme} />

								<View
									style={{
										position: 'absolute',
										bottom: 14,
										left: 12,
										right: 12,
									}}
								>
									<View
										style={{
											flexDirection: 'row',
											justifyContent: 'space-between',
											marginBottom: 10,
										}}
									>
										<Text style={{ fontSize: 9 }}>
											Date: ____________________
										</Text>
										<Text style={{ fontSize: 9 }}>
											Principal: __________________
										</Text>
									</View>
									<View
										style={{
											flexDirection: 'column',
											alignItems: 'flex-start',
											gap: 4,
										}}
									>
										<View
											style={{
												borderWidth: 1,
												borderColor: activeTheme.borderColor,
												borderStyle: 'dashed',
												borderRadius: 4,
												width: 72,
												height: 72,
											}}
										/>
										<Text style={{ fontSize: 10, color: '#555' }}>
											Scan to verify the authenticity of this report.
										</Text>
									</View>
								</View>
							</View>

							{/* ── RIGHT PANEL ── */}
							<View
								style={{
									flex: 1,
									marginLeft: 10,
									borderWidth: 2,
									borderColor: activeTheme.borderColor,
									borderRadius: 6,
									padding: 12,
									paddingTop: 17,
									backgroundColor: '#ffffff',
									overflow: 'hidden',
								}}
							>
								{/* School header */}
								<View style={{ alignItems: 'center', marginBottom: 6 }}>
									{/* School name */}
									<Text
										style={{
											...styles.schoolName,
											color: activeTheme.schoolNameColor,
											textAlign: 'center',
											marginBottom: 2,
											top: 0,
										}}
									>
										{school?.name}
									</Text>
									<View>
										<Text>{schoolAddressFirstLine}</Text>
									</View>

									{/* Logo 1 | Address | Logo 2 */}
									<View
										style={{
											flexDirection: 'row',
											alignItems: 'flex-start',
											width: '105%',
											justifyContent: 'space-between',
										}}
									>
										{/* FIX 3: null guard on left logo */}
										{(school?.logoUrl2 || school?.logoUrl) && (
											<Image
												src={school.logoUrl2 || school.logoUrl}
												style={{
													width: 60,
													height: 60,
													alignSelf: 'flex-end',
												}}
											/>
										)}

										{/* FIX 2: <view> → <View> */}
										<View style={{ flex: 1 }}>
											<Text
												style={{
													...styles.schoolDetails,
													textAlign: 'center',
													top: 0,
												}}
											>
												{schoolAddress}
											</Text>
											<Text style={{ height: 40 }}></Text>
										</View>

										{/* FIX 3: null guard on right logo */}
										{school?.logoUrl && (
											<Image
												src={school.logoUrl}
												style={{ width: 60, height: 60, alignSelf: 'flex-end' }}
											/>
										)}
									</View>
								</View>

								{/* Progress report title */}
								<ThemedProgressReportHeader
									theme={activeTheme}
									classLevel={reportFilters.classLevel ?? ''}
								/>

								{/* Student info box */}
								<View
									style={{
										flexDirection: 'row',
										justifyContent: 'space-between',
										marginBottom: 5,
										marginTop: 15,
										width: '100%',
										paddingVertical: 12,
										backgroundColor: '#ffffff',
										minHeight: 70,
									}}
								>
									<View style={{ flexDirection: 'column', gap: 12 }}>
										<Text style={{ fontSize: 11, color: '#000' }}>Name: </Text>
										<Text style={{ fontSize: 11, color: '#000' }}>Class:</Text>
									</View>
									<View
										style={{
											flexDirection: 'column',
											gap: 12,
											paddingRight: 45,
										}}
									>
										<>
											<Text style={{ fontSize: 11, color: '#000' }}>
												Student ID:{' '}
												<Text style={{ fontWeight: 'bold' }}>
													{studentData.studentId}
												</Text>
											</Text>
											<Text style={{ fontSize: 11, color: '#000' }}>
												Academic Year:{' '}
											</Text>
										</>
									</View>
								</View>

								{/* Parents section */}
								<Text
									style={{
										fontWeight: 'bold',
										fontSize: 14,
										color: activeTheme.sectionTitleColor,
										textAlign: 'center',
										marginBottom: 4,
									}}
								>
									PARENTS OR GUARDIANS
								</Text>
								<Text
									style={{
										fontSize: 9,
										marginBottom: 8,
										textAlign: 'justify',
										fontStyle: 'italic',
									}}
								>
									Please sign below as evidence that you have examined this
									report with possible recommendation or invitation to your
									son(s) or daughter(s) as this instrument could shape your
									child's destiny.
								</Text>

								{/* Signature table */}
								<View
									style={{
										borderWidth: 1,
										borderColor: activeTheme.borderColor,
										marginBottom: 6,
										borderRadius: 4,
										overflow: 'hidden',
									}}
								>
									{/* Header row */}
									<View
										style={{
											flexDirection: 'row',
											backgroundColor: activeTheme.tableHeaderBg,
										}}
									>
										{['Period', 'Class Teacher', 'Parent/Guardian'].map(
											(hdr, i) => (
												<Text
													key={hdr}
													style={{
														flex: i === 0 ? 2 : 3,
														padding: 4,
														borderRight: i < 2 ? 0.5 : 0,
														borderRightColor: activeTheme.borderColor,
														textAlign: 'center',
														fontSize: 8,
														color: activeTheme.tableHeaderText,
														fontWeight: 'bold',
													}}
												>
													{hdr}
												</Text>
											),
										)}
									</View>
									{/* Period rows */}
									{['1st', '2nd', '3rd', '4th', '5th', '6th'].map((row) => (
										<View
											key={row}
											style={{
												flexDirection: 'row',
												minHeight: 14,
												backgroundColor: '#ffffff',
											}}
										>
											<Text
												style={{
													flex: 2,
													padding: 3,
													borderRight: 0.5,
													borderRightColor: activeTheme.borderColor,
													borderTop: 0.5,
													borderTopColor: activeTheme.borderColor,
													textAlign: 'center',
													fontSize: 9,
													color: activeTheme.sectionTitleColor,
													fontWeight: 'bold',
												}}
											>
												{row} Period
											</Text>
											<Text
												style={{
													flex: 3,
													padding: 3,
													borderRight: 0.5,
													borderRightColor: activeTheme.borderColor,
													borderTop: 0.5,
													borderTopColor: activeTheme.borderColor,
												}}
											/>
											<Text
												style={{
													flex: 3,
													padding: 3,
													borderTop: 0.5,
													borderTopColor: activeTheme.borderColor,
												}}
											/>
										</View>
									))}
								</View>

								{/* Note */}
								<View
									style={{
										...styles.noteSection,
										...accentLeft,
										backgroundColor: '#ffffff',
										borderRadius: 4,
										padding: 6,
									}}
								>
									<Text
										style={{
											fontWeight: 'bold',
											marginBottom: 3,
											fontSize: 10,
											color: activeTheme.sectionTitleColor,
										}}
									>
										Note:
									</Text>
									<Text
										style={{
											textAlign: 'justify',
											fontSize: 9,
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
