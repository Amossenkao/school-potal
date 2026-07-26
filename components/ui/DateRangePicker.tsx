'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

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

function CalendarMonth({
	year,
	month,
	rangeStart,
	rangeEnd,
	hovered,
	onDayClick,
	onDayHover,
	isSelecting,
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
						className="text-[10px] text-muted-foreground text-center py-0.5 font-medium"
					>
						{d}
					</div>
				))}
				{cells.map((dateStr, idx) => {
					const inRange = isInRange(dateStr);
					const isStart = isEdge(dateStr, 'start');
					const isEnd = isEdge(dateStr, 'end');
					const isToday = dateStr === todayStr();
					const weekend = isWeekend(dateStr);

					return (
						<button
							key={idx}
							disabled={!dateStr || weekend}
							onClick={() => dateStr && !weekend && onDayClick(dateStr)}
							onMouseEnter={() => dateStr && !weekend && onDayHover(dateStr)}
							className={`
                h-7 w-full text-xs rounded-md transition-all duration-100 relative font-medium
                ${!dateStr ? 'invisible' : ''}
                ${weekend ? 'text-muted-foreground/40 cursor-default' : 'cursor-pointer'}
                ${inRange && !isStart && !isEnd ? 'bg-primary/15 rounded-none text-foreground' : ''}
                ${isStart || isEnd ? 'bg-primary text-primary-foreground rounded-md shadow-sm z-10' : ''}
                ${!inRange && !isStart && !isEnd && !weekend && dateStr ? 'hover:bg-accent text-foreground' : ''}
                ${isToday && !isStart && !isEnd ? 'ring-1 ring-primary/50 ring-inset' : ''}
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

export function DateRangePicker({ value, onChange }: { value: { from: string; to: string } | null; onChange: (v: { from: string; to: string } | null) => void }) {
	const [open, setOpen] = useState(false);
	const [selecting, setSelecting] = useState(false);
	const [tempStart, setTempStart] = useState<string | null>(null);
	const [hovered, setHovered] = useState<string | null>(null);
	const today = new Date();
	const [navYear, setNavYear] = useState(today.getFullYear());
	const [navMonth, setNavMonth] = useState(today.getMonth());
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node))
				setOpen(false);
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, []);

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

	const label =
		value?.from && value?.to
			? `${displayDate(value.from)} – ${displayDate(value.to)}`
			: 'Select date range';

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
		<div ref={ref} className="relative flex flex-col gap-0.5">
			<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
				Date Range
			</span>
			<button
				onClick={() => setOpen(!open)}
				className="flex items-center gap-2 h-8 pl-3 pr-2.5 rounded-lg border border-input bg-background text-foreground text-sm hover:border-ring/50 transition-colors whitespace-nowrap"
			>
				<CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
				<span
					className={value?.from ? 'text-foreground' : 'text-muted-foreground'}
				>
					{label}
				</span>
				<ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
			</button>

			{open && (
				<div className="absolute top-full left-0 mt-1 z-[70] bg-card border border-border rounded-xl shadow-xl p-3 w-max min-w-[280px]">
					{selecting && (
						<div className="mb-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5 text-center">
							Click a second date to complete the range
						</div>
					)}
					<div className="flex gap-1 flex-wrap mb-3">
						{quickRanges.map((r) => (
							<button
								key={r.label}
								onClick={r.fn}
								className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-border hover:bg-accent hover:border-primary/30 transition-colors text-foreground"
							>
								{r.label}
							</button>
						))}
						{value?.from && (
							<button
								onClick={() => {
									onChange(null);
									setSelecting(false);
									setTempStart(null);
								}}
								className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-border hover:bg-destructive/10 hover:border-destructive/30 transition-colors text-destructive"
							>
								Clear
							</button>
						)}
					</div>

					<div className="flex items-center justify-between mb-3 px-1">
						<button
							onClick={prevMonth}
							className="p-1 rounded hover:bg-accent transition-colors"
						>
							<ChevronLeft className="w-4 h-4" />
						</button>
						<span className="text-sm font-semibold text-foreground">
							{FULL_MONTH[navMonth]} {navYear}
						</span>
						<button
							onClick={nextMonth}
							className="p-1 rounded hover:bg-accent transition-colors"
						>
							<ChevronRight className="w-4 h-4" />
						</button>
					</div>

					<div className="block">
						<CalendarMonth
							year={navYear}
							month={navMonth}
							rangeStart={selecting ? tempStart : value?.from}
							rangeEnd={selecting ? null : value?.to}
							hovered={hovered}
							onDayClick={handleDayClick}
							onDayHover={setHovered}
							isSelecting={selecting}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
