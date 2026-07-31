import { Activity, CheckCircle2, CircleAlert, CircleX } from 'lucide-react';

import type { MonitoringDashboardData } from './types';

function StatusIcon({ status }: { status?: string }) {
	if (status === 'critical' || status === 'error') return <CircleX className="h-4 w-4 text-red-500" />;
	if (status === 'warning' || status === 'degraded' || status === 'unconfigured') return <CircleAlert className="h-4 w-4 text-amber-500" />;
	return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
}

function label(status?: string) {
	if (!status) return 'Unknown';
	return status.replace(/_/g, ' ').replace(/^\w/, (char) => char.toUpperCase());
}

export default function SystemHealthCard({ data }: { data: MonitoringDashboardData }) {
	const providers = data.health?.providers ?? [];
	const rows = [
		['Application', data.health?.application || data.systemStatus],
		['Database', data.health?.database],
		['Cloudflare R2', data.health?.storage || data.storage?.status],
		['Monitoring', data.health?.monitoring],
	];

	return (
		<div className="rounded-xl border border-gray-200 bg-card p-5 dark:border-gray-800">
			<div className="mb-5 flex items-center gap-2">
				<Activity className="h-5 w-5 text-[#465fff]" />
				<h2 className="text-sm font-semibold text-gray-900 dark:text-white">System Health</h2>
			</div>
			<div className="space-y-3">
				{rows.map(([name, status]) => (
					<div key={name} className="flex items-center justify-between text-sm">
						<span className="text-gray-500">{name}</span>
						<span className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
							<StatusIcon status={status} />
							{label(status)}
						</span>
					</div>
				))}
			</div>
			<div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
				<p className="mb-3 text-xs font-semibold uppercase text-gray-400">Providers</p>
				<div className="grid gap-2 sm:grid-cols-2">
					{providers.map((provider) => (
						<div key={provider.provider} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-gray-900">
							<span className="font-medium capitalize text-gray-700 dark:text-gray-300">{provider.provider}</span>
							<span className="flex items-center gap-1 text-gray-500">
								<StatusIcon status={provider.status} />
								{label(provider.status)}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
