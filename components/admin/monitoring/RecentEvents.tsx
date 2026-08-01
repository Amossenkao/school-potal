'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Clock, Loader2 } from 'lucide-react';

import type { IncidentDetail, LogEventDetail } from '@/lib/monitoring/types';

import LogDetailPanel from './LogDetailPanel';

interface EventItem {
	id?: string;
	timestamp?: string;
	createdAt?: string;
	level?: string;
	severity?: string;
	message?: string;
	schoolName?: string;
	schoolId?: string;
	module?: string;
	source?: string;
	type?: string;
	resolved?: boolean;
}

function eventTime(event: EventItem) {
	const value = event.timestamp || event.createdAt;
	if (!value) return 'Now';
	return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function levelClass(level?: string) {
	if (level === 'error' || level === 'critical') return 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300';
	if (level === 'warning') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300';
	return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
}

const PROVIDER_SOURCES = new Set(['sentry', 'betterstack']);

export default function RecentEvents({ events }: { events: EventItem[] }) {
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const [details, setDetails] = useState<Record<string, { detail: LogEventDetail | IncidentDetail; source: string }>>({});

	async function toggleExpand(event: EventItem) {
		const id = String(event.id || '');
		if (!id) return;
		if (expandedId === id) {
			setExpandedId(null);
			return;
		}
		setExpandedId(id);
		if (details[id]) return;

		const source = event.source === 'betterstack' ? 'betterstack' : 'sentry';
		if (!PROVIDER_SOURCES.has(source)) return;

		setLoadingId(id);
		try {
			const response = await fetch(`/api/admin/monitoring/logs/${encodeURIComponent(id)}?source=${source}`);
			const payload = await response.json();
			if (payload.success) {
				setDetails((current) => ({ ...current, [id]: { detail: payload.data, source: payload.source || source } }));
			}
		} catch {
			// Ignore — stays collapsed.
		} finally {
			setLoadingId(null);
		}
	}

	return (
		<div className="rounded-xl border border-gray-200 bg-card p-5 dark:border-gray-800">
			<div className="mb-5 flex items-center gap-2">
				<Clock className="h-5 w-5 text-[#465fff]" />
				<h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Events</h2>
			</div>
			{events.length === 0 ? (
				<p className="py-8 text-center text-sm text-gray-500">No recent monitoring events.</p>
			) : (
				<div className="divide-y divide-gray-100 dark:divide-gray-800">
					{events.slice(0, 10).map((event, index) => {
						const id = String(event.id || index);
						const isExpanded = expandedId === id;
						const isLoading = loadingId === id;
						const isProvider = PROVIDER_SOURCES.has(String(event.source || ''));
						const canExpand = isProvider || event.type;
						return (
							<motion.div
								key={id}
								initial={{ opacity: 0, y: -8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.25 }}
							>
								<div
									className={`grid gap-3 py-3 sm:grid-cols-[70px_90px_1fr] ${canExpand ? 'cursor-pointer' : ''}`}
									onClick={() => canExpand && toggleExpand(event)}
									role={canExpand ? 'button' : undefined}
								>
									<span className="text-xs font-medium text-gray-500">{eventTime(event)}</span>
									<span className={`rounded-full px-2 py-0.5 text-center text-xs font-semibold uppercase ${levelClass(event.level || event.severity)}`}>
										{event.level || event.severity || 'info'}
									</span>
									<div className="flex min-w-0 items-start justify-between gap-2">
										<div className="min-w-0">
											<p className="text-sm font-medium text-gray-900 dark:text-white">{event.message || 'Monitoring event'}</p>
											<p className="mt-1 text-xs text-gray-500">
												School: {event.schoolName || event.schoolId || 'Platform'} · Module: {event.module || 'Core'}
											</p>
										</div>
										<div className="shrink-0">
											{isLoading ? (
												<Loader2 className="h-4 w-4 animate-spin text-gray-400" />
											) : canExpand ? (
												isExpanded ? (
													<ChevronDown className="h-4 w-4 text-gray-400" />
												) : (
													<ChevronRight className="h-4 w-4 text-gray-400" />
												)
											) : null}
										</div>
									</div>
								</div>
								<AnimatePresence initial={false}>
									{isExpanded && (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: 'auto', opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.2, ease: 'easeOut' }}
											className="overflow-hidden"
										>
											{isLoading ? (
												<p className="py-4 text-center text-sm text-gray-500">Loading details...</p>
											) : details[id] ? (
												<LogDetailPanel detail={details[id].detail} source={details[id].source} />
											) : event.type ? (
												<div className="mb-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
													<p className="text-xs font-semibold uppercase text-gray-400">{event.type}</p>
													<p className="mt-1">{event.message || 'No additional details.'}</p>
													{typeof event.resolved === 'boolean' && (
														<p className="mt-1 text-xs text-gray-500">Resolved: {event.resolved ? 'Yes' : 'No'}</p>
													)}
												</div>
											) : null}
										</motion.div>
									)}
								</AnimatePresence>
							</motion.div>
						);
					})}
				</div>
			)}
		</div>
	);
}
