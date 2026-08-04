'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Award,
	BadgePercent,
	Banknote,
	CalendarDays,
	CheckCircle2,
	Loader2,
	Search,
	Trash2,
	Undo2,
	UserCheck,
	UserPlus,
	Users,
	Wallet,
	X,
} from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useSchoolStore } from '@/store/schoolStore';
import {
	buildSchoolAcademicYearRange,
	pickCurrentOrMostRecentAcademicYear,
} from '@/utils/academicYearOptions';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';
import StudentFinder, {
	classIdForYear,
	studentFullName,
	useClassDirectory,
} from '@/app/dashboard/shared/components/StudentFinder';

const BENEFICIARY_PAGE = 25;

const formatCurrency = (amount: number) =>
	(Number.isFinite(amount) ? amount : 0).toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const normalizeYear = (value?: string) => (value || '').replace(/\//g, '-');

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
	value,
	icon: Icon,
	hint,
}: {
	label: string;
	value: string | number;
	icon: any;
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
			<p className="mt-2 text-2xl font-black tabular-nums text-foreground">
				{value}
			</p>
			{hint && (
				<p className="mt-1 text-[11px] font-medium text-muted-foreground">
					{hint}
				</p>
			)}
		</div>
	);
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function ScholarshipsPage() {
	const schoolProfile = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore((state) => state.usersByAcademicYear);

	const [academicYear, setAcademicYear] = useState('');
	const [selectedStudent, setSelectedStudent] = useState<any>(null);
	const [toggled, setToggled] = useState<Set<string>>(new Set());
	const [wardTeacherId, setWardTeacherId] = useState('');
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{
		type: 'success' | 'error';
		text: string;
	} | null>(null);

	const [modalScholarship, setModalScholarship] = useState<any>(null);
	const [modalRemoved, setModalRemoved] = useState<Set<string>>(new Set());
	const [modalSaving, setModalSaving] = useState(false);
	const [modalQuery, setModalQuery] = useState('');
	const [modalVisible, setModalVisible] = useState(BENEFICIARY_PAGE);

	const directory = useClassDirectory(schoolProfile);
	const loading = !schoolProfile;

	const academicYearOptions = useMemo(
		() => (schoolProfile ? buildSchoolAcademicYearRange(schoolProfile) : []),
		[schoolProfile],
	);

	useEffect(() => {
		if (!schoolProfile) return;
		const years = buildSchoolAcademicYearRange(schoolProfile);
		setAcademicYear(
			pickCurrentOrMostRecentAcademicYear(
				years,
				getCurrentAcademicYearFromSchoolProfile(schoolProfile),
			) || '',
		);
	}, [schoolProfile]);

	const yearUsers = useMemo(() => {
		if (!academicYear || !usersByAcademicYear) return null;
		return (
			usersByAcademicYear[academicYear] ||
			Object.entries(usersByAcademicYear).find(
				([key]) => normalizeYear(key) === normalizeYear(academicYear),
			)?.[1] ||
			null
		);
	}, [usersByAcademicYear, academicYear]);

	const students = useMemo(
		() => (Array.isArray((yearUsers as any)?.students) ? (yearUsers as any).students : []),
		[yearUsers],
	);

	const teachers = useMemo(
		() => (Array.isArray((yearUsers as any)?.teachers) ? (yearUsers as any).teachers : []),
		[yearUsers],
	);

	const schedule = useMemo(() => {
		if (!schoolProfile?.financialConfig?.feeSchedules) return null;
		return (
			schoolProfile.financialConfig.feeSchedules.find(
				(item) => normalizeYear(item.academicYear) === normalizeYear(academicYear),
			) || null
		);
	}, [schoolProfile, academicYear]);

	const scholarships = useMemo(() => schedule?.scholarships || [], [schedule]);

	const categories = useMemo(
		() => schoolProfile?.financialConfig?.paymentCategories || [],
		[schoolProfile],
	);

	const categoryName = useCallback(
		(id: string) => categories.find((item) => item.id === id)?.name || id,
		[categories],
	);

	const definedKeys = useMemo(() => {
		const ids = new Set(scholarships.map((item) => item.id));
		const names = new Set(scholarships.map((item) => item.name));
		return { ids, names };
	}, [scholarships]);

	const holdsScholarship = useCallback(
		(student: any, scholarship: any) =>
			(student.scholarships || []).some(
				(key: string) => key === scholarship.id || key === scholarship.name,
			),
		[],
	);

	// One pass over the roster gives every count the page needs.
	const stats = useMemo(() => {
		const perScholarship = new Map<string, number>();
		let awarded = 0;
		let warded = 0;
		for (const student of students) {
			let hasAny = false;
			for (const scholarship of scholarships) {
				if (holdsScholarship(student, scholarship)) {
					perScholarship.set(
						scholarship.id,
						(perScholarship.get(scholarship.id) || 0) + 1,
					);
					hasAny = true;
				}
			}
			if (hasAny) awarded += 1;
			if (student.wardTeacherId) warded += 1;
		}
		return { perScholarship, awarded, warded };
	}, [students, scholarships, holdsScholarship]);

	const modalStudents = useMemo(() => {
		if (!modalScholarship) return [];
		const query = modalQuery.trim().toLowerCase();
		return students
			.filter((student: any) => holdsScholarship(student, modalScholarship))
			.filter((student: any) => {
				if (!query) return true;
				return (
					studentFullName(student).toLowerCase().includes(query) ||
					String(student.studentId || '').toLowerCase().includes(query)
				);
			})
			.sort((a: any, b: any) =>
				studentFullName(a).localeCompare(studentFullName(b)),
			);
	}, [students, modalScholarship, modalQuery, holdsScholarship]);

	const openModal = (scholarship: any) => {
		setModalScholarship(scholarship);
		setModalRemoved(new Set());
		setModalQuery('');
		setModalVisible(BENEFICIARY_PAGE);
		setMessage(null);
	};

	const closeModal = () => {
		setModalScholarship(null);
		setModalRemoved(new Set());
		setModalQuery('');
	};

	const toggleModalRemove = (studentId: string) => {
		setModalRemoved((prev) => {
			const next = new Set(prev);
			if (next.has(studentId)) next.delete(studentId);
			else next.add(studentId);
			return next;
		});
	};

	const handleModalSave = async () => {
		if (!modalScholarship || modalRemoved.size === 0) {
			closeModal();
			return;
		}
		setModalSaving(true);
		setMessage(null);
		const targets = students.filter(
			(student: any) =>
				holdsScholarship(student, modalScholarship) &&
				modalRemoved.has(student.studentId),
		);
		try {
			let allOk = true;
			for (const student of targets) {
				const preserved = (student.scholarships || []).filter(
					(key: string) =>
						key !== modalScholarship.id && key !== modalScholarship.name,
				);
				const res = await fetch('/api/students', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						studentId: student.studentId,
						scholarships: preserved,
					}),
				});
				const json = await res.json();
				if (json.success) {
					useSchoolStore.getState().setUsersForYear(academicYear, {
						students: [{ ...student, scholarships: preserved }],
					});
				} else {
					allOk = false;
				}
			}
			const count = targets.length;
			setMessage({
				type: allOk ? 'success' : 'error',
				text: allOk
					? `Removed ${count} student${count === 1 ? '' : 's'} from ${modalScholarship.name}.`
					: 'Some students could not be removed.',
			});
			closeModal();
		} catch {
			setMessage({ type: 'error', text: 'Failed to remove students.' });
		} finally {
			setModalSaving(false);
		}
	};

	const handleSelectStudent = (student: any) => {
		setSelectedStudent(student);
		const assigned = new Set<string>();
		for (const key of student.scholarships || []) {
			if (definedKeys.ids.has(key) || definedKeys.names.has(key)) {
				assigned.add(key);
			}
		}
		setToggled(assigned);
		setWardTeacherId(student.wardTeacherId || '');
		setMessage(null);
	};

	const toggleScholarship = (key: string) => {
		setToggled((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const isAssigned = (scholarship: any) =>
		toggled.has(scholarship.id) || toggled.has(scholarship.name);

	const handleSave = async () => {
		if (!selectedStudent) return;
		setSaving(true);
		setMessage(null);
		// Keys the current year's schedule doesn't define are left untouched so
		// awards from other years survive the save.
		const preserved = (selectedStudent.scholarships || []).filter(
			(key: string) => !definedKeys.ids.has(key) && !definedKeys.names.has(key),
		);
		const scholarshipsToSave = Array.from(
			new Set([...preserved, ...Array.from(toggled)]),
		);
		try {
			const res = await fetch('/api/students', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					studentId: selectedStudent.studentId,
					scholarships: scholarshipsToSave,
					wardTeacherId,
				}),
			});
			const json = await res.json();
			if (json.success) {
				setMessage({ type: 'success', text: 'Saved successfully.' });
				useSchoolStore.getState().setUsersForYear(academicYear, {
					students: [
						{
							...selectedStudent,
							scholarships: scholarshipsToSave,
							wardTeacherId,
						},
					],
				});
				setSelectedStudent((prev: any) => ({
					...prev,
					scholarships: scholarshipsToSave,
					wardTeacherId,
				}));
			} else {
				setMessage({ type: 'error', text: json.message });
			}
		} catch {
			setMessage({ type: 'error', text: 'Failed to save.' });
		} finally {
			setSaving(false);
		}
	};

	const typeBadge = (scholarship: any) => {
		if (scholarship.scholarshipType === 'percentage') {
			return { icon: BadgePercent, cls: 'bg-primary/10 text-primary' };
		}
		if (scholarship.scholarshipType === 'fixedDeduction') {
			return { icon: Wallet, cls: 'bg-amber-500/10 text-amber-600' };
		}
		return { icon: Banknote, cls: 'bg-teal-500/10 text-teal-600' };
	};

	const scholarshipValue = (scholarship: any) => {
		if (scholarship.scholarshipType === 'percentage') {
			return `${Math.round(scholarship.amount * 100)}% of covered fees`;
		}
		const suffix =
			scholarship.scholarshipType === 'fixedPayment' ? 'cap' : 'deducted';
		return `${scholarship.currency || 'LRD'} ${formatCurrency(scholarship.amount)} (${suffix})`;
	};

	const appliesToLabel = (scholarship: any) => {
		if (!scholarship.appliesTo || scholarship.appliesTo.length === 0) {
			return 'All fee categories';
		}
		return scholarship.appliesTo.map(categoryName).join(', ');
	};

	const selectedClassName = selectedStudent
		? directory.byId[classIdForYear(selectedStudent, academicYear)]?.className ||
			selectedStudent.className ||
			'—'
		: '';

	const teacherName = (teacher: any) =>
		teacher?.fullName ||
		`${teacher?.firstName || ''} ${teacher?.lastName || ''}`.trim() ||
		teacher?.username ||
		'';

	return (
		<div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
			{/* ── Header ──────────────────────────────────────────────────── */}
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-black tracking-tight sm:text-3xl">
						Scholarships &amp; Wards
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Configured awards for the year, and who holds them.
					</p>
				</div>
				{academicYearOptions.length > 0 && (
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

			{message && (
				<div
					className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm font-medium ${
						message.type === 'success'
							? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
							: 'border-destructive/20 bg-destructive/10 text-destructive'
					}`}
				>
					<span>{message.text}</span>
					<button
						type="button"
						onClick={() => setMessage(null)}
						aria-label="Dismiss"
						className="shrink-0 opacity-70 hover:opacity-100"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			)}

			{/* ── Stats ───────────────────────────────────────────────────── */}
			<div className="grid gap-4 sm:grid-cols-3">
				<StatTile
					label="Scholarships"
					value={scholarships.length}
					icon={Award}
					hint={`Configured for ${academicYear || '—'}`}
				/>
				<StatTile
					label="Students Awarded"
					value={stats.awarded}
					icon={Users}
					hint={`of ${students.length} enrolled`}
				/>
				<StatTile
					label="Wards Assigned"
					value={stats.warded}
					icon={UserCheck}
					hint="Students with a ward teacher"
				/>
			</div>

			{/* ── Scholarship cards ───────────────────────────────────────── */}
			<section className="space-y-3">
				<h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
					<Award className="h-4 w-4" />
					Configured Scholarships
				</h2>
				{loading ? (
					<div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" /> Loading…
					</div>
				) : scholarships.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
						No scholarships configured for {academicYear || 'this academic year'}.
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{scholarships.map((scholarship) => {
							const badge = typeBadge(scholarship);
							const BadgeIcon = badge.icon;
							const count = stats.perScholarship.get(scholarship.id) || 0;
							return (
								<button
									key={scholarship.id}
									type="button"
									onClick={() => openModal(scholarship)}
									className="group flex w-full flex-col rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
								>
									<div className="flex items-start justify-between gap-2">
										<h3 className="min-w-0 break-words font-bold text-foreground">
											{scholarship.name}
										</h3>
										<span
											className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.cls}`}
										>
											<BadgeIcon className="h-3 w-3" />
											{scholarship.scholarshipType}
										</span>
									</div>
									<p className="mt-1 text-sm font-black text-primary">
										{scholarshipValue(scholarship)}
									</p>
									{scholarship.description && (
										<p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
											{scholarship.description}
										</p>
									)}
									<p className="mt-2 text-xs text-muted-foreground">
										Applies to:{' '}
										<span className="font-bold text-foreground">
											{appliesToLabel(scholarship)}
										</span>
									</p>
									<div className="mt-3 flex items-center justify-between border-t border-border pt-3">
										<span className="flex items-center gap-1.5 text-xs font-bold text-primary opacity-80 transition-opacity group-hover:opacity-100">
											<Users className="h-3.5 w-3.5" />
											Manage beneficiaries
										</span>
										<span className="rounded-full bg-muted px-2 py-0.5 text-xs font-black tabular-nums text-foreground">
											{count}
										</span>
									</div>
								</button>
							);
						})}
					</div>
				)}
			</section>

			{/* ── Assignment ──────────────────────────────────────────────── */}
			<section className="space-y-3">
				<h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
					<UserPlus className="h-4 w-4" />
					Assign to a Student
				</h2>

				{!selectedStudent ? (
					<StudentFinder
						students={students}
						schoolProfile={schoolProfile}
						academicYear={academicYear}
						onSelect={handleSelectStudent}
						placeholder="Find the student to award…"
						renderMeta={(student) => {
							const count = scholarships.filter((scholarship) =>
								holdsScholarship(student, scholarship),
							).length;
							return count > 0 ? (
								<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
									<Award className="h-3 w-3" />
									{count}
								</span>
							) : (
								<span className="text-[11px] text-muted-foreground">None</span>
							);
						}}
					/>
				) : (
					<div className="space-y-4">
						{/* Selected student */}
						<div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
								{initials(studentFullName(selectedStudent))}
							</span>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-black text-foreground">
									{studentFullName(selectedStudent)}
								</p>
								<p className="truncate text-xs text-muted-foreground">
									{selectedStudent.studentId} · {selectedClassName}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setSelectedStudent(null)}
								className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
							>
								<Search className="h-3.5 w-3.5" />
								Find another
							</button>
						</div>

						<div className="grid gap-4 lg:grid-cols-2">
							{/* Awards */}
							<div className="rounded-2xl border border-border bg-card p-4">
								<h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
									<Award className="h-4 w-4 text-muted-foreground" />
									Awards
								</h3>
								{scholarships.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										No scholarships defined for {academicYear}.
									</p>
								) : (
									<div className="space-y-2">
										{scholarships.map((scholarship) => {
											const on = isAssigned(scholarship);
											return (
												<label
													key={scholarship.id}
													className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
														on
															? 'border-primary bg-primary/5'
															: 'border-border hover:bg-muted/50'
													}`}
												>
													<span className="min-w-0">
														<span className="block truncate text-sm font-bold text-foreground">
															{scholarship.name}
														</span>
														<span className="block truncate text-xs text-muted-foreground">
															{scholarshipValue(scholarship)}
														</span>
													</span>
													<input
														type="checkbox"
														checked={on}
														onChange={() => toggleScholarship(scholarship.id)}
														className="h-4 w-4 shrink-0 rounded border-input text-primary focus:ring-primary"
													/>
												</label>
											);
										})}
									</div>
								)}
							</div>

							{/* Ward teacher */}
							<div className="rounded-2xl border border-border bg-card p-4">
								<h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
									<UserCheck className="h-4 w-4 text-muted-foreground" />
									Ward Teacher
								</h3>
								{teachers.length > 0 ? (
									<select
										value={wardTeacherId}
										onChange={(event) => setWardTeacherId(event.target.value)}
										className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
									>
										<option value="">No ward teacher</option>
										{teachers.map((teacher: any) => {
											const id = teacher.username || teacher.userId || teacher.id;
											return (
												<option key={id} value={id}>
													{teacherName(teacher)} ({id})
												</option>
											);
										})}
									</select>
								) : (
									<input
										type="text"
										value={wardTeacherId}
										onChange={(event) => setWardTeacherId(event.target.value)}
										placeholder="Teacher ID…"
										className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
									/>
								)}
								<p className="mt-2 text-xs text-muted-foreground">
									The teacher who sponsors this student. Picked from the cached{' '}
									{academicYear || 'current'} staff list.
								</p>
							</div>
						</div>

						<button
							type="button"
							onClick={handleSave}
							disabled={saving}
							className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
						>
							{saving ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" /> Saving…
								</>
							) : (
								<>
									<CheckCircle2 className="h-4 w-4" /> Save Changes
								</>
							)}
						</button>
					</div>
				)}
			</section>

			{/* ── Beneficiaries dialog ────────────────────────────────────── */}
			<Dialog
				open={Boolean(modalScholarship)}
				onOpenChange={(open) => {
					if (!open && !modalSaving) closeModal();
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Award className="h-5 w-5 text-primary" />
							{modalScholarship?.name}
						</DialogTitle>
						<DialogDescription>
							{stats.perScholarship.get(modalScholarship?.id) || 0} student
							{(stats.perScholarship.get(modalScholarship?.id) || 0) === 1
								? ''
								: 's'}{' '}
							hold this award. Remove any who should no longer receive it.
						</DialogDescription>
					</DialogHeader>

					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
						<input
							type="text"
							value={modalQuery}
							onChange={(event) => {
								setModalQuery(event.target.value);
								setModalVisible(BENEFICIARY_PAGE);
							}}
							placeholder="Filter beneficiaries…"
							className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>

					<div className="max-h-[45vh] divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card">
						{modalStudents.length === 0 ? (
							<p className="p-6 text-center text-sm text-muted-foreground">
								{modalQuery.trim()
									? `No beneficiaries match “${modalQuery.trim()}”.`
									: 'No students are assigned to this scholarship.'}
							</p>
						) : (
							modalStudents.slice(0, modalVisible).map((student: any) => {
								const removing = modalRemoved.has(student.studentId);
								return (
									<div
										key={student.studentId}
										className={`flex items-center justify-between gap-3 px-4 py-3 ${
											removing ? 'bg-destructive/5' : ''
										}`}
									>
										<div className="min-w-0">
											<p
												className={`truncate text-sm font-bold ${
													removing
														? 'text-destructive line-through'
														: 'text-foreground'
												}`}
											>
												{studentFullName(student)}
											</p>
											<p className="truncate text-xs text-muted-foreground">
												{student.studentId} ·{' '}
												{directory.byId[classIdForYear(student, academicYear)]
													?.className ||
													student.className ||
													'—'}
											</p>
										</div>
										<button
											type="button"
											onClick={() => toggleModalRemove(student.studentId)}
											disabled={modalSaving}
											className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
												removing
													? 'bg-muted text-foreground hover:bg-muted/70'
													: 'bg-destructive/10 text-destructive hover:bg-destructive/20'
											}`}
										>
											{removing ? (
												<>
													<Undo2 className="h-3.5 w-3.5" /> Undo
												</>
											) : (
												<>
													<Trash2 className="h-3.5 w-3.5" /> Remove
												</>
											)}
										</button>
									</div>
								);
							})
						)}
						{modalStudents.length > modalVisible && (
							<button
								type="button"
								onClick={() =>
									setModalVisible((count) => count + BENEFICIARY_PAGE)
								}
								className="w-full px-4 py-2.5 text-xs font-bold text-primary hover:bg-muted"
							>
								Show {Math.min(
									BENEFICIARY_PAGE,
									modalStudents.length - modalVisible,
								)}{' '}
								more ({modalVisible} of {modalStudents.length})
							</button>
						)}
					</div>

					{modalRemoved.size > 0 && (
						<p className="text-xs text-muted-foreground">
							{modalRemoved.size} student
							{modalRemoved.size === 1 ? '' : 's'} marked for removal.
						</p>
					)}

					<DialogFooter>
						<button
							type="button"
							onClick={closeModal}
							disabled={modalSaving}
							className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleModalSave}
							disabled={modalSaving || modalRemoved.size === 0}
							className="flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
						>
							{modalSaving ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" /> Saving…
								</>
							) : (
								<>
									<Trash2 className="h-4 w-4" /> Save Changes
								</>
							)}
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
