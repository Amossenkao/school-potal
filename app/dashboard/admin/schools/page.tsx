'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
	ArrowRight,
	BookOpen,
	Building2,
	GraduationCap,
	Loader2,
	PlusCircle,
	Search,
	Settings,
	ShieldCheck,
	ShieldOff,
	Trash2,
	UserCog,
	Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSuperadminRealtime } from '@/app/dashboard/admin/hooks/useSuperadminRealtime';
import type { RealtimeEvent } from '@/lib/realtimeTypes';
import useAuth from '@/store/useAuth';

const SchoolProfilePanel = dynamic(
	() => import('@/app/dashboard/admin/components/SchoolProfilePanel'),
	{ ssr: false },
);
const SchoolAdminsPanel = dynamic(
	() => import('@/app/dashboard/admin/components/SchoolAdminsPanel'),
	{ ssr: false },
);

interface SchoolStats {
	total: number;
	students: number;
	teachers: number;
	administrators: number;
	systemAdmins: number;
}

interface SchoolSummary {
	id?: string;
	_id?: string;
	name: string;
	shortName?: string;
	initials?: string;
	host: string;
	dbName?: string;
	isActive: boolean;
	logoUrl?: string;
	address?: string[];
	phones?: string[];
	emails?: string[];
	sysAdmin?: { name?: string; phone?: string; email?: string };
	stats?: SchoolStats;
	totalUsers?: number;
	users?: {
		students: number;
		teachers: number;
		administrators: number;
		systemAdmins: number;
	};
}

const getStats = (school: SchoolSummary): SchoolStats => {
	const users = (school.users || {}) as Partial<SchoolStats>;
	const stats = (school.stats || {}) as Partial<SchoolStats>;
	const next = {
		students: Number(stats.students ?? users.students ?? 0),
		teachers: Number(stats.teachers ?? users.teachers ?? 0),
		administrators: Number(stats.administrators ?? users.administrators ?? 0),
		systemAdmins: Number(stats.systemAdmins ?? users.systemAdmins ?? 0),
		total: Number(stats.total ?? school.totalUsers ?? 0),
	};
	next.total =
		next.total ||
		next.students + next.teachers + next.administrators + next.systemAdmins;
	return next;
};

const initialsFor = (school: SchoolSummary) =>
	(school.initials || school.shortName || school.name || school.host || 'SM')
		.slice(0, 2)
		.toUpperCase();

export default function SchoolsListPage() {
	const schools = useAuth(
		(state) => state.superAdminSchools,
	) as SchoolSummary[];
	const schoolsLoaded = useAuth((state) => state.superAdminSchoolsLoaded);
	const setSuperAdminSchools = useAuth((state) => state.setSuperAdminSchools);
	const upsertSuperAdminSchool = useAuth(
		(state) => state.upsertSuperAdminSchool,
	);
	const removeSuperAdminSchool = useAuth(
		(state) => state.removeSuperAdminSchool,
	);

	const [loading, setLoading] = useState(!schoolsLoaded);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<
		'all' | 'active' | 'inactive'
	>('all');
	const [selectedHost, setSelectedHost] = useState('');
	const [togglingId, setTogglingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteConfirmSchool, setDeleteConfirmSchool] =
		useState<SchoolSummary | null>(null);
	const [profileModalHost, setProfileModalHost] = useState('');
	const [adminsModalHost, setAdminsModalHost] = useState('');

	const selectedSchool = useMemo(
		() => schools.find((s) => s.host === selectedHost) || schools[0] || null,
		[schools, selectedHost],
	);

	const handleRealtimeEvent = useCallback(
		(event: RealtimeEvent) => {
			const reason = String(event.payload?.reason || '').trim();
			const schoolData = event.payload?.school as
				| Record<string, any>
				| undefined;

			if (
				(reason === 'school-toggled-active' || reason === 'school-updated') &&
				schoolData?.host
			) {
				upsertSuperAdminSchool(schoolData);
				return;
			}

			if (reason === 'school-deleted' && event.payload?.host) {
				removeSuperAdminSchool(String(event.payload.host));
			}
		},
		[removeSuperAdminSchool, upsertSuperAdminSchool],
	);

	const schoolHosts = useMemo(
		() => schools.map((s) => s.host).filter(Boolean),
		[schools],
	);

	useSuperadminRealtime({ schoolHosts, onEvent: handleRealtimeEvent });

	const fetchSchools = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/school?all=true');
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to load schools');
			setSuperAdminSchools(data.schools || []);
		} catch (e: any) {
			toast.error(e.message || 'Failed to load schools');
		} finally {
			setLoading(false);
		}
	}, [setSuperAdminSchools]);

	useEffect(() => {
		if (schoolsLoaded) {
			setLoading(false);
			return;
		}
		fetchSchools();
	}, [fetchSchools, schoolsLoaded]);

	const toggleSchoolActive = async (school: SchoolSummary) => {
		const nextIsActive = !school.isActive;
		setTogglingId(school.host);
		upsertSuperAdminSchool({ ...school, isActive: nextIsActive });
		try {
			const res = await fetch(
				`/api/school?host=${encodeURIComponent(school.host)}`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ isActive: nextIsActive }),
				},
			);
			const data = await res.json().catch(() => ({}));
			if (!res.ok)
				throw new Error(data.error || 'Failed to update school status');
			if (data.school) upsertSuperAdminSchool(data.school);
			toast.success(
				`${school.name} ${nextIsActive ? 'activated' : 'deactivated'}`,
			);
		} catch (e: any) {
			upsertSuperAdminSchool(school); // revert optimistic update
			toast.error(e.message || 'Failed to update school status');
		} finally {
			setTogglingId(null);
		}
	};

	const deleteSchool = async (school: SchoolSummary) => {
		setDeleteConfirmSchool(null);
		setDeletingId(school.host);
		try {
			const res = await fetch(
				`/api/school?host=${encodeURIComponent(school.host)}`,
				{
					method: 'DELETE',
				},
			);
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Failed to delete school');
			removeSuperAdminSchool(school.host);
			if (selectedHost === school.host) setSelectedHost('');
			toast.success(`${school.name} deleted`);
		} catch (e: any) {
			toast.error(e.message || 'Failed to delete school');
		} finally {
			setDeletingId(null);
		}
	};

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		return schools.filter((school) => {
			if (statusFilter === 'active' && !school.isActive) return false;
			if (statusFilter === 'inactive' && school.isActive) return false;
			if (!query) return true;
			return [
				school.name,
				school.shortName,
				school.host,
				school.dbName,
				school.sysAdmin?.name,
				school.sysAdmin?.phone,
			]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(query));
		});
	}, [schools, search, statusFilter]);

	const totals = useMemo(
		() =>
			schools.reduce(
				(acc, school) => {
					const s = getStats(school);
					acc.schools += 1;
					if (school.isActive) acc.active += 1;
					acc.students += s.students;
					acc.teachers += s.teachers;
					acc.admins += s.administrators + s.systemAdmins;
					acc.users += s.total;
					return acc;
				},
				{
					schools: 0,
					active: 0,
					students: 0,
					teachers: 0,
					admins: 0,
					users: 0,
				},
			),
		[schools],
	);

	const topStats = [
		{
			label: 'Schools',
			value: totals.schools,
			icon: Building2,
			color: '#465fff',
			tone: 'bg-[#465fff]/10',
		},
		{
			label: 'Active',
			value: totals.active,
			icon: ShieldCheck,
			color: '#10B981',
			tone: 'bg-green-50',
		},
		{
			label: 'Students',
			value: totals.students,
			icon: GraduationCap,
			color: '#F59E0B',
			tone: 'bg-amber-50',
		},
		{
			label: 'Total Users',
			value: totals.users,
			icon: Users,
			color: '#06B6D4',
			tone: 'bg-cyan-50',
		},
	];

	if (profileModalHost) {
		return (
			<div className="min-h-0">
				<SchoolProfilePanel
					host={profileModalHost}
					onClose={() => setProfileModalHost('')}
					onOpenAdmins={(h) => {
						setProfileModalHost('');
						setAdminsModalHost(h);
					}}
				/>
			</div>
		);
	}

	if (adminsModalHost) {
		return (
			<div className="min-h-0">
				<SchoolAdminsPanel
					host={adminsModalHost}
					onClose={() => setAdminsModalHost('')}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
						Schools
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						Operate schools, admins, access, and live platform health from one
						place.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<button
						onClick={fetchSchools}
						disabled={loading}
						className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-card px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:text-gray-400 disabled:opacity-50"
					>
						<Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
						Refresh
					</button>
					<Link
						href="/dashboard/onboard"
						className="inline-flex items-center gap-2 rounded-lg bg-[#465fff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3a4fe6]"
					>
						<PlusCircle className="h-4 w-4" />
						Onboard
					</Link>
				</div>
			</div>

			{/* Top stats */}
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{topStats.map((stat) => {
					const Icon = stat.icon;
					return (
						<div
							key={stat.label}
							className="rounded-lg border border-gray-200 bg-card p-4 dark:border-gray-800"
						>
							<div className="flex items-center justify-between gap-3">
								<p className="text-sm text-gray-500">{stat.label}</p>
								<div
									className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.tone}`}
								>
									<Icon className="h-4 w-4" style={{ color: stat.color }} />
								</div>
							</div>
							<p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
								{stat.value.toLocaleString()}
							</p>
						</div>
					);
				})}
			</div>

			{/* Main grid */}
			<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
				{/* School list */}
				<div className="space-y-4">
					{/* Search + filter */}
					<div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-card p-3 dark:border-gray-800 sm:flex-row sm:items-center">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
							<input
								type="text"
								placeholder="Search by school, host, database, or admin"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10 dark:border-gray-800 dark:bg-background dark:text-white"
							/>
						</div>
						<div className="grid grid-cols-3 rounded-lg bg-gray-100 p-1 text-xs font-semibold text-gray-500 dark:bg-background">
							{(['all', 'active', 'inactive'] as const).map((filter) => (
								<button
									key={filter}
									onClick={() => setStatusFilter(filter)}
									className={`rounded-md px-3 py-2 capitalize transition-colors ${
										statusFilter === filter
											? 'text-gray-900 shadow-sm dark:bg-card dark:text-white'
											: 'hover:text-gray-900 dark:hover:text-white'
									}`}
								>
									{filter}
								</button>
							))}
						</div>
					</div>

					{/* Cards */}
					<div className="grid gap-3">
						{loading ? (
							<div className="flex items-center justify-center rounded-lg border border-gray-200 bg-card py-20 dark:border-gray-800">
								<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
							</div>
						) : filtered.length === 0 ? (
							<div className="rounded-lg border border-gray-200 bg-card py-20 text-center text-sm text-gray-500 dark:border-gray-800">
								No schools found.
							</div>
						) : (
							filtered.map((school) => {
								const stats = getStats(school);
								const selected = selectedSchool?.host === school.host;
								return (
									<div
										key={school.host}
										className={`rounded-lg border bg-card p-4 transition-colors ${
											selected
												? 'border-[#465fff] ring-2 ring-[#465fff]/10'
												: 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'
										}`}
									>
										<div className="flex flex-col gap-4 lg:flex-row lg:items-start">
											<button
												onClick={() => setSelectedHost(school.host)}
												className="flex min-w-0 flex-1 items-start gap-3 text-left"
											>
												{school.logoUrl ? (
													<img
														src={school.logoUrl}
														alt=""
														className="h-11 w-11 rounded-lg object-cover"
													/>
												) : (
													<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#465fff]/10 text-sm font-bold text-[#465fff]">
														{initialsFor(school)}
													</div>
												)}
												<div className="min-w-0">
													<div className="flex flex-wrap items-center gap-2">
														<h2 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
															{school.name}
														</h2>
														<span
															className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
																school.isActive
																	? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
																	: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
															}`}
														>
															{school.isActive ? 'Active' : 'Inactive'}
														</span>
													</div>
													<p className="mt-0.5 truncate text-xs text-gray-500">
														{school.host}
													</p>
													<p className="mt-2 text-xs text-gray-500">
														{school.sysAdmin?.name || 'No system admin listed'}
														{school.sysAdmin?.phone
															? ` · ${school.sysAdmin.phone}`
															: ''}
													</p>
												</div>
											</button>

											<div className="grid grid-cols-4 gap-2 lg:w-[360px]">
												{[
													{
														label: 'Students',
														value: stats.students,
														icon: GraduationCap,
													},
													{
														label: 'Teachers',
														value: stats.teachers,
														icon: BookOpen,
													},
													{
														label: 'Admins',
														value: stats.administrators,
														icon: UserCog,
													},
													{
														label: 'Sys',
														value: stats.systemAdmins,
														icon: ShieldCheck,
													},
												].map((item) => {
													const Icon = item.icon;
													return (
														<div
															key={item.label}
															className="rounded-lg bg-gray-50 px-2 py-2 text-center dark:bg-background"
														>
															<Icon className="mx-auto h-3.5 w-3.5 text-gray-400" />
															<p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
																{item.value.toLocaleString()}
															</p>
															<p className="text-[10px] text-gray-500">
																{item.label}
															</p>
														</div>
													);
												})}
											</div>
										</div>

										<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
											<div className="text-xs text-gray-500">
												<span className="font-medium text-gray-700 dark:text-gray-300">
													{stats.total.toLocaleString()}
												</span>{' '}
												total users
												{school.dbName ? <span> · {school.dbName}</span> : null}
											</div>
											<div className="flex flex-wrap items-center gap-2">
												<button
													onClick={() => toggleSchoolActive(school)}
													disabled={togglingId === school.host}
													className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
														school.isActive
															? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300'
															: 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300'
													}`}
												>
													{togglingId === school.host ? (
														<Loader2 className="h-3.5 w-3.5 animate-spin" />
													) : school.isActive ? (
														<ShieldOff className="h-3.5 w-3.5" />
													) : (
														<ShieldCheck className="h-3.5 w-3.5" />
													)}
													{school.isActive ? 'Deactivate' : 'Activate'}
												</button>
												<button
													onClick={() => setAdminsModalHost(school.host)}
													className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
												>
													<UserCog className="h-3.5 w-3.5" />
													Admins
												</button>
												<button
													onClick={() => setProfileModalHost(school.host)}
													className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
												>
													<Settings className="h-3.5 w-3.5" />
													Profile
												</button>
												<button
													onClick={() => setDeleteConfirmSchool(school)}
													disabled={deletingId === school.host}
													className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
												>
													{deletingId === school.host ? (
														<Loader2 className="h-3.5 w-3.5 animate-spin" />
													) : (
														<Trash2 className="h-3.5 w-3.5" />
													)}
													Delete
												</button>
											</div>
										</div>
									</div>
								);
							})
						)}
					</div>
				</div>

				{/* Sidebar detail */}
				<aside className="rounded-lg border border-gray-200 bg-card p-5 dark:border-gray-800 xl:sticky xl:top-24 xl:self-start">
					{selectedSchool ? (
						<>
							<div className="flex items-start gap-3">
								{selectedSchool.logoUrl ? (
									<img
										src={selectedSchool.logoUrl}
										alt=""
										className="h-12 w-12 rounded-lg object-cover"
									/>
								) : (
									<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#465fff]/10 text-sm font-bold text-[#465fff]">
										{initialsFor(selectedSchool)}
									</div>
								)}
								<div className="min-w-0">
									<h2 className="truncate text-base font-bold text-gray-900 dark:text-white">
										{selectedSchool.name}
									</h2>
									<p className="truncate text-xs text-gray-500">
										{selectedSchool.host}
									</p>
								</div>
							</div>

							<div className="mt-5 grid grid-cols-2 gap-3">
								{[
									['Students', getStats(selectedSchool).students],
									['Teachers', getStats(selectedSchool).teachers],
									['Admins', getStats(selectedSchool).administrators],
									['System', getStats(selectedSchool).systemAdmins],
								].map(([label, value]) => (
									<div
										key={label}
										className="rounded-lg bg-gray-50 p-3 dark:bg-background"
									>
										<p className="text-xs text-gray-500">{label}</p>
										<p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
											{Number(value).toLocaleString()}
										</p>
									</div>
								))}
							</div>

							<div className="mt-5 space-y-3 border-t border-gray-100 pt-5 text-sm dark:border-gray-800">
								<div>
									<p className="text-xs font-semibold uppercase text-gray-400">
										System Admin
									</p>
									<p className="mt-1 font-medium text-gray-900 dark:text-white">
										{selectedSchool.sysAdmin?.name || 'Not listed'}
									</p>
									<p className="text-xs text-gray-500">
										{selectedSchool.sysAdmin?.phone ||
											selectedSchool.sysAdmin?.email ||
											''}
									</p>
								</div>
								<div>
									<p className="text-xs font-semibold uppercase text-gray-400">
										Database
									</p>
									<p className="mt-1 font-mono text-xs text-gray-700 dark:text-gray-300">
										{selectedSchool.dbName || 'Not configured'}
									</p>
								</div>
							</div>

							<div className="mt-5 grid gap-2">
								<button
									onClick={() => setProfileModalHost(selectedSchool.host)}
									className="inline-flex items-center justify-between rounded-lg bg-[#465fff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4fe6]"
								>
									Manage Profile
									<ArrowRight className="h-4 w-4" />
								</button>
								<button
									onClick={() => setAdminsModalHost(selectedSchool.host)}
									className="inline-flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
								>
									Manage System Admins
									<ArrowRight className="h-4 w-4" />
								</button>
							</div>
						</>
					) : (
						<div className="py-12 text-center text-sm text-gray-500">
							Select a school to inspect operations.
						</div>
					)}
				</aside>
			</div>

			{/* Delete confirm modal */}
			{deleteConfirmSchool && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
						<h3 className="text-lg font-bold text-gray-900 dark:text-white">
							Delete School
						</h3>
						<p className="mt-2 text-sm text-gray-500">
							Are you sure you want to delete{' '}
							<span className="font-semibold text-gray-900 dark:text-white">
								{deleteConfirmSchool.name}
							</span>
							? This action cannot be undone.
						</p>
						<div className="mt-6 flex justify-end gap-3">
							<button
								onClick={() => setDeleteConfirmSchool(null)}
								className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={() => deleteSchool(deleteConfirmSchool)}
								disabled={deletingId === deleteConfirmSchool.host}
								className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
							>
								{deletingId === deleteConfirmSchool.host ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Trash2 className="h-4 w-4" />
								)}
								Delete
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
