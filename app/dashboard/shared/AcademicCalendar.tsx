'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	CalendarDays,
	CalendarRange,
	ChevronLeft,
	ChevronRight,
	Clock,
	Loader2,
	MapPin,
	Pencil,
	Plus,
	Sparkles,
	Trash2,
	X,
} from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import type { SchoolProfile } from '@/types/schoolProfile';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import { useSchoolStore } from '@/store/schoolStore';
import { getScopedAcademicYearValue } from '@/utils/academicYear';

/**
 * The school's academic calendar.
 *
 * Renders its own month grid rather than embedding FullCalendar: every event
 * here is all-day, so the week/day time grids bought nothing, and owning the
 * markup means the calendar matches the rest of the dashboard and survives a
 * narrow screen.
 */

type CalendarEventRecord = {
	id: string;
	title: string;
	startDate: string;
	endDate: string;
	description: string;
	location: string;
	colorTag: string;
};

/**
 * `colorTag` is stored as a bare colour name. These give each one a meaning a
 * reader can act on; the stored value is untouched, only how it is labelled.
 */
const CATEGORIES = [
	{
		tag: 'Primary',
		label: 'Academic',
		dot: 'bg-sky-500',
		chip: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
		soft: 'border-sky-500/30 bg-sky-500/5',
	},
	{
		tag: 'Success',
		label: 'Holiday',
		dot: 'bg-emerald-500',
		chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
		soft: 'border-emerald-500/30 bg-emerald-500/5',
	},
	{
		tag: 'Warning',
		label: 'Examination',
		dot: 'bg-amber-500',
		chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
		soft: 'border-amber-500/30 bg-amber-500/5',
	},
	{
		tag: 'Danger',
		label: 'Deadline',
		dot: 'bg-rose-500',
		chip: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
		soft: 'border-rose-500/30 bg-rose-500/5',
	},
];

const categoryFor = (tag: string) =>
	CATEGORIES.find((entry) => entry.tag === tag) || CATEGORIES[0];

const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toKey = (date: Date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const fromKey = (key: string) => {
	const [year, month, day] = key.split('-').map(Number);
	return new Date(year, (month || 1) - 1, day || 1);
};

const todayKey = () => toKey(new Date());

/** Whole days from today; negative once the date has passed. */
const daysAway = (key: string) => {
	const target = fromKey(key);
	const now = new Date();
	target.setHours(0, 0, 0, 0);
	now.setHours(0, 0, 0, 0);
	return Math.round((target.getTime() - now.getTime()) / 86400000);
};

const relativeLabel = (key: string) => {
	const delta = daysAway(key);
	if (delta === 0) return 'Today';
	if (delta === 1) return 'Tomorrow';
	if (delta === -1) return 'Yesterday';
	if (delta > 0) return `In ${delta} days`;
	return `${Math.abs(delta)} days ago`;
};

const formatRange = (start: string, end: string) => {
	if (!start) return '';
	const from = fromKey(start);
	const options: Intl.DateTimeFormatOptions = {
		month: 'short',
		day: 'numeric',
	};
	if (!end || end === start) {
		return from.toLocaleDateString('en-US', { ...options, year: 'numeric' });
	}
	const to = fromKey(end);
	const sameMonth =
		from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
	return sameMonth
		? `${from.toLocaleDateString('en-US', options)} – ${to.getDate()}, ${to.getFullYear()}`
		: `${from.toLocaleDateString('en-US', options)} – ${to.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
};

type AcademicCalendarProps = {
	user?: { role?: string };
	schoolProfile: SchoolProfile;
};

const emptyForm = {
	id: '',
	title: '',
	startDate: '',
	endDate: '',
	description: '',
	location: '',
	colorTag: 'Primary',
};

export default function AcademicCalendar({
	user,
	schoolProfile,
}: AcademicCalendarProps) {
	const canEdit = user?.role === 'system_admin';
	const academicYear = String(
		schoolProfile?.identity?.currentAcademicYear || '',
	).trim();

	const [events, setEvents] = useState<CalendarEventRecord[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);

	const [view, setView] = useState<'month' | 'agenda'>('month');
	const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
	const [dayFocus, setDayFocus] = useState<string | null>(null);

	const today = new Date();
	const [navYear, setNavYear] = useState(today.getFullYear());
	const [navMonth, setNavMonth] = useState(today.getMonth());

	const [dialogOpen, setDialogOpen] = useState(false);
	const [form, setForm] = useState(emptyForm);

	const scopedCalendar = useSchoolStore(
		(state) =>
			getScopedAcademicYearValue(state.calendarByAcademicYear, academicYear)
				.value,
	);
	const setCalendarForYear = useSchoolStore((state) => state.setCalendarForYear);

	const normalize = useCallback(
		(raw: any): CalendarEventRecord => ({
			id: String(raw._id || raw.id || ''),
			title: raw.title || 'Untitled event',
			startDate: raw.startDate || raw.start || '',
			endDate: raw.endDate || raw.end || raw.startDate || '',
			description: raw.description || '',
			location: raw.location || '',
			colorTag: raw.colorTag || 'Primary',
		}),
		[],
	);

	useEffect(() => {
		if (!academicYear) {
			setEvents([]);
			return;
		}
		let cancelled = false;

		const load = async () => {
			setError('');
			// Store snapshot first, then the session cache, then the network —
			// the same order the rest of the dashboard reads in.
			const snapshot = getScopedAcademicYearValue(
				useSchoolStore.getState().calendarByAcademicYear,
				academicYear,
			).value;
			if (Array.isArray(snapshot) && snapshot.length > 0) {
				setEvents(snapshot.map(normalize));
				return;
			}
			const cacheKey = `calendar:${academicYear}`;
			const cached = getClientCache<any[]>(cacheKey);
			if (cached) {
				setEvents(cached.map(normalize));
				return;
			}

			setLoading(true);
			try {
				const response = await fetch(
					`/api/calendar?academicYear=${encodeURIComponent(academicYear)}`,
				);
				const payload = await response.json();
				if (cancelled) return;
				if (!response.ok || !payload?.success) {
					setError(payload?.message || 'Could not load the calendar.');
					return;
				}
				const data = payload.data || [];
				setEvents(data.map(normalize));
				setClientCache(cacheKey, data);
				setCalendarForYear(academicYear, data);
			} catch {
				if (!cancelled) setError('Network error loading the calendar.');
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		load();
		return () => {
			cancelled = true;
		};
	}, [academicYear, scopedCalendar, setCalendarForYear, normalize]);

	/** Writes the local copy through to both caches so a revisit agrees. */
	const commit = useCallback(
		(next: CalendarEventRecord[], raw?: any[]) => {
			setEvents(next);
			if (!academicYear) return;
			const payload =
				raw ||
				next.map((event) => ({
					_id: event.id,
					title: event.title,
					startDate: event.startDate,
					endDate: event.endDate,
					description: event.description,
					location: event.location,
					colorTag: event.colorTag,
				}));
			setClientCache(`calendar:${academicYear}`, payload);
			setCalendarForYear(academicYear, payload);
		},
		[academicYear, setCalendarForYear],
	);

	const visibleEvents = useMemo(() => {
		if (activeTags.size === 0) return events;
		return events.filter((event) => activeTags.has(event.colorTag));
	}, [events, activeTags]);

	/** Every day an event covers, so multi-day events appear across the grid. */
	const eventsByDay = useMemo(() => {
		const map = new Map<string, CalendarEventRecord[]>();
		for (const event of visibleEvents) {
			if (!event.startDate) continue;
			const start = fromKey(event.startDate);
			const end = event.endDate ? fromKey(event.endDate) : start;
			// Guard against a reversed or absurd range putting us in a long loop.
			if (Number.isNaN(start.getTime())) continue;
			const cursor = new Date(start);
			let guard = 0;
			while (cursor <= end && guard < 400) {
				const key = toKey(cursor);
				if (!map.has(key)) map.set(key, []);
				map.get(key)!.push(event);
				cursor.setDate(cursor.getDate() + 1);
				guard += 1;
			}
		}
		return map;
	}, [visibleEvents]);

	const upcoming = useMemo(
		() =>
			visibleEvents
				.filter((event) => event.startDate && daysAway(event.startDate) >= 0)
				.sort((a, b) => a.startDate.localeCompare(b.startDate))
				.slice(0, 5),
		[visibleEvents],
	);

	const stats = useMemo(() => {
		const monthPrefix = `${navYear}-${String(navMonth + 1).padStart(2, '0')}`;
		const inMonth = visibleEvents.filter((event) =>
			event.startDate.startsWith(monthPrefix),
		).length;
		const ahead = visibleEvents.filter(
			(event) => event.startDate && daysAway(event.startDate) >= 0,
		).length;
		return { total: visibleEvents.length, inMonth, ahead };
	}, [visibleEvents, navYear, navMonth]);

	const monthCells = useMemo(() => {
		const first = new Date(navYear, navMonth, 1);
		const last = new Date(navYear, navMonth + 1, 0);
		const lead = first.getDay();
		const cells: (string | null)[] = [];
		for (let i = 0; i < lead; i += 1) cells.push(null);
		for (let day = 1; day <= last.getDate(); day += 1) {
			cells.push(toKey(new Date(navYear, navMonth, day)));
		}
		while (cells.length % 7 !== 0) cells.push(null);
		return cells;
	}, [navYear, navMonth]);

	const agendaGroups = useMemo(() => {
		const sorted = [...visibleEvents]
			.filter((event) => event.startDate)
			.sort((a, b) => a.startDate.localeCompare(b.startDate));
		const map = new Map<string, CalendarEventRecord[]>();
		for (const event of sorted) {
			const key = event.startDate.slice(0, 7);
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(event);
		}
		return Array.from(map.entries());
	}, [visibleEvents]);

	const stepMonth = (delta: number) => {
		const next = new Date(navYear, navMonth + delta, 1);
		setNavYear(next.getFullYear());
		setNavMonth(next.getMonth());
	};

	const toggleTag = (tag: string) => {
		setActiveTags((prev) => {
			const next = new Set(prev);
			if (next.has(tag)) next.delete(tag);
			else next.add(tag);
			return next;
		});
	};

	const openCreate = (dateKey?: string) => {
		if (!canEdit) return;
		setForm({
			...emptyForm,
			startDate: dateKey || todayKey(),
			endDate: dateKey || todayKey(),
		});
		setError('');
		setDialogOpen(true);
	};

	const openEdit = (event: CalendarEventRecord) => {
		if (!canEdit) return;
		setForm({
			id: event.id,
			title: event.title,
			startDate: event.startDate,
			endDate: event.endDate || event.startDate,
			description: event.description,
			location: event.location,
			colorTag: event.colorTag,
		});
		setError('');
		setDialogOpen(true);
	};

	const handleSave = async () => {
		if (!form.title.trim()) {
			setError('Give the event a title.');
			return;
		}
		if (!form.startDate) {
			setError('Pick a date for the event.');
			return;
		}
		setSaving(true);
		setError('');
		try {
			const response = await fetch('/api/calendar', {
				method: form.id ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: form.id || undefined,
					title: form.title.trim(),
					startDate: form.startDate,
					endDate: form.endDate || form.startDate,
					description: form.description,
					location: form.location,
					colorTag: form.colorTag,
					academicYear,
				}),
			});
			const payload = await response.json();
			if (!response.ok || !payload?.success) {
				setError(payload?.message || 'Could not save the event.');
				return;
			}
			const saved = normalize(payload.data);
			commit(
				form.id
					? events.map((event) => (event.id === saved.id ? saved : event))
					: [...events, saved],
			);
			setDialogOpen(false);
			setForm(emptyForm);
		} catch {
			setError('Network error saving the event.');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!form.id) return;
		setSaving(true);
		setError('');
		try {
			const response = await fetch('/api/calendar', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: form.id }),
			});
			const payload = await response.json();
			if (!response.ok || !payload?.success) {
				setError(payload?.message || 'Could not delete the event.');
				return;
			}
			commit(events.filter((event) => event.id !== form.id));
			setDialogOpen(false);
			setForm(emptyForm);
		} catch {
			setError('Network error deleting the event.');
		} finally {
			setSaving(false);
		}
	};

	const focusedEvents = dayFocus ? eventsByDay.get(dayFocus) || [] : [];

	return (
		<div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
			{/* ── Header ──────────────────────────────────────────────────── */}
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-black tracking-tight sm:text-3xl">
						Academic Calendar
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Term dates, holidays, examinations, and the deadlines that matter.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold">
						<CalendarRange className="h-4 w-4 text-muted-foreground" />
						{academicYear || 'No academic year'}
					</span>
					{canEdit && (
						<button
							type="button"
							onClick={() => openCreate()}
							className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
						>
							<Plus className="h-4 w-4" />
							Add event
						</button>
					)}
				</div>
			</header>

			{error && !dialogOpen && (
				<div className="flex items-start justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
					<span>{error}</span>
					<button type="button" onClick={() => setError('')} aria-label="Dismiss">
						<X className="h-4 w-4" />
					</button>
				</div>
			)}

			{/* ── Stats ───────────────────────────────────────────────────── */}
			<div className="grid gap-4 sm:grid-cols-3">
				{[
					{
						label: 'Events this year',
						value: stats.total,
						icon: CalendarDays,
						hint: academicYear || '—',
					},
					{
						label: `In ${MONTHS[navMonth]}`,
						value: stats.inMonth,
						icon: CalendarRange,
						hint: `${navYear}`,
					},
					{
						label: 'Still ahead',
						value: stats.ahead,
						icon: Sparkles,
						hint: upcoming[0]
							? `Next: ${relativeLabel(upcoming[0].startDate).toLowerCase()}`
							: 'Nothing scheduled',
					},
				].map((tile) => {
					const Icon = tile.icon;
					return (
						<div
							key={tile.label}
							className="rounded-2xl border border-border bg-card p-4"
						>
							<div className="flex items-start justify-between gap-2">
								<p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
									{tile.label}
								</p>
								<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
							</div>
							<p className="mt-2 text-2xl font-black tabular-nums text-foreground">
								{tile.value}
							</p>
							<p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
								{tile.hint}
							</p>
						</div>
					);
				})}
			</div>

			{/* ── Filters ─────────────────────────────────────────────────── */}
			<div className="flex flex-wrap items-center gap-2">
				<div className="flex flex-wrap gap-1.5">
					<button
						type="button"
						onClick={() => setActiveTags(new Set())}
						className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
							activeTags.size === 0
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground hover:text-foreground'
						}`}
					>
						Everything
					</button>
					{CATEGORIES.map((category) => {
						const on = activeTags.has(category.tag);
						const count = events.filter(
							(event) => event.colorTag === category.tag,
						).length;
						return (
							<button
								key={category.tag}
								type="button"
								onClick={() => toggleTag(category.tag)}
								className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
									on
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-muted-foreground hover:text-foreground'
								}`}
							>
								<span className={`h-2 w-2 rounded-full ${category.dot}`} />
								{category.label}
								<span className="tabular-nums opacity-60">{count}</span>
							</button>
						);
					})}
				</div>
				<div className="ml-auto flex gap-1 rounded-full bg-muted p-1">
					{(['month', 'agenda'] as const).map((option) => (
						<button
							key={option}
							type="button"
							onClick={() => setView(option)}
							className={`rounded-full px-3 py-1 text-xs font-bold capitalize transition-colors ${
								view === option
									? 'bg-card text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'
							}`}
						>
							{option}
						</button>
					))}
				</div>
			</div>

			{loading ? (
				<div className="flex min-h-[40vh] items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : (
				<div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
					{/* ── Main view ───────────────────────────────────────────── */}
					<div className="min-w-0 space-y-4">
						{view === 'month' ? (
							<section className="overflow-hidden rounded-2xl border border-border bg-card">
								<header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
									<h2 className="text-sm font-black text-foreground">
										{MONTHS[navMonth]} {navYear}
									</h2>
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => {
												setNavYear(today.getFullYear());
												setNavMonth(today.getMonth());
											}}
											className="rounded-lg px-2.5 py-1 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										>
											Today
										</button>
										<button
											type="button"
											onClick={() => stepMonth(-1)}
											aria-label="Previous month"
											className="rounded-lg p-1.5 transition-colors hover:bg-muted"
										>
											<ChevronLeft className="h-4 w-4" />
										</button>
										<button
											type="button"
											onClick={() => stepMonth(1)}
											aria-label="Next month"
											className="rounded-lg p-1.5 transition-colors hover:bg-muted"
										>
											<ChevronRight className="h-4 w-4" />
										</button>
									</div>
								</header>

								<div className="grid grid-cols-7 border-b border-border bg-muted/40">
									{WEEKDAYS.map((day) => (
										<div
											key={day}
											className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
										>
											<span className="hidden sm:inline">{day}</span>
											<span className="sm:hidden">{day[0]}</span>
										</div>
									))}
								</div>

								<div className="grid grid-cols-7">
									{monthCells.map((key, index) => {
										if (!key) {
											return (
												<div
													key={`empty-${index}`}
													className="min-h-[4.5rem] border-b border-r border-border bg-muted/20 last:border-r-0 sm:min-h-[6rem]"
												/>
											);
										}
										const dayEvents = eventsByDay.get(key) || [];
										const isToday = key === todayKey();
										return (
											<button
												key={key}
												type="button"
												onClick={() =>
													dayEvents.length > 0
														? setDayFocus(key)
														: openCreate(key)
												}
												className={`min-h-[4.5rem] border-b border-r border-border p-1 text-left align-top transition-colors last:border-r-0 hover:bg-muted/50 sm:min-h-[6rem] sm:p-1.5 ${
													isToday ? 'bg-primary/5' : ''
												}`}
											>
												<span
													className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
														isToday
															? 'bg-primary text-primary-foreground'
															: 'text-muted-foreground'
													}`}
												>
													{fromKey(key).getDate()}
												</span>
												<span className="mt-1 block space-y-0.5">
													{dayEvents.slice(0, 2).map((event) => {
														const category = categoryFor(event.colorTag);
														return (
															<span
																key={`${key}-${event.id}`}
																className={`block truncate rounded px-1 py-0.5 text-[10px] font-bold ${category.chip}`}
															>
																{event.title}
															</span>
														);
													})}
													{dayEvents.length > 2 && (
														<span className="block px-1 text-[10px] font-bold text-muted-foreground">
															+{dayEvents.length - 2} more
														</span>
													)}
												</span>
											</button>
										);
									})}
								</div>
							</section>
						) : (
							<section className="space-y-4">
								{agendaGroups.length === 0 ? (
									<div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
										<CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
										<p className="text-sm font-bold text-foreground">
											Nothing on the calendar
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{activeTags.size > 0
												? 'No events match these filters.'
												: 'Events added for this academic year will appear here.'}
										</p>
									</div>
								) : (
									agendaGroups.map(([monthKey, monthEvents]) => {
										const [year, month] = monthKey.split('-').map(Number);
										return (
											<div
												key={monthKey}
												className="overflow-hidden rounded-2xl border border-border bg-card"
											>
												<header className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
													<h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
														{MONTHS[(month || 1) - 1]} {year}
													</h2>
													<span className="text-xs text-muted-foreground">
														{monthEvents.length} event
														{monthEvents.length === 1 ? '' : 's'}
													</span>
												</header>
												<ul className="divide-y divide-border">
													{monthEvents.map((event) => {
														const category = categoryFor(event.colorTag);
														return (
															<li key={event.id}>
																<button
																	type="button"
																	onClick={() =>
																		canEdit
																			? openEdit(event)
																			: setDayFocus(event.startDate)
																	}
																	className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
																>
																	<span
																		className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${category.dot}`}
																	/>
																	<span className="min-w-0 flex-1">
																		<span className="block break-words text-sm font-bold text-foreground">
																			{event.title}
																		</span>
																		<span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
																			<span>
																				{formatRange(
																					event.startDate,
																					event.endDate,
																				)}
																			</span>
																			{event.location && (
																				<span className="inline-flex items-center gap-1">
																					<MapPin className="h-3 w-3" />
																					{event.location}
																				</span>
																			)}
																		</span>
																		{event.description && (
																			<span className="mt-1 block text-xs text-muted-foreground">
																				{event.description}
																			</span>
																		)}
																	</span>
																	<span className="shrink-0 text-right">
																		<span
																			className={`block rounded-full px-2 py-0.5 text-[10px] font-bold ${category.chip}`}
																		>
																			{category.label}
																		</span>
																		<span className="mt-1 block text-[10px] font-medium text-muted-foreground">
																			{relativeLabel(event.startDate)}
																		</span>
																	</span>
																</button>
															</li>
														);
													})}
												</ul>
											</div>
										);
									})
								)}
							</section>
						)}
					</div>

					{/* ── Upcoming rail ───────────────────────────────────────── */}
					<aside className="space-y-3">
						<h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
							<Clock className="h-4 w-4" />
							Coming up
						</h2>
						{upcoming.length === 0 ? (
							<p className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
								Nothing scheduled ahead.
							</p>
						) : (
							<ul className="space-y-2">
								{upcoming.map((event) => {
									const category = categoryFor(event.colorTag);
									return (
										<li key={`upcoming-${event.id}`}>
											<button
												type="button"
												onClick={() =>
													canEdit ? openEdit(event) : setDayFocus(event.startDate)
												}
												className={`w-full rounded-xl border p-3 text-left transition-colors hover:border-primary/40 ${category.soft}`}
											>
												<p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
													{relativeLabel(event.startDate)}
												</p>
												<p className="mt-0.5 break-words text-sm font-bold text-foreground">
													{event.title}
												</p>
												<p className="mt-0.5 text-xs text-muted-foreground">
													{formatRange(event.startDate, event.endDate)}
												</p>
											</button>
										</li>
									);
								})}
							</ul>
						)}
					</aside>
				</div>
			)}

			{/* ── Day detail ──────────────────────────────────────────────── */}
			<Dialog
				open={Boolean(dayFocus)}
				onOpenChange={(open) => !open && setDayFocus(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{dayFocus
								? fromKey(dayFocus).toLocaleDateString('en-US', {
										weekday: 'long',
										month: 'long',
										day: 'numeric',
										year: 'numeric',
									})
								: ''}
						</DialogTitle>
					</DialogHeader>
					<ul className="divide-y divide-border rounded-xl border border-border">
						{focusedEvents.map((event) => {
							const category = categoryFor(event.colorTag);
							return (
								<li
									key={`focus-${event.id}`}
									className="flex items-start gap-3 px-3 py-2.5"
								>
									<span
										className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${category.dot}`}
									/>
									<div className="min-w-0 flex-1">
										<p className="break-words text-sm font-bold text-foreground">
											{event.title}
										</p>
										<p className="text-xs text-muted-foreground">
											{category.label} ·{' '}
											{formatRange(event.startDate, event.endDate)}
										</p>
										{event.location && (
											<p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
												<MapPin className="h-3 w-3" />
												{event.location}
											</p>
										)}
										{event.description && (
											<p className="mt-1 text-xs text-muted-foreground">
												{event.description}
											</p>
										)}
									</div>
									{canEdit && (
										<button
											type="button"
											onClick={() => {
												setDayFocus(null);
												openEdit(event);
											}}
											aria-label={`Edit ${event.title}`}
											className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										>
											<Pencil className="h-3.5 w-3.5" />
										</button>
									)}
								</li>
							);
						})}
					</ul>
					{canEdit && (
						<DialogFooter>
							<button
								type="button"
								onClick={() => {
									const key = dayFocus;
									setDayFocus(null);
									openCreate(key || undefined);
								}}
								className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
							>
								<Plus className="h-4 w-4" />
								Add on this day
							</button>
						</DialogFooter>
					)}
				</DialogContent>
			</Dialog>

			{/* ── Event editor ────────────────────────────────────────────── */}
			{canEdit && (
				<Dialog
					open={dialogOpen}
					onOpenChange={(open) => {
						setDialogOpen(open);
						if (!open) {
							setForm(emptyForm);
							setError('');
						}
					}}
				>
					<DialogContent className="max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>
								{form.id ? 'Edit event' : 'Add calendar event'}
							</DialogTitle>
						</DialogHeader>

						<div className="space-y-4">
							<label className="block space-y-1.5">
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
									Title
								</span>
								<input
									type="text"
									value={form.title}
									onChange={(event) =>
										setForm({ ...form, title: event.target.value })
									}
									placeholder="e.g. Mid-term break"
									className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</label>

							<div className="space-y-1.5">
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
									Category
								</span>
								<div className="flex flex-wrap gap-1.5">
									{CATEGORIES.map((category) => (
										<button
											key={category.tag}
											type="button"
											onClick={() => setForm({ ...form, colorTag: category.tag })}
											className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
												form.colorTag === category.tag
													? 'bg-primary text-primary-foreground'
													: 'bg-muted text-muted-foreground hover:text-foreground'
											}`}
										>
											<span className={`h-2 w-2 rounded-full ${category.dot}`} />
											{category.label}
										</button>
									))}
								</div>
							</div>

							<div className="space-y-1.5">
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
									Dates
								</span>
								<DateRangePicker
									label={null}
									placeholder="Pick the day, or a span of days"
									disableWeekends={false}
									value={
										form.startDate
											? { from: form.startDate, to: form.endDate || form.startDate }
											: null
									}
									onChange={(range) =>
										setForm({
											...form,
											startDate: range?.from || '',
											endDate: range?.to || range?.from || '',
										})
									}
								/>
								<p className="text-[11px] text-muted-foreground">
									Click one day for a single-day event, or two to span a range.
								</p>
							</div>

							<label className="block space-y-1.5">
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
									Location <span className="font-medium normal-case">(optional)</span>
								</span>
								<input
									type="text"
									value={form.location}
									onChange={(event) =>
										setForm({ ...form, location: event.target.value })
									}
									placeholder="e.g. School auditorium"
									className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</label>

							<label className="block space-y-1.5">
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
									Details <span className="font-medium normal-case">(optional)</span>
								</span>
								<textarea
									value={form.description}
									onChange={(event) =>
										setForm({ ...form, description: event.target.value })
									}
									rows={3}
									placeholder="Anything staff and families should know"
									className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</label>

							{error && (
								<p className="text-sm font-medium text-destructive">{error}</p>
							)}
						</div>

						<DialogFooter className="flex-wrap gap-2 sm:justify-between">
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									onClick={handleSave}
									disabled={saving}
									className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
								>
									{saving && <Loader2 className="h-4 w-4 animate-spin" />}
									{form.id ? 'Save changes' : 'Add event'}
								</button>
								<button
									type="button"
									onClick={() => setDialogOpen(false)}
									className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted"
								>
									Cancel
								</button>
							</div>
							{form.id && (
								<button
									type="button"
									onClick={handleDelete}
									disabled={saving}
									className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
								>
									<Trash2 className="h-4 w-4" />
									Delete
								</button>
							)}
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
