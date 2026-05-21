import React from 'react';
import {
	Document,
	Page,
	Text,
	View,
	Image,
	StyleSheet,
} from '@react-pdf/renderer';

export interface StudentSemesterReport {
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
	semester: 'first' | 'second';
	selectedStudents: string[];
}

// =================== Styling =======================

const styles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		backgroundColor: '#ffffff',
		margin: 0,
		padding: 25,
		// paddingBottom: 20,
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
	},

	semester: {
		flex: 1,
		borderRight: 1,
		borderRightColor: '#000',
	},

	lastSemester: {
		flex: 1,
		borderLeft: 1,
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
		marginBottom: 10,
		padding: 5,
		borderWidth: 1,
		borderColor: '#000',
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
		fontSize: 14,
		fontWeight: 'bold',
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
		marginTop: 20,
		marginBottom: 10,
		textAlign: 'center',
	},

	noteSection: {
		marginTop: 15,
		fontSize: 8,
	},
});

export function gradeStyle(score: string | number | null, baseStyle: any) {
	if (score === null || Number.isNaN(score) || Number(score) < 70) {
		return {
			...baseStyle,
			color: 'red',
			fontWeight: 'bold',
		};
	}
	return {
		...baseStyle,
		color: 'blue',
		fontWeight: 'bold',
	};
}

export const watermarkStyle = {
	position: 'absolute',
	opacity: 0.08,
};

export const SemesterReport = React.memo(function SemesterReportDocument({
	studentsData,
	classSubjects,
	school,
}: {
	studentsData: StudentSemesterReport[];
	className: string;
	classSubjects: string[];
	reportFilters: ReportFilters;
	school: any;
}) {
	// FIX 1: Removed 'use client' and useMemo — plain expressions are sufficient
	// for static PDF rendering; there is no reactivity to maintain here.
	const chunks: StudentSemesterReport[][] = [];
	for (let i = 0; i < studentsData.length; i += 2) {
		chunks.push(studentsData.slice(i, i + 2));
	}
	const pages = chunks;

	const title = 'Semester Report Template';

	const periodColumns = [
		{ key: 'first', label: '' },
		{ key: 'second', label: '' },
		{ key: 'third', label: '' },
		{ key: 'third_period_exam', label: '' },
	];
	const reportHeading = ' ';

	return (
		<Document title={title}>
			{pages.map((studentGroup, pageIndex) => (
				<Page
					key={`semester-page-${pageIndex}`}
					size="A4"
					style={{ ...styles.page, padding: 20 }}
					wrap={false}
				>
					<View style={{ flexDirection: 'row', gap: 18 }}>
						{studentGroup.map((studentData, cardIndex) => {
							const getGrade = (period: string, subject: string) =>
								studentData.periods[period]?.find((s) => s.subject === subject)
									?.grade ?? null;
							const rankMap = {
								first: studentData.ranks.first,
								second: studentData.ranks.second,
								third: studentData.ranks.third,
								third_period_exam: studentData.ranks.third_period_exam,
								semester: studentData.ranks.firstSemesterAverage,
							};
							return (
								<View
									key={`template-card-${pageIndex}-${cardIndex}`}
									style={{
										flex: 1,
										borderWidth: 1,
										borderColor: '#cbd5e1',
										backgroundColor: '#f8fafc',
										borderRadius: 8,
										padding: 8,
										position: 'relative',
										minHeight: 360,
									}}
								>
									{school?.logoUrl && (
										<Image
											src={school.logoUrl}
											style={
												{
													...watermarkStyle,
													width: '35%',
													top: '20%',
													left: '32%',
												} as any
											}
										/>
									)}

									<View
										style={{
											marginBottom: 6,
											backgroundColor: '#eaf2ff',
											borderRadius: 6,
											paddingVertical: 6,
											paddingHorizontal: 6,
											borderWidth: 1,
											borderColor: '#bfdbfe',
										}}
									>
										<Text
											style={{
												fontSize: 12,
												fontWeight: 'bold',
												textAlign: 'center',
												color: '#0f172a',
												letterSpacing: 0.2,
											}}
										>
											{school?.name}
										</Text>
										<View
											style={{
												flexDirection: 'row',
												alignItems: 'center',
												marginBottom: 4,
												gap: 2,
											}}
										>
											<View>
												{(school?.logoUrl2 || school?.logoUrl) && (
													<Image
														src={school?.logoUrl2 || school?.logoUrl}
														style={{ width: 32 }}
													/>
												)}
											</View>
											<View style={{ flex: 1, alignItems: 'center' }}>
												{school?.address && (
													<Text
														style={{
															fontSize: 8,
															textAlign: 'center',
															marginBottom: 1,
														}}
													>
														{school.address.join('\n')}
													</Text>
												)}
											</View>
											<View>
												{school?.logoUrl && (
													<Image src={school.logoUrl} style={{ width: 32 }} />
												)}
											</View>
										</View>
										<Text
											style={{
												fontWeight: 'bold',
												fontSize: 10,
												textAlign: 'center',
												color: '#1e3a8a',
												marginTop: 2,
												paddingVertical: 3,
												borderWidth: 1,
												borderColor: '#93c5fd',
												borderRadius: 4,
												backgroundColor: '#dbeafe',
												letterSpacing: 0.35,
											}}
										>
											{reportHeading}
										</Text>
									</View>

									<View
										style={{
											flexDirection: 'row',
											justifyContent: 'space-between',
											marginBottom: 6,
											fontSize: 9,
										}}
									>
										<View>
											<Text>
												Name: <Text style={{ fontWeight: 'bold' }}></Text>
											</Text>
											<Text>
												ID: <Text style={{ fontWeight: 'bold' }}></Text>
											</Text>
										</View>
										<View>
											<View
												style={{ flexDirection: 'row', alignItems: 'center' }}
											>
												<Text>Class:</Text>
												<View style={{ width: 40, height: 10 }} />
											</View>
											<View
												style={{ flexDirection: 'row', alignItems: 'center' }}
											>
												<Text>Academic Year:</Text>
												<View style={{ width: 40, height: 10 }} />
											</View>
										</View>
									</View>

									<View style={{ borderWidth: 1, borderColor: '#000' }}>
										<View
											style={{
												flexDirection: 'row',
												backgroundColor: '#f0f0f0',
												borderBottomWidth: 1,
												borderBottomColor: '#000',
											}}
										>
											<Text
												style={{
													flex: 2,
													padding: 2,
													fontSize: 7,
													fontWeight: 'bold',
													borderRightWidth: 0.5,
													borderRightColor: '#000',
													textAlign: 'left',
												}}
											>
												Subject
											</Text>
											{periodColumns.map((col) => (
												<Text
													key={col.key}
													style={{
														flex: 1,
														padding: 2,
														fontSize: 7,
														fontWeight: 'bold',
														borderRightWidth: 0.5,
														borderRightColor: '#000',
														textAlign: 'center',
													}}
												>
													{col.label}
												</Text>
											))}
											<Text
												style={{
													flex: 1,
													padding: 2,
													fontSize: 7,
													fontWeight: 'bold',
													textAlign: 'center',
												}}
											></Text>
										</View>

										{classSubjects.map((subject) => {
											const average = studentData.firstSemesterAverage[subject];
											return (
												<View
													key={subject}
													style={{
														flexDirection: 'row',
														borderBottomWidth: 0.5,
														borderBottomColor: '#000',
														height: 16,
													}}
												>
													<Text
														style={{
															flex: 2,
															padding: 2,
															fontSize: 7,
															borderRightWidth: 0.5,
															borderRightColor: '#000',
														}}
													></Text>
													{periodColumns.map((col) => (
														<Text
															key={`${subject}-${col.key}`}
															style={gradeStyle(getGrade(col.key, subject), {
																flex: 1,
																padding: 2,
																fontSize: 7,
																textAlign: 'center',
																borderRightWidth: 0.5,
																borderRightColor: '#000',
															})}
														>
															{getGrade(col.key, subject) ?? ''}
														</Text>
													))}
													<Text
														style={gradeStyle(average, {
															flex: 1,
															padding: 2,
															fontSize: 7,
															textAlign: 'center',
														})}
													>
														{average?.toFixed(1) ?? ''}
													</Text>
												</View>
											);
										})}
										<View
											style={{
												flexDirection: 'row',
												backgroundColor: '#f0f8ff',
											}}
										>
											<Text
												style={{
													flex: 2,
													padding: 2,
													fontSize: 8,
													fontWeight: 'bold',
													borderRightWidth: 0.5,
													borderRightColor: '#000',
												}}
											>
												Average
											</Text>
											{periodColumns.map((col) => {
												const avg = studentData.periodAverages[col.key];
												return (
													<Text
														key={`avg-${col.key}`}
														style={gradeStyle(avg, {
															flex: 1,
															padding: 2,
															fontSize: 7,
															textAlign: 'center',
															borderRightWidth: 0.5,
															borderRightColor: '#000',
														})}
													>
														{avg?.toFixed(1) ?? ''}
													</Text>
												);
											})}
											<Text
												style={gradeStyle(
													studentData.periodAverages.firstSemesterAverage,
													{
														flex: 1,
														padding: 2,
														fontSize: 7,
														textAlign: 'center',
													},
												)}
											>
												{studentData.periodAverages.firstSemesterAverage?.toFixed(
													1,
												) ?? ''}
											</Text>
										</View>
										<View
											style={{
												flexDirection: 'row',
												backgroundColor: '#f0f8ff',
												borderTopWidth: 0.5,
												borderTopColor: '#000',
											}}
										>
											<Text
												style={{
													flex: 2,
													padding: 2,
													fontSize: 8,
													fontWeight: 'bold',
													borderRightWidth: 0.5,
													borderRightColor: '#000',
												}}
											>
												Rank
											</Text>
											{periodColumns.map((col) => (
												<Text
													key={`rank-${col.key}`}
													style={{
														flex: 1,
														padding: 2,
														fontSize: 7,
														textAlign: 'center',
														borderRightWidth: 0.5,
														borderRightColor: '#000',
													}}
												>
													{(rankMap as any)[col.key] ?? ''}
												</Text>
											))}
											<Text
												style={{
													flex: 1,
													padding: 2,
													fontSize: 7,
													textAlign: 'center',
												}}
											>
												{(rankMap as any).semester ?? ''}
											</Text>
										</View>
									</View>
								</View>
							);
						})}
						{studentGroup.length === 1 && <View style={{ flex: 1 }} />}
					</View>
				</Page>
			))}
		</Document>
	);
});
