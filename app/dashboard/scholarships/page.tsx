'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
	Award,
	BadgePercent,
	Banknote,
	CheckCircle2,
	Loader2,
	Search,
	UserPlus,
	Users,
	Wallet,
	X,
} from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';
import {
	buildSchoolAcademicYearRange,
	pickCurrentOrMostRecentAcademicYear,
} from '@/utils/academicYearOptions';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';

const formatCurrency = (amount: number) =>
	amount.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

export default function ScholarshipsPage() {
	const schoolProfile = useSchoolStore((s) => s.school);

	const [academicYear, setAcademicYear] = useState('');
	const [students, setStudents] = useState<any[]>([]);
	const [search, setSearch] = useState('');
	const [selectedStudent, setSelectedStudent] = useState<any>(null);
	const [toggled, setToggled] = useState<Set<string>>(new Set());
	const [wardTeacherId, setWardTeacherId] = useState('');
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{
		type: 'success' | 'error';
		text: string;
	} | null>(null);

	const academicYearOptions = useMemo(() => {
		if (!schoolProfile) return [];
		return buildSchoolAcademicYearRange(schoolProfile);
	}, [schoolProfile]);

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

	const schedule = useMemo(() => {
		if (!schoolProfile?.financialConfig?.feeSchedules) return null;
		return (
			schoolProfile.financialConfig.feeSchedules.find(
				(s) => s.academicYear === academicYear,
			) || null
		);
	}, [schoolProfile, academicYear]);

	const scholarships = useMemo(() => schedule?.scholarships || [], [schedule]);

	const categories = useMemo(
		() => schoolProfile?.financialConfig?.paymentCategories || [],
		[schoolProfile],
	);

	const categoryName = useCallback(
		(id: string) => categories.find((c) => c.id === id)?.name || id,
		[categories],
	);

	const loadStudents = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch('/api/students');
			const json = await res.json();
			if (json.success) setStudents(json.data || []);
		} catch {
			setMessage({ type: 'error', text: 'Failed to load students.' });
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadStudents();
	}, [loadStudents]);

	const filteredStudents = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return students;
		return students.filter(
			(s) =>
				`${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
				String(s.studentId || '').toLowerCase().includes(q),
		);
	}, [search, students]);

	const beneficiaryCount = useCallback(
		(scholarship: any) =>
			students.filter((s) =>
				(s.scholarships || []).some(
					(k: string) =>
						k === scholarship.id || k === scholarship.name,
				),
			).length,
		[students],
	);

	const definedKeys = useMemo(() => {
		const ids = new Set(scholarships.map((s) => s.id));
		const names = new Set(scholarships.map((s) => s.name));
		return { ids, names };
	}, [scholarships]);

	const handleSelectStudent = (student: any) => {
		setSelectedStudent(student);
		const assigned = new Set<string>();
		for (const k of student.scholarships || []) {
			if (definedKeys.ids.has(k) || definedKeys.names.has(k)) {
				assigned.add(k);
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
		const preserved = (selectedStudent.scholarships || []).filter(
			(k: string) =>
				!definedKeys.ids.has(k) && !definedKeys.names.has(k),
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
				setStudents((prev) =>
					prev.map((s) =>
						s.studentId === selectedStudent.studentId
							? { ...s, scholarships: scholarshipsToSave, wardTeacherId }
							: s,
					),
				);
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

	const typeBadge = (s: any) => {
		if (s.scholarshipType === 'percentage') {
			return { icon: BadgePercent, cls: 'bg-primary/10 text-primary' };
		}
		if (s.scholarshipType === 'fixedDeduction') {
			return { icon: Wallet, cls: 'bg-amber-500/10 text-amber-600' };
		}
		return { icon: Banknote, cls: 'bg-teal-500/10 text-teal-600' };
	};

	const scholarshipValue = (s: any) => {
		if (s.scholarshipType === 'percentage') {
			return `${Math.round(s.amount * 100)}% of covered fees`;
		}
		const suffix = s.scholarshipType === 'fixedPayment' ? 'cap' : 'deducted';
		return `${s.currency || 'LRD'} ${formatCurrency(s.amount)} (${suffix})`;
	};

	const appliesToLabel = (s: any) => {
		if (!s.appliesTo || s.appliesTo.length === 0) {
			return 'All fee categories';
		}
		return s.appliesTo.map(categoryName).join(', ');
	};

	return (
		<div className="mx-auto max-w-7xl space-y-6 p-6">
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-black tracking-tight text-foreground">
						Scholarships
					</h1>
					<p className="text-sm text-muted-foreground">
						Configured scholarships and student assignments by academic year.
					</p>
				</div>
				{academicYearOptions.length > 0 && (
					<select
						value={academicYear}
						onChange={(e) => setAcademicYear(e.target.value)}
						className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-primary"
					>
						{academicYearOptions.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				)}
			</div>

			{message && (
				<div
					className={`rounded-xl border p-4 text-sm font-medium ${
						message.type === 'success'
							? 'border-success-500/20 bg-success-500/10 text-success-600'
							: 'border-destructive/20 bg-destructive/10 text-destructive'
					}`}
				>
					{message.text}
				</div>
			)}

			{/* Scholarship cards */}
			<section className="space-y-3">
				<div className="flex items-center gap-2">
					<Award className="h-4 w-4 text-muted-foreground" />
					<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
						Configured Scholarships ({academicYear || '…'})
					</h2>
				</div>
				{loading ? (
					<div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-10 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" /> Loading…
					</div>
				) : scholarships.length === 0 ? (
					<div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
						No scholarships configured for{' '}
						{academicYear || 'this academic year'}.
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{scholarships.map((s) => {
							const badge = typeBadge(s);
							const BadgeIcon = badge.icon;
							const count = beneficiaryCount(s);
							return (
								<div
									key={s.id}
									className="rounded-xl border border-border bg-card p-4 shadow-sm"
								>
									<div className="flex items-start justify-between gap-2">
										<h3 className="font-semibold text-foreground">{s.name}</h3>
										<span
											className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}
										>
											<BadgeIcon className="h-3 w-3" />
											{s.scholarshipType}
										</span>
									</div>
									<p className="mt-1 text-sm font-bold text-primary">
										{scholarshipValue(s)}
									</p>
									{s.description && (
										<p className="mt-2 text-xs text-muted-foreground">
											{s.description}
										</p>
									)}
									<p className="mt-2 text-xs text-muted-foreground">
										Applies to:{' '}
										<span className="font-medium text-foreground">
											{appliesToLabel(s)}
										</span>
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										Beneficiaries:{' '}
										<span className="font-semibold text-foreground">{count}</span>
									</p>
								</div>
							);
						})}
					</div>
				)}
			</section>

			{/* Assignments */}
			<section className="grid gap-6 lg:grid-cols-2">
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Users className="h-4 w-4 text-muted-foreground" />
						<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
							Assign Scholarships
						</h2>
					</div>
					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search by name or ID..."
							className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
						/>
					</div>
					<div className="max-h-[50vh] divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card">
						{filteredStudents.length === 0 ? (
							<p className="p-4 text-center text-sm text-muted-foreground">
								No students found.
							</p>
						) : (
							filteredStudents.map((s) => {
								const assignedCount = (s.scholarships || []).length;
								return (
									<button
										key={s.studentId}
										onClick={() => handleSelectStudent(s)}
										className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
											selectedStudent?.studentId === s.studentId
												? 'bg-primary/5'
												: ''
										}`}
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium text-foreground">
												{s.firstName} {s.lastName}
											</p>
											<p className="truncate text-xs text-muted-foreground">
												{s.studentId} · {s.className || '—'}
											</p>
										</div>
										<div className="shrink-0 text-right text-xs text-muted-foreground">
											{assignedCount > 0 && (
												<p>
													<span className="font-semibold text-primary">
														{assignedCount}
													</span>{' '}
													assigned
												</p>
											)}
											{s.wardTeacherId && <p>Ward assigned</p>}
										</div>
									</button>
								);
							})
						)}
					</div>
				</div>

				{selectedStudent ? (
					<div className="space-y-4">
						<div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
							<div>
								<p className="font-semibold text-foreground">
									{selectedStudent.firstName} {selectedStudent.lastName}
								</p>
								<p className="text-xs text-muted-foreground">
									{selectedStudent.studentId} ·{' '}
									{selectedStudent.className || '—'}
								</p>
							</div>
							<button
								onClick={() => setSelectedStudent(null)}
								className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								aria-label="Close student panel"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						<div className="rounded-xl border border-border bg-card p-4">
							<h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
								<Award className="h-4 w-4 text-muted-foreground" />
								Assigned Scholarships
							</h3>
							{scholarships.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No scholarships defined for {academicYear}.
								</p>
							) : (
								<div className="space-y-2">
									{scholarships.map((s) => {
										const on = isAssigned(s);
										return (
											<label
												key={s.id}
												className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
													on
														? 'border-primary bg-primary/5'
														: 'border-border hover:bg-muted/50'
												}`}
											>
												<div className="min-w-0">
													<p className="text-sm font-medium text-foreground">
														{s.name}
													</p>
													<p className="text-xs text-muted-foreground">
														{scholarshipValue(s)}
													</p>
												</div>
												<input
													type="checkbox"
													checked={on}
													onChange={() => toggleScholarship(s.id)}
													className="h-4 w-4 shrink-0 rounded border-input text-primary focus:ring-primary"
												/>
											</label>
										);
									})}
								</div>
							)}
						</div>

						<div className="rounded-xl border border-border bg-card p-4">
							<h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
								<UserPlus className="h-4 w-4 text-muted-foreground" />
								Ward Teacher
							</h3>
							<input
								type="text"
								value={wardTeacherId}
								onChange={(e) => setWardTeacherId(e.target.value)}
								placeholder="Teacher ID..."
								className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
							/>
							<p className="mt-1 text-xs text-muted-foreground">
								Assign a teacher as the ward/sponsor for this student.
							</p>
						</div>

						<button
							onClick={handleSave}
							disabled={saving}
							className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
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
				) : (
					<div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
						<UserPlus className="h-6 w-6" />
						Select a student to manage scholarship assignments.
					</div>
				)}
			</section>
		</div>
	);
}
