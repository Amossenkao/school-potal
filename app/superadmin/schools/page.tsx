'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
	School,
	Building2,
	Loader2,
	PlusCircle,
	Search,
	ShieldCheck,
	ShieldOff,
	ArrowRight,
} from 'lucide-react';

interface SchoolSummary {
	id?: string;
	name: string;
	shortName: string;
	initials: string;
	host: string;
	dbName: string;
	isActive: boolean;
	logoUrl: string;
	address: string[];
	phones: string[];
	emails: string[];
	administrativePositions: { id: string; name: string }[];
	sysAdmin: { name: string; phone: string; email?: string };
	settings: {
		studentSettings: { loginAccess: boolean };
		teacherSettings: { loginAccess: boolean };
		administratorSettings: { loginAccess: boolean };
	};
}

export default function SchoolsListPage() {
	const [schools, setSchools] = useState<SchoolSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [search, setSearch] = useState('');
	const [togglingId, setTogglingId] = useState<string | null>(null);

	useEffect(() => {
		fetchSchools();
	}, []);

	const fetchSchools = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/superadmin/schools');
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to load schools');
			setSchools(data.schools || []);
		} catch (e: any) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	const toggleSchoolActive = async (school: SchoolSummary) => {
		try {
			setTogglingId(school.host);
			const res = await fetch(`/api/superadmin/schools/${school.host}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !school.isActive }),
			});
			if (!res.ok) throw new Error('Failed to update');
			setSchools((prev) =>
				prev.map((s) => (s.host === school.host ? { ...s, isActive: !s.isActive } : s))
			);
		} catch {
			// ignore
		} finally {
			setTogglingId(null);
		}
	};

	const filtered = schools.filter(
		(s) =>
			s.name.toLowerCase().includes(search.toLowerCase()) ||
			s.shortName.toLowerCase().includes(search.toLowerCase()) ||
			s.host.toLowerCase().includes(search.toLowerCase())
	);

	const activeCount = schools.filter((s) => s.isActive).length;

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schools</h1>
					<p className="text-sm text-gray-500 mt-1">
						Manage all registered schools on the platform.
					</p>
				</div>
				<Link
					href="/superadmin/onboard"
					className="inline-flex items-center gap-2 rounded-lg bg-[#465fff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4fe6] transition-colors"
				>
					<PlusCircle className="h-4 w-4" />
					Onboard School
				</Link>
			</div>

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{[
					{ label: 'Total Schools', value: schools.length, icon: School, color: '#465fff' },
					{ label: 'Active', value: activeCount, icon: ShieldCheck, color: '#10B981' },
					{ label: 'Inactive', value: schools.length - activeCount, icon: ShieldOff, color: '#EF4444' },
					{ label: 'DB Names', value: new Set(schools.map((s) => s.dbName)).size, icon: Building2, color: '#8B5CF6' },
				].map((stat) => (
					<div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
						<div className="flex items-center justify-between">
							<p className="text-sm text-gray-500">{stat.label}</p>
							<stat.icon className="h-4 w-4" style={{ color: stat.color }} />
						</div>
						<p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
					</div>
				))}
			</div>

			<div className="relative max-w-sm">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
				<input
					type="text"
					placeholder="Search schools..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
				/>
			</div>

			<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
				{loading ? (
					<div className="flex items-center justify-center py-20">
						<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
					</div>
				) : error ? (
					<div className="py-20 text-center text-sm text-red-500">{error}</div>
				) : filtered.length === 0 ? (
					<div className="py-20 text-center text-sm text-gray-500">No schools found.</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-800/50">
									<th className="px-4 py-3">School</th>
									<th className="px-4 py-3 hidden md:table-cell">Host</th>
									<th className="px-4 py-3 hidden lg:table-cell">DB Name</th>
									<th className="px-4 py-3 hidden lg:table-cell">Admin</th>
									<th className="px-4 py-3 text-center">Status</th>
									<th className="px-4 py-3 text-right">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
								{filtered.map((school) => (
									<tr key={school.host} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
										<td className="px-4 py-3">
											<div className="flex items-center gap-3">
												{school.logoUrl ? (
													<img src={school.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
												) : (
													<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#465fff]/10 text-xs font-bold text-[#465fff]">
														{school.initials || school.shortName?.slice(0, 2)}
													</div>
												)}
												<div className="min-w-0">
													<p className="font-medium text-gray-900 dark:text-white truncate">{school.name}</p>
													<p className="text-xs text-gray-500 truncate md:hidden">{school.host}</p>
												</div>
											</div>
										</td>
										<td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{school.host}</td>
										<td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell font-mono text-xs">{school.dbName}</td>
										<td className="px-4 py-3 hidden lg:table-cell">
											<p className="text-gray-900 dark:text-white">{school.sysAdmin?.name || '—'}</p>
											<p className="text-xs text-gray-500">{school.sysAdmin?.phone || ''}</p>
										</td>
										<td className="px-4 py-3 text-center">
											<button
												onClick={() => toggleSchoolActive(school)}
												disabled={togglingId === school.host}
												className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
													school.isActive
														? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
														: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
												} disabled:opacity-50`}
											>
												{togglingId === school.host ? (
													<Loader2 className="h-3 w-3 animate-spin" />
												) : school.isActive ? (
													<ShieldCheck className="h-3 w-3" />
												) : (
													<ShieldOff className="h-3 w-3" />
												)}
												{school.isActive ? 'Active' : 'Inactive'}
											</button>
										</td>
										<td className="px-4 py-3 text-right">
											<Link
												href={`/superadmin/schools/${school.host}`}
												className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors dark:text-gray-400 dark:hover:bg-gray-800"
											>
												Manage
												<ArrowRight className="h-3 w-3" />
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
