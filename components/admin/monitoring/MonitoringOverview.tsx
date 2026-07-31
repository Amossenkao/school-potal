'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw } from 'lucide-react';

import ErrorSummaryCard from './ErrorSummaryCard';
import LogExplorer from './LogExplorer';
import RecentEvents from './RecentEvents';
import SchoolHealthTable from './SchoolHealthTable';
import StorageCard from './StorageCard';
import SystemHealthCard from './SystemHealthCard';
import type { MonitoringDashboardData, MonitoringFilters } from './types';

export default function MonitoringOverview() {
	const [data, setData] = useState<MonitoringDashboardData | null>(null);
	const [events, setEvents] = useState<any[]>([]);
	const [logs, setLogs] = useState<any[]>([]);
	const [loadError, setLoadError] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [filters, setFilters] = useState<MonitoringFilters>({
		schoolId: '',
		severity: '',
		module: '',
		requestId: '',
		dateFrom: '',
		dateTo: '',
	});

	const queryString = useMemo(() => {
		const params = new URLSearchParams();
		Object.entries(filters).forEach(([key, value]) => {
			if (value) params.set(key, value);
		});
		return params.toString();
	}, [filters]);

	async function loadMonitoring(refresh = false) {
		setIsLoading(true);
		const overviewUrl = `/api/admin/monitoring/overview${refresh ? '?refresh=true' : ''}`;
		const errorsUrl = `/api/admin/monitoring/errors${queryString ? `?${queryString}` : ''}`;
		const logsUrl = `/api/admin/monitoring/logs${queryString ? `?${queryString}` : ''}`;

		try {
			setLoadError('');
			const [overviewResponse, errorsResponse, logsResponse] = await Promise.all([
				fetch(overviewUrl),
				fetch(errorsUrl),
				fetch(logsUrl),
			]);
			const [overviewPayload, errorsPayload, logsPayload] = await Promise.all([
				overviewResponse.json(),
				errorsResponse.json(),
				logsResponse.json(),
			]);

			if (!overviewResponse.ok || !errorsResponse.ok || !logsResponse.ok) {
				throw new Error(
					logsPayload.message ||
					errorsPayload.message ||
					overviewPayload.message ||
					'Failed to load observability data',
				);
			}

			setData(overviewPayload.data);
			setEvents([
				...(errorsPayload.data?.alerts ?? []),
				...(logsPayload.data?.entries ?? []),
			]);
			setLogs(logsPayload.data?.entries ?? []);
		} catch (error) {
			setLoadError(error instanceof Error ? error.message : 'Failed to load observability data');
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		loadMonitoring();
	}, [queryString]);

	if (isLoading && !data) {
		return <div className="py-16 text-center text-sm text-gray-500">Loading monitoring data...</div>;
	}

	const summary = data ?? {};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Observability</h1>
					<p className="mt-1 text-sm text-gray-500">Unified operational view across errors, logs, storage, health, and deployments.</p>
				</div>
				<button
					className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#465fff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3648d9]"
					onClick={() => loadMonitoring(true)}
					type="button"
				>
					<RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
					Refresh
				</button>
			</div>

			{loadError && (
				<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
					{loadError}
				</div>
			)}

			<div className="grid gap-3 rounded-xl border border-gray-200 bg-card p-4 dark:border-gray-800 sm:grid-cols-2 lg:grid-cols-6">
				<input className="rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-800" placeholder="School" value={filters.schoolId} onChange={(event) => setFilters((current) => ({ ...current, schoolId: event.target.value }))} />
				<select className="rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-800" value={filters.severity} onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))}>
					<option value="">All severities</option>
					<option value="warning">Warning</option>
					<option value="critical">Critical</option>
				</select>
				<input className="rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-800" placeholder="Module" value={filters.module} onChange={(event) => setFilters((current) => ({ ...current, module: event.target.value }))} />
				<input className="rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-800" placeholder="Request ID" value={filters.requestId} onChange={(event) => setFilters((current) => ({ ...current, requestId: event.target.value }))} />
				<input className="rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-800" type="date" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} />
				<input className="rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-800" type="date" value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} />
			</div>

			<div className="grid gap-6 xl:grid-cols-3">
				<SystemHealthCard data={summary} />
				<ErrorSummaryCard data={summary} />
				<StorageCard data={summary} />
			</div>

			<div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
				<RecentEvents events={events} />
				<SchoolHealthTable data={summary} />
			</div>

			<LogExplorer logs={logs} />
		</div>
	);
}
