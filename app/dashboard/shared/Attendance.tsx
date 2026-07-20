'use client';

import React, {
	useState,
	useMemo,
	useCallback,
	useRef,
	useEffect,
} from 'react';
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	CheckCircle,
	AlertCircle,
	Users,
	Download,
	CalendarDays,
	Save,
	X,
	Pencil,
	Check,
	Loader2,
} from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';


// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: Date) {
	// Prevents local timezone shifts from .toISOString()
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

function displayDateFull(s: string) {
	const d = parseDate(s);
	return d.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

function getSchoolDatesInRange(from: string, to: string) {
	const dates = [];
	const cur = new Date(from);
	const end = new Date(to);
	while (cur <= end) {
		const dow = cur.getDay();
		if (dow !== 0 && dow !== 6) dates.push(fmtDate(cur));
		cur.setDate(cur.getDate() + 1);
	}
	return dates;
}

function todayStr() {
	return fmtDate(new Date());
}

function monthStart(year: number, month: number) {
	return new Date(year, month, 1);
}

function monthEnd(year: number, month: number) {
	return new Date(year, month + 1, 0);
}

function exportCsv(filename: string, rows: any[], headers: string[]) {
	const lines = [
		headers.join(','),
		...rows.map((r) => headers.map((h) => `"${r[h] ?? ''}"`).join(',')),
	];
	const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = filename;
	a.click();
}

// Extract UTC date strictly avoiding local timezone shifts
function getUTCDateString(isoString: string | Date) {
	if (!isoString) return '';
	const str =
		typeof isoString === 'string' ? isoString : isoString.toISOString();
	return str.includes('T') ? str.substring(0, 10) : str;
}

// Utility equivalents for scoped store values
function areAcademicYearsEqual(y1?: string, y2?: string) {
	if (!y1 || !y2) return false;
	return (
		String(y1).replace(/[\/\-]/g, '') === String(y2).replace(/[\/\-]/g, '')
	);
}

function getScopedAcademicYearValue(
	storeRecord: Record<string, any>,
	academicYear: string,
) {
	if (!storeRecord || !academicYear) return { value: null };
	const match = Object.keys(storeRecord).find((k) =>
		areAcademicYearsEqual(k, academicYear),
	);
	return { value: match ? storeRecord[match] : null };
}

// ─── Date Range Picker ───────────────────────────────────────────────────────

const FULL_MONTH = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
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
		const lo =
			rangeStart && end ? (rangeStart <= end ? rangeStart : end) : null;
		const hi =
			rangeStart && end ? (rangeStart <= end ? end : rangeStart) : null;
		return lo && hi && dateStr >= lo && dateStr <= hi;
	};

	const isEdge = (dateStr: string | null, which: 'start' | 'end') => {
		if (!dateStr) return false;
		const end = isSelecting ? hovered : rangeEnd;
		const lo =
			rangeStart && end ? (rangeStart <= end ? rangeStart : end) : null;
		const hi =
			rangeStart && end ? (rangeStart <= end ? end : rangeStart) : null;
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

function DateRangePicker({ value, onChange }: any) {
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
			onChange({ from: lo, to: hi });
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

// ─── FilterSelect ──────────────────────────────────────

const FilterSelect = ({
	label,
	value,
	onChange,
	options,
	placeholder,
	disabled,
}: any) => (
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
				{placeholder && !disabled && <option value="">{placeholder}</option>}
				{options.map((o: any) => (
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

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusChip = ({ status, compact = false }: any) => {
	if (!status)
		return (
			<span
				className={`${compact ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-xs'} rounded-full flex items-center justify-center font-semibold bg-muted text-muted-foreground`}
			>
				–
			</span>
		);
	const isPresent = status === 'present';
	return (
		<span
			className={`${compact ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-xs'} rounded-full flex items-center justify-center font-bold transition-colors ${
				isPresent
					? 'bg-[var(--bg-success,#dcfce7)] text-[var(--text-success,#166534)]'
					: 'bg-[var(--bg-danger,#fee2e2)] text-[var(--text-danger,#991b1b)]'
			}`}
		>
			{isPresent ? 'P' : 'A'}
		</span>
	);
};

// ─── Take/Edit Attendance Modal ───────────────────────────────────────────────

function AttendanceModal({
	date,
	students,
	existing,
	onSave,
	onClose,
	isSubmitting,
}: any) {
	const [records, setRecords] = useState(() => {
		const map: Record<string, string> = {};
		students.forEach((s: any) => {
			map[s.studentId] = existing[s.studentId]?.status || 'absent';
		});
		return map;
	});

	const setAll = (status: string) => {
		const next: Record<string, string> = {};
		students.forEach((s: any) => {
			next[s.studentId] = status;
		});
		setRecords(next);
	};

	const presentCount = Object.values(records).filter(
		(v) => v === 'present',
	).length;
	const absentCount = students.length - presentCount;

	return (
		<div
			className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="bg-card border border-border rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
					<div>
						<p className="font-semibold text-foreground text-sm">
							{displayDateFull(date)}
						</p>
						<p className="text-xs text-muted-foreground mt-0.5">
							<span className="text-[var(--text-success,#166534)] font-medium">
								{presentCount} present
							</span>
							{' · '}
							<span className="text-[var(--text-danger,#991b1b)] font-medium">
								{absentCount} absent
							</span>
						</p>
					</div>
					<button
						onClick={onClose}
						disabled={isSubmitting}
						className="p-1.5 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Quick-set */}
				<div className="flex gap-2 px-4 py-2.5 border-b border-border shrink-0">
					<button
						onClick={() => setAll('present')}
						disabled={isSubmitting}
						className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg bg-[var(--bg-success,#dcfce7)] text-[var(--text-success,#166534)] hover:opacity-80 transition-opacity disabled:opacity-50"
					>
						<Check className="w-3.5 h-3.5" /> All present
					</button>
					<button
						onClick={() => setAll('absent')}
						disabled={isSubmitting}
						className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg bg-[var(--bg-danger,#fee2e2)] text-[var(--text-danger,#991b1b)] hover:opacity-80 transition-opacity disabled:opacity-50"
					>
						<X className="w-3.5 h-3.5" /> All absent
					</button>
				</div>

				{/* Student list */}
				<div className="flex-1 overflow-y-auto px-2 py-1">
					{students
						.slice()
						.sort((a: any, b: any) =>
							a.studentName.localeCompare(b.studentName),
						)
						.map((student: any) => {
							const status = records[student.studentId];
							const isPresent = status === 'present';
							const switchId = `switch-${student.studentId}`;
							return (
								<label
									key={student.studentId}
									htmlFor={switchId}
									className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors select-none ${
										isSubmitting
											? 'opacity-60 cursor-not-allowed'
											: 'cursor-pointer hover:bg-accent/50'
									}`}
								>
									<span className="flex-1 text-sm font-medium text-foreground">
										{student.studentName}
									</span>

									{/* Switch */}
									<div className="relative shrink-0">
										<input
											type="checkbox"
											id={switchId}
											checked={isPresent}
											disabled={isSubmitting}
											onChange={() =>
												setRecords((prev) => ({
													...prev,
													[student.studentId]: isPresent ? 'absent' : 'present',
												}))
											}
											className="sr-only peer"
										/>
										<div
											className={`w-10 h-[22px] rounded-full border transition-all duration-200 ${
												isPresent
													? 'bg-[var(--bg-success,#dcfce7)] border-[var(--text-success,#166534)]/40'
													: 'bg-muted border-border'
											}`}
										/>
										<div
											className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full shadow-sm transition-all duration-200 ${
												isPresent
													? 'translate-x-[18px] bg-[var(--text-success,#166634)]'
													: 'translate-x-0 bg-muted-foreground/60'
											}`}
										/>
									</div>

									<span
										className={`text-xs font-semibold w-12 text-right transition-colors ${
											isPresent
												? 'text-[var(--text-success,#166534)]'
												: 'text-[var(--text-danger,#991b1b)]'
										}`}
									>
										{isPresent ? 'Present' : 'Absent'}
									</span>
								</label>
							);
						})}
				</div>

				{/* Footer */}
				<div className="flex gap-2 px-4 py-3 border-t border-border shrink-0">
					<button
						onClick={onClose}
						disabled={isSubmitting}
						className="flex-1 py-2.5 text-sm font-medium rounded-xl hover:bg-accent transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onClick={() => onSave(date, records)}
						disabled={isSubmitting}
						className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
					>
						{isSubmitting ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Save className="w-4 h-4" />
						)}
						{isSubmitting ? 'Saving...' : 'Save attendance'}
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Main Attendance Component ────────────────────────────────────────────────

const Attendance = () => {
	const user = useAuth((state) => state.user) as any;
	const school = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
	const attendanceByAcademicYear = useSchoolStore(
		(state) => state.attendanceByAcademicYear,
	);
	const mergeAttendanceForYear = useSchoolStore(
		(state) => state.mergeAttendanceForYear,
	);

	const usersByYearRef = useRef(usersByAcademicYear);
	const attendanceByYearRef = useRef(attendanceByAcademicYear);
	const tableScrollContainerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		usersByYearRef.current = usersByAcademicYear;
	}, [usersByAcademicYear]);
	useEffect(() => {
		attendanceByYearRef.current = attendanceByAcademicYear;
	}, [attendanceByAcademicYear]);

	// ── Available Academic Years ───────────────────────────────────────────────
	const availableAcademicYears = useMemo(() => {
		if (!user) return [];
		if (
			user.role === 'system_admin' ||
			user.role === 'administrator' ||
			user.role === 'super_admin'
		) {
			const firstYear = school?.firstAcademicYear;
			const currentYear = school?.currentAcademicYear;
			if (!firstYear || !currentYear) {
				return [currentYear].filter(Boolean);
			}
			const sep = firstYear.includes('/') ? '/' : '-';
			const startNum = parseInt(
				firstYear.split(sep)[0] || firstYear.split('/')[0],
				10,
			);
			const endNum = parseInt(
				currentYear.split(sep)[0] || currentYear.split('/')[0],
				10,
			);
			if (Number.isNaN(startNum) || Number.isNaN(endNum)) {
				return [currentYear];
			}
			const years: string[] = [];
			for (let y = startNum; y <= endNum; y++) {
				years.push(`${y}${sep}${y + 1}`);
			}
			return years.reverse();
		}
		if (user.role === 'teacher') {
			const years = new Set<string>();
			user.subjects?.forEach((s: any) => {
				if (s.year) years.add(s.year);
			});
			return Array.from(years).sort().reverse();
		}
		if (user.role === 'student') {
			const years = new Set<string>();
			user.academicYears?.forEach((ay: any) => {
				if (ay.year) years.add(ay.year);
			});
			if (user.enrollmentYear) years.add(user.enrollmentYear);
			return Array.from(years).sort().reverse();
		}
		return [];
	}, [user, school]);

	// ── filter state ──────────────────────────────────────────────────────────
	const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
	const [selectedSession, setSelectedSession] = useState('');
	const [selectedClassLevel, setSelectedClassLevel] = useState('');
	const [selectedClassId, setSelectedClassId] = useState('');
	const [dateRange, setDateRange] = useState(() => {
		const today = new Date();
		const dow = today.getDay(); // 0=Sun, 6=Sat
		const anchor = new Date(today);
		if (dow === 0) anchor.setDate(today.getDate() - 2);
		if (dow === 6) anchor.setDate(today.getDate() - 1);
		const mon = new Date(anchor);
		mon.setDate(anchor.getDate() - (anchor.getDay() - 1));
		return { from: fmtDate(mon), to: fmtDate(anchor) };
	});

	// Initialize default academic year
	useEffect(() => {
		if (availableAcademicYears.length > 0 && !selectedAcademicYear) {
			setSelectedAcademicYear(availableAcademicYears[0]);
		}
	}, [availableAcademicYears, selectedAcademicYear]);

	// ── state logic ───────────────────────────────────────────────────────
	const [students, setStudents] = useState<any[]>([]);
	const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
	const [modal, setModal] = useState<{ date: string } | null>(null);
	const [notification, setNotification] = useState<{
		type: 'success' | 'error';
		message: string;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const showNotification = useCallback(
		(message: string, type: 'success' | 'error' = 'error') => {
			setNotification({ message, type });
			setTimeout(() => setNotification(null), 4000);
		},
		[],
	);

	// ── derived dates ─────────────────────────────────────────────────────────
	const dates = useMemo(() => {
		if (!dateRange?.from || !dateRange?.to) return [];
		return getSchoolDatesInRange(dateRange.from, dateRange.to);
	}, [dateRange]);

	// ── class metadata helpers ────────────────────────────────────────────────
	const getClassMeta = useCallback(
		(classId: string) => {
			for (const [session, levels] of Object.entries(
				school?.classLevels || {},
			)) {
				for (const [level, ld] of Object.entries(levels as any)) {
					const found = (ld as any).classes?.find(
						(c: any) => c.classId === classId,
					);
					if (found) return { ...found, session, level };
				}
			}
			return null;
		},
		[school],
	);

	const assignedClasses = useMemo(() => {
		if (!user) return [];
		if (
			user.role === 'system_admin' ||
			user.role === 'administrator' ||
			user.role === 'super_admin'
		) {
			const all: any[] = [];
			for (const [session, levels] of Object.entries(
				school?.classLevels || {},
			)) {
				for (const [level, ld] of Object.entries(levels as any)) {
					(ld as any).classes?.forEach((c: any) =>
						all.push({ ...c, session, level }),
					);
				}
			}
			return all;
		}
		if (user.role === 'teacher') {
			const yr = (user.subjects || []).find(
				(e: any) => e.year === selectedAcademicYear,
			);
			return (yr?.classes || [])
				.map((e: any) => {
					const meta = getClassMeta(e.classId);
					return meta ? { ...meta } : null;
				})
				.filter(Boolean);
		}
		if (user.role === 'student') {
			const yr = (user.academicYears || []).find(
				(e: any) => e.year === selectedAcademicYear,
			);
			const cid = yr?.classId || user.classId;
			return [getClassMeta(cid)].filter(Boolean);
		}
		return [];
	}, [user, school, selectedAcademicYear, getClassMeta]);

	const sessions = useMemo(
		() => [...new Set(assignedClasses.map((c) => c.session))],
		[assignedClasses],
	);
	const levels = useMemo(() => {
		if (!selectedSession) return [];
		return [
			...new Set(
				assignedClasses
					.filter((c) => c.session === selectedSession)
					.map((c) => c.level),
			),
		];
	}, [assignedClasses, selectedSession]);
	const classes = useMemo(() => {
		if (!selectedSession || !selectedClassLevel) return [];
		return assignedClasses.filter(
			(c) => c.session === selectedSession && c.level === selectedClassLevel,
		);
	}, [assignedClasses, selectedSession, selectedClassLevel]);

	// auto-select first session by default
	useEffect(() => {
		if (sessions.length > 0 && !selectedSession)
			setSelectedSession(sessions[0]);
	}, [sessions, selectedSession]);
	useEffect(() => {
		if (levels.length === 1 && !selectedClassLevel)
			setSelectedClassLevel(levels[0]);
	}, [levels, selectedClassLevel]);
	useEffect(() => {
		if (classes.length === 1 && !selectedClassId)
			setSelectedClassId(classes[0].classId);
	}, [classes, selectedClassId]);

	// Reset state when filters change
	useEffect(() => {
		setStudents([]);
	}, [selectedAcademicYear, selectedClassId]);

	// Load Data
	useEffect(() => {
		if (!selectedClassId || !selectedAcademicYear) return;
		let isMounted = true;

		const loadData = async () => {
			setIsLoading(true);
			try {
				let studentsList: any[] = [];
				const cachedUsers = getScopedAcademicYearValue(
					usersByYearRef.current,
					selectedAcademicYear,
				).value;

				if (Array.isArray(cachedUsers?.students)) {
					studentsList = cachedUsers.students.filter((s: any) => {
						const yr = s.academicYears?.find(
							(a: any) => a.year === selectedAcademicYear,
						);
						return (yr?.classId || s.classId) === selectedClassId;
					});
				}

				if (studentsList.length === 0) {
					const res = await fetch(
						`/api/users?role=student&academicYear=${selectedAcademicYear}&classId=${selectedClassId}`,
					);
					if (res.ok) {
						const data = await res.json();
						studentsList = Array.isArray(data?.data)
							? data.data
							: Array.isArray(data?.data?.students)
								? data.data.students
								: [];
						setUsersForYear(
							selectedAcademicYear,
							{ students: studentsList },
							{ merge: true },
						);
					}
				}

				if (!isMounted) return;
				setStudents(
					studentsList.map((s) => ({
						// FIX: Priority given to the custom string ID rather than the MongoDB Object ID
						studentId: s.studentId || s.id || s._id,
						studentName:
							s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
					})),
				);

				const cachedAttendance =
					getScopedAcademicYearValue(
						attendanceByYearRef.current,
						selectedAcademicYear,
					).value || [];
				const hasCachedAttendance = cachedAttendance.some(
					(a: any) => a.classId === selectedClassId,
				);

				if (!hasCachedAttendance) {
					const res = await fetch(
						`/api/attendance?academicYear=${selectedAcademicYear}&classId=${selectedClassId}`,
					);
					if (res.ok) {
						const data = await res.json();
						const attendanceList = Array.isArray(data?.data) ? data.data : [];
						mergeAttendanceForYear(selectedAcademicYear, attendanceList);
					}
				}
			} catch (error) {
				console.error('Failed to load attendance data:', error);
			} finally {
				if (isMounted) setIsLoading(false);
			}
		};
		loadData();

		return () => {
			isMounted = false;
		};
	}, [
		selectedClassId,
		selectedAcademicYear,
		setUsersForYear,
		mergeAttendanceForYear,
	]);

	// Construct Map directly from central store cache
	const attendanceMap = useMemo(() => {
		const map: Record<string, Record<string, { status: string }>> = {};
		const allAtt =
			getScopedAcademicYearValue(attendanceByAcademicYear, selectedAcademicYear)
				.value || [];
		const classAtt = allAtt.filter((a: any) => a.classId === selectedClassId);

		classAtt.forEach((record: any) => {
			const dateStr = getUTCDateString(record.date);
			if (!dateStr) return;

			record.presentStudentIds?.forEach((id: string) => {
				if (!map[id]) map[id] = {};
				map[id][dateStr] = { status: 'present' };
			});
			record.absentStudentIds?.forEach((id: string) => {
				if (!map[id]) map[id] = {};
				map[id][dateStr] = { status: 'absent' };
			});
		});
		return map;
	}, [attendanceByAcademicYear, selectedAcademicYear, selectedClassId]);

	// ── permissions ───────────────────────────────────────────────────────────
	// ── permissions ───────────────────────────────────────────────────────────
	const canTakeAttendance = useCallback(
		(date: string) => {
			if (!user) return false;
			if (
				user.role === 'system_admin' ||
				user.role === 'administrator' ||
				user.role === 'super_admin'
			)
				return true;
			if (user.role === 'teacher') return date === todayStr();

			if (user.role === 'student') {
				const isToday = date === todayStr();

				// Check if any attendance data exists for this specific date
				const isAlreadyRecorded = students.some(
					(s) => !!attendanceMap[s.studentId]?.[date],
				);

				// Students can only record if it's today, they have permission, and it hasn't been recorded yet
				return isToday && !!user.canRecordAttendance && !isAlreadyRecorded;
			}
			return false;
		},
		[user, students, attendanceMap], // Added students and attendanceMap to dependencies
	);

	const canEditAttendance = useCallback(
		(date: string) => {
			if (!user) return false;
			if (
				user.role === 'system_admin' ||
				user.role === 'administrator' ||
				user.role === 'super_admin'
			)
				return true;

			// Teachers can only modify attendance for today
			if (user.role === 'teacher') return date === todayStr();

			// Students can NEVER modify attendance that has already been recorded
			if (user.role === 'student') return false;

			return false;
		},
		[user], // Only depends on user
	);


	// ── save attendance ───────────────────────────────────────────────────────
	const handleSave = useCallback(
		async (date: string, records: Record<string, string>) => {
			if (isSubmitting) return;
			setIsSubmitting(true);

			try {
				const presentStudentIds = Object.entries(records)
					.filter(([_, status]) => status === 'present')
					.map(([id]) => id);
				const absentStudentIds = Object.entries(records)
					.filter(([_, status]) => status === 'absent')
					.map(([id]) => id);

				const payload = {
					academicYear: selectedAcademicYear,
					classId: selectedClassId,
					date: new Date(date).toISOString(),
					presentStudentIds,
					absentStudentIds,
				};

				// Determine if we're creating or patching
				const existingRecords =
					getScopedAcademicYearValue(
						attendanceByYearRef.current,
						selectedAcademicYear,
					).value || [];
				const hasExistingForDate = existingRecords.some(
					(r: any) =>
						r.classId === selectedClassId && getUTCDateString(r.date) === date,
				);

				const res = await fetch('/api/attendance', {
					method: hasExistingForDate ? 'PATCH' : 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});

				if (!res.ok) {
					const errorData = await res.json();
					throw new Error(errorData.message || 'Failed to save attendance');
				}

				const { data } = await res.json();
				mergeAttendanceForYear(selectedAcademicYear, [data]);

				setModal(null);
				showNotification('Attendance saved successfully!', 'success');
			} catch (error: any) {
				console.error('Error saving attendance:', error);
				showNotification(error.message || 'An error occurred while saving.');
			} finally {
				setIsSubmitting(false);
			}
		},
		[
			selectedAcademicYear,
			selectedClassId,
			mergeAttendanceForYear,
			isSubmitting,
			showNotification,
		],
	);

	// ── stats per student ─────────────────────────────────────────────────────
	const studentStats = useMemo(() => {
		return students.map((s) => {
			let present = 0,
				absent = 0,
				total = 0;
			dates.forEach((d) => {
				const rec = attendanceMap[s.studentId]?.[d];
				if (rec) {
					total++;
					if (rec.status === 'present') present++;
					else absent++;
				}
			});
			return {
				...s,
				present,
				absent,
				total,
				rate: total > 0 ? Math.round((present / total) * 100) : null,
			};
		});
	}, [students, dates, attendanceMap]);

	// ── CSV export ────────────────────────────────────────────────────────────
	const handleExport = () => {
		const headers = ['Student', ...dates, 'Present', 'Absent', 'Total', 'Rate'];
		const rows = studentStats.map((s) => {
			const row: Record<string, any> = { Student: s.studentName };
			dates.forEach((d) => {
				row[d] =
					attendanceMap[s.studentId]?.[d]?.status?.toUpperCase()?.[0] || '–';
			});
			row['Present'] = s.present;
			row['Absent'] = s.absent;
			row['Total'] = s.total;
			row['Rate'] = s.rate !== null ? `${s.rate}%` : '–';
			return row;
		});
		exportCsv(
			`attendance-${selectedClassId}-${dateRange?.from}-${dateRange?.to}.csv`,
			rows,
			headers,
		);
	};

	// ── visible dates (for table, limit to ~20 for perf) ─────────────────────
	const visibleDates = dates.slice(-60); // show up to 60 most recent

	const selectedClassName = assignedClasses.find(
		(c) => c.classId === selectedClassId,
	)?.name;
	const hasClass = !!selectedClassId && students.length > 0;
	const canExport =
		user &&
		(user.role === 'system_admin' ||
			user.role === 'administrator' ||
			user.role === 'super_admin' ||
			user.role === 'teacher') &&
		hasClass;

	// ── modal state ───────────────────────────────────────────────────────────
	const modalStudents = students;
	const modalExisting = modal
		? Object.fromEntries(
				students.map((s) => [
					s.studentId,
					attendanceMap[s.studentId]?.[modal.date],
				]),
			)
		: {};

	// ── today button ──────────────────────────────────────────────────────────
	const today = todayStr();
	const todayIsWeekend = [0, 6].includes(new Date().getDay());
	const todayRecorded =
		selectedClassId &&
		students.length > 0 &&
		students.every((s) => !!attendanceMap[s.studentId]?.[today]);

	if (!user) {
		return <PageLoading fullScreen={false} message="Checking authorization" />;
	}

	return (
		<div
			className="flex flex-col overflow-hidden"
			style={{ height: 'calc(94vh - var(--app-header-height, 4rem))' }}
		>
			{/* ── notification ── */}
			{notification && (
				<div
					className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium whitespace-nowrap ${
						notification.type === 'error'
							? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/90 text-red-800 dark:text-red-200'
							: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/90 text-green-800 dark:text-green-200'
					}`}
				>
					{notification.type === 'error' ? (
						<AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
					) : (
						<CheckCircle className="w-4 h-4 shrink-0 text-green-500" />
					)}
					{notification.message}
				</div>
			)}

			{/* ── filter bar matching SubmitGrades layout ── */}
			<div className="shrink-0 bg-background/95 px-3 sm:px-4 pt-0 mt-0 pb-2 space-y-2 border-b border-border/50 shadow-sm">
				{/* Mobile toggle */}
				<button
					onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
					className="md:hidden flex items-center justify-between w-full bg-card border border-border rounded-xl p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
				>
					<div className="flex items-center gap-2 text-sm font-medium text-foreground overflow-hidden">
						<span className="truncate">
							{selectedAcademicYear || 'Year'}
							{selectedClassName ? ` • ${selectedClassName}` : ''}
						</span>
					</div>
					<div className="flex items-center gap-2 shrink-0 pl-2">
						<ChevronDown
							className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isFiltersExpanded ? 'rotate-180' : ''}`}
						/>
					</div>
				</button>

				{/* Collapsible Content */}
				<div
					className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out md:grid-rows-[1fr] md:opacity-100 ${
						isFiltersExpanded
							? 'grid-rows-[1fr] opacity-100'
							: 'grid-rows-[0fr] opacity-0'
					}`}
				>
					{/* OVERFLOW VISIBLE: Allows DateRangePicker dropdown to escape the accordion */}
					<div
						className={`flex flex-col gap-2 min-h-0 ${
							isFiltersExpanded
								? 'overflow-visible'
								: 'overflow-hidden md:overflow-visible'
						}`}
					>
						<div className="bg-card border border-border rounded-xl shadow-sm">
							<div className="flex flex-wrap gap-2 p-2.5 sm:p-3 items-end">
								{user.role !== 'student' &&
									availableAcademicYears.length > 0 && (
										<FilterSelect
											label="Year"
											value={selectedAcademicYear}
											onChange={(v: string) => {
												setSelectedAcademicYear(v);
												setSelectedSession('');
												setSelectedClassLevel('');
												setSelectedClassId('');
											}}
											options={availableAcademicYears.map((y) => ({
												label: y,
												value: y,
											}))}
										/>
									)}

								{user.role !== 'student' && sessions.length > 1 && (
									<FilterSelect
										label="Session"
										value={selectedSession}
										onChange={(v: string) => {
											setSelectedSession(v);
											setSelectedClassLevel('');
											setSelectedClassId('');
										}}
										placeholder="Session"
										options={sessions.map((s) => ({ label: s, value: s }))}
									/>
								)}

								{user.role !== 'student' &&
									levels.length > 1 &&
									selectedSession && (
										<FilterSelect
											label="Level"
											value={selectedClassLevel}
											onChange={(v: string) => {
												setSelectedClassLevel(v);
												setSelectedClassId('');
											}}
											placeholder="Level"
											options={levels.map((l) => ({ label: l, value: l }))}
										/>
									)}

								{user.role !== 'student' &&
									classes.length >= 1 &&
									selectedClassLevel && (
										<FilterSelect
											label="Class"
											value={selectedClassId}
											onChange={setSelectedClassId}
											placeholder="Class"
											options={classes.map((c) => ({
												label: c.name,
												value: c.classId,
											}))}
											disabled={classes.length === 1}
										/>
									)}

								{/* Date range picker */}
								<DateRangePicker value={dateRange} onChange={setDateRange} />

								{isLoading && (
									<div className="flex items-end pb-1 ml-2">
										<Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
									</div>
								)}
							</div>
						</div>

						{/* Action chip strip (mirrors SubmitGrade's periods selection layout) */}
						{hasClass && (
							<div className="bg-card border border-border rounded-xl px-3 py-2.5 sm:px-4">
								<div className="flex items-center gap-2 flex-wrap">
									<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap mr-1">
										Actions
									</span>

									{canTakeAttendance(today) && (
										<button
											onClick={() => {
												if (todayIsWeekend) {
													showNotification(
														"Attendance can't be recorded on weekends.",
													);
													return;
												}
												setModal({ date: today });
											}}
											className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-all duration-150 ${
												todayIsWeekend
													? 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-60'
													: todayRecorded
														? 'bg-muted text-muted-foreground border-border opacity-60'
														: 'bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90'
											}`}
										>
											{todayIsWeekend ? (
												<>
													<Pencil className="w-3 h-3 flex-shrink-0" />
													Take attendance
												</>
											) : todayRecorded ? (
												<>
													<CheckCircle className="w-3 h-3 flex-shrink-0 text-green-500 dark:text-green-400" />
													Today recorded
												</>
											) : (
												<>
													<Pencil className="w-3 h-3 flex-shrink-0" />
													Take attendance
												</>
											)}
										</button>
									)}

									{canExport && (
										<button
											onClick={handleExport}
											className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-all duration-150 bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent"
										>
											<Download className="w-3 h-3 flex-shrink-0" />
											Export CSV
										</button>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* ── Bottom: scrollable main content area ── */}
			<div className="flex min-h-0 flex-1 flex-col px-3 sm:px-4 pt-2 pb-1 gap-3">
				{!selectedClassId ? (
					<div className="flex-1 flex items-center justify-center p-6">
						<div className="bg-card border border-border rounded-xl p-8 text-center max-w-sm shadow-sm">
							<div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
								<Users className="w-7 h-7 text-muted-foreground" />
							</div>
							<h3 className="font-semibold text-foreground mb-1 text-base">
								Select a class
							</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">
								Choose a class from the filters above to view its attendance
								records.
							</p>
						</div>
					</div>
				) : students.length === 0 && !isLoading ? (
					<div className="flex-1 flex items-center justify-center p-6">
						<div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
							<h3 className="font-semibold text-foreground mb-1">
								No Students Found
							</h3>
							<p className="text-sm text-muted-foreground">
								No students enrolled in this class.
							</p>
						</div>
					</div>
				) : (
					<>
						{/* ── Grading table layout applied to Attendance ── */}
						<div
							ref={tableScrollContainerRef}
							className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card shadow-sm"
						>
							<table className="min-w-max w-full border-collapse">
								<thead className="bg-muted">
									<tr>
										<th className="sticky top-0 left-0 z-30 bg-muted border-b border-r border-border px-3 sm:px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[140px] sm:min-w-[200px]">
											Student
										</th>
										{visibleDates.map((d) => {
											const hasData = students.some(
												(s) => attendanceMap[s.studentId]?.[d],
											);
											const canEdit =
												canEditAttendance(d) || canTakeAttendance(d);
											return (
												<th
													key={d}
													className="sticky top-0 z-20 bg-muted border-b border-r border-border px-1.5 py-2 text-center text-[10px] font-semibold text-muted-foreground whitespace-nowrap min-w-[44px] group"
												>
													<div className="flex flex-col items-center gap-0.5">
														<span>{displayDate(d).split(' ')[0]}</span>
														<span className="font-bold text-foreground/70">
															{displayDate(d).split(' ')[1]}
														</span>
														{canEdit && (
															<button
																onClick={() => setModal({ date: d })}
																className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 p-0.5 rounded hover:bg-accent"
																title={
																	hasData
																		? 'Edit attendance'
																		: 'Take attendance'
																}
															>
																<Pencil className="w-2.5 h-2.5 text-muted-foreground" />
															</button>
														)}
													</div>
												</th>
											);
										})}
										{/* Summary columns */}
										<th className="sticky top-0 z-20 bg-muted border-b border-r border-border px-3 sm:px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[56px]">
											Present
										</th>
										<th className="sticky top-0 z-20 bg-muted border-b border-r border-border px-3 sm:px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[56px]">
											Absent
										</th>
										<th className="sticky top-0 z-20 bg-muted border-b border-r border-border px-3 sm:px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[56px]">
											Total
										</th>
										<th className="sticky top-0 z-20 bg-muted border-b border-border px-3 sm:px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[60px]">
											Rate
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{studentStats
										.slice()
										.sort((a, b) => a.studentName.localeCompare(b.studentName))
										.map((student) => {
											const rateColor =
												student.rate === null
													? 'text-muted-foreground'
													: student.rate >= 85
														? 'text-[var(--text-success,#166534)] font-bold'
														: student.rate >= 70
															? 'text-yellow-600 dark:text-yellow-400 font-semibold'
															: 'text-[var(--text-danger,#991b1b)] font-bold';

											return (
												<tr
													key={student.studentId}
													className="hover:bg-muted/30 transition-colors"
												>
													<td className="sticky left-0 z-10 border-r border-border px-3 sm:px-4 py-2.5 whitespace-nowrap bg-card transition-colors">
														<span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[200px] block text-foreground">
															{student.studentName}
														</span>
													</td>
													{visibleDates.map((d) => {
														const rec = attendanceMap[student.studentId]?.[d];
														return (
															<td
																key={d}
																className="border-r border-border px-1.5 py-2 text-center"
															>
																<div className="flex justify-center">
																	<StatusChip status={rec?.status} compact />
																</div>
															</td>
														);
													})}
													<td className="border-r border-border px-3 sm:px-4 py-2 text-center">
														<span className="text-sm font-semibold text-[var(--text-success,#166534)] tabular-nums">
															{student.present}
														</span>
													</td>
													<td className="border-r border-border px-3 sm:px-4 py-2 text-center">
														<span className="text-sm font-semibold text-[var(--text-danger,#991b1b)] tabular-nums">
															{student.absent}
														</span>
													</td>
													<td className="border-r border-border px-3 sm:px-4 py-2 text-center">
														<span className="text-sm text-muted-foreground tabular-nums">
															{student.total}
														</span>
													</td>
													<td className="border-border px-3 sm:px-4 py-2 text-center">
														<span
															className={`text-sm tabular-nums ${rateColor}`}
														>
															{student.rate !== null ? `${student.rate}%` : '–'}
														</span>
													</td>
												</tr>
											);
										})}
								</tbody>
							</table>
						</div>

						{/* Date count footer */}
						<p className="text-[10px] text-muted-foreground shrink-0 text-center pb-2 pt-1 font-medium tracking-wide">
							Showing {visibleDates.length} school day
							{visibleDates.length !== 1 ? 's' : ''} · {students.length}{' '}
							students · Weekends excluded
						</p>
					</>
				)}
			</div>

			{/* ── Attendance modal ── */}
			{modal && (
				<AttendanceModal
					date={modal.date}
					students={modalStudents}
					existing={modalExisting}
					onSave={handleSave}
					onClose={() => setModal(null)}
					isSubmitting={isSubmitting}
				/>
			)}
		</div>
	);
};;

export default Attendance;
