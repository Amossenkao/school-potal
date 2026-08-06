'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, Plus, Trash2 } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/DateRangePicker';

/**
 * Authoring surface for a whole test schedule.
 *
 * A test schedule is one titled thing tied to one academic period — "3rd
 * Period Exams" — so the title and the period are entered once at the top
 * rather than repeated on every row.
 *
 * Under it sit **sittings**. A sitting is one date: it names the classes
 * writing that day and lists every paper they write, each with its own time
 * window. That mirrors how a school actually publishes a test schedule — a day
 * at a time, several subjects to a day — rather than forcing one row per
 * subject-date pair.
 *
 * On save each paper is flattened into one row per class, which is what the API
 * stores and what lets a single class be corrected later without disturbing the
 * rest of the schedule.
 */

// Canonical list lives in utils/academicPeriods.ts so exam clearances, report
// cards, and test schedules cannot drift apart. Re-exported here to keep this
// module's existing import surface intact.
import { ACADEMIC_PERIODS, periodLabel } from '@/utils/academicPeriods';

export { ACADEMIC_PERIODS, periodLabel };

export interface TestScheduleRow {
	id: string;
	groupId: string;
	title: string;
	period: string;
	level: string;
	session: string;
	classId: string;
	className: string;
	subject: string;
	date: string;
	startTime: string;
	endTime: string;
	venue: string;
}

/** One paper within a sitting: a subject and the window it runs in. */
interface PaperDraft {
	key: string;
	subject: string;
	startTime: string;
	endTime: string;
	venue: string;
	/** Existing row id per class, so a save updates rather than replaces. */
	idsByClass: Record<string, string>;
}

/** One date, the classes writing on it, and every paper they write. */
interface SittingDraft {
	key: string;
	date: string;
	classIds: string[];
	papers: PaperDraft[];
}

const newKey = () => Math.random().toString(36).slice(2);

const newPaper = (): PaperDraft => ({
	key: newKey(),
	subject: '',
	startTime: '',
	endTime: '',
	venue: '',
	idsByClass: {},
});

const newSitting = (): SittingDraft => ({
	key: newKey(),
	date: '',
	classIds: [],
	papers: [newPaper()],
});

/**
 * Rebuilds sittings from stored rows.
 *
 * Rows are grouped by date, then by which classes they apply to: papers written
 * by the same set of classes on the same day are one sitting. A day on which
 * different classes write different papers therefore comes back as more than
 * one sitting, which is the only reading that round-trips without inventing a
 * scope no row actually has.
 */
export function groupRowsIntoSittings(rows: TestScheduleRow[]): SittingDraft[] {
	type Collected = {
		subject: string;
		startTime: string;
		endTime: string;
		venue: string;
		classIds: Set<string>;
		idsByClass: Record<string, string>;
	};

	const byDate = new Map<string, Map<string, Collected>>();
	for (const row of rows) {
		if (!byDate.has(row.date)) byDate.set(row.date, new Map());
		const papers = byDate.get(row.date)!;
		const paperKey = [row.subject, row.startTime, row.endTime, row.venue].join('|');
		if (!papers.has(paperKey)) {
			papers.set(paperKey, {
				subject: row.subject,
				startTime: row.startTime,
				endTime: row.endTime,
				venue: row.venue,
				classIds: new Set(),
				idsByClass: {},
			});
		}
		const paper = papers.get(paperKey)!;
		// A row with no classId applies to every class in the level.
		const classKey = row.classId || '__all__';
		paper.classIds.add(classKey);
		paper.idsByClass[classKey] = row.id;
	}

	const sittings: SittingDraft[] = [];
	for (const [date, papers] of byDate) {
		const byScope = new Map<string, PaperDraft[]>();
		for (const paper of papers.values()) {
			const signature = Array.from(paper.classIds).sort().join(',');
			if (!byScope.has(signature)) byScope.set(signature, []);
			byScope.get(signature)!.push({
				key: newKey(),
				subject: paper.subject,
				startTime: paper.startTime,
				endTime: paper.endTime,
				venue: paper.venue,
				idsByClass: paper.idsByClass,
			});
		}
		for (const [signature, papersForScope] of byScope) {
			sittings.push({
				key: newKey(),
				date,
				classIds: signature ? signature.split(',') : [],
				papers: papersForScope.sort((a, b) =>
					a.startTime.localeCompare(b.startTime),
				),
			});
		}
	}
	return sittings.sort((a, b) => a.date.localeCompare(b.date));
}

interface TestScheduleEditorProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Empty when creating. */
	existingRows: TestScheduleRow[];
	session: string;
	level: string;
	academicYear: string;
	classes: { classId: string; className: string }[];
	subjects: string[];
	onSaved: () => void;
	onDeleted: () => void;
}

export default function TestScheduleEditor({
	open,
	onOpenChange,
	existingRows,
	session,
	level,
	academicYear,
	classes,
	subjects,
	onSaved,
	onDeleted,
}: TestScheduleEditorProps) {
	const isEditing = existingRows.length > 0;
	const [title, setTitle] = useState('');
	const [period, setPeriod] = useState('');
	const [sittings, setSittings] = useState<SittingDraft[]>([newSitting()]);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	const groupId = existingRows[0]?.groupId || '';

	useEffect(() => {
		if (!open) return;
		if (isEditing) {
			setTitle(existingRows[0].title || '');
			setPeriod(existingRows[0].period || '');
			const rebuilt = groupRowsIntoSittings(existingRows);
			setSittings(rebuilt.length > 0 ? rebuilt : [newSitting()]);
		} else {
			setTitle('');
			setPeriod('');
			setSittings([newSitting()]);
		}
		setError('');
	}, [open, isEditing, existingRows]);

	const classOptions = useMemo(
		() => [{ classId: '__all__', className: 'All classes' }, ...classes],
		[classes],
	);

	const updateSitting = (key: string, patch: Partial<SittingDraft>) => {
		setSittings((prev) =>
			prev.map((sitting) =>
				sitting.key === key ? { ...sitting, ...patch } : sitting,
			),
		);
	};

	const updatePaper = (
		sittingKey: string,
		paperKey: string,
		patch: Partial<PaperDraft>,
	) => {
		setSittings((prev) =>
			prev.map((sitting) =>
				sitting.key === sittingKey
					? {
							...sitting,
							papers: sitting.papers.map((paper) =>
								paper.key === paperKey ? { ...paper, ...patch } : paper,
							),
						}
					: sitting,
			),
		);
	};

	const toggleClass = (sittingKey: string, classId: string) => {
		setSittings((prev) =>
			prev.map((sitting) => {
				if (sitting.key !== sittingKey) return sitting;
				const has = sitting.classIds.includes(classId);
				// "All classes" is exclusive — it already covers everything.
				if (classId === '__all__') {
					return { ...sitting, classIds: has ? [] : ['__all__'] };
				}
				const withoutAll = sitting.classIds.filter((id) => id !== '__all__');
				return {
					...sitting,
					classIds: has
						? withoutAll.filter((id) => id !== classId)
						: [...withoutAll, classId],
				};
			}),
		);
	};

	const buildItems = () => {
		const items: any[] = [];
		for (const sitting of sittings) {
			const targets = sitting.classIds.length > 0 ? sitting.classIds : ['__all__'];
			for (const paper of sitting.papers) {
				// A paper left blank is a draft row, not a real sitting — only
				// subjects actually chosen create rows.
				if (!paper.subject) continue;
				for (const classKey of targets) {
					const meta = classes.find((klass) => klass.classId === classKey);
					items.push({
						id: paper.idsByClass[classKey] || undefined,
						classId: classKey === '__all__' ? '' : classKey,
						className: classKey === '__all__' ? '' : meta?.className || '',
						subject: paper.subject,
						startDate: sitting.date,
						startTime: paper.startTime,
						endTime: paper.endTime,
						venue: paper.venue,
					});
				}
			}
		}
		return items;
	};

	const validate = (): string | null => {
		if (!title.trim()) {
			return 'Give the schedule a title, e.g. "3rd Period Exams".';
		}
		if (!period) {
			return 'Choose the academic period this schedule belongs to.';
		}
		for (const [index, sitting] of sittings.entries()) {
			const label = sitting.date || `Sitting ${index + 1}`;
			if (!sitting.date) return `${label}: pick the date for this sitting.`;
			// Papers left blank are skipped on save, so laying out a day for a
			// few classes never forces a subject on every line.
			const filled = sitting.papers.filter((paper) => paper.subject.trim());
			if (filled.length === 0) {
				return `${label}: add at least one subject.`;
			}
			for (const paper of filled) {
				if (!paper.startTime || !paper.endTime) {
					return `${label} — ${paper.subject}: set a start and end time.`;
				}
				if (paper.startTime >= paper.endTime) {
					return `${label} — ${paper.subject}: the end time must be after the start.`;
				}
			}
			// Papers in one sitting are written by the same classes, so two of
			// them cannot run at once.
			const ordered = [...filled].sort((a, b) =>
				a.startTime.localeCompare(b.startTime),
			);
			for (let i = 1; i < ordered.length; i += 1) {
				if (ordered[i].startTime < ordered[i - 1].endTime) {
					return `${label}: ${ordered[i - 1].subject} and ${ordered[i].subject} overlap.`;
				}
			}
		}
		// The same date must not appear twice with the same classes.
		const seen = new Set<string>();
		for (const sitting of sittings) {
			const signature = `${sitting.date}|${[...sitting.classIds].sort().join(',')}`;
			if (seen.has(signature)) {
				return `${sitting.date}: two sittings cover the same date and classes — merge them.`;
			}
			seen.add(signature);
		}
		return null;
	};

	const handleSave = async () => {
		const invalid = validate();
		if (invalid) {
			setError(invalid);
			return;
		}

		setSaving(true);
		setError('');
		try {
			const response = await fetch('/api/schedules', {
				method: isEditing ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'test',
					groupId: groupId || undefined,
					title: title.trim(),
					period,
					session,
					level,
					academicYear,
					items: buildItems(),
				}),
			});
			const payload = await response.json();
			if (!response.ok || !payload?.success) {
				setError(payload?.message || 'Could not save the test schedule.');
				return;
			}
			onSaved();
			onOpenChange(false);
		} catch {
			setError('Network error saving the test schedule.');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!groupId) return;
		setSaving(true);
		setError('');
		try {
			const response = await fetch('/api/schedules', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'test', groupId }),
			});
			const payload = await response.json();
			if (!response.ok || !payload?.success) {
				setError(payload?.message || 'Could not delete the test schedule.');
				return;
			}
			onDeleted();
			onOpenChange(false);
		} catch {
			setError('Network error deleting the test schedule.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? 'Edit test schedule' : 'New test schedule'}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-3">
					{/* ── One title and one period for the whole schedule ─────── */}
					<div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
							<label className="flex min-w-0 flex-1 items-center gap-1.5">
								<span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
									Title
								</span>
								<input
									type="text"
									value={title}
									onChange={(event) => setTitle(event.target.value)}
									placeholder='e.g. "3rd Period Examinations"'
									className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</label>
							<div className="flex flex-wrap items-center gap-1.5">
								<span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
									Period
								</span>
								{ACADEMIC_PERIODS.map((option) => (
									<button
										key={option.value}
										type="button"
										onClick={() => setPeriod(option.value)}
										className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
											period === option.value
												? 'bg-primary text-primary-foreground'
												: 'bg-muted text-muted-foreground hover:text-foreground'
										}`}
									>
										{option.label}
									</button>
								))}
							</div>
						</div>
						<p className="text-[10px] text-muted-foreground">
							{session} · {level} · {academicYear}
						</p>
					</div>

					{/* ── Sittings: one date, many timed subjects ─────────────── */}
					<div className="space-y-2">
						<div className="flex flex-wrap items-baseline justify-between gap-2">
							<h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
								Sittings
								<span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
									{sittings.length}
								</span>
							</h3>
							<p className="text-[10px] text-muted-foreground">
								One date each, with every subject written that day.
							</p>
						</div>

						{sittings.map((sitting, index) => (
							<div
								key={sitting.key}
								className="space-y-2 rounded-xl border border-border p-2.5"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
										<CalendarDays className="h-3 w-3" />
										Day {index + 1}
									</span>
									<div className="flex items-center gap-1.5">
										<DatePicker
											value={sitting.date}
											onChange={(value) => updateSitting(sitting.key, { date: value })}
											placeholder="Pick the day"
											className="w-52"
										/>
										{sittings.length > 1 && (
											<button
												type="button"
												onClick={() =>
													setSittings((prev) =>
														prev.filter((item) => item.key !== sitting.key),
													)
												}
												aria-label={`Remove day ${index + 1}`}
												className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
											>
												<Trash2 className="h-3.5 w-3.5" />
											</button>
										)}
									</div>
								</div>

								<div className="flex flex-wrap items-center gap-1.5">
									{classOptions.map((klass) => {
										const on = sitting.classIds.includes(klass.classId);
										return (
											<button
												key={klass.classId}
												type="button"
												onClick={() => toggleClass(sitting.key, klass.classId)}
												className={`rounded-full px-2 py-1 text-[11px] font-bold transition-colors ${
													on
														? 'bg-primary text-primary-foreground'
														: 'bg-muted text-muted-foreground hover:text-foreground'
												}`}
											>
												{klass.className}
											</button>
										);
									})}
									{sitting.classIds.length === 0 && (
										<span className="text-[10px] text-muted-foreground">
											None picked — every class in {level} writes this day.
										</span>
									)}
								</div>

								{/* Subjects for this day, each with its own window. */}
								<div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-1.5">
									<span className="block px-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
										Subjects &amp; times
									</span>

									{sitting.papers.map((paper, paperIndex) => (
										<div
											key={paper.key}
											className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-1.5"
										>
											<label className="flex min-w-[9rem] flex-1 items-center gap-1.5">
												<span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
													Subject
												</span>
												{subjects.length > 0 ? (
													<select
														value={paper.subject}
														onChange={(event) =>
															updatePaper(sitting.key, paper.key, {
																subject: event.target.value,
															})
														}
														className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
													>
														<option value="">Select subject</option>
														{subjects.map((subject) => (
															<option key={subject} value={subject}>
																{subject}
															</option>
														))}
													</select>
												) : (
													<input
														type="text"
														value={paper.subject}
														onChange={(event) =>
															updatePaper(sitting.key, paper.key, {
																subject: event.target.value,
															})
														}
														placeholder="Subject"
														className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
													/>
												)}
											</label>

											<label className="flex items-center gap-1">
												<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
													From
												</span>
												<input
													type="time"
													value={paper.startTime}
													onChange={(event) =>
														updatePaper(sitting.key, paper.key, {
															startTime: event.target.value,
														})
													}
													className="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
												/>
											</label>

											<label className="flex items-center gap-1">
												<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
													To
												</span>
												<input
													type="time"
													value={paper.endTime}
													onChange={(event) =>
														updatePaper(sitting.key, paper.key, {
															endTime: event.target.value,
														})
													}
													className="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
												/>
											</label>

											<label className="flex items-center gap-1">
												<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
													Venue
												</span>
												<input
													type="text"
													value={paper.venue}
													onChange={(event) =>
														updatePaper(sitting.key, paper.key, {
															venue: event.target.value,
														})
													}
													placeholder="Optional"
													className="h-8 w-28 rounded-md border border-input bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
												/>
											</label>

											{sitting.papers.length > 1 && (
												<button
													type="button"
													onClick={() =>
														updateSitting(sitting.key, {
															papers: sitting.papers.filter(
																(item) => item.key !== paper.key,
															),
														})
													}
													aria-label={`Remove subject ${paperIndex + 1}`}
													className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											)}
										</div>
									))}

									<button
										type="button"
										onClick={() =>
											updateSitting(sitting.key, {
												papers: [...sitting.papers, newPaper()],
											})
										}
										className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-card text-[11px] font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
									>
										<Plus className="h-3 w-3" />
										Add subject
									</button>
								</div>
							</div>
						))}

						{/* Likewise for a whole extra day. */}
						<button
							type="button"
							onClick={() => setSittings((prev) => [...prev, newSitting()])}
							className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-[11px] font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
						>
							<Plus className="h-3 w-3" />
							Add day
						</button>
					</div>

					{error && <p className="text-sm font-medium text-destructive">{error}</p>}
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
							{isEditing ? 'Save schedule' : 'Publish schedule'}
						</button>
						<button
							type="button"
							onClick={() => onOpenChange(false)}
							className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted"
						>
							Cancel
						</button>
					</div>
					{isEditing && (
						<button
							type="button"
							onClick={handleDelete}
							disabled={saving}
							className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
						>
							<Trash2 className="h-4 w-4" />
							Delete schedule
						</button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
