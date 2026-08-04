'use client';

import { useEffect, useMemo, useState, memo } from 'react';
import Link from 'next/link';
import {
	AreaChart,
	Area,
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
	CartesianGrid,
	XAxis,
	YAxis,
} from 'recharts';
import {
	DollarSign,
	Landmark,
	AlertTriangle,
	TrendingUp,
	CalendarDays,
	ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import type { SchoolProfile } from '@/types/schoolProfile';
import {
	buildAcademicYearOptions,
} from '@/components/dashboard/academicYear';
import StatCard from '@/components/dashboard/StatCard';
import { useSchoolStore } from '@/store/schoolStore';
import { areAcademicYearsEqual } from '@/utils/academicYear';
import { pickCurrentOrMostRecentAcademicYear } from '@/utils/academicYearOptions';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';
import {
	resolveStudentFees,
	type StudentFeeBill,
} from '@/utils/studentFeeBilling';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

const AREA_CHART_CLASS = 'h-[260px] w-full aspect-auto';
const BAR_CHART_CLASS = 'h-[280px] w-full aspect-auto';
const PIE_CHART_CLASS = 'h-[220px] w-full aspect-auto';

const FEE_TYPE_COLORS = [
	'hsl(160, 84%, 39%)',
	'hsl(199, 89%, 48%)',
	'hsl(45, 93%, 47%)',
	'hsl(24, 95%, 53%)',
	'hsl(280, 65%, 55%)',
	'hsl(0, 84%, 60%)',
	'hsl(330, 70%, 60%)',
	'hsl(200, 60%, 50%)',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
	n.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const pct = (part: number, total: number) =>
	total > 0 ? Math.round((part / total) * 100) : 0;

const getStoreYearValue = (
	byYear: Record<string, any>,
	selectedYear: string,
): any => {
	const direct = byYear[selectedYear];
	if (direct !== undefined) return direct;
	return Object.entries(byYear).find(
		([k]) => k.replace(/\//g, '-') === selectedYear.replace(/\//g, '-'),
	)?.[1];
};

// ─── Component ────────────────────────────────────────────────────────────────

const FinancialDashboard = memo(function FinancialDashboard({
	schoolProfile,
}: {
	schoolProfile: SchoolProfile;
}) {
	const usersByAcademicYear = useSchoolStore((s) => s.usersByAcademicYear);
	const paymentsByAcademicYear = useSchoolStore(
		(s) => s.paymentsByAcademicYear,
	);

	// ── Academic year ────────────────────────────────────────────────────────
	const academicYearOptions = useMemo(
		() => buildAcademicYearOptions(schoolProfile),
		[schoolProfile],
	);
	const currentAcademicYear = useMemo(
		() => getCurrentAcademicYearFromSchoolProfile(schoolProfile),
		[schoolProfile],
	);
	const defaultYear = useMemo(
		() =>
			pickCurrentOrMostRecentAcademicYear(
				academicYearOptions.map((o) => o.value),
				currentAcademicYear,
			) ||
			currentAcademicYear ||
			'',
		[academicYearOptions, currentAcademicYear],
	);
	const [selectedYear, setSelectedYear] = useState(defaultYear);

	useEffect(() => {
		const ok = academicYearOptions.some((o) =>
			areAcademicYearsEqual(o.value, selectedYear),
		);
		if (!selectedYear || !ok) setSelectedYear(defaultYear);
	}, [academicYearOptions, defaultYear, selectedYear]);

	// ── Raw store data for the selected year ─────────────────────────────────
	const studentsForYear = useMemo(() => {
		if (!selectedYear) return [];
		const yearData = getStoreYearValue(usersByAcademicYear, selectedYear);
		return Array.isArray(yearData?.students) ? yearData.students : [];
	}, [usersByAcademicYear, selectedYear]);

	const yearPayments = useMemo(() => {
		if (!selectedYear) return [];
		const value = getStoreYearValue(paymentsByAcademicYear, selectedYear);
		return Array.isArray(value) ? value : [];
	}, [paymentsByAcademicYear, selectedYear]);

	const feeSchedule = useMemo(() => {
		if (!schoolProfile || !selectedYear) return null;
		return (
			schoolProfile.financialConfig?.feeSchedules?.find(
				(s) =>
					s.academicYear.replace(/\//g, '-') ===
					selectedYear.replace(/\//g, '-'),
			) ?? null
		);
	}, [schoolProfile, selectedYear]);

	// ── Curriculum helpers ───────────────────────────────────────────────────
	const classIdToSession = useMemo(() => {
		const map: Record<string, string> = {};
		if (!schoolProfile?.academicConfig?.classLevels) return map;
		for (const [sessionName, session] of Object.entries(
			schoolProfile.academicConfig.classLevels,
		)) {
			for (const level of Object.values(session)) {
				for (const cls of (level as any).classes ?? []) {
					map[cls.classId] = sessionName;
				}
			}
		}
		return map;
	}, [schoolProfile]);

	const getStudentClassId = (student: any): string => {
		if (!selectedYear) return '';
		const yearEntry = Array.isArray(student.academicYears)
			? student.academicYears.find(
					(e: any) =>
						(e?.year || '').replace(/\//g, '-') ===
						selectedYear.replace(/\//g, '-'),
				)
			: null;
		return yearEntry?.classId || student.classId || '';
	};

	// ── Per-student resolved fee rows (scholarships & groups applied) ────────
	const feeRows = useMemo((): { student: any; bill: StudentFeeBill }[] => {
		if (!schoolProfile || !feeSchedule) return [];
		const rows: { student: any; bill: StudentFeeBill }[] = [];
		for (const student of studentsForYear) {
			const classId = getStudentClassId(student);
			if (!classId) continue;
			const bills = resolveStudentFees(
				student,
				schoolProfile,
				selectedYear,
				classId,
			);
			for (const bill of bills) {
				if (!bill.isRequired) continue;
				rows.push({ student, bill });
			}
		}
		return rows;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [schoolProfile, feeSchedule, studentsForYear, selectedYear]);

	// ── feeId → feeName so payments recorded by feeId roll up to their names ──
	const feeNameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const { bill } of feeRows) {
			if (bill.feeId && !map.has(bill.feeId)) map.set(bill.feeId, bill.feeName);
		}
		return map;
	}, [feeRows]);

	// ── Totals per currency ──────────────────────────────────────────────────
	const expectedTotalByCurrency = useMemo((): Record<string, number> => {
		const totals: Record<string, number> = {};
		for (const row of feeRows) {
			const cur = row.bill.currency;
			totals[cur] = (totals[cur] || 0) + row.bill.effectiveAmount;
		}
		return totals;
	}, [feeRows]);

	const collectedByCurrency = useMemo(() => {
		const totals: Record<string, number> = {};
		for (const p of yearPayments) {
			totals[p.currency] = (totals[p.currency] || 0) + p.paymentAmount;
		}
		return totals;
	}, [yearPayments]);

	const balanceByCurrency = useMemo(() => {
		const totals: Record<string, number> = {};
		const currencies = new Set([
			...Object.keys(expectedTotalByCurrency),
			...Object.keys(collectedByCurrency),
		]);
		for (const cur of currencies) {
			totals[cur] =
				(expectedTotalByCurrency[cur] || 0) - (collectedByCurrency[cur] || 0);
		}
		return totals;
	}, [expectedTotalByCurrency, collectedByCurrency]);

	// ── Currencies with at least one fee quoted in them ──────────────────────
	const activeCurrencies = useMemo(() => {
		if (!schoolProfile?.financialConfig?.currencies) return [];
		const codesWithFees = new Set<string>();
		if (feeSchedule) {
			for (const sfs of feeSchedule.sessionFeeSchedules) {
				for (const fg of sfs.feeGroups) {
					for (const sf of fg.scheduledFees) {
						codesWithFees.add(sf.amount.currency);
					}
				}
			}
		}
		return schoolProfile.financialConfig.currencies
			.filter((c) => codesWithFees.has(c.code))
			.map((c) => ({ code: c.code, label: c.label, symbol: c.symbol }));
	}, [schoolProfile, feeSchedule]);

	const allCurrencies = useMemo(
		() =>
			Array.from(
				new Set([
					...Object.keys(expectedTotalByCurrency),
					...Object.keys(collectedByCurrency),
				]),
			),
		[expectedTotalByCurrency, collectedByCurrency],
	);

	// ── Dominant currency used for all chart values ──────────────────────────
	const primaryCurrency = useMemo(() => {
		if (allCurrencies.length === 0) return '';
		return allCurrencies.reduce((a, b) => {
			const weight = (code: string) =>
				(expectedTotalByCurrency[code] || 0) +
				(collectedByCurrency[code] || 0) * 0.001;
			return weight(b) > weight(a) ? b : a;
		});
	}, [allCurrencies, expectedTotalByCurrency, collectedByCurrency]);

	const collectedPrimary = primaryCurrency
		? collectedByCurrency[primaryCurrency] || 0
		: 0;
	const expectedPrimary = primaryCurrency
		? expectedTotalByCurrency[primaryCurrency] || 0
		: 0;
	const collectionRate = pct(collectedPrimary, expectedPrimary);

	// ── Per-currency monthly collection trend ──────────────────────────────
	const monthlyDataByCurrency = useMemo(() => {
		const map: Record<string, { month: string; collected: number }[]> = {};
		for (const cur of activeCurrencies) {
			const totals = Array(12).fill(0);
			for (const p of yearPayments) {
				if (p.currency !== cur.code) continue;
				const raw = p.paymentDate || p.paymentTime || p.createdAt;
				if (!raw) continue;
				const date = new Date(String(raw));
				if (Number.isNaN(date.getTime())) continue;
				totals[date.getMonth()] += Number(p.paymentAmount) || 0;
			}
			map[cur.code] = MONTHS.map((label, idx) => ({
				month: label,
				collected: Number(totals[idx].toFixed(2)),
			}));
		}
		return map;
	}, [yearPayments, activeCurrencies]);

	// ── Per-currency collected vs outstanding ──────────────────────────────
	const donutDataByCurrency = useMemo(() => {
		const map: Record<string, { name: string; value: number }[]> = {};
		for (const cur of activeCurrencies) {
			const exp = expectedTotalByCurrency[cur.code] || 0;
			const col = collectedByCurrency[cur.code] || 0;
			const outstanding = Math.max(0, exp - col);
			map[cur.code] = [
				{ name: 'Collected', value: Number(col.toFixed(2)) },
				{ name: 'Outstanding', value: Number(outstanding.toFixed(2)) },
			];
		}
		return map;
	}, [activeCurrencies, expectedTotalByCurrency, collectedByCurrency]);

	// ── Fee type breakdown: expected + collected per category per currency ───
	const feeTypeBreakdown = useMemo(() => {
		const expected: Record<string, Record<string, number>> = {};
		const collected: Record<string, Record<string, number>> = {};
		for (const { bill } of feeRows) {
			if (!expected[bill.feeName]) expected[bill.feeName] = {};
			expected[bill.feeName][bill.currency] =
				(expected[bill.feeName][bill.currency] || 0) +
				bill.effectiveAmount;
		}
		for (const p of yearPayments) {
			const key = feeNameById.get(p.feeType) || p.feeType || 'Other';
			if (!collected[key]) collected[key] = {};
			collected[key][p.currency] =
				(collected[key][p.currency] || 0) + p.paymentAmount;
		}
		const categories = Array.from(
			new Set([...Object.keys(expected), ...Object.keys(collected)]),
		);
		return categories
			.map((category) => ({
				category,
				expByCur: expected[category] || {},
				colByCur: collected[category] || {},
			}))
			.sort((a, b) => {
				const sumA = Object.values(a.expByCur).reduce((s, v) => s + v, 0);
				const sumB = Object.values(b.expByCur).reduce((s, v) => s + v, 0);
				return sumB - sumA;
			});
	}, [feeRows, yearPayments, feeNameById]);

	const feeTypeChartDataByCurrency = useMemo(() => {
		const map: Record<string, { name: string; Expected: number; Collected: number }[]> = {};
		for (const cur of activeCurrencies) {
			map[cur.code] = feeTypeBreakdown
				.map(({ category, expByCur, colByCur }) => ({
					name: category,
					Expected: Number((expByCur[cur.code] || 0).toFixed(2)),
					Collected: Number((colByCur[cur.code] || 0).toFixed(2)),
				}))
				.filter((d) => d.Expected > 0 || d.Collected > 0)
				.sort((a, b) => b.Expected - a.Expected)
				.slice(0, 8);
		}
		return map;
	}, [feeTypeBreakdown, activeCurrencies]);

	// ── Chart configs ────────────────────────────────────────────────────────
	const areaConfig = {
		collected: {
			label: 'Collected',
			color: 'hsl(160, 84%, 39%)',
		},
	};

	const barConfig = {
		Expected: {
			label: 'Expected',
			color: 'hsl(222, 47%, 45%)',
		},
		Collected: {
			label: 'Collected',
			color: 'hsl(160, 84%, 39%)',
		},
	};

	const donutConfig = {
		Collected: {
			label: 'Collected',
			color: 'hsl(160, 84%, 39%)',
		},
		Outstanding: {
			label: 'Outstanding',
			color: 'hsl(0, 84%, 60%)',
		},
	};

	const hasAnyData =
		activeCurrencies.length > 0 ||
		yearPayments.length > 0 ||
		studentsForYear.length > 0;

	return (
		<div className="space-y-6">
			{/* ── Header ──────────────────────────────────────────────────────── */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-xl font-semibold">Financial Performance</h2>
					<p className="text-sm text-muted-foreground">
						Collection and fee insights for{' '}
						{selectedYear || currentAcademicYear || 'this academic year'}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Link
						href="/dashboard/financial-reports"
						className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
					>
						Full report
						<ChevronRight className="h-4 w-4" />
					</Link>
					{academicYearOptions.length > 1 && (
						<select
							value={selectedYear}
							onChange={(e) => setSelectedYear(e.target.value)}
							className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
						>
							{academicYearOptions.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					)}
				</div>
			</div>

			{!hasAnyData ? (
				<Card>
					<CardContent className="py-10 text-center">
						<p className="text-sm text-muted-foreground">
							No financial data available for {selectedYear || 'this year'}.
						</p>
					</CardContent>
				</Card>
			) : (
				<>
					{/* ── Summary stats ──────────────────────────────────────────── */}
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<StatCard
							label="Total Collected"
							value={
								activeCurrencies.length === 0
									? '—'
									: activeCurrencies
											.map(
												(c) =>
													`${c.code} ${fmt(
														collectedByCurrency[c.code] ?? 0,
													)}`,
											)
											.join('\n')
							}
							helper={`${yearPayments.length} transaction${
								yearPayments.length !== 1 ? 's' : ''
							}`}
							icon={Landmark}
							index={0}
						/>
						<StatCard
							label="Expected Income"
							value={
								activeCurrencies.length === 0
									? '—'
									: activeCurrencies
											.map(
												(c) =>
													`${c.code} ${fmt(
														expectedTotalByCurrency[c.code] ?? 0,
													)}`,
											)
											.join('\n')
							}
							helper="Based on fee schedule × students"
							icon={DollarSign}
							index={1}
						/>
						<StatCard
							label="Outstanding Balance"
							value={
								activeCurrencies.length === 0
									? '—'
									: activeCurrencies
											.map(
												(c) =>
													`${c.code} ${fmt(
														Math.max(
															0,
															balanceByCurrency[c.code] ?? 0,
														),
													)}`,
											)
											.join('\n')
							}
							helper="Expected minus collected"
							icon={AlertTriangle}
							index={2}
						/>
						<StatCard
							label="Collection Rate"
							value={
								primaryCurrency
									? `${collectionRate}%`
									: '—'
							}
							helper={
								primaryCurrency
									? `In ${primaryCurrency} · ${fmt(collectedPrimary)} of ${fmt(
											expectedPrimary,
										)}`
									: 'No fee schedule set up'
							}
							icon={TrendingUp}
							index={3}
						/>
					</div>

					{/* ── Per-currency charts ──────────────────────────────────── */}
					{activeCurrencies.map((cur) => {
						const curCollected = collectedByCurrency[cur.code] || 0;
						const curExpected = expectedTotalByCurrency[cur.code] || 0;
						const curOutstanding = Math.max(0, curExpected - curCollected);
						const curRate = pct(curCollected, curExpected);
						const monthlyData = monthlyDataByCurrency[cur.code] || [];
						const donutData = donutDataByCurrency[cur.code] || [];
						const barData = feeTypeChartDataByCurrency[cur.code] || [];
						const makeTooltip =
							() =>
							(value: number | string | Array<number | string>) =>
								`${cur.code} ${fmt(Number(Array.isArray(value) ? value[0] : value) || 0)}`;

						return (
							<div key={cur.code} className="space-y-6">
								<div className="grid gap-6 lg:grid-cols-3">
									<Card className="lg:col-span-2">
										<CardHeader>
											<CardTitle className="flex items-center gap-2 text-base">
												<CalendarDays className="h-4 w-4 text-muted-foreground" />
												Monthly Collections
											</CardTitle>
											<CardDescription>
												Amounts collected per month in {cur.code}
											</CardDescription>
										</CardHeader>
										<CardContent>
											<ChartContainer config={areaConfig} className={AREA_CHART_CLASS}>
												<AreaChart data={monthlyData}>
													<defs>
														<linearGradient
															id={`fillCollected-${cur.code}`}
															x1="0"
															y1="0"
															x2="0"
															y2="1"
														>
															<stop
																offset="5%"
																stopColor="var(--color-collected)"
																stopOpacity={0.35}
															/>
															<stop
																offset="95%"
																stopColor="var(--color-collected)"
																stopOpacity={0.02}
															/>
														</linearGradient>
													</defs>
													<CartesianGrid vertical={false} strokeOpacity={0.08} />
													<XAxis
														dataKey="month"
														tick={{ fontSize: 11 }}
														tickLine={false}
														axisLine={false}
													/>
													<YAxis
														tick={{ fontSize: 11 }}
														tickLine={false}
														axisLine={false}
														tickFormatter={(v: number) =>
															v >= 1000 ? `${v / 1000}k` : String(v)
														}
													/>
													<ChartTooltip
														cursor={{ stroke: 'var(--color-collected)' }}
														content={<ChartTooltipContent formatter={makeTooltip()} />}
													/>
													<Area
														type="monotone"
														dataKey="collected"
														stroke="var(--color-collected)"
														strokeWidth={2.5}
														fill={`url(#fillCollected-${cur.code})`}
													/>
												</AreaChart>
											</ChartContainer>
										</CardContent>
									</Card>

									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2 text-base">
												<AlertTriangle className="h-4 w-4 text-muted-foreground" />
												Collected vs Outstanding
											</CardTitle>
											<CardDescription>
												Overall progress in {cur.code}
											</CardDescription>
										</CardHeader>
										<CardContent>
											<ChartContainer config={donutConfig} className={PIE_CHART_CLASS}>
												<PieChart>
													<ChartTooltip
														content={<ChartTooltipContent formatter={makeTooltip()} />}
													/>
													<Pie
														data={donutData}
														dataKey="value"
														nameKey="name"
														innerRadius={58}
														outerRadius={86}
														stroke="transparent"
														paddingAngle={3}
														cornerRadius={6}
														isAnimationActive
														animationDuration={700}
													>
														{donutData.map((entry) => (
															<Cell
																key={entry.name}
																fill={`var(--color-${entry.name})`}
															/>
														))}
													</Pie>
													<ChartLegend
														content={<ChartLegendContent nameKey="name" />}
													/>
												</PieChart>
											</ChartContainer>
											<div className="mt-2 text-center">
												<p className="text-xs text-muted-foreground">
													{curRate}% collected · {fmt(curOutstanding)}{' '}
													{cur.code} outstanding
												</p>
											</div>
										</CardContent>
									</Card>
								</div>

								{barData.length > 0 && (
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2 text-base">
												<DollarSign className="h-4 w-4 text-muted-foreground" />
												Fee Type Breakdown
											</CardTitle>
											<CardDescription>
												Expected vs collected per fee type in {cur.code}
											</CardDescription>
										</CardHeader>
										<CardContent>
											<ChartContainer config={barConfig} className={BAR_CHART_CLASS}>
												<BarChart
													data={barData}
													margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
												>
													<CartesianGrid vertical={false} strokeOpacity={0.08} />
													<XAxis
														dataKey="name"
														tick={{ fontSize: 10 }}
														interval={0}
														angle={-18}
														textAnchor="end"
														tickLine={false}
														axisLine={false}
														height={44}
													/>
													<YAxis
														tick={{ fontSize: 11 }}
														tickLine={false}
														axisLine={false}
														tickFormatter={(v: number) =>
															v >= 1000 ? `${v / 1000}k` : String(v)
														}
													/>
													<ChartTooltip
														cursor={{ fill: 'rgba(0,0,0,0.04)' }}
														content={<ChartTooltipContent formatter={makeTooltip()} />}
													/>
													<ChartLegend content={<ChartLegendContent />} />
													<Bar
														dataKey="Expected"
														fill="var(--color-Expected)"
														radius={[4, 4, 0, 0]}
													/>
													<Bar
														dataKey="Collected"
														fill="var(--color-Collected)"
														radius={[4, 4, 0, 0]}
													/>
												</BarChart>
											</ChartContainer>
										</CardContent>
									</Card>
								)}
							</div>
						);
					})}

				</>
			)}
		</div>
	);
});

export default FinancialDashboard;
