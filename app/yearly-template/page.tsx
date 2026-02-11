'use client';
import React, {
	useMemo,
	useEffect,
	useRef,
	useState,
	useCallback,
} from 'react';
import { Document, Page, Text, View, Image, pdf } from '@react-pdf/renderer';
import styles from './styles';
import schools from './schools.json';

interface StudentYearlyReport {
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

interface ReportFilters {
	academicYear: string;
	session: string;
	classLevel: string;
	className: string;
	selectedStudents: string[];
	sponsorName: string;
}

interface TemplateFilters {
	host: string;
	session: string;
	classLevel: string;
	className: string;
}

const BLANK_REPORT_FILTERS: ReportFilters = {
	academicYear: '',
	session: '',
	classLevel: '',
	className: '',
	selectedStudents: [],
	sponsorName: '',
};

const buildSubjectIds = (count: number) =>
	Array.from({ length: count }, (_, index) => `SUBJECT_${index + 1}`);

const buildBlankReport = (subjects: string[]): StudentYearlyReport => {
	const buildPeriod = () =>
		subjects.map((subject) => ({ subject, grade: null }));

	const blankSubjectMap = subjects.reduce(
		(acc, subject) => {
			acc[subject] = null;
			return acc;
		},
		{} as Record<string, number | null>,
	);

	return {
		studentId: '',
		studentName: '',
		periods: {
			first: buildPeriod(),
			second: buildPeriod(),
			third: buildPeriod(),
			third_period_exam: buildPeriod(),
			fourth: buildPeriod(),
			fifth: buildPeriod(),
			sixth: buildPeriod(),
			six_period_exam: buildPeriod(),
		},
		firstSemesterAverage: { ...blankSubjectMap },
		secondSemesterAverage: { ...blankSubjectMap },
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
		yearlyAverage: null,
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
		qrCodeDataUrl: '',
	};
};

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

function ReportQRCode() {
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

const watermarkStyle = {
	position: 'absolute',
	opacity: 0.1,
};

const FilterContent = React.memo(function FilterContent({
	schoolsList,
	filters,
	setFilters,
	onSubmit,
}: {
	schoolsList: any[];
	filters: TemplateFilters;
	setFilters: React.Dispatch<React.SetStateAction<TemplateFilters>>;
	onSubmit: () => void;
}) {
	const availableHosts = useMemo(
		() => schoolsList.map((entry) => entry.host),
		[schoolsList],
	);
	const selectedSchool = useMemo(
		() => schoolsList.find((entry) => entry.host === filters.host),
		[schoolsList, filters.host],
	);
	const availableSessions = useMemo(
		() =>
			selectedSchool?.classLevels
				? Object.keys(selectedSchool.classLevels)
				: [],
		[selectedSchool],
	);
	const hasMultipleSessions = availableSessions.length > 1;

	useEffect(() => {
		if (!filters.host && availableHosts.length === 1) {
			setFilters((prev) => ({
				...prev,
				host: availableHosts[0],
			}));
		}
	}, [availableHosts, filters.host, setFilters]);

	useEffect(() => {
		if (!filters.session && availableSessions.length === 1) {
			setFilters((prev) => ({
				...prev,
				session: availableSessions[0],
			}));
		}
	}, [availableSessions, filters.session, setFilters]);

	const resolvedSession =
		filters.session ||
		(availableSessions.length === 1 ? availableSessions[0] : '');

	const availableGradeLevels = useMemo(() => {
		if (!resolvedSession) return [];
		const levels = selectedSchool?.classLevels?.[resolvedSession];
		return levels ? Object.keys(levels) : [];
	}, [selectedSchool, resolvedSession]);

	useEffect(() => {
		if (!filters.classLevel && availableGradeLevels.length === 1) {
			setFilters((prev) => ({
				...prev,
				classLevel: availableGradeLevels[0],
			}));
		}
	}, [availableGradeLevels, filters.classLevel, setFilters]);

	const availableClasses = useMemo(() => {
		if (!resolvedSession || !filters.classLevel) return [];
		const classes =
			selectedSchool?.classLevels?.[resolvedSession]?.[filters.classLevel]
				?.classes;
		return Array.isArray(classes) ? classes : [];
	}, [selectedSchool, resolvedSession, filters.classLevel]);

	useEffect(() => {
		if (!filters.className && availableClasses.length === 1) {
			setFilters((prev) => ({
				...prev,
				className: availableClasses[0].classId,
			}));
		}
	}, [availableClasses, filters.className, setFilters]);

	const canSubmit = !!(
		filters.host &&
		resolvedSession &&
		filters.classLevel &&
		filters.className
	);

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] py-10">
			<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
				<h2 className="text-lg font-semibold mb-4 text-center">
					Template Filters
				</h2>

				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">School Host</label>
					<select
						value={filters.host}
						onChange={(e) =>
							setFilters((prev) => ({
								...prev,
								host: e.target.value,
								session: '',
								classLevel: '',
								className: '',
							}))
						}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
					>
						<option value="">Select Host</option>
						{availableHosts.map((hostOption) => (
							<option key={hostOption} value={hostOption}>
								{hostOption}
							</option>
						))}
					</select>
				</div>

				{hasMultipleSessions && (
					<div className="mb-4">
						<label className="block text-sm font-medium mb-1">Session</label>
						<select
							value={filters.session}
							onChange={(e) =>
								setFilters((prev) => ({
									...prev,
									session: e.target.value,
									classLevel: '',
									className: '',
								}))
							}
							className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
							disabled={!filters.host}
						>
							<option value="">Select Session</option>
							{availableSessions.map((session) => (
								<option key={session} value={session}>
									{session}
								</option>
							))}
						</select>
					</div>
				)}

				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">Class Level</label>
					<select
						value={filters.classLevel}
						onChange={(e) =>
							setFilters((prev) => ({
								...prev,
								classLevel: e.target.value,
								className: '',
							}))
						}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
						disabled={!resolvedSession}
					>
						<option value="">Select Class Level</option>
						{availableGradeLevels.map((level) => (
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
							setFilters((prev) => ({
								...prev,
								className: e.target.value,
							}))
						}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
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

				<div className="flex gap-2 mt-6">
					<button
						type="button"
						onClick={onSubmit}
						className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
						disabled={!canSubmit}
					>
						Generate Template
					</button>
				</div>
			</div>
		</div>
	);
});

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
	reportFilters: ReportFilters;
	school: any;
	classSponsor: string | undefined;
}) {
	const sponsorToDisplay = useMemo(() => {
		if (reportFilters.sponsorName.trim()) {
			return reportFilters.sponsorName.trim();
		}
		if (classSponsor) {
			return classSponsor;
		}
		return null;
	}, [reportFilters.sponsorName, classSponsor]);

	const classLabel = className ? className.split('-')[0] : '';
	const schoolNameLower = school?.name ? school.name.toLowerCase() : '';
	const schoolAddress = Array.isArray(school?.address)
		? school.address.join('\n')
		: '';

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
											{studentData.firstSemesterAverage[subject]?.toFixed(0) ??
												''}
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
											{studentData.secondSemesterAverage[subject]?.toFixed(0) ??
												''}
										</Text>
										<Text style={gradeStyle(getOverallSubjectAverage(subject))}>
											{getOverallSubjectAverage(subject) ?? ''}
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
								<View
									style={{
										...styles.tableRow,
										backgroundColor: '#f0f8ff',
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
								<View style={styles.signatureSection}>
									<Text>Teachers Remark: ____________________________</Text>
									<View style={{ marginTop: 15, alignItems: 'center' }}>
										<Text>Signed: _________________________</Text>
										<Text style={{ marginTop: 3, paddingLeft: 60 }}>
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
									position: 'relative',
								}}
							>
								{(school?.logoUrl2 || school?.logoUrl) && (
									<Image
										src={school?.logoUrl2 || school?.logoUrl}
										style={{
											...watermarkStyle,
											width: '45%',
											top: '40%',
											left: '25%',
										}}
									/>
								)}
								<Text style={styles.parentsSectionTitle}>
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
									child’s progress. It highlights areas such as study habits and
									attendance that may need improvement. Parent-teacher
									conferences are encouraged to ensure your child’s continued
									success.
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
												<ReportQRCode />
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
												bottom: schoolNameLower.includes('kolleh') ? -10 : -18,
											}}
										>
											<Image
												src={school?.logoUrl2 || school?.logoUrl}
												style={{ width: 60 }}
											/>
										</View>
										<Text style={styles.schoolDetails}>{schoolAddress}</Text>
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
										{reportFilters.classLevel
											? reportFilters.classLevel.toUpperCase()
											: ''}{' '}
										PROGRESS REPORT
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
											<Text style={{ fontWeight: 'bold' }}>{classLabel}</Text>
										</Text>
									</View>
									<View
										style={{
											flexDirection: 'column',
											alignItems: 'flex-start',
											paddingRight: 55,
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
										),
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

export default function ReportCardPage() {
	const schoolsList = useMemo(() => schools as any[], []);
	const [filters, setFilters] = useState<TemplateFilters>({
		host: '',
		session: '',
		classLevel: '',
		className: '',
	});
	const [reportStep, setReportStep] = useState(0);
	const school = useMemo(
		() => schoolsList.find((entry) => entry.host === filters.host),
		[schoolsList, filters.host],
	);

	const resolvedSession = useMemo(() => {
		if (filters.session) return filters.session;
		const sessions = school?.classLevels ? Object.keys(school.classLevels) : [];
		return sessions.length === 1 ? sessions[0] : '';
	}, [filters.session, school]);

	const subjectCount = useMemo(() => {
		if (!school) return 0;
		const subjects =
			school?.classLevels?.[resolvedSession]?.[filters.classLevel]?.subjects;
		return Array.isArray(subjects) ? subjects.length : 0;
	}, [school, resolvedSession, filters.classLevel]);
	const subjectIds = useMemo(
		() => buildSubjectIds(subjectCount),
		[subjectCount],
	);
	const studentsData = useMemo(
		() => [buildBlankReport(subjectIds)],
		[subjectIds],
	);

	const pdfDocument = useMemo(() => {
		if (!school || reportStep === 0) return null;
		const reportFilters: ReportFilters = {
			...BLANK_REPORT_FILTERS,
			session: filters.session,
			classLevel: filters.classLevel,
		};
		return (
			<PDFDocument
				studentsData={studentsData}
				className=""
				classSubjects={subjectIds}
				reportFilters={reportFilters}
				school={school}
				classSponsor={undefined}
			/>
		);
	}, [
		school,
		reportStep,
		studentsData,
		subjectIds,
		filters.session,
		filters.classLevel,
	]);

	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const [pdfGenerating, setPdfGenerating] = useState(false);
	const pdfUrlRef = useRef<string | null>(null);

	useEffect(() => {
		if (!pdfDocument) {
			if (pdfUrlRef.current) {
				URL.revokeObjectURL(pdfUrlRef.current);
				pdfUrlRef.current = null;
			}
			setPdfUrl(null);
			setDownloadUrl(null);
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
				if (isIOS) {
					const reader = new FileReader();
					reader.onloadend = () => {
						if (cancelled) return;
						setPdfUrl(
							typeof reader.result === 'string' ? reader.result : objectUrl,
						);
					};
					reader.readAsDataURL(blob);
				} else {
					setPdfUrl(objectUrl);
				}
			})
			.catch((error) => {
				console.error('Failed to generate PDF blob', error);
				if (!cancelled) setPdfUrl(null);
			})
			.finally(() => {
				if (!cancelled) setPdfGenerating(false);
			});

		return () => {
			cancelled = true;
			if (pdfUrlRef.current) {
				URL.revokeObjectURL(pdfUrlRef.current);
				pdfUrlRef.current = null;
			}
		};
	}, [pdfDocument]);

	const handleDownload = useCallback(() => {
		if (!downloadUrl) return;
		const a = document.createElement('a');
		a.href = downloadUrl;
		a.download = 'Report_Card_Template.pdf';
		document.body.appendChild(a);
		a.click();
		a.remove();
	}, [downloadUrl]);

	const handleSubmitFilters = useCallback(() => {
		setReportStep(1);
	}, []);

	const handleBackToFilters = useCallback(() => {
		setReportStep(0);
	}, []);

	if (filters.host && !school) {
		return (
			<div className="p-6 text-sm text-muted-foreground">
				No school found for host: {filters.host}
			</div>
		);
	}

	return (
		<div className="p-4">
			{reportStep === 0 ? (
				<FilterContent
					schoolsList={schoolsList}
					filters={filters}
					setFilters={setFilters}
					onSubmit={handleSubmitFilters}
				/>
			) : (
				<div className="w-full h-screen bg-background flex flex-col">
					<div className="flex justify-between items-center px-8 py-4 gap-2 flex-wrap">
						<button
							type="button"
							onClick={handleBackToFilters}
							className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm"
						>
							← Back to Filters
						</button>
						<button
							type="button"
							onClick={handleDownload}
							className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm"
							disabled={!downloadUrl || pdfGenerating}
						>
							{pdfGenerating ? 'Generating PDF...' : 'Download Template'}
						</button>
					</div>
					<div className="flex-1">
						{pdfUrl ? (
							<iframe
								title="Report Card Template"
								className="w-full h-full"
								style={{ border: 'none' }}
								src={pdfUrl}
							/>
						) : (
							<div className="flex items-center justify-center h-full text-sm text-muted-foreground">
								Generating PDF...
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
