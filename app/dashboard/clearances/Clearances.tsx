'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import {
	ArrowLeft,
	CheckCircle2,
	Download,
	FileWarning,
	Loader2,
	ShieldAlert,
	ShieldCheck,
	X,
} from 'lucide-react';
import {
	SharedFilter,
	type Student as FilterStudent,
} from '@/app/dashboard/shared/components/SharedFilter';
import { PageLoading } from '@/components/loading';
import {
	ClearanceDocument,
	type ClearanceStudentEntry,
	type ClearanceSchool,
} from '@/components/clearance/ClearancePDF';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { isStudentRole } from '@/utils/effectiveRole';
import { canAdministerPayments } from '@/utils/financialAccess';
import { computeFeeBalance, isFullyCleared } from '@/utils/documentVerification';
import { ACADEMIC_PERIODS, periodLabel } from '@/utils/academicPeriods';
import {
	DEFAULT_DOCUMENT_FILTERS,
	documentFilterConfig,
	resolveDocumentStudents,
	type DocumentFilters,
} from '@/app/dashboard/shared/documentFilters';
import { buildStudentFullName, normalizeStudentId } from '@/app/dashboard/digital-id/verification';
import { getFirstSchoolAddressLines } from '@/utils/schoolAddresses';

/**
 * Financial Clearance — exam-sitting slips backed by real payment records.
 *
 * The selection flow is the same session → level → class drill-down every
 * other document generator uses (`SharedFilter`), then a period and an
 * installment drawn from the school's own `financialConfig.installments`.
 * Slips are produced **only** for students who have genuinely cleared that
 * installment, so a printed slip is never an unchecked assertion; students
 * still owing are surfaced separately with the amount outstanding.
 */

interface ClearanceFilters extends DocumentFilters {
	period: string;
	installmentId: string;
}

const DEFAULT_FILTERS: ClearanceFilters = {
	...DEFAULT_DOCUMENT_FILTERS,
	period: '',
	installmentId: '',
};

interface NotClearedRow {
	name: string;
	studentId: string;
	outstanding: string;
}

const formatMoney = (value: number) =>
	(Number.isFinite(value) ? value : 0).toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const summariseOutstanding = (byCurrency: Record<string, number>) =>
	Object.entries(byCurrency)
		.filter(([, amount]) => amount > 0)
		.map(([currency, amount]) => `${currency} ${formatMoney(amount)}`)
		.join(', ') || '—';

export default function ClearancesPage() {
	const school = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore((state) => state.usersByAcademicYear);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
	const user = useAuth((state) => state.user);
	const isStudent = isStudentRole(user?.role);

	/**
	 * A slip asserts real payment status, so issuing one takes the same
	 * `record_payments` authority as recording or editing a payment — not
	 * merely reaching this page.
	 */
	const canGenerate = useMemo(
		() => canAdministerPayments(school as any, user),
		[school, user],
	);

	const installments = useMemo(
		() => school?.financialConfig?.installments || [],
		[school],
	);

	const [filters, setFilters] = useState<ClearanceFilters>(DEFAULT_FILTERS);
	const [isBlank, setIsBlank] = useState(false);
	const [step, setStep] = useState<'filter' | 'documents'>('filter');
	const [preparing, setPreparing] = useState(false);
	const [error, setError] = useState('');
	const [downloading, setDownloading] = useState(false);

	const [cleared, setCleared] = useState<ClearanceStudentEntry[]>([]);
	const [notCleared, setNotCleared] = useState<NotClearedRow[]>([]);

	const installmentLabel = useMemo(
		() =>
			installments.find((inst: any) => inst.id === filters.installmentId)?.label ||
			'selected installment',
		[installments, filters.installmentId],
	);

	const schoolMeta: ClearanceSchool = useMemo(
		() => ({
			name: school?.identity?.name || 'School',
			address: getFirstSchoolAddressLines(school?.contact?.addresses).join('\n'),
			contact: (school?.contact?.phones || []).join(' / '),
			logoUrl: school?.branding?.logoUrl || '',
			logoUrl2: school?.branding?.logoUrl2 || school?.branding?.logoUrl || '',
		}),
		[school],
	);

	/**
	 * Period and installment ride alongside the standard drill-down, plus the
	 * blank-slip switch. Rendered through `renderExtraFields` so this screen
	 * keeps the exact filter chrome every other document generator uses.
	 */
	const clearanceConfig = useMemo(
		() => ({
			...documentFilterConfig,
			nonStudentViewTitle: 'Financial Clearance',
			applyButtonText: isBlank ? 'Generate blank slips' : 'Check balances & generate',
			passStudentsToSubmit: true,
			// Slips go to whoever has cleared — not to a hand-picked subset.
			showStudentSelect: () => false,
			validateCanSubmit: (current: ClearanceFilters) =>
				isBlank
					? Boolean(current.period && current.installmentId)
					: Boolean(current.className && current.period && current.installmentId),
			renderExtraFields: (
				current: ClearanceFilters,
				setCurrent: React.Dispatch<React.SetStateAction<ClearanceFilters>>,
			) => (
				<div className="space-y-4">
					<label className="block space-y-1.5">
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							Exam period
						</span>
						<select
							value={current.period}
							onChange={(event) =>
								setCurrent((prev) => ({ ...prev, period: event.target.value }))
							}
							className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="">Select period</option>
							{ACADEMIC_PERIODS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</label>

					<label className="block space-y-1.5">
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							Cleared through installment
						</span>
						<select
							value={current.installmentId}
							onChange={(event) =>
								setCurrent((prev) => ({ ...prev, installmentId: event.target.value }))
							}
							disabled={installments.length === 0}
							className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
						>
							<option value="">Select installment</option>
							{installments.map((inst: any) => (
								<option key={inst.id} value={inst.id}>
									{inst.label}
									{inst.dueWindow ? ` — ${inst.dueWindow}` : ''}
								</option>
							))}
						</select>
						<span className="block text-[11px] text-muted-foreground">
							{installments.length === 0
								? 'No installments are configured in the school profile yet.'
								: 'Balances are checked cumulatively through this installment.'}
						</span>
					</label>

					<label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3">
						<span className="min-w-0">
							<span className="block text-sm font-bold text-foreground">
								Blank clearance
							</span>
							<span className="block text-[11px] text-muted-foreground">
								Print empty slips to fill in by hand — no balance check
							</span>
						</span>
						<button
							type="button"
							role="switch"
							aria-checked={isBlank}
							onClick={() => setIsBlank((on) => !on)}
							className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
								isBlank ? 'bg-primary' : 'bg-muted-foreground/30'
							}`}
						>
							<span
								className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
									isBlank ? 'translate-x-4' : 'translate-x-0.5'
								}`}
							/>
						</button>
					</label>
				</div>
			),
		}),
		[installments, isBlank],
	);

	const handleSubmit = useCallback(
		async (_activeStudents?: FilterStudent[]) => {
			setError('');

			if (isBlank) {
				setCleared([]);
				setNotCleared([]);
				setStep('documents');
				return;
			}

			setPreparing(true);
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

				const clearedEntries: ClearanceStudentEntry[] = [];
				const owingRows: NotClearedRow[] = [];

				await Promise.all(
					records.map(async (student: any) => {
						const studentId = normalizeStudentId(
							student.studentId,
							student.id,
							student._id,
						);
						if (!studentId) return;
						const name = student.fullName || buildStudentFullName(student) || studentId;

						const res = await fetch(
							`/api/payments?studentId=${encodeURIComponent(studentId)}`,
						);
						const json = await res.json();
						const payments = json?.success ? json.data.payments : [];

						const balance = computeFeeBalance(
							student,
							school,
							filters.academicYear,
							student.classId,
							payments,
							{ installmentId: filters.installmentId },
						);

						if (!isFullyCleared(balance)) {
							owingRows.push({
								name,
								studentId,
								outstanding: summariseOutstanding(balance.outstandingByCurrency),
							});
							return;
						}

						const verifyUrl = `${window.location.origin}/verify?id=${encodeURIComponent(
							studentId,
						)}&academicYear=${encodeURIComponent(
							filters.academicYear,
						)}&type=financial_clearance&period=${encodeURIComponent(
							filters.period,
						)}&installmentId=${encodeURIComponent(filters.installmentId)}`;
						const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
							errorCorrectionLevel: 'M',
							margin: 1,
							width: 200,
							color: { dark: '#111111', light: '#FFFFFF' },
						}).catch(() => null);

						clearedEntries.push({
							name,
							studentId,
							className: student.className || '',
							qrDataUrl,
							verifyUrl,
						});
					}),
				);

				clearedEntries.sort((a, b) => a.name.localeCompare(b.name));
				owingRows.sort((a, b) => a.name.localeCompare(b.name));

				setCleared(clearedEntries);
				setNotCleared(owingRows);
				setStep('documents');
			} catch (e) {
				setError(e instanceof Error ? e.message : 'Could not check payment records.');
			} finally {
				setPreparing(false);
			}
		},
		[filters, isBlank, isStudent, user, school, usersByAcademicYear, setUsersForYear],
	);

	const documentNode = useMemo(
		() => (
			<ClearanceDocument
				students={cleared}
				period={periodLabel(filters.period)}
				installment={installmentLabel}
				className={filters.className}
				academicYear={filters.academicYear}
				isBlank={isBlank}
				school={schoolMeta}
			/>
		),
		[cleared, filters, installmentLabel, isBlank, schoolMeta],
	);

	const handleDownload = useCallback(async () => {
		setDownloading(true);
		try {
			const blob = await pdf(documentNode).toBlob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = isBlank
				? 'Blank_Clearances.pdf'
				: `Financial_Clearance_${filters.className || 'class'}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		} catch (e) {
			console.error('Clearance PDF generation failed:', e);
			setError('Could not generate the clearance PDF. Please try again.');
		} finally {
			setDownloading(false);
		}
	}, [documentNode, isBlank, filters.className]);

	const errorBanner = error ? (
		<div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			<span>{error}</span>
			<button type="button" onClick={() => setError('')} aria-label="Dismiss error">
				<X className="h-4 w-4" />
			</button>
		</div>
	) : null;

	if (step === 'filter') {
		return (
			<div className="p-4">
				{errorBanner}

				{!canGenerate && (
					<div className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						<ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
						<p>
							You can view this page, but issuing a clearance requires the{' '}
							<span className="font-bold">record payments</span> permission.
						</p>
					</div>
				)}

				{preparing ? (
					<PageLoading
						fullScreen={false}
						variant="minimal"
						size="sm"
						message="Checking payment records…"
					/>
				) : (
					<SharedFilter<ClearanceFilters>
						filters={filters}
						setFilters={setFilters}
						onSubmit={canGenerate ? handleSubmit : () => undefined}
						config={clearanceConfig as any}
					/>
				)}
			</div>
		);
	}

	return (
		<div className="p-4">
			<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
				<div>
					<button
						type="button"
						onClick={() => setStep('filter')}
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to filters
					</button>
					<h1 className="mt-1 text-xl font-semibold text-foreground">
						Financial Clearance
					</h1>
					<p className="text-sm text-muted-foreground">
						{isBlank
							? 'Blank slips'
							: `${cleared.length} cleared · ${periodLabel(filters.period)} · ${installmentLabel}`}
					</p>
				</div>
				<button
					type="button"
					onClick={handleDownload}
					disabled={downloading || (!isBlank && cleared.length === 0)}
					className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
				>
					<Download className="h-4 w-4" />
					{downloading ? 'Preparing…' : 'Download PDF'}
				</button>
			</div>

			{errorBanner}

			{!isBlank && (
				<div className="mb-5 grid gap-4 sm:grid-cols-2">
					<div className="rounded-2xl border border-border bg-card p-4">
						<div className="flex items-start justify-between gap-2">
							<p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
								Cleared
							</p>
							<CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
						</div>
						<p className="mt-2 text-2xl font-black tabular-nums text-foreground">
							{cleared.length}
						</p>
						<p className="mt-1 text-[11px] font-medium text-muted-foreground">
							Slips will be printed for these students
						</p>
					</div>
					<div className="rounded-2xl border border-border bg-card p-4">
						<div className="flex items-start justify-between gap-2">
							<p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
								Not yet cleared
							</p>
							<FileWarning className="h-4 w-4 shrink-0 text-muted-foreground" />
						</div>
						<p className="mt-2 text-2xl font-black tabular-nums text-foreground">
							{notCleared.length}
						</p>
						<p className="mt-1 text-[11px] font-medium text-muted-foreground">
							Excluded — balance outstanding
						</p>
					</div>
				</div>
			)}

			{!isBlank && notCleared.length > 0 && (
				<div className="mb-5 overflow-hidden rounded-2xl border border-border bg-card">
					<div className="border-b border-border px-4 py-3">
						<p className="text-sm font-bold text-foreground">Excluded students</p>
						<p className="text-xs text-muted-foreground">
							No slip is issued while a balance remains through {installmentLabel}.
						</p>
					</div>
					<ul className="divide-y divide-border">
						{notCleared.map((row) => (
							<li
								key={row.studentId}
								className="flex items-center justify-between gap-3 px-4 py-2.5"
							>
								<span className="min-w-0">
									<span className="block truncate text-sm font-medium text-foreground">
										{row.name}
									</span>
									<span className="block truncate font-mono text-[11px] text-muted-foreground">
										{row.studentId}
									</span>
								</span>
								<span className="shrink-0 text-sm font-bold tabular-nums text-destructive">
									{row.outstanding}
								</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{!isBlank && cleared.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-16 text-center">
					<FileWarning className="h-8 w-8 text-muted-foreground/50" />
					<p className="text-sm font-bold text-foreground">No students have cleared yet</p>
					<p className="text-xs text-muted-foreground">
						Nobody in {filters.className || 'this class'} has settled {installmentLabel}.
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
					<Suspense
						fallback={
							<div className="flex h-[600px] items-center justify-center text-sm text-muted-foreground">
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Loading preview…
							</div>
						}
					>
						<PDFViewer width="100%" height="700">
							{documentNode}
						</PDFViewer>
					</Suspense>
				</div>
			)}

			<div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
				<ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
				<p className="text-xs leading-relaxed text-muted-foreground">
					Every slip is backed by a real balance check against the school&apos;s payment
					records, and carries a QR that recomputes that balance live. Students still
					owing are excluded rather than issued a slip that would misstate their status.
				</p>
			</div>
		</div>
	);
}
