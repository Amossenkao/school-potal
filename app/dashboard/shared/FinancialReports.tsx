'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
	AlertTriangle,
	Calendar,
	ChevronDown,
	DollarSign,
	GraduationCap,
	Landmark,
	Layers,
	Loader2,
	PieChart,
	Receipt,
	School,
	Users,
} from 'lucide-react';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';
import { buildSchoolAcademicYearRange } from '@/utils/academicYearOptions';
import {
	buildFinancialReport,
	formatAmount,
	percentOf,
	type AmountRow,
	type CategoryRow,
	type ClassRow,
	type CurrencyReport,
} from '@/utils/financialReport';

// react-pdf pulls in a large renderer bundle; keep it out of the initial chunk.
const FinancialReportPDF = dynamic(() => import('./FinancialReportPDF'), {
	ssr: false,
	loading: () => (
		<span className="inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-muted-foreground">
			<Loader2 className="h-4 w-4 animate-spin" />
			Preparing PDF…
		</span>
	),
});

const sameYear = (a?: string, b?: string) =>
	(a || '').replace(/\//g, '-') === (b || '').replace(/\//g, '-');

function pickYearScoped<T>(
	map: Record<string, T> | undefined | null,
	year: string,
): T | undefined {
	if (!map || !year) return undefined;
	return map[year] ?? Object.entries(map).find(([key]) => sameYear(key, year))?.[1];
}

const ALL = 'all';

/** Green / amber / red band shared by every progress affordance on the page. */
const toneFor = (rate: number) =>
	rate >= 80 ? 'good' : rate >= 50 ? 'warn' : 'bad';

const TONE_TEXT = {
	good: 'text-emerald-600 dark:text-emerald-400',
	warn: 'text-amber-600 dark:text-amber-400',
	bad: 'text-rose-600 dark:text-rose-400',
} as const;

const TONE_BAR = {
	good: 'bg-emerald-500',
	warn: 'bg-amber-500',
	bad: 'bg-rose-500',
} as const;

const TONE_STROKE = {
	good: 'stroke-emerald-500',
	warn: 'stroke-amber-500',
	bad: 'stroke-rose-500',
} as const;

const TONE_CHIP = {
	good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
	warn: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
	bad: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
} as const;

/* ── Presentational primitives ─────────────────────────────────────────── */

// Rendered with spans rather than divs: these tracks also appear inside the
// accordion header buttons, whose content model is phrasing only.
function Track({ value, max }: { value: number; max: number }) {
	const rate = percentOf(value, max);
	return (
		<span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
			<span
				className={`block h-full rounded-full transition-[width] duration-700 ease-out ${TONE_BAR[toneFor(rate)]}`}
				style={{ width: `${Math.min(100, rate)}%` }}
			/>
		</span>
	);
}

function RateChip({ value }: { value: number }) {
	return (
		<span
			className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${TONE_CHIP[toneFor(value)]}`}
		>
			{value}%
		</span>
	);
}

/** Radial collection gauge — the page's one big visual anchor. */
function Gauge({
	rate,
	label,
	size = 128,
}: {
	rate: number;
	label: string;
	size?: number;
}) {
	const stroke = 10;
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const filled = (Math.min(100, Math.max(0, rate)) / 100) * circumference;
	return (
		<div className="relative shrink-0" style={{ width: size, height: size }}>
			<svg width={size} height={size} className="-rotate-90">
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					strokeWidth={stroke}
					className="stroke-muted"
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					strokeWidth={stroke}
					strokeLinecap="round"
					strokeDasharray={`${filled} ${circumference}`}
					className={`${TONE_STROKE[toneFor(rate)]} transition-[stroke-dasharray] duration-700 ease-out`}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<span
					className={`text-2xl font-black tabular-nums ${TONE_TEXT[toneFor(rate)]}`}
				>
					{rate}%
				</span>
				<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
					{label}
				</span>
			</div>
		</div>
	);
}

function StatCard({
	label,
	icon: Icon,
	hint,
	accent = 'bg-muted',
	children,
}: {
	label: string;
	icon: any;
	hint?: string;
	accent?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5">
			<div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
			<div className="flex items-start justify-between gap-2">
				<p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
					{label}
				</p>
				<span className="rounded-lg bg-muted p-1.5">
					<Icon className="h-4 w-4 text-muted-foreground" />
				</span>
			</div>
			<div className="mt-3">{children}</div>
			{hint && (
				<p className="mt-2 text-[11px] font-medium text-muted-foreground">{hint}</p>
			)}
		</div>
	);
}

/** Per-currency amount lines inside a stat card. */
function CurrencyLines({
	currencies,
	pick,
}: {
	currencies: CurrencyReport[];
	pick: (currency: CurrencyReport) => number;
}) {
	if (currencies.length === 0) {
		return <p className="text-2xl font-black text-muted-foreground">—</p>;
	}
	return (
		<div className="space-y-1">
			{currencies.map((currency) => (
				<div key={currency.code} className="flex items-baseline gap-2">
					<span className="w-9 shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
						{currency.code}
					</span>
					<span className="min-w-0 flex-1 truncate text-xl font-black tabular-nums text-foreground sm:text-2xl">
						{formatAmount(pick(currency))}
					</span>
				</div>
			))}
		</div>
	);
}

function Panel({
	title,
	description,
	icon: Icon,
	action,
	children,
}: {
	title: string;
	description?: string;
	icon?: any;
	action?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-2xl border border-border bg-card">
			<header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
				<div className="flex min-w-0 items-start gap-3">
					{Icon && (
						<span className="mt-0.5 rounded-xl bg-muted p-2">
							<Icon className="h-4 w-4 text-muted-foreground" />
						</span>
					)}
					<div className="min-w-0">
						<h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
							{title}
						</h2>
						{description && (
							<p className="text-xs text-muted-foreground">{description}</p>
						)}
					</div>
				</div>
				{action}
			</header>
			<div className="p-4 sm:p-5">{children}</div>
		</section>
	);
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
			<p className="text-sm text-muted-foreground">{message}</p>
		</div>
	);
}

/**
 * Expected / Collected / Outstanding shown as one unit. Collapses to a single
 * column on narrow screens instead of letting long figures wrap mid-number.
 */
function MetricTrio({
	expected,
	collected,
	outstanding,
	compact = false,
}: {
	expected: number;
	collected: number;
	outstanding: number;
	compact?: boolean;
}) {
	const cells = [
		{ label: 'Expected', value: expected, className: 'text-foreground' },
		{
			label: 'Collected',
			value: collected,
			className: 'text-emerald-600 dark:text-emerald-400',
		},
		{
			label: 'Outstanding',
			value: outstanding,
			className:
				outstanding > 0
					? 'text-rose-600 dark:text-rose-400'
					: 'text-emerald-600 dark:text-emerald-400',
		},
	];
	return (
		<span className="grid grid-cols-3 gap-x-3 gap-y-1">
			{cells.map((cell) => (
				<span key={cell.label} className="block min-w-0">
					<span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						{cell.label}
					</span>
					<span
						className={`block truncate font-black tabular-nums ${compact ? 'text-sm' : 'text-sm sm:text-base'} ${cell.className}`}
					>
						{formatAmount(cell.value)}
					</span>
				</span>
			))}
		</span>
	);
}

function Accordion({
	open,
	onToggle,
	title,
	children,
}: {
	open: boolean;
	onToggle: () => void;
	title: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div
			className={`overflow-hidden rounded-xl border transition-colors ${
				open ? 'border-primary/30 bg-muted/30' : 'border-border bg-card'
			}`}
		>
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={open}
				className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/50 sm:px-4"
			>
				<span className="min-w-0 flex-1">{title}</span>
				<ChevronDown
					className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
				/>
			</button>
			{open && (
				<div className="border-t border-border px-3 py-4 sm:px-4">{children}</div>
			)}
		</div>
	);
}

function CategoryList({ categories }: { categories: CategoryRow[] }) {
	if (categories.length === 0) return null;
	return (
		<div className="mt-4">
			<h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
				Fee Breakdown
			</h4>
			<ul className="divide-y divide-border rounded-xl border border-border bg-card">
				{categories.map((category) => (
					<li key={category.key} className="p-3">
						<div className="flex items-start justify-between gap-3">
							<p className="min-w-0 flex-1 break-words text-sm font-bold text-foreground">
								{category.label}
							</p>
							<RateChip value={category.rate} />
						</div>
						<div className="mt-2">
							<MetricTrio
								compact
								expected={category.expected}
								collected={category.collected}
								outstanding={category.outstanding}
							/>
							<div className="mt-2">
								<Track value={category.collected} max={category.expected} />
							</div>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}

interface FilterSelectProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: { label: string; value: string }[];
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
	return (
		<label className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none sm:basis-52">
			<span className="px-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
				{label}
			</span>
			<div className="relative">
				<select
					value={value}
					onChange={(event) => onChange(event.target.value)}
					className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-input bg-background pl-3 pr-8 text-sm text-foreground transition-colors hover:border-ring/50 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
				>
					{options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				<ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
			</div>
		</label>
	);
}

/* ── Tab bodies ────────────────────────────────────────────────────────── */

function OverviewTab({ currency }: { currency: CurrencyReport }) {
	if (currency.byFee.length === 0) {
		return <EmptyState message="No fee data available for this academic year." />;
	}
	const peak = currency.byFee.reduce(
		(max, row) => Math.max(max, row.expected, row.collected),
		0,
	);
	return (
		<ul className="grid gap-3 lg:grid-cols-2">
			{currency.byFee.map((row: AmountRow) => (
				<li
					key={row.key}
					className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
				>
					<div className="flex items-start justify-between gap-3">
						<p className="min-w-0 flex-1 break-words text-sm font-bold text-foreground">
							{row.label}
						</p>
						<RateChip value={row.rate} />
					</div>
					<div className="mt-3">
						<MetricTrio
							expected={row.expected}
							collected={row.collected}
							outstanding={row.outstanding}
						/>
					</div>
					{/* Bars are scaled against the largest fee so the reader can
					    compare fee sizes across cards, not just fill ratios. */}
					<div className="mt-3 space-y-1.5">
						<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-foreground/25"
								style={{ width: `${peak > 0 ? (row.expected / peak) * 100 : 0}%` }}
							/>
						</div>
						<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
							<div
								className={`h-full rounded-full ${TONE_BAR[toneFor(row.rate)]}`}
								style={{ width: `${peak > 0 ? (row.collected / peak) * 100 : 0}%` }}
							/>
						</div>
					</div>
				</li>
			))}
		</ul>
	);
}

function InstallmentsTab({
	currency,
	code,
}: {
	currency: CurrencyReport;
	code: string;
}) {
	const [openSession, setOpenSession] = useState<string | null>(null);
	const [openInstallment, setOpenInstallment] = useState<string | null>(null);
	const initialisedRef = useRef('');

	const sessions = useMemo(
		() =>
			currency.installmentsBySession.filter(
				(session) => session.installments.length > 0,
			),
		[currency.installmentsBySession],
	);

	// Open the first session whenever the currency (and so the data) changes.
	useEffect(() => {
		const key = `${code}:${sessions.map((session) => session.sessionName).join(',')}`;
		if (initialisedRef.current === key) return;
		initialisedRef.current = key;
		setOpenSession(sessions[0]?.sessionName ?? null);
		setOpenInstallment(null);
	}, [code, sessions]);

	if (sessions.length === 0) {
		return (
			<EmptyState message="No installment data available for this academic year." />
		);
	}

	return (
		<div className="space-y-3">
			{sessions.map((session) => (
				<Accordion
					key={session.sessionName}
					open={openSession === session.sessionName}
					onToggle={() => {
						setOpenSession((prev) =>
							prev === session.sessionName ? null : session.sessionName,
						);
						setOpenInstallment(null);
					}}
					title={
						<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
							<span className="flex items-center gap-2 font-bold">
								<School className="h-4 w-4 shrink-0 text-muted-foreground" />
								{session.sessionName}
							</span>
							<span className="text-xs font-medium text-muted-foreground">
								{session.installments.length} installment
								{session.installments.length === 1 ? '' : 's'}
							</span>
						</span>
					}
				>
					<div className="space-y-3">
						{session.installments.map((installment) => {
							const id = `${session.sessionName}:${installment.key}`;
							return (
								<Accordion
									key={id}
									open={openInstallment === id}
									onToggle={() =>
										setOpenInstallment((prev) => (prev === id ? null : id))
									}
									title={
										<span className="block space-y-2">
											<span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
												<span className="flex items-center gap-2 font-bold">
													<Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
													{installment.label}
												</span>
												<RateChip value={installment.rate} />
											</span>
											<MetricTrio
												compact
												expected={installment.expected}
												collected={installment.collected}
												outstanding={installment.outstanding}
											/>
											<Track
												value={installment.collected}
												max={installment.expected}
											/>
										</span>
									}
								>
									<div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
										<Gauge rate={installment.rate} label={code} />
										<div className="min-w-0 flex-1">
											<CategoryList categories={installment.categories} />
										</div>
									</div>
								</Accordion>
							);
						})}
					</div>
				</Accordion>
			))}
		</div>
	);
}

function ByClassTab({
	currency,
	code,
}: {
	currency: CurrencyReport;
	code: string;
}) {
	const [session, setSession] = useState(ALL);
	const [level, setLevel] = useState(ALL);
	const [classId, setClassId] = useState(ALL);
	const [openClassId, setOpenClassId] = useState<string | null>(null);
	const lastShownRef = useRef('');

	// byClass already arrives in the profile's session → level → class order,
	// so the filter options only need de-duplication, never re-sorting.
	const sessions = useMemo(
		() => Array.from(new Set(currency.byClass.map((row) => row.session))),
		[currency.byClass],
	);
	const levels = useMemo(
		() =>
			Array.from(
				new Set(
					currency.byClass
						.filter((row) => session === ALL || row.session === session)
						.map((row) => row.level),
				),
			),
		[currency.byClass, session],
	);
	const classes = useMemo(
		() =>
			currency.byClass.filter(
				(row) =>
					(session === ALL || row.session === session) &&
					(level === ALL || row.level === level),
			),
		[currency.byClass, session, level],
	);
	const shown = useMemo(
		() => classes.filter((row) => classId === ALL || row.classId === classId),
		[classes, classId],
	);

	// A single filtered class opens by default; otherwise start collapsed.
	useEffect(() => {
		const key = shown.map((row) => row.classId).join(',');
		if (lastShownRef.current === key) return;
		lastShownRef.current = key;
		setOpenClassId(shown.length === 1 ? shown[0].classId : null);
	}, [shown]);

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/40 p-3">
				<FilterSelect
					label="Session"
					value={session}
					onChange={(value) => {
						setSession(value);
						setLevel(ALL);
						setClassId(ALL);
					}}
					options={[
						{ label: 'All Sessions', value: ALL },
						...sessions.map((name) => ({ label: name, value: name })),
					]}
				/>
				<FilterSelect
					label="Division / Level"
					value={level}
					onChange={(value) => {
						setLevel(value);
						setClassId(ALL);
					}}
					options={[
						{ label: 'All Levels', value: ALL },
						...levels.map((name) => ({ label: name, value: name })),
					]}
				/>
				<FilterSelect
					label="Class"
					value={classId}
					onChange={setClassId}
					options={[
						{ label: 'All Classes', value: ALL },
						...classes.map((row) => ({ label: row.label, value: row.classId })),
					]}
				/>
			</div>

			{shown.length === 0 ? (
				<EmptyState message="No class data matches these filters." />
			) : (
				<div className="space-y-3">
					{shown.map((row: ClassRow) => (
						<Accordion
							key={row.classId}
							open={openClassId === row.classId}
							onToggle={() =>
								setOpenClassId((prev) => (prev === row.classId ? null : row.classId))
							}
							title={
								<span className="block space-y-2">
									<span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
										<span className="flex min-w-0 items-center gap-2">
											<Users className="h-4 w-4 shrink-0 text-muted-foreground" />
											<span className="truncate font-bold">{row.label}</span>
											<span className="shrink-0 text-xs font-medium text-muted-foreground">
												{row.studentCount} student
												{row.studentCount === 1 ? '' : 's'}
											</span>
										</span>
										<RateChip value={row.rate} />
									</span>
									<MetricTrio
										compact
										expected={row.expected}
										collected={row.collected}
										outstanding={row.outstanding}
									/>
									<Track value={row.collected} max={row.expected} />
								</span>
							}
						>
							<div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
								<Gauge rate={row.rate} label={code} />
								<div className="min-w-0 flex-1">
									<dl className="grid grid-cols-2 gap-3 text-sm">
										<div className="rounded-lg bg-muted p-3">
											<dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
												Session
											</dt>
											<dd className="mt-0.5 truncate font-bold">{row.session}</dd>
										</div>
										<div className="rounded-lg bg-muted p-3">
											<dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
												Division / Level
											</dt>
											<dd className="mt-0.5 truncate font-bold">{row.level}</dd>
										</div>
									</dl>
									<CategoryList categories={row.categories} />
								</div>
							</div>
						</Accordion>
					))}
				</div>
			)}
		</div>
	);
}

/* ── Page ──────────────────────────────────────────────────────────────── */

const TABS = [
	{ id: 'overview', label: 'Overview', icon: PieChart },
	{ id: 'installments', label: 'Installments', icon: Layers },
	{ id: 'byClass', label: 'By Class', icon: Users },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function FinancialReports() {
	const user = useAuth((state) => state.user);
	const schoolProfile = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore((state) => state.usersByAcademicYear);
	const paymentsByAcademicYear = useSchoolStore(
		(state) => state.paymentsByAcademicYear,
	);

	const [selectedYear, setSelectedYear] = useState('');
	const [activeCurrency, setActiveCurrency] = useState('');
	const [activeTab, setActiveTab] = useState<TabId>('overview');

	const availableYears = useMemo(
		() => (schoolProfile ? buildSchoolAcademicYearRange(schoolProfile) : []),
		[schoolProfile],
	);

	const defaultYear = useMemo(
		() =>
			schoolProfile
				? getCurrentAcademicYearFromSchoolProfile(schoolProfile) || ''
				: '',
		[schoolProfile],
	);

	useEffect(() => {
		if (defaultYear && !selectedYear) setSelectedYear(defaultYear);
	}, [defaultYear, selectedYear]);

	const students = useMemo(() => {
		const yearData = pickYearScoped<any>(usersByAcademicYear, selectedYear);
		return Array.isArray(yearData?.students) ? yearData.students : [];
	}, [usersByAcademicYear, selectedYear]);

	const payments = useMemo(() => {
		const yearPayments = pickYearScoped<any[]>(paymentsByAcademicYear, selectedYear);
		return Array.isArray(yearPayments) ? yearPayments : [];
	}, [paymentsByAcademicYear, selectedYear]);

	// Single source of truth: the screen and the PDF read the same report, so
	// the expensive per-student fee resolution only runs once.
	const report = useMemo(
		() =>
			buildFinancialReport({
				schoolProfile,
				academicYear: selectedYear,
				students,
				payments,
			}),
		[schoolProfile, selectedYear, students, payments],
	);

	useEffect(() => {
		if (report.currencies.length === 0) {
			if (activeCurrency) setActiveCurrency('');
			return;
		}
		if (!report.currencies.some((currency) => currency.code === activeCurrency)) {
			setActiveCurrency(report.currencies[0].code);
		}
	}, [report.currencies, activeCurrency]);

	const currency =
		report.currencies.find((entry) => entry.code === activeCurrency) ||
		report.currencies[0];

	const preparedBy =
		(user as any)?.fullName ||
		`${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`.trim() ||
		'School Administration';

	if (!schoolProfile) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<div className="text-center">
					<Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-muted-foreground" />
					<p className="text-sm font-medium text-muted-foreground">
						Loading financial data…
					</p>
				</div>
			</div>
		);
	}

	const totalTransactions = report.currencies.reduce(
		(sum, entry) => sum + entry.summary.transactions,
		0,
	);
	const hasOutstanding = report.currencies.some(
		(entry) => entry.summary.outstanding > 0,
	);

	return (
		<div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
			{/* ── Header ──────────────────────────────────────────────────── */}
			<header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
				<div>
					<h1 className="text-2xl font-black tracking-tight sm:text-3xl">
						Financial Reports
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						School-wide financial insights and revenue analysis
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<label className="flex items-center gap-2">
						<Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
						<span className="sr-only">Academic year</span>
						<select
							value={selectedYear}
							disabled={availableYears.length < 2}
							onChange={(event) => setSelectedYear(event.target.value)}
							className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
						>
							{availableYears.length < 2 ? (
								<option value={selectedYear}>
									{selectedYear || availableYears[0] || 'No Academic Year'}
								</option>
							) : (
								availableYears.map((year) => (
									<option key={year} value={year}>
										{year}
									</option>
								))
							)}
						</select>
					</label>

					<FinancialReportPDF
						report={report}
						school={schoolProfile}
						preparedBy={preparedBy}
						disabled={report.currencies.length === 0}
					/>
				</div>
			</header>

			{/* ── Headline figures ────────────────────────────────────────── */}
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					label="Total Students"
					icon={GraduationCap}
					accent="bg-sky-500"
					hint={`Enrolled in ${selectedYear || '—'}`}
				>
					<p className="text-3xl font-black tabular-nums text-foreground">
						{report.studentsEnrolled}
					</p>
				</StatCard>
				<StatCard
					label="Expected Income"
					icon={DollarSign}
					accent="bg-indigo-500"
					hint="Based on fee schedule × students"
				>
					<CurrencyLines
						currencies={report.currencies}
						pick={(entry) => entry.summary.expected}
					/>
				</StatCard>
				<StatCard
					label="Total Collected"
					icon={Landmark}
					accent="bg-emerald-500"
					hint={`${totalTransactions} transaction${totalTransactions === 1 ? '' : 's'}`}
				>
					<CurrencyLines
						currencies={report.currencies}
						pick={(entry) => entry.summary.collected}
					/>
				</StatCard>
				<StatCard
					label="Outstanding Balance"
					icon={AlertTriangle}
					accent={hasOutstanding ? 'bg-rose-500' : 'bg-emerald-500'}
					hint="Expected minus collected"
				>
					<CurrencyLines
						currencies={report.currencies}
						pick={(entry) => entry.summary.outstanding}
					/>
				</StatCard>
			</div>

			{!currency ? (
				<EmptyState
					message={`No fee schedule or payment data available for ${selectedYear || 'the selected year'}.`}
				/>
			) : (
				<>
					{/* ── Collection progress ─────────────────────────────── */}
					<Panel
						title="Collection Progress"
						description="Collected vs expected for the selected year"
						icon={PieChart}
					>
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{report.currencies.map((entry) => (
								<div
									key={entry.code}
									className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-4"
								>
									<Gauge rate={entry.summary.rate} label={entry.code} size={104} />
									<div className="min-w-0 flex-1 space-y-2">
										<p className="truncate text-sm font-bold text-foreground">
											{entry.label}
										</p>
										<MetricTrio
											compact
											expected={entry.summary.expected}
											collected={entry.summary.collected}
											outstanding={entry.summary.outstanding}
										/>
										<Track
											value={entry.summary.collected}
											max={entry.summary.expected}
										/>
									</div>
								</div>
							))}
						</div>
					</Panel>

					{/* ── Detail tabs ─────────────────────────────────────── */}
					<div className="space-y-4">
						<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div
								role="tablist"
								aria-label="Financial report sections"
								className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-muted p-1"
							>
								{TABS.map((tab) => {
									const TabIcon = tab.icon;
									const selected = activeTab === tab.id;
									return (
										<button
											key={tab.id}
											role="tab"
											aria-selected={selected}
											onClick={() => setActiveTab(tab.id)}
											className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 ${
												selected
													? 'bg-card text-foreground shadow-sm'
													: 'text-muted-foreground hover:text-foreground'
											}`}
										>
											<TabIcon className="h-4 w-4 shrink-0" />
											<span className="truncate">{tab.label}</span>
										</button>
									);
								})}
							</div>

							{report.currencies.length > 1 && (
								<div className="flex items-center gap-2 overflow-x-auto">
									<span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
										Currency
									</span>
									<div className="flex gap-1 rounded-xl border border-border bg-muted p-1">
										{report.currencies.map((entry) => (
											<button
												key={entry.code}
												onClick={() => setActiveCurrency(entry.code)}
												className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
													entry.code === currency.code
														? 'bg-card text-foreground shadow-sm'
														: 'text-muted-foreground hover:text-foreground'
												}`}
											>
												{entry.code}
											</button>
										))}
									</div>
								</div>
							)}
						</div>

						<Panel
							title={
								activeTab === 'overview'
									? 'Fee Type Breakdown'
									: activeTab === 'installments'
										? 'Installment Schedule'
										: 'Class Breakdown'
							}
							description={
								activeTab === 'overview'
									? 'Expected and collected amounts grouped by fee type'
									: activeTab === 'installments'
										? 'Expected and collected amounts per installment, by session'
										: 'Expected and collected amounts per class'
							}
							icon={activeTab === 'installments' ? Layers : Receipt}
							action={
								<span className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
									{currency.code}
								</span>
							}
						>
							{/* Keyed so per-tab state (open accordions, class filters) resets
							    when the year or currency changes rather than pointing at
							    rows that no longer exist. */}
							{activeTab === 'overview' && <OverviewTab currency={currency} />}
							{activeTab === 'installments' && (
								<InstallmentsTab
									key={`${selectedYear}:${currency.code}`}
									currency={currency}
									code={currency.code}
								/>
							)}
							{activeTab === 'byClass' && (
								<ByClassTab
									key={`${selectedYear}:${currency.code}`}
									currency={currency}
									code={currency.code}
								/>
							)}
						</Panel>
					</div>
				</>
			)}
		</div>
	);
}
