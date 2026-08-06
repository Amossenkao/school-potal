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
	Mail,
	User,
	ChevronLeft,
	ChevronRight,
	Users,
	LayoutGrid,
	Rows3,
	AlertCircle,
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

/**
 * The school directory.
 *
 * People are the subject here, so the default view is a card grid rather than a
 * table — a face and a name read faster than a row. The list view is kept for
 * scanning many people at once, where density beats recognition.
 *
 * Both views draw from the same filtered, paginated list, so switching never
 * changes who is on screen.
 */

type RoleKey = 'student' | 'teacher' | 'administrator';

const ROLE_KEYS: RoleKey[] = ['student', 'teacher', 'administrator'];

const ROLE_ICON: Record<RoleKey, typeof GraduationCap> = {
	student: GraduationCap,
	teacher: BookOpen,
	administrator: Briefcase,
};

const getFullName = (user: any) =>
	user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();

const avatarFor = (user: any, size = 128) =>
	user.avatar ||
	user.profilePictureUrl ||
	`https://ui-avatars.com/api/?name=${encodeURIComponent(
		getFullName(user),
	)}&background=random&size=${size}`;

/** Section letter a person files under. Anything unnamed sorts last, under #. */
const initialOf = (user: any) => {
	const letter = getFullName(user).trim().charAt(0).toUpperCase();
	return /[A-Z]/.test(letter) ? letter : '#';
};

const roleLabelFor = (role: RoleKey, viewerRole?: string) => {
	if (role === 'administrator') return 'Admins';
	if (role === 'teacher') return 'Teachers';
	return viewerRole === 'student' ? 'Classmates' : 'Students';
};

// ─── Profile panel ────────────────────────────────────────────────────────────

interface UserModalProps {
	user: any;
	roleFilter: RoleKey;
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
	const avatar = avatarFor(user);

	// Escape closes, and the page behind must not scroll while this is up.
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = previousOverflow;
		};
	}, [onClose]);

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

	const RoleIcon = ROLE_ICON[roleFilter];
	const roleLabel =
		roleFilter === 'student'
			? 'Student'
			: roleFilter === 'teacher'
				? 'Teacher'
				: getAdministratorPositionForYear(user) || 'Administrator';

	return (
		<div
			className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
			role="dialog"
			aria-modal="true"
			aria-label={`${name} profile`}
		>
			<div
				className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
				onClick={onClose}
			/>

			<div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl duration-200 animate-in fade-in slide-in-from-bottom-4 sm:rounded-3xl sm:zoom-in-95 sm:slide-in-from-bottom-0">
				{/* Banner. The avatar overlaps it, so the eye lands on the face first. */}
				<div className="relative h-28 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent">
					<div
						className="absolute inset-0 opacity-[0.07]"
						style={{
							backgroundImage:
								'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
							backgroundSize: '12px 12px',
						}}
					/>
					<button
						type="button"
						onClick={onClose}
						className="absolute right-3 top-3 rounded-full bg-background/70 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
						aria-label="Close"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				<div className="px-6 pb-6">
					<div className="-mt-14 mb-4 flex items-end justify-between gap-3">
						<img
							src={avatar}
							alt={name}
							className="h-24 w-24 rounded-3xl border-4 border-card object-cover shadow-lg"
						/>
						{user.isActive !== undefined && (
							<span
								className={`mb-1 inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
									user.isActive
										? 'bg-green-500/10 text-green-600 dark:text-green-400'
										: 'bg-muted text-muted-foreground'
								}`}
							>
								<span
									className={`h-1.5 w-1.5 rounded-full ${
										user.isActive ? 'bg-green-500' : 'bg-muted-foreground'
									}`}
								/>
								{user.isActive ? 'Active' : 'Inactive'}
							</span>
						)}
					</div>

					<h3 className="text-xl font-bold leading-tight tracking-tight text-foreground">
						{name}
					</h3>
					<span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
						<RoleIcon className="h-3.5 w-3.5" />
						{roleLabel}
					</span>

					{fields.length > 0 && (
						<dl className="mt-5 space-y-0 divide-y divide-border rounded-2xl border border-border bg-muted/30">
							{fields.map(({ label, value }) => (
								<div
									key={label}
									className="flex gap-3 px-4 py-2.5 first:rounded-t-2xl last:rounded-b-2xl"
								>
									<dt className="w-24 flex-shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
										{label}
									</dt>
									<dd className="break-words text-sm font-medium text-foreground">
										{value}
									</dd>
								</div>
							))}
						</dl>
					)}

					{/* Contact routes, actionable rather than merely printed. */}
					{(user.phone || user.email) && (
						<div className="mt-4 flex flex-wrap gap-2">
							{user.phone && (
								<a
									href={`tel:${user.phone}`}
									className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
								>
									<Phone className="h-4 w-4 text-primary" />
									Call
								</a>
							)}
							{user.email && (
								<a
									href={`mailto:${user.email}`}
									className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
								>
									<Mail className="h-4 w-4 text-primary" />
									Email
								</a>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

// ─── Role selector ────────────────────────────────────────────────────────────

const RolePill = ({
	role,
	active,
	count,
	viewerRole,
	onClick,
}: {
	role: RoleKey;
	active: boolean;
	count: number;
	viewerRole?: string;
	onClick: () => void;
}) => {
	const Icon = ROLE_ICON[role];
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={`group relative flex flex-1 items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
				active
					? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
					: 'bg-card text-muted-foreground ring-1 ring-border hover:bg-muted/60 hover:text-foreground'
			}`}
		>
			<span
				className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
					active ? 'bg-primary-foreground/15' : 'bg-muted'
				}`}
			>
				<Icon className="h-4 w-4" />
			</span>
			<span className="min-w-0">
				<span className="block truncate text-[11px] font-bold uppercase tracking-wider opacity-80">
					{roleLabelFor(role, viewerRole)}
				</span>
				<span className="block text-lg font-black leading-none tabular-nums">
					{count}
				</span>
			</span>
		</button>
	);
};

// ─── Person card ──────────────────────────────────────────────────────────────

const PersonCard = ({
	user,
	meta,
	onClick,
}: {
	user: any;
	meta: string;
	onClick: () => void;
}) => {
	const name = getFullName(user);
	return (
		<button
			type="button"
			onClick={onClick}
			className="group flex h-full flex-col rounded-2xl border border-border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
		>
			<div className="flex items-start gap-3">
				<img
					src={avatarFor(user, 96)}
					alt={name}
					className="h-12 w-12 flex-shrink-0 rounded-xl object-cover ring-1 ring-border transition-all group-hover:ring-primary/50"
				/>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-primary">
						{name}
					</p>
					{meta ? (
						<p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
							{meta}
						</p>
					) : (
						<p className="mt-0.5 text-xs text-muted-foreground/50">—</p>
					)}
				</div>
			</div>

			<div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
				{user.phone ? (
					<span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
						<Phone className="h-3 w-3 flex-shrink-0 opacity-50" />
						<span className="truncate tabular-nums">{user.phone}</span>
					</span>
				) : (
					<span className="text-xs text-muted-foreground/40">No phone</span>
				)}
				{user.isActive === false && (
					<span className="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
						Inactive
					</span>
				)}
			</div>
		</button>
	);
};

// ─── Main component ───────────────────────────────────────────────────────────

const Community = () => {
	const { user } = useAuth();
	const sessionUser = user as any;
	const schoolProfile = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);

	const [roleFilter, setRoleFilter] = useState<RoleKey>('student');
	const [academicYear, setAcademicYear] = useState('');
	const [classId, setClassId] = useState('');
	const [query, setQuery] = useState('');
	const [view, setView] = useState<'grid' | 'list'>('grid');
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
		if (!id || !schoolProfile?.academicConfig?.classLevels) return id || '';
		for (const session of Object.values(
			schoolProfile.academicConfig?.classLevels || {},
		)) {
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
			return buildSchoolAcademicYearRange(schoolProfile);
		}
		return sortAcademicYearsDesc([]);
	}, [sessionUser, schoolProfile]);

	const defaultAcademicYear = useMemo(() => {
		const schoolCurrentAcademicYear = String(
			schoolProfile?.identity?.currentAcademicYear || '',
		).trim();
		if (sessionUser?.role === 'system_admin') {
			return (
				schoolCurrentAcademicYear ||
				pickMostRecentAcademicYear(availableYears, schoolCurrentAcademicYear) ||
				''
			);
		}
		return pickMostRecentAcademicYear(availableYears, null) || '';
	}, [
		availableYears,
		schoolProfile?.identity?.currentAcademicYear,
		sessionUser?.role,
	]);

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

	/** The one line under a name that says who this person is in this view. */
	const metaFor = (u: any) => {
		if (roleFilter === 'student') {
			return [getClassLabel(u), u.gender].filter(Boolean).join(' · ');
		}
		if (roleFilter === 'teacher') return getTeacherSubjectsLabel(u);
		return getAdministratorPositionForYear(u);
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

	/** The page's people cut into alphabetical runs, in order. */
	const letterSections = useMemo(() => {
		const sections: { letter: string; people: any[] }[] = [];
		for (const person of paginatedUsers) {
			const letter = initialOf(person);
			const last = sections[sections.length - 1];
			if (last && last.letter === letter) last.people.push(person);
			else sections.push({ letter, people: [person] });
		}
		return sections;
	}, [paginatedUsers]);

	/**
	 * List view keeps a column per attribute, the way the table always did —
	 * density is the reason to choose it. The card view is where Class and
	 * Gender collapse into one line, because a card has no columns to align.
	 */
	const listColumns: {
		label: string;
		value: (u: any) => string;
		capitalize?: boolean;
	}[] =
		roleFilter === 'student'
			? [
					{ label: 'Class', value: (u) => getClassLabel(u) },
					{ label: 'Gender', value: (u) => u.gender || '', capitalize: true },
				]
			: roleFilter === 'teacher'
				? [{ label: 'Subjects', value: (u) => getTeacherSubjectsLabel(u) }]
				: [
						{
							label: 'Position',
							value: (u) => getAdministratorPositionForYear(u),
						},
					];

	const subtitle =
		user?.role === 'student'
			? 'Browse classmates, teachers, and administrators.'
			: 'Browse students, fellow teachers, and administrators.';

	const showState = loading || error || filteredUsers.length === 0;

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
			{/* ── Masthead: identity, search, and the role switch together ── */}
			<section className="relative overflow-hidden rounded-3xl border border-border bg-card">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent" />
				<div
					className="absolute inset-0 opacity-[0.05]"
					style={{
						backgroundImage:
							'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
						backgroundSize: '14px 14px',
					}}
				/>

				<div className="relative p-5 sm:p-6">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div className="min-w-0">
							<div className="mb-1 flex items-center gap-2">
								<span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
									<Users className="h-4 w-4 text-primary" />
								</span>
								<h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
									Community
								</h2>
							</div>
							<p className="text-sm text-muted-foreground">{subtitle}</p>
						</div>

						{/* Search leads — it is how most people find one person. */}
						<div className="relative w-full lg:max-w-sm">
							<Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<input
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search by name, phone, class…"
								aria-label="Search the directory"
								className="h-11 w-full rounded-2xl border border-border bg-background/80 pl-10 pr-9 text-sm shadow-sm backdrop-blur placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
							/>
							{query && (
								<button
									type="button"
									onClick={() => setQuery('')}
									aria-label="Clear search"
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</div>
					</div>

					<div className="mt-5 flex flex-col gap-2 sm:flex-row">
						{ROLE_KEYS.map((role) => (
							<RolePill
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
				</div>
			</section>

			{/* ── Toolbar: what is on screen, and how it is shown ── */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
				<p className="text-sm text-muted-foreground">
					<span className="font-bold tabular-nums text-foreground">
						{filteredUsers.length}
					</span>{' '}
					{filteredUsers.length === 1 ? 'person' : 'people'}
					{query ? (
						<span className="ml-1 text-xs">
							matching <em className="font-medium not-italic">“{query}”</em>
						</span>
					) : null}
				</p>

				<div className="flex flex-wrap items-center gap-2">
					{availableYears.length > 1 && (
						<select
							value={academicYear}
							onChange={(e) => setAcademicYear(e.target.value)}
							aria-label="Academic year"
							className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
						>
							{availableYears.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
					)}

					{user?.role === 'teacher' && roleFilter === 'student' && (
						<select
							value={classId}
							onChange={(e) => setClassId(e.target.value)}
							aria-label="Class"
							className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
						>
							<option value="">All Classes</option>
							{availableClasses.map((id: string) => (
								<option key={id} value={id}>
									{getClassNameFromId(id)}
								</option>
							))}
						</select>
					)}

					<select
						value={itemsPerPage}
						onChange={(e) => {
							setItemsPerPage(Number(e.target.value));
							setCurrentPage(1);
						}}
						aria-label="People per page"
						className="h-9 rounded-xl border border-border bg-background px-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
					>
						<option value={5}>5</option>
						<option value={10}>10</option>
						<option value={20}>20</option>
					</select>

					{/* Cards to recognise a face, rows to scan many at once. */}
					<div className="flex items-center gap-0.5 rounded-xl border border-border bg-background p-0.5">
						{(
							[
								['grid', LayoutGrid, 'Card view'],
								['list', Rows3, 'List view'],
							] as const
						).map(([key, Icon, label]) => (
							<button
								key={key}
								type="button"
								onClick={() => setView(key)}
								aria-label={label}
								aria-pressed={view === key}
								className={`rounded-lg p-2 transition-colors ${
									view === key
										? 'bg-primary text-primary-foreground'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<Icon className="h-4 w-4" />
							</button>
						))}
					</div>
				</div>
			</div>

			{/* ── People ── */}
			{showState ? (
				<div className="rounded-2xl border border-dashed border-border bg-card px-4 py-20">
					{loading ? (
						<div className="flex flex-col items-center gap-3 text-muted-foreground">
							<Loader2 className="h-8 w-8 animate-spin text-primary/60" />
							<span className="text-sm font-medium">Loading directory…</span>
						</div>
					) : error ? (
						<div className="flex flex-col items-center gap-2 text-center">
							<AlertCircle className="h-8 w-8 text-destructive/60" />
							<p className="text-sm font-semibold text-destructive">{error}</p>
						</div>
					) : (
						<div className="flex flex-col items-center gap-2 text-center">
							<User className="h-9 w-9 text-muted-foreground/30" />
							<p className="text-sm font-bold text-foreground">
								Nobody to show
							</p>
							<p className="max-w-xs text-xs text-muted-foreground">
								{query
									? 'No one matches that search. Try a different name or clear the search.'
									: 'There are no people in this part of the directory yet.'}
							</p>
						</div>
					)}
				</div>
			) : view === 'grid' ? (
				<div className="flex flex-col gap-5">
					{letterSections.map((section) => (
						<section key={section.letter}>
							{/* The letter doubles as a rule across the page. */}
							<div className="mb-2.5 flex items-center gap-3">
								<span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary">
									{section.letter}
								</span>
								<span className="h-px flex-1 bg-border" />
							</div>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
								{section.people.map((u) => (
									<PersonCard
										key={u.id || u._id}
										user={u}
										meta={metaFor(u)}
										onClick={() => setViewingUser(u)}
									/>
								))}
							</div>
						</section>
					))}
				</div>
			) : (
				<div className="overflow-hidden rounded-2xl border border-border bg-card">
					<div className="overflow-auto">
						<table className="w-full border-collapse text-sm">
							<thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
								<tr className="border-b border-border">
									<th className="min-w-[220px] px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
										Name
									</th>
									{listColumns.map((column) => (
										<th
											key={column.label}
											className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground"
										>
											{column.label}
										</th>
									))}
									<th className="min-w-[150px] px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
										Phone
									</th>
								</tr>
							</thead>
							<tbody>
								{paginatedUsers.map((u) => (
									<tr
										key={u.id || u._id}
										onClick={() => setViewingUser(u)}
										className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
									>
										<td className="px-4 py-2.5">
											<span className="flex items-center gap-3">
												<img
													src={avatarFor(u, 96)}
													alt={getFullName(u)}
													className="h-9 w-9 flex-shrink-0 rounded-xl object-cover ring-1 ring-border"
												/>
												<span className="truncate text-sm font-semibold text-foreground">
													{getFullName(u)}
												</span>
											</span>
										</td>
										{listColumns.map((column) => {
											const content = column.value(u);
											return (
												<td
													key={column.label}
													className="max-w-xs px-4 py-2.5 text-sm text-muted-foreground"
												>
													{content ? (
														<span
															className={`line-clamp-1 ${column.capitalize ? 'capitalize' : ''}`}
														>
															{content}
														</span>
													) : (
														<span className="text-muted-foreground/40">—</span>
													)}
												</td>
											);
										})}
										<td className="px-4 py-2.5 text-sm text-muted-foreground">
											{u.phone ? (
												<span className="inline-flex items-center gap-1.5 tabular-nums">
													<Phone className="h-3.5 w-3.5 opacity-40" />
													{u.phone}
												</span>
											) : (
												<span className="text-muted-foreground/40">—</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* ── Pagination ── */}
			{!showState && totalPages > 1 && (
				<div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3">
					<p className="text-xs font-medium tabular-nums text-muted-foreground">
						Page {currentPage} of {totalPages}
					</p>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
							aria-label="Previous page"
							className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>

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
									aria-current={page === currentPage ? 'page' : undefined}
									className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
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
							aria-label="Next page"
							className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
						>
							<ChevronRight className="h-4 w-4" />
						</button>
					</div>
				</div>
			)}

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
