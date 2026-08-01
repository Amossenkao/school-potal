'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, RefreshCcw } from 'lucide-react';

import { useSuperadminRealtime } from '@/app/dashboard/admin/hooks/useSuperadminRealtime';
import type { RealtimeEvent } from '@/lib/realtimeTypes';

import DatabaseDetailPanel from './DatabaseDetailPanel';
import DatabaseHealthCard from './DatabaseHealthCard';
import ErrorIssuesTable from './ErrorIssuesTable';
import ErrorSummaryCard from './ErrorSummaryCard';
import LogExplorer from './LogExplorer';
import RecentEvents from './RecentEvents';
import SchoolHealthTable from './SchoolHealthTable';
import StorageCard from './StorageCard';
import SystemHealthCard from './SystemHealthCard';
import TenantDatabaseUsageTable from './TenantDatabaseUsageTable';
import type { MonitoringDashboardData, MonitoringFilters } from './types';

const MONITORING_EVENT_TYPES = new Set([
	'MONITORING_UPDATED',
	'SYSTEM_ALERT_CREATED',
	'APPLICATION_LOG_CREATED',
	'APPLICATION_WARNING_CREATED',
]);

const STALE_SNAPSHOT_MS = 10 * 60 * 1000;

function eventFromPayload(event: RealtimeEvent) {
	const payload = (event.payload || {}) as Record<string, any>;
	return {
		id: String(payload.id || ''),
		timestamp: String(payload.timestamp || event.timestamp),
		level: payload.level,
		message: payload.message,
		schoolId: payload.schoolId,
		schoolName: payload.schoolName,
		module: payload.module,
		source: payload.source,
		type: event.type,
	};
}

function timeAgo(value: number | undefined, now: number) {
	if (!value) return null;
	const seconds = Math.max(0, Math.floor((now - value) / 1000));
	if (seconds < 5) return 'just now';
	if (seconds < 60) return `${seconds}s ago`;
	return `${Math.floor(seconds / 60)}m ago`;
}

export default function MonitoringOverview() {
	const [data, setData] = useState<MonitoringDashboardData | null>(null);
	const [events, setEvents] = useState<any[]>([]);
	const [liveEvents, setLiveEvents] = useState<any[]>([]);
	const [logs, setLogs] = useState<any[]>([]);
	const [issues, setIssues] = useState<any[]>([]);
	const [loadError, setLoadError] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [lastUpdatedAt, setLastUpdatedAt] = useState<number | undefined>(undefined);
	const [now, setNow] = useState(Date.now());
	const [selectedSchoolId, setSelectedSchoolId] = useState('');
	const [filters, setFilters] = useState<MonitoringFilters>({
		schoolId: '',
		severity: '',
		module: '',
		requestId: '',
		dateFrom: '',
		dateTo: '',
	});

	const inFlightRef = useRef(false);
	const autoRefreshedRef = useRef(false);

	const queryString = useMemo(() => {
		const params = new URLSearchParams();
		Object.entries(filters).forEach(([key, value]) => {
			if (value) params.set(key, value);
		});
		return params.toString();
	}, [filters]);

	const loadMonitoring = useCallback(
		async (refresh = false, silent = false) => {
			if (inFlightRef.current) return;
			inFlightRef.current = true;
			if (!silent) setIsLoading(true);

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

				const logRows = logsPayload.data?.entries ?? [];
				const alertRows = (errorsPayload.data?.alerts ?? []).map((alert: any) => ({
					id: String(alert._id || alert.createdAt || alert.type || ''),
					timestamp: alert.createdAt,
					createdAt: alert.createdAt,
					level: alert.severity,
					message: alert.message,
					schoolId: alert.schoolId,
					schoolName: alert.schoolName,
					module: alert.module,
					type: alert.type,
					resolved: alert.resolved,
				}));

				setData(overviewPayload.data);
				setIssues(errorsPayload.data?.errors ?? []);
				setEvents([...alertRows, ...logRows]);
				setLogs(logRows);
				setLastUpdatedAt(Date.now());
			} catch (error) {
				setLoadError(error instanceof Error ? error.message : 'Failed to load observability data');
			} finally {
				inFlightRef.current = false;
				if (!silent) setIsLoading(false);
			}
		},
		[queryString],
	);

	const handleRealtimeEvent = useCallback(
		(event: RealtimeEvent) => {
			if (!MONITORING_EVENT_TYPES.has(event.type)) return;
			setLastUpdatedAt(Date.now());
			if (
				event.type === 'APPLICATION_LOG_CREATED' ||
				event.type === 'APPLICATION_WARNING_CREATED' ||
				event.type === 'SYSTEM_ALERT_CREATED'
			) {
				setLiveEvents((current) => [eventFromPayload(event), ...current].slice(0, 25));
			}
			void loadMonitoring(false, true);
		},
		[loadMonitoring],
	);

	const { connected } = useSuperadminRealtime({ onEvent: handleRealtimeEvent });

	useEffect(() => {
		loadMonitoring();
	}, [loadMonitoring]);

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		if (connected) {
			void loadMonitoring(false, true);
		}
	}, [connected, loadMonitoring]);

	useEffect(() => {
		if (!data || autoRefreshedRef.current) return;
		const generatedAt =
			(data as any).generatedAt || (data as any).timestamp;
		const ageMs = generatedAt
			? Date.now() - new Date(generatedAt).getTime()
			: Infinity;
		if (ageMs > STALE_SNAPSHOT_MS) {
			autoRefreshedRef.current = true;
			void loadMonitoring(true, true);
		}
	}, [data, loadMonitoring]);

	if (isLoading && !data) {
		return <div className="py-16 text-center text-sm text-gray-500">Loading monitoring data...</div>;
	}

	const summary = data ?? {};
	const tenants = summary.database?.tenants ?? [];
	const selectedTenant = tenants.find((tenant) => tenant.schoolId === selectedSchoolId);

	const liveEventIds = new Set(liveEvents.map((event) => event.id).filter(Boolean));
	const displayEvents = [...liveEvents, ...events.filter((event) => !liveEventIds.has(event.id))];

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Observability</h1>
					<p className="mt-1 text-sm text-gray-500">Unified operational view across errors, logs, storage, health, and deployments.</p>
					<div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
						<span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1 font-semibold dark:border-gray-700">
							<span className={`h-2 w-2 rounded-full ${connected ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`} />
							{connected ? 'LIVE' : 'Reconnecting'}
						</span>
						<span>Updated {timeAgo(lastUpdatedAt, now) ?? '—'}</span>
					</div>
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

			<div className="space-y-6 border-t border-gray-100 pt-6 dark:border-gray-800">
				<div>
					<h2 className="text-sm font-semibold text-gray-900 dark:text-white">MongoDB</h2>
					<p className="mt-1 text-xs text-gray-500">
						Cluster health and database-per-tenant usage across all schools.
					</p>
				</div>
				<div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
					<DatabaseHealthCard data={summary} />
					<TenantDatabaseUsageTable
						tenants={tenants}
						selectedSchoolId={selectedSchoolId}
						onSelect={setSelectedSchoolId}
					/>
				</div>
				{selectedTenant && (
					<DatabaseDetailPanel
						tenant={selectedTenant}
						onClose={() => setSelectedSchoolId('')}
					/>
				)}
			</div>

			<ErrorIssuesTable issues={issues} />

			<div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
				<RecentEvents events={displayEvents} />
				<SchoolHealthTable data={summary} />
			</div>

			<LogExplorer logs={logs} />
		</div>
	);
}
