'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
	ArrowLeft,
	CalendarDays,
	ChevronDown,
	Filter,
	Landmark,
	Loader2,
	Receipt,
	Search,
	TrendingUp,
	User,
	Users,
	Wallet,
	X,
} from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useSchoolStore } from '@/store/schoolStore';
import { normalizePayments, type PaymentRecord } from '@/utils/payments';
import { buildReceiptContext } from '@/utils/paymentReceipt';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';
import { buildSchoolAcademicYearRange } from '@/utils/academicYearOptions';
import StudentFinder, {
	classIdForYear,
	studentFullName,
	useClassDirectory,
} from '@/app/dashboard/shared/components/StudentFinder';

// react-pdf is heavy; only pull it in when a receipt is actually opened.
const PaymentReceiptPDF = dynamic(
	() => import('@/app/dashboard/shared/PaymentReceiptPDF'),
	{
		ssr: false,
		loading: () => (
			<span className="inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-bold text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin" />
				Preparing receipt…
			</span>
		),
	},
);

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

/** One receipt (batch). Summarises its items; click opens the full detail. */
function ReceiptRow({
	payment,
	studentName,
	classLabel,
	showStudent,
	onOpen,
}: {
	payment: PaymentRecord;
	studentName: string;
	classLabel: string;
	showStudent: boolean;
	onOpen: () => void;
}) {
	const itemCount = payment.items.length;
	const summary =
		itemCount === 0
			? 'Payment'
			: itemCount === 1
				? payment.items[0].feeType || payment.items[0].category || 'Payment'
				: `${payment.items[0].feeType} + ${itemCount - 1} more`;

	return (
		<li>
			<button
				type="button"
				onClick={onOpen}
				className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
			>
				<span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
					<Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
				</span>
				<span className="min-w-0 flex-1">
					{showStudent && (
						<span className="block truncate text-sm font-bold text-foreground">
							{studentName}
						</span>
					)}
					<span
						className={`block truncate text-sm ${showStudent ? 'text-muted-foreground' : 'font-bold text-foreground'}`}
					>
						{summary}
						{itemCount > 1 && (
							<span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
								{itemCount} items
							</span>
						)}
					</span>
					<span className="mt-0.5 block truncate text-xs text-muted-foreground">
						{payment.receiptNumber}
						{classLabel ? ` · ${classLabel}` : ''}
						{payment.paidBy ? ` · by ${payment.paidBy}` : ''}
						{payment.paymentTime ? ` · ${payment.paymentTime}` : ''}
					</span>
				</span>
				<span className="shrink-0 text-right">
					<span className="block whitespace-nowrap text-sm font-black tabular-nums text-emerald-600 dark:text-emerald-400">
						{payment.currency} {formatCurrency(payment.totalAmount)}
					</span>
					<span className="block text-[11px] capitalize text-muted-foreground">
						{payment.paymentMethod || 'cash'}
					</span>
				</span>
			</button>
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
		return normalizePayments(Array.isArray(list) ? list : []);
	}, [paymentsByAcademicYear, academicYear]);

	// Every payment for every year — a receipt's paid-to-date figures must count
	// the student's whole history, not just the year being browsed.
	const allPayments = useMemo(() => {
		const all: any[] = [];
		for (const list of Object.values(paymentsByAcademicYear || {})) {
			if (Array.isArray(list)) all.push(...list);
		}
		return all;
	}, [paymentsByAcademicYear]);

	const feeTypes = useMemo(
		() =>
			Array.from(
				new Set(
					yearPayments.flatMap((payment) =>
						payment.items.map((item) => item.feeType).filter(Boolean),
					),
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
			.filter((payment) => {
				if (
					selectedStudent &&
					String(payment.studentId) !== String(selectedStudent.studentId)
				) {
					return false;
				}
				// A batch matches a fee-type filter when any of its lines does.
				if (
					feeType &&
					!payment.items.some((item) => item.feeType === feeType)
				) {
					return false;
				}
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
			.sort((a, b) => {
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
				(byCurrency[payment.currency] || 0) + payment.totalAmount;
			payers.add(String(payment.studentId));
		}
		return { byCurrency, payers: payers.size, count: filtered.length };
	}, [filtered]);

	// Only the visible slice is grouped and rendered — never the whole ledger.
	const groups = useMemo(() => {
		const slice = filtered.slice(0, visible);
		const map = new Map<string, PaymentRecord[]>();
		for (const payment of slice) {
			const key = String(payment.paymentDate || '');
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(payment);
		}
		return Array.from(map.entries()).map(([date, items]) => {
			const byCurrency: Record<string, number> = {};
			for (const item of items) {
				byCurrency[item.currency] =
					(byCurrency[item.currency] || 0) + item.totalAmount;
			}
			return { date, items, byCurrency };
		});
	}, [filtered, visible]);

	// ── Receipt detail ───────────────────────────────────────────────────
	const [openReceipt, setOpenReceipt] = useState<PaymentRecord | null>(null);

	const receiptContext = useMemo(() => {
		if (!openReceipt || !schoolProfile) return null;
		const student =
			studentIndex.get(String(openReceipt.studentId)) || {
				studentId: openReceipt.studentId,
			};
		return buildReceiptContext({
			payment: openReceipt,
			student,
			schoolProfile,
			allPayments,
			className: classFor(openReceipt),
			origin: typeof window === 'undefined' ? '' : window.location.origin,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [openReceipt, schoolProfile, studentIndex, allPayments, academicYear]);

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
								{group.items.map((payment) => (
									<ReceiptRow
										key={payment.id}
										payment={payment}
										studentName={nameFor(payment.studentId)}
										classLabel={classFor(payment)}
										showStudent={!selectedStudent}
										onOpen={() => setOpenReceipt(payment)}
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

			{/* ── Receipt detail ──────────────────────────────────────────── */}
			<Dialog
				open={Boolean(openReceipt)}
				onOpenChange={(open) => {
					if (!open) setOpenReceipt(null);
				}}
			>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Receipt className="h-5 w-5 text-primary" />
							Receipt {openReceipt?.receiptNumber}
						</DialogTitle>
					</DialogHeader>

					{openReceipt && receiptContext && (
						<div className="space-y-5">
							{/* Who / when */}
							<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
								{[
									{ label: 'Student', value: receiptContext.student.name },
									{ label: 'Student ID', value: openReceipt.studentId },
									{
										label: 'Class',
										value: receiptContext.student.className || '—',
									},
									{ label: 'Year', value: openReceipt.paymentAcademicYear },
									{ label: 'Received from', value: openReceipt.paidBy || '—' },
									{
										label: 'Method',
										value: openReceipt.paymentMethod || 'Cash',
									},
									{ label: 'Date', value: openReceipt.paymentDate },
									{ label: 'Time', value: openReceipt.paymentTime || '—' },
								].map((field) => (
									<div key={field.label} className="min-w-0">
										<dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
											{field.label}
										</dt>
										<dd className="truncate text-sm font-bold text-foreground">
											{field.value}
										</dd>
									</div>
								))}
							</dl>

							{/* Items */}
							<div>
								<h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
									Items paid
								</h3>
								<ul className="divide-y divide-border rounded-xl border border-border">
									{receiptContext.lines.map((line, index) => (
										<li key={`${line.feeType}-${index}`} className="p-3">
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0">
													<p className="truncate text-sm font-bold text-foreground">
														{line.feeType}
													</p>
													<p className="truncate text-xs text-muted-foreground">
														{line.category}
														{line.installmentLabel
															? ` · ${line.installmentLabel}`
															: ''}
													</p>
												</div>
												<p className="shrink-0 whitespace-nowrap text-sm font-black tabular-nums text-emerald-600 dark:text-emerald-400">
													{openReceipt.currency} {formatCurrency(line.amountPaid)}
												</p>
											</div>
											<div className="mt-2 grid grid-cols-3 gap-2 text-xs">
												<div>
													<span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
														Fee total
													</span>
													<span className="font-bold tabular-nums">
														{line.feeTotal > 0 ? formatCurrency(line.feeTotal) : '—'}
													</span>
												</div>
												<div>
													<span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
														Paid to date
													</span>
													<span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
														{formatCurrency(line.paidToDate)}
													</span>
												</div>
												<div>
													<span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
														Outstanding
													</span>
													<span
														className={`font-bold tabular-nums ${line.outstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
													>
														{formatCurrency(line.outstanding)}
													</span>
												</div>
											</div>
										</li>
									))}
								</ul>
							</div>

							{/* Installments */}
							{receiptContext.installments.length > 0 && (
								<div>
									<h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
										Installment position
									</h3>
									<ul className="divide-y divide-border rounded-xl border border-border">
										{receiptContext.installments.map((installment) => (
											<li
												key={installment.installmentId}
												className="flex items-center justify-between gap-3 p-3 text-sm"
											>
												<span className="min-w-0 truncate font-bold text-foreground">
													{installment.label}
												</span>
												<span className="shrink-0 tabular-nums text-muted-foreground">
													<span className="font-bold text-emerald-600 dark:text-emerald-400">
														{formatCurrency(installment.paid)}
													</span>
													{' / '}
													{formatCurrency(installment.expected)}
													{installment.outstanding > 0 && (
														<span className="ml-2 font-bold text-rose-600 dark:text-rose-400">
															{formatCurrency(installment.outstanding)} due
														</span>
													)}
												</span>
											</li>
										))}
									</ul>
								</div>
							)}

							{/* Totals */}
							<div className="grid gap-3 sm:grid-cols-4">
								{[
									{
										label: 'This receipt',
										value: receiptContext.receiptTotal,
										tone: 'text-foreground',
									},
									{
										label: 'Assessed',
										value: receiptContext.overall.expected,
										tone: 'text-foreground',
									},
									{
										label: 'Paid to date',
										value: receiptContext.overall.paidToDate,
										tone: 'text-emerald-600 dark:text-emerald-400',
									},
									{
										label: 'Balance',
										value: receiptContext.overall.outstanding,
										tone:
											receiptContext.overall.outstanding > 0
												? 'text-rose-600 dark:text-rose-400'
												: 'text-emerald-600 dark:text-emerald-400',
									},
								].map((tile) => (
									<div key={tile.label} className="rounded-xl bg-muted p-3">
										<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
											{tile.label}
										</p>
										<p className={`mt-1 text-base font-black tabular-nums ${tile.tone}`}>
											{formatCurrency(tile.value)}
										</p>
									</div>
								))}
							</div>

							<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
								<p className="text-xs text-muted-foreground">
									Amounts in {openReceipt.currency}. Balances reflect the
									student&apos;s position now, not at the time of payment.
								</p>
								<PaymentReceiptPDF
									context={receiptContext}
									school={schoolProfile}
								/>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
