'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
	School,
	Users,
	GraduationCap,
	BookOpen,
	Loader2,
	ShieldCheck,
	Activity,
	ArrowRight,
} from 'lucide-react';

interface SystemStats {
	schools: { total: number; active: number; inactive: number };
	users: { total: number; students: number; teachers: number; administrators: number; systemAdmins: number };
	recentSchools: { name: string; host: string; initials: string; isActive: boolean }[];
}

export default function SuperAdminDashboardPage() {
	const [stats, setStats] = useState<SystemStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		fetchStats();
	}, []);

	const fetchStats = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/superadmin/stats');
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to load stats');
			setStats(data);
		} catch (e: any) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
			</div>
		);
	}

	if (error) {
		return <div className="py-20 text-center text-sm text-red-500">{error}</div>;
	}

	if (!stats) return null;

	const statCards = [
		{ label: 'Total Schools', value: stats.schools.total, icon: School, color: '#465fff', bg: 'bg-[#465fff]/10' },
		{ label: 'Active Schools', value: stats.schools.active, icon: ShieldCheck, color: '#10B981', bg: 'bg-green-50' },
		{ label: 'Total Students', value: stats.users.students, icon: GraduationCap, color: '#F59E0B', bg: 'bg-amber-50' },
		{ label: 'Total Teachers', value: stats.users.teachers, icon: BookOpen, color: '#8B5CF6', bg: 'bg-purple-50' },
		{ label: 'Administrators', value: stats.users.administrators, icon: Users, color: '#EC4899', bg: 'bg-pink-50' },
		{ label: 'Total Users', value: stats.users.total, icon: Activity, color: '#06B6D4', bg: 'bg-cyan-50' },
	];

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
				<p className="text-sm text-gray-500 mt-1">
					Platform-wide overview of all schools and users.
				</p>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
				{statCards.map((stat) => {
					const Icon = stat.icon;
					return (
						<div
							key={stat.label}
							className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
						>
							<div className="flex items-center justify-between">
								<p className="text-sm font-medium text-gray-500">{stat.label}</p>
								<div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.bg}`}>
									<Icon className="h-4.5 w-4.5" style={{ color: stat.color }} />
								</div>
							</div>
							<p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
								{stat.value.toLocaleString()}
							</p>
						</div>
					);
				})}
			</div>

			{/* Quick Actions + Recent Schools */}
			<div className="grid gap-6 lg:grid-cols-3">
				{/* Quick Actions */}
				<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
					<div className="space-y-3">
						<Link
							href="/superadmin/schools"
							className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/50"
						>
							<span>View All Schools</span>
							<ArrowRight className="h-4 w-4 text-gray-400" />
						</Link>
						<Link
							href="/superadmin/onboard"
							className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/50"
						>
							<span>Onboard New School</span>
							<ArrowRight className="h-4 w-4 text-gray-400" />
						</Link>
						<Link
							href="/superadmin/audit-logs"
							className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/50"
						>
							<span>View Audit Logs</span>
							<ArrowRight className="h-4 w-4 text-gray-400" />
						</Link>
					</div>
				</div>

				{/* Recent Schools */}
				<div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Schools</h3>
						<Link href="/superadmin/schools" className="text-xs font-medium text-[#465fff] hover:underline">
							View all
						</Link>
					</div>
					{stats.recentSchools.length === 0 ? (
						<p className="text-sm text-gray-500 py-8 text-center">No schools yet.</p>
					) : (
						<div className="space-y-3">
							{stats.recentSchools.map((school) => (
								<Link
									key={school.host}
									href={`/superadmin/schools/${school.host}`}
									className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors dark:hover:bg-gray-800/50"
								>
									<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#465fff]/10 text-xs font-bold text-[#465fff]">
										{school.initials}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-gray-900 dark:text-white truncate">{school.name}</p>
										<p className="text-xs text-gray-500 truncate">{school.host}</p>
									</div>
									<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
										school.isActive
											? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
											: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
									}`}>
										{school.isActive ? 'Active' : 'Inactive'}
									</span>
								</Link>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
