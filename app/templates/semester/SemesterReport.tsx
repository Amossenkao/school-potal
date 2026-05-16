'use client';
import React, { useMemo } from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import styles from './styles';

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
	const pages = useMemo(() => {
		const chunks: StudentSemesterReport[][] = [];
		for (let i = 0; i < studentsData.length; i += 2) {
			chunks.push(studentsData.slice(i, i + 2));
		}
		return chunks;
	}, [studentsData]);

	const title = useMemo(() => 'Semester Report Template', []);

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
