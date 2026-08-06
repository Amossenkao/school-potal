'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { ArrowLeft, Download, GraduationCap, Loader2, ShieldCheck, X } from 'lucide-react';
import {
	SharedFilter,
	type Student as FilterStudent,
} from '@/app/dashboard/shared/components/SharedFilter';
import { PageLoading } from '@/components/loading';
import { DatePicker } from '@/components/ui/DateRangePicker';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { isStudentRole } from '@/utils/effectiveRole';
import {
	DEFAULT_DOCUMENT_FILTERS,
	documentFilterConfig,
	resolveDocumentStudents,
	type DocumentFilters,
} from '@/app/dashboard/shared/documentFilters';
import { buildStudentFullName, normalizeStudentId } from '@/app/dashboard/digital-id/verification';
import { resolveSignatory } from '@/utils/documentSignatory';
import { computeFeeBalance } from '@/utils/documentVerification';
import {
	GraduationClearanceDocument,
	type GraduationClearanceData,
} from '@/components/graduationClearance/GraduationClearancePDF';

export default function GraduationClearancePage() {
	const school = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore((state) => state.usersByAcademicYear);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
	const user = useAuth((state) => state.user);
	const isStudent = isStudentRole(user?.role);

	const [filters, setFilters] = useState<DocumentFilters>(DEFAULT_DOCUMENT_FILTERS);
	const [students, setStudents] = useState<any[]>([]);
	const [step, setStep] = useState<'filter' | 'setup' | 'documents'>('filter');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	// ── Setup: which fees count as "graduation fees", and the narrative facts
	// that aren't real financial records (dates, penalty) ──────────────────
	const categories = useMemo(
		() => school?.financialConfig?.paymentCategories || [],
		[school],
	);
	const [categoryId, setCategoryId] = useState('');
	const [graduationYear, setGraduationYear] = useState('');
	const [paymentDeadline, setPaymentDeadline] = useState('');
	const [ceremonyDate, setCeremonyDate] = useState('');
	const [lateFeeAmount, setLateFeeAmount] = useState('');
	const [lateFeeCurrency, setLateFeeCurrency] = useState('USD');
	const [lateFeeCutoff, setLateFeeCutoff] = useState('');
	const [finalCutoff, setFinalCutoff] = useState('');

	useEffect(() => {
		if (categoryId || categories.length === 0) return;
		const graduationCategory = categories.find((c: any) =>
			String(c?.name || '').toLowerCase().includes('graduation'),
		);
		setCategoryId((graduationCategory || categories[0])?.id || '');
	}, [categories, categoryId]);

	useEffect(() => {
		if (!graduationYear) setGraduationYear(String(new Date().getFullYear()));
	}, [graduationYear]);

	const currencies = useMemo(
		() => school?.financialConfig?.currencies || [],
		[school],
	);

	const [selectedStudentId, setSelectedStudentId] = useState('');
	const [documentByStudent, setDocumentByStudent] = useState<
		Record<string, GraduationClearanceData>
	>({});
	const [preparing, setPreparing] = useState(false);
	const [downloading, setDownloading] = useState(false);

	const handleFilterSubmit = useCallback(
		async (_activeStudents?: FilterStudent[]) => {
			if (!filters.className) return;
			setLoading(true);
			setError('');
			try {
				const records = await resolveDocumentStudents({
					filters,
					isStudent,
					user,
					school,
					usersByAcademicYear,
					setUsersForYear,
				});
				if (records.length === 0) {
					setError('No students found for the selected class.');
					return;
				}
				setStudents(records);
				setStep('setup');
			} catch (e) {
				setError(e instanceof Error ? e.message : 'Failed to load students.');
			} finally {
				setLoading(false);
			}
		},
		[filters, isStudent, user, usersByAcademicYear, setUsersForYear, school],
	);

	const handleBack = useCallback(() => {
		setStep('filter');
		setError('');
	}, []);

	/**
	 * Builds one real, verifiable document per selected student: real
	 * graduation-fee items (§ utils/documentVerification, scoped to the chosen
	 * category), the real unscoped balance across every required fee, and a QR
	 * pointed at `/verify` carrying the narrative fields on the URL itself
	 * (nothing about them is persisted anywhere else to look up later).
	 */
	const handlePrepare = useCallback(async () => {
		setError('');
		setPreparing(true);
		try {
			const principal = resolveSignatory(school, usersByAcademicYear, filters.academicYear, 'principal');
			const built: Record<string, GraduationClearanceData> = {};

			await Promise.all(
				students.map(async (student) => {
					const studentId = normalizeStudentId(student.studentId, student.id, student._id);
					if (!studentId) return;

					const res = await fetch(`/api/payments?studentId=${encodeURIComponent(studentId)}`);
					const json = await res.json();
					const payments = json?.success ? json.data.payments : [];

					const graduationBalance = categoryId
						? computeFeeBalance(student, school, filters.academicYear, student.classId, payments, {
								categoryId,
							})
						: null;
					const overallBalance = computeFeeBalance(
						student,
						school,
						filters.academicYear,
						student.classId,
						payments,
					);

					const verifyUrl = `${window.location.origin}/verify?id=${encodeURIComponent(
						studentId,
					)}&academicYear=${encodeURIComponent(filters.academicYear)}&type=graduation_clearance&categoryId=${encodeURIComponent(categoryId)}&deadline=${encodeURIComponent(paymentDeadline)}&ceremony=${encodeURIComponent(ceremonyDate)}&lateFee=${encodeURIComponent(lateFeeAmount)}&lateFeeCurrency=${encodeURIComponent(lateFeeCurrency)}&lateFeeCutoff=${encodeURIComponent(lateFeeCutoff)}&finalCutoff=${encodeURIComponent(finalCutoff)}`;
					const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
						errorCorrectionLevel: 'M',
						margin: 1,
						width: 256,
						color: { dark: '#111111', light: '#FFFFFF' },
					}).catch(() => null);

					built[studentId] = {
						studentName: student.fullName || buildStudentFullName(student) || '—',
						className: student.className || '',
						academicYear: filters.academicYear,
						date: new Date().toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'long',
							day: 'numeric',
						}),
						graduationYear,
						items: graduationBalance
							? graduationBalance.lines.map((line) => ({
									label: line.feeName,
									amount: line.expected,
									currency: line.currency,
								}))
							: [],
						totalsByCurrency: graduationBalance?.expectedByCurrency || {},
						paymentDeadline,
						ceremonyDate,
						lateFeeAmount,
						lateFeeCurrency,
						lateFeeCutoff,
						finalCutoff,
						outstandingByCurrency: overallBalance.outstandingByCurrency,
						principal,
						qrDataUrl,
						verifyUrl,
					};
				}),
			);

			setDocumentByStudent(built);
			setStep('documents');
			setSelectedStudentId((prev) => {
				const ids = Object.keys(built);
				return ids.includes(prev) ? prev : ids[0] || '';
			});
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Failed to prepare clearances.');
		} finally {
			setPreparing(false);
		}
	}, [
		students,
		school,
		usersByAcademicYear,
		filters.academicYear,
		categoryId,
		graduationYear,
		paymentDeadline,
		ceremonyDate,
		lateFeeAmount,
		lateFeeCurrency,
		lateFeeCutoff,
		finalCutoff,
	]);

	const selectedData = selectedStudentId ? documentByStudent[selectedStudentId] : null;

	const handleDownload = useCallback(async () => {
		if (!selectedData) return;
		setDownloading(true);
		try {
			const blob = await pdf(
				<GraduationClearanceDocument data={selectedData} school={school} />,
			).toBlob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `Graduation_Clearance_${selectedData.studentName.replace(/\s+/g, '_')}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		} catch (e) {
			console.error('Graduation clearance PDF generation failed:', e);
			alert('Could not generate the clearance PDF. Please try again.');
		} finally {
			setDownloading(false);
		}
	}, [selectedData, school]);

	if (step === 'filter') {
		return (
			<div className="p-4">
				{error && (
					<div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						<span>{error}</span>
						<button type="button" onClick={() => setError('')} aria-label="Dismiss error">
							<X className="h-4 w-4" />
						</button>
					</div>
				)}
				{loading ? (
					<PageLoading fullScreen={false} variant="minimal" size="sm" message="Loading students…" />
				) : (
					<SharedFilter<DocumentFilters>
						filters={filters}
						setFilters={setFilters}
						onSubmit={handleFilterSubmit}
						config={documentFilterConfig}
					/>
				)}
			</div>
		);
	}

	if (step === 'setup') {
		return (
			<div className="mx-auto max-w-2xl space-y-5 p-4">
				<button
					type="button"
					onClick={handleBack}
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to filters
				</button>

				<div>
					<h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
						<GraduationCap className="h-5 w-5 text-primary" />
						Graduation Clearance setup
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Set once for this batch of {students.length} student
						{students.length === 1 ? '' : 's'}. The fee items and total come from
						real fee-schedule data; the dates below are printed as given.
					</p>
				</div>

				{error && (
					<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{error}
					</div>
				)}

				<div className="space-y-4 rounded-2xl border border-border bg-card p-4">
					<label className="block space-y-1.5">
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							Graduation fee category
						</span>
						<select
							value={categoryId}
							onChange={(e) => setCategoryId(e.target.value)}
							className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="">No fee items — dates only</option>
							{categories.map((c: any) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
						<span className="block text-[11px] text-muted-foreground">
							Each student&apos;s real fees under this category become the letter&apos;s
							itemized list and total — scholarships are already reflected.
						</span>
					</label>

					<label className="block space-y-1.5">
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							Graduation year (for the letter title)
						</span>
						<input
							type="text"
							value={graduationYear}
							onChange={(e) => setGraduationYear(e.target.value)}
							placeholder="2026"
							className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</label>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
								Payment deadline
							</span>
							<DatePicker value={paymentDeadline} onChange={setPaymentDeadline} placeholder="Pick a date" />
						</div>
						<div className="space-y-1.5">
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
								Ceremony date
							</span>
							<DatePicker value={ceremonyDate} onChange={setCeremonyDate} placeholder="Pick a date" />
						</div>
						<div className="space-y-1.5">
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
								Late-fee cutoff
							</span>
							<DatePicker value={lateFeeCutoff} onChange={setLateFeeCutoff} placeholder="Pick a date" />
						</div>
						<div className="space-y-1.5">
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
								Absolute final cutoff
							</span>
							<DatePicker value={finalCutoff} onChange={setFinalCutoff} placeholder="Pick a date" />
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<label className="block space-y-1.5">
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
								Late fee amount
							</span>
							<input
								type="number"
								min="0"
								value={lateFeeAmount}
								onChange={(e) => setLateFeeAmount(e.target.value)}
								placeholder="10"
								className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</label>
						<label className="block space-y-1.5">
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
								Currency
							</span>
							<select
								value={lateFeeCurrency}
								onChange={(e) => setLateFeeCurrency(e.target.value)}
								className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							>
								{(currencies.length > 0 ? currencies : [{ code: 'USD' }, { code: 'LRD' }]).map(
									(c: any) => (
										<option key={c.code} value={c.code}>
											{c.code}
										</option>
									),
								)}
							</select>
						</label>
					</div>
				</div>

				<button
					type="button"
					onClick={handlePrepare}
					disabled={preparing}
					className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
				>
					{preparing ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" /> Checking real balances…
						</>
					) : (
						<>Generate {students.length} letter{students.length === 1 ? '' : 's'}</>
					)}
				</button>
			</div>
		);
	}

	const studentIds = Object.keys(documentByStudent);

	return (
		<div className="p-4">
			<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
				<div>
					<button
						type="button"
						onClick={() => setStep('setup')}
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to setup
					</button>
					<h1 className="mt-1 text-xl font-semibold text-foreground">Graduation Clearance</h1>
					<p className="text-sm text-muted-foreground">
						{studentIds.length} letter{studentIds.length === 1 ? '' : 's'} · {filters.academicYear}
					</p>
				</div>
			</div>

			<div className="flex flex-col gap-5 lg:flex-row">
				<div className="w-full flex-shrink-0 lg:w-72">
					<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
						Students
					</p>
					<div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0">
						{studentIds.map((id) => {
							const doc = documentByStudent[id];
							const cleared = Object.values(doc.outstandingByCurrency).every((v) => v <= 0);
							const isActive = id === selectedStudentId;
							return (
								<button
									type="button"
									key={id}
									onClick={() => setSelectedStudentId(id)}
									className={`flex min-w-0 flex-shrink-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors lg:w-full ${
										isActive
											? 'border-primary/40 bg-primary/10 text-primary'
											: 'border-border bg-card text-foreground hover:bg-muted'
									}`}
								>
									<span className="min-w-0">
										<span className="block truncate text-sm font-medium">{doc.studentName}</span>
										<span className="block truncate font-mono text-[11px] text-muted-foreground">{id}</span>
									</span>
									<span
										className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
											cleared
												? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
												: 'bg-destructive/10 text-destructive'
										}`}
									>
										{cleared ? 'Clear' : 'Balance'}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				<div className="min-w-0 flex-1">
					<div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
						<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
							<div className="min-w-0">
								<p className="truncate text-sm font-semibold text-foreground">
									{selectedData?.studentName || '—'}
								</p>
								<p className="text-xs text-muted-foreground">Letter preview · {filters.academicYear}</p>
							</div>
							<button
								type="button"
								onClick={handleDownload}
								disabled={downloading || !selectedData?.qrDataUrl}
								className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
							>
								<Download className="h-4 w-4" />
								{downloading ? 'Preparing…' : 'Download PDF'}
							</button>
						</div>

						{selectedData ? (
							<Suspense
								fallback={
									<div className="flex h-[600px] items-center justify-center text-sm text-muted-foreground">
										Loading letter preview…
									</div>
								}
							>
								<PDFViewer width="100%" height="700">
									<GraduationClearanceDocument data={selectedData} school={school} />
								</PDFViewer>
							</Suspense>
						) : (
							<div className="flex h-[600px] items-center justify-center text-sm text-muted-foreground">
								Select a student to preview their letter.
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
				<ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
				<p className="text-xs leading-relaxed text-muted-foreground">
					Each letter&apos;s balance is real, computed from actual fee and payment
					records — not asserted. Scanning its QR recomputes the same figures live,
					so the letter can never claim a balance the school&apos;s own records
					contradict.
				</p>
			</div>
		</div>
	);
}
