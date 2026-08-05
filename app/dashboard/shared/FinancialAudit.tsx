'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	AlertTriangle,
	ArrowLeft,
	Ban,
	CalendarDays,
	ChevronDown,
	Filter,
	GraduationCap,
	Loader2,
	Pencil,
	Receipt,
	Search,
	Shield,
	ShieldCheck,
	Sparkles,
	User,
	Wallet,
	X,
} from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';
import { buildSchoolAcademicYearRange } from '@/utils/academicYearOptions';
import StudentFinder, {
	studentFullName,
} from '@/app/dashboard/shared/components/StudentFinder';

const PAGE_SIZE = 50;

const normalizeYear = (value?: string) => (value || '').replace(/\//g, '-');

const formatCurrency = (amount: number) =>
	(Number.isFinite(amount) ? amount : 0).toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const initials = (name: string) =>
	name
		.split(' ')
		.slice(0, 2)
		.map((part) => part[0] || '')
		.join('')
		.toUpperCase();

interface AuditEvent {
	id: string;
	category: string;
	action: string;
	summary: string;
	actor: { id: string; name: string; username: string; role: string };
	target: {
		type: string;
		id: string;
		label: string;
		studentId: string;
		receiptNumber: string;
	};
	before: any;
	after: any;
	amount: { currency: string; delta: number } | null;
	academicYear: string;
	context: { ip: string };
	eventAt: string;
}

/** Visual identity per action, so the timeline is scannable without reading. */
const ACTION_STYLE: Record<
	string,
	{ label: string; icon: any; tone: string; ring: string }
> = {
	'payment.created': {
		label: 'Payment recorded',
		icon: Receipt,
		tone: 'text-emerald-600 dark:text-emerald-400',
		ring: 'bg-emerald-500/10',
	},
	'payment.updated': {
		label: 'Payment edited',
		icon: Pencil,
		tone: 'text-amber-600 dark:text-amber-400',
		ring: 'bg-amber-500/10',
	},
	'payment.voided': {
		label: 'Receipt voided',
		icon: Ban,
		tone: 'text-rose-600 dark:text-rose-400',
		ring: 'bg-rose-500/10',
	},
	'scholarship.assigned': {
		label: 'Scholarship awarded',
		icon: Sparkles,
		tone: 'text-indigo-600 dark:text-indigo-400',
		ring: 'bg-indigo-500/10',
	},
	'scholarship.removed': {
		label: 'Scholarship removed',
		icon: Sparkles,
		tone: 'text-rose-600 dark:text-rose-400',
		ring: 'bg-rose-500/10',
	},
	'ward.changed': {
		label: 'Ward teacher changed',
		icon: User,
		tone: 'text-sky-600 dark:text-sky-400',
		ring: 'bg-sky-500/10',
	},
	'fee_schedule.updated': {
		label: 'Fee schedule updated',
		icon: Wallet,
		tone: 'text-indigo-600 dark:text-indigo-400',
		ring: 'bg-indigo-500/10',
	},
	'student.class_changed': {
		label: 'Class changed',
		icon: GraduationCap,
		tone: 'text-sky-600 dark:text-sky-400',
		ring: 'bg-sky-500/10',
	},
	'student.type_changed': {
		label: 'Student type changed',
		icon: GraduationCap,
		tone: 'text-sky-600 dark:text-sky-400',
		ring: 'bg-sky-500/10',
	},
	'student.deleted_with_payments': {
		label: 'Student deleted with payments',
		icon: AlertTriangle,
		tone: 'text-rose-600 dark:text-rose-400',
		ring: 'bg-rose-500/10',
	},
};

const CATEGORIES = [
	{ id: '', label: 'Everything' },
	{ id: 'payment', label: 'Payments' },
	{ id: 'scholarship', label: 'Scholarships' },
	{ id: 'fee_schedule', label: 'Fee schedule' },
	{ id: 'enrollment', label: 'Enrolment' },
];

const formatDayHeading = (iso: string) => {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return 'Undated';
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	const label = date.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
	if (date.toDateString() === today.toDateString()) return `Today · ${label}`;
	if (date.toDateString() === yesterday.toDateString())
		return `Yesterday · ${label}`;
	return label;
};

const formatTime = (iso: string) => {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
	});
};

/* ── Change rendering ──────────────────────────────────────────────────── */

const money = (amount: number, currency = '') =>
	`${currency ? `${currency} ` : ''}${formatCurrency(amount)}`;

/** One labelled line of change detail. */
function DetailRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1.5">
			<span className="w-32 shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
				{label}
			</span>
			<span className="min-w-0 flex-1 text-sm text-foreground">{children}</span>
		</div>
	);
}

/** "old → new", with the old value struck through when it changed. */
function FromTo({ from, to }: { from: React.ReactNode; to: React.ReactNode }) {
	const same = String(from) === String(to);
	if (same) return <span>{to || '—'}</span>;
	return (
		<span className="inline-flex flex-wrap items-center gap-1.5">
			<span className="text-muted-foreground line-through">{from || '—'}</span>
			<span className="text-muted-foreground">→</span>
			<span className="font-bold">{to || '—'}</span>
		</span>
	);
}

function Chip({
	children,
	tone = 'neutral',
}: {
	children: React.ReactNode;
	tone?: 'added' | 'removed' | 'neutral';
}) {
	const styles = {
		added:
			'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
		removed: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 line-through',
		neutral: 'bg-muted text-muted-foreground',
	} as const;
	return (
		<span
			className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${styles[tone]}`}
		>
			{children}
		</span>
	);
}

interface LineItem {
	feeType?: string;
	category?: string;
	installmentId?: string;
	amount?: number;
}

/** Fee lines before vs after, matched by fee name. */
function ItemsChange({
	before,
	after,
	currency,
}: {
	before: LineItem[];
	after: LineItem[];
	currency: string;
}) {
	const names = Array.from(
		new Set([
			...before.map((item) => item.feeType || ''),
			...after.map((item) => item.feeType || ''),
		]),
	).filter(Boolean);

	if (names.length === 0) return null;

	return (
		<ul className="divide-y divide-border rounded-lg border border-border">
			{names.map((name) => {
				const from = before.find((item) => item.feeType === name);
				const to = after.find((item) => item.feeType === name);
				const removed = from && !to;
				const added = !from && to;
				return (
					<li
						key={name}
						className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
					>
						<span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
							{name}
							{(to?.installmentId || from?.installmentId) && (
								<span className="ml-1.5 text-xs font-medium text-muted-foreground">
									· {to?.installmentId || from?.installmentId}
								</span>
							)}
						</span>
						<span className="shrink-0 text-sm tabular-nums">
							{removed ? (
								<Chip tone="removed">{money(from?.amount || 0, currency)}</Chip>
							) : added ? (
								<Chip tone="added">{money(to?.amount || 0, currency)}</Chip>
							) : (
								<FromTo
									from={money(from?.amount || 0, currency)}
									to={money(to?.amount || 0, currency)}
								/>
							)}
						</span>
					</li>
				);
			})}
		</ul>
	);
}

/** Human-readable detail for one event, chosen by action. */
function ChangeDetails({ event }: { event: AuditEvent }) {
	const before = event.before || {};
	const after = event.after || {};
	const currency = event.amount?.currency || '';

	// ── Payments ────────────────────────────────────────────────────────
	if (event.action === 'payment.created') {
		const items: LineItem[] = after.items || [];
		return (
			<div className="divide-y divide-border">
				<DetailRow label="Fees paid">
					<ItemsChange before={[]} after={items} currency={currency} />
				</DetailRow>
				<DetailRow label="Total">
					<span className="font-black tabular-nums">
						{money(after.totalAmount || 0, currency)}
					</span>
				</DetailRow>
				<DetailRow label="Method">{after.paymentMethod || 'cash'}</DetailRow>
				<DetailRow label="Date">{after.paymentDate || '—'}</DetailRow>
			</div>
		);
	}

	if (event.action === 'payment.updated') {
		return (
			<div className="divide-y divide-border">
				<DetailRow label="Fees">
					<ItemsChange
						before={before.items || []}
						after={after.items || []}
						currency={currency}
					/>
				</DetailRow>
				<DetailRow label="Total">
					<FromTo
						from={money(before.totalAmount || 0, currency)}
						to={money(after.totalAmount || 0, currency)}
					/>
				</DetailRow>
				<DetailRow label="Method">
					<FromTo
						from={before.paymentMethod || 'cash'}
						to={after.paymentMethod || 'cash'}
					/>
				</DetailRow>
				<DetailRow label="Date">
					<FromTo from={before.paymentDate} to={after.paymentDate} />
				</DetailRow>
			</div>
		);
	}

	if (event.action === 'payment.voided') {
		const items: LineItem[] = before.items || [];
		return (
			<div className="divide-y divide-border">
				<DetailRow label="Voided fees">
					<ItemsChange before={items} after={[]} currency={currency} />
				</DetailRow>
				<DetailRow label="Amount returned">
					<span className="font-black tabular-nums text-rose-600 dark:text-rose-400">
						{money(before.totalAmount || 0, currency)}
					</span>
					<span className="ml-1.5 text-xs text-muted-foreground">
						added back to the outstanding balance
					</span>
				</DetailRow>
				<DetailRow label="Reason">{after.reason || '—'}</DetailRow>
			</div>
		);
	}

	// ── Scholarships ────────────────────────────────────────────────────
	if (
		event.action === 'scholarship.assigned' ||
		event.action === 'scholarship.removed'
	) {
		const from: string[] = before.scholarships || [];
		const to: string[] = after.scholarships || [];
		const added = to.filter((key) => !from.includes(key));
		const removed = from.filter((key) => !to.includes(key));
		return (
			<div className="divide-y divide-border">
				{added.length > 0 && (
					<DetailRow label="Awarded">
						<span className="flex flex-wrap gap-1.5">
							{added.map((key) => (
								<Chip key={key} tone="added">
									{key}
								</Chip>
							))}
						</span>
					</DetailRow>
				)}
				{removed.length > 0 && (
					<DetailRow label="Removed">
						<span className="flex flex-wrap gap-1.5">
							{removed.map((key) => (
								<Chip key={key} tone="removed">
									{key}
								</Chip>
							))}
						</span>
					</DetailRow>
				)}
				<DetailRow label="Now holds">
					{to.length === 0 ? (
						<span className="text-muted-foreground">No scholarships</span>
					) : (
						<span className="flex flex-wrap gap-1.5">
							{to.map((key) => (
								<Chip key={key}>{key}</Chip>
							))}
						</span>
					)}
				</DetailRow>
			</div>
		);
	}

	if (event.action === 'ward.changed') {
		return (
			<div className="divide-y divide-border">
				<DetailRow label="Ward teacher">
					<FromTo
						from={before.wardTeacherId || 'none'}
						to={after.wardTeacherId || 'none'}
					/>
				</DetailRow>
			</div>
		);
	}

	// ── Enrolment ───────────────────────────────────────────────────────
	if (event.action === 'student.class_changed') {
		return (
			<div className="divide-y divide-border">
				<DetailRow label="Class">
					<FromTo
						from={before.className || before.classId || 'none'}
						to={after.className || after.classId || 'none'}
					/>
				</DetailRow>
				<DetailRow label="Effect">
					<span className="text-muted-foreground">
						The class selects the fee group, so this changes what the student is
						billed.
					</span>
				</DetailRow>
			</div>
		);
	}

	if (event.action === 'student.type_changed') {
		return (
			<div className="divide-y divide-border">
				<DetailRow label="Student type">
					<FromTo from={before.studentType} to={after.studentType} />
				</DetailRow>
				<DetailRow label="Effect">
					<span className="text-muted-foreground">
						Affects which group-eligible fees apply.
					</span>
				</DetailRow>
			</div>
		);
	}

	if (event.action === 'student.deleted_with_payments') {
		const receipts: any[] = before.receipts || [];
		return (
			<div className="divide-y divide-border">
				<DetailRow label="Orphaned receipts">
					<span className="text-muted-foreground">
						{receipts.length} payment record
						{receipts.length === 1 ? '' : 's'} kept, now with no owner
					</span>
				</DetailRow>
				{receipts.length > 0 && (
					<DetailRow label="Receipts">
						<ul className="divide-y divide-border rounded-lg border border-border">
							{receipts.slice(0, 10).map((receipt) => (
								<li
									key={receipt.receiptNumber}
									className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm"
								>
									<span className="truncate font-bold">
										{receipt.receiptNumber}
									</span>
									<span className="shrink-0 tabular-nums text-muted-foreground">
										{money(receipt.totalAmount || 0, receipt.currency)}
									</span>
								</li>
							))}
						</ul>
					</DetailRow>
				)}
			</div>
		);
	}

	// ── Fee schedule ────────────────────────────────────────────────────
	if (event.action === 'fee_schedule.updated') {
		const sections: { key: string; label: string }[] = [
			{ key: 'feeSchedules', label: 'Fee schedules' },
			{ key: 'currencies', label: 'Currencies' },
			{ key: 'paymentCategories', label: 'Payment categories' },
			{ key: 'feeDefinitions', label: 'Fee definitions' },
			{ key: 'installments', label: 'Installments' },
			{ key: 'studentGroups', label: 'Student groups' },
		];
		const changed = sections.filter(
			(section) =>
				JSON.stringify(before?.[section.key] ?? null) !==
				JSON.stringify(after?.[section.key] ?? null),
		);
		return (
			<div className="divide-y divide-border">
				{changed.length === 0 ? (
					<DetailRow label="Changed">
						<span className="text-muted-foreground">No section differences</span>
					</DetailRow>
				) : (
					changed.map((section) => {
						const fromCount = Array.isArray(before?.[section.key])
							? before[section.key].length
							: null;
						const toCount = Array.isArray(after?.[section.key])
							? after[section.key].length
							: null;
						return (
							<DetailRow key={section.key} label={section.label}>
								{fromCount === null || toCount === null ? (
									<span className="font-bold">Changed</span>
								) : fromCount === toCount ? (
									<span>
										{toCount} entr{toCount === 1 ? 'y' : 'ies'} — contents edited
									</span>
								) : (
									<FromTo
										from={`${fromCount} entr${fromCount === 1 ? 'y' : 'ies'}`}
										to={`${toCount} entr${toCount === 1 ? 'y' : 'ies'}`}
									/>
								)}
							</DetailRow>
						);
					})
				)}
			</div>
		);
	}

	// ── Fallback: flat key/value comparison, never raw JSON ─────────────
	const keys = Array.from(
		new Set([...Object.keys(before || {}), ...Object.keys(after || {})]),
	);
	if (keys.length === 0) {
		return (
			<p className="py-2 text-sm text-muted-foreground">
				No further detail recorded.
			</p>
		);
	}
	const readable = (value: unknown): string => {
		if (value === null || value === undefined || value === '') return '—';
		if (Array.isArray(value)) return value.length === 0 ? '—' : value.join(', ');
		if (typeof value === 'object') return 'changed';
		return String(value);
	};
	return (
		<div className="divide-y divide-border">
			{keys.map((key) => (
				<DetailRow
					key={key}
					label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
				>
					<FromTo from={readable(before?.[key])} to={readable(after?.[key])} />
				</DetailRow>
			))}
		</div>
	);
}

function EventRow({ event }: { event: AuditEvent }) {
	const [open, setOpen] = useState(false);
	const style = ACTION_STYLE[event.action] || {
		label: event.action,
		icon: Shield,
		tone: 'text-muted-foreground',
		ring: 'bg-muted',
	};
	const Icon = style.icon;
	const delta = event.amount?.delta ?? 0;

	return (
		<li className="border-b border-border last:border-b-0">
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
			>
				<span
					className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.ring}`}
				>
					<Icon className={`h-4 w-4 ${style.tone}`} />
				</span>

				<span className="min-w-0 flex-1">
					<span className="flex flex-wrap items-center gap-x-2 gap-y-1">
						<span className={`text-sm font-bold ${style.tone}`}>
							{style.label}
						</span>
						{event.target.receiptNumber && (
							<span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
								{event.target.receiptNumber}
							</span>
						)}
					</span>
					<span className="mt-0.5 block break-words text-sm text-foreground">
						{event.summary}
					</span>
					<span className="mt-1 block truncate text-xs text-muted-foreground">
						{event.actor.name || 'Unknown'}
						{event.actor.role ? ` · ${event.actor.role.replace(/_/g, ' ')}` : ''}
						{' · '}
						{formatTime(event.eventAt)}
					</span>
				</span>

				<span className="shrink-0 text-right">
					{delta !== 0 && (
						<span
							className={`block whitespace-nowrap text-sm font-black tabular-nums ${
								delta > 0
									? 'text-emerald-600 dark:text-emerald-400'
									: 'text-rose-600 dark:text-rose-400'
							}`}
						>
							{delta > 0 ? '+' : '−'}
							{event.amount?.currency} {formatCurrency(Math.abs(delta))}
						</span>
					)}
					<ChevronDown
						className={`ml-auto mt-1 h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
					/>
				</span>
			</button>

			{open && (
				<div className="space-y-3 border-t border-border bg-muted/20 px-4 py-3">
					<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{[
							{ label: 'Actor', value: event.actor.name || '—' },
							{ label: 'Username', value: event.actor.username || '—' },
							{ label: 'Student', value: event.target.studentId || '—' },
							{ label: 'Year', value: event.academicYear || '—' },
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
					<div className="rounded-xl border border-border bg-card px-3 py-1">
						<ChangeDetails event={event} />
					</div>
					<p className="text-[11px] text-muted-foreground">
						Recorded {new Date(event.eventAt).toLocaleString()}
						{event.context.ip ? ` from ${event.context.ip}` : ''}
					</p>
				</div>
			)}
		</li>
	);
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function FinancialAudit() {
	const schoolProfile = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore((state) => state.usersByAcademicYear);

	const [events, setEvents] = useState<AuditEvent[]>([]);
	const [total, setTotal] = useState(0);
	const [cursor, setCursor] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [category, setCategory] = useState('');
	const [search, setSearch] = useState('');
	const [academicYear, setAcademicYear] = useState('');
	const [from, setFrom] = useState('');
	const [to, setTo] = useState('');
	const [student, setStudent] = useState<any>(null);
	const [finderOpen, setFinderOpen] = useState(false);

	const [chain, setChain] = useState<{
		ok: boolean;
		message: string;
		checked: number;
	} | null>(null);
	const [verifying, setVerifying] = useState(false);

	const academicYearOptions = useMemo(
		() => (schoolProfile ? buildSchoolAcademicYearRange(schoolProfile) : []),
		[schoolProfile],
	);

	const students = useMemo(() => {
		const currentYear = schoolProfile
			? getCurrentAcademicYearFromSchoolProfile(schoolProfile) || ''
			: '';
		const key = academicYear || currentYear;
		if (!key) return [];
		const yearData =
			usersByAcademicYear?.[key] ||
			Object.entries(usersByAcademicYear || {}).find(
				([entryKey]) => normalizeYear(entryKey) === normalizeYear(key),
			)?.[1];
		return Array.isArray((yearData as any)?.students)
			? (yearData as any).students
			: [];
	}, [usersByAcademicYear, academicYear, schoolProfile]);

	const buildQuery = useCallback(
		(before?: string | null) => {
			const params = new URLSearchParams();
			if (category) params.set('category', category);
			if (search.trim()) params.set('search', search.trim());
			if (academicYear) params.set('academicYear', academicYear);
			if (from) params.set('from', from);
			if (to) params.set('to', to);
			if (student?.studentId) params.set('studentId', String(student.studentId));
			params.set('limit', String(PAGE_SIZE));
			if (before) params.set('before', before);
			return params.toString();
		},
		[category, search, academicYear, from, to, student],
	);

	// Refetch from the top whenever a filter changes; debounced so typing in the
	// search box does not fire a request per keystroke.
	useEffect(() => {
		let cancelled = false;
		const timer = setTimeout(async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(`/api/audit?${buildQuery()}`);
				const json = await res.json();
				if (cancelled) return;
				if (!json.success) {
					setError(json.message || 'Could not load the audit trail.');
					setEvents([]);
					return;
				}
				setEvents(json.data.events);
				setCursor(json.data.nextCursor);
				setTotal(json.data.total);
			} catch {
				if (!cancelled) setError('Network error loading the audit trail.');
			} finally {
				if (!cancelled) setLoading(false);
			}
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [buildQuery]);

	const loadMore = async () => {
		if (!cursor || loadingMore) return;
		setLoadingMore(true);
		try {
			const res = await fetch(`/api/audit?${buildQuery(cursor)}`);
			const json = await res.json();
			if (json.success) {
				setEvents((prev) => [...prev, ...json.data.events]);
				setCursor(json.data.nextCursor);
			}
		} catch {
			setError('Network error loading more entries.');
		} finally {
			setLoadingMore(false);
		}
	};

	const verifyChain = async () => {
		setVerifying(true);
		try {
			const res = await fetch('/api/audit/verify');
			const json = await res.json();
			if (json.success) setChain(json.data);
			else setChain({ ok: false, message: json.message, checked: 0 });
		} catch {
			setChain({ ok: false, message: 'Could not verify the chain.', checked: 0 });
		} finally {
			setVerifying(false);
		}
	};

	// Group the loaded page by day for the timeline.
	const groups = useMemo(() => {
		const map = new Map<string, AuditEvent[]>();
		for (const event of events) {
			const day = String(event.eventAt || '').slice(0, 10);
			if (!map.has(day)) map.set(day, []);
			map.get(day)!.push(event);
		}
		return Array.from(map.entries());
	}, [events]);

	const activeFilters =
		(category ? 1 : 0) +
		(search.trim() ? 1 : 0) +
		(academicYear ? 1 : 0) +
		(from || to ? 1 : 0) +
		(student ? 1 : 0);

	const clearFilters = () => {
		setCategory('');
		setSearch('');
		setAcademicYear('');
		setFrom('');
		setTo('');
		setStudent(null);
	};

	return (
		<div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
			{/* ── Header ──────────────────────────────────────────────────── */}
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-black tracking-tight sm:text-3xl">
						Audit Trail
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Every change to the school&apos;s money — who made it, when, and what
						the values were before.
					</p>
				</div>
				<button
					type="button"
					onClick={verifyChain}
					disabled={verifying}
					className="inline-flex items-center gap-2 self-start rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50 sm:self-auto"
				>
					{verifying ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<ShieldCheck className="h-4 w-4" />
					)}
					Verify integrity
				</button>
			</header>

			{/* ── Chain status ────────────────────────────────────────────── */}
			{chain && (
				<div
					className={`flex items-start gap-3 rounded-2xl border p-4 ${
						chain.ok
							? 'border-emerald-500/30 bg-emerald-500/10'
							: 'border-destructive/30 bg-destructive/10'
					}`}
				>
					{chain.ok ? (
						<ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
					) : (
						<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
					)}
					<div className="min-w-0 flex-1">
						<p
							className={`text-sm font-bold ${
								chain.ok
									? 'text-emerald-700 dark:text-emerald-400'
									: 'text-destructive'
							}`}
						>
							{chain.ok ? 'Chain intact' : 'Integrity check failed'}
						</p>
						<p className="text-xs text-muted-foreground">{chain.message}</p>
					</div>
					<button
						type="button"
						onClick={() => setChain(null)}
						aria-label="Dismiss"
						className="shrink-0 opacity-70 hover:opacity-100"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			)}

			{/* ── Category chips ──────────────────────────────────────────── */}
			<div className="flex flex-wrap gap-1.5">
				{CATEGORIES.map((option) => (
					<button
						key={option.id || 'all'}
						type="button"
						onClick={() => setCategory(option.id)}
						className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
							category === option.id
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground hover:text-foreground'
						}`}
					>
						{option.label}
					</button>
				))}
			</div>

			{/* ── Student focus ───────────────────────────────────────────── */}
			{student ? (
				<div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
						{initials(studentFullName(student))}
					</span>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-black text-foreground">
							{studentFullName(student)}
						</p>
						<p className="truncate text-xs text-muted-foreground">
							{student.studentId}
						</p>
					</div>
					<button
						type="button"
						onClick={() => setStudent(null)}
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
							Trace one student
						</span>
						<span className="block text-xs text-muted-foreground">
							Every financial change made to a single account
						</span>
					</span>
					<ChevronDown
						className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${finderOpen ? 'rotate-180' : ''}`}
					/>
				</button>
			)}

			{finderOpen && !student && (
				<StudentFinder
					students={students}
					schoolProfile={schoolProfile}
					academicYear={academicYear}
					autoFocus
					onSelect={(selected) => {
						setStudent(selected);
						setFinderOpen(false);
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

				<div className="grid gap-2 sm:grid-cols-2">
					<label className="flex flex-col gap-1">
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							Search
						</span>
						<span className="relative block">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
							<input
								type="text"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Person, receipt, student, description"
								className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</span>
					</label>
					<label className="flex flex-col gap-1">
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							Academic year
						</span>
						<span className="relative block">
							<CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
							<select
								value={academicYear}
								onChange={(event) => setAcademicYear(event.target.value)}
								className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							>
								<option value="">All years</option>
								{academicYearOptions.map((year) => (
									<option key={year} value={year}>
										{year}
									</option>
								))}
							</select>
						</span>
					</label>
					<label className="flex flex-col gap-1">
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							From
						</span>
						<input
							type="date"
							value={from}
							onChange={(event) => setFrom(event.target.value)}
							className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							To
						</span>
						<input
							type="date"
							value={to}
							onChange={(event) => setTo(event.target.value)}
							className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</label>
				</div>
			</div>

			{/* ── Timeline ────────────────────────────────────────────────── */}
			{loading ? (
				<div className="flex min-h-[30vh] items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : error ? (
				<div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
					{error}
				</div>
			) : events.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
					<Shield className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
					<p className="text-sm font-bold text-foreground">Nothing recorded yet</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{activeFilters > 0
							? 'No entries match these filters.'
							: 'Financial changes will appear here as they happen.'}
					</p>
				</div>
			) : (
				<div className="space-y-4">
					<p className="text-xs text-muted-foreground">
						Showing {events.length} of {total} entr{total === 1 ? 'y' : 'ies'}
					</p>
					{groups.map(([day, dayEvents]) => (
						<section
							key={day}
							className="overflow-hidden rounded-2xl border border-border bg-card"
						>
							<header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
								<h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
									{formatDayHeading(day)}
								</h2>
								<span className="text-xs text-muted-foreground">
									{dayEvents.length} change{dayEvents.length === 1 ? '' : 's'}
								</span>
							</header>
							<ul>
								{dayEvents.map((event) => (
									<EventRow key={event.id} event={event} />
								))}
							</ul>
						</section>
					))}

					{cursor && (
						<button
							type="button"
							onClick={loadMore}
							disabled={loadingMore}
							className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
						>
							{loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
							Load older entries
						</button>
					)}
				</div>
			)}

			<p className="text-xs leading-relaxed text-muted-foreground">
				Entries are append-only — there is no route in this application that can
				edit or remove one. Each is chained to the one before it by hash, so
				&ldquo;Verify integrity&rdquo; will detect a row altered or removed
				directly in the database.
			</p>
		</div>
	);
}
