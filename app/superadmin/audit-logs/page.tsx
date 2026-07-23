'use client';

import { useEffect, useState } from 'react';
import {
	Loader2,
	AlertTriangle,
	Info,
	XCircle,
	CheckCircle,
	Filter,
	RefreshCw,
	Database,
} from 'lucide-react';

interface AuditLog {
	_id: string;
	level: 'info' | 'warning' | 'error' | 'success';
	category: 'system' | 'school' | 'auth' | 'user' | 'database';
	message: string;
	details?: any;
	source?: string;
	createdAt: string;
}

const LEVEL_CONFIG = {
	info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Info' },
	warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Warning' },
	error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: 'Error' },
	success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200', label: 'Success' },
};

const CATEGORY_LABELS: Record<string, string> = {
	system: 'System',
	school: 'School',
	auth: 'Auth',
	user: 'User',
	database: 'Database',
};

export default function AuditLogsPage() {
	const [logs, setLogs] = useState<AuditLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);
	const [levelFilter, setLevelFilter] = useState('');
	const [categoryFilter, setCategoryFilter] = useState('');
	const [seeding, setSeeding] = useState(false);

	useEffect(() => {
		fetchLogs();
	}, [page, levelFilter, categoryFilter]);

	const fetchLogs = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams({ page: String(page), limit: '30' });
			if (levelFilter) params.set('level', levelFilter);
			if (categoryFilter) params.set('category', categoryFilter);

			const res = await fetch(`/api/superadmin/audit-logs?${params}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to load logs');
			setLogs(data.logs || []);
			setTotalPages(data.pagination?.pages || 1);
			setTotal(data.pagination?.total || 0);
		} catch (e: any) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	const seedDemoLogs = async () => {
		try {
			setSeeding(true);
			await fetch('/api/superadmin/audit-logs/seed', { method: 'POST' });
			setPage(1);
			setLevelFilter('');
			setCategoryFilter('');
			await fetchLogs();
		} catch {
			// ignore
		} finally {
			setSeeding(false);
		}
	};

	const formatTime = (iso: string) => {
		const d = new Date(iso);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return 'Just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHrs = Math.floor(diffMin / 60);
		if (diffHrs < 24) return `${diffHrs}h ago`;
		const diffDays = Math.floor(diffHrs / 24);
		if (diffDays < 7) return `${diffDays}d ago`;
		return d.toLocaleDateString();
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
					<p className="text-sm text-gray-500 mt-1">
						System-wide event log — uptime, errors, and activity tracking.
					</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={seedDemoLogs}
						disabled={seeding}
						className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 disabled:opacity-50"
					>
						<Database className={`h-4 w-4 ${seeding ? 'animate-spin' : ''}`} />
						{seeding ? 'Seeding...' : 'Seed Demo Data'}
					</button>
					<button
						onClick={fetchLogs}
						disabled={loading}
						className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
					>
						<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
						Refresh
					</button>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex items-center gap-2 text-sm text-gray-500">
					<Filter className="h-4 w-4" />
					<span>Filter:</span>
				</div>
				<select
					value={levelFilter}
					onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
					className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-900 dark:text-white"
				>
					<option value="">All Levels</option>
					<option value="info">Info</option>
					<option value="success">Success</option>
					<option value="warning">Warning</option>
					<option value="error">Error</option>
				</select>
				<select
					value={categoryFilter}
					onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
					className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-900 dark:text-white"
				>
					<option value="">All Categories</option>
					<option value="system">System</option>
					<option value="school">School</option>
					<option value="auth">Auth</option>
					<option value="user">User</option>
					<option value="database">Database</option>
				</select>
				<span className="text-xs text-gray-400 ml-auto">{total.toLocaleString()} entries</span>
			</div>

			{/* Log entries */}
			<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
				{loading ? (
					<div className="flex items-center justify-center py-20">
						<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
					</div>
				) : error ? (
					<div className="py-20 text-center text-sm text-red-500">{error}</div>
				) : logs.length === 0 ? (
					<div className="py-20 text-center text-sm text-gray-500">No logs found.</div>
				) : (
					<div className="divide-y divide-gray-100 dark:divide-gray-800">
						{logs.map((log) => {
							const config = LEVEL_CONFIG[log.level];
							const Icon = config.icon;
							return (
								<div key={log._id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
									<div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
										<Icon className={`h-4 w-4 ${config.color}`} />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.bg} ${config.color}`}>
												{config.label}
											</span>
											<span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:bg-gray-800 dark:text-gray-400">
												{CATEGORY_LABELS[log.category] || log.category}
											</span>
											{log.source && (
												<span className="text-[10px] text-gray-400 font-mono">{log.source}</span>
											)}
										</div>
										<p className="mt-1.5 text-sm text-gray-900 dark:text-white">{log.message}</p>
										{log.details && (
											<pre className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 overflow-x-auto dark:bg-gray-800/50 dark:text-gray-400">
												{typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
											</pre>
										)}
									</div>
									<span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{formatTime(log.createdAt)}</span>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					<button
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						disabled={page === 1}
						className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors dark:border-gray-800 dark:text-gray-400"
					>
						Previous
					</button>
					<span className="text-sm text-gray-500">
						Page {page} of {totalPages}
					</span>
					<button
						onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
						disabled={page === totalPages}
						className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors dark:border-gray-800 dark:text-gray-400"
					>
						Next
					</button>
				</div>
			)}
		</div>
	);
}
