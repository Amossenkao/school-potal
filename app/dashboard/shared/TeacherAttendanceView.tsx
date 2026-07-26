'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, Users } from 'lucide-react';
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
// StatusChip
// ---------------------------------------------------------------------------

function StatusChip({ status }: { status: 'present' | 'late' | 'absent' | null }) {
	if (status === null) {
		return (
			<span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-xs text-muted-foreground font-medium">
				—
			</span>
		);
	}
	if (status === 'present') {
		return (
			<span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--bg-success,#dcfce7)] text-xs font-bold text-[var(--text-success,#166534)]">
				P
			</span>
		);
	}
	if (status === 'late') {
		return (
			<span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-xs font-bold text-amber-700 dark:text-amber-400">
				L
			</span>
		);
	}
	return (
		<span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--bg-danger,#fee2e2)] text-xs font-bold text-[var(--text-danger,#991b1b)]">
			A
		</span>
	);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const TeacherAttendanceView = () => {
	const user = useAuth((state) => state.user) as any;
	const teacherAttendanceByAcademicYear = useSchoolStore(
		(state) => state.teacherAttendanceByAcademicYear,
	);

	const [selectedYear, setSelectedYear] = useState('');
	const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
		const now = new Date();
		const first = new Date(now.getFullYear(), now.getMonth(), 1);
		const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		return { from: fmtDate(first), to: fmtDate(last) };
	});
	const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

	// ── Academic years ──────────────────────────────────────────────────
	const availableAcademicYears = useMemo(() => {
		if (!user) return [];
		if (user.role === 'teacher') {
			const years = new Set<string>();
			user.subjects?.forEach((s: any) => {
				if (s.year) years.add(s.year);
			});
			return Array.from(years).sort().reverse();
		}
		return [];
	}, [user]);

	useEffect(() => {
		if (!selectedYear && availableAcademicYears.length > 0) {
			setSelectedYear(availableAcademicYears[0]);
		}
	}, [availableAcademicYears, selectedYear]);

	// ── Attendance from store (all recorded days, filtered by range) ───
	const { recordedDays, attendanceMap } = useMemo(() => {
		if (!selectedYear || !user || user.role !== 'teacher') {
			return { recordedDays: [], attendanceMap: {} };
		}

		const allRecords =
			teacherAttendanceByAcademicYear[selectedYear] || [];

		const rangeFrom = parseDate(dateRange.from);
		const rangeTo = parseDate(dateRange.to);
		rangeTo.setHours(23, 59, 59, 999);

		const attMap: Record<string, 'present' | 'late' | 'absent'> = {};
		const daySet = new Set<string>();

		allRecords.forEach((rec: any) => {
			const d = fmtDate(new Date(rec.date));
			const parsed = parseDate(d);
			if (parsed >= rangeFrom && parsed <= rangeTo) {
				attMap[d] = rec.status;
				daySet.add(d);
			}
		});

		const days = Array.from(daySet).sort();
		return { recordedDays: days, attendanceMap: attMap };
	}, [selectedYear, dateRange.from, dateRange.to, user, teacherAttendanceByAcademicYear]);

	// ── Stats ───────────────────────────────────────────────────────────
	const stats = useMemo(() => {
		const total = recordedDays.length;
		const present = recordedDays.filter((d) => attendanceMap[d] === 'present').length;
		const late = recordedDays.filter((d) => attendanceMap[d] === 'late').length;
		const absent = recordedDays.filter((d) => attendanceMap[d] === 'absent').length;
		const recorded = present + late + absent;
		const attended = present + late;
		const rate = recorded > 0 ? Math.round((attended / recorded) * 100) : null;
		return { total, present, late, absent, rate };
	}, [recordedDays, attendanceMap]);

	// ── Render ──────────────────────────────────────────────────────────
	if (!user || user.role !== 'teacher') {
		return <PageLoading fullScreen={false} message="Unauthorized" />;
	}

	return (
		<div
			className="flex flex-col overflow-hidden"
			style={{ height: 'calc(94vh - var(--app-header-height, 4rem))' }}
		>
			{/* Filter Bar */}
			<div className="shrink-0 bg-background/95 px-3 sm:px-4 pt-0 mt-0 pb-2 space-y-2 border-b border-border/50 shadow-sm">
				{/* Mobile toggle */}
				<button
					onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
					className="md:hidden flex items-center justify-between w-full bg-card border border-border rounded-xl p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors mt-2"
				>
					<div className="flex items-center gap-2 text-sm font-medium text-foreground overflow-hidden">
						<span className="truncate">{selectedYear}</span>
					</div>
					<ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isFiltersExpanded ? 'rotate-180' : ''}`} />
				</button>

				<div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out md:grid-rows-[1fr] md:opacity-100 ${
					isFiltersExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
				}`}>
					<div className={`flex flex-col gap-2 min-h-0 ${isFiltersExpanded ? 'overflow-visible' : 'overflow-hidden md:overflow-visible'}`}>
						{/* Filter card */}
						<div className="bg-card border border-border rounded-xl shadow-sm">
							<div className="flex flex-wrap gap-2 p-2.5 sm:p-3 items-end">
								{availableAcademicYears.length > 1 && (
									<FilterSelect
										label="Academic Year"
										value={selectedYear}
										onChange={setSelectedYear}
										options={availableAcademicYears.map((y) => ({ label: y, value: y }))}
										disabled={availableAcademicYears.length === 0}
									/>
								)}

								<DateRangePicker
									value={dateRange}
									onChange={(v) =>
										setDateRange(
											v ?? {
												from: fmtDate(new Date()),
												to: fmtDate(new Date()),
											},
										)
									}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Scrollable Content */}
			<div className="flex min-h-0 flex-1 flex-col px-3 sm:px-4 pt-2 pb-1 gap-3">
				{recordedDays.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<Users className="w-12 h-12 text-muted-foreground/40 mb-3" />
						<p className="text-sm text-muted-foreground">
							No attendance recorded in the selected range
						</p>
						<p className="text-xs text-muted-foreground/60 mt-1">
							Try selecting a different date range
						</p>
					</div>
				) : (
					<>
						{/* Stats cards */}
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
							<div className="rounded-xl border border-border bg-card p-3 shadow-sm">
								<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Days Recorded</p>
								<p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{stats.total}</p>
							</div>
							<div className="rounded-xl border border-[var(--text-success,#166534)]/20 bg-[var(--bg-success,#dcfce7)] p-3 shadow-sm">
								<p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-success,#166534)]/80">Present</p>
								<p className="text-2xl font-bold text-[var(--text-success,#166534)] mt-1 tabular-nums">{stats.present}</p>
							</div>
							<div className="rounded-xl border border-amber-400/20 bg-amber-50 dark:bg-amber-950/30 p-3 shadow-sm">
								<p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700/80 dark:text-amber-400/80">Late</p>
								<p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1 tabular-nums">{stats.late}</p>
							</div>
							<div className="rounded-xl border border-[var(--text-danger,#991b1b)]/20 bg-[var(--bg-danger,#fee2e2)] p-3 shadow-sm">
								<p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-danger,#991b1b)]/80">Absent</p>
								<p className="text-2xl font-bold text-[var(--text-danger,#991b1b)] mt-1 tabular-nums">{stats.absent}</p>
							</div>
						</div>
						{stats.rate !== null && (
							<div className={`shrink-0 text-center text-sm font-bold tabular-nums py-1.5 rounded-lg ${
								stats.rate >= 85
									? 'bg-[var(--bg-success,#dcfce7)] text-[var(--text-success,#166534)] border border-[var(--text-success,#166534)]/20'
									: stats.rate >= 70
										? 'bg-amber-50 dark:bg-amber-950/30 text-yellow-700 dark:text-yellow-400 border border-yellow-400/20'
										: 'bg-[var(--bg-danger,#fee2e2)] text-[var(--text-danger,#991b1b)] border border-[var(--text-danger,#991b1b)]/20'
							}`}>
								Attendance Rate: {stats.rate}%
							</div>
						)}

						{/* Grid */}
						<div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card shadow-sm">
							<table className="min-w-max w-full border-collapse">
								<thead className="bg-muted">
									<tr>
										<th className="sticky top-0 left-0 z-30 bg-muted border-b border-r border-border px-3 sm:px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[80px]">
											You
										</th>
										{recordedDays.map((day) => {
											const d = parseDate(day);
											const dayNum = d.getDate();
											const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
											const monthName = d.toLocaleDateString('en-US', { month: 'short' });
											return (
												<th key={day} className="sticky top-0 z-20 bg-muted border-b border-r border-border px-1.5 py-2 text-center text-[10px] font-semibold text-muted-foreground whitespace-nowrap min-w-[44px]">
													<div className="flex flex-col items-center gap-0.5">
														<span>{dayName}</span>
														<span className="font-bold text-foreground/70">{dayNum}</span>
														<span className="text-[8px] font-normal">{monthName}</span>
													</div>
												</th>
											);
										})}
									</tr>
								</thead>
								<tbody>
									<tr>
										<td className="sticky left-0 z-10 border-r border-border bg-card px-3 sm:px-4 py-2.5 whitespace-nowrap transition-colors">
											<span className="text-sm font-medium text-foreground">
												{user.fullName || `${user.firstName} ${user.lastName}`}
											</span>
										</td>
										{recordedDays.map((day) => (
											<td key={day} className="border-r border-border px-1.5 py-2 text-center">
												<div className="flex justify-center">
													<StatusChip status={attendanceMap[day] || null} />
												</div>
											</td>
										))}
									</tr>
								</tbody>
							</table>
						</div>

						{/* Footer info */}
						<p className="text-[10px] text-muted-foreground shrink-0 text-center pb-2 pt-1 font-medium tracking-wide">
							Showing {stats.total} recorded day{stats.total !== 1 ? 's' : ''}
						</p>
					</>
				)}
			</div>
		</div>
	);
};

export default TeacherAttendanceView;
