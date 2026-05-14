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
import schools from '../yearly-template/schools.json';

interface StudentSemesterReport {
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
	semester: 'first' | 'second';
	selectedStudents: string[];
}

interface TemplateFilters {
	host: string;
	session: string;
	classLevel: string;
	semester: 'first' | 'second' | '';
}

const semesterOptions = [
	{ value: 'first', label: '1st Semester' },
	{ value: 'second', label: '2nd Semester' },
];

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');

const BLANK_REPORT_FILTERS: ReportFilters = {
	academicYear: '',
	session: '',
	classLevel: '',
	className: '',
	semester: 'first',
	selectedStudents: [],
};

const buildBlankReport = (subjects: string[]): StudentSemesterReport => {
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

function gradeStyle(score: string | number | null, baseStyle: any) {
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

const watermarkStyle = {
	position: 'absolute',
	opacity: 0.08,
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

	useEffect(() => {
		if (!filters.host && availableHosts.length === 1) {
			setFilters((prev) => ({ ...prev, host: availableHosts[0] }));
		}
	}, [availableHosts, filters.host, setFilters]);

	useEffect(() => {
		if (!filters.session && availableSessions.length === 1) {
			setFilters((prev) => ({ ...prev, session: availableSessions[0] }));
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
			setFilters((prev) => ({ ...prev, classLevel: availableGradeLevels[0] }));
		}
	}, [availableGradeLevels, filters.classLevel, setFilters]);

	const canSubmit = !!(
		filters.host &&
		resolvedSession &&
		filters.classLevel &&
		filters.semester
	);

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] py-10">
			<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
				<h2 className="text-lg font-semibold mb-4 text-center">
					Template Filters
				</h2>

				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">Domain</label>
					<select
						value={filters.host}
						onChange={(e) =>
							setFilters((prev) => ({
								...prev,
								host: e.target.value,
								session: '',
								classLevel: '',
							}))
						}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
					>
						<option value="">Select Domain</option>
						{availableHosts.map((hostOption) => (
							<option key={hostOption} value={hostOption}>
								{hostOption}
							</option>
						))}
					</select>
				</div>

				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">Session</label>
					<select
						value={filters.session}
						onChange={(e) =>
							setFilters((prev) => ({
								...prev,
								session: e.target.value,
								classLevel: '',
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

				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">Class Level</label>
					<select
						value={filters.classLevel}
						onChange={(e) =>
							setFilters((prev) => ({ ...prev, classLevel: e.target.value }))
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
					<label className="block text-sm font-medium mb-1">Semester</label>
					<select
						value={filters.semester}
						onChange={(e) =>
							setFilters((prev) => ({
								...prev,
								semester: e.target.value as TemplateFilters['semester'],
							}))
						}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
					>
						<option value="">Select Semester</option>
						{semesterOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
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

const SemesterReportDocument = React.memo(function SemesterReportDocument({
	studentsData,
	className,
	classSubjects,
	reportFilters,
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

	const isFirstSemester = reportFilters.semester === 'first';
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
							const rankMap = isFirstSemester
								? {
										first: studentData.ranks.first,
										second: studentData.ranks.second,
										third: studentData.ranks.third,
										third_period_exam: studentData.ranks.third_period_exam,
										semester: studentData.ranks.firstSemesterAverage,
									}
								: {
										fourth: studentData.ranks.fourth,
										fifth: studentData.ranks.fifth,
										sixth: studentData.ranks.sixth,
										six_period_exam: studentData.ranks.six_period_exam,
										semester: studentData.ranks.secondSemesterAverage,
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
											const average = isFirstSemester
												? studentData.firstSemesterAverage[subject]
												: studentData.secondSemesterAverage[subject];
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
													isFirstSemester
														? studentData.periodAverages.firstSemesterAverage
														: studentData.periodAverages.secondSemesterAverage,
													{
														flex: 1,
														padding: 2,
														fontSize: 7,
														textAlign: 'center',
													},
												)}
											>
												{isFirstSemester
													? (studentData.periodAverages.firstSemesterAverage?.toFixed(
															1,
														) ?? '')
													: (studentData.periodAverages.secondSemesterAverage?.toFixed(
															1,
														) ?? '')}
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

export default function SemesterTemplatePage() {
	const schoolsList = useMemo(() => schools as any[], []);
	const [filters, setFilters] = useState<TemplateFilters>({
		host: '',
		session: '',
		classLevel: '',
		semester: '',
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

	const classSubjects = useMemo(() => {
		if (!school || !resolvedSession || !filters.classLevel) return [];
		const subjects =
			school?.classLevels?.[resolvedSession]?.[filters.classLevel]?.subjects ||
			[];
		return subjects.map((subject: any) =>
			typeof subject === 'string' ? subject : subject.name,
		);
	}, [school, resolvedSession, filters.classLevel]);

	const studentsData = useMemo(
		() => [buildBlankReport(classSubjects), buildBlankReport(classSubjects)],
		[classSubjects],
	);

	const reportFilters = useMemo<ReportFilters>(
		() => ({
			...BLANK_REPORT_FILTERS,
			session: resolvedSession,
			classLevel: filters.classLevel,
			semester: (filters.semester || 'first') as ReportFilters['semester'],
		}),
		[resolvedSession, filters.classLevel, filters.semester],
	);

	const pdfDocument = useMemo(() => {
		if (!school || reportStep === 0) return null;
		return (
			<SemesterReportDocument
				studentsData={studentsData}
				className=""
				classSubjects={classSubjects}
				reportFilters={reportFilters}
				school={school}
			/>
		);
	}, [school, reportStep, studentsData, classSubjects, reportFilters]);

	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const [pdfGenerating, setPdfGenerating] = useState(false);
	const pdfUrlRef = useRef<string | null>(null);
	const downloadFileName = useMemo(() => {
		const schoolSlug = slugify(
			school?.shortName || school?.host || filters.host || 'school',
		);
		const sessionSlug = slugify(resolvedSession || filters.session || 'session');
		const classLevelSlug = slugify(filters.classLevel || 'class_level');
		return `${schoolSlug}_${sessionSlug}_${classLevelSlug}_semester_report.pdf`;
	}, [
		school?.shortName,
		school?.host,
		filters.host,
		resolvedSession,
		filters.session,
		filters.classLevel,
	]);

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
		a.download = downloadFileName;
		document.body.appendChild(a);
		a.click();
		a.remove();
	}, [downloadUrl, downloadFileName]);

	const handleSubmitFilters = useCallback(() => {
		setReportStep(1);
	}, []);

	const handleBackToFilters = useCallback(() => {
		setReportStep(0);
	}, []);

	if (filters.host && !school) {
		return (
			<div className="p-6 text-sm text-muted-foreground">
				No school found for domain: {filters.host}
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
							← Back to Filter
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
								title="Semester Report Template"
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
