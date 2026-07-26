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
	CalendarDays,
	Save,
	Loader2,
	Check,
	X,
	Clock,
	MinusCircle,
	Users,
	BarChart3,
	ClipboardCheck,
} from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';
import { DateRangePicker } from '@/components/ui/DateRangePicker';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function todayStr() {
	return fmtDate(new Date());
}

function toUTCDate(value: Date | string): Date {
	const d = new Date(value);
	return new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
	);
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

function monthStart(year: number, month: number) {
	return new Date(year, month, 1);
}

function monthEnd(year: number, month: number) {
	return new Date(year, month + 1, 0);
}

function getSchoolDatesInRange(from: string, to: string): string[] {
	const dates: string[] = [];
	const cur = parseDate(from);
	const endDate = parseDate(to);
	while (cur <= endDate) {
		const dow = cur.getDay();
		if (dow !== 0 && dow !== 6) dates.push(fmtDate(cur));
		cur.setDate(cur.getDate() + 1);
	}
	return dates;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * `not_due`   — no attendance recorded yet (default)
 * `present`   — teacher was present
 * `late`      — teacher arrived late
 * `absent`    — teacher was absent
 */
export type TeacherAttendanceStatus =
	| 'not_due'
	| 'present'
	| 'late'
	| 'absent';

interface TeacherRow {
	teacherId: string;
	name: string;
	status: TeacherAttendanceStatus;
}

// ---------------------------------------------------------------------------
// FilterSelect
// ---------------------------------------------------------------------------

function FilterSelect({
	label,
	value,
	onChange,
	options,
	disabled,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: { label: string; value: string }[];
	disabled?: boolean;
}) {
	return (
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
					{options.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
				<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Mini Calendar (single date picker)
// ---------------------------------------------------------------------------

function MiniCalendar({
	value,
	onChange,
	onClose,
}: {
	value: string | null;
	onChange: (d: string) => void;
	onClose: () => void;
}) {
	const today = new Date();
	const [viewYear, setViewYear] = useState(() =>
		value ? parseDate(value).getFullYear() : today.getFullYear(),
	);
	const [viewMonth, setViewMonth] = useState(() =>
		value ? parseDate(value).getMonth() : today.getMonth(),
	);

	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handle(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) onClose();
		}
		document.addEventListener('mousedown', handle);
		return () => document.removeEventListener('mousedown', handle);
	}, [onClose]);

	const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
	});

	const days: (string | null)[] = [];
	const start = monthStart(viewYear, viewMonth);
	const end = monthEnd(viewYear, viewMonth);
	for (let i = 0; i < start.getDay(); i++) days.push(null);
	for (let d = start.getDate(); d <= end.getDate(); d++) {
		const dt = new Date(viewYear, viewMonth, d);
		const dow = dt.getDay();
		if (dow !== 0 && dow !== 6) days.push(fmtDate(dt));
		else days.push(null);
	}

	return (
		<div
			ref={ref}
			className="absolute top-full left-0 mt-1 z-[70] bg-card border border-border rounded-xl shadow-xl p-3 w-[280px]"
		>
			<div className="flex items-center justify-between mb-3 px-1">
				<button
					onClick={() => {
						if (viewMonth === 0) {
							setViewMonth(11);
							setViewYear(viewYear - 1);
						} else setViewMonth(viewMonth - 1);
					}}
					className="p-1 rounded hover:bg-accent transition-colors"
				>
					<ChevronLeft className="w-4 h-4" />
				</button>
				<span className="text-sm font-semibold text-foreground">
					{monthLabel}
				</span>
				<button
					onClick={() => {
						if (viewMonth === 11) {
							setViewMonth(0);
							setViewYear(viewYear + 1);
						} else setViewMonth(viewMonth + 1);
					}}
					className="p-1 rounded hover:bg-accent transition-colors"
				>
					<ChevronRight className="w-4 h-4" />
				</button>
			</div>
			<div className="grid grid-cols-7 gap-0.5">
				{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
					<div
						key={d}
						className="text-[10px] text-muted-foreground text-center py-0.5 font-medium"
					>
						{d}
					</div>
				))}
				{days.map((dateStr, i) => {
					if (!dateStr) return <div key={`empty-${i}`} />;
					const isSelected = dateStr === value;
					const isToday = dateStr === todayStr();
					return (
						<button
							key={dateStr}
							onClick={() => {
								onChange(dateStr);
								onClose();
							}}
							className={`h-7 w-full text-xs rounded-md transition-all duration-100 font-medium
								${isSelected ? 'bg-primary text-primary-foreground rounded-md shadow-sm z-10' : 'hover:bg-accent text-foreground'}
								${isToday && !isSelected ? 'ring-1 ring-primary/50 ring-inset' : ''}
							`}
						>
							{parseInt(dateStr.split('-')[2])}
						</button>
					);
				})}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Status badge (read-only display chip)
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
	TeacherAttendanceStatus,
	{
		label: string;
		icon: React.ReactNode;
		bg: string;
		text: string;
		border: string;
	}
> = {
	not_due: {
		label: 'Not Due',
		icon: <MinusCircle className="w-3 h-3" />,
		bg: 'bg-muted',
		text: 'text-muted-foreground',
		border: 'border-border',
	},
	present: {
		label: 'Present',
		icon: <Check className="w-3 h-3" />,
		bg: 'bg-[var(--bg-success,#dcfce7)]',
		text: 'text-[var(--text-success,#166534)]',
		border: 'border-[var(--text-success,#166534)]/40',
	},
	late: {
		label: 'Late',
		icon: <Clock className="w-3 h-3" />,
		bg: 'bg-amber-50 dark:bg-amber-950/30',
		text: 'text-amber-700 dark:text-amber-400',
		border: 'border-amber-400/40',
	},
	absent: {
		label: 'Absent',
		icon: <X className="w-3 h-3" />,
		bg: 'bg-[var(--bg-danger,#fee2e2)]',
		text: 'text-[var(--text-danger,#991b1b)]',
		border: 'border-[var(--text-danger,#991b1b)]/40',
	},
};

// ---------------------------------------------------------------------------
// StatusToggle — the Not Due / P / L / A button group
// ---------------------------------------------------------------------------

function StatusToggle({
	status,
	onChange,
	disabled,
}: {
	status: TeacherAttendanceStatus;
	onChange: (s: TeacherAttendanceStatus) => void;
	disabled?: boolean;
}) {
	const options: Array<{
		value: TeacherAttendanceStatus;
		label: string;
		icon: React.ReactNode;
	}> = [
		{ value: 'not_due', label: 'Not Due', icon: <MinusCircle className="w-3 h-3" /> },
		{ value: 'present', label: 'P', icon: <Check className="w-3 h-3" /> },
		{ value: 'late', label: 'L', icon: <Clock className="w-3 h-3" /> },
		{ value: 'absent', label: 'A', icon: <X className="w-3 h-3" /> },
	];

	return (
		<div className="flex items-center justify-center gap-1.5">
			{options.map((opt) => {
				const isActive = status === opt.value;
				const cfg = STATUS_CONFIG[opt.value];
				return (
					<button
						key={opt.value}
						onClick={() => onChange(opt.value)}
						disabled={disabled}
						className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 border ${
							isActive
								? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm`
								: 'bg-background text-muted-foreground border-border hover:border-ring/40 hover:text-foreground'
						} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
					>
						{opt.icon}
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const TeacherAttendanceAdmin = () => {
	const user = useAuth((state) => state.user) as any;
	const school = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const teacherAttendanceByAcademicYear = useSchoolStore(
		(state) => state.teacherAttendanceByAcademicYear,
	);

	const [selectedYear, setSelectedYear] = useState('');
	const [selectedDate, setSelectedDate] = useState(todayStr());
	const [showCalendar, setShowCalendar] = useState(false);
	const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
	const [rows, setRows] = useState<TeacherRow[]>([]);
	const [originalRows, setOriginalRows] = useState<TeacherRow[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [notification, setNotification] = useState<{
		type: 'success' | 'error';
		message: string;
	} | null>(null);
	const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
	const [activeTab, setActiveTab] = useState<'record' | 'summary'>('record');

	// ── Summary state ──────────────────────────────────────────────────
	const [summaryRange, setSummaryRange] = useState<{ from: string; to: string }>(() => {
		const today = new Date();
		const dow = today.getDay();
		const anchor = new Date(today);
		if (dow === 0) anchor.setDate(today.getDate() - 2);
		if (dow === 6) anchor.setDate(today.getDate() - 1);
		const mon = new Date(anchor);
		mon.setDate(anchor.getDate() - (anchor.getDay() - 1));
		return { from: fmtDate(mon), to: fmtDate(anchor) };
	});

	// ── Summary data from store (local filtering, no API fetch) ──────
	const summaryData = useMemo(() => {
		if (!selectedYear) return [];

		const teachers =
			usersByAcademicYear[selectedYear]?.teachers || [];
		if (teachers.length === 0) return [];

		const allRecords =
			teacherAttendanceByAcademicYear[selectedYear] || [];

		// Build a map: teacherId -> date -> status
		const attMap: Record<string, Record<string, 'present' | 'late' | 'absent'>> = {};
		allRecords.forEach((rec: any) => {
			const teacherId = rec.teacherId;
			const d = fmtDate(new Date(rec.date));
			if (!attMap[teacherId]) attMap[teacherId] = {};
			attMap[teacherId][d] = rec.status;
		});

		const schoolDays = getSchoolDatesInRange(summaryRange.from, summaryRange.to);
		return teachers.map((t: any) => {
			const teacherId: string = t.id || t._id;
			const name: string = t.fullName || `${t.firstName} ${t.lastName}`;
			const dayMap = attMap[teacherId] || {};
			let present = 0,
				late = 0,
				absent = 0;
			schoolDays.forEach((d) => {
				const status = dayMap[d];
				if (status === 'present') present++;
				else if (status === 'late') late++;
				else if (status === 'absent') absent++;
			});
			const total = present + late + absent;
			const rate =
				total > 0 ? Math.round(((present + late) / total) * 100) : null;
			return { teacherId, name, present, late, absent, total, rate };
		});
	}, [
		selectedYear,
		summaryRange.from,
		summaryRange.to,
		usersByAcademicYear,
		teacherAttendanceByAcademicYear,
	]);

	// ── Academic years ──────────────────────────────────────────────────
	const availableAcademicYears = useMemo(() => {
		if (!user) return [];
		if (user.role === 'system_admin' || user.role === 'administrator') {
			const firstYear = school?.identity?.firstAcademicYear;
			const currentYear = school?.identity?.currentAcademicYear;
			if (!firstYear || !currentYear)
				return [currentYear].filter(Boolean) as string[];
			const sep = firstYear.includes('/') ? '/' : '-';
			const startNum = parseInt(firstYear.split(sep)[0], 10);
			const endNum = parseInt(currentYear.split(sep)[0], 10);
			if (Number.isNaN(startNum) || Number.isNaN(endNum)) return [currentYear];
			const years: string[] = [];
			for (let y = startNum; y <= endNum; y++) years.push(`${y}${sep}${y + 1}`);
			return years.reverse();
		}
		return [];
	}, [user, school]);

	useEffect(() => {
		if (!selectedYear && availableAcademicYears.length > 0) {
			const first = availableAcademicYears[0];
			if (first) setSelectedYear(first);
		}
	}, [availableAcademicYears, selectedYear]);

	// ── Fetch ALL teachers + existing attendance ────────────────────────
	useEffect(() => {
		if (!selectedYear || !selectedDate) return;
		let cancelled = false;

		async function load() {
			setIsLoadingTeachers(true);

			// 1. Get all teachers for the year
			let teachers: any[] = [];
			if (usersByAcademicYear[selectedYear]?.teachers?.length) {
				teachers = usersByAcademicYear[selectedYear].teachers;
			} else {
				try {
					const res = await fetch(
						`/api/users?role=teacher&academicYear=${selectedYear}`,
					);
					if (res.ok) {
						const data = await res.json();
						teachers = data.data || [];
					}
				} catch {
					/* ignore */
				}
			}

			// 2. Get existing attendance records for this date from the store
			const allRecords =
				teacherAttendanceByAcademicYear[selectedYear] || [];
			const selectedDateStart = toUTCDate(selectedDate);
			const selectedDateEnd = new Date(
				selectedDateStart.getTime() + 24 * 60 * 60 * 1000,
			);
			const attendanceMap: Record<string, 'present' | 'late' | 'absent'> = {};
			allRecords.forEach((rec: any) => {
				const recDate = new Date(rec.date);
				if (recDate >= selectedDateStart && recDate < selectedDateEnd) {
					attendanceMap[rec.teacherId] = rec.status;
				}
			});

			if (cancelled) return;

			// 3. Build a row for EVERY teacher.
			//    Default status is 'not_due'; existing records override.
			const teacherRows: TeacherRow[] = teachers
				.map((t: any) => {
					const teacherId: string = t.id || t._id;
					const status: TeacherAttendanceStatus =
						attendanceMap[teacherId] ?? 'not_due';

					return {
						teacherId,
						name: t.fullName || `${t.firstName} ${t.lastName}`,
						status,
					};
				})
				.sort((a, b) => {
					// Sort: recorded first (P/L/A), then not_due, alphabetically within each group
					const order: Record<TeacherAttendanceStatus, number> = {
						present: 0,
						late: 1,
						absent: 2,
						not_due: 3,
					};
					const diff = order[a.status] - order[b.status];
					if (diff !== 0) return diff;
					return a.name.localeCompare(b.name);
				});

			setRows(teacherRows);
			setOriginalRows(teacherRows.map((r) => ({ ...r })));
			setIsLoadingTeachers(false);
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [selectedYear, selectedDate, usersByAcademicYear, teacherAttendanceByAcademicYear]);

	// ── Stats ──────────────────────────────────────────────────────────
	const stats = useMemo(() => {
		const total = rows.length;
		const present = rows.filter((r) => r.status === 'present').length;
		const late = rows.filter((r) => r.status === 'late').length;
		const absent = rows.filter((r) => r.status === 'absent').length;
		const notDue = rows.filter((r) => r.status === 'not_due').length;
		const recorded = present + late + absent;
		const attended = present + late;
		const rate = recorded > 0 ? Math.round((attended / recorded) * 100) : null;
		return { total, present, late, absent, notDue, rate };
	}, [rows]);

	const hasChanges = useMemo(() => {
		if (rows.length !== originalRows.length) return true;
		return rows.some((r, i) => r.status !== originalRows[i]?.status);
	}, [rows, originalRows]);

	const isWeekend = useMemo(() => {
		if (!selectedDate) return false;
		const dow = parseDate(selectedDate).getDay();
		return dow === 0 || dow === 6;
	}, [selectedDate]);

	const canRecordAttendance = useMemo(() => {
		if (isWeekend) return false;
		if (!user) return false;
		if (user.role === 'system_admin') return true;
		if (user.role === 'administrator') {
			return (user as any).canRecordTeacherAttendance === true;
		}
		return false;
	}, [user, isWeekend]);

	const summaryStats = useMemo(() => {
		const total = summaryData.length;
		const present = summaryData.reduce((s, r) => s + r.present, 0);
		const late = summaryData.reduce((s, r) => s + r.late, 0);
		const absent = summaryData.reduce((s, r) => s + r.absent, 0);
		const recorded = present + late + absent;
		const attended = present + late;
		const rate = recorded > 0 ? Math.round((attended / recorded) * 100) : null;
		return { total, present, late, absent, rate };
	}, [summaryData]);

	// ── Handlers ────────────────────────────────────────────────────────
	const handleStatusChange = useCallback(
		(teacherId: string, status: TeacherAttendanceStatus) => {
			setRows((prev) =>
				prev.map((r) => (r.teacherId === teacherId ? { ...r, status } : r)),
			);
		},
		[],
	);

	const handleAllPresent = useCallback(() => {
		setRows((prev) => prev.map((r) => ({ ...r, status: 'present' })));
	}, []);

	const handleAllAbsent = useCallback(() => {
		setRows((prev) => prev.map((r) => ({ ...r, status: 'absent' })));
	}, []);

	const handleAllNotDue = useCallback(() => {
		setRows((prev) => prev.map((r) => ({ ...r, status: 'not_due' })));
	}, []);

	const handleSave = useCallback(async () => {
		if (!selectedYear || !selectedDate) return;

		// Reject weekends on the client side as well
		const dow = parseDate(selectedDate).getDay();
		if (dow === 0 || dow === 6) {
			setNotification({
				type: 'error',
				message: 'Attendance cannot be recorded on weekends.',
			});
			return;
		}

		setIsSaving(true);
		setNotification(null);

		// Only save records for teachers with an actual recorded status (not 'not_due')
		const records = rows
			.filter((r) => r.status !== 'not_due')
			.map((r) => ({
				teacherId: r.teacherId,
				status: r.status as 'present' | 'late' | 'absent',
			}));

		try {
			const res = await fetch('/api/teacher-attendance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					academicYear: selectedYear,
					date: selectedDate,
					records,
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to save');
			}

			// Merge saved records into the store so other tabs/components see the update
			const mergedRecords = records.map((r) => ({
				academicYear: selectedYear,
				teacherId: r.teacherId,
				date: selectedDate,
				status: r.status,
				recordedBy: user?.id,
			}));
			useSchoolStore
				.getState()
				.mergeTeacherAttendanceForYear(selectedYear, mergedRecords);

			setOriginalRows(rows.map((r) => ({ ...r })));
			setNotification({
				type: 'success',
				message: 'Attendance saved successfully.',
			});
		} catch (err: any) {
			setNotification({
				type: 'error',
				message: err.message || 'Failed to save attendance.',
			});
		} finally {
			setIsSaving(false);
		}
	}, [rows, selectedYear, selectedDate, user]);

	// ── Render ──────────────────────────────────────────────────────────
	if (!user || (user.role !== 'system_admin' && user.role !== 'administrator')) {
		return <PageLoading fullScreen={false} message="Unauthorized" />;
	}

	const dateLabel = displayDateFull(selectedDate);
	const isToday = selectedDate === todayStr();

	return (
		<div
			className="flex flex-col overflow-hidden"
			style={{ height: 'calc(94vh - var(--app-header-height, 4rem))' }}
		>
			{/* Notification */}
			{notification && (
				<div
					className={`mx-3 sm:mx-4 mt-2 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 ${
						notification.type === 'success'
							? 'bg-[var(--bg-success,#dcfce7)] text-[var(--text-success,#166534)] border border-[var(--text-success,#166534)]/20'
							: 'bg-[var(--bg-danger,#fee2e2)] text-[var(--text-danger,#991b1b)] border border-[var(--text-danger,#991b1b)]/20'
					}`}
				>
					{notification.message}
					<button
						onClick={() => setNotification(null)}
						className="ml-auto opacity-60 hover:opacity-100"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>
			)}

			{/* Tabs */}
			<div className="shrink-0 flex gap-1 px-3 sm:px-4 pt-2">
				<button
					onClick={() => setActiveTab('record')}
					className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
						activeTab === 'record'
							? 'bg-primary text-primary-foreground'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					}`}
				>
					<ClipboardCheck className="w-3.5 h-3.5" />
					Record
				</button>
				<button
					onClick={() => setActiveTab('summary')}
					className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
						activeTab === 'summary'
							? 'bg-primary text-primary-foreground'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					}`}
				>
					<BarChart3 className="w-3.5 h-3.5" />
					Summary
				</button>
			</div>

			{/* ═══ Record Tab ═══ */}
			{activeTab === 'record' && (
				<>
					{/* Filter Bar */}
					<div className="shrink-0 bg-background/95 px-3 sm:px-4 pt-0 mt-0 pb-2 space-y-2 border-b border-border/50 shadow-sm">
				{/* Mobile toggle */}
				<button
					onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
					className="md:hidden flex items-center justify-between w-full bg-card border border-border rounded-xl p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors mt-2"
				>
					<div className="flex items-center gap-2 text-sm font-medium text-foreground overflow-hidden">
						<span className="truncate">
							{selectedYear} · {dateLabel}
						</span>
					</div>
					<ChevronDown
						className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isFiltersExpanded ? 'rotate-180' : ''}`}
					/>
				</button>

				<div
					className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out md:grid-rows-[1fr] md:opacity-100 ${
						isFiltersExpanded
							? 'grid-rows-[1fr] opacity-100'
							: 'grid-rows-[0fr] opacity-0'
					}`}
				>
					<div
						className={`flex flex-col gap-2 min-h-0 ${isFiltersExpanded ? 'overflow-visible' : 'overflow-hidden md:overflow-visible'}`}
					>
						{/* Filter card */}
						<div className="bg-card border border-border rounded-xl shadow-sm">
							<div className="flex flex-wrap gap-2 p-2.5 sm:p-3 items-end">
							{availableAcademicYears.length > 1 && (
								<FilterSelect
									label="Academic Year"
									value={selectedYear}
									onChange={setSelectedYear}
									options={availableAcademicYears.map((y) => ({
										label: y,
										value: y,
									}))}
									disabled={availableAcademicYears.length === 0}
								/>
							)}

							{/* Date picker */}
							<div className="flex flex-col gap-0.5">
								<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
									Date
								</span>
									<div className="relative">
										<button
											onClick={() => setShowCalendar(!showCalendar)}
											className="flex items-center gap-2 h-8 pl-3 pr-2.5 rounded-lg border border-input bg-background text-foreground text-sm hover:border-ring/50 transition-colors whitespace-nowrap"
										>
											<CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
											<span
												className={
													isToday ? 'text-foreground' : 'text-muted-foreground'
												}
											>
												{dateLabel}
											</span>
											<ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
										</button>
										{showCalendar && (
											<MiniCalendar
												value={selectedDate}
												onChange={setSelectedDate}
												onClose={() => setShowCalendar(false)}
											/>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Action chips */}
						<div className="bg-card border border-border rounded-xl px-3 py-2.5 sm:px-4">
							<div className="flex items-center gap-2 flex-wrap">
								<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap mr-1">
									Actions
								</span>
								<button
									onClick={handleAllPresent}
									disabled={rows.length === 0 || !canRecordAttendance}
									className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-all duration-150 bg-[var(--bg-success,#dcfce7)] text-[var(--text-success,#166534)] border-[var(--text-success,#166534)]/20 hover:opacity-80 disabled:opacity-50"
								>
									<Check className="w-3 h-3" /> All present
								</button>
								<button
									onClick={handleAllAbsent}
									disabled={rows.length === 0 || !canRecordAttendance}
									className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-all duration-150 bg-[var(--bg-danger,#fee2e2)] text-[var(--text-danger,#991b1b)] border-[var(--text-danger,#991b1b)]/20 hover:opacity-80 disabled:opacity-50"
								>
									<X className="w-3 h-3" /> All absent
								</button>
								<button
									onClick={handleAllNotDue}
									disabled={rows.length === 0 || !canRecordAttendance}
									className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-all duration-150 bg-muted text-muted-foreground border-border hover:opacity-80 disabled:opacity-50"
								>
									<MinusCircle className="w-3 h-3" /> All not due
								</button>
							</div>
						</div>

						{!canRecordAttendance && rows.length > 0 && (
							<div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300/50 text-amber-700 dark:text-amber-400 rounded-xl px-4 py-2.5 text-sm font-medium">
								{isWeekend
									? 'Attendance cannot be recorded on weekends.'
									: 'You do not have permission to record teacher attendance.'}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Scrollable Content */}
			<div className="flex min-h-0 flex-1 flex-col px-3 sm:px-4 pt-2 pb-1 gap-3">
				{isLoadingTeachers ? (
					<div className="flex min-h-[40vh] items-center justify-center">
						<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
					</div>
				) : rows.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<Users className="w-12 h-12 text-muted-foreground/40 mb-3" />
						<p className="text-sm text-muted-foreground">
							No teachers found for {selectedYear}
						</p>
						<p className="text-xs text-muted-foreground/60 mt-1">
							Check that teachers have been assigned for this academic year
						</p>
					</div>
				) : (
					<>
						{/* Summary bar */}
						<div className="flex items-center gap-4 flex-wrap text-xs font-medium">
							<span className="text-muted-foreground">
								{stats.total} teachers
							</span>
							<span className="text-[var(--text-success,#166534)]">
								{stats.present} present
							</span>
							<span className="text-amber-700 dark:text-amber-400">
								{stats.late} late
							</span>
							<span className="text-[var(--text-danger,#991b1b)]">
								{stats.absent} absent
							</span>
							<span className="text-muted-foreground">
								{stats.notDue} not due
							</span>
							{stats.rate !== null && (
								<span
									className={`tabular-nums ${
										stats.rate >= 85
											? 'text-[var(--text-success,#166534)] font-bold'
											: stats.rate >= 70
												? 'text-yellow-600 dark:text-yellow-400 font-semibold'
												: 'text-[var(--text-danger,#991b1b)] font-bold'
									}`}
								>
									{stats.rate}% attendance
								</span>
							)}
						</div>

						{/* Teacher table */}
						<div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card shadow-sm">
							<table className="w-full border-collapse">
								<thead className="bg-muted">
									<tr>
										<th className="sticky top-0 left-0 z-30 bg-muted border-b border-r border-border px-3 sm:px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[140px] sm:min-w-[200px]">
											Teacher
										</th>
										<th className="sticky top-0 z-20 bg-muted border-b border-border px-3 sm:px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[280px]">
											Status
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{rows.map((row) => (
										<tr
											key={row.teacherId}
											className="hover:bg-muted/30 transition-colors"
										>
											<td className="sticky left-0 z-10 border-r border-border px-3 sm:px-4 py-2.5 whitespace-nowrap bg-card transition-colors">
												<span className="text-sm font-medium text-foreground">
													{row.name}
												</span>
											</td>
											<td className="px-3 sm:px-4 py-2.5">
												<StatusToggle
													status={row.status}
													onChange={(s) =>
														handleStatusChange(row.teacherId, s)
													}
													disabled={!canRecordAttendance}
												/>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Save button */}
						<div className="shrink-0 flex justify-end">
							<button
								onClick={handleSave}
								disabled={isSaving || !hasChanges || !canRecordAttendance}
								className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSaving ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<Save className="w-4 h-4" />
								)}
								{isSaving ? 'Saving...' : 'Save attendance'}
							</button>
						</div>
					</>
				)}
			</div>
				</>
			)}

			{/* ═══ Summary Tab ═══ */}
			{activeTab === 'summary' && (
				<div className="flex min-h-0 flex-1 flex-col px-3 sm:px-4 pt-2 pb-1 gap-3">
					{/* Summary date range picker */}
					<div className="shrink-0 bg-card border border-border rounded-xl shadow-sm p-3">
						<div className="flex flex-wrap gap-2 items-end">
							{availableAcademicYears.length > 1 && (
								<FilterSelect
									label="Academic Year"
									value={selectedYear}
									onChange={setSelectedYear}
									options={availableAcademicYears.map((y) => ({
										label: y,
										value: y,
									}))}
									disabled={availableAcademicYears.length === 0}
								/>
							)}
							<DateRangePicker
								value={summaryRange.from && summaryRange.to ? summaryRange : null}
								onChange={(range) => {
									if (range) {
										setSummaryRange(range);
									} else {
										setSummaryRange({ from: '', to: '' });
									}
								}}
							/>
						</div>
					</div>

				{summaryData.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<Users className="w-12 h-12 text-muted-foreground/40 mb-3" />
							<p className="text-sm text-muted-foreground">
								No teachers found for {selectedYear}
							</p>
						</div>
					) : (
						<>
							{/* Summary stats bar */}
							<div className="flex items-center gap-4 flex-wrap text-xs font-medium">
								<span className="text-muted-foreground">
									{summaryStats.total} teachers
								</span>
								<span className="text-[var(--text-success,#166534)]">
									{summaryStats.present} total present
								</span>
								<span className="text-amber-700 dark:text-amber-400">
									{summaryStats.late} total late
								</span>
								<span className="text-[var(--text-danger,#991b1b)]">
									{summaryStats.absent} total absent
								</span>
								{summaryStats.rate !== null && (
									<span
										className={`tabular-nums ${
											summaryStats.rate >= 85
												? 'text-[var(--text-success,#166534)] font-bold'
												: summaryStats.rate >= 70
													? 'text-yellow-600 dark:text-yellow-400 font-semibold'
													: 'text-[var(--text-danger,#991b1b)] font-bold'
										}`}
									>
										{summaryStats.rate}% overall attendance
									</span>
								)}
							</div>

							{/* Per-teacher stats table */}
							<div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card shadow-sm">
								<table className="w-full border-collapse">
									<thead className="bg-muted">
										<tr>
											<th className="sticky top-0 left-0 z-30 bg-muted border-b border-r border-border px-3 sm:px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[140px] sm:min-w-[200px]">
												Teacher
											</th>
											<th className="sticky top-0 z-20 bg-muted border-b border-r border-border px-3 sm:px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[64px]">
												Present
											</th>
											<th className="sticky top-0 z-20 bg-muted border-b border-r border-border px-3 sm:px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[64px]">
												Late
											</th>
											<th className="sticky top-0 z-20 bg-muted border-b border-r border-border px-3 sm:px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[64px]">
												Absent
											</th>
											<th className="sticky top-0 z-20 bg-muted border-b border-r border-border px-3 sm:px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[64px]">
												Total
											</th>
											<th className="sticky top-0 z-20 bg-muted border-b border-border px-3 sm:px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[80px]">
												Rate
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										{summaryData.map((row) => {
											const rateColor =
												row.rate === null
													? 'text-muted-foreground'
													: row.rate >= 85
														? 'text-[var(--text-success,#166534)] font-bold'
														: row.rate >= 70
															? 'text-yellow-600 dark:text-yellow-400 font-semibold'
															: 'text-[var(--text-danger,#991b1b)] font-bold';
											return (
												<tr
													key={row.teacherId}
													className="hover:bg-muted/30 transition-colors"
												>
													<td className="sticky left-0 z-10 border-r border-border px-3 sm:px-4 py-2.5 whitespace-nowrap bg-card transition-colors">
														<span className="text-sm font-medium text-foreground">
															{row.name}
														</span>
													</td>
													<td className="border-r border-border px-3 sm:px-4 py-2.5 text-center">
														<span className="text-sm font-semibold text-[var(--text-success,#166534)] tabular-nums">
															{row.present}
														</span>
													</td>
													<td className="border-r border-border px-3 sm:px-4 py-2.5 text-center">
														<span className="text-sm font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
															{row.late}
														</span>
													</td>
													<td className="border-r border-border px-3 sm:px-4 py-2.5 text-center">
														<span className="text-sm font-semibold text-[var(--text-danger,#991b1b)] tabular-nums">
															{row.absent}
														</span>
													</td>
													<td className="border-r border-border px-3 sm:px-4 py-2.5 text-center">
														<span className="text-sm text-muted-foreground tabular-nums">
															{row.total}
														</span>
													</td>
													<td className="px-3 sm:px-4 py-2.5 text-center">
														<span className={`text-sm tabular-nums ${rateColor}`}>
															{row.rate !== null ? `${row.rate}%` : '\u2013'}
														</span>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							<p className="text-[10px] text-muted-foreground shrink-0 text-center font-medium tracking-wide">
								{getSchoolDatesInRange(summaryRange.from, summaryRange.to).length} school days · {summaryData.length} teachers
							</p>
						</>
					)}
				</div>
			)}
		</div>
	);
};

export default TeacherAttendanceAdmin;
