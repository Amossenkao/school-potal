import { Database, GitBranch } from 'lucide-react';

import type { MonitoringDashboardData } from './types';

export default function StorageCard({ data }: { data: MonitoringDashboardData }) {
	return (
		<div className="rounded-xl border border-gray-200 bg-card p-5 dark:border-gray-800">
			<div className="mb-5 flex items-center gap-2">
				<Database className="h-5 w-5 text-cyan-500" />
				<h2 className="text-sm font-semibold text-gray-900 dark:text-white">Infrastructure Metrics</h2>
			</div>
			<div className="space-y-4">
				<div className="grid grid-cols-2 gap-3">
					<div className="rounded-lg bg-cyan-50 p-4 dark:bg-cyan-950/30">
						<p className="text-xs text-cyan-700 dark:text-cyan-300">R2 Storage Used</p>
						<p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{data.storage?.used ?? '0 B'}</p>
					</div>
					<div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
						<p className="text-xs text-gray-500">Object Count</p>
						<p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{(data.storage?.objects ?? 0).toLocaleString()}</p>
					</div>
				</div>
				<div className="rounded-lg border border-gray-100 p-4 dark:border-gray-800">
					<div className="mb-2 flex items-center gap-2">
						<GitBranch className="h-4 w-4 text-[#465fff]" />
						<p className="text-xs font-semibold uppercase text-gray-400">Deployment</p>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-gray-500">Status</span>
						<span className="font-medium capitalize text-gray-900 dark:text-white">{data.deployment?.status ?? 'unknown'}</span>
					</div>
					<div className="mt-2 flex items-center justify-between text-sm">
						<span className="text-gray-500">Version</span>
						<span className="font-medium text-gray-900 dark:text-white">{data.deployment?.version ?? 'not reported'}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
