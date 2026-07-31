import { FileSearch } from 'lucide-react';

interface LogEntry {
	id: string;
	timestamp: string;
	level: string;
	message: string;
	requestId?: string;
	tenantId?: string;
	schoolId?: string;
	schoolName?: string;
	module?: string;
	operation?: string;
	path?: string;
	method?: string;
	statusCode?: number;
	errorName?: string;
	errorCode?: string;
	stackPreview?: string;
	source?: string;
}

function formatTime(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(value));
}

function levelClass(level: string) {
	if (level === 'error' || level === 'critical') return 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300';
	if (level === 'warning') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300';
	return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
}

export default function LogExplorer({ logs }: { logs: LogEntry[] }) {
	return (
		<div className="rounded-xl border border-gray-200 bg-card p-5 dark:border-gray-800">
			<div className="mb-5 flex items-center gap-2">
				<FileSearch className="h-5 w-5 text-[#465fff]" />
				<h2 className="text-sm font-semibold text-gray-900 dark:text-white">Application Logs</h2>
			</div>
			{logs.length === 0 ? (
				<p className="py-10 text-center text-sm text-gray-500">No logs match the current filters.</p>
			) : (
				<div className="space-y-3">
					{logs.map((log) => (
						<div key={log.id} className="rounded-lg border border-gray-100 p-4 dark:border-gray-800">
							<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
								<div className="min-w-0">
									<div className="mb-2 flex flex-wrap items-center gap-2">
										<span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${levelClass(log.level)}`}>
											{log.level}
										</span>
										<span className="text-xs text-gray-500">{formatTime(log.timestamp)}</span>
										{log.source && <span className="text-xs text-gray-400">Source: {log.source}</span>}
									</div>
									<p className="text-sm font-semibold text-gray-900 dark:text-white">{log.message}</p>
									<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
										{log.operation && <span>Operation: {log.operation}</span>}
										{log.module && <span>Module: {log.module}</span>}
										{log.path && <span>Route: {log.method ? `${log.method} ` : ''}{log.path}</span>}
										{log.statusCode && <span>Status: {log.statusCode}</span>}
										{log.tenantId && <span>Tenant: {log.tenantId}</span>}
										{log.schoolName && <span>School: {log.schoolName}</span>}
										{log.requestId && <span>Request: {log.requestId}</span>}
									</div>
								</div>
								{log.errorName && (
									<span className="shrink-0 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
										{log.errorName}
									</span>
								)}
							</div>
							{log.stackPreview && (
								<pre className="mt-3 max-h-36 overflow-auto rounded-lg bg-gray-950 p-3 text-xs leading-relaxed text-gray-100">
									{log.stackPreview}
								</pre>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
