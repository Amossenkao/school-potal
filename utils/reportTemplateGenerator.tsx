import React from 'react';
import { Document, Page, Text, View, Image, pdf } from '@react-pdf/renderer';
import semesterStyles from '@/app/templates/semester/styles';
import yearlyStyles from '@/app/templates/yearly/styles';

type ReportTemplateType = 'yearly' | 'semester';

type SemesterKey = 'first' | 'second';

type TemplateSchool = {
	shortName?: string;
	host?: string;
	name?: string;
	logoUrl?: string;
	logoUrl2?: string;
	address?: string[];
};

export type DynamicTemplateRequest = {
	reportType: ReportTemplateType;
	school: TemplateSchool;
	session?: string;
	classLevel?: string;
	classSubjects: string[];
	semester?: SemesterKey;
};

const watermarkStyle = {
	position: 'absolute',
	opacity: 0.08,
};

const buildBlankSubjectMap = (subjects: string[]) =>
	subjects.reduce(
		(acc, subject) => {
			acc[subject] = null;
			return acc;
		},
		{} as Record<string, number | null>,
	);

const buildBlankSemesterData = (subjects: string[]) => {
	const blankMap = buildBlankSubjectMap(subjects);
	const buildRows = () =>
		subjects.map((subject) => ({ subject, grade: null as number | null }));

	return {
		studentId: '',
		studentName: '',
		periods: {
			first: buildRows(),
			second: buildRows(),
			third: buildRows(),
			third_period_exam: buildRows(),
			fourth: buildRows(),
			fifth: buildRows(),
			sixth: buildRows(),
			six_period_exam: buildRows(),
		},
		firstSemesterAverage: { ...blankMap },
		secondSemesterAverage: { ...blankMap },
		periodAverages: {
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
		},
		ranks: {
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
		},
	};
};

function SemesterTemplateDocument({
	school,
	classSubjects,
	semester,
}: {
	school: TemplateSchool;
	classSubjects: string[];
	semester: SemesterKey;
}) {
	const safeSubjects = classSubjects.length ? classSubjects : [''];
	const blankStudent = buildBlankSemesterData(safeSubjects);
	const studentsData = [blankStudent, blankStudent];
	const isFirstSemester = semester === 'first';
	const periodColumns = isFirstSemester
		? [
				{ key: 'first', label: '' },
				{ key: 'second', label: '' },
				{ key: 'third', label: '' },
				{ key: 'third_period_exam', label: '' },
			]
		: [
				{ key: 'fourth', label: '' },
				{ key: 'fifth', label: '' },
				{ key: 'sixth', label: '' },
				{ key: 'six_period_exam', label: '' },
			];

	return (
		<Document title="Semester Report Template">
			<Page
				size="A4"
				style={{ ...semesterStyles.page, padding: 20 }}
				wrap={false}
			>
				<View style={{ flexDirection: 'row', gap: 18 }}>
					{studentsData.map((studentData, cardIndex) => (
						<View
							key={`template-card-${cardIndex}`}
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
									{' '}
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
									<View style={{ flexDirection: 'row', alignItems: 'center' }}>
										<Text>Class:</Text>
										<View style={{ width: 40, height: 10 }} />
									</View>
									<View style={{ flexDirection: 'row', alignItems: 'center' }}>
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

								{safeSubjects.map((subject) => (
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
												style={{
													flex: 1,
													padding: 2,
													fontSize: 7,
													textAlign: 'center',
													borderRightWidth: 0.5,
													borderRightColor: '#000',
												}}
											>
												{''}
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
											{''}
										</Text>
									</View>
								))}
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
									{periodColumns.map((col) => (
										<Text
											key={`avg-${col.key}`}
											style={{
												flex: 1,
												padding: 2,
												fontSize: 7,
												textAlign: 'center',
												borderRightWidth: 0.5,
												borderRightColor: '#000',
											}}
										>
											{''}
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
										{''}
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
											{''}
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
										{''}
									</Text>
								</View>
							</View>
						</View>
					))}
				</View>
			</Page>
		</Document>
	);
}

function ReportQRCodePlaceholder() {
	return (
		<View
			style={{
				width: '99%',
				height: '99%',
				borderWidth: 1,
				borderColor: '#e2e8f0',
				borderStyle: 'dashed',
			}}
		/>
	);
}

function YearlyTemplateDocument({
	school,
	classSubjects,
	classLevel,
}: {
	school: TemplateSchool;
	classSubjects: string[];
	classLevel?: string;
}) {
	const subjects = classSubjects.length ? classSubjects : [''];
	const schoolAddress = Array.isArray(school?.address)
		? school.address.join('\n')
		: '';
	const schoolNameLower = school?.name ? school.name.toLowerCase() : '';

	return (
		<Document title="Yearly Report Template">
			<Page
				size="A4"
				orientation="landscape"
				style={yearlyStyles.page}
				wrap={false}
			>
				<View style={yearlyStyles.topRow}>
					<View style={yearlyStyles.headerLeft}>
						<Text style={{ fontWeight: 'bold' }}>Name:</Text>
						<Text>Class:</Text>
						<Text>ID:</Text>
					</View>
					<View style={yearlyStyles.headerRight}>
						<Text style={{ fontWeight: 'bold' }}>Academic Year:</Text>
					</View>
				</View>
				<View style={yearlyStyles.gradesContainer}>
					<View style={yearlyStyles.semester}>
						{school?.logoUrl && (
							<Image
								src={school.logoUrl}
								style={
									{
										...watermarkStyle,
										width: '40%',
										top: '25%',
										left: '35%',
									} as any
								}
							/>
						)}
						<Text style={yearlyStyles.semesterHeader}>First Semester</Text>
						<View style={yearlyStyles.tableHeader}>
							<Text style={yearlyStyles.subjectCell}>Subject</Text>
							<Text style={yearlyStyles.tableCell}>1st Period</Text>
							<Text style={yearlyStyles.tableCell}>2nd Period</Text>
							<Text style={yearlyStyles.tableCell}>3rd Period</Text>
							<Text style={yearlyStyles.tableCell}>Exam</Text>
							<Text style={yearlyStyles.tableCell}>Average</Text>
						</View>
						{subjects.map((subject) => (
							<View key={subject} style={yearlyStyles.tableRow}>
								<Text style={yearlyStyles.subjectCell}></Text>
								<Text style={yearlyStyles.tableCell}></Text>
								<Text style={yearlyStyles.tableCell}></Text>
								<Text style={yearlyStyles.tableCell}></Text>
								<Text style={yearlyStyles.tableCell}></Text>
								<Text style={yearlyStyles.tableCell}></Text>
							</View>
						))}
						<View
							style={{
								...yearlyStyles.tableRow,
								backgroundColor: '#f0f8ff',
							}}
						>
							<Text style={{ ...yearlyStyles.subjectCell, fontWeight: 'bold' }}>
								Average
							</Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
						</View>
						<View
							style={{
								...yearlyStyles.tableRow,
								backgroundColor: '#f0f8ff',
							}}
						>
							<Text style={{ ...yearlyStyles.subjectCell, fontWeight: 'bold' }}>
								Rank
							</Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
						</View>
					</View>
					<View style={yearlyStyles.lastSemester}>
						{school?.logoUrl && (
							<Image
								src={school.logoUrl}
								style={
									{
										...watermarkStyle,
										width: '40%',
										top: '25%',
										left: '25%',
									} as any
								}
							/>
						)}
						<Text style={yearlyStyles.semesterHeader}>Second Semester</Text>
						<View style={yearlyStyles.tableHeader}>
							<Text style={yearlyStyles.tableCell}>4th Period</Text>
							<Text style={yearlyStyles.tableCell}>5th Period</Text>
							<Text style={yearlyStyles.tableCell}>6th Period</Text>
							<Text style={yearlyStyles.tableCell}>Exam</Text>
							<Text style={yearlyStyles.tableCell}>Average</Text>
							<Text style={yearlyStyles.lastCell}>Yearly Average</Text>
						</View>
						{subjects.map((subject) => (
							<View key={subject} style={yearlyStyles.tableRow}>
								<Text style={yearlyStyles.tableCell}></Text>
								<Text style={yearlyStyles.tableCell}></Text>
								<Text style={yearlyStyles.tableCell}></Text>
								<Text style={yearlyStyles.tableCell}></Text>
								<Text style={yearlyStyles.tableCell}></Text>
								<Text style={yearlyStyles.lastCell}></Text>
							</View>
						))}
						<View
							style={{
								...yearlyStyles.tableRow,
								backgroundColor: '#f0f8ff',
							}}
						>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.lastCell}></Text>
						</View>
						<View
							style={{
								...yearlyStyles.tableRow,
								backgroundColor: '#f0f8ff',
							}}
						>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.tableCell}></Text>
							<Text style={yearlyStyles.lastCell}></Text>
						</View>
					</View>
				</View>
				<View style={yearlyStyles.bottomSection}>
					<View style={yearlyStyles.leftBottom}>
						<View style={yearlyStyles.gradingMethod}>
							<Text style={yearlyStyles.gradingTitle}>METHOD OF GRADING</Text>
							<View style={yearlyStyles.gradingColumns}>
								<View style={yearlyStyles.gradingColumnLeft}>
									<Text
										style={[
											yearlyStyles.gradingText,
											yearlyStyles.gradingScaleA,
										]}
									>
										<Text style={yearlyStyles.gradingLetter}>A </Text>= 90 - 100
										Excellent
									</Text>
									<Text
										style={[
											yearlyStyles.gradingText,
											yearlyStyles.gradingScaleB,
										]}
									>
										<Text style={yearlyStyles.gradingLetter}>B </Text>= 80 - 89
										Very Good
									</Text>
									<Text
										style={[
											yearlyStyles.gradingText,
											yearlyStyles.gradingScaleC,
										]}
									>
										<Text style={yearlyStyles.gradingLetter}>C </Text>= 75 - 79
										Good
									</Text>
								</View>
								<View style={yearlyStyles.gradingColumn}>
									<Text
										style={[
											yearlyStyles.gradingText,
											yearlyStyles.gradingScaleD,
										]}
									>
										<Text style={yearlyStyles.gradingLetter}>D </Text>= 70 - 74
										Fair
									</Text>
									<Text
										style={[
											yearlyStyles.gradingText,
											yearlyStyles.gradingScaleF,
										]}
									>
										<Text style={yearlyStyles.gradingLetter}>F </Text>= Below 70
										Fail
									</Text>
								</View>
							</View>
						</View>
					</View>
					<View style={yearlyStyles.rightBottom}>
						<Text style={yearlyStyles.promotionText}>
							Yearly Average below 70 will not be eligible for promotion.
						</Text>
						<View style={yearlyStyles.signatureSection}>
							<Text>Teachers Remark: ______________________</Text>
							<View style={yearlyStyles.signatureInner}>
								<Text>Signed: ____________________</Text>
								<Text style={yearlyStyles.sponsorLabel}>Class Sponsor</Text>
							</View>
						</View>
					</View>
				</View>
			</Page>

			<Page
				size="A4"
				orientation="landscape"
				style={yearlyStyles.page}
				wrap={false}
			>
				<View style={yearlyStyles.pageTwoContainer}>
					<View
						style={{
							flex: 1,
							marginRight: 10,
							borderWidth: 1,
							borderColor: '#000',
							padding: 10,
							position: 'relative',
						}}
					>
						{(school?.logoUrl2 || school?.logoUrl) && (
							<Image
								src={school?.logoUrl2 || school?.logoUrl}
								style={
									{
										...watermarkStyle,
										width: '45%',
										top: '40%',
										left: '25%',
									} as any
								}
							/>
						)}
						<Text style={yearlyStyles.parentsSectionTitle}>
							TO OUR PARENTS & GUARDIANS
						</Text>
						<Text
							style={{
								fontSize: 10,
								marginTop: 15,
								marginBottom: 12,
								textAlign: 'justify',
								lineHeight: 1.7,
							}}
						>
							This report is provided periodically to help you monitor your
							child's progress. It highlights areas such as study habits and
							attendance that may need improvement. Parent-teacher conferences
							are encouraged to ensure your child's continued success.
						</Text>
						<Text
							style={{
								fontSize: 12,
								fontWeight: 'bold',
								marginBottom: 50,
								textAlign: 'center',
							}}
						>
							Promotion Statement
						</Text>
						<View style={{ height: 28 }} />
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								marginTop: 110,
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
											marginTop: -30,
										}}
									>
										<ReportQRCodePlaceholder />
									</View>

									<Text style={{ width: '100%', textAlign: 'left' }}>
										Scan the QR Code to verify the authenticity of this report.
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
						<View style={yearlyStyles.schoolHeader}>
							<Text style={yearlyStyles.schoolName}>{school?.name}</Text>
							<View>
								<View
									style={{
										alignSelf: 'center',
										marginBottom: 10,
										justifyContent: 'center',
										alignItems: 'center',
										left: -145,
										bottom: schoolNameLower.includes('kolleh') ? -10 : -18,
									}}
								>
									<Image
										src={school?.logoUrl2 || school?.logoUrl}
										style={{ width: 60 }}
									/>
								</View>
								<Text style={yearlyStyles.schoolDetails}>{schoolAddress}</Text>
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
							<Text style={yearlyStyles.reportTitle}>
								{classLevel ? classLevel.toUpperCase() : ''} PROGRESS REPORT
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
								<Text style={{ fontSize: 13 }}>
									Name: <Text style={{ fontWeight: 'bold' }}></Text>
								</Text>
								<Text style={{ marginTop: 4, fontSize: 13 }}>
									Class: <Text style={{ fontWeight: 'bold' }}></Text>
								</Text>
							</View>
							<View
								style={{
									flexDirection: 'column',
									alignItems: 'flex-start',
									paddingRight: 55,
								}}
							>
								<Text style={{ fontSize: 13 }}>
									ID: <Text style={{ fontWeight: 'bold' }}></Text>
								</Text>
								<Text style={{ marginTop: 4, fontSize: 13 }}>
									Academic Year: <Text style={{ fontWeight: 'bold' }}></Text>
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
							Please sign below as evidence that you have examined this report
							with possible recommendation or invitation to your son(s) or
							daughter(s) as this instrument could shape your child's destiny.
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
							{['1st ', '2nd ', '3rd ', '4th ', '5th ', '6th '].map((row) => (
								<View key={row} style={{ flexDirection: 'row', minHeight: 15 }}>
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
							))}
						</View>
						<View style={yearlyStyles.noteSection}>
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
								When a student mark is 69 or below in any subject the parent or
								guardian should give special attention to see that the student
								does well in all the work required by the teacher, otherwise the
								student will probably{' '}
								<Text style={{ fontWeight: 'bold' }}>REPEAT THE CLASS.</Text>
							</Text>
						</View>
					</View>
				</View>
			</Page>
		</Document>
	);
}

export const generateDynamicTemplateBytes = async (
	request: DynamicTemplateRequest,
) => {
	const semester = request.semester === 'second' ? 'second' : 'first';
	const document =
		request.reportType === 'semester' ? (
			<SemesterTemplateDocument
				school={request.school}
				classSubjects={request.classSubjects}
				semester={semester}
			/>
		) : (
			<YearlyTemplateDocument
				school={request.school}
				classSubjects={request.classSubjects}
				classLevel={request.classLevel}
			/>
		);

	const blob = await pdf(document).toBlob();
	return blob.arrayBuffer();
};
