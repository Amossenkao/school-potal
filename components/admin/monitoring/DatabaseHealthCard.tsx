import { DatabaseZap } from 'lucide-react';

import type { MonitoringDashboardData } from './types';

function statusColor(status?: string) {
	if (status === 'critical' || status === 'error') return 'text-red-600 dark:text-red-400';
	if (status === 'warning' || status === 'degraded' || status === 'unconfigured') return 'text-amber-600 dark:text-amber-400';
	return 'text-emerald-600 dark:text-emerald-400';
}

function statusDot(status?: string) {
	if (status === 'critical' || status === 'error') return 'bg-red-500';
	if (status === 'warning' || status === 'degraded' || status === 'unconfigured') return 'bg-amber-500';
	return 'bg-emerald-500';
}

function label(status?: string) {
	if (!status) return 'Unknown';
	return status.replace(/_/g, ' ').replace(/^\w/, (char) => char.toUpperCase());
}

export default function DatabaseHealthCard({ data }: { data: MonitoringDashboardData }) {
	const cluster = data.database?.cluster;
	const status = cluster?.status ?? data.health?.database ?? 'unconfigured';
	const usedBytes = cluster?.storageUsedBytes ?? 0;
	const limitBytes = cluster?.storageLimitBytes ?? 0;
	const usedPercent = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;

	return (
		<div className="rounded-xl border border-gray-200 bg-card p-5 dark:border-gray-800">
			<div className="mb-5 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<DatabaseZap className="h-5 w-5 text-emerald-500" />
					<h2 className="text-sm font-semibold text-gray-900 dark:text-white">MongoDB Atlas</h2>
				</div>
				<span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
					<span className={`h-2.5 w-2.5 rounded-full ${statusDot(status)}`} />
					<span className={statusColor(status)}>{label(status)}</span>
				</span>
			</div>

			<div className="space-y-4">
				<div>
					<div className="mb-2 flex items-center justify-between text-sm">
						<span className="text-gray-500">Storage</span>
						<span className="font-medium text-gray-900 dark:text-white">
							{cluster?.storageUsed ?? '0 B'} {limitBytes > 0 ? `/ ${cluster?.storageLimit ?? ''}` : ''}
						</span>
					</div>
					<div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
						<div
							className={`h-full rounded-full ${usedPercent >= 95 ? 'bg-red-500' : usedPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
							style={{ width: `${Math.max(usedPercent, usedBytes > 0 ? 4 : 0)}%` }}
						/>
					</div>
					{limitBytes > 0 && (
						<p className="mt-1 text-right text-xs text-gray-400">{usedPercent}% used</p>
					)}
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
						<p className="text-xs text-gray-500">Connections</p>
						<p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
							{cluster?.connections?.toLocaleString() ?? 0}
						</p>
					</div>
					<div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
						<p className="text-xs text-gray-500">Operations</p>
						<p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
							{(cluster?.operationsPerSecond ?? 0).toLocaleString()}
							<span className="ml-1 text-sm font-medium text-gray-400">/min</span>
						</p>
					</div>
				</div>

				{cluster?.message && (
					<p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
						{cluster.message}
					</p>
				)}

				{cluster?.clusterName && cluster.clusterName !== 'unconfigured' && cluster.clusterName !== 'unavailable' && (
					<p className="text-xs text-gray-400">
						Cluster: <span className="font-medium text-gray-600 dark:text-gray-300">{cluster.clusterName}</span>
					</p>
				)}
			</div>
		</div>
	);
}
