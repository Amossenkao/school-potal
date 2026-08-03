'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import {
	getCurrentAcademicYearFromSchoolProfile,
} from '@/utils/academicYearAccess';
import { buildSchoolAcademicYearRange } from '@/utils/academicYearOptions';
import { resolveStudentFees, type StudentFeeBill } from '@/utils/studentFeeBilling';
import type { FeeSchedule } from '@/types/schoolProfile';
import { allocatePaymentsToInstallments } from '@/utils/resolveStudentFeeGroup';
import {
	GraduationCap,
	DollarSign,
	Landmark,
	AlertTriangle,
	ChevronDown,
	ChevronRight,
	Loader2,
	Calendar,
	Receipt,
	School,
	Filter,
} from 'lucide-react';

const fmt = (n: number) =>
	n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (part: number, total: number) =>
	total > 0 ? Math.round((part / total) * 100) : 0;

interface Payment {
	id: string;
	studentId: string;
	classId?: string;
	feeType: string;
	category?: string;
	paymentAmount: number;
	currency: string;
	paymentAcademicYear?: string;
	paymentDate: string;
	receiptNumber?: string;
	paidBy?: string;
	paymentMethod?: string;
}

interface CurrencyInfo {
	code: string;
	label: string;
	symbol: string;
}

function Accordion({
	title,
	defaultOpen = false,
	children,
}: {
	title: React.ReactNode;
	defaultOpen?: boolean;
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div className="rounded-2xl border border-border">
			<button
				onClick={() => setOpen(!open)}
				className="flex w-full items-center justify-between px-5 py-4 text-left"
			>
				<span className="font-bold">{title}</span>
				{open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
			</button>
			{open && <div className="border-t border-border px-5 py-4">{children}</div>}
		</div>
	);
}

function ProgressBar({ value, max }: { value: number; max: number }) {
	const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;
	const ratio = pct(value, max);
	return (
		<div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
			<div
				className={`h-full rounded-full transition-all duration-700 ${
					ratio >= 80 ? 'bg-emerald-500' : ratio >= 50 ? 'bg-amber-500' : 'bg-rose-500'
				}`}
				style={{ width: `${width}%` }}
			/>
		</div>
	);
}

function PercentBadge({ value }: { value: number }) {
	return (
		<span
			className={`ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
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

export default function FinancialOverviewPage() {
	const schoolProfile = useSchoolStore((s) => s.school);
	const usersByAcademicYear = useSchoolStore((s) => s.usersByAcademicYear);

	const [payments, setPayments] = useState<Payment[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<'overview' | 'installments' | 'byClass'>('overview');
	const [classFilter, setClassFilter] = useState<string>('all');

	const availableYears = useMemo(() => {
		if (!schoolProfile) return [];

		const years = buildSchoolAcademicYearRange(schoolProfile);
		return years;
	}, [schoolProfile]);

	const defaultYear = useMemo(
		() => (schoolProfile ? getCurrentAcademicYearFromSchoolProfile(schoolProfile) || '' : ''),
		[schoolProfile],
	);
	const [selectedYear, setSelectedYear] = useState<string>('');
	const [selectedSession, setSelectedSession] = useState<string>('all');

	useEffect(() => {
		if (defaultYear && !selectedYear) setSelectedYear(defaultYear);
	}, [defaultYear, selectedYear]);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const res = await fetch('/api/payments');
				const json = await res.json();
				if (json.success) setPayments(json.data.payments || []);
			} catch {
				console.error('Failed to load payments');
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	const studentsForYear = useMemo(() => {
		if (!selectedYear || !usersByAcademicYear) return [];
		const yearData =
			usersByAcademicYear[selectedYear] ||
			Object.entries(usersByAcademicYear).find(([k]) => k.replace(/\//g, '-') === selectedYear.replace(/\//g, '-'))?.[1];
		return yearData?.students ?? [];
	}, [usersByAcademicYear, selectedYear]);

	const feeSchedule = useMemo((): FeeSchedule | null => {
		if (!schoolProfile || !selectedYear) return null;
		return (
			schoolProfile.financialConfig?.feeSchedules?.find(
				(s) => s.academicYear.replace(/\//g, '-') === selectedYear.replace(/\//g, '-'),
			) ?? null
		);
	}, [schoolProfile, selectedYear]);

	const sessionOptions = useMemo(() => {
		if (!feeSchedule) return [];
		return feeSchedule.sessionFeeSchedules.map((s) => s.sessionName);
	}, [feeSchedule]);

	const showSessionFilter = sessionOptions.length > 1;

	useEffect(() => {
		if (selectedSession !== 'all' && !sessionOptions.includes(selectedSession)) {
			setSelectedSession('all');
		}
	}, [sessionOptions, selectedSession]);

	const yearPayments = useMemo(
		() =>
			payments.filter((p) => {
				const py = (p.paymentAcademicYear || '').replace(/\//g, '-');
				const sy = selectedYear.replace(/\//g, '-');
				return py === sy;
			}),
		[payments, selectedYear],
	);

	const classNameMap = useMemo(() => {
		const map: Record<string, string> = {};
		if (!schoolProfile?.academicConfig?.classLevels) return map;
		for (const session of Object.values(schoolProfile.academicConfig.classLevels)) {
			for (const level of Object.values(session)) {
				for (const cls of (level as any).classes ?? []) {
					map[cls.classId] = cls.name || cls.classId;
				}
			}
		}
		return map;
	}, [schoolProfile]);

	const classIdToSession = useMemo(() => {
		const map: Record<string, string> = {};
		if (!schoolProfile?.academicConfig?.classLevels) return map;
		for (const [sessionName, session] of Object.entries(schoolProfile.academicConfig.classLevels)) {
			for (const level of Object.values(session)) {
				for (const cls of (level as any).classes ?? []) {
					map[cls.classId] = sessionName;
				}
			}
		}
		return map;
	}, [schoolProfile]);

	const getStudentClassId = useCallback((student: any): string => {
		const yearEntry = Array.isArray(student.academicYears)
			? student.academicYears.find(
					(e: any) => (e?.year || '').replace(/\//g, '-') === selectedYear.replace(/\//g, '-'),
				)
			: null;
		return yearEntry?.classId || student.classId || '';
	}, [selectedYear]);

	// ── Per-student resolved fee rows (scholarships & student groups applied) ──
	const feeRows = useMemo((): { student: any; bill: StudentFeeBill }[] => {
		if (!schoolProfile || !feeSchedule) return [];
		const rows: { student: any; bill: StudentFeeBill }[] = [];
		for (const student of studentsForYear) {
			const classId = getStudentClassId(student);
			if (!classId) continue;
			const studentSession = classIdToSession[classId];
			if (selectedSession !== 'all' && studentSession !== selectedSession) continue;
			const bills = resolveStudentFees(student, schoolProfile, selectedYear, classId);
			for (const bill of bills) {
				if (!bill.isRequired) continue;
				rows.push({ student, bill });
			}
		}
		return rows;
	}, [schoolProfile, feeSchedule, studentsForYear, selectedYear, selectedSession, classIdToSession, getStudentClassId]);

	// ── Expected income per currency (scholarships & student groups applied) ──
	const expectedTotalByCurrency = useMemo((): Record<string, number> => {
		const totals: Record<string, number> = {};
		for (const row of feeRows) {
			const cur = row.bill.currency;
			totals[cur] = (totals[cur] || 0) + row.bill.effectiveAmount;
		}
		return totals;
	}, [feeRows]);

	// ── Currencies with at least one fee quoted in them ────────────────────
	const activeCurrencies = useMemo((): CurrencyInfo[] => {
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
			totals[cur] = (expectedTotalByCurrency[cur] || 0) - (collectedByCurrency[cur] || 0);
		}
		return totals;
	}, [expectedTotalByCurrency, collectedByCurrency]);

	// ── Installments grouped by session ────────────────────────────────────
	const installmentsBySession = useMemo(() => {
		if (!feeSchedule) return [];
		const sessions = Array.from(
			new Set(feeRows.map((r) => r.bill.sessionName || classIdToSession[getStudentClassId(r.student)] || '')),
		).filter(Boolean);

		return sessions.map((sessionName) => {
			const rows = feeRows.filter((r) => r.bill.sessionName === sessionName);
			const installmentMap: Record<
				string,
				{ id: string; label: string; expectedByCur: Record<string, number>; collectedByCur: Record<string, number> }
			> = {};
			const ensure = (id: string, label: string) => {
				if (!installmentMap[id]) {
					installmentMap[id] = { id, label, expectedByCur: {}, collectedByCur: {} };
				}
				return installmentMap[id];
			};
			const addExpected = (id: string, label: string, cur: string, amount: number) => {
				const bucket = ensure(id, label);
				bucket.expectedByCur[cur] = (bucket.expectedByCur[cur] || 0) + amount;
			};
			const addCollected = (id: string, label: string, cur: string, amount: number) => {
				const bucket = ensure(id, label);
				bucket.collectedByCur[cur] = (bucket.collectedByCur[cur] || 0) + amount;
			};

			const consumed = new Set<string>();

			for (const { student, bill } of rows) {
				const cur = bill.currency;

				if (bill.installments.length === 0) {
					addExpected('__immediate__', 'Immediate', cur, bill.effectiveAmount);
				} else {
					for (const split of bill.installments) {
						addExpected(split.installmentId, split.label, cur, split.amount);
					}
				}

				const feePayments = yearPayments.filter(
					(p) =>
						p.studentId === student.studentId &&
						(p.feeType === bill.feeName || p.feeType === bill.feeId),
				);
				for (const p of feePayments) consumed.add(p.id);
				const collected = allocatePaymentsToInstallments(
					bill.installments,
					feePayments.map((p) => ({ amount: p.paymentAmount })),
				);
				if (bill.installments.length === 0) {
					addCollected(
						'__immediate__',
						'Immediate',
						cur,
						feePayments.reduce((a, p) => a + p.paymentAmount, 0),
					);
				} else {
					for (const split of bill.installments) {
						const amount = collected[split.installmentId] || 0;
						if (amount > 0) {
							addCollected(split.installmentId, split.label, cur, amount);
						}
					}
				}
			}

			// Legacy / unmatched payments fall through to the immediate bucket.
			for (const p of yearPayments) {
				if (consumed.has(p.id)) continue;
				const paymentSession = p.classId ? classIdToSession[p.classId] : null;
				if (paymentSession && paymentSession !== sessionName) continue;
				addCollected('__immediate__', 'Immediate', p.currency, p.paymentAmount);
			}

			return {
				sessionName,
				installments: Object.values(installmentMap),
			};
		});
	}, [feeSchedule, feeRows, yearPayments, classIdToSession, getStudentClassId]);

	// ── By-class breakdown (scholarship-adjusted) ──────────────────────────
	const classSummaries = useMemo(() => {
		const classIds = Array.from(
			new Set(feeRows.map((r) => getStudentClassId(r.student)).filter(Boolean)),
		);
		return classIds.map((classId) => {
			const rows = feeRows.filter((r) => getStudentClassId(r.student) === classId);
			const expectedByCurrency: Record<string, number> = {};
			for (const row of rows) {
				const cur = row.bill.currency;
				expectedByCurrency[cur] = (expectedByCurrency[cur] || 0) + row.bill.effectiveAmount;
			}
			return {
				classId,
				className: classNameMap[classId] || classId,
				studentCount: new Set(rows.map((r) => r.student.studentId)).size,
				expectedByCurrency,
			};
		});
	}, [feeRows, classNameMap, getStudentClassId]);

	const collectedByClass = useMemo(() => {
		const map: Record<string, Record<string, number>> = {};
		for (const p of yearPayments) {
			const cid = p.classId || 'unknown';
			const session = classIdToSession[cid];
			if (selectedSession !== 'all' && session !== selectedSession) continue;
			if (!map[cid]) map[cid] = {};
			map[cid][p.currency] = (map[cid][p.currency] || 0) + p.paymentAmount;
		}
		return map;
	}, [yearPayments, selectedSession, classIdToSession]);

	const tabs = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'installments', label: 'Installments' },
		{ id: 'byClass', label: 'By Class' },
	] as const;

	const allCurrencies = useMemo(
		() =>
			Array.from(new Set([
				...Object.keys(expectedTotalByCurrency),
				...Object.keys(collectedByCurrency),
			])),
		[expectedTotalByCurrency, collectedByCurrency],
	);

	if (loading) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<div className="text-center">
					<Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-muted-foreground" />
					<p className="text-sm font-medium text-muted-foreground">Loading financial data…</p>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-black tracking-tight">
						Financial Overview
					</h1>
					<p className="mt-0.5 text-sm text-muted-foreground">
						School-wide financial insights and revenue analysis
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					{showSessionFilter && (
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4 text-muted-foreground" />
							<select
								value={selectedSession}
								onChange={(e) => setSelectedSession(e.target.value)}
								className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
							>
								<option value="all">All Sessions</option>
								{sessionOptions.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</div>
					)}
					<div className="flex items-center gap-2">
						<Calendar className="h-4 w-4 text-muted-foreground" />

						{availableYears.length < 2 ? (
							<select
								value={selectedYear}
								disabled
								className="rounded-xl border border-border bg-muted px-3 py-2 text-sm font-bold text-muted-foreground shadow-sm cursor-not-allowed"
							>
								<option value={selectedYear}>
									{selectedYear || availableYears[0] || 'No Academic Year'}
								</option>
							</select>
						) : (
							<select
								value={selectedYear}
								onChange={(e) => setSelectedYear(e.target.value)}
								className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
							>
								{availableYears.map((y) => (
									<option key={y} value={y}>
										{y}
									</option>
								))}
							</select>
						)}
					</div>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-2xl border border-border bg-card p-5">
					<div className="flex items-start justify-between gap-2">
						<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
							Total Students
						</p>
						<GraduationCap className="h-5 w-5 text-muted-foreground" />
					</div>
					<p className="mt-3 text-2xl font-black leading-tight text-foreground">
						{studentsForYear.length}
					</p>
					<p className="mt-1 text-xs font-medium text-muted-foreground">
						Enrolled in {selectedYear}
					</p>
				</div>
				<div className="rounded-2xl border border-border bg-card p-5">
					<div className="flex items-start justify-between gap-2">
						<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
							Expected Income
						</p>
						<DollarSign className="h-5 w-5 text-muted-foreground" />
					</div>
					<p className="mt-3 text-2xl font-black leading-tight text-foreground">
						{activeCurrencies.length === 0
							? '—'
							: activeCurrencies
									.map(
										(c) =>
											`${c.symbol || c.code} ${fmt(expectedTotalByCurrency[c.code] ?? 0)}`,
									)
									.join(' · ')}
					</p>
					<p className="mt-1 text-xs font-medium text-muted-foreground">
						Based on fee schedule × students
					</p>
				</div>
				<div className="rounded-2xl border border-border bg-card p-5">
					<div className="flex items-start justify-between gap-2">
						<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
							Total Collected
						</p>
						<Landmark className="h-5 w-5 text-muted-foreground" />
					</div>
					<p className="mt-3 text-2xl font-black leading-tight text-foreground">
						{activeCurrencies.length === 0
							? '—'
							: activeCurrencies
									.map(
										(c) =>
											`${c.symbol || c.code} ${fmt(collectedByCurrency[c.code] ?? 0)}`,
									)
									.join(' · ')}
					</p>
					<p className="mt-1 text-xs font-medium text-muted-foreground">
						{yearPayments.length} transactions
					</p>
				</div>
				<div className="rounded-2xl border border-border bg-card p-5">
					<div className="flex items-start justify-between gap-2">
						<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
							Outstanding Balance
						</p>
						<AlertTriangle
							className={`h-5 w-5 ${
								Object.values(balanceByCurrency).some((v) => v > 0)
									? 'text-rose-500'
									: 'text-emerald-500'
							}`}
						/>
					</div>
					<p className="mt-3 text-2xl font-black leading-tight text-foreground">
						{activeCurrencies.length === 0
							? '—'
							: activeCurrencies
									.map(
										(c) =>
											`${c.symbol || c.code} ${fmt(Math.max(0, balanceByCurrency[c.code] ?? 0))}`,
									)
									.join(' · ')}
					</p>
					<p className="mt-1 text-xs font-medium text-muted-foreground">
						Expected minus collected
					</p>
				</div>
			</div>

			{/* ─── Collection Progress ──────────────────────────────────────────── */}
			{activeCurrencies.length > 0 && (
				<div className="rounded-2xl border border-border bg-card p-5">
					<div className="mb-4">
						<h2 className="text-lg font-bold tracking-tight text-foreground">
							Collection Progress
						</h2>
						<p className="text-xs text-muted-foreground">
							Collected vs expected for the selected year
						</p>
					</div>
					<div className="space-y-5">
						{activeCurrencies.map((cur) => {
							const expected = expectedTotalByCurrency[cur.code] ?? 0;
							const collected = collectedByCurrency[cur.code] ?? 0;
							const ratio = pct(collected, expected);
							return (
								<div key={cur.code}>
									<div className="flex flex-wrap items-center justify-between gap-2 text-sm">
										<span className="font-bold">{cur.code}</span>
										<span className="font-black text-foreground">
											{fmt(collected)} / {fmt(expected)}
											<PercentBadge value={ratio} />
										</span>
									</div>
									<ProgressBar value={collected} max={expected} />
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* ─── Tabs ──────────────────────────────────────────────────────────── */}
			<div>
				<div className="flex gap-1 rounded-2xl border border-border bg-muted p-1">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 ${
								activeTab === tab.id
									? 'bg-card text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				{activeTab === 'overview' && (
					<div className="mt-6 space-y-6">
						<div className="rounded-2xl border border-border bg-card p-5">
							<div className="mb-4">
								<h2 className="text-lg font-bold tracking-tight text-foreground">
									Fee Type Breakdown
								</h2>
								<p className="text-xs text-muted-foreground">
									Collected amounts grouped by fee type
								</p>
							</div>
							{yearPayments.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No payments recorded for this year.
								</p>
							) : (
								<div className="divide-y divide-border">
									{Object.entries(
										yearPayments.reduce<Record<string, Record<string, number>>>(
											(acc, p) => {
												const key = p.feeType || 'Other';
												if (!acc[key]) acc[key] = {};
												acc[key][p.currency] =
													(acc[key][p.currency] || 0) + p.paymentAmount;
												return acc;
											},
											{},
										),
									)
										.sort(([, a], [, b]) => {
											const sumA = Object.values(a).reduce((s, v) => s + v, 0);
											const sumB = Object.values(b).reduce((s, v) => s + v, 0);
											return sumB - sumA;
										})
										.map(([feeType, byCur]) => (
											<div
												key={feeType}
												className="flex items-center justify-between py-3"
											>
												<span className="text-sm font-bold text-foreground">
													{feeType}
												</span>
												<span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
													{Object.entries(byCur)
														.map(([c, a]) => `${c} ${fmt(a)}`)
														.join(' · ')}
												</span>
											</div>
										))}
								</div>
							)}
						</div>

						<div className="rounded-2xl border border-border bg-card">
							<div className="border-b border-border px-5 py-4">
								<h2 className="font-bold text-foreground">
									Recent Transactions
								</h2>
								<p className="text-xs text-muted-foreground">
									{yearPayments.length} total for {selectedYear}
								</p>
							</div>
							<div className="divide-y divide-border">
								{yearPayments.slice(0, 40).map((p) => (
									<div
										key={p.id}
										className="flex items-center justify-between px-5 py-3"
									>
										<div>
											<p className="text-sm font-bold text-foreground">
												{p.feeType}
											</p>
											<p className="text-xs text-muted-foreground">
												{p.studentId} · {p.paymentDate}
												{p.receiptNumber ? ` · ${p.receiptNumber}` : ''}
											</p>
										</div>
										<div className="text-right">
											<p className="font-black text-emerald-600 dark:text-emerald-400">
												{p.currency} {fmt(p.paymentAmount)}
											</p>
											{p.paidBy && (
												<p className="text-xs text-muted-foreground">
													{p.paidBy}
												</p>
											)}
										</div>
									</div>
								))}
								{yearPayments.length === 0 && (
									<p className="px-5 py-6 text-center text-sm text-muted-foreground">
										No payments recorded for {selectedYear}.
									</p>
								)}
							</div>
						</div>
					</div>
				)}

				{activeTab === 'installments' && (
					<div className="mt-6 space-y-4">
						{installmentsBySession.length === 0 ||
						installmentsBySession.every((s) => s.installments.length === 0) ? (
							<div className="rounded-2xl border border-border bg-card p-8 text-center">
								<p className="text-sm text-muted-foreground">
									No installment data available for {selectedYear}.
								</p>
							</div>
						) : (
							installmentsBySession.map((session) => {
								if (session.installments.length === 0) return null;
								return (
									<Accordion
										key={session.sessionName}
										title={
											<div className="flex items-center gap-2">
												<School className="h-4 w-4 text-muted-foreground" />
												{session.sessionName}
												<span className="ml-2 text-xs font-normal text-muted-foreground">
													{session.installments.length} installment
													{session.installments.length !== 1 ? 's' : ''}
												</span>
											</div>
										}
										defaultOpen
									>
										<div className="space-y-5">
											{session.installments.map((inst) => {
												const instCurrencies = Array.from(
													new Set([
														...Object.keys(inst.expectedByCur),
														...Object.keys(inst.collectedByCur),
													]),
												);
												return (
													<div key={inst.id}>
														<div className="mb-3 flex items-center gap-2">
															<Receipt className="h-4 w-4 text-muted-foreground" />
															<h4 className="font-bold text-foreground">
																{inst.label}
															</h4>
														</div>
														<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
															{instCurrencies.map((cur) => {
																const exp = inst.expectedByCur[cur] ?? 0;
																const col = inst.collectedByCur[cur] ?? 0;
																const due = Math.max(0, exp - col);
																const ratio = pct(col, exp);
																return (
																	<div
																		key={cur}
																		className="rounded-xl bg-muted p-4"
																	>
																		<p className="text-xs font-bold uppercase text-muted-foreground">
																			{cur}
																		</p>
																		<div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
																			<span className="text-muted-foreground">
																				Expected
																			</span>
																			<span className="text-right font-bold text-foreground">
																				{fmt(exp)}
																			</span>
																			<span className="text-muted-foreground">
																				Collected
																			</span>
																			<span className="text-right font-bold text-emerald-600 dark:text-emerald-400">
																				{fmt(col)}
																			</span>
																			<span className="text-muted-foreground">
																				Outstanding
																			</span>
																			<span
																				className={`text-right font-bold ${due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
																			>
																				{fmt(due)}
																			</span>
																		</div>
																		<ProgressBar value={col} max={exp} />
																		<p className="mt-1 text-right text-xs font-bold text-muted-foreground">
																			{ratio}% collected
																		</p>
																	</div>
																);
															})}
														</div>
													</div>
												);
											})}
										</div>
									</Accordion>
								);
							})
						)}
					</div>
				)}

				{activeTab === 'byClass' && (
					<div className="mt-6 space-y-5">
						<div className="flex flex-wrap items-center gap-2">
							<Filter className="h-4 w-4 text-muted-foreground" />
							<button
								onClick={() => setClassFilter('all')}
								className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
									classFilter === 'all'
										? 'bg-primary text-primary-foreground'
										: 'border border-border text-muted-foreground hover:text-foreground'
								}`}
							>
								All Classes
							</button>
							{classSummaries.map((c) => (
								<button
									key={c.classId}
									onClick={() => setClassFilter(c.classId)}
									className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
										classFilter === c.classId
											? 'bg-primary text-primary-foreground'
											: 'border border-border text-muted-foreground hover:text-foreground'
									}`}
								>
									{c.className}
								</button>
							))}
						</div>

						{classSummaries.length === 0 ? (
							<div className="rounded-2xl border border-border bg-card p-8 text-center">
								<p className="text-sm text-muted-foreground">
									No class data available for {selectedYear}.
								</p>
							</div>
						) : (
							<div className="divide-y divide-border rounded-2xl border border-border bg-card">
								{classSummaries
									.filter(
										(c) => classFilter === 'all' || c.classId === classFilter,
									)
									.map((c) => {
										const collected = collectedByClass[c.classId] ?? {};
										const currencies = Array.from(
											new Set([
												...Object.keys(c.expectedByCurrency),
												...Object.keys(collected),
											]),
										);
										const primaryExp =
											c.expectedByCurrency[activeCurrencies[0]?.code ?? ''] ??
											0;
										const primaryCol =
											collected[activeCurrencies[0]?.code ?? ''] ?? 0;

										return (
											<div key={c.classId} className="p-5">
												<div className="flex flex-wrap items-start justify-between gap-2">
													<div>
														<h3 className="font-bold text-foreground">
															{c.className}
														</h3>
														<p className="text-xs text-muted-foreground">
															{c.studentCount} student
															{c.studentCount !== 1 ? 's' : ''}
														</p>
													</div>
													{primaryExp > 0 && (
														<PercentBadge value={pct(primaryCol, primaryExp)} />
													)}
												</div>

												<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
													{currencies.map((cur) => {
														const exp = c.expectedByCurrency[cur] ?? 0;
														const col = collected[cur] ?? 0;
														const due = Math.max(0, exp - col);
														return (
															<div
																key={cur}
																className="rounded-xl bg-muted p-3"
															>
																<p className="text-xs font-bold uppercase text-muted-foreground">
																	{cur}
																</p>
																<div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
																	<span className="text-muted-foreground">
																		Expected
																	</span>
																	<span className="text-right font-bold text-foreground">
																		{fmt(exp)}
																	</span>
																	<span className="text-muted-foreground">
																		Collected
																	</span>
																	<span className="text-right font-bold text-emerald-600 dark:text-emerald-400">
																		{fmt(col)}
																	</span>
																	<span className="text-muted-foreground">
																		Outstanding
																	</span>
																	<span
																		className={`text-right font-bold ${due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
																	>
																		{fmt(due)}
																	</span>
																</div>
																<ProgressBar value={col} max={exp} />
															</div>
														);
													})}
												</div>
											</div>
										);
									})}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}