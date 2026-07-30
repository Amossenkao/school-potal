'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import {
	getCurrentAcademicYearFromSchoolProfile,
} from '@/utils/academicYearAccess';
import { buildSchoolAcademicYearRange } from '@/utils/academicYearOptions';
import type { FeeSchedule, Scholarship, StudentGroup, RuleCondition, Money } from '@/types/schoolProfile';
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

const evaluateCondition = (student: any, yearEntry: any, cond: RuleCondition): boolean => {
	const val = student[cond.field] ?? yearEntry?.[cond.field];
	switch (cond.operator) {
		case 'equals': return val === cond.value;
		case 'notEquals': return val !== cond.value;
		case 'in': return Array.isArray(cond.value) && cond.value.includes(val);
		case 'notIn': return !Array.isArray(cond.value) || !cond.value.includes(val);
		case 'contains': return String(val ?? '').includes(String(cond.value));
		case 'notContains': return !String(val ?? '').includes(String(cond.value));
		case 'greaterThan': return Number(val) > Number(cond.value);
		case 'lessThan': return Number(val) < Number(cond.value);
		case 'greaterThanOrEquals': return Number(val) >= Number(cond.value);
		case 'lessThanOrEquals': return Number(val) <= Number(cond.value);
		default: return true;
	}
};

const matchStudentGroups = (
	student: any,
	yearEntry: any,
	groups: StudentGroup[],
): string[] =>
	groups
		.filter((g) => g.isActive && g.conditions.every((c) => evaluateCondition(student, yearEntry, c)))
		.map((g) => g.id);

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
	const [activeTab, setActiveTab] = useState<'overview' | 'installments' | 'scholarships' | 'byClass'>('overview');
	const [classFilter, setClassFilter] = useState<string>('all');

	const availableYears = useMemo(() => {
		if (!schoolProfile) return [];
		return buildSchoolAcademicYearRange({
			firstAcademicYear: schoolProfile.identity?.firstAcademicYear,
			currentAcademicYear: schoolProfile.identity?.currentAcademicYear,
		});
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

	const studentGroups = useMemo(
		() => schoolProfile?.financialConfig?.studentGroups ?? [],
		[schoolProfile],
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

	const getStudentYearEntry = useCallback((student: any): any => {
		return Array.isArray(student.academicYears)
			? student.academicYears.find(
					(e: any) => (e?.year || '').replace(/\//g, '-') === selectedYear.replace(/\//g, '-'),
				)
			: null;
	}, [selectedYear]);

	const studentMatchesFee = useCallback((
		student: any,
		sf: { applicableStudentGroupIds: readonly string[] },
		studentGroupIds: string[],
	): boolean => {
		if (sf.applicableStudentGroupIds.length === 0) return true;
		return sf.applicableStudentGroupIds.some((gid) => studentGroupIds.includes(gid));
	}, []);

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

	// ── Expected income per currency (handles student groups & session) ────
	const expectedTotalByCurrency = useMemo((): Record<string, number> => {
		const totals: Record<string, number> = {};
		if (!feeSchedule || studentsForYear.length === 0) return totals;

		for (const student of studentsForYear) {
			const classId = getStudentClassId(student);
			if (!classId) continue;
			const studentSession = classIdToSession[classId];
			if (selectedSession !== 'all' && studentSession !== selectedSession) continue;

			const yearEntry = getStudentYearEntry(student);
			const groupIds = matchStudentGroups(student, yearEntry, studentGroups);

			for (const sfs of feeSchedule.sessionFeeSchedules) {
				if (selectedSession !== 'all' && sfs.sessionName !== selectedSession) continue;
				for (const fg of sfs.feeGroups) {
					if (!fg.appliesToClassIds.includes(classId)) continue;
					for (const sf of fg.scheduledFees) {
						if (!sf.isRequired) continue;
						if (!studentMatchesFee(student, sf, groupIds)) continue;
						const cur = sf.amount.currency;
						totals[cur] = (totals[cur] || 0) + sf.amount.amount;
					}
				}
			}
		}
		return totals;
	}, [feeSchedule, studentsForYear, selectedYear, selectedSession, classIdToSession, getStudentClassId, getStudentYearEntry, studentGroups, studentMatchesFee]);

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
		const plans = schoolProfile?.financialConfig?.paymentPlans ?? [];
		const feeDefinitions = schoolProfile?.financialConfig?.feeDefinitions ?? [];

		return feeSchedule.sessionFeeSchedules.map((sfs) => {
			const installmentMap: Record<
				string,
				{ id: string; label: string; expectedByCur: Record<string, number>; collectedByCur: Record<string, number> }
			> = {};

			for (const fg of sfs.feeGroups) {
				const plan = plans.find((p) => p.id === fg.paymentPlanId);
				if (!plan) continue;

				const studentsInGroup = studentsForYear.filter((student) => {
					const classId = getStudentClassId(student);
					if (!classId) return false;
					const studentSession = classIdToSession[classId];
					if (studentSession !== sfs.sessionName) return false;
					return fg.appliesToClassIds.includes(classId);
				});

				for (const sf of fg.scheduledFees) {
					if (!sf.isRequired) continue;
					const installmentId = sf.dueInstallmentId ?? '__immediate__';
					const installment = sf.dueInstallmentId
						? plan.installments.find((i) => i.id === sf.dueInstallmentId)
						: null;
					const label = installment?.label ?? (sf.dueInstallmentId ? sf.dueInstallmentId : 'Immediate');

					if (!installmentMap[installmentId]) {
						installmentMap[installmentId] = { id: installmentId, label, expectedByCur: {}, collectedByCur: {} };
					}

					const cur = sf.amount.currency;
					for (const student of studentsInGroup) {
						const yearEntry = getStudentYearEntry(student);
						const groupIds = matchStudentGroups(student, yearEntry, studentGroups);
						if (!studentMatchesFee(student, sf, groupIds)) continue;
						installmentMap[installmentId].expectedByCur[cur] =
							(installmentMap[installmentId].expectedByCur[cur] || 0) + sf.amount.amount;
					}
				}
			}

			for (const p of yearPayments) {
				const paymentSession = p.classId ? classIdToSession[p.classId] : null;
				if (paymentSession && paymentSession !== sfs.sessionName) continue;

				const feeDef = feeDefinitions.find(
					(fd) => fd.name === p.feeType || fd.id === p.feeType,
				);
				if (!feeDef) {
					if (installmentMap['__immediate__']) {
						installmentMap['__immediate__'].collectedByCur[p.currency] =
							(installmentMap['__immediate__'].collectedByCur[p.currency] || 0) + p.paymentAmount;
					}
					continue;
				}

				for (const fg of sfs.feeGroups) {
					const sf = fg.scheduledFees.find((s) => s.feeId === feeDef.id);
					if (!sf) continue;
					const key = sf.dueInstallmentId ?? '__immediate__';
					if (installmentMap[key]) {
						installmentMap[key].collectedByCur[p.currency] =
							(installmentMap[key].collectedByCur[p.currency] || 0) + p.paymentAmount;
					}
					break;
				}
			}

			return {
				sessionName: sfs.sessionName,
				installments: Object.values(installmentMap),
			};
		});
	}, [feeSchedule, studentsForYear, yearPayments, schoolProfile, selectedYear, classIdToSession, getStudentClassId, getStudentYearEntry, studentGroups, studentMatchesFee]);

	// ── Scholarship insights ────────────────────────────────────────────────
	const scholarshipInsights = useMemo(() => {
		if (!feeSchedule) return [];
		const groups = schoolProfile?.financialConfig?.studentGroups ?? [];

		return (feeSchedule.scholarships ?? []).map((s: Scholarship) => {
			const matchedGroup = groups.find(
				(g: StudentGroup) =>
					g.name.toLowerCase().includes(s.name.toLowerCase().slice(0, 8)) ||
					s.name.toLowerCase().includes(g.name.toLowerCase().slice(0, 8)),
			);

			const eligibleStudents = matchedGroup
				? studentsForYear.filter((student) => {
						const yearEntry = getStudentYearEntry(student);
						return matchedGroup.conditions.every((cond) => evaluateCondition(student, yearEntry, cond));
					})
				: [];

			return { scholarship: s, eligibleCount: eligibleStudents.length, groupName: matchedGroup?.name ?? null };
		});
	}, [feeSchedule, studentsForYear, schoolProfile, selectedYear, getStudentYearEntry]);

	// ── By-class breakdown ──────────────────────────────────────────────────
	const allFeeClasses = useMemo((): string[] => {
		if (!feeSchedule) return [];
		const ids: string[] = [];
		for (const sfs of feeSchedule.sessionFeeSchedules) {
			if (selectedSession !== 'all' && sfs.sessionName !== selectedSession) continue;
			for (const fg of sfs.feeGroups) {
				ids.push(...fg.appliesToClassIds);
			}
		}
		return Array.from(new Set(ids));
	}, [feeSchedule, selectedSession]);

	const classSummaries = useMemo(() => {
		if (!feeSchedule) return [];

		return allFeeClasses.map((classId) => {
			const studentsInClass = studentsForYear.filter((s) => {
				const cid = getStudentClassId(s);
				if (!cid) return false;
				const sSession = classIdToSession[cid];
				if (selectedSession !== 'all' && sSession !== selectedSession) return false;
				return cid === classId;
			});

			const expectedByCurrency: Record<string, number> = {};
			for (const sfs of feeSchedule.sessionFeeSchedules) {
				if (selectedSession !== 'all' && sfs.sessionName !== selectedSession) continue;
				const fg = sfs.feeGroups.find((g) => g.appliesToClassIds.includes(classId));
				if (!fg) continue;
				for (const sf of fg.scheduledFees) {
					if (!sf.isRequired) continue;
					const cur = sf.amount.currency;
					for (const student of studentsInClass) {
						const yearEntry = getStudentYearEntry(student);
						const groupIds = matchStudentGroups(student, yearEntry, studentGroups);
						if (!studentMatchesFee(student, sf, groupIds)) continue;
						expectedByCurrency[cur] = (expectedByCurrency[cur] || 0) + sf.amount.amount;
					}
				}
			}

			return {
				classId,
				className: classNameMap[classId] || classId,
				studentCount: studentsInClass.length,
				expectedByCurrency,
			};
		});
	}, [feeSchedule, studentsForYear, allFeeClasses, classNameMap, selectedYear, selectedSession, classIdToSession, getStudentClassId, getStudentYearEntry, studentGroups, studentMatchesFee]);

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
		{ id: 'scholarships', label: 'Scholarships & Wards' },
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
					<h1 className="text-2xl font-black tracking-tight">Financial Overview</h1>
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
									<option key={s} value={s}>{s}</option>
								))}
							</select>
						</div>
					)}
					<div className="flex items-center gap-2">
						<Calendar className="h-4 w-4 text-muted-foreground" />
						<select
							value={selectedYear}
							onChange={(e) => setSelectedYear(e.target.value)}
							className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							{availableYears.length > 0
								? availableYears.map((y) => (
										<option key={y} value={y}>{y}</option>
									))
								: selectedYear && <option value={selectedYear}>{selectedYear}</option>}
						</select>
					</div>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-2xl border border-border bg-card p-5">
					<div className="flex items-start justify-between gap-2">
						<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Students</p>
						<GraduationCap className="h-5 w-5 text-muted-foreground" />
					</div>
					<p className="mt-3 text-2xl font-black leading-tight text-foreground">{studentsForYear.length}</p>
					<p className="mt-1 text-xs font-medium text-muted-foreground">Enrolled in {selectedYear}</p>
				</div>
				<div className="rounded-2xl border border-border bg-card p-5">
					<div className="flex items-start justify-between gap-2">
						<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Expected Income</p>
						<DollarSign className="h-5 w-5 text-muted-foreground" />
					</div>
					<p className="mt-3 text-2xl font-black leading-tight text-foreground">
						{activeCurrencies.length === 0
							? '—'
							: activeCurrencies
									.map((c) => `${c.symbol || c.code} ${fmt(expectedTotalByCurrency[c.code] ?? 0)}`)
									.join(' · ')}
					</p>
					<p className="mt-1 text-xs font-medium text-muted-foreground">Based on fee schedule × students</p>
				</div>
				<div className="rounded-2xl border border-border bg-card p-5">
					<div className="flex items-start justify-between gap-2">
						<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Collected</p>
						<Landmark className="h-5 w-5 text-muted-foreground" />
					</div>
					<p className="mt-3 text-2xl font-black leading-tight text-foreground">
						{activeCurrencies.length === 0
							? '—'
							: activeCurrencies
									.map((c) => `${c.symbol || c.code} ${fmt(collectedByCurrency[c.code] ?? 0)}`)
									.join(' · ')}
					</p>
					<p className="mt-1 text-xs font-medium text-muted-foreground">{yearPayments.length} transactions</p>
				</div>
				<div className="rounded-2xl border border-border bg-card p-5">
					<div className="flex items-start justify-between gap-2">
						<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Outstanding Balance</p>
						<AlertTriangle className={`h-5 w-5 ${
							Object.values(balanceByCurrency).some((v) => v > 0) ? 'text-rose-500' : 'text-emerald-500'
						}`} />
					</div>
					<p className="mt-3 text-2xl font-black leading-tight text-foreground">
						{activeCurrencies.length === 0
							? '—'
							: activeCurrencies
									.map((c) => `${c.symbol || c.code} ${fmt(Math.max(0, balanceByCurrency[c.code] ?? 0))}`)
									.join(' · ')}
					</p>
					<p className="mt-1 text-xs font-medium text-muted-foreground">Expected minus collected</p>
				</div>
			</div>

			{/* ─── Collection Progress ──────────────────────────────────────────── */}
			{activeCurrencies.length > 0 && (
				<div className="rounded-2xl border border-border bg-card p-5">
					<div className="mb-4">
						<h2 className="text-lg font-bold tracking-tight text-foreground">Collection Progress</h2>
						<p className="text-xs text-muted-foreground">Collected vs expected for the selected year</p>
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
								<h2 className="text-lg font-bold tracking-tight text-foreground">Fee Type Breakdown</h2>
								<p className="text-xs text-muted-foreground">Collected amounts grouped by fee type</p>
							</div>
							{yearPayments.length === 0 ? (
								<p className="text-sm text-muted-foreground">No payments recorded for this year.</p>
							) : (
								<div className="divide-y divide-border">
									{Object.entries(
										yearPayments.reduce<Record<string, Record<string, number>>>((acc, p) => {
											const key = p.feeType || 'Other';
											if (!acc[key]) acc[key] = {};
											acc[key][p.currency] = (acc[key][p.currency] || 0) + p.paymentAmount;
											return acc;
										}, {}),
									)
										.sort(([, a], [, b]) => {
											const sumA = Object.values(a).reduce((s, v) => s + v, 0);
											const sumB = Object.values(b).reduce((s, v) => s + v, 0);
											return sumB - sumA;
										})
										.map(([feeType, byCur]) => (
											<div key={feeType} className="flex items-center justify-between py-3">
												<span className="text-sm font-bold text-foreground">{feeType}</span>
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
								<h2 className="font-bold text-foreground">Recent Transactions</h2>
								<p className="text-xs text-muted-foreground">{yearPayments.length} total for {selectedYear}</p>
							</div>
							<div className="divide-y divide-border">
								{yearPayments.slice(0, 40).map((p) => (
									<div key={p.id} className="flex items-center justify-between px-5 py-3">
										<div>
											<p className="text-sm font-bold text-foreground">{p.feeType}</p>
											<p className="text-xs text-muted-foreground">
												{p.studentId} · {p.paymentDate}
												{p.receiptNumber ? ` · ${p.receiptNumber}` : ''}
											</p>
										</div>
										<div className="text-right">
											<p className="font-black text-emerald-600 dark:text-emerald-400">
												{p.currency} {fmt(p.paymentAmount)}
											</p>
											{p.paidBy && <p className="text-xs text-muted-foreground">{p.paidBy}</p>}
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
													{session.installments.length} installment{session.installments.length !== 1 ? 's' : ''}
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
															<h4 className="font-bold text-foreground">{inst.label}</h4>
														</div>
														<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
															{instCurrencies.map((cur) => {
																const exp = inst.expectedByCur[cur] ?? 0;
																const col = inst.collectedByCur[cur] ?? 0;
																const due = Math.max(0, exp - col);
																const ratio = pct(col, exp);
																return (
																	<div key={cur} className="rounded-xl bg-muted p-4">
																		<p className="text-xs font-bold uppercase text-muted-foreground">{cur}</p>
																		<div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
																			<span className="text-muted-foreground">Expected</span>
																			<span className="text-right font-bold text-foreground">{fmt(exp)}</span>
																			<span className="text-muted-foreground">Collected</span>
																			<span className="text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(col)}</span>
																			<span className="text-muted-foreground">Outstanding</span>
																			<span className={`text-right font-bold ${due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
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

				{activeTab === 'scholarships' && (
					<div className="mt-6 space-y-4">
						{scholarshipInsights.length === 0 ? (
							<div className="rounded-2xl border border-border bg-card p-8 text-center">
								<p className="text-sm text-muted-foreground">
									No scholarships configured for {selectedYear}.
								</p>
							</div>
						) : (
							<>
								<div className="grid gap-4 sm:grid-cols-2">
									{scholarshipInsights.map(({ scholarship, eligibleCount, groupName }) => {
										const isPercentage = scholarship.scholarshipType === 'percentage';
										const isDeduction = scholarship.scholarshipType === 'fixedDeduction';
										const typeLabel = isPercentage
											? `${scholarship.amount}% off`
											: isDeduction
												? `${scholarship.currency ?? ''} ${fmt(scholarship.amount)} off`
												: `${scholarship.currency ?? ''} ${fmt(scholarship.amount)} payment`;

										return (
											<div key={scholarship.id} className="rounded-2xl border border-border bg-card p-5">
												<div className="flex items-start justify-between gap-2">
													<h3 className="font-bold text-foreground">{scholarship.name}</h3>
													<span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
														{isPercentage ? 'Percentage' : isDeduction ? 'Deduction' : 'Fixed Payment'}
													</span>
												</div>
												{scholarship.description && (
													<p className="mt-1 text-xs text-muted-foreground">{scholarship.description}</p>
												)}
												<div className="mt-3 grid grid-cols-2 gap-3">
													<div className="rounded-xl bg-muted p-3">
														<p className="text-xs text-muted-foreground">Benefit</p>
														<p className="font-bold text-foreground">{typeLabel}</p>
													</div>
													<div className="rounded-xl bg-muted p-3">
														<p className="text-xs text-muted-foreground">Eligible Students</p>
														<p className="font-bold text-foreground">
															{eligibleCount > 0 ? eligibleCount : '—'}
														</p>
													</div>
												</div>
												{groupName && (
													<p className="mt-3 text-xs text-muted-foreground">
														Linked group: <span className="font-bold text-foreground">{groupName}</span>
													</p>
												)}
												{scholarship.appliesTo.length > 0 && (
													<p className="mt-1 text-xs text-muted-foreground">
														Applies to: <span className="font-bold text-foreground">{scholarship.appliesTo.join(', ')}</span>
													</p>
												)}
											</div>
										);
									})}
								</div>

								{(schoolProfile?.financialConfig?.studentGroups?.filter((g) => g.isActive) ?? []).length > 0 && (
									<div className="rounded-2xl border border-border bg-card p-5">
										<div className="mb-4">
											<h2 className="text-lg font-bold tracking-tight text-foreground">Student Groups</h2>
											<p className="text-xs text-muted-foreground">Active student categorisations that affect fee eligibility</p>
										</div>
										<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
											{(schoolProfile?.financialConfig?.studentGroups ?? [])
												.filter((g) => g.isActive)
												.map((g) => {
													const matchCount = studentsForYear.filter((s) => {
														const yearEntry = getStudentYearEntry(s);
														return g.conditions.every((cond) => evaluateCondition(s, yearEntry, cond));
													}).length;

													return (
														<div key={g.id} className="rounded-xl border border-border bg-muted p-4">
															<p className="text-sm font-bold text-foreground">{g.name}</p>
															<p className="mt-1 text-2xl font-black text-foreground">{matchCount}</p>
															<p className="text-xs text-muted-foreground">
																{matchCount === 1 ? 'student' : 'students'} matched
															</p>
														</div>
													);
												})}
										</div>
									</div>
								)}
							</>
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
									.filter((c) => classFilter === 'all' || c.classId === classFilter)
									.map((c) => {
										const collected = collectedByClass[c.classId] ?? {};
										const currencies = Array.from(
											new Set([...Object.keys(c.expectedByCurrency), ...Object.keys(collected)]),
										);
										const primaryExp = c.expectedByCurrency[activeCurrencies[0]?.code ?? ''] ?? 0;
										const primaryCol = collected[activeCurrencies[0]?.code ?? ''] ?? 0;

										return (
											<div key={c.classId} className="p-5">
												<div className="flex flex-wrap items-start justify-between gap-2">
													<div>
														<h3 className="font-bold text-foreground">{c.className}</h3>
														<p className="text-xs text-muted-foreground">
															{c.studentCount} student{c.studentCount !== 1 ? 's' : ''}
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
															<div key={cur} className="rounded-xl bg-muted p-3">
																<p className="text-xs font-bold uppercase text-muted-foreground">{cur}</p>
																<div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
																	<span className="text-muted-foreground">Expected</span>
																	<span className="text-right font-bold text-foreground">{fmt(exp)}</span>
																	<span className="text-muted-foreground">Collected</span>
																	<span className="text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(col)}</span>
																	<span className="text-muted-foreground">Outstanding</span>
																	<span className={`text-right font-bold ${due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
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