'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
	AlertTriangle,
	BarChart3,
	Calendar,
	GraduationCap,
	Landmark,
	Loader2,
	PiggyBank,
	Receipt,
	School,
	TrendingUp,
	Users,
	Wallet,
} from 'lucide-react';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';
import { buildSchoolAcademicYearRange } from '@/utils/academicYearOptions';
import {
	buildFinancialReport,
	formatAmount,
	percentOf,
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
	return (
		map[year] ??
		Object.entries(map).find(([key]) => sameYear(key, year))?.[1]
	);
}

/* ── Presentational primitives ─────────────────────────────────────────── */

function Bar({ value, max }: { value: number; max: number }) {
	const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;
	const ratio = percentOf(value, max);
	return (
		<div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
			<div
				className={`h-full rounded-full transition-all duration-700 ${
					ratio >= 80
						? 'bg-emerald-500'
						: ratio >= 50
							? 'bg-amber-500'
							: 'bg-rose-500'
				}`}
				style={{ width: `${width}%` }}
			/>
		</div>
	);
}

function RateBadge({ value }: { value: number }) {
	return (
		<span
			className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
				value >= 80
					? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
					: value >= 50
						? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
						: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
			}`}
		>
			{value}%
		</span>
	);
}

function StatCard({
	label,
	value,
	hint,
	icon: Icon,
	tone = 'default',
}: {
	label: string;
	value: string;
	hint?: string;
	icon: any;
	tone?: 'default' | 'positive' | 'negative';
}) {
	return (
		<div className="rounded-2xl border border-border bg-card p-5">
			<div className="flex items-start justify-between gap-2">
				<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
					{label}
				</p>
				<Icon
					className={`h-5 w-5 ${
						tone === 'positive'
							? 'text-emerald-500'
							: tone === 'negative'
								? 'text-rose-500'
								: 'text-muted-foreground'
					}`}
				/>
			</div>
			<p
				className={`mt-3 text-2xl font-black leading-tight ${
					tone === 'positive'
						? 'text-emerald-600 dark:text-emerald-400'
						: tone === 'negative'
							? 'text-rose-600 dark:text-rose-400'
							: 'text-foreground'
				}`}
			>
				{value}
			</p>
			{hint && (
				<p className="mt-1 text-xs font-medium text-muted-foreground">{hint}</p>
			)}
		</div>
	);
}

function Section({
	title,
	description,
	icon: Icon,
	children,
}: {
	title: string;
	description?: string;
	icon: any;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-2xl border border-border bg-card p-5">
			<div className="mb-4 flex items-start gap-3">
				<span className="mt-0.5 rounded-xl bg-muted p-2">
					<Icon className="h-4 w-4 text-muted-foreground" />
				</span>
				<div>
					<h2 className="text-lg font-bold tracking-tight text-foreground">
						{title}
					</h2>
					{description && (
						<p className="text-xs text-muted-foreground">{description}</p>
					)}
				</div>
			</div>
			{children}
		</section>
	);
}

function EmptyRow({ message }: { message: string }) {
	return <p className="py-4 text-sm text-muted-foreground">{message}</p>;
}

/**
 * Horizontally scrollable table shell — financial tables are wide and must
 * never make the page itself scroll sideways on mobile.
 */
function TableShell({
	headers,
	children,
}: {
	headers: { label: string; align?: 'left' | 'right' }[];
	children: React.ReactNode;
}) {
	return (
		<div className="overflow-x-auto rounded-xl border border-border">
			<table className="w-full min-w-[640px] text-sm">
				<thead className="bg-muted">
					<tr>
						{headers.map((header) => (
							<th
								key={header.label}
								className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${
									header.align === 'right' ? 'text-right' : 'text-left'
								}`}
							>
								{header.label}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-border">{children}</tbody>
			</table>
		</div>
	);
}

const money = (value: number) => formatAmount(value);

/* ── Currency report body ──────────────────────────────────────────────── */

function CurrencyReportView({
	currency,
	academicYear,
}: {
	currency: CurrencyReport;
	academicYear: string;
}) {
	const { summary } = currency;
	const peakMonth = currency.monthly.reduce(
		(max, row) => Math.max(max, row.amount),
		0,
	);
	const payerTotal =
		summary.studentsFullyPaid +
		summary.studentsPartiallyPaid +
		summary.studentsUnpaid;

	return (
		<div className="space-y-6">
			{/* ── Headline figures ──────────────────────────────────────── */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<StatCard
					label="Gross Assessed"
					value={`${currency.code} ${money(summary.gross)}`}
					hint="Billed before scholarships"
					icon={Receipt}
				/>
				<StatCard
					label="Scholarships & Waivers"
					value={`${currency.code} ${money(summary.discount)}`}
					hint={`${percentOf(summary.discount, summary.gross)}% of gross assessed`}
					icon={PiggyBank}
				/>
				<StatCard
					label="Net Expected Income"
					value={`${currency.code} ${money(summary.expected)}`}
					hint="Receivable for the year"
					icon={Wallet}
				/>
				<StatCard
					label="Total Collected"
					value={`${currency.code} ${money(summary.collected)}`}
					hint={`${summary.transactions} transaction${summary.transactions === 1 ? '' : 's'}`}
					icon={Landmark}
					tone="positive"
				/>
				<StatCard
					label="Outstanding Balance"
					value={`${currency.code} ${money(summary.outstanding)}`}
					hint="Expected minus collected"
					icon={AlertTriangle}
					tone={summary.outstanding > 0 ? 'negative' : 'positive'}
				/>
				<StatCard
					label="Collection Rate"
					value={`${summary.rate}%`}
					hint={`${summary.studentsFullyPaid} of ${summary.studentsBilled} students cleared`}
					icon={TrendingUp}
				/>
			</div>

			{/* ── Collection progress + payer status ────────────────────── */}
			<Section
				title="Collection Progress"
				description="How much of the year's receivable has been converted to cash"
				icon={TrendingUp}
			>
				<div className="flex flex-wrap items-center justify-between gap-2 text-sm">
					<span className="font-bold">{currency.code}</span>
					<span className="font-black text-foreground">
						{money(summary.collected)} / {money(summary.expected)}{' '}
						<RateBadge value={summary.rate} />
					</span>
				</div>
				<Bar value={summary.collected} max={summary.expected} />

				<div className="mt-6 grid gap-3 sm:grid-cols-3">
					{[
						{
							label: 'Fully paid',
							count: summary.studentsFullyPaid,
							className: 'text-emerald-600 dark:text-emerald-400',
						},
						{
							label: 'Partially paid',
							count: summary.studentsPartiallyPaid,
							className: 'text-amber-600 dark:text-amber-400',
						},
						{
							label: 'No payment yet',
							count: summary.studentsUnpaid,
							className: 'text-rose-600 dark:text-rose-400',
						},
					].map((item) => (
						<div key={item.label} className="rounded-xl bg-muted p-3">
							<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
								{item.label}
							</p>
							<p className={`mt-1 text-xl font-black ${item.className}`}>
								{item.count}
								<span className="ml-2 text-xs font-bold text-muted-foreground">
									{percentOf(item.count, payerTotal)}%
								</span>
							</p>
							<Bar value={item.count} max={payerTotal} />
						</div>
					))}
				</div>
			</Section>

			{/* ── Cash inflow ───────────────────────────────────────────── */}
			<Section
				title="Cash Inflow by Month"
				description="Fee collections received, in the order they arrived"
				icon={BarChart3}
			>
				{currency.monthly.length === 0 ? (
					<EmptyRow message={`No payments recorded for ${academicYear}.`} />
				) : (
					<>
						<div className="mb-5 flex items-end gap-2 overflow-x-auto pb-2">
							{currency.monthly.map((row) => (
								<div
									key={row.key}
									className="flex min-w-[54px] flex-1 flex-col items-center gap-1"
									title={`${row.label}: ${currency.code} ${money(row.amount)}`}
								>
									<span className="text-[10px] font-bold text-muted-foreground">
										{row.share}%
									</span>
									<div className="flex h-28 w-full items-end">
										<div
											className="w-full rounded-t-md bg-emerald-500/80"
											style={{
												height: `${peakMonth > 0 ? Math.max(3, (row.amount / peakMonth) * 100) : 3}%`,
											}}
										/>
									</div>
									<span className="whitespace-nowrap text-[10px] font-medium text-muted-foreground">
										{row.label}
									</span>
								</div>
							))}
						</div>

						<TableShell
							headers={[
								{ label: 'Month' },
								{ label: 'Transactions', align: 'right' },
								{ label: 'Inflow', align: 'right' },
								{ label: '% of Year', align: 'right' },
								{ label: 'Cumulative', align: 'right' },
							]}
						>
							{currency.monthly.map((row) => (
								<tr key={row.key}>
									<td className="px-3 py-2.5 font-bold">{row.label}</td>
									<td className="px-3 py-2.5 text-right text-muted-foreground">
										{row.transactions}
									</td>
									<td className="px-3 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
										{money(row.amount)}
									</td>
									<td className="px-3 py-2.5 text-right text-muted-foreground">
										{row.share}%
									</td>
									<td className="px-3 py-2.5 text-right font-medium">
										{money(row.cumulative)}
									</td>
								</tr>
							))}
							<tr className="bg-muted/50">
								<td className="px-3 py-2.5 font-black">Total</td>
								<td className="px-3 py-2.5 text-right font-black">
									{summary.transactions}
								</td>
								<td className="px-3 py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">
									{money(summary.collected)}
								</td>
								<td className="px-3 py-2.5 text-right font-black">100%</td>
								<td className="px-3 py-2.5 text-right font-black">
									{money(summary.collected)}
								</td>
							</tr>
						</TableShell>

						<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
							{[
								{ label: 'Strongest month', value: summary.bestMonthLabel },
								{
									label: 'Strongest month inflow',
									value: money(summary.bestMonthAmount),
								},
								{
									label: 'Average per active day',
									value: money(summary.averagePerActiveDay),
								},
								{
									label: 'Collection window',
									value: `${summary.firstPaymentDate || '—'} → ${summary.lastPaymentDate || '—'}`,
								},
							].map((item) => (
								<div key={item.label} className="rounded-xl bg-muted p-3">
									<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
										{item.label}
									</p>
									<p className="mt-1 text-sm font-black text-foreground">
										{item.value}
									</p>
								</div>
							))}
						</div>
					</>
				)}
			</Section>

			{/* ── Income by fee type ────────────────────────────────────── */}
			<Section
				title="Income by Fee Type"
				description="Assessed, discounted, collected, and still owed per fee"
				icon={Receipt}
			>
				{currency.byFee.length === 0 ? (
					<EmptyRow message={`No fee data available for ${academicYear}.`} />
				) : (
					<TableShell
						headers={[
							{ label: 'Fee' },
							{ label: 'Gross', align: 'right' },
							{ label: 'Discount', align: 'right' },
							{ label: 'Expected', align: 'right' },
							{ label: 'Collected', align: 'right' },
							{ label: 'Outstanding', align: 'right' },
							{ label: 'Rate', align: 'right' },
						]}
					>
						{currency.byFee.map((row) => (
							<tr key={row.key}>
								<td className="px-3 py-2.5">
									<span className="font-bold">{row.label}</span>
									<Bar value={row.collected} max={row.expected} />
								</td>
								<td className="px-3 py-2.5 text-right text-muted-foreground">
									{money(row.gross)}
								</td>
								<td className="px-3 py-2.5 text-right text-muted-foreground">
									{money(row.discount)}
								</td>
								<td className="px-3 py-2.5 text-right font-bold">
									{money(row.expected)}
								</td>
								<td className="px-3 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
									{money(row.collected)}
								</td>
								<td className="px-3 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
									{money(row.outstanding)}
								</td>
								<td className="px-3 py-2.5 text-right">
									<RateBadge value={row.rate} />
								</td>
							</tr>
						))}
						<tr className="bg-muted/50">
							<td className="px-3 py-2.5 font-black">Total</td>
							<td className="px-3 py-2.5 text-right font-black">
								{money(summary.gross)}
							</td>
							<td className="px-3 py-2.5 text-right font-black">
								{money(summary.discount)}
							</td>
							<td className="px-3 py-2.5 text-right font-black">
								{money(summary.expected)}
							</td>
							<td className="px-3 py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">
								{money(summary.collected)}
							</td>
							<td className="px-3 py-2.5 text-right font-black text-rose-600 dark:text-rose-400">
								{money(summary.outstanding)}
							</td>
							<td className="px-3 py-2.5 text-right font-black">
								{summary.rate}%
							</td>
						</tr>
					</TableShell>
				)}
			</Section>

			{/* ── Category + installment ────────────────────────────────── */}
			<div className="grid gap-6 xl:grid-cols-2">
				<Section
					title="Income by Category"
					description="Fee types rolled up into their configured categories"
					icon={Wallet}
				>
					{currency.byCategory.length === 0 ? (
						<EmptyRow message="No categories to report." />
					) : (
						<TableShell
							headers={[
								{ label: 'Category' },
								{ label: 'Expected', align: 'right' },
								{ label: 'Collected', align: 'right' },
								{ label: 'Outstanding', align: 'right' },
							]}
						>
							{currency.byCategory.map((row) => (
								<tr key={row.key}>
									<td className="px-3 py-2.5">
										<span className="font-bold">{row.label}</span>
										<Bar value={row.collected} max={row.expected} />
									</td>
									<td className="px-3 py-2.5 text-right font-bold">
										{money(row.expected)}
									</td>
									<td className="px-3 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
										{money(row.collected)}
									</td>
									<td className="px-3 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
										{money(row.outstanding)}
									</td>
								</tr>
							))}
						</TableShell>
					)}
				</Section>

				<Section
					title="Installment Performance"
					description="Payments allocated across installments in due order"
					icon={Calendar}
				>
					{currency.byInstallment.length === 0 ? (
						<EmptyRow message="No installment schedule configured." />
					) : (
						<TableShell
							headers={[
								{ label: 'Installment' },
								{ label: 'Expected', align: 'right' },
								{ label: 'Collected', align: 'right' },
								{ label: 'Outstanding', align: 'right' },
							]}
						>
							{currency.byInstallment.map((row) => (
								<tr key={row.key}>
									<td className="px-3 py-2.5">
										<span className="font-bold">{row.label}</span>
										<Bar value={row.collected} max={row.expected} />
									</td>
									<td className="px-3 py-2.5 text-right font-bold">
										{money(row.expected)}
									</td>
									<td className="px-3 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
										{money(row.collected)}
									</td>
									<td className="px-3 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
										{money(row.outstanding)}
									</td>
								</tr>
							))}
						</TableShell>
					)}
				</Section>
			</div>

			{/* ── Sessions ──────────────────────────────────────────────── */}
			<Section
				title="Income by Session"
				description="Revenue contribution of each school session"
				icon={School}
			>
				{currency.bySession.length === 0 ? (
					<EmptyRow message="No session data available." />
				) : (
					<TableShell
						headers={[
							{ label: 'Session' },
							{ label: 'Expected', align: 'right' },
							{ label: 'Collected', align: 'right' },
							{ label: 'Outstanding', align: 'right' },
							{ label: 'Rate', align: 'right' },
						]}
					>
						{currency.bySession.map((row) => (
							<tr key={row.key}>
								<td className="px-3 py-2.5">
									<span className="font-bold">{row.label}</span>
									<Bar value={row.collected} max={row.expected} />
								</td>
								<td className="px-3 py-2.5 text-right font-bold">
									{money(row.expected)}
								</td>
								<td className="px-3 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
									{money(row.collected)}
								</td>
								<td className="px-3 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
									{money(row.outstanding)}
								</td>
								<td className="px-3 py-2.5 text-right">
									<RateBadge value={row.rate} />
								</td>
							</tr>
						))}
					</TableShell>
				)}
			</Section>

			{/* ── Receivables by class ──────────────────────────────────── */}
			<Section
				title="Receivables by Class"
				description="Where the outstanding balance is concentrated"
				icon={Users}
			>
				{currency.byClass.length === 0 ? (
					<EmptyRow message="No class data available." />
				) : (
					<TableShell
						headers={[
							{ label: 'Class' },
							{ label: 'Session / Level' },
							{ label: 'Students', align: 'right' },
							{ label: 'Expected', align: 'right' },
							{ label: 'Collected', align: 'right' },
							{ label: 'Outstanding', align: 'right' },
							{ label: 'Rate', align: 'right' },
						]}
					>
						{currency.byClass.map((row) => (
							<tr key={row.key}>
								<td className="px-3 py-2.5">
									<span className="font-bold">{row.label}</span>
									<Bar value={row.collected} max={row.expected} />
								</td>
								<td className="px-3 py-2.5 text-xs text-muted-foreground">
									{row.session} · {row.level}
								</td>
								<td className="px-3 py-2.5 text-right text-muted-foreground">
									{row.studentCount}
								</td>
								<td className="px-3 py-2.5 text-right font-bold">
									{money(row.expected)}
								</td>
								<td className="px-3 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
									{money(row.collected)}
								</td>
								<td className="px-3 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
									{money(row.outstanding)}
								</td>
								<td className="px-3 py-2.5 text-right">
									<RateBadge value={row.rate} />
								</td>
							</tr>
						))}
					</TableShell>
				)}
			</Section>

			{/* ── Scholarships ──────────────────────────────────────────── */}
			<Section
				title="Scholarship & Waiver Impact"
				description="Income foregone through awards"
				icon={PiggyBank}
			>
				{currency.scholarships.length === 0 ? (
					<EmptyRow message="No scholarships or waivers applied this year." />
				) : (
					<TableShell
						headers={[
							{ label: 'Scholarship' },
							{ label: 'Fee Awards', align: 'right' },
							{ label: 'Value Granted', align: 'right' },
						]}
					>
						{currency.scholarships.map((row) => (
							<tr key={row.key}>
								<td className="px-3 py-2.5 font-bold">{row.label}</td>
								<td className="px-3 py-2.5 text-right text-muted-foreground">
									{row.awards}
								</td>
								<td className="px-3 py-2.5 text-right font-bold">
									{money(row.discount)}
								</td>
							</tr>
						))}
						<tr className="bg-muted/50">
							<td className="px-3 py-2.5 font-black">Total</td>
							<td className="px-3 py-2.5 text-right font-black">
								{currency.scholarships.reduce((sum, row) => sum + row.awards, 0)}
							</td>
							<td className="px-3 py-2.5 text-right font-black">
								{money(summary.discount)}
							</td>
						</tr>
					</TableShell>
				)}
			</Section>
		</div>
	);
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function FinancialReports() {
	const user = useAuth((state) => state.user);
	const schoolProfile = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore((state) => state.usersByAcademicYear);
	const paymentsByAcademicYear = useSchoolStore(
		(state) => state.paymentsByAcademicYear,
	);

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

	const [selectedYear, setSelectedYear] = useState('');
	const [activeCurrency, setActiveCurrency] = useState('');

	useEffect(() => {
		if (defaultYear && !selectedYear) setSelectedYear(defaultYear);
	}, [defaultYear, selectedYear]);

	const students = useMemo(() => {
		const yearData = pickYearScoped<any>(usersByAcademicYear, selectedYear);
		return Array.isArray(yearData?.students) ? yearData.students : [];
	}, [usersByAcademicYear, selectedYear]);

	const payments = useMemo(() => {
		const yearPayments = pickYearScoped<any[]>(
			paymentsByAcademicYear,
			selectedYear,
		);
		return Array.isArray(yearPayments) ? yearPayments : [];
	}, [paymentsByAcademicYear, selectedYear]);

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

	// Keep the currency tab valid whenever the year (and so the currency mix) changes.
	useEffect(() => {
		if (report.currencies.length === 0) {
			if (activeCurrency) setActiveCurrency('');
			return;
		}
		if (!report.currencies.some((c) => c.code === activeCurrency)) {
			setActiveCurrency(report.currencies[0].code);
		}
	}, [report.currencies, activeCurrency]);

	const currentCurrency =
		report.currencies.find((c) => c.code === activeCurrency) ||
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

	return (
		<div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-black tracking-tight sm:text-3xl">
						Financial Reports
					</h1>
					<p className="mt-0.5 text-sm text-muted-foreground">
						Full income and cash flow statement for {selectedYear || 'the school'} —
						assessed fees, scholarship relief, collections received, and
						outstanding receivables.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2">
						<Calendar className="h-4 w-4 text-muted-foreground" />
						{availableYears.length < 2 ? (
							<select
								value={selectedYear}
								disabled
								className="cursor-not-allowed rounded-xl border border-border bg-muted px-3 py-2 text-sm font-bold text-muted-foreground shadow-sm"
							>
								<option value={selectedYear}>
									{selectedYear || availableYears[0] || 'No Academic Year'}
								</option>
							</select>
						) : (
							<select
								value={selectedYear}
								onChange={(event) => setSelectedYear(event.target.value)}
								className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
							>
								{availableYears.map((year) => (
									<option key={year} value={year}>
										{year}
									</option>
								))}
							</select>
						)}
					</div>

					<FinancialReportPDF
						report={report}
						school={schoolProfile}
						preparedBy={preparedBy}
						disabled={report.currencies.length === 0}
					/>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label="Students Enrolled"
					value={String(report.studentsEnrolled)}
					hint={`Enrolled in ${selectedYear || '—'}`}
					icon={GraduationCap}
				/>
				<StatCard
					label="Students Billed"
					value={String(currentCurrency?.summary.studentsBilled ?? 0)}
					hint={`With required fees in ${currentCurrency?.code || '—'}`}
					icon={Users}
				/>
				<StatCard
					label="Transactions"
					value={String(currentCurrency?.summary.transactions ?? 0)}
					hint={`Avg ${currentCurrency ? money(currentCurrency.summary.averagePayment) : '0.00'} per payment`}
					icon={Receipt}
				/>
				<StatCard
					label="Currencies Reported"
					value={
						report.currencies.length
							? report.currencies.map((c) => c.code).join(' · ')
							: '—'
					}
					hint="Reported separately — never combined"
					icon={Landmark}
				/>
			</div>

			{report.currencies.length > 1 && (
				<div className="flex gap-1 rounded-2xl border border-border bg-muted p-1">
					{report.currencies.map((currency) => (
						<button
							key={currency.code}
							onClick={() => setActiveCurrency(currency.code)}
							className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 ${
								currency.code === currentCurrency?.code
									? 'bg-card text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'
							}`}
						>
							{currency.label} ({currency.code})
						</button>
					))}
				</div>
			)}

			{!currentCurrency ? (
				<div className="rounded-2xl border border-border bg-card p-8 text-center">
					<p className="text-sm text-muted-foreground">
						No fee schedule or payment data available for{' '}
						{selectedYear || 'the selected year'}.
					</p>
				</div>
			) : (
				<CurrencyReportView
					currency={currentCurrency}
					academicYear={selectedYear}
				/>
			)}

			<p className="text-xs leading-relaxed text-muted-foreground">
				Expected income is derived from the {selectedYear} fee schedule with
				student groups and scholarships applied, counting required fees only.
				Collections reflect recorded payments for the same year; payments that
				cannot be matched to an installment are reported against the
				immediate-due bucket. Cash inflow covers fee collections — the portal
				does not record school expenditure.
			</p>
		</div>
	);
}
