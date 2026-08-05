'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

/**
 * Date pickers shared across the dashboard.
 *
 * `DateRangePicker` (from/to) and `DatePicker` (single day) render the same
 * month grid so they read as one control family. Weekends are disabled by
 * default because the original caller was attendance, where a weekend entry is
 * meaningless — pass `disableWeekends={false}` for calendars and test dates,
 * where a holiday or an exam may legitimately fall on a Saturday.
 */

function fmtDate(d: Date) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function parseDate(s: string) {
	const [y, m, day] = s.split('-').map(Number);
	return new Date(y, m - 1, day);
}

function displayDate(s: string) {
	const d = parseDate(s);
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function displayFullDate(s: string) {
	const d = parseDate(s);
	return d.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

function monthStart(year: number, month: number) {
	return new Date(year, month, 1);
}

function monthEnd(year: number, month: number) {
	return new Date(year, month + 1, 0);
}

function todayStr() {
	return fmtDate(new Date());
}

const FULL_MONTH = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Shared popover shell: label, trigger button, outside-click dismissal.
 *
 * The trigger's styling is applied to the `<button>` itself rather than to a
 * wrapper — a button set to `display: contents` is dropped from the
 * accessibility tree by several browsers.
 */
function PickerShell({
	label,
	trigger,
	triggerClassName,
	open,
	setOpen,
	children,
	className = '',
}: {
	label?: string | null;
	trigger: React.ReactNode;
	triggerClassName: string;
	open: boolean;
	setOpen: (open: boolean) => void;
	children: React.ReactNode;
	className?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handler = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [setOpen]);

	return (
		<div ref={ref} className={`relative flex flex-col gap-0.5 ${className}`}>
			{label ? (
				<span className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
					{label}
				</span>
			) : null}
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className={triggerClassName}
			>
				{trigger}
			</button>
			{open && (
				<div className="absolute left-0 top-full z-[70] mt-1 w-max min-w-[280px] rounded-xl border border-border bg-card p-3 shadow-xl">
					{children}
				</div>
			)}
		</div>
	);
}

function MonthNav({
	navYear,
	navMonth,
	onPrev,
	onNext,
}: {
	navYear: number;
	navMonth: number;
	onPrev: () => void;
	onNext: () => void;
}) {
	return (
		<div className="mb-3 flex items-center justify-between px-1">
			<button
				type="button"
				onClick={onPrev}
				aria-label="Previous month"
				className="rounded p-1 transition-colors hover:bg-accent"
			>
				<ChevronLeft className="h-4 w-4" />
			</button>
			<span className="text-sm font-semibold text-foreground">
				{FULL_MONTH[navMonth]} {navYear}
			</span>
			<button
				type="button"
				onClick={onNext}
				aria-label="Next month"
				className="rounded p-1 transition-colors hover:bg-accent"
			>
				<ChevronRight className="h-4 w-4" />
			</button>
		</div>
	);
}

function CalendarMonth({
	year,
	month,
	rangeStart,
	rangeEnd,
	hovered,
	onDayClick,
	onDayHover,
	isSelecting,
	disableWeekends = true,
	min,
	max,
}: any) {
	const first = monthStart(year, month);
	const last = monthEnd(year, month);
	const startDow = first.getDay();
	const totalCells = Math.ceil((startDow + last.getDate()) / 7) * 7;
	const cells = [];

	for (let i = 0; i < totalCells; i++) {
		const dayNum = i - startDow + 1;
		if (dayNum < 1 || dayNum > last.getDate()) {
			cells.push(null);
		} else {
			const d = new Date(year, month, dayNum);
			cells.push(fmtDate(d));
		}
	}

	const isWeekend = (dateStr: string | null) => {
		if (!dateStr) return false;
		const dow = parseDate(dateStr).getDay();
		return dow === 0 || dow === 6;
	};

	const isDisabled = (dateStr: string | null) => {
		if (!dateStr) return true;
		if (disableWeekends && isWeekend(dateStr)) return true;
		if (min && dateStr < min) return true;
		if (max && dateStr > max) return true;
		return false;
	};

	const isInRange = (dateStr: string | null) => {
		if (!dateStr) return false;
		const end = isSelecting ? hovered : rangeEnd;
		const lo = rangeStart && end ? (rangeStart <= end ? rangeStart : end) : null;
		const hi = rangeStart && end ? (rangeStart <= end ? end : rangeStart) : null;
		return lo && hi && dateStr >= lo && dateStr <= hi;
	};

	const isEdge = (dateStr: string | null, which: 'start' | 'end') => {
		if (!dateStr) return false;
		const end = isSelecting ? hovered : rangeEnd;
		const lo = rangeStart && end ? (rangeStart <= end ? rangeStart : end) : null;
		const hi = rangeStart && end ? (rangeStart <= end ? end : rangeStart) : null;
		return which === 'start' ? dateStr === lo : dateStr === hi;
	};

	return (
		<div>
			<div className="grid grid-cols-7 gap-0.5">
				{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
					<div
						key={d}
						className="py-0.5 text-center text-[10px] font-medium text-muted-foreground"
					>
						{d}
					</div>
				))}
				{cells.map((dateStr, idx) => {
					const inRange = isInRange(dateStr);
					const isStart = isEdge(dateStr, 'start');
					const isEnd = isEdge(dateStr, 'end');
					const isToday = dateStr === todayStr();
					const disabled = isDisabled(dateStr);

					return (
						<button
							key={idx}
							type="button"
							disabled={disabled}
							onClick={() => dateStr && !disabled && onDayClick(dateStr)}
							onMouseEnter={() =>
								dateStr && !disabled && onDayHover && onDayHover(dateStr)
							}
							className={`
                relative h-7 w-full rounded-md text-xs font-medium transition-all duration-100
                ${!dateStr ? 'invisible' : ''}
                ${disabled && dateStr ? 'cursor-default text-muted-foreground/40' : 'cursor-pointer'}
                ${inRange && !isStart && !isEnd ? 'rounded-none bg-primary/15 text-foreground' : ''}
                ${isStart || isEnd ? 'z-10 rounded-md bg-primary text-primary-foreground shadow-sm' : ''}
                ${!inRange && !isStart && !isEnd && !disabled && dateStr ? 'text-foreground hover:bg-accent' : ''}
                ${isToday && !isStart && !isEnd ? 'ring-1 ring-inset ring-primary/50' : ''}
              `}
						>
							{dateStr ? parseDate(dateStr).getDate() : ''}
						</button>
					);
				})}
			</div>
		</div>
	);
}

export function DateRangePicker({
	value,
	onChange,
	label = 'Date Range',
	placeholder = 'Select date range',
	disableWeekends = true,
	className = '',
}: {
	value: { from: string; to: string } | null;
	onChange: (v: { from: string; to: string } | null) => void;
	label?: string | null;
	placeholder?: string;
	disableWeekends?: boolean;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const [selecting, setSelecting] = useState(false);
	const [tempStart, setTempStart] = useState<string | null>(null);
	const [hovered, setHovered] = useState<string | null>(null);
	const today = new Date();
	const [navYear, setNavYear] = useState(today.getFullYear());
	const [navMonth, setNavMonth] = useState(today.getMonth());

	const prevMonth = () => {
		if (navMonth === 0) {
			setNavMonth(11);
			setNavYear((y) => y - 1);
		} else setNavMonth((m) => m - 1);
	};

	const nextMonth = () => {
		if (navMonth === 11) {
			setNavMonth(0);
			setNavYear((y) => y + 1);
		} else setNavMonth((m) => m + 1);
	};

	const handleDayClick = (dateStr: string) => {
		if (!selecting) {
			setTempStart(dateStr);
			setSelecting(true);
		} else {
			const lo = tempStart! <= dateStr ? tempStart : dateStr;
			const hi = tempStart! <= dateStr ? dateStr : tempStart;
			onChange({ from: lo!, to: hi! });
			setSelecting(false);
			setTempStart(null);
			setOpen(false);
		}
	};

	const displayLabel =
		value?.from && value?.to
			? `${displayDate(value.from)} – ${displayDate(value.to)}`
			: placeholder;

	const quickRanges = [
		{
			label: 'This week',
			fn: () => {
				const d = new Date();
				const dow = d.getDay();
				const mon = new Date(d);
				mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
				const fri = new Date(mon);
				fri.setDate(mon.getDate() + 4);
				onChange({ from: fmtDate(mon), to: fmtDate(fri) });
				setOpen(false);
			},
		},
		{
			label: 'Last 2 weeks',
			fn: () => {
				const to = new Date();
				const from = new Date();
				from.setDate(to.getDate() - 13);
				onChange({ from: fmtDate(from), to: fmtDate(to) });
				setOpen(false);
			},
		},
		{
			label: 'This month',
			fn: () => {
				const d = new Date();
				onChange({
					from: fmtDate(monthStart(d.getFullYear(), d.getMonth())),
					to: fmtDate(monthEnd(d.getFullYear(), d.getMonth())),
				});
				setOpen(false);
			},
		},
	];

	return (
		<PickerShell
			label={label}
			open={open}
			setOpen={setOpen}
			className={className}
			triggerClassName="flex h-8 items-center gap-2 whitespace-nowrap rounded-lg border border-input bg-background pl-3 pr-2.5 text-sm text-foreground transition-colors hover:border-ring/50"
			trigger={
				<>
					<CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					<span
						className={value?.from ? 'text-foreground' : 'text-muted-foreground'}
					>
						{displayLabel}
					</span>
					<ChevronDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
				</>
			}
		>
			{selecting && (
				<div className="mb-2 rounded-lg bg-muted/50 px-3 py-1.5 text-center text-xs text-muted-foreground">
					Click a second date to complete the range
				</div>
			)}
			<div className="mb-3 flex flex-wrap gap-1">
				{quickRanges.map((r) => (
					<button
						key={r.label}
						type="button"
						onClick={r.fn}
						className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-accent"
					>
						{r.label}
					</button>
				))}
				{value?.from && (
					<button
						type="button"
						onClick={() => {
							onChange(null);
							setSelecting(false);
							setTempStart(null);
						}}
						className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-destructive transition-colors hover:border-destructive/30 hover:bg-destructive/10"
					>
						Clear
					</button>
				)}
			</div>

			<MonthNav
				navYear={navYear}
				navMonth={navMonth}
				onPrev={prevMonth}
				onNext={nextMonth}
			/>

			<CalendarMonth
				year={navYear}
				month={navMonth}
				rangeStart={selecting ? tempStart : value?.from}
				rangeEnd={selecting ? null : value?.to}
				hovered={hovered}
				onDayClick={handleDayClick}
				onDayHover={setHovered}
				isSelecting={selecting}
				disableWeekends={disableWeekends}
			/>
		</PickerShell>
	);
}

/** Single-day variant. Same grid, one selection. */
export function DatePicker({
	value,
	onChange,
	label = null,
	placeholder = 'Pick a date',
	disableWeekends = false,
	min,
	max,
	className = '',
}: {
	value: string;
	onChange: (value: string) => void;
	label?: string | null;
	placeholder?: string;
	disableWeekends?: boolean;
	min?: string;
	max?: string;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const initial = value ? parseDate(value) : new Date();
	const [navYear, setNavYear] = useState(initial.getFullYear());
	const [navMonth, setNavMonth] = useState(initial.getMonth());

	// Re-centre on the selected month when the value is set from outside
	// (editing an existing record, for instance).
	useEffect(() => {
		if (!value) return;
		const parsed = parseDate(value);
		if (Number.isNaN(parsed.getTime())) return;
		setNavYear(parsed.getFullYear());
		setNavMonth(parsed.getMonth());
	}, [value]);

	const prevMonth = () => {
		if (navMonth === 0) {
			setNavMonth(11);
			setNavYear((y) => y - 1);
		} else setNavMonth((m) => m - 1);
	};

	const nextMonth = () => {
		if (navMonth === 11) {
			setNavMonth(0);
			setNavYear((y) => y + 1);
		} else setNavMonth((m) => m + 1);
	};

	return (
		<PickerShell
			label={label}
			open={open}
			setOpen={setOpen}
			className={className}
			triggerClassName="flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-foreground transition-colors hover:border-ring/50"
			trigger={
				<>
					<CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
					<span
						className={`flex-1 truncate text-left ${value ? 'text-foreground' : 'text-muted-foreground'}`}
					>
						{value ? displayFullDate(value) : placeholder}
					</span>
					<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				</>
			}
		>
			<div className="mb-3 flex flex-wrap gap-1">
				<button
					type="button"
					onClick={() => {
						onChange(todayStr());
						setOpen(false);
					}}
					className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-accent"
				>
					Today
				</button>
				{value && (
					<button
						type="button"
						onClick={() => {
							onChange('');
							setOpen(false);
						}}
						className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-destructive transition-colors hover:border-destructive/30 hover:bg-destructive/10"
					>
						Clear
					</button>
				)}
			</div>

			<MonthNav
				navYear={navYear}
				navMonth={navMonth}
				onPrev={prevMonth}
				onNext={nextMonth}
			/>

			<CalendarMonth
				year={navYear}
				month={navMonth}
				rangeStart={value || null}
				rangeEnd={value || null}
				hovered={null}
				isSelecting={false}
				disableWeekends={disableWeekends}
				min={min}
				max={max}
				onDayClick={(dateStr: string) => {
					onChange(dateStr);
					setOpen(false);
				}}
				onDayHover={() => {}}
			/>
		</PickerShell>
	);
}
