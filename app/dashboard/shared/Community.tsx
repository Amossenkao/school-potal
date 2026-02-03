'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { Loader2, Search } from 'lucide-react';
import ViewUserModal from '@/components/modals/ViewUserModal';
import { getClientCache, setClientCache } from '@/utils/clientCache';

const getFullName = (user: any) =>
	`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';

const Community = () => {
	const { user } = useAuth();
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
		if (!user) return [];
		if (user.role === 'student') {
			return (user.academicYears || []).map((ay: any) => ay.year).filter(Boolean);
		}
		if (user.role === 'teacher') {
			return (user.subjects || []).map((s: any) => s.year).filter(Boolean);
		}
		return [];
	}, [user]);

	const availableClasses = useMemo(() => {
		if (!user || user.role !== 'teacher' || !academicYear) return [];
		const yearData = (user.subjects || []).find((s: any) => s.year === academicYear);
		return (yearData?.classes || []).map((c: any) => c.classId);
	}, [user, academicYear]);

	useEffect(() => {
		if (user?.role === 'student') {
			setRoleFilter('student');
		}
	}, [user?.role]);

	useEffect(() => {
		if (!academicYear && availableYears.length > 0) {
			setAcademicYear(availableYears[0]);
		}
	}, [academicYear, availableYears]);

	useEffect(() => {
		const fetchCommunity = async () => {
			if (!academicYear) return;
			const cachedUsers = usersByAcademicYear?.[academicYear];
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

		if (!query.trim()) return list;
		const lowered = query.toLowerCase();
		return list.filter((u) => {
			const name = getFullName(u).toLowerCase();
			const email = (u.email || '').toLowerCase();
			const phone = (u.phone || '').toLowerCase();
			return name.includes(lowered) || email.includes(lowered) || phone.includes(lowered);
		});
	}, [communityData, roleFilter, classId, query]);

	const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
	const paginatedUsers = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredUsers, currentPage, itemsPerPage]);

const handleOpenUser = async (target: any) => {
		setViewingUser(target);
		setIsViewModalOpen(true);
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
		}
	};

	const getDetails = (u: any) => {
		if (u.role === 'student') {
			return u.className || getClassNameFromId(u.classId) || u.classId || '';
		}
		if (u.role === 'teacher') {
			if (Array.isArray(u.subjects) && u.subjects.length > 0) {
				const subjectNames = u.subjects
					.map((s: any) => (typeof s === 'string' ? s : s?.subject))
					.filter(Boolean);
				return subjectNames.length > 0 ? subjectNames.join(', ') : 'Assigned';
			}
			const yearData = (u.subjects || []).find((s: any) => s.year === academicYear);
			const classes = yearData?.classes || [];
			const subjectList = classes.flatMap((c: any) => c.subjects || []);
			return subjectList.length > 0 ? subjectList.join(', ') : 'Assigned';
		}
		if (u.role === 'administrator') {
			return u.position || 'Administrator';
		}
		return '';
	};

	const getStatusColor = (isActive: boolean) =>
		isActive
			? 'bg-green-100 text-green-700'
			: 'bg-red-100 text-red-700';

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

	return (
		<div className="space-y-6">
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
					{user?.role === 'teacher' && roleFilter === 'student' && (
						<select
							value={classId}
							onChange={(e) => setClassId(e.target.value)}
							className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
						>
							<option value="">All Classes</option>
							{availableClasses.map((id) => (
								<option key={id} value={id}>
									{getClassNameFromId(id)}
								</option>
							))}
						</select>
					)}
				</div>
			</div>

			<div className="flex flex-wrap gap-2">
				{(['student', 'teacher', 'administrator'] as const).map((role) => (
					<button
						key={role}
						type="button"
						onClick={() => setRoleFilter(role)}
						className={`px-4 py-2 rounded-full text-xs font-medium transition ${
							roleFilter === role
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground hover:text-foreground'
						}`}
					>
						{role === 'administrator' ? 'Administrators' : `${role}s`}
					</button>
				))}
			</div>

			<div className="rounded-lg border border-border bg-card">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-muted/50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									User
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Type
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Details
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Status
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{loading && (
								<tr>
									<td colSpan={4} className="px-6 py-10">
										<div className="flex flex-col items-center gap-3 text-muted-foreground text-sm">
											<Loader2 className="h-6 w-6 animate-spin" />
											<span>{getLoadingMessage()}</span>
										</div>
									</td>
								</tr>
							)}
							{!loading && error && (
								<tr>
									<td colSpan={4} className="px-6 py-10 text-center text-sm text-red-600">
										{error}
									</td>
								</tr>
							)}
							{!loading && !error && filteredUsers.length === 0 && (
								<tr>
									<td colSpan={4} className="px-6 py-10 text-center text-sm text-muted-foreground">
										No users found.
									</td>
								</tr>
							)}
							{!loading &&
								!error &&
								paginatedUsers.map((u) => (
									<tr key={u.id || u._id} className="hover:bg-muted/20">
										<td className="px-6 py-4">
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
												<div>
													<div className="text-sm font-medium text-foreground">
														<button
															type="button"
															onClick={() => handleOpenUser(u)}
															className="text-left hover:underline"
														>
															{getFullName(u)}
														</button>
													</div>
													<div className="text-xs text-muted-foreground">
														{u.email || u.phone ? (
															<button
																type="button"
																onClick={() => handleOpenUser(u)}
																className="hover:underline"
															>
																{u.email || u.phone}
															</button>
														) : (
															''
														)}
													</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4 text-xs">
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
												{u.role}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-muted-foreground">
											{getDetails(u)}
										</td>
										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
													u.isActive ?? true,
												)}`}
											>
												{u.isActive ?? true ? 'Active' : 'Inactive'}
											</span>
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</div>
				<div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border">
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
					}}
					viewingUser={viewingUser}
					schoolProfile={schoolProfile}
				/>
			)}
		</div>
	);
};

export default Community;
