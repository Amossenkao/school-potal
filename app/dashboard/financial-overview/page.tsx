'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
} from 'lucide-react';

const fmt = (n: number) =>
	n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (part: number, total: number) =>
	total > 0 ? Math.round((part / total) * 100) : 0;

interface CurrencyInfo {
	code: string;
	label: string;
	symbol: string;
}

function Accordion({
	title,
	isOpen,
	onToggle,
	defaultOpen = false,
	children,
}: {
	title: React.ReactNode;
	isOpen?: boolean;
	onToggle?: () => void;
	defaultOpen?: boolean;
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen);
	const resolvedOpen = isOpen !== undefined ? isOpen : open;
	const toggle = () => {
		if (onToggle) onToggle();
		else setOpen((o) => !o);
	};
	return (
		<div className="rounded-2xl border border-border">
			<button
				onClick={toggle}
				aria-expanded={resolvedOpen}
				className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 text-left sm:px-5 sm:py-4"
			>
				<span className="min-w-0 flex-1 font-bold">{title}</span>
				{resolvedOpen ? (
					<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
				) : (
					<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
				)}
			</button>
			{resolvedOpen && (
				<div className="border-t border-border px-4 py-4 sm:px-5">{children}</div>
			)}
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
	const paymentsByAcademicYear = useSchoolStore((s) => s.paymentsByAcademicYear);

	const [activeTab, setActiveTab] = useState<'overview' | 'installments' | 'byClass'>('overview');
	const [byClassSession, setByClassSession] = useState<string>('all');
	const [byClassLevel, setByClassLevel] = useState<string>('all');
	const [byClassClassId, setByClassClassId] = useState<string>('all');
	const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
	const [expandedSession, setExpandedSession] = useState<string | null>(null);
	const [expandedInstallment, setExpandedInstallment] = useState<string | null>(null);
	const [sessionsInit, setSessionsInit] = useState(false);
	const lastDisplayedClassesKeyRef = useRef('');

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

	useEffect(() => {
		if (defaultYear && !selectedYear) setSelectedYear(defaultYear);
	}, [defaultYear, selectedYear]);

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

	const yearPayments = useMemo(
		() => {
			if (!selectedYear || !paymentsByAcademicYear) return [];
			return (
				paymentsByAcademicYear[selectedYear] ||
				Object.entries(paymentsByAcademicYear).find(([k]) => k.replace(/\//g, '-') === selectedYear.replace(/\//g, '-'))?.[1] ||
				[]
			);
		},
		[paymentsByAcademicYear, selectedYear],
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

	const classMeta = useMemo(() => {
		const map: Record<string, { session: string; level: string; className: string }> = {};
		if (!schoolProfile?.academicConfig?.classLevels) return map;
		for (const [session, levels] of Object.entries(schoolProfile.academicConfig.classLevels)) {
			if (!levels || typeof levels !== 'object') continue;
			for (const [level, levelData] of Object.entries(levels)) {
				if (!levelData || typeof levelData !== 'object') continue;
				for (const cls of (levelData as any).classes ?? []) {
					map[cls.classId] = {
						session,
						level,
						className: cls.name || cls.classId,
					};
				}
			}
		}
		return map;
	}, [schoolProfile]);

	// ── Profile-defined ordering for sessions, levels, and classes ─────────
	const profileOrder = useMemo(() => {
		const sessionOrder: string[] = [];
		const levelOrderBySession: Record<string, string[]> = {};
		const levelRank: Record<string, number> = {};
		const classRank: Record<string, number> = {};
		let rank = 0;
		if (schoolProfile?.academicConfig?.classLevels) {
			for (const [session, levels] of Object.entries(
				schoolProfile.academicConfig.classLevels,
			)) {
				if (!levels || typeof levels !== 'object') continue;
				sessionOrder.push(session);
				const levelNames: string[] = [];
				for (const [level, levelData] of Object.entries(levels)) {
					if (!levelData || typeof levelData !== 'object') continue;
					levelNames.push(level);
					if (!(level in levelRank)) levelRank[level] = rank;
					rank++;
					for (const cls of (levelData as any).classes ?? []) {
						classRank[cls.classId] = rank++;
					}
				}
				levelOrderBySession[session] = levelNames;
			}
		}
		return { sessionOrder, levelOrderBySession, levelRank, classRank };
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
			const bills = resolveStudentFees(student, schoolProfile, selectedYear, classId);
			for (const bill of bills) {
				if (!bill.isRequired) continue;
				rows.push({ student, bill });
			}
		}
		return rows;
	}, [schoolProfile, feeSchedule, studentsForYear, selectedYear, getStudentClassId]);

	// ── Map feeId → feeName so payments recorded by feeId roll up to their named category ──
	const feeNameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const { bill } of feeRows) {
			if (bill.feeId && !map.has(bill.feeId)) map.set(bill.feeId, bill.feeName);
		}
		return map;
	}, [feeRows]);

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
		const sessionNames = new Set(
			feeRows
				.map(
					(r) =>
						r.bill.sessionName ||
						classIdToSession[getStudentClassId(r.student)] ||
						'',
				)
				.filter(Boolean),
		);
		const sessions = [
			...profileOrder.sessionOrder.filter((s) => sessionNames.has(s)),
			...Array.from(sessionNames).filter((s) => !profileOrder.sessionOrder.includes(s)),
		];

		return sessions.map((sessionName) => {
			const rows = feeRows.filter((r) => r.bill.sessionName === sessionName);
			const installmentMap: Record<
				string,
				{
					id: string;
					label: string;
					expectedByCur: Record<string, number>;
					collectedByCur: Record<string, number>;
					categories: Record<
						string,
						{ expectedByCur: Record<string, number>; collectedByCur: Record<string, number> }
					>;
				}
			> = {};
			const ensure = (id: string, label: string) => {
				if (!installmentMap[id]) {
					installmentMap[id] = {
						id,
						label,
						expectedByCur: {},
						collectedByCur: {},
						categories: {},
					};
				}
				return installmentMap[id];
			};
			const ensureCategory = (
				bucket: (typeof installmentMap)[string],
				category: string,
			) => {
				if (!bucket.categories[category]) {
					bucket.categories[category] = { expectedByCur: {}, collectedByCur: {} };
				}
				return bucket.categories[category];
			};
			const addExpected = (id: string, label: string, cur: string, amount: number, category: string) => {
				const bucket = ensure(id, label);
				bucket.expectedByCur[cur] = (bucket.expectedByCur[cur] || 0) + amount;
				const cat = ensureCategory(bucket, category);
				cat.expectedByCur[cur] = (cat.expectedByCur[cur] || 0) + amount;
			};
			const addCollected = (id: string, label: string, cur: string, amount: number, category: string) => {
				const bucket = ensure(id, label);
				bucket.collectedByCur[cur] = (bucket.collectedByCur[cur] || 0) + amount;
				const cat = ensureCategory(bucket, category);
				cat.collectedByCur[cur] = (cat.collectedByCur[cur] || 0) + amount;
			};

			const consumed = new Set<string>();

			for (const { student, bill } of rows) {
				const cur = bill.currency;

				if (bill.installments.length === 0) {
					addExpected('__immediate__', 'Immediate', cur, bill.effectiveAmount, bill.feeName);
				} else {
					for (const split of bill.installments) {
						addExpected(split.installmentId, split.label, cur, split.amount, bill.feeName);
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
						bill.feeName,
					);
				} else {
					for (const split of bill.installments) {
						const amount = collected[split.installmentId] || 0;
						if (amount > 0) {
							addCollected(split.installmentId, split.label, cur, amount, bill.feeName);
						}
					}
				}
			}

			// Legacy / unmatched payments fall through to the immediate bucket.
			for (const p of yearPayments) {
				if (consumed.has(p.id)) continue;
				const paymentSession = p.classId ? classIdToSession[p.classId] : null;
				if (paymentSession && paymentSession !== sessionName) continue;
				const category = feeNameById.get(p.feeType) || p.feeType || 'Other';
				addCollected('__immediate__', 'Immediate', p.currency, p.paymentAmount, category);
			}

			return {
				sessionName,
				installments: Object.values(installmentMap),
			};
		});
	}, [feeSchedule, feeRows, yearPayments, classIdToSession, getStudentClassId, feeNameById, profileOrder]);

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
			if (!map[cid]) map[cid] = {};
			map[cid][p.currency] = (map[cid][p.currency] || 0) + p.paymentAmount;
		}
		return map;
	}, [yearPayments]);

	// ── Fee type breakdown: expected + collected per category per currency ──
	const feeTypeBreakdown = useMemo(() => {
		const expected: Record<string, Record<string, number>> = {};
		const collected: Record<string, Record<string, number>> = {};
		for (const { bill } of feeRows) {
			if (!expected[bill.feeName]) expected[bill.feeName] = {};
			expected[bill.feeName][bill.currency] =
				(expected[bill.feeName][bill.currency] || 0) + bill.effectiveAmount;
		}
		for (const p of yearPayments) {
			const key = feeNameById.get(p.feeType) || p.feeType || 'Other';
			if (!collected[key]) collected[key] = {};
			collected[key][p.currency] = (collected[key][p.currency] || 0) + p.paymentAmount;
		}
		const categories = Array.from(
			new Set([...Object.keys(expected), ...Object.keys(collected)]),
		);
		return categories
			.map((category) => {
				const expByCur = expected[category] || {};
				const colByCur = collected[category] || {};
				const currencies = Array.from(
					new Set([...Object.keys(expByCur), ...Object.keys(colByCur)]),
				);
				return { category, expByCur, colByCur, currencies };
			})
			.sort((a, b) => {
				const sumA = Object.values(a.expByCur).reduce((s, v) => s + v, 0);
				const sumB = Object.values(b.expByCur).reduce((s, v) => s + v, 0);
				return sumB - sumA;
			});
	}, [feeRows, yearPayments, feeNameById]);

	// ── By-class category breakdown (expected + collected per class per fee) ──
	const expectedByClassCategory = useMemo(() => {
		const map: Record<string, Record<string, Record<string, number>>> = {};
		for (const { student, bill } of feeRows) {
			const classId = getStudentClassId(student);
			if (!classId) continue;
			if (!map[classId]) map[classId] = {};
			if (!map[classId][bill.feeName]) map[classId][bill.feeName] = {};
			map[classId][bill.feeName][bill.currency] =
				(map[classId][bill.feeName][bill.currency] || 0) + bill.effectiveAmount;
		}
		return map;
	}, [feeRows, getStudentClassId]);

	const collectedByClassCategory = useMemo(() => {
		const map: Record<string, Record<string, Record<string, number>>> = {};
		for (const p of yearPayments) {
			const cid = p.classId || 'unknown';
			const category = feeNameById.get(p.feeType) || p.feeType || 'Other';
			if (!map[cid]) map[cid] = {};
			if (!map[cid][category]) map[cid][category] = {};
			map[cid][category][p.currency] =
				(map[cid][category][p.currency] || 0) + p.paymentAmount;
		}
		return map;
	}, [yearPayments, feeNameById]);

	// ── By-class filter options (session / division-level / class) ──────────
	const byClassSessions = useMemo(() => {
		const known = profileOrder.sessionOrder.filter((s) =>
			classSummaries.some((c) => classMeta[c.classId]?.session === s),
		);
		const unknown = Array.from(
			new Set(
				classSummaries
					.map((c) => classMeta[c.classId]?.session)
					.filter((s) => s && !profileOrder.sessionOrder.includes(s)) as string[],
			),
		);
		return [...known, ...unknown];
	}, [classSummaries, classMeta, profileOrder.sessionOrder]);

	const byClassLevels = useMemo(() => {
		const inSession = classSummaries.filter(
			(c) =>
				byClassSession === 'all' ||
				classMeta[c.classId]?.session === byClassSession,
		);
		const levelsInScope = new Set(
			inSession
				.map((c) => classMeta[c.classId]?.level)
				.filter(Boolean) as string[],
		);
		if (byClassSession !== 'all') {
			return (profileOrder.levelOrderBySession[byClassSession] || []).filter((l) =>
				levelsInScope.has(l),
			);
		}
		const known = Array.from(levelsInScope).filter((l) => l in profileOrder.levelRank);
		const unknown = Array.from(levelsInScope).filter((l) => !(l in profileOrder.levelRank));
		return [
			...known.sort((a, b) => profileOrder.levelRank[a] - profileOrder.levelRank[b]),
			...unknown,
		];
	}, [classSummaries, classMeta, byClassSession, profileOrder]);

	const byClassClasses = useMemo(() => {
		const inScope = classSummaries.filter(
			(c) =>
				(byClassSession === 'all' ||
					classMeta[c.classId]?.session === byClassSession) &&
				(byClassLevel === 'all' ||
					classMeta[c.classId]?.level === byClassLevel),
		);
		return inScope
			.map((c) => ({
				classId: c.classId,
				className: c.className,
			}))
			.sort(
				(a, b) =>
					(profileOrder.classRank[a.classId] ?? 0) -
					(profileOrder.classRank[b.classId] ?? 0),
			);
	}, [classSummaries, classMeta, byClassSession, byClassLevel, profileOrder.classRank]);

	const displayedClasses = useMemo(
		() =>
			classSummaries
				.filter(
					(c) =>
						(byClassSession === 'all' ||
							classMeta[c.classId]?.session === byClassSession) &&
						(byClassLevel === 'all' ||
							classMeta[c.classId]?.level === byClassLevel) &&
						(byClassClassId === 'all' || c.classId === byClassClassId),
				)
				.sort(
					(a, b) =>
						(profileOrder.classRank[a.classId] ?? 0) -
						(profileOrder.classRank[b.classId] ?? 0),
				),
		[
			classSummaries,
			classMeta,
			byClassSession,
			byClassLevel,
			byClassClassId,
			profileOrder.classRank,
		],
	);

	// A single filtered class is expanded by default; otherwise collapsed and
	// only one class accordion may be open at a time.
	useEffect(() => {
		const key = displayedClasses.map((c) => c.classId).join(',');
		if (key !== lastDisplayedClassesKeyRef.current) {
			lastDisplayedClassesKeyRef.current = key;
			setExpandedClassId(
				displayedClasses.length === 1 ? displayedClasses[0].classId : null,
			);
		}
	}, [displayedClasses]);

	// First installments session accordion opens by default (single-open).
	useEffect(() => {
		if (!sessionsInit && installmentsBySession.length > 0) {
			setSessionsInit(true);
			setExpandedSession((prev) => prev ?? installmentsBySession[0].sessionName);
		}
	}, [installmentsBySession, sessionsInit]);

	const handleByClassSessionChange = (value: string) => {
		setByClassSession(value);
		setByClassLevel('all');
		setByClassClassId('all');
	};

	const handleByClassLevelChange = (value: string) => {
		setByClassLevel(value);
		setByClassClassId('all');
	};

	const toggleClassAccordion = (classId: string) => {
		setExpandedClassId((prev) => (prev === classId ? null : classId));
	};

	const toggleSessionAccordion = (sessionName: string) => {
		setExpandedSession((prev) => (prev === sessionName ? null : sessionName));
		setExpandedInstallment(null);
	};

	const toggleInstallmentAccordion = (installmentId: string) => {
		setExpandedInstallment((prev) =>
			prev === installmentId ? null : installmentId,
		);
	};

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

	if (!schoolProfile) {
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
					<h1 className="text-2xl font-black tracking-tight sm:text-3xl">
						Financial Overview
					</h1>
					<p className="mt-0.5 text-sm text-muted-foreground">
						School-wide financial insights and revenue analysis
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-3">
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
					<p className="mt-3 text-2xl font-black leading-tight text-foreground whitespace-pre-line">
						{activeCurrencies.length === 0
							? '—'
							: activeCurrencies
									.map(
										(c) =>
											`${c.code} ${fmt(expectedTotalByCurrency[c.code] ?? 0)}`,
									)
									.join('\n')}
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
					<p className="mt-3 text-2xl font-black leading-tight text-foreground whitespace-pre-line">
						{activeCurrencies.length === 0
							? '—'
							: activeCurrencies
									.map(
										(c) =>
											`${c.code} ${fmt(collectedByCurrency[c.code] ?? 0)}`,
									)
									.join('\n')}
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
					<p className="mt-3 text-2xl font-black leading-tight text-foreground whitespace-pre-line">
						{activeCurrencies.length === 0
							? '—'
							: activeCurrencies
									.map(
										(c) =>
											`${c.code} ${fmt(Math.max(0, balanceByCurrency[c.code] ?? 0))}`,
									)
									.join('\n')}
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
									Expected and collected amounts grouped by fee type
								</p>
							</div>
							{feeTypeBreakdown.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No fee data available for {selectedYear}.
								</p>
							) : (
								<div className="divide-y divide-border">
									{feeTypeBreakdown.map(({ category, expByCur, colByCur, currencies }) => (
										<div key={category} className="py-3">
											<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
												<p className="min-w-0 shrink-0 break-words text-sm font-bold text-foreground sm:w-44">
													{category}
												</p>
												<div className="min-w-0 flex-1 space-y-2">
													{currencies.map((cur) => {
														const exp = expByCur[cur] || 0;
														const col = colByCur[cur] || 0;
														return (
															<div key={cur}>
																<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
																	<span className="font-black text-muted-foreground">
																		{cur}
																	</span>
																	<span className="text-muted-foreground">
																		Expected{' '}
																		<span className="font-bold text-foreground">
																			{fmt(exp)}
																		</span>
																	</span>
																	<span className="text-muted-foreground">
																		Collected{' '}
																		<span className="font-bold text-emerald-600 dark:text-emerald-400">
																			{fmt(col)}
																		</span>
																	</span>
																	<PercentBadge value={pct(col, exp)} />
																</div>
																<ProgressBar value={col} max={exp} />
															</div>
														);
													})}
												</div>
											</div>
										</div>
									))}
								</div>
							)}
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
										isOpen={expandedSession === session.sessionName}
										onToggle={() =>
											toggleSessionAccordion(session.sessionName)
										}
										title={
											<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
												<School className="h-4 w-4 shrink-0 text-muted-foreground" />
												{session.sessionName}
												<span className="text-xs font-normal text-muted-foreground">
													{session.installments.length} installment
													{session.installments.length !== 1 ? 's' : ''}
												</span>
											</span>
										}
									>
										<div className="space-y-4">
											{session.installments.map((inst) => {
												const instCurrencies = Array.from(
													new Set([
														...Object.keys(inst.expectedByCur),
														...Object.keys(inst.collectedByCur),
													]),
												);
												const categories = Object.entries(inst.categories).map(
													([category, catData]) => ({
														category,
														expectedByCur: catData.expectedByCur,
														collectedByCur: catData.collectedByCur,
														currencies: Array.from(
															new Set([
																...Object.keys(catData.expectedByCur),
																...Object.keys(catData.collectedByCur),
															]),
														),
													}),
												);
												return (
													<Accordion
														key={inst.id}
														isOpen={expandedInstallment === inst.id}
														onToggle={() =>
															toggleInstallmentAccordion(inst.id)
														}
														title={
															<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
																<span className="flex items-center gap-2">
																	<Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
																	{inst.label}
																</span>
																<span className="text-xs font-normal text-muted-foreground">
																	Expected{' '}
																	{instCurrencies
																		.map((c) => `${c} ${fmt(inst.expectedByCur[c] ?? 0)}`)
																		.join(' · ')}
																	{' · '}Collected{' '}
																	{instCurrencies
																		.map((c) => `${c} ${fmt(inst.collectedByCur[c] ?? 0)}`)
																		.join(' · ')}
																</span>
															</span>
														}
													>
														<div className="space-y-6">
															{/* Per-currency totals */}
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

															{/* Category breakdown */}
															{categories.length > 0 && (
																<div>
																	<h5 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
																		Category Breakdown
																	</h5>
																	<div className="divide-y divide-border rounded-xl border border-border">
																		{categories.map(
																			({
																				category,
																				expectedByCur,
																				collectedByCur,
																				currencies,
																			}) => (
																				<div key={category} className="p-4">
																					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
																						<p className="min-w-0 shrink-0 break-words text-sm font-bold text-foreground sm:w-44">
																							{category}
																						</p>
																						<div className="min-w-0 flex-1 space-y-2">
																							{currencies.map((cur) => {
																								const exp = expectedByCur[cur] || 0;
																								const col = collectedByCur[cur] || 0;
																								return (
																									<div key={cur}>
																										<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
																											<span className="font-black text-muted-foreground">
																												{cur}
																											</span>
																											<span className="text-muted-foreground">
																												Expected{' '}
																												<span className="font-bold text-foreground">
																													{fmt(exp)}
																												</span>
																											</span>
																											<span className="text-muted-foreground">
																												Collected{' '}
																												<span className="font-bold text-emerald-600 dark:text-emerald-400">
																													{fmt(col)}
																												</span>
																											</span>
																											<PercentBadge value={pct(col, exp)} />
																										</div>
																										<ProgressBar value={col} max={exp} />
																									</div>
																								);
																							})}
																						</div>
																					</div>
																				</div>
																			),
																		)}
																	</div>
																</div>
															)}
														</div>
													</Accordion>
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
						<div className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-3">
							<FilterSelect
								label="Session"
								value={byClassSession}
								onChange={handleByClassSessionChange}
								options={[
									{ label: 'All Sessions', value: 'all' },
									...byClassSessions.map((s) => ({ label: s, value: s })),
								]}
							/>
							<FilterSelect
								label="Division/Level"
								value={byClassLevel}
								onChange={handleByClassLevelChange}
								options={[
									{ label: 'All Levels', value: 'all' },
									...byClassLevels.map((l) => ({ label: l, value: l })),
								]}
							/>
							<FilterSelect
								label="Class"
								value={byClassClassId}
								onChange={(v) => setByClassClassId(v)}
								options={[
									{ label: 'All Classes', value: 'all' },
									...byClassClasses.map((cl) => ({
										label: cl.className,
										value: cl.classId,
									})),
								]}
							/>
						</div>

						{displayedClasses.length === 0 ? (
							<div className="rounded-2xl border border-border bg-card p-8 text-center">
								<p className="text-sm text-muted-foreground">
									No class data available for {selectedYear}.
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{displayedClasses.map((c) => {
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

										const expCat = expectedByClassCategory[c.classId] || {};
										const colCat = collectedByClassCategory[c.classId] || {};
										const classCategories = Array.from(
											new Set([
												...Object.keys(expCat),
												...Object.keys(colCat),
											]),
										);

										return (
											<Accordion
												key={c.classId}
												isOpen={expandedClassId === c.classId}
												onToggle={() => toggleClassAccordion(c.classId)}
												title={
													<span className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
														<span className="flex min-w-0 items-center gap-2">
															<School className="h-4 w-4 shrink-0 text-muted-foreground" />
															<span className="truncate font-bold">{c.className}</span>
															<span className="text-xs font-normal text-muted-foreground">
																{c.studentCount} student
																{c.studentCount !== 1 ? 's' : ''}
															</span>
														</span>
														<span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
															{currencies.map((cur) => (
																<span key={cur} className="font-medium text-muted-foreground">
																	{cur}{' '}
																	<span className="font-bold text-emerald-600 dark:text-emerald-400">
																		{fmt(collected[cur] || 0)}
																	</span>
																	{' / '}
																	<span className="font-bold text-foreground">
																		{fmt(c.expectedByCurrency[cur] || 0)}
																	</span>
																</span>
															))}
															{primaryExp > 0 && (
																<PercentBadge value={pct(primaryCol, primaryExp)} />
															)}
														</span>
													</span>
												}
											>
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

												{/* Category breakdown */}
												{classCategories.length > 0 && (
													<div className="mt-5">
														<h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
															Payment Categories
														</h4>
														<div className="divide-y divide-border rounded-xl border border-border">
															{classCategories.map((cat) => {
																const catExp = expCat[cat] || {};
																const catCol = colCat[cat] || {};
																const catCurrencies = Array.from(
																	new Set([
																		...Object.keys(catExp),
																		...Object.keys(catCol),
																	]),
																);
																return (
																	<div key={cat} className="p-4">
																		<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
																			<p className="min-w-0 shrink-0 break-words text-sm font-bold text-foreground sm:w-44">
																				{cat}
																			</p>
																			<div className="min-w-0 flex-1 space-y-2">
																				{catCurrencies.map((cur) => {
																					const exp = catExp[cur] || 0;
																					const col = catCol[cur] || 0;
																					const due = Math.max(0, exp - col);
																					return (
																						<div key={cur}>
																							<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
																								<span className="font-black text-muted-foreground">
																									{cur}
																								</span>
																								<span className="text-muted-foreground">
																									Expected{' '}
																									<span className="font-bold text-foreground">
																										{fmt(exp)}
																									</span>
																								</span>
																								<span className="text-muted-foreground">
																									Collected{' '}
																									<span className="font-bold text-emerald-600 dark:text-emerald-400">
																										{fmt(col)}
																									</span>
																								</span>
																								<span className="text-muted-foreground">
																									Outstanding{' '}
																									<span
																										className={`font-bold ${due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
																									>
																										{fmt(due)}
																									</span>
																								</span>
																								<PercentBadge value={pct(col, exp)} />
																							</div>
																							<ProgressBar value={col} max={exp} />
																						</div>
																					);
																				})}
																			</div>
																		</div>
																	</div>
																);
															})}
														</div>
													</div>
												)}
											</Accordion>
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

/* ── Reusable compact filter select ── */
interface FilterSelectProps {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: { label: string; value: string }[];
	disabled?: boolean;
}

const FilterSelect: React.FC<FilterSelectProps> = ({
	label,
	value,
	onChange,
	options,
	disabled,
}) => (
	<div className="flex flex-col gap-0.5">
		<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
			{label}
		</span>
		<div className="relative">
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				className={`h-8 pl-3 pr-8 rounded-lg border text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors ${
					disabled
						? 'bg-muted text-muted-foreground cursor-not-allowed opacity-80 border-input'
						: 'bg-background text-foreground cursor-pointer border-input hover:border-ring/50'
				}`}
			>
				{options.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
			{!disabled && (
				<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
			)}
		</div>
	</div>
);