import { AlertTriangle } from 'lucide-react';

import type { MonitoringDashboardData } from './types';

export default function ErrorSummaryCard({ data }: { data: MonitoringDashboardData }) {
	const affectedSchools = data.errors?.affectedSchools ?? [];

	return (
		<div className="rounded-xl border border-gray-200 bg-card p-5 dark:border-gray-800">
			<div className="mb-5 flex items-center gap-2">
				<AlertTriangle className="h-5 w-5 text-amber-500" />
				<h2 className="text-sm font-semibold text-gray-900 dark:text-white">Error Overview</h2>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
					<p className="text-xs text-gray-500">Last 24 Hours</p>
					<p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{data.errors?.last24Hours ?? 0}</p>
				</div>
				<div className="rounded-lg bg-red-50 p-4 dark:bg-red-950/30">
					<p className="text-xs text-red-500">Critical</p>
					<p className="mt-2 text-2xl font-bold text-red-600">{data.errors?.critical ?? 0}</p>
				</div>
			</div>
			<div className="mt-4">
				<p className="mb-2 text-xs font-semibold uppercase text-gray-400">Affected Schools</p>
				{affectedSchools.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{affectedSchools.slice(0, 6).map((school) => (
							<span key={school} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
								{school}
							</span>
						))}
					</div>
				) : (
					<p className="text-sm text-gray-500">No affected schools reported.</p>
				)}
			</div>
		</div>
	);
}
