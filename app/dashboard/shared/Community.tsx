'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import {
	Loader2,
	Search,
	X,
	GraduationCap,
	BookOpen,
	Briefcase,
	Phone,
	User,
	ChevronLeft,
	ChevronRight,
	Users,
} from 'lucide-react';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';
import {
	buildSchoolAcademicYearRange,
	pickMostRecentAcademicYear,
	sortAcademicYearsDesc,
} from '@/utils/academicYearOptions';

const getFullName = (user: any) =>
	user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();

// ─── Self-contained User Modal ────────────────────────────────────────────────

interface UserModalProps {
	user: any;
	roleFilter: 'student' | 'teacher' | 'administrator';
	getClassLabel: (u: any) => string;
	getTeacherSubjectsLabel: (u: any) => string;
	getAdministratorPositionForYear: (u: any) => string;
	onClose: () => void;
}

const UserModal = ({
	user,
	roleFilter,
	getClassLabel,
	getTeacherSubjectsLabel,
	getAdministratorPositionForYear,
	onClose,
}: UserModalProps) => {
	const name = getFullName(user);
	const avatar =
		user.avatar ||
		user.profilePictureUrl ||
		`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;

	const fields: { label: string; value: string }[] = [];

	if (roleFilter === 'student') {
		const cls = getClassLabel(user);
		if (cls) fields.push({ label: 'Class', value: cls });
		if (user.gender) fields.push({ label: 'Gender', value: user.gender });
		if (user.dateOfBirth)
			fields.push({ label: 'Date of Birth', value: user.dateOfBirth });
		if (user.address) fields.push({ label: 'Address', value: user.address });
	}

	if (roleFilter === 'teacher') {
		const subjects = getTeacherSubjectsLabel(user);
		if (subjects && subjects !== 'Assigned')
			fields.push({ label: 'Subjects', value: subjects });
		if (user.qualification)
			fields.push({ label: 'Qualification', value: user.qualification });
	}

	if (roleFilter === 'administrator') {
		const pos = getAdministratorPositionForYear(user);
		if (pos) fields.push({ label: 'Position', value: pos });
	}

	if (user.phone) fields.push({ label: 'Phone', value: user.phone });
	if (user.email) fields.push({ label: 'Email', value: user.email });

	const roleIcon =
		roleFilter === 'student' ? (
			<GraduationCap className="h-3.5 w-3.5" />
		) : roleFilter === 'teacher' ? (
			<BookOpen className="h-3.5 w-3.5" />
		) : (
			<Briefcase className="h-3.5 w-3.5" />
		);

	const roleLabel =
		roleFilter === 'student'
			? 'Student'
			: roleFilter === 'teacher'
				? 'Teacher'
				: getAdministratorPositionForYear(user) || 'Administrator';

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
		>
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Panel */}
			<div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
				{/* Header band */}
				<div className="relative h-24 bg-muted">
					<button
						type="button"
						onClick={onClose}
						className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground hover:bg-background/60 transition-colors"
						aria-label="Close"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Avatar — straddles header/body */}
				<div className="relative px-6 pb-4">
					<div className="-mt-12 mb-3">
						<img
							src={avatar}
							alt={name}
							className="h-20 w-20 rounded-2xl border-4 border-card object-cover shadow-md"
						/>
					</div>

					<div className="flex items-start justify-between gap-2">
						<div>
							<h3 className="text-lg font-semibold text-foreground leading-tight">
								{name}
							</h3>
							<span className="inline-flex items-center gap-1 mt-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
								{roleIcon}
								{roleLabel}
							</span>
						</div>
						{user.isActive !== undefined && (
							<span
								className={`mt-1 flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
									user.isActive
										? 'bg-green-500/10 text-green-600 dark:text-green-400'
										: 'bg-muted text-muted-foreground'
								}`}
							>
								<span
									className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-muted-foreground'}`}
								/>
								{user.isActive ? 'Active' : 'Inactive'}
							</span>
						)}
					</div>

					{fields.length > 0 && (
						<dl className="mt-4 space-y-2.5 border-t border-border pt-4">
							{fields.map(({ label, value }) => (
								<div key={label} className="flex gap-3">
									<dt className="w-24 flex-shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wide pt-0.5">
										{label}
									</dt>
									<dd className="text-sm text-foreground break-words">
										{value}
									</dd>
								</div>
							))}
						</dl>
					)}
				</div>
			</div>
		</div>
	);
};

// ─── Role Tab ─────────────────────────────────────────────────────────────────

interface RoleTabProps {
	role: 'student' | 'teacher' | 'administrator';
	active: boolean;
	count: number;
	viewerRole?: string;
	onClick: () => void;
}

const RoleTab = ({
	role,
	active,
	count,
	viewerRole,
	onClick,
}: RoleTabProps) => {
	const label =
		role === 'administrator'
			? 'Admins'
			: role === 'student' && viewerRole === 'student'
				? 'Classmates'
				: role === 'teacher'
					? 'Teachers'
					: 'Students';

	const Icon =
		role === 'student'
			? GraduationCap
			: role === 'teacher'
				? BookOpen
				: Briefcase;

	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-3 py-3 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
				active
					? 'bg-card shadow-sm ring-1 ring-border text-foreground'
					: 'text-muted-foreground hover:text-foreground hover:bg-card/50'
			}`}
		>
			<div className="flex items-center gap-1.5">
				<Icon className={`h-3.5 w-3.5 ${active ? 'text-primary' : ''}`} />
				<span className="text-xs font-semibold uppercase tracking-wide">
					{label}
				</span>
			</div>
			<span
				className={`text-xl font-bold leading-none tabular-nums ${
					active ? 'text-foreground' : 'text-muted-foreground/60'
				}`}
			>
				{count}
			</span>
		</button>
	);
};

// ─── Avatar Cell ──────────────────────────────────────────────────────────────

const AvatarCell = ({ user, onClick }: { user: any; onClick: () => void }) => {
	const name = getFullName(user);
	const src =
		user.avatar ||
		user.profilePictureUrl ||
		`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center gap-3 text-left group"
		>
			<img
				src={src}
				alt={name}
				className="h-9 w-9 rounded-xl object-cover ring-1 ring-border group-hover:ring-primary/50 transition-all flex-shrink-0"
			/>
			<span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-[180px]">
				{name}
			</span>
		</button>
	);
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Community = () => {
	const { user } = useAuth();
	const sessionUser = user as any;
	const schoolProfile = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);

	const [roleFilter, setRoleFilter] = useState<
		'student' | 'teacher' | 'administrator'
	>('student');
	const [academicYear, setAcademicYear] = useState('');
	const [classId, setClassId] = useState('');
	const [query, setQuery] = useState('');
	const [communityData, setCommunityData] = useState<{
		students: any[];
		teachers: any[];
		administrators: any[];
	}>({ students: [], teachers: [], administrators: [] });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [viewingUser, setViewingUser] = useState<any>(null);

	// ── Helpers ──────────────────────────────────────────────────────────────

	const getClassNameFromId = (id?: string) => {
		if (!id || !schoolProfile?.classLevels) return id || '';
		for (const session of Object.values(schoolProfile.classLevels)) {
			if (!session || typeof session !== 'object') continue;
			for (const level of Object.values(session)) {
				if (!level?.classes || !Array.isArray(level.classes)) continue;
				const found = level.classes.find((cls: any) => cls.classId === id);
				if (found) return found.name || id;
			}
		}
		return id || '';
	};

	const getStudentYearEntry = (student: any) => {
		if (!academicYear || !Array.isArray(student?.academicYears)) return null;
		return (
			student.academicYears.find((entry: any) =>
				areAcademicYearsEqual(entry?.year, academicYear),
			) || null
		);
	};

	const getStudentClassForYear = (student: any) => {
		const yearEntry = getStudentYearEntry(student);
		const cId =
			yearEntry?.classId ||
			student?.historicalClass?.classId ||
			student?.classId ||
			'';
		const className =
			yearEntry?.className ||
			student?.historicalClass?.className ||
			student?.className ||
			getClassNameFromId(cId);
		return { classId: cId, className };
	};

	const getAdministratorPositionForYear = (administrator: any) => {
		if (academicYear && Array.isArray(administrator?.academicYears)) {
			const yearEntry = administrator.academicYears.find((entry: any) =>
				areAcademicYearsEqual(entry?.year, academicYear),
			);
			if (yearEntry?.position) return yearEntry.position;
		}
		return administrator?.position || 'Administrator';
	};

	// ── Year / class options ──────────────────────────────────────────────────

	const availableYears = useMemo(() => {
		if (!sessionUser) return [];
		if (
			Array.isArray(sessionUser.allowedAcademicYears) &&
			sessionUser.allowedAcademicYears.length > 0
		) {
			return sortAcademicYearsDesc(sessionUser.allowedAcademicYears);
		}
		if (sessionUser.role === 'student') {
			return sortAcademicYearsDesc(
				(sessionUser.academicYears || []).map((ay: any) => ay.year),
			);
		}
		if (sessionUser.role === 'teacher') {
			return sortAcademicYearsDesc(
				(sessionUser.subjects || []).map((s: any) => s.year),
			);
		}
		if (sessionUser.role === 'administrator') {
			return sortAcademicYearsDesc(
				(sessionUser.academicYears || []).map((ay: any) => ay.year),
			);
		}
		if (sessionUser.role === 'system_admin') {
			return buildSchoolAcademicYearRange(schoolProfile || undefined);
		}
		return sortAcademicYearsDesc([]);
	}, [sessionUser, schoolProfile]);

	const defaultAcademicYear = useMemo(() => {
		const schoolCurrentAcademicYear = String(
			schoolProfile?.currentAcademicYear || '',
		).trim();
		if (sessionUser?.role === 'system_admin') {
			return (
				schoolCurrentAcademicYear ||
				pickMostRecentAcademicYear(availableYears, schoolCurrentAcademicYear) ||
				''
			);
		}
		return pickMostRecentAcademicYear(availableYears, null) || '';
	}, [availableYears, schoolProfile?.currentAcademicYear, sessionUser?.role]);

	const availableClasses = useMemo(() => {
		if (!sessionUser || sessionUser.role !== 'teacher' || !academicYear)
			return [];
		const yearData = (sessionUser.subjects || []).find((s: any) =>
			areAcademicYearsEqual(s.year, academicYear),
		);
		return (yearData?.classes || []).map((c: any) => c.classId);
	}, [sessionUser, academicYear]);

	// ── Effects ───────────────────────────────────────────────────────────────

	useEffect(() => {
		if (sessionUser?.role !== 'teacher') return;
		if (!classId) return;
		if (!availableClasses.includes(classId)) setClassId('');
	}, [sessionUser?.role, availableClasses, classId]);

	useEffect(() => {
		if (user?.role === 'student') setRoleFilter('student');
	}, [user?.role]);

	useEffect(() => {
		const selectedIsAvailable = availableYears.some((year) =>
			areAcademicYearsEqual(year, academicYear),
		);
		if (!academicYear || !selectedIsAvailable) {
			setAcademicYear(defaultAcademicYear);
		}
	}, [academicYear, availableYears, defaultAcademicYear]);

	useEffect(() => {
		const fetchCommunity = async () => {
			if (!academicYear) return;
			const cachedUsers = getScopedAcademicYearValue(
				usersByAcademicYear,
				academicYear,
			).value;
			if (cachedUsers) {
				setCommunityData({
					students: cachedUsers.students || [],
					teachers: cachedUsers.teachers || [],
					administrators: cachedUsers.administrators || [],
				});
				return;
			}
			const cacheKey = `community:${academicYear}`;
			const cached = getClientCache<{
				students: any[];
				teachers: any[];
				administrators: any[];
			}>(cacheKey);
			if (cached) {
				setCommunityData(cached);
				return;
			}
			setLoading(true);
			setError('');
			try {
				const params = new URLSearchParams();
				params.set('academicYear', academicYear);
				const res = await fetch(`/api/users?${params.toString()}`);
				const data = await res.json();
				if (!res.ok)
					throw new Error(data.message || 'Failed to load community.');
				const payload = {
					students: Array.isArray(data.data?.students)
						? data.data.students
						: [],
					teachers: Array.isArray(data.data?.teachers)
						? data.data.teachers
						: [],
					administrators: Array.isArray(data.data?.administrators)
						? data.data.administrators
						: [],
				};
				setClientCache(cacheKey, payload);
				setUsersForYear(academicYear, payload, { merge: true });
				setCommunityData(payload);
			} catch (err: any) {
				setError(err.message || 'Failed to load community.');
			} finally {
				setLoading(false);
			}
		};
		fetchCommunity();
	}, [academicYear, setUsersForYear, usersByAcademicYear]);

	useEffect(() => {
		setCurrentPage(1);
	}, [
		roleFilter,
		academicYear,
		classId,
		query,
		communityData.students.length,
		communityData.teachers.length,
		communityData.administrators.length,
	]);

	// ── Derived display helpers ───────────────────────────────────────────────

	const getClassLabel = (u: any) => {
		const { className, classId: cId } = getStudentClassForYear(u);
		return className || getClassNameFromId(cId) || cId || '';
	};

	const getCurrentStudentClassIdForYear = () => {
		if (sessionUser?.role !== 'student' || !academicYear) return '';
		const yearEntry = Array.isArray(sessionUser.academicYears)
			? sessionUser.academicYears.find((ay: any) =>
					areAcademicYearsEqual(ay.year, academicYear),
				)
			: null;
		return yearEntry?.classId || sessionUser?.classId || '';
	};

	const getTeacherSubjectsLabel = (u: any) => {
		let subjects: string[] = [];
		const rawSubjects = Array.isArray(u.subjects) ? u.subjects : [];
		const hasStructuredSubjects = rawSubjects.some(
			(s: any) =>
				s &&
				typeof s === 'object' &&
				('year' in s || Array.isArray((s as any).classes)),
		);

		if (roleFilter === 'teacher' && user?.role === 'student') {
			if (hasStructuredSubjects) {
				const yearData = rawSubjects.find((s: any) =>
					areAcademicYearsEqual(s.year, academicYear),
				);
				const currentStudentClassId = getCurrentStudentClassIdForYear();
				const matchingClasses = (yearData?.classes || []).filter(
					(c: any) =>
						!currentStudentClassId || c.classId === currentStudentClassId,
				);
				subjects = matchingClasses.flatMap((c: any) => c.subjects || []);
			} else {
				subjects = rawSubjects
					.map((s: any) => (typeof s === 'string' ? s : s?.subject))
					.filter(Boolean);
			}
		} else {
			if (hasStructuredSubjects) {
				const yearData = rawSubjects.find((s: any) =>
					areAcademicYearsEqual(s.year, academicYear),
				);
				const classes = yearData?.classes || [];
				subjects = classes.flatMap((c: any) => c.subjects || []);
			} else {
				subjects = rawSubjects
					.map((s: any) => (typeof s === 'string' ? s : s?.subject))
					.filter(Boolean);
			}
		}

		const uniqueSubjects = Array.from(
			new Set(
				subjects
					.map((s) => String(s).trim())
					.filter((value) => value.length > 0),
			),
		);
		return uniqueSubjects.length > 0 ? uniqueSubjects.join(', ') : 'Assigned';
	};

	// ── Filtered / paginated lists ────────────────────────────────────────────

	const filteredUsers = useMemo(() => {
		let list =
			roleFilter === 'student'
				? communityData.students
				: roleFilter === 'teacher'
					? communityData.teachers
					: communityData.administrators;

		if (roleFilter === 'student' && classId) {
			list = list.filter(
				(u: any) => getStudentClassForYear(u).classId === classId,
			);
		}

		if (!query.trim()) {
			return list
				.slice()
				.sort((a, b) => getFullName(a).localeCompare(getFullName(b)));
		}

		const lowered = query.toLowerCase();
		return list
			.filter((u) => {
				const name = getFullName(u).toLowerCase();
				const phone = String(u.phone || '').toLowerCase();
				const subjects =
					roleFilter === 'teacher'
						? String(getTeacherSubjectsLabel(u)).toLowerCase()
						: '';
				const classLabel =
					roleFilter === 'student'
						? String(getClassLabel(u)).toLowerCase()
						: '';
				const position = String(u.position || '').toLowerCase();
				const adminPosition = String(
					roleFilter === 'administrator'
						? getAdministratorPositionForYear(u)
						: '',
				).toLowerCase();
				return (
					name.includes(lowered) ||
					phone.includes(lowered) ||
					subjects.includes(lowered) ||
					classLabel.includes(lowered) ||
					position.includes(lowered) ||
					adminPosition.includes(lowered)
				);
			})
			.sort((a, b) => getFullName(a).localeCompare(getFullName(b)));
	}, [communityData, roleFilter, classId, query, user?.role, academicYear]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredUsers.length / itemsPerPage),
	);
	const paginatedUsers = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredUsers, currentPage, itemsPerPage]);

	// ── Column headers ────────────────────────────────────────────────────────

	const renderSubheader = () => {
		if (roleFilter === 'student')
			return (
				<>
					<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Class
					</th>
					<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Gender
					</th>
				</>
			);
		if (roleFilter === 'teacher')
			return (
				<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Subjects
				</th>
			);
		return (
			<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				Position
			</th>
		);
	};

	const renderRowCells = (u: any) => {
		if (roleFilter === 'student')
			return (
				<>
					<td className="px-4 py-3 text-sm text-muted-foreground">
						{getClassLabel(u) || <span className="text-border">—</span>}
					</td>
					<td className="px-4 py-3 text-sm text-muted-foreground capitalize">
						{u.gender || <span className="text-border">—</span>}
					</td>
				</>
			);
		if (roleFilter === 'teacher')
			return (
				<td className="px-4 py-3 text-sm text-muted-foreground max-w-xs">
					<span className="line-clamp-1">{getTeacherSubjectsLabel(u)}</span>
				</td>
			);
		return (
			<td className="px-4 py-3 text-sm text-muted-foreground">
				{getAdministratorPositionForYear(u)}
			</td>
		);
	};

	const subtitle =
		user?.role === 'student'
			? 'Browse classmates, teachers, and administrators.'
			: 'Browse students, fellow teachers, and administrators.';

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className="flex flex-col gap-6 px-4 sm:px-6 lg:px-8">
			{/* Page header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<div className="flex items-center gap-2 mb-1">
						<Users className="h-5 w-5 text-primary" />
						<h2 className="text-2xl font-bold tracking-tight text-foreground">
							Community
						</h2>
					</div>
					<p className="text-sm text-muted-foreground">{subtitle}</p>
				</div>

				{/* Controls row */}
				<div className="flex flex-wrap items-center gap-2">
					{/* Search */}
					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search…"
							className="h-9 w-48 sm:w-56 rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
						{query && (
							<button
								type="button"
								onClick={() => setQuery('')}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						)}
					</div>

					{/* Year selector */}
					{availableYears.length > 1 && (
						<select
							value={academicYear}
							onChange={(e) => setAcademicYear(e.target.value)}
							className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
						>
							{availableYears.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
					)}

					{/* Class filter (teachers only) */}
					{user?.role === 'teacher' && roleFilter === 'student' && (
						<select
							value={classId}
							onChange={(e) => setClassId(e.target.value)}
							className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
						>
							<option value="">All Classes</option>
							{availableClasses.map((id: string) => (
								<option key={id} value={id}>
									{getClassNameFromId(id)}
								</option>
							))}
						</select>
					)}
				</div>
			</div>

			{/* Role tabs — live count badges */}
			<div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-muted/40 p-1.5">
				{(['student', 'teacher', 'administrator'] as const).map((role) => (
					<RoleTab
						key={role}
						role={role}
						active={roleFilter === role}
						count={
							role === 'student'
								? communityData.students.length
								: role === 'teacher'
									? communityData.teachers.length
									: communityData.administrators.length
						}
						viewerRole={user?.role}
						onClick={() => setRoleFilter(role)}
					/>
				))}
			</div>

			{/* Table card */}
			<div className="rounded-xl border border-border bg-card overflow-hidden">
				{/* Table toolbar */}
				<div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
					<p className="text-sm text-muted-foreground">
						<span className="font-semibold text-foreground tabular-nums">
							{filteredUsers.length}
						</span>{' '}
						{filteredUsers.length === 1 ? 'result' : 'results'}
						{query ? (
							<span className="ml-1 text-xs">
								for <em className="not-italic font-medium">"{query}"</em>
							</span>
						) : null}
					</p>
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">Show</span>
						<select
							value={itemsPerPage}
							onChange={(e) => {
								setItemsPerPage(Number(e.target.value));
								setCurrentPage(1);
							}}
							className="h-7 rounded border border-border bg-background px-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
						>
							<option value={5}>5</option>
							<option value={10}>10</option>
							<option value={20}>20</option>
						</select>
					</div>
				</div>

				{/* Table */}
				<div className="overflow-auto max-h-[60vh]">
					<table className="w-full border-collapse text-sm">
						<thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
							<tr className="border-b border-border">
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[220px]">
									Name
								</th>
								{renderSubheader()}
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[150px]">
									Phone
								</th>
							</tr>
						</thead>

						<tbody>
							{/* Loading */}
							{loading && (
								<tr>
									<td
										colSpan={roleFilter === 'student' ? 5 : 4}
										className="py-16"
									>
										<div className="flex flex-col items-center gap-3 text-muted-foreground">
											<Loader2 className="h-7 w-7 animate-spin text-primary/60" />
											<span className="text-sm">Loading…</span>
										</div>
									</td>
								</tr>
							)}

							{/* Error */}
							{!loading && error && (
								<tr>
									<td
										colSpan={roleFilter === 'student' ? 5 : 4}
										className="py-12 text-center text-sm text-destructive"
									>
										{error}
									</td>
								</tr>
							)}

							{/* Empty */}
							{!loading && !error && filteredUsers.length === 0 && (
								<tr>
									<td
										colSpan={roleFilter === 'student' ? 5 : 4}
										className="py-16 text-center"
									>
										<div className="flex flex-col items-center gap-2 text-muted-foreground">
											<User className="h-8 w-8 opacity-30" />
											<span className="text-sm">No users found.</span>
										</div>
									</td>
								</tr>
							)}

							{/* Rows */}
							{!loading &&
								!error &&
								paginatedUsers.map((u) => (
									<tr
										key={u.id || u._id}
										className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
									>
										<td className="px-4 py-3">
											<AvatarCell user={u} onClick={() => setViewingUser(u)} />
										</td>
										{renderRowCells(u)}
										<td className="px-4 py-3 text-sm text-muted-foreground">
											{u.phone ? (
												<span className="inline-flex items-center gap-1.5">
													<Phone className="h-3.5 w-3.5 opacity-40" />
													{u.phone}
												</span>
											) : (
												<span className="text-border">—</span>
											)}
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				<div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
					<p className="text-xs text-muted-foreground tabular-nums">
						Page {currentPage} of {totalPages}
					</p>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
							className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>

						{/* Page number pills */}
						{Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
							const page =
								totalPages <= 5
									? i + 1
									: currentPage <= 3
										? i + 1
										: currentPage >= totalPages - 2
											? totalPages - 4 + i
											: currentPage - 2 + i;
							return (
								<button
									key={page}
									type="button"
									onClick={() => setCurrentPage(page)}
									className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
										page === currentPage
											? 'bg-primary text-primary-foreground shadow-sm'
											: 'border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
									}`}
								>
									{page}
								</button>
							);
						})}

						<button
							type="button"
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
							className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
						>
							<ChevronRight className="h-4 w-4" />
						</button>
					</div>
				</div>
			</div>

			{/* Self-contained modal */}
			{viewingUser && (
				<UserModal
					user={viewingUser}
					roleFilter={roleFilter}
					getClassLabel={getClassLabel}
					getTeacherSubjectsLabel={getTeacherSubjectsLabel}
					getAdministratorPositionForYear={getAdministratorPositionForYear}
					onClose={() => setViewingUser(null)}
				/>
			)}
		</div>
	);
};

export default Community;
