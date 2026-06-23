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
// Import shared component, types, and constants
import {
	ReportCard,
	type StudentYearlyReport,
	type ReportFilters,
} from '@/components/templates/YearlyReport';

import {
	REPORT_CARD_THEMES,
	DEFAULT_REPORT_CARD_THEME,
} from '@/types/reportCardTheme';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface TemplateFilters {
	session: string;
	classLevel: string;
	themeId: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// FilterContent
// ─────────────────────────────────────────────

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
	const hasMultipleSessions = availableSessions.length > 1;

	// Auto-select when only one session
	useEffect(() => {
		if (!filters.session && availableSessions.length === 1) {
			setFilters((prev) => ({ ...prev, session: availableSessions[0] }));
		}
	}, [availableSessions, filters.session, setFilters]);

	const resolvedSession =
		filters.session ||
		(availableSessions.length === 1 ? availableSessions[0] : '');

	const availableGradeLevels = useMemo(() => {
		if (!resolvedSession || !school) return [];
		const levels = school?.classLevels?.[resolvedSession];
		return levels ? Object.keys(levels) : [];
	}, [school, resolvedSession]);

	useEffect(() => {
		if (!filters.classLevel && availableGradeLevels.length === 1) {
			setFilters((prev) => ({ ...prev, classLevel: availableGradeLevels[0] }));
		}
	}, [availableGradeLevels, filters.classLevel, setFilters]);

	const canSubmit = !!(
		resolvedSession &&
		filters.classLevel &&
		filters.themeId
	);

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] py-10">
			<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
				<h2 className="text-lg font-semibold mb-4 text-center">
					Template Filters
				</h2>

				{/* Session (only shown when multiple exist) */}
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
				)}

				{/* Class Level */}
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

				{/* Theme Selector */}
				<div className="mb-4">
					<label className="block text-sm font-medium mb-2">Theme</label>
					<div className="grid grid-cols-4 gap-2">
						{REPORT_CARD_THEMES.map((theme) => (
							<button
								key={theme.id}
								type="button"
								onClick={() =>
									setFilters((prev) => ({ ...prev, themeId: theme.id }))
								}
								className={`flex flex-col items-center gap-1 p-2 rounded border-2 transition-all text-xs font-medium ${
									filters.themeId === theme.id
										? 'border-primary ring-2 ring-primary/30 scale-105'
										: 'border-transparent hover:border-muted-foreground'
								}`}
								style={{
									background: `linear-gradient(135deg, ${theme.previewFrom}, ${theme.previewTo})`,
									color: theme.previewText,
								}}
							>
								<span className="text-lg leading-none">{theme.emoji}</span>
								<span>{theme.name}</span>
							</button>
						))}
					</div>
				</div>

				<div className="flex gap-2 mt-6">
					<button
						type="button"
						onClick={onSubmit}
						disabled={!canSubmit}
						className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
					>
						Generate Template
					</button>
				</div>
			</div>
		</div>
	);
});

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────

export default function ReportCardPage() {
	const school = useSchoolStore((state) => state.school);

	const [filters, setFilters] = useState<TemplateFilters>({
		session: '',
		classLevel: '',
		themeId: REPORT_CARD_THEMES[0].id,
	});

	const [reportStep, setReportStep] = useState(0);

	const resolvedSession = useMemo(() => {
		if (filters.session) return filters.session;
		const sessions = school?.classLevels ? Object.keys(school.classLevels) : [];
		return sessions.length === 1 ? sessions[0] : '';
	}, [filters.session, school]);

	const activeTheme = useMemo(
		() =>
			REPORT_CARD_THEMES.find((t) => t.id === filters.themeId) ??
			DEFAULT_REPORT_CARD_THEME,
		[filters.themeId],
	);

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
			session: resolvedSession,
			classLevel: filters.classLevel,
		};
		return (
			<ReportCard
				studentsData={studentsData}
				className=""
				classSubjects={subjectIds}
				reportFilters={reportFilters}
				school={school}
				classSponsor={undefined}
				activeTheme={activeTheme}
			/>
		);
	}, [
		school,
		reportStep,
		studentsData,
		subjectIds,
		resolvedSession,
		filters.classLevel,
		activeTheme,
	]);

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
		return `${schoolSlug}_${sessionSlug}_${classLevelSlug}_yearly_report.pdf`;
	}, [school, filters, resolvedSession, activeTheme]);

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
				if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
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

	const handleSubmitFilters = useCallback(() => setReportStep(1), []);
	const handleBackToFilters = useCallback(() => setReportStep(0), []);

	if (!school) {
		return (
			<div className="p-6 text-sm text-muted-foreground">
				No school data available. Please ensure a school is selected.
			</div>
		);
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
							← Back to Filters
						</button>
						<span
							className="text-xs px-3 py-1 rounded-full font-medium"
							style={{
								background: `linear-gradient(135deg, ${activeTheme.previewFrom}, ${activeTheme.previewTo})`,
								color: activeTheme.previewText,
							}}
						>
							{activeTheme.emoji} {activeTheme.name}
						</span>
						<button
							type="button"
							onClick={handleDownload}
							disabled={!downloadUrl || pdfGenerating}
							className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm disabled:opacity-50"
						>
							{pdfGenerating ? 'Generating PDF…' : 'Download Template'}
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
								Generating PDF…
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
