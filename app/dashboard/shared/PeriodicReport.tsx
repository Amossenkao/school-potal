'use client';
import React, {
	useState,
	useEffect,
	useRef,
	useMemo,
	useCallback,
} from 'react';
import { Document, Page, Text, View, Image, pdf } from '@react-pdf/renderer';
import {
	Facebook,
	Mail,
	MessageCircle,
	MessagesSquare,
	Send,
	Twitter,
} from 'lucide-react';
import styles from './styles';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import { getStudentAllowedAccess } from '@/utils/schoolSettingsAccess';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';

import { areGradeRowsEquivalent } from '@/utils/gradeRows';
import {
	SharedFilter,
	PeriodicReportFilters,
	FilterConfig,
} from './components/SharedFilter';
import AccessDenied from '@/components/AccessDenied';

const InlineLoading = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => (
	<div className="-m-8">
		<PageLoading fullScreen={false} variant="minimal" size={size} />
	</div>
);

interface StudentInfo {
	firstName: string;
	middleName: string;
	lastName: string;
	class: string;
	id: string;
	academicYear: string;
	grade: string;
	period: string;
}

// Represents an active student from the /api/users endpoint
interface Student {
	id: string;
	name: string;
	className: string;
}

// Represents grade data from the /api/grades endpoint
interface PeriodicStudentData {
	studentId: string;
	studentName: string;
	subjects: Array<{
		subject: string;
		grade: number;
	}>;
	periodicAverage: number;
	rank: number;
}

const periodOptions = [
	{ id: 'first', label: '1st Period', value: 'first' },
	{ id: 'second', label: '2nd Period', value: 'second' },
	{ id: 'third', label: '3rd Period', value: 'third' },
	{
		id: 'third_period_exam',
		label: '3rd Period Exam',
		value: 'third_period_exam',
	},
	{ id: 'fourth', label: '4th Period', value: 'fourth' },
	{ id: 'fifth', label: '5th Period', value: 'fifth' },
	{ id: 'sixth', label: '6th Period', value: 'sixth' },
	{
		id: 'sixth_period_exam',
		label: '6th Period Exam',
		value: 'sixth_period_exam',
	},
];

const OFFLINE_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
type LinkValidityOption = '1d' | '2d' | '3d' | '1w' | '1m';
const LINK_VALIDITY_OPTIONS: Array<{
	value: LinkValidityOption;
	label: string;
}> = [
	{ value: '1d', label: '1 day (Default)' },
	{ value: '2d', label: '2 days' },
	{ value: '3d', label: '3 days' },
	{ value: '1w', label: '1 week' },
	{ value: '1m', label: '1 month' },
];

const getCurrentAcademicYear = () => {
	const currentDate = new Date();
	const currentYear = currentDate.getFullYear();
	const currentMonth = currentDate.getMonth() + 1;

	if (currentMonth >= 8) {
		return `${currentYear}-${currentYear + 1}`;
	} else {
		return `${currentYear - 1}-${currentYear}`;
	}
};

const getClassMetaById = (classLevels: any, classId?: string) => {
	if (!classLevels || !classId) return null;
	for (const [session, levels] of Object.entries(classLevels)) {
		if (!levels || typeof levels !== 'object') continue;
		for (const [level, levelData] of Object.entries(levels as any)) {
			if (!levelData?.classes || !Array.isArray(levelData.classes)) continue;
			const found = levelData.classes.find(
				(cls: any) => cls.classId === classId,
			);
			if (found) {
				return { session, level, name: found.name };
			}
		}
	}
	return null;
};

const mergeSubjectNames = (subjects: Array<unknown>) => {
	const result: string[] = [];
	const seen = new Set<string>();
	subjects.forEach((value) => {
		const subject = String(value || '').trim();
		if (!subject || seen.has(subject)) return;
		seen.add(subject);
		result.push(subject);
	});
	return result;
};

function gradeStyle(score: number | null) {
	if (score === null || Number.isNaN(score)) {
		return {
			...styles.tableCell,
			fontSize: 10,
			fontWeight: 'bold',
		};
	}
	if (score < 70) {
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

function paginateStudents(
	students: PeriodicStudentData[],
	perPage: number = 3,
): PeriodicStudentData[][] {
	const pages: PeriodicStudentData[][] = [];
	for (let i = 0; i < students.length; i += perPage) {
		const page = students.slice(i, i + perPage);
		if (page.length > 0) {
			pages.push(page);
		}
	}
	return pages;
}

function SchoolHeader({
	student,
	schoolData,
}: {
	student: StudentInfo;
	schoolData: any;
}) {
	if (!schoolData) {
		return (
			<View style={{ marginBottom: 7 }}>
				<Text style={{ fontSize: 10, fontWeight: 'bold', textAlign: 'center' }}>
					School Data Loading...
				</Text>
			</View>
		);
	}

	const periodLabel =
		periodOptions.find((p) => p.value === student.period)?.label ||
		student.period;

	const schoolAddressFirstLine = Array.isArray(schoolData?.address)
		? Array.isArray(schoolData.address[0])
			? schoolData.address[0].join('\n')
			: schoolData.address[0] || ''
		: '';

	const schoolAddress = Array.isArray(schoolData?.address)
		? schoolData.address.slice(1).join('\n')
		: '';

	return (
		<View style={{ marginBottom: 7 }}>
			<Text style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
				{schoolData.name || 'School Name'}
			</Text>
			<Text style={{ fontSize: 8, textAlign: 'center' }}>
				{schoolAddressFirstLine}
			</Text>
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					marginBottom: 4,
					gap: 1,
				}}
			>
				<View>
					{(schoolData.logoUrl2 || schoolData.logoUrl) && (
						<Image
							src={schoolData.logoUrl2 || schoolData.logoUrl}
							style={{ width: 32 }}
						/>
					)}
				</View>
				<View style={{ flex: 1, alignItems: 'center' }}>
					<Text style={{ fontSize: 8, textAlign: 'center' }}>
						{schoolAddress}
					</Text>
				</View>
				<View>
					{schoolData.logoUrl && (
						<Image src={schoolData.logoUrl} style={{ width: 32 }} />
					)}
				</View>
			</View>

			{/* 1. Heading: e.g. SENIOR HIGH 1ST PERIOD GRADE SHEET */}
			<Text
				style={{
					fontWeight: 'bold',
					fontSize: 9,
					textAlign: 'center',
					color: '#1a365d',
					marginBottom: 4,
				}}
			>
				{student.grade.toUpperCase()} {periodLabel.toUpperCase()} GRADE SHEET
			</Text>
		</View>
	);
}


// PDF Document Component - Memoized to prevent re-rendering
const PeriodicReportDocument = React.memo(
	({
		studentsData,
		reportFilters,
		subjects,
		className,
		selectedPeriodLabel,
		schoolData,
	}: {
		studentsData: PeriodicStudentData[];
		reportFilters: any;
		subjects: string[];
		className: string;
		selectedPeriodLabel: string;
		schoolData: any;
	}) => {
		// Memoize the pages calculation
		const pages = useMemo(
			() => paginateStudents(studentsData, 3),
			[studentsData],
		);

		// Memoize the title
		const title = useMemo(() => {
			return studentsData.length === 1
				? `Periodic Report - ${studentsData[0].studentName}`
				: reportFilters.selectedStudents.length > 0 &&
					  reportFilters.selectedStudents.length < studentsData.length
					? `Periodic Report - Selected Students - ${selectedPeriodLabel}`
					: `Periodic Report - ${className} - ${selectedPeriodLabel}`;
		}, [
			studentsData,
			reportFilters.selectedStudents,
			selectedPeriodLabel,
			className,
		]);

		const periodLabel =
			periodOptions.find((p) => p.value === reportFilters.period)?.label ||
			reportFilters.period;

		return (
			<Document title={title}>
				{pages
					.filter((page) => page.length > 0)
					.map((studentGroup, pageIndex) => (
						<Page
							key={pageIndex}
							size="A4"
							orientation="landscape"
							style={{
								...styles.page,
								paddingTop: 20,
								paddingBottom: 20,
								paddingLeft: 20,
								paddingRight: 20,
							}}
							wrap={false}
						>
							<View
								style={{
									position: 'absolute',
									top: '10%',
									left: '50%',
									transform: 'translate(-50%, -50%)',
									opacity: 0.15,
									zIndex: -1,
								}}
							>
								<Image src={schoolData?.logoUrl} style={{ width: 250 }} />
							</View>

							<View
								style={{
									flexDirection: 'row',
									width: '100%',
									justifyContent: 'flex-start',
									alignItems: 'flex-start',
									flex: 1,
								}}
							>
								{studentGroup.map((studentData, colIdx) => (
									<View
										key={`${pageIndex}-${colIdx}`}
										style={{
											width: '32%',
											marginRight: colIdx < 2 ? '2%' : 0,
											borderWidth: 1,
											borderColor: '#cbd5e1',
											backgroundColor: '#f8fafc',
											borderRadius: 8,
											padding: 8,
											minHeight: 400,
											maxHeight: 'auto',
										}}
									>
										<SchoolHeader
											student={{
												firstName: studentData.studentName?.split(' ')[0] || '',
												middleName:
													studentData.studentName?.split(' ').length > 2
														? studentData.studentName.split(' ')[1]
														: '',
												lastName:
													studentData.studentName?.split(' ').length > 1
														? studentData.studentName.split(' ').slice(-1)[0]
														: '',
												class: className,
												id: studentData.studentId,
												academicYear: reportFilters.academicYear,
												grade: reportFilters.gradeLevel,
												period: reportFilters.period,
											}}
											schoolData={schoolData}
										/>

										{/* Replace the existing details block with this */}
										<View
											style={{
												flexDirection: 'row',
												justifyContent: 'space-between',
												marginBottom: 8,
												alignItems: 'flex-end',
											}}
										>
											<View style={{ flexDirection: 'column', gap: 6 }}>
												<Text style={{ fontWeight: 'bold', fontSize: 10 }}>
													{studentData.studentName}
												</Text>
												<Text style={{ fontSize: 10 }}>Class: {className}</Text>
												<Text style={{ fontSize: 10 }}>
													Student ID: {studentData.studentId}
												</Text>
											</View>
											<View
												style={{
													flexDirection: 'column',
													gap: 6,
													alignItems: 'flex-start',
													marginRight: 9,
												}}
											>
												<Text style={{ fontSize: 10 }}>
													Period: {periodLabel}
												</Text>
												<Text style={{ fontSize: 10 }}>
													Academic: {reportFilters.academicYear}
												</Text>
											</View>
										</View>

										<View style={{ marginTop: 5, flex: 1 }}>
											<View
												style={{
													flexDirection: 'row',
													borderBottomWidth: 1,
													borderBottomColor: '#2d3748',
													marginBottom: 4,
													paddingBottom: 2,
												}}
											>
												<Text
													style={{
														fontWeight: 'bold',
														fontSize: 9,
														width: '60%',
													}}
												>
													Subject
												</Text>
												<Text
													style={{
														fontWeight: 'bold',
														fontSize: 9,
														width: '40%',
														textAlign: 'center',
													}}
												>
													Marks
												</Text>
											</View>
											{subjects.map((subjectName, sidx) => {
												const subject =
													studentData.subjects &&
													studentData.subjects.find(
														(s) =>
															s?.subject?.toLowerCase() ===
															subjectName?.toLowerCase(),
													);
												const mark = subject ? subject.grade : null;
												return (
													<View
														key={sidx}
														style={{
															flexDirection: 'row',
															borderBottomWidth: 1,
															borderBottomColor: '#e2e8f0',
															minHeight: 18,
															alignItems: 'center',
														}}
													>
														<Text
															style={{
																fontSize: 9,
																width: '60%',
																paddingVertical: 1,
															}}
														>
															{subjectName}
														</Text>
														<Text
															style={{
																...gradeStyle(Number(mark)),
																width: '40%',
																textAlign: 'center',
																paddingVertical: 1,
															}}
														>
															{mark !== null ? mark : '-'}
														</Text>
													</View>
												);
											})}
											<View
												style={{
													borderTopWidth: 1,
													borderTopColor: '#2d3748',
													paddingTop: 4,
												}}
											>
												<View
													style={{
														flexDirection: 'row',
														minHeight: 18,
														alignItems: 'center',
													}}
												>
													<Text
														style={{
															fontWeight: 'bold',
															fontSize: 9,
															width: '60%',
															paddingVertical: 1,
														}}
													>
														Periodic Average
													</Text>
													<Text
														style={{
															...gradeStyle(studentData.periodicAverage),
															width: '40%',
															textAlign: 'center',
															fontSize: 9,
														}}
													>
														{studentData.periodicAverage.toFixed(1)}
													</Text>
												</View>
												<View
													style={{
														flexDirection: 'row',
														minHeight: 18,
														alignItems: 'center',
													}}
												>
													<Text
														style={{
															fontWeight: 'bold',
															fontSize: 9,
															width: '60%',
															paddingVertical: 1,
														}}
													>
														Class Rank
													</Text>
													<Text
														style={{
															...styles.tableCell,
															fontWeight: 'bold',
															width: '40%',
															textAlign: 'center',
															fontSize: 9,
														}}
													>
														{studentData.rank || 'N/A'}
													</Text>
												</View>
											</View>
										</View>
									</View>
								))}
							</View>

							{pages.length > 1 && (
								<View
									style={{
										position: 'absolute',
										bottom: 12,
										right: 32,
									}}
								>
									<Text style={{ fontSize: 8, color: '#888' }}>
										Page {pageIndex + 1} of {pages.length}
									</Text>
								</View>
							)}
						</Page>
					))}
			</Document>
		);
	},
);

function ReportContent({
	reportFilters,
	activeStudents,
	onBack,
}: {
	reportFilters: {
		academicYear: string;
		period: string;
		session: string;
		gradeLevel: string;
		className: string;
		selectedStudents: string[];
	};
	activeStudents: Student[];
	onBack: () => void;
}) {
	const [studentsData, setStudentsData] = useState<PeriodicStudentData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
	const [serverKey, setServerKey] = useState<string | null>(null);
	const [pdfGenerating, setPdfGenerating] = useState(false);
	const [inlineError, setInlineError] = useState(false);
	const pdfUrlRef = useRef<string | null>(null);
	const [shareModalOpen, setShareModalOpen] = useState(false);
	const [shareInfo, setShareInfo] = useState<{
		url: string;
		pin: string;
		expiresAt: string;
	} | null>(null);
	const [shareNotice, setShareNotice] = useState('');
	const [shareLoading, setShareLoading] = useState(false);
	const [linkValidity, setLinkValidity] = useState<LinkValidityOption>('1d');
	const [copiedLink, setCopiedLink] = useState(false);
	const [copiedPin, setCopiedPin] = useState(false);
	const [viewLoading, setViewLoading] = useState(false);
	const resetCopiedTimeoutRef = useRef<number | null>(null);
	const school = useSchoolStore((state) => state.school);
	const gradesByAcademicYear = useSchoolStore(
		(state) => state.gradesByAcademicYear,
	);
	const gradesVersionByAcademicYear = useSchoolStore(
		(state) => state.gradesVersionByAcademicYear,
	);
	const setGradesForYear = useSchoolStore((state) => state.setGradesForYear);
	const user = useAuth((state) => state.user);
	const isStudent = user?.role === 'student';
	const createdBy = useMemo(
		() => user?.id || user?._id || user?.studentId || '',
		[user],
	);

	// Memoize school data to prevent unnecessary re-renders
	const schoolData = useMemo(() => school, [school]);

	const schoolSubjectsRef = useRef<string[]>([]);
	const schoolSubjects = useMemo(() => {
		if (!school) return schoolSubjectsRef.current;
		const classMeta = getClassMetaById(
			school.classLevels,
			reportFilters.className,
		);
		const resolvedMeta =
			classMeta ||
			(!reportFilters.className &&
			reportFilters.session &&
			reportFilters.gradeLevel
				? { session: reportFilters.session, level: reportFilters.gradeLevel }
				: null);
		if (!resolvedMeta?.session || !resolvedMeta?.level) return schoolSubjectsRef.current;
		const subjects =
			school.classLevels?.[resolvedMeta.session]?.[resolvedMeta.level]
				?.subjects || [];
		const next = mergeSubjectNames(
			subjects.map((subject: any) =>
				typeof subject === 'string' ? subject : subject?.name,
			),
		);
		if (schoolSubjectsRef.current.join('||') === next.join('||')) {
			return schoolSubjectsRef.current;
		}
		schoolSubjectsRef.current = next;
		return next;
	}, [
		school,
		reportFilters.className,
		reportFilters.session,
		reportFilters.gradeLevel,
	]);

	const reportSubjects = useMemo(() => {
		if (schoolSubjects.length > 0) return schoolSubjects;
		return mergeSubjectNames(
			studentsData.flatMap((student) =>
				Array.isArray(student?.subjects)
					? student.subjects.map((entry) => entry?.subject)
					: [],
			),
		);
	}, [schoolSubjects, studentsData]);

	// Get class name from school profile - memoized
	const className = useMemo(() => {
		if (
			school?.classLevels?.[reportFilters.session]?.[reportFilters.gradeLevel]
				?.classes
		) {
			const classInfo = school.classLevels[reportFilters.session][
				reportFilters.gradeLevel
			].classes.find((c: any) => c.classId === reportFilters.className);
			return classInfo ? classInfo.name : reportFilters.className;
		}
		return reportFilters.className;
	}, [
		school,
		reportFilters.session,
		reportFilters.gradeLevel,
		reportFilters.className,
	]);

	// Memoize selected period label
	const selectedPeriodLabel = useMemo(() => {
		return (
			periodOptions.find((p) => p.value === reportFilters.period)?.label ||
			reportFilters.period
		);
	}, [reportFilters.period]);

	// Generate filename for download - memoized
	const fileName = useMemo(() => {
		const timestamp = new Date().toISOString().split('T')[0];
		if (studentsData.length === 1) {
			return `Periodic_Report_${studentsData[0].studentName.replace(
				/\s+/g,
				'_',
			)}_${timestamp}.pdf`;
		}
		return `Periodic_Report_${className.replace(
			/\s+/g,
			'_',
		)}_${selectedPeriodLabel.replace(/\s+/g, '_')}_${timestamp}.pdf`;
	}, [studentsData, className, selectedPeriodLabel]);

	const handleShare = useCallback(async () => {
		if (!shareModalOpen) {
			setShareModalOpen(true);
			setShareInfo(null);
			setShareNotice('');
			return;
		}
		if (!pdfBlob || !downloadUrl) return;
		setShareLoading(true);
		try {
			const formData = new FormData();
			formData.append('fileName', fileName);
			formData.append('reportType', 'periodic');
			formData.append('linkValidity', linkValidity);
			if (createdBy) {
				formData.append('createdBy', createdBy);
			}
			if (serverKey) {
				formData.append('cacheKey', serverKey);
			}
			formData.append('pdf', pdfBlob, fileName);
			const response = await fetch('/api/reports/share', {
				method: 'POST',
				body: formData,
			});
			if (!response.ok) return;
			const data = await response.json();
			if (!data?.shareUrl || !data?.pin) return;
			if (data.cacheKey && data.cacheKey !== serverKey) {
				setServerKey(data.cacheKey);
			}
			setShareInfo({
				url: data.shareUrl,
				pin: data.pin,
				expiresAt: data.expiresAt,
			});
			setShareModalOpen(true);
			setCopiedLink(false);
			setCopiedPin(false);
			setShareNotice('');
		} finally {
			setShareLoading(false);
		}
	}, [
		shareModalOpen,
		pdfBlob,
		downloadUrl,
		fileName,
		linkValidity,
		createdBy,
		serverKey,
	]);

	// Memoize the PDF document to prevent re-rendering
	const pdfDocument = useMemo(() => {
		if (studentsData.length === 0 || !schoolData) return null;

		return (
			<PeriodicReportDocument
				studentsData={studentsData}
				reportFilters={reportFilters}
				subjects={reportSubjects}
				className={className}
				selectedPeriodLabel={selectedPeriodLabel}
				schoolData={schoolData}
			/>
		);
	}, [
		studentsData,
		reportFilters,
		reportSubjects,
		className,
		selectedPeriodLabel,
		schoolData,
	]);

	useEffect(() => {
		if (!pdfDocument) {
			if (pdfUrlRef.current) {
				URL.revokeObjectURL(pdfUrlRef.current);
				pdfUrlRef.current = null;
			}
			setPdfUrl(null);
			setDownloadUrl(null);
			setPdfBlob(null);
			setServerKey(null);
			setInlineError(false);
			if (resetCopiedTimeoutRef.current) {
				window.clearTimeout(resetCopiedTimeoutRef.current);
				resetCopiedTimeoutRef.current = null;
			}
			return;
		}

		let cancelled = false;
		setPdfGenerating(true);
		const isIOS =
			typeof navigator !== 'undefined' &&
			/iPad|iPhone|iPod/.test(navigator.userAgent);
		const isMobile =
			typeof navigator !== 'undefined' &&
			/Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);

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
				setPdfBlob(blob);
				setServerKey(null);
				setInlineError(false);

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
				if (isMobile) {
					setInlineError(true);
				}
			})
			.catch((err) => {
				console.error('Failed to generate PDF blob', err);
				if (!cancelled) setPdfUrl(null);
			})
			.finally(() => {
				if (!cancelled) setPdfGenerating(false);
			});

		return () => {
			cancelled = true;
		};
	}, [pdfDocument]);

	// Fetch data only once when component mounts - use useCallback to prevent recreation
	const fetchAndMergeGrades = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const selectedStudentIds = reportFilters.selectedStudents
				.map((studentId) => String(studentId || '').trim())
				.filter(Boolean);
			const selectedIdsCacheKey =
				selectedStudentIds.length > 0
					? [...selectedStudentIds].sort().join(',')
					: 'all';
			const userScopeKey = String(
				user?.id || user?._id || user?.studentId || user?.username || 'guest',
			);
			const cacheKey = `periodic:report:${reportFilters.academicYear}:${reportFilters.session}:${reportFilters.className}:${reportFilters.period}:${selectedIdsCacheKey}:${userScopeKey}`;
			const cachedReport = getClientCache<PeriodicStudentData[]>(cacheKey);
			const gradesCacheBaseKey = `periodic:grades:${reportFilters.academicYear}:${reportFilters.session}:${reportFilters.className}:${reportFilters.period}`;
			const gradesCacheKey = `${gradesCacheBaseKey}:${selectedIdsCacheKey}`;
			const cachedGrades =
				getClientCache<any>(gradesCacheKey) ??
				getClientCache<any>(`${gradesCacheBaseKey}:all`);
			const offline =
				typeof navigator !== 'undefined' && navigator.onLine === false;
			if (cachedReport && offline) {
				setStudentsData(cachedReport);
				setLoading(false);
				return;
			}

			const params = new URLSearchParams({
				period: reportFilters.period,
				academicYear: reportFilters.academicYear,
				classId: reportFilters.className,
				session: reportFilters.session,
			});

			// We fetch grades for the whole class to build rank, then filter locally.
			let data: any;
			const scopedGrades = getScopedAcademicYearValue(
				gradesByAcademicYear,
				reportFilters.academicYear,
			).value;
			const scopedGradesVersion = getScopedAcademicYearValue(
				gradesVersionByAcademicYear,
				reportFilters.academicYear,
			).value;
			const hasScopedGradesVersion = typeof scopedGradesVersion === 'string';
			const canUseScopedGrades =
				Array.isArray(scopedGrades) &&
				scopedGrades.length > 0 &&
				(offline || hasScopedGradesVersion);
			const selectedIdsSet =
				selectedStudentIds.length > 0 ? new Set(selectedStudentIds) : null;
			if (canUseScopedGrades) {
				const filteredStoreGrades = scopedGrades.filter((grade: any) => {
					const gradeYear = String(grade?.academicYear || '').trim();
					return (
						grade?.classId === reportFilters.className &&
						grade?.period === reportFilters.period &&
						areAcademicYearsEqual(gradeYear, reportFilters.academicYear)
					);
				});
				data = {
					success: true,
					data: { grades: filteredStoreGrades },
				};
			} else if (offline && cachedGrades) {
				data = cachedGrades;
			} else if (offline && !cachedGrades) {
				throw new Error(
					'No cached grades found for offline periodic report generation.',
				);
			} else {
				try {
					const res = await fetch(`/api/grades?${params.toString()}`, {
						cache: 'no-store',
					});
					if (!res.ok) throw new Error('Failed to fetch periodic grades');
					data = await res.json();
					if (Array.isArray(data?.data?.grades)) {
						const existingScopedGrades = getScopedAcademicYearValue(
							gradesByAcademicYear,
							reportFilters.academicYear,
						).value;
						if (
							!areGradeRowsEquivalent(existingScopedGrades, data.data.grades)
						) {
							setGradesForYear(reportFilters.academicYear, data.data.grades);
						}
					}
					setClientCache(gradesCacheKey, data, OFFLINE_CACHE_TTL_MS);
					if (selectedIdsCacheKey === 'all') {
						setClientCache(
							`${gradesCacheBaseKey}:all`,
							data,
							OFFLINE_CACHE_TTL_MS,
						);
					}
				} catch (fetchError) {
					if (cachedGrades) {
						data = cachedGrades;
					} else if (cachedReport) {
						setStudentsData(cachedReport);
						setLoading(false);
						return;
					}
					if (!data) throw fetchError;
				}
			}

			if (!data.success) {
				throw new Error(data.message || 'Invalid data format from server');
			}
			const normalizedReport: PeriodicStudentData[] = (() => {
				if (Array.isArray(data.data?.report)) return data.data.report;
				if (data.data?.report) return [data.data.report];

				// System-admin class+period API can return raw rows in data.grades.
				const rawGrades = Array.isArray(data.data?.grades)
					? data.data.grades
					: [];
				if (!rawGrades.length) return [];

				const reportByStudent = new Map<
					string,
					{
						studentId: string;
						studentName: string;
						subjectsMap: Map<string, number>;
						periodicAverage: number;
						rank: number | null;
					}
				>();

				rawGrades.forEach((gradeRow: any) => {
					const studentId = String(gradeRow?.studentId || '').trim();
					if (!studentId) return;
					if (!reportByStudent.has(studentId)) {
						reportByStudent.set(studentId, {
							studentId,
							studentName: String(gradeRow?.studentName || '').trim(),
							subjectsMap: new Map<string, number>(),
							periodicAverage: 0,
							rank: null,
						});
					}
					const row = reportByStudent.get(studentId);
					const rankValue = Number(gradeRow?.rank);
					if (Number.isFinite(rankValue) && rankValue > 0 && row) {
						row.rank = row.rank ? Math.min(row.rank, rankValue) : rankValue;
					}
					const subject = String(gradeRow?.subject || '').trim();
					const value = Number(gradeRow?.grade);
					if (!subject || Number.isNaN(value)) return;
					row?.subjectsMap.set(subject, value);
				});

				const reportRows = Array.from(reportByStudent.values()).map((row) => {
					const subjects = Array.from(row.subjectsMap.entries()).map(
						([subject, grade]) => ({ subject, grade }),
					);
					const avg =
						subjects.length > 0
							? Number(
									(
										subjects.reduce((sum, item) => sum + item.grade, 0) /
										subjects.length
									).toFixed(1),
								)
							: 0;
					return {
						studentId: row.studentId,
						studentName: row.studentName,
						subjects,
						periodicAverage: avg,
						rank: row.rank ?? 0,
					};
				});

				const hasServerRanks = reportRows.some(
					(row) =>
						typeof row.rank === 'number' &&
						Number.isFinite(row.rank) &&
						row.rank > 0,
				);
				if (hasServerRanks) {
					return [...reportRows].sort((a, b) => {
						const aRank = a.rank > 0 ? a.rank : Infinity;
						const bRank = b.rank > 0 ? b.rank : Infinity;
						if (aRank !== bRank) return aRank - bRank;
						return b.periodicAverage - a.periodicAverage;
					});
				}

				const ranked = [...reportRows].sort(
					(a, b) => b.periodicAverage - a.periodicAverage,
				);
				let rank = 1;
				ranked.forEach((row, index) => {
					if (
						index > 0 &&
						row.periodicAverage < ranked[index - 1].periodicAverage
					) {
						rank = index + 1;
					}
					row.rank = rank;
				});

				return ranked;
			})();
			const gradeReports: PeriodicStudentData[] = selectedIdsSet
				? normalizedReport.filter((row) => selectedIdsSet.has(row.studentId))
				: normalizedReport;
			const gradesMap = new Map<string, PeriodicStudentData>();

			if (Array.isArray(gradeReports)) {
				gradeReports.forEach((report) => {
					if (report && report.studentId) {
						gradesMap.set(report.studentId, report);
					}
				});
			}

			const fallbackStudentsFromGrades: Student[] = gradeReports.map(
				(report) => ({
					id: String(report.studentId || '').trim(),
					name: (typeof report.studentName === 'string' &&
					report.studentName.trim().length > 0
						? report.studentName
						: String(report.studentId || '')
					).trim(),
					className: reportFilters.className,
				}),
			);
			const dedupedFallbackStudents = Array.from(
				new Map(
					fallbackStudentsFromGrades.map((student) => [student.id, student]),
				).values(),
			).filter((student) => student.id);
			const studentsForReport =
				activeStudents && activeStudents.length > 0
					? activeStudents
					: dedupedFallbackStudents.length > 0
						? dedupedFallbackStudents
						: isStudent && user
							? [
									{
										id: String(
											user?.studentId || user?.id || user?._id || '',
										).trim(),
										name: [user?.firstName, user?.middleName, user?.lastName]
											.filter(Boolean)
											.join(' ') ||
											String(user?.studentId || user?.id || ''),
										className: reportFilters.className,
									},
								]
							: [];

			// The final data is based on selected students if available; otherwise use grade-derived students.
			const finalReportData = studentsForReport.map((activeStudent) => {
				const gradeData = gradesMap.get(activeStudent.id);
				if (gradeData) {
					// Student has grades, use the data from the API (including rank from backend)
					return gradeData;
				} else {
					// This active student has no grades, create a default entry (no rank assigned)
					return {
						studentId: activeStudent.id,
						studentName: activeStudent.name,
						subjects: [], // Will result in '-' for all subjects
						periodicAverage: 0,
						rank: NaN, // No rank assigned
					};
				}
			});

			if (finalReportData.length === 0 && gradeReports.length > 0) {
				setStudentsData(gradeReports);
				setClientCache(cacheKey, gradeReports, OFFLINE_CACHE_TTL_MS);
				return;
			}
			setStudentsData(finalReportData);
			setClientCache(cacheKey, finalReportData, OFFLINE_CACHE_TTL_MS);
		} catch (err) {
			console.error('Error fetching and merging grades:', err);
			setError(
				err instanceof Error ? err.message : 'Failed to load report data',
			);
		} finally {
			setLoading(false);
		}
	}, [
		activeStudents,
		reportFilters.period,
		reportFilters.academicYear,
		reportFilters.className,
		reportFilters.session,
		reportFilters.selectedStudents,
		user?.id,
		user?._id,
		user?.studentId,
		user?.username,
		setGradesForYear,
	]);

	// Only fetch data once on mount or when filters/students change
	useEffect(() => {
		fetchAndMergeGrades();
	}, [fetchAndMergeGrades]);

	const handleView = useCallback(() => {
		const targetUrl = downloadUrl || pdfUrl;
		if (!targetUrl) return;
		setViewLoading(true);
		try {
			const popup = window.open(targetUrl, '_blank', 'noopener,noreferrer');
			if (!popup) {
				window.location.assign(targetUrl);
			}
		} finally {
			setViewLoading(false);
		}
	}, [downloadUrl, pdfUrl]);

	// Stable back handler
	const handleBack = useCallback(() => {
		onBack();
	}, [onBack]);
	const isReportReady = Boolean(pdfUrl && downloadUrl && !pdfGenerating);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<PageLoading fullScreen={false} variant="minimal" size="lg" />
			</div>
		);
	}

	// Handle both error cases and no students found cases
	if (error || studentsData.length === 0) {
		const isNoStudentsFound = !error && studentsData.length === 0;

		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
				<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6 text-center">
					<h2 className="text-lg font-semibold mb-4">
						{isNoStudentsFound ? 'No Students Found' : 'No Data Found'}
					</h2>
					<p className="text-muted-foreground mb-6">
						{isNoStudentsFound
							? 'No students were found matching the selected filters.'
							: error ||
								'No periodic student data found for the selected filters.'}
					</p>
					<button
						type="button"
						onClick={handleBack}
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
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-3 sm:px-8 py-3 sm:py-4 bg-background border-b border-border">
				<button
					type="button"
					onClick={handleBack}
					className="w-full sm:w-auto min-h-11 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm inline-flex items-center justify-center"
				>
					← Back to Filter
				</button>

				{/* Download Button */}
				{isReportReady && (
					<div className="w-full sm:w-auto flex items-center gap-2">
						{isStudent && !inlineError && (
							<button
								type="button"
								onClick={handleShare}
								disabled={!isReportReady || shareLoading}
								className="flex-1 sm:flex-none min-h-11 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M16 6l-4-4-4 4"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 2v14"
									/>
								</svg>
								{shareLoading ? 'Generating Link...' : 'Share Grade Sheet'}
							</button>
						)}
						<button
							type="button"
							onClick={() => {
								if (!downloadUrl) return;
								const link = document.createElement('a');
								link.href = downloadUrl;
								link.download = fileName;
								document.body.appendChild(link);
								link.click();
								link.remove();
							}}
							disabled={!isReportReady}
							className="flex-1 sm:flex-none min-h-11 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
							<span>Download Grade Sheet</span>
						</button>
					</div>
				)}
			</div>

			<div className="flex-1 bg-gray-100">
				{pdfUrl ? (
					<div className="w-full" style={{ height: '80vh' }}>
						{inlineError ? (
							<div className="flex items-center justify-center h-full">
								<div className="flex flex-col items-center gap-3">
									<button
										type="button"
										onClick={handleView}
										disabled={!downloadUrl || pdfGenerating || viewLoading}
										className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm inline-flex items-center gap-2"
									>
										<svg
											className="w-4 h-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
											/>
											<circle cx="12" cy="12" r="3" />
										</svg>
										{viewLoading ? 'Opening...' : 'View Grade Sheet'}
									</button>
									{isStudent && (
										<button
											type="button"
											onClick={handleShare}
											disabled={!isReportReady || shareLoading}
											className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm inline-flex items-center gap-2"
										>
											<svg
												className="w-4 h-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"
												/>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M16 6l-4-4-4 4"
												/>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 2v14"
												/>
											</svg>
											{shareLoading
												? 'Generating Link...'
												: 'Share Grade Sheet'}
										</button>
									)}
								</div>
							</div>
						) : (
							<iframe
								title="Periodic Report PDF"
								className="w-full h-full"
								style={{ border: 'none' }}
								src={pdfUrl}
								onError={() => setInlineError(true)}
							/>
						)}
					</div>
				) : (
					<div className="flex items-center justify-center h-full">
						<InlineLoading size="lg" />
					</div>
				)}
			</div>
			{shareModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
					<div className="bg-card w-full max-w-md rounded-xl border border-border shadow-xl">
						<div className="flex items-center justify-between p-4 border-b border-border">
							<h5 className="text-lg font-semibold text-foreground">
								Share Grade Sheet
							</h5>
							<button
								type="button"
								onClick={() => setShareModalOpen(false)}
								className="p-2 rounded-full hover:bg-muted transition-colors"
							>
								<svg
									className="h-4 w-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
						<div className="p-4 space-y-4">
							<div className="rounded-lg border border-border bg-muted/40 p-3">
								<p className="text-xs text-muted-foreground mb-1">
									Link validity
								</p>
								<select
									value={linkValidity}
									onChange={(e) =>
										setLinkValidity(e.target.value as LinkValidityOption)
									}
									className="w-full border border-border px-2 py-2 rounded bg-background text-foreground text-sm"
								>
									{LINK_VALIDITY_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>
							{shareInfo && (
								<>
									<div>
										<p className="text-sm text-muted-foreground">
											Expires on{' '}
											{new Date(shareInfo.expiresAt).toLocaleString()}.
										</p>
									</div>
									<div className="rounded-lg border border-border bg-muted/40 p-3">
										<p className="text-xs text-muted-foreground mb-1">
											Share Link
										</p>
										<p className="text-sm break-all">{shareInfo.url}</p>
										<button
											type="button"
											onClick={async () => {
												try {
													await navigator.clipboard.writeText(shareInfo.url);
													setShareNotice('Link copied.');
													setCopiedLink(true);
													if (resetCopiedTimeoutRef.current) {
														window.clearTimeout(resetCopiedTimeoutRef.current);
													}
													resetCopiedTimeoutRef.current = window.setTimeout(
														() => {
															setCopiedLink(false);
															setShareNotice('');
														},
														2000,
													);
												} catch {
													setShareNotice('Copy failed.');
												}
											}}
											className="mt-2 px-3 py-1.5 text-xs rounded border border-border hover:bg-muted"
										>
											{copiedLink ? (
												<span className="inline-flex items-center gap-1">
													<svg
														className="h-3.5 w-3.5 text-green-600"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={3}
															d="M5 13l4 4L19 7"
														/>
													</svg>
													Copied
												</span>
											) : (
												'Copy Link'
											)}
										</button>
									</div>
									<div className="rounded-lg border border-border bg-muted/40 p-3">
										<p className="text-xs text-muted-foreground mb-1">PIN</p>
										<p className="text-2xl font-semibold tracking-widest">
											{shareInfo.pin}
										</p>
										<button
											type="button"
											onClick={async () => {
												try {
													await navigator.clipboard.writeText(shareInfo.pin);
													setShareNotice('PIN copied.');
													setCopiedPin(true);
													if (resetCopiedTimeoutRef.current) {
														window.clearTimeout(resetCopiedTimeoutRef.current);
													}
													resetCopiedTimeoutRef.current = window.setTimeout(
														() => {
															setCopiedPin(false);
															setShareNotice('');
														},
														2000,
													);
												} catch {
													setShareNotice('Copy failed.');
												}
											}}
											className="mt-2 px-3 py-1.5 text-xs rounded border border-border hover:bg-muted"
										>
											{copiedPin ? (
												<span className="inline-flex items-center gap-1">
													<svg
														className="h-3.5 w-3.5 text-green-600"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={3}
															d="M5 13l4 4L19 7"
														/>
													</svg>
													Copied
												</span>
											) : (
												'Copy PIN'
											)}
										</button>
									</div>
									{shareNotice && (
										<p className="text-xs text-muted-foreground">
											{shareNotice}
										</p>
									)}
									<div className="rounded-lg border border-border bg-muted/30 p-3">
										<div className="flex items-center justify-between mb-2">
											<p className="text-xs text-muted-foreground">
												Share on social media
											</p>
										</div>
										<div className="flex flex-wrap gap-2">
											{[
												{
													label: 'WhatsApp',
													Icon: MessageCircle,
													build: () =>
														`https://wa.me/?text=${encodeURIComponent(
															`Grade Sheet link: ${shareInfo.url} | PIN: ${shareInfo.pin}`,
														)}`,
												},
												{
													label: 'Facebook',
													Icon: Facebook,
													build: () =>
														`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
															shareInfo.url,
														)}&quote=${encodeURIComponent(`PIN: ${shareInfo.pin}`)}`,
												},
												{
													label: 'Messenger',
													Icon: MessagesSquare,
													build: () =>
														`fb-messenger://share/?link=${encodeURIComponent(
															shareInfo.url,
														)}&app_id=${encodeURIComponent(
															process.env.NEXT_PUBLIC_FB_APP_ID || '',
														)}&ref=${encodeURIComponent(`PIN: ${shareInfo.pin}`)}`,
												},
												{
													label: 'X',
													Icon: Twitter,
													build: () =>
														`https://twitter.com/intent/tweet?text=${encodeURIComponent(
															`Grade Sheet link: ${shareInfo.url} | PIN: ${shareInfo.pin}`,
														)}`,
												},
												{
													label: 'Telegram',
													Icon: Send,
													build: () =>
														`https://t.me/share/url?url=${encodeURIComponent(
															shareInfo.url,
														)}&text=${encodeURIComponent(`PIN: ${shareInfo.pin}`)}`,
												},
												{
													label: 'Email',
													Icon: Mail,
													build: () =>
														`mailto:?subject=${encodeURIComponent(
															'Grade Sheet',
														)}&body=${encodeURIComponent(
															`Grade Sheet link: ${shareInfo.url}\nPIN: ${shareInfo.pin}`,
														)}`,
												},
											].map((item) => (
												<button
													key={item.label}
													type="button"
													onClick={() => window.open(item.build(), '_blank')}
													className="px-3 py-1.5 text-xs rounded border border-border hover:bg-muted inline-flex items-center gap-2"
												>
													<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted">
														<item.Icon className="h-3.5 w-3.5 text-muted-foreground" />
													</span>
													{item.label}
												</button>
											))}
										</div>
									</div>
								</>
							)}
							<div className="flex justify-end gap-2">
								{!shareInfo && (
									<button
										type="button"
										onClick={handleShare}
										disabled={shareLoading || !downloadUrl || pdfGenerating}
										className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm disabled:opacity-50"
									>
										{shareLoading ? 'Generating Link...' : 'Generate'}
									</button>
								)}
								<button
									type="button"
									onClick={() => setShareModalOpen(false)}
									className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm"
								>
									Done
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default function PeriodicReportWrapper() {
	const [showReport, setShowReport] = useState(false);
	const [activeStudents, setActiveStudents] = useState<Student[]>([]);
	const user = useAuth((state) => state.user);
	const currentSchool = useSchoolStore((state) => state.school);
	const isStudent = user?.role == 'student';
	const [filters, setFilters] = useState<PeriodicReportFilters>({
		academicYear: '',
		period: '',
		session: '',
		gradeLevel: '',
		className: '',
		selectedStudents: [],
	});

	const studentAccessOptions = useMemo(() => {
		if (!isStudent || !currentSchool) return [];
		return getStudentAllowedAccess(user, currentSchool);
	}, [isStudent, user, currentSchool]);

	// Extract and flatten all available periods
	const allowedPeriods = studentAccessOptions
		.map((year: any) => year.periods || [])
		.flat();

	const handleFilterSubmit = useCallback((students?: Student[]) => {
		setActiveStudents(students || []);
		setShowReport(true);
	}, []);

	const handleBack = useCallback(() => {
		setShowReport(false);
		setActiveStudents([]);
	}, []);

	// 1. Calculate the allowed periods for the SPECIFICALLY selected year
	const allowedPeriodsForSelectedYear = useMemo(() => {
		if (!isStudent) return []; // Non-students bypass this check

		const currentYearAccess = studentAccessOptions.find((opt: any) =>
			areAcademicYearsEqual(opt.academicYear, filters.academicYear),
		);
		return currentYearAccess?.periods || [];
	}, [isStudent, studentAccessOptions, filters.academicYear]); // <-- Depends on filters.academicYear

	// 2. Update your filterConfig to filter the options array
	const filterConfig: FilterConfig<PeriodicReportFilters> = useMemo(
		() => ({
			gradeLevelField: 'gradeLevel',
			extraFilter: {
				field: 'period',
				label: 'Period',
				options: periodOptions
					// Filter the base options to only include what the student has access to
					.filter(
						(p) =>
							!isStudent || allowedPeriodsForSelectedYear.includes(p.value),
					)
					.map((p) => ({ value: p.value, label: p.label })),
			},
			// ... [Keep your other existing config properties]
		}),
		[isStudent, allowedPeriodsForSelectedYear], // <-- Add the allowed periods to dependencies
	);

	const filterContent = useMemo(
		() => (
			<SharedFilter
				filters={filters}
				setFilters={setFilters}
				onSubmit={handleFilterSubmit}
				config={filterConfig}
				reportType="periodic"
			/>
		),
		[filters, handleFilterSubmit, filterConfig],
	);

	const reportContent = useMemo(() => {
		if (!showReport) return null;
		const filterKey = `${filters.academicYear}-${filters.period}-${filters.session}-${filters.gradeLevel}-${filters.className}-${filters.selectedStudents.join(',')}`;

		return (
			<ReportContent
				key={filterKey}
				reportFilters={filters}
				activeStudents={activeStudents}
				onBack={handleBack}
			/>
		);
	}, [showReport, filters, activeStudents, handleBack]);

	// Block if the user is a student and they have zero periods available
	if (isStudent && allowedPeriods.length === 0) {
		return (
			<AccessDenied message="You are currently not allowed to view periodic reports" />
		);
	}

	return (
		<div className="w-full h-screen bg-background">
			{!showReport ? filterContent : reportContent}
		</div>
	);
}