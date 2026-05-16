import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import styles from './styles';

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

export interface ReportTheme {
	id: string;
	name: string;
	emoji: string;
	// Web UI preview
	previewFrom: string;
	previewTo: string;
	previewText: string;
	// PDF palette
	headerBarBg: string;
	headerBarText: string;
	semesterHeaderBg: string;
	semesterHeaderText: string;
	tableHeaderBg: string;
	tableHeaderText: string;
	rowAltBg: string;
	borderColor: string;
	sectionTitleColor: string;
	schoolNameColor: string;
	accentColor: string;
}

// ─────────────────────────────────────────────
// Theme Definitions
// ─────────────────────────────────────────────

export const THEMES: ReportTheme[] = [
	{
		id: 'royalGold',
		name: 'Royal Gold',
		emoji: '👑',
		previewFrom: '#1a1a4e',
		previewTo: '#C5A028',
		previewText: '#FFD700',
		headerBarBg: '#1a1a4e',
		headerBarText: '#FFD700',
		semesterHeaderBg: '#2a2a6e',
		semesterHeaderText: '#FFD700',
		tableHeaderBg: '#1a1a4e',
		tableHeaderText: '#FFD700',
		rowAltBg: '#eeeef8',
		borderColor: '#1a1a4e',
		sectionTitleColor: '#1a1a4e',
		schoolNameColor: '#1a1a4e',
		accentColor: '#C5A028',
	},
	{
		id: 'emeraldPrestige',
		name: 'Emerald Prestige',
		emoji: '💎',
		previewFrom: '#0d4a2d',
		previewTo: '#8fbc8f',
		previewText: '#C5A028',
		headerBarBg: '#0d4a2d',
		headerBarText: '#C5A028',
		semesterHeaderBg: '#1a6e42',
		semesterHeaderText: '#ffffff',
		tableHeaderBg: '#0d4a2d',
		tableHeaderText: '#ffffff',
		rowAltBg: '#e8f5ec',
		borderColor: '#0d4a2d',
		sectionTitleColor: '#0d4a2d',
		schoolNameColor: '#0d4a2d',
		accentColor: '#C5A028',
	},
	{
		id: 'crimsonAcademy',
		name: 'Crimson Academy',
		emoji: '🎓',
		previewFrom: '#7b0d1e',
		previewTo: '#c84b4b',
		previewText: '#f5e6c8',
		headerBarBg: '#7b0d1e',
		headerBarText: '#f5e6c8',
		semesterHeaderBg: '#a01428',
		semesterHeaderText: '#ffffff',
		tableHeaderBg: '#7b0d1e',
		tableHeaderText: '#ffffff',
		rowAltBg: '#fdf0e8',
		borderColor: '#7b0d1e',
		sectionTitleColor: '#7b0d1e',
		schoolNameColor: '#7b0d1e',
		accentColor: '#c84b4b',
	},
	{
		id: 'midnightSapphire',
		name: 'Midnight Sapphire',
		emoji: '🌌',
		previewFrom: '#0f1c4d',
		previewTo: '#3a5fcd',
		previewText: '#c0d8ff',
		headerBarBg: '#0f1c4d',
		headerBarText: '#c0d8ff',
		semesterHeaderBg: '#1e3a8a',
		semesterHeaderText: '#ffffff',
		tableHeaderBg: '#0f1c4d',
		tableHeaderText: '#c0d8ff',
		rowAltBg: '#e8ecf8',
		borderColor: '#0f1c4d',
		sectionTitleColor: '#1e3a8a',
		schoolNameColor: '#0f1c4d',
		accentColor: '#3a5fcd',
	},
	{
		id: 'roseChampagne',
		name: 'Rose Champagne',
		emoji: '🌸',
		previewFrom: '#8b3a52',
		previewTo: '#e8a0b0',
		previewText: '#f7e7ce',
		headerBarBg: '#8b3a52',
		headerBarText: '#f7e7ce',
		semesterHeaderBg: '#b05070',
		semesterHeaderText: '#ffffff',
		tableHeaderBg: '#8b3a52',
		tableHeaderText: '#f7e7ce',
		rowAltBg: '#fdf0f5',
		borderColor: '#8b3a52',
		sectionTitleColor: '#8b3a52',
		schoolNameColor: '#8b3a52',
		accentColor: '#e8a0b0',
	},
	{
		id: 'forestSage',
		name: 'Forest Sage',
		emoji: '🌿',
		previewFrom: '#2d4a3e',
		previewTo: '#7aaa8a',
		previewText: '#e8f5e0',
		headerBarBg: '#2d4a3e',
		headerBarText: '#e8f5e0',
		semesterHeaderBg: '#3d6b54',
		semesterHeaderText: '#ffffff',
		tableHeaderBg: '#2d4a3e',
		tableHeaderText: '#e8f5e0',
		rowAltBg: '#eef6f0',
		borderColor: '#2d4a3e',
		sectionTitleColor: '#2d4a3e',
		schoolNameColor: '#2d4a3e',
		accentColor: '#7aaa8a',
	},
	{
		id: 'amberHarvest',
		name: 'Amber Harvest',
		emoji: '🍂',
		previewFrom: '#7a3b00',
		previewTo: '#e8a040',
		previewText: '#fff8e8',
		headerBarBg: '#7a3b00',
		headerBarText: '#fff8e8',
		semesterHeaderBg: '#a05010',
		semesterHeaderText: '#ffffff',
		tableHeaderBg: '#7a3b00',
		tableHeaderText: '#fff8e8',
		rowAltBg: '#fff8e8',
		borderColor: '#7a3b00',
		sectionTitleColor: '#7a3b00',
		schoolNameColor: '#7a3b00',
		accentColor: '#e8a040',
	},
	{
		id: 'slateSteel',
		name: 'Slate Steel',
		emoji: '🔩',
		previewFrom: '#2b3a4a',
		previewTo: '#6b8fa8',
		previewText: '#ddeeff',
		headerBarBg: '#2b3a4a',
		headerBarText: '#ddeeff',
		semesterHeaderBg: '#3d5568',
		semesterHeaderText: '#ffffff',
		tableHeaderBg: '#2b3a4a',
		tableHeaderText: '#ddeeff',
		rowAltBg: '#edf2f7',
		borderColor: '#2b3a4a',
		sectionTitleColor: '#2b3a4a',
		schoolNameColor: '#2b3a4a',
		accentColor: '#6b8fa8',
	},
	{
		id: 'violetDusk',
		name: 'Violet Dusk',
		emoji: '🌆',
		previewFrom: '#3b1f6e',
		previewTo: '#9b6bd4',
		previewText: '#f0e6ff',
		headerBarBg: '#3b1f6e',
		headerBarText: '#f0e6ff',
		semesterHeaderBg: '#5a3498',
		semesterHeaderText: '#ffffff',
		tableHeaderBg: '#3b1f6e',
		tableHeaderText: '#f0e6ff',
		rowAltBg: '#f3eeff',
		borderColor: '#3b1f6e',
		sectionTitleColor: '#3b1f6e',
		schoolNameColor: '#3b1f6e',
		accentColor: '#9b6bd4',
	},
	{
		id: 'copperTeal',
		name: 'Copper Teal',
		emoji: '🦚',
		previewFrom: '#0f4c4c',
		previewTo: '#c87941',
		previewText: '#e8f8f8',
		headerBarBg: '#0f4c4c',
		headerBarText: '#e8f8f8',
		semesterHeaderBg: '#1a6e6e',
		semesterHeaderText: '#ffffff',
		tableHeaderBg: '#0f4c4c',
		tableHeaderText: '#e8f8f8',
		rowAltBg: '#e8f6f6',
		borderColor: '#0f4c4c',
		sectionTitleColor: '#0f4c4c',
		schoolNameColor: '#0f4c4c',
		accentColor: '#c87941',
	},
];

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

	return (
		<View style={{ marginBottom: 10, alignItems: 'center', marginTop: 30 }}>
			<View style={{ width: '90%' }}>
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
							fontSize: 13,
							fontWeight: 'bold',
							color: theme.headerBarText,
							letterSpacing: 2,
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
		passedActiveTheme || THEMES.find((t) => t.id === themeId) || THEMES[0];

	const classLabel = className ? className.split('-')[0] : '';
	const schoolAddress = Array.isArray(school?.address)
		? school.address.join('\n')
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
											marginBottom: 4,
											top: 0,
										}}
									>
										{school?.name}
									</Text>

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
												style={{ width: 60, height: 60 }}
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
										</View>

										{/* FIX 3: null guard on right logo */}
										{school?.logoUrl && (
											<Image
												src={school.logoUrl}
												style={{ width: 60, height: 60 }}
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
										paddingHorizontal: 10,
										paddingVertical: 12,
										backgroundColor: '#ffffff',
										minHeight: 70,
									}}
								>
									<View style={{ flexDirection: 'column', gap: 12 }}>
										<Text style={{ fontSize: 11, color: '#000' }}>Name: </Text>
										<Text
											style={{
												fontSize: 11,
												color: '#000',
												marginTop: 5,
											}}
										>
											Class:
										</Text>
									</View>
									<View
										style={{
											flexDirection: 'column',
											gap: 12,
											paddingRight: 55,
										}}
									>
										<>
											<Text
												style={{ fontSize: 11, color: '#000', marginTop: 5 }}
											>
												ID:{' '}
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
