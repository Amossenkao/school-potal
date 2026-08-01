'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

interface TenantUsage {
	schoolId: string;
	schoolName?: string;
	databaseName?: string;
	storage?: string;
	storageBytes?: number;
	dataSizeBytes?: number;
	indexSizeBytes?: number;
	documents?: number;
	collections?: number;
	collectedAt?: string;
}

interface HistoryPoint {
	collectedAt: string;
	storageBytes: number;
	documents: number;
}

function formatBytes(bytes: number) {
	if (!bytes) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${(bytes / 1024 ** exponent).toFixed(2)} ${units[exponent]}`;
}

function formatBytesShort(bytes: number) {
	if (!bytes) return '0';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${(bytes / 1024 ** exponent).toFixed(1)}${units[exponent]}`;
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(value));
}

function StatBox({ label, value, tone }: { label: string; value: string; tone?: 'default' | 'muted' }) {
	return (
		<div className={`rounded-lg p-4 ${tone === 'muted' ? 'bg-gray-50 dark:bg-gray-900' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
			<p className={`text-xs ${tone === 'muted' ? 'text-gray-500' : 'text-emerald-700 dark:text-emerald-300'}`}>{label}</p>
			<p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{value}</p>
		</div>
	);
}

export default function DatabaseDetailPanel({
	tenant,
	onClose,
}: {
	tenant: TenantUsage;
	onClose: () => void;
}) {
	const [history, setHistory] = useState<HistoryPoint[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		setIsLoading(true);

		fetch(`/api/admin/monitoring/database?schoolId=${encodeURIComponent(tenant.schoolId)}`)
			.then((response) => response.json())
			.then((payload) => {
				if (cancelled) return;
				setHistory(Array.isArray(payload.data?.history) ? payload.data.history : []);
			})
			.catch(() => {
				if (!cancelled) setHistory([]);
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [tenant.schoolId]);

	const dataSizeBytes = tenant.dataSizeBytes ?? 0;
	const indexBytes = tenant.indexSizeBytes ?? 0;
	const totalBytes = dataSizeBytes + indexBytes;

	const first = history[0];
	const last = history[history.length - 1];
	const growthPercent =
		first && last && first.storageBytes > 0
			? Math.round(((last.storageBytes - first.storageBytes) / first.storageBytes) * 100)
			: 0;

	return (
		<div className="rounded-xl border border-gray-200 bg-card p-5 dark:border-gray-800">
			<div className="mb-5 flex items-center justify-between">
				<div>
					<h2 className="text-sm font-semibold text-gray-900 dark:text-white">
						{tenant.schoolName || tenant.schoolId} Database
					</h2>
					<p className="mt-1 font-mono text-xs text-gray-500">{tenant.databaseName || '—'}</p>
				</div>
				<button
					className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
					onClick={onClose}
					type="button"
					aria-label="Close database details"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<StatBox label="Collections" value={(tenant.collections ?? 0).toLocaleString()} tone="muted" />
				<StatBox label="Documents" value={(tenant.documents ?? 0).toLocaleString()} tone="muted" />
			</div>

			<div className="mt-3 rounded-lg border border-gray-100 p-4 dark:border-gray-800">
				<p className="mb-3 text-xs font-semibold uppercase text-gray-400">Storage</p>
				<div className="grid gap-2 text-sm">
					<div className="flex items-center justify-between">
						<span className="text-gray-500">Data</span>
						<span className="font-medium text-gray-900 dark:text-white">{formatBytes(dataSizeBytes)}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-gray-500">Indexes</span>
						<span className="font-medium text-gray-900 dark:text-white">{formatBytes(indexBytes)}</span>
					</div>
					<div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
						<span className="font-medium text-gray-700 dark:text-gray-300">Total</span>
						<span className="font-bold text-gray-900 dark:text-white">{formatBytes(totalBytes)}</span>
					</div>
				</div>
			</div>

			<div className="mt-4">
				<p className="mb-2 text-xs font-semibold uppercase text-gray-400">Historical Metrics</p>
				{isLoading ? (
					<p className="py-4 text-center text-sm text-gray-500">Loading history...</p>
				) : history.length === 0 ? (
					<p className="py-4 text-center text-sm text-gray-500">
						No historical metrics yet. Metrics are recorded on each monitoring collection.
					</p>
				) : (
					<>
						{history.length > 1 && (
							<p className="mb-2 text-xs text-gray-500">
								Growth over tracked period:{' '}
								<span className={`font-semibold ${growthPercent > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
									{growthPercent > 0 ? '+' : ''}{growthPercent}%
								</span>
							</p>
						)}
						{history.length > 1 && (
							<div className="mb-3 h-40 rounded-lg border border-gray-100 p-2 dark:border-gray-800">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart
										data={history.map((point) => ({
											time: formatDate(point.collectedAt),
											bytes: point.storageBytes,
										}))}
										margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
									>
										<defs>
											<linearGradient id={`storage-${tenant.schoolId}`} x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor="#465fff" stopOpacity={0.35} />
												<stop offset="95%" stopColor="#465fff" stopOpacity={0.02} />
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" />
										<XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} minTickGap={24} />
										<YAxis tickFormatter={formatBytesShort} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={44} domain={['auto', 'auto']} />
										<Tooltip
											formatter={(value) => [formatBytes(Number(value)), 'Storage']}
											labelStyle={{ color: '#6b7280', fontSize: 11 }}
											contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
										/>
										<Area type="monotone" dataKey="bytes" stroke="#465fff" strokeWidth={2} fill={`url(#storage-${tenant.schoolId})`} />
									</AreaChart>
								</ResponsiveContainer>
							</div>
						)}
						<div className="max-h-48 overflow-y-auto">
							<table className="w-full text-left text-sm">
								<thead className="text-xs uppercase text-gray-400">
									<tr>
										<th className="pb-2 font-semibold">Collected</th>
										<th className="pb-2 text-right font-semibold">Storage</th>
										<th className="pb-2 text-right font-semibold">Documents</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
									{history.slice(-14).map((point, index) => (
										<tr key={index}>
											<td className="py-2 text-gray-600 dark:text-gray-300">{formatDate(point.collectedAt)}</td>
											<td className="py-2 text-right font-medium text-gray-900 dark:text-white">
												{formatBytes(point.storageBytes)}
											</td>
											<td className="py-2 text-right text-gray-600 dark:text-gray-300">
												{point.documents.toLocaleString()}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
