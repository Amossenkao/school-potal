'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	ArrowLeft,
	CalendarDays,
	ChevronDown,
	Filter,
	Landmark,
	Receipt,
	Search,
	TrendingUp,
	User,
	Users,
	Wallet,
	X,
} from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';
import { buildSchoolAcademicYearRange } from '@/utils/academicYearOptions';
import StudentFinder, {
	classIdForYear,
	studentFullName,
	useClassDirectory,
} from '@/app/dashboard/shared/components/StudentFinder';

const PAGE_SIZE = 20;

const formatCurrency = (amount: number) =>
	(Number.isFinite(amount) ? amount : 0).toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const normalizeYear = (value?: string) => (value || '').replace(/\//g, '-');

const toDate = (value: string) => {
	// paymentDate is stored as an ISO date string (YYYY-MM-DD).
	const [year, month, day] = String(value || '').split('-').map(Number);
	if (!year || !month || !day) return null;
	return new Date(year, month - 1, day);
};

const formatDayHeading = (value: string) => {
	const date = toDate(value);
	if (!date) return value || 'Undated';
	const today = new Date();
	const isToday = date.toDateString() === today.toDateString();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	const isYesterday = date.toDateString() === yesterday.toDateString();
	const label = date.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
	if (isToday) return `Today · ${label}`;
	if (isYesterday) return `Yesterday · ${label}`;
	return label;
};

const daysAgo = (count: number) => {
	const date = new Date();
	date.setDate(date.getDate() - count);
	return date.toISOString().split('T')[0];
};

type RangeId = 'all' | '7d' | '30d' | '90d' | 'custom';

const RANGES: { id: RangeId; label: string }[] = [
	{ id: 'all', label: 'All year' },
	{ id: '7d', label: 'Last 7 days' },
	{ id: '30d', label: 'Last 30 days' },
	{ id: '90d', label: 'Last 90 days' },
];

const initials = (name: string) =>
	name
		.split(' ')
		.slice(0, 2)
		.map((part) => part[0] || '')
		.join('')
		.toUpperCase();

/* ── Primitives ────────────────────────────────────────────────────────── */

function StatTile({
	label,
	icon: Icon,
	children,
	hint,
}: {
	label: string;
	icon: any;
	children: React.ReactNode;
	hint?: string;
}) {
	return (
		<div className="rounded-2xl border border-border bg-card p-4">
			<div className="flex items-start justify-between gap-2">
				<p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
					{label}
				</p>
				<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
			</div>
			<div className="mt-2">{children}</div>
			{hint && (
				<p className="mt-1 text-[11px] font-medium text-muted-foreground">
					{hint}
				</p>
			)}
		</div>
	);
}

function ReceiptRow({
	payment,
	studentName,
	classLabel,
	showStudent,
}: {
	payment: any;
	studentName: string;
	classLabel: string;
	showStudent: boolean;
}) {
	return (
		<li className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
			<span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
				<Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
			</span>
			<div className="min-w-0 flex-1">
				{showStudent && (
					<p className="truncate text-sm font-bold text-foreground">
						{studentName}
					</p>
				)}
				<p
					className={`truncate text-sm ${showStudent ? 'text-muted-foreground' : 'font-bold text-foreground'}`}
				>
					{payment.feeType || 'Payment'}
				</p>
				<p className="mt-0.5 truncate text-xs text-muted-foreground">
					{payment.receiptNumber}
					{classLabel ? ` · ${classLabel}` : ''}
					{payment.paidBy ? ` · by ${payment.paidBy}` : ''}
					{payment.paymentTime ? ` · ${payment.paymentTime}` : ''}
				</p>
			</div>
			<div className="shrink-0 text-right">
				<p className="whitespace-nowrap text-sm font-black tabular-nums text-emerald-600 dark:text-emerald-400">
					{payment.currency} {formatCurrency(payment.paymentAmount)}
				</p>
				<p className="text-[11px] capitalize text-muted-foreground">
					{payment.paymentMethod || 'cash'}
				</p>
			</div>
		</li>
	);
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function AdminPaymentHistoryPage() {
	const schoolProfile = useSchoolStore((state) => state.school);
	const paymentsByAcademicYear = useSchoolStore(
		(state) => state.paymentsByAcademicYear,
	);
	const usersByAcademicYear = useSchoolStore((state) => state.usersByAcademicYear);

	const [academicYear, setAcademicYear] = useState('');
	const [selectedStudent, setSelectedStudent] = useState<any>(null);
	const [finderOpen, setFinderOpen] = useState(false);
	const [feeType, setFeeType] = useState('');
	const [range, setRange] = useState<RangeId>('all');
	const [customFrom, setCustomFrom] = useState('');
	const [customTo, setCustomTo] = useState('');
	const [receiptQuery, setReceiptQuery] = useState('');
	const [visible, setVisible] = useState(PAGE_SIZE);

	const directory = useClassDirectory(schoolProfile);

	const academicYearOptions = useMemo(
		() => (schoolProfile ? buildSchoolAcademicYearRange(schoolProfile) : []),
		[schoolProfile],
	);

	useEffect(() => {
		if (!schoolProfile || academicYear) return;
		setAcademicYear(getCurrentAcademicYearFromSchoolProfile(schoolProfile) || '');
	}, [schoolProfile, academicYear]);

	const students = useMemo(() => {
		if (!academicYear) return [];
		const yearData =
			usersByAcademicYear?.[academicYear] ||
			Object.entries(usersByAcademicYear || {}).find(
				([key]) => normalizeYear(key) === normalizeYear(academicYear),
			)?.[1];
		return Array.isArray((yearData as any)?.students)
			? (yearData as any).students
			: [];
	}, [usersByAcademicYear, academicYear]);

	const studentIndex = useMemo(() => {
		const map = new Map<string, any>();
		for (const student of students) {
			map.set(String(student.studentId), student);
		}
		return map;
	}, [students]);

	const yearPayments = useMemo(() => {
		if (!academicYear) return [];
		const list =
			paymentsByAcademicYear?.[academicYear] ||
			Object.entries(paymentsByAcademicYear || {}).find(
				([key]) => normalizeYear(key) === normalizeYear(academicYear),
			)?.[1] ||
			[];
		return Array.isArray(list) ? list : [];
	}, [paymentsByAcademicYear, academicYear]);

	const feeTypes = useMemo(
		() =>
			Array.from(
				new Set(
					yearPayments
						.map((payment: any) => payment.feeType)
						.filter(Boolean) as string[],
				),
			).sort(),
		[yearPayments],
	);

	const nameFor = (studentId: string) => {
		const student = studentIndex.get(String(studentId));
		return student ? studentFullName(student) : String(studentId);
	};

	const classFor = (payment: any) => {
		const student = studentIndex.get(String(payment.studentId));
		const cid =
			payment.classId ||
			(student ? classIdForYear(student, academicYear) : '') ||
			'';
		return directory.byId[cid]?.className || student?.className || '';
	};

	// ── Filtering ────────────────────────────────────────────────────────
	const filtered = useMemo(() => {
		const from =
			range === '7d'
				? daysAgo(7)
				: range === '30d'
					? daysAgo(30)
					: range === '90d'
						? daysAgo(90)
						: range === 'custom'
							? customFrom
							: '';
		const to = range === 'custom' ? customTo : '';
		const receipt = receiptQuery.trim().toLowerCase();

		return yearPayments
			.filter((payment: any) => {
				if (
					selectedStudent &&
					String(payment.studentId) !== String(selectedStudent.studentId)
				) {
					return false;
				}
				if (feeType && payment.feeType !== feeType) return false;
				if (from && String(payment.paymentDate || '') < from) return false;
				if (to && String(payment.paymentDate || '') > to) return false;
				if (receipt) {
					const haystack = [
						payment.receiptNumber,
						payment.paidBy,
						payment.studentId,
					]
						.join(' ')
						.toLowerCase();
					if (!haystack.includes(receipt)) return false;
				}
				return true;
			})
			.sort((a: any, b: any) => {
				const dateDiff = String(b.paymentDate || '').localeCompare(
					String(a.paymentDate || ''),
				);
				if (dateDiff !== 0) return dateDiff;
				return String(b.paymentTime || '').localeCompare(
					String(a.paymentTime || ''),
				);
			});
	}, [
		yearPayments,
		selectedStudent,
		feeType,
		range,
		customFrom,
		customTo,
		receiptQuery,
	]);

	// Reset paging whenever the result set changes underneath it.
	useEffect(() => {
		setVisible(PAGE_SIZE);
	}, [
		selectedStudent,
		feeType,
		range,
		customFrom,
		customTo,
		receiptQuery,
		academicYear,
	]);

	const totals = useMemo(() => {
		const byCurrency: Record<string, number> = {};
		const payers = new Set<string>();
		for (const payment of filtered) {
			byCurrency[payment.currency] =
				(byCurrency[payment.currency] || 0) + (payment.paymentAmount || 0);
			payers.add(String(payment.studentId));
		}
		return { byCurrency, payers: payers.size, count: filtered.length };
	}, [filtered]);

	// Only the visible slice is grouped and rendered — never the whole ledger.
	const groups = useMemo(() => {
		const slice = filtered.slice(0, visible);
		const map = new Map<string, any[]>();
		for (const payment of slice) {
			const key = String(payment.paymentDate || '');
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(payment);
		}
		return Array.from(map.entries()).map(([date, items]) => {
			const byCurrency: Record<string, number> = {};
			for (const item of items) {
				byCurrency[item.currency] =
					(byCurrency[item.currency] || 0) + (item.paymentAmount || 0);
			}
			return { date, items, byCurrency };
		});
	}, [filtered, visible]);

	const activeFilters =
		(selectedStudent ? 1 : 0) +
		(feeType ? 1 : 0) +
		(range !== 'all' ? 1 : 0) +
		(receiptQuery.trim() ? 1 : 0);

	const clearFilters = () => {
		setSelectedStudent(null);
		setFeeType('');
		setRange('all');
		setCustomFrom('');
		setCustomTo('');
		setReceiptQuery('');
	};

	if (!schoolProfile) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<p className="text-sm text-muted-foreground">Loading payment history…</p>
			</div>
		);
	}

	const selectedClassName = selectedStudent
		? directory.byId[classIdForYear(selectedStudent, academicYear)]?.className ||
			selectedStudent.className ||
			''
		: '';

	return (
		<div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
			{/* ── Header ──────────────────────────────────────────────────── */}
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-black tracking-tight sm:text-3xl">
						Payment History
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Every receipt recorded for {academicYear || 'the academic year'},
						newest first.
					</p>
				</div>
				{academicYearOptions.length > 1 && (
					<label className="flex items-center gap-2">
						<CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
						<span className="sr-only">Academic year</span>
						<select
							value={academicYear}
							onChange={(event) => setAcademicYear(event.target.value)}
							className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							{academicYearOptions.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
					</label>
				)}
			</header>

			{/* ── Totals for the current filter ───────────────────────────── */}
			<div className="grid gap-4 sm:grid-cols-3">
				<StatTile
					label="Total Collected"
					icon={Landmark}
					hint={selectedStudent ? 'For the selected student' : 'Across all filters'}
				>
					{Object.keys(totals.byCurrency).length === 0 ? (
						<p className="text-2xl font-black text-muted-foreground">—</p>
					) : (
						<div className="space-y-0.5">
							{Object.entries(totals.byCurrency).map(([code, amount]) => (
								<p
									key={code}
									className="text-xl font-black tabular-nums text-foreground"
								>
									<span className="mr-1.5 text-[11px] font-bold uppercase text-muted-foreground">
										{code}
									</span>
									{formatCurrency(amount)}
								</p>
							))}
						</div>
					)}
				</StatTile>
				<StatTile label="Receipts" icon={Receipt} hint="Matching transactions">
					<p className="text-2xl font-black tabular-nums text-foreground">
						{totals.count}
					</p>
				</StatTile>
				<StatTile label="Students" icon={Users} hint="Distinct payers">
					<p className="text-2xl font-black tabular-nums text-foreground">
						{totals.payers}
					</p>
				</StatTile>
			</div>

			{/* ── Student focus ───────────────────────────────────────────── */}
			{selectedStudent ? (
				<div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
						{initials(studentFullName(selectedStudent))}
					</span>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-black text-foreground">
							{studentFullName(selectedStudent)}
						</p>
						<p className="truncate text-xs text-muted-foreground">
							{selectedStudent.studentId}
							{selectedClassName ? ` · ${selectedClassName}` : ''}
						</p>
					</div>
					<button
						type="button"
						onClick={() => setSelectedStudent(null)}
						className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						All students
					</button>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setFinderOpen((open) => !open)}
					className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
				>
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
						<User className="h-4 w-4 text-muted-foreground" />
					</span>
					<span className="min-w-0 flex-1">
						<span className="block text-sm font-bold text-foreground">
							Look up a student&apos;s ledger
						</span>
						<span className="block text-xs text-muted-foreground">
							Search by name, ID, or class — or browse class by class
						</span>
					</span>
					<ChevronDown
						className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${finderOpen ? 'rotate-180' : ''}`}
					/>
				</button>
			)}

			{finderOpen && !selectedStudent && (
				<StudentFinder
					students={students}
					schoolProfile={schoolProfile}
					academicYear={academicYear}
					autoFocus
					onSelect={(student) => {
						setSelectedStudent(student);
						setFinderOpen(false);
					}}
					renderMeta={(student) => {
						const count = yearPayments.filter(
							(payment: any) =>
								String(payment.studentId) === String(student.studentId),
						).length;
						return (
							<span className="text-xs font-bold text-muted-foreground">
								{count} receipt{count === 1 ? '' : 's'}
							</span>
						);
					}}
				/>
			)}

			{/* ── Filters ─────────────────────────────────────────────────── */}
			<div className="space-y-3 rounded-2xl border border-border bg-card p-4">
				<div className="flex flex-wrap items-center gap-2">
					<Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
					<span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
						Filters
					</span>
					{activeFilters > 0 && (
						<button
							type="button"
							onClick={clearFilters}
							className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
						>
							<X className="h-3 w-3" />
							Clear {activeFilters}
						</button>
					)}
				</div>

				<div className="flex flex-wrap gap-1.5">
					{RANGES.map((option) => (
						<button
							key={option.id}
							type="button"
							onClick={() => setRange(option.id)}
							className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
								range === option.id
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-muted-foreground hover:text-foreground'
							}`}
						>
							{option.label}
						</button>
					))}
					<button
						type="button"
						onClick={() => setRange('custom')}
						className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
							range === 'custom'
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground hover:text-foreground'
						}`}
					>
						Custom
					</button>
				</div>

				{range === 'custom' && (
					<div className="grid gap-2 sm:grid-cols-2">
						<label className="flex flex-col gap-1">
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
								From
							</span>
							<input
								type="date"
								value={customFrom}
								onChange={(event) => setCustomFrom(event.target.value)}
								className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</label>
						<label className="flex flex-col gap-1">
							<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
								To
							</span>
							<input
								type="date"
								value={customTo}
								onChange={(event) => setCustomTo(event.target.value)}
								className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</label>
					</div>
				)}

				<div className="grid gap-2 sm:grid-cols-2">
					<label className="flex flex-col gap-1">
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							Receipt / payer
						</span>
						<span className="relative block">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
							<input
								type="text"
								value={receiptQuery}
								onChange={(event) => setReceiptQuery(event.target.value)}
								placeholder="Receipt number or payer name"
								className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</span>
					</label>
					<label className="flex flex-col gap-1">
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							Fee type
						</span>
						<select
							value={feeType}
							onChange={(event) => setFeeType(event.target.value)}
							className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="">All fee types</option>
							{feeTypes.map((type) => (
								<option key={type} value={type}>
									{type}
								</option>
							))}
						</select>
					</label>
				</div>
			</div>

			{/* ── Ledger ──────────────────────────────────────────────────── */}
			{filtered.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
					<Wallet className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
					<p className="text-sm font-bold text-foreground">No payments found</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{activeFilters > 0
							? 'Try clearing a filter or widening the date range.'
							: `No payments have been recorded for ${academicYear || 'this year'} yet.`}
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{groups.map((group) => (
						<section
							key={group.date}
							className="overflow-hidden rounded-2xl border border-border bg-card"
						>
							<header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
								<h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
									{formatDayHeading(group.date)}
								</h2>
								<div className="flex flex-wrap items-center gap-x-3 text-xs">
									<span className="text-muted-foreground">
										{group.items.length} receipt
										{group.items.length === 1 ? '' : 's'}
									</span>
									{Object.entries(group.byCurrency).map(([code, amount]) => (
										<span
											key={code}
											className="font-black tabular-nums text-foreground"
										>
											{code} {formatCurrency(amount)}
										</span>
									))}
								</div>
							</header>
							<ul className="divide-y divide-border">
								{group.items.map((payment: any) => (
									<ReceiptRow
										key={payment.id}
										payment={payment}
										studentName={nameFor(payment.studentId)}
										classLabel={classFor(payment)}
										showStudent={!selectedStudent}
									/>
								))}
							</ul>
						</section>
					))}

					{visible < filtered.length && (
						<button
							type="button"
							onClick={() => setVisible((count) => count + PAGE_SIZE)}
							className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted"
						>
							<TrendingUp className="h-4 w-4" />
							Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
							<span className="text-muted-foreground">
								({visible} of {filtered.length})
							</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
}
