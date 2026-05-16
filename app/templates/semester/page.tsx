'use client';
import React, {
	useMemo,
	useEffect,
	useRef,
	useState,
	useCallback,
} from 'react';
import { pdf } from '@react-pdf/renderer';
import { useSchoolStore } from '@/store/schoolStore';
import {
	ReportFilters,
	SemesterReport,
	StudentSemesterReport,
} from './SemesterReport';
import { PageLoading } from '@/components/loading';

interface TemplateFilters {
	session: string;
	classLevel: string;
}

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

const FilterContent = React.memo(function FilterContent({
	school,
	filters,
	setFilters,
	onSubmit,
}: {
	school: any;
	filters: TemplateFilters;
	setFilters: React.Dispatch<React.SetStateAction<TemplateFilters>>;
	onSubmit: () => void;
}) {
	const availableSessions = useMemo(
		() => (school?.classLevels ? Object.keys(school.classLevels) : []),
		[school],
	);

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
		const levels = school?.classLevels?.[resolvedSession];
		return levels ? Object.keys(levels) : [];
	}, [school, resolvedSession]);

	useEffect(() => {
		if (!filters.classLevel && availableGradeLevels.length === 1) {
			setFilters((prev) => ({ ...prev, classLevel: availableGradeLevels[0] }));
		}
	}, [availableGradeLevels, filters.classLevel, setFilters]);

	const canSubmit = !!(resolvedSession && filters.classLevel);

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] py-10">
			<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
				<h2 className="text-lg font-semibold mb-4 text-center">
					Template Filters
				</h2>

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

export default function SemesterTemplatePage() {
	const school = useSchoolStore((state) => state.school);
	const [filters, setFilters] = useState<TemplateFilters>({
		session: '',
		classLevel: '',
	});
	const [reportStep, setReportStep] = useState(0);

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
			semester: 'first',
		}),
		[resolvedSession, filters.classLevel],
	);

	const pdfDocument = useMemo(() => {
		if (!school || reportStep === 0) return null;
		return (
			<SemesterReport
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
		const schoolSlug = slugify(school?.shortName || school?.host || 'school');
		const sessionSlug = slugify(
			resolvedSession || filters.session || 'session',
		);
		const classLevelSlug = slugify(filters.classLevel || 'class_level');
		return `${schoolSlug}_${sessionSlug}_${classLevelSlug}_semester_report.pdf`;
	}, [
		school?.shortName,
		school?.host,
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

	if (!school) {
		return PageLoading;
	}

	return (
		<div className="p-4">
			{reportStep === 0 ? (
				<FilterContent
					school={school}
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
