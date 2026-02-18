'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { Loader2, Search } from 'lucide-react';
import ViewUserModal from '@/components/modals/ViewUserModal';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import { areAcademicYearsEqual, getScopedAcademicYearValue } from '@/utils/academicYear';
import {
	buildSchoolAcademicYearRange,
	pickMostRecentAcademicYear,
	sortAcademicYearsDesc,
} from '@/utils/academicYearOptions';

const getFullName = (user: any) =>
	`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';

const Community = () => {
	const { user } = useAuth();
	const sessionUser = user as any;
	const schoolProfile = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
	const [roleFilter, setRoleFilter] = useState<'student' | 'teacher' | 'administrator'>(
		'student',
	);
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
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const [isViewLoading, setIsViewLoading] = useState(false);

	const tabOrder = ['student', 'teacher', 'administrator'] as const;
	const tabIndex = tabOrder.indexOf(roleFilter);

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
		return (
			pickMostRecentAcademicYear(availableYears, null) ||
			''
		);
	}, [availableYears, schoolProfile?.currentAcademicYear, sessionUser?.role]);

	const availableClasses = useMemo(() => {
		if (!sessionUser || sessionUser.role !== 'teacher' || !academicYear) return [];
		const yearData = (sessionUser.subjects || []).find((s: any) =>
			areAcademicYearsEqual(s.year, academicYear),
		);
		return (yearData?.classes || []).map((c: any) => c.classId);
	}, [sessionUser, academicYear]);

	useEffect(() => {
		if (sessionUser?.role !== 'teacher') return;
		if (!classId) return;
		if (!availableClasses.includes(classId)) {
			setClassId('');
		}
	}, [sessionUser?.role, availableClasses, classId]);

	useEffect(() => {
		if (user?.role === 'student') {
			setRoleFilter('student');
		}
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
				if (!res.ok) {
					throw new Error(data.message || 'Failed to load community.');
				}
				const payload = {
					students: Array.isArray(data.data?.students) ? data.data.students : [],
					teachers: Array.isArray(data.data?.teachers) ? data.data.teachers : [],
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

	const getClassLabel = (u: any) =>
		u.className || getClassNameFromId(u.classId) || u.classId || '';

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
					(c: any) => !currentStudentClassId || c.classId === currentStudentClassId,
				);
				subjects = matchingClasses.flatMap((c: any) => c.subjects || []);
			} else {
				// Student API can already return class-specific subjects as plain strings.
				subjects = rawSubjects
					.map((s: any) => (typeof s === 'string' ? s : s?.subject))
					.filter(Boolean);
			}
		} else if (roleFilter === 'teacher' && user?.role === 'teacher') {
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

	const filteredUsers = useMemo(() => {
		let list =
			roleFilter === 'student'
				? communityData.students
				: roleFilter === 'teacher'
					? communityData.teachers
					: communityData.administrators;

		if (roleFilter === 'student' && classId) {
			list = list.filter((u: any) => u.classId === classId);
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
				return (
					name.includes(lowered) ||
					phone.includes(lowered) ||
					subjects.includes(lowered) ||
					classLabel.includes(lowered) ||
					position.includes(lowered)
				);
			})
			.sort((a, b) => getFullName(a).localeCompare(getFullName(b)));
	}, [communityData, roleFilter, classId, query, user?.role, academicYear]);

	const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
	const paginatedUsers = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredUsers, currentPage, itemsPerPage]);

	const handleOpenUser = async (target: any) => {
		setViewingUser({
			id: target.id || target._id,
			firstName: target.firstName,
			lastName: target.lastName,
			role: target.role,
			avatar: target.avatar,
			profilePictureUrl: target.profilePictureUrl,
			isActive: target.isActive,
		});
		setIsViewModalOpen(true);
		setIsViewLoading(true);
		try {
			const params = new URLSearchParams();
			if (academicYear) params.set('academicYear', academicYear);
			params.set('id', target.id || target._id);
			const res = await fetch(`/api/users?${params.toString()}`);
			const data = await res.json();
			if (res.ok && data?.data) {
				setViewingUser(data.data);
			}
		} catch {
		} finally {
			setIsViewLoading(false);
		}
	};

	const subtitle =
		user?.role === 'student'
			? 'View classmates, teachers, and administrators.'
			: 'View students, fellow teachers, and administrators.';

	const getLoadingMessage = () => {
		if (roleFilter === 'student') {
			return user?.role === 'student' ? 'Loading classmates...' : 'Loading students...';
		}
		if (roleFilter === 'teacher') {
			return 'Loading teachers...';
		}
		return 'Loading administrators...';
	};

	const columnCount = roleFilter === 'student' ? 4 : 3;

	return (
		<div className="space-y-6 px-4 sm:px-6 lg:px-8">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<h2 className="text-2xl font-semibold text-foreground">Community</h2>
					<p className="text-sm text-muted-foreground">{subtitle}</p>
				</div>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<div className="relative">
						<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by name, email, phone"
							className="w-full sm:w-64 rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm"
						/>
					</div>
					{availableYears.length > 1 ? (
						<select
							value={academicYear}
							onChange={(e) => setAcademicYear(e.target.value)}
							className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
						>
							{availableYears.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
					) : null}
					{user?.role === 'teacher' && roleFilter === 'student' && (
						<select
							value={classId}
							onChange={(e) => setClassId(e.target.value)}
							className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
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

			<div className="rounded-2xl border border-border bg-muted/40 p-1 shadow-sm">
				<div className="relative grid grid-cols-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					<span
						className="absolute inset-y-0 left-0 z-0 w-1/3 rounded-xl bg-card shadow-sm transition-transform duration-300 ring-1 ring-border"
						style={{ transform: `translateX(${tabIndex * 100}%)` }}
					/>
							{tabOrder.map((role) => (
								<button
									key={role}
									type="button"
									onClick={() => setRoleFilter(role)}
									className={`relative z-10 px-4 py-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
										roleFilter === role
											? 'text-foreground'
											: 'text-muted-foreground hover:text-foreground'
									}`}
								>
									{role === 'administrator'
										? 'Administrators'
										: role === 'student' && user?.role === 'student'
											? 'Classmates'
											: `${role}s`}
								</button>
							))}
				</div>
			</div>

			<div className="rounded-lg border border-border bg-card">
				<div className="flex flex-col gap-3 p-4 border-b border-border">
					<div className="flex items-center justify-between gap-3">
						<p className="text-sm text-muted-foreground">
							Showing {filteredUsers.length} result
							{filteredUsers.length === 1 ? '' : 's'}
						</p>
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">Show</span>
							<select
								value={itemsPerPage}
								onChange={(e) => {
									setItemsPerPage(Number(e.target.value));
									setCurrentPage(1);
								}}
								className="bg-background border border-border rounded px-2 py-1 text-sm"
							>
								<option value={5}>5</option>
								<option value={10}>10</option>
								<option value={20}>20</option>
							</select>
						</div>
					</div>
				</div>
				<div className="max-h-[70vh] overflow-auto">
					<table className="w-full border-collapse">
						<thead className="bg-muted sticky top-0 z-10 shadow-sm">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[220px] border border-border">
									Name
								</th>
								{roleFilter === 'student' && (
									<>
										<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[180px] border border-border">
											Class
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border border-border">
											Gender
										</th>
									</>
								)}
								{roleFilter === 'teacher' && (
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border border-border">
										Subjects
									</th>
								)}
								{roleFilter === 'administrator' && (
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border border-border">
										Position
									</th>
								)}
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[170px] border border-border">
									Phone
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{loading && (
								<tr>
									<td colSpan={columnCount} className="px-6 py-10 border border-border">
										<div className="flex flex-col items-center gap-3 text-muted-foreground text-sm">
											<Loader2 className="h-6 w-6 animate-spin" />
											<span>{getLoadingMessage()}</span>
										</div>
									</td>
								</tr>
							)}
							{!loading && error && (
								<tr>
									<td
										colSpan={columnCount}
										className="px-6 py-10 text-center text-sm text-red-600 border border-border"
									>
										{error}
									</td>
								</tr>
							)}
							{!loading && !error && filteredUsers.length === 0 && (
								<tr>
									<td
										colSpan={columnCount}
										className="px-6 py-10 text-center text-sm text-muted-foreground border border-border"
									>
										No users found.
									</td>
								</tr>
							)}
							{!loading &&
								!error &&
								paginatedUsers.map((u) => (
									<tr key={u.id || u._id} className="hover:bg-muted/20">
										<td className="px-4 py-4 border border-border">
											<div className="flex items-center gap-3">
												<img
													src={
														u.avatar ||
														u.profilePictureUrl ||
														`https://ui-avatars.com/api/?name=${getFullName(u)}`
													}
													alt={getFullName(u)}
													className="h-9 w-9 rounded-full object-cover cursor-pointer"
													onClick={() => handleOpenUser(u)}
												/>
												<div className="min-w-0">
													<button
														type="button"
														onClick={() => handleOpenUser(u)}
														className="text-left hover:underline text-sm font-medium text-foreground whitespace-nowrap max-w-[200px] truncate block"
													>
														{getFullName(u)}
													</button>
												</div>
											</div>
										</td>
										{roleFilter === 'student' && (
											<>
												<td className="px-4 py-4 text-sm text-muted-foreground border border-border">
													{getClassLabel(u)}
												</td>
												<td className="px-4 py-4 text-sm text-muted-foreground capitalize border border-border">
													{u.gender || ''}
												</td>
											</>
										)}
										{roleFilter === 'teacher' && (
											<td className="px-4 py-4 text-sm text-muted-foreground border border-border">
												{getTeacherSubjectsLabel(u)}
											</td>
										)}
										{roleFilter === 'administrator' && (
											<td className="px-4 py-4 text-sm text-muted-foreground border border-border">
												{u.position || 'Administrator'}
											</td>
										)}
										<td className="px-4 py-4 text-sm text-muted-foreground border border-border">
											{u.phone || ''}
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</div>
				<div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border">
					<div className="text-sm text-muted-foreground">
						Page {currentPage} of {totalPages}
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
							className="px-3 py-1 rounded border border-border text-sm disabled:opacity-50"
						>
							Previous
						</button>
						<button
							type="button"
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
							className="px-3 py-1 rounded border border-border text-sm disabled:opacity-50"
						>
							Next
						</button>
					</div>
				</div>
			</div>

			{isViewModalOpen && (
				<ViewUserModal
					isOpen={isViewModalOpen}
					onClose={() => {
						setIsViewModalOpen(false);
						setViewingUser(null);
						setIsViewLoading(false);
					}}
					viewingUser={viewingUser}
					isLoading={isViewLoading}
					schoolProfile={schoolProfile}
				/>
			)}
		</div>
	);
};

export default Community;
