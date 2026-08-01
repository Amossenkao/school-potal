'use client';

import { Fragment, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

import type { RecentError, SentryIssueDetail } from '@/lib/monitoring/types';

import LogDetailPanel from './LogDetailPanel';

function formatTime(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(value));
}

function levelBadge(level: string) {
	if (level === 'error' || level === 'critical') return 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300';
	if (level === 'warning') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300';
	return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
}

export default function ErrorIssuesTable({ issues = [] }: { issues: RecentError[] }) {
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const [details, setDetails] = useState<Record<string, SentryIssueDetail>>({});

	async function toggleExpand(issue: RecentError) {
		if (expandedId === issue.id) {
			setExpandedId(null);
			return;
		}
		setExpandedId(issue.id);
		if (details[issue.id]) return;

		setLoadingId(issue.id);
		try {
			const response = await fetch(`/api/admin/monitoring/errors/${encodeURIComponent(issue.id)}`);
			const payload = await response.json();
			if (payload.success) {
				setDetails((current) => ({ ...current, [issue.id]: payload.data }));
			}
		} catch {
			// Ignore — row stays collapsed.
		} finally {
			setLoadingId(null);
		}
	}

	if (issues.length === 0) {
		return (
			<div className="rounded-xl border border-gray-200 bg-card p-5 dark:border-gray-800">
				<div className="mb-4 flex items-center gap-2">
					<AlertTriangle className="h-5 w-5 text-amber-500" />
					<h2 className="text-sm font-semibold text-gray-900 dark:text-white">Sentry Issues</h2>
				</div>
				<p className="py-6 text-center text-sm text-gray-500">No Sentry issues reported in the last 24 hours.</p>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-gray-200 bg-card p-5 dark:border-gray-800">
			<div className="mb-4 flex items-center gap-2">
				<AlertTriangle className="h-5 w-5 text-amber-500" />
				<h2 className="text-sm font-semibold text-gray-900 dark:text-white">Sentry Issues</h2>
				<span className="ml-auto rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
					{issues.length}
				</span>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm">
					<thead className="text-xs uppercase text-gray-400">
						<tr>
							<th className="pb-3 font-semibold">Level</th>
							<th className="pb-3 font-semibold">Issue</th>
							<th className="pb-3 text-right font-semibold">Events</th>
							<th className="pb-3 font-semibold">Last seen</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
						{issues.map((issue) => {
							const isExpanded = expandedId === issue.id;
							const isLoading = loadingId === issue.id;
							const detail = details[issue.id];
							return (
								<Fragment key={issue.id}>
									<tr
										className="cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
										onClick={() => toggleExpand(issue)}
									>
										<td className="py-3 pr-3">
											<span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${levelBadge(issue.level)}`}>
												{issue.level}
											</span>
										</td>
										<td className="py-3 pr-3">
											<p className="font-medium text-gray-900 dark:text-white">{issue.title}</p>
											<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
												{issue.module && <span className="font-mono">{issue.module}</span>}
												{issue.schoolName && <span>School: {issue.schoolName}</span>}
												{issue.status && <span className="capitalize">{issue.status}</span>}
											</div>
										</td>
										<td className="py-3 text-right text-gray-600 dark:text-gray-300">{issue.count.toLocaleString()}</td>
										<td className="py-3 text-xs text-gray-500">{issue.lastSeen ? formatTime(issue.lastSeen) : '—'}</td>
										<td className="py-3 pl-2">
											{isLoading ? (
												<Loader2 className="h-4 w-4 animate-spin text-gray-400" />
											) : isExpanded ? (
												<ChevronDown className="h-4 w-4 text-gray-400" />
											) : (
												<ChevronRight className="h-4 w-4 text-gray-400" />
											)}
										</td>
									</tr>
									<AnimatePresence initial={false}>
										{isExpanded && (
											<tr key={`${issue.id}-detail`}>
												<td colSpan={5} className="p-0">
													<motion.div
														initial={{ height: 0, opacity: 0 }}
														animate={{ height: 'auto', opacity: 1 }}
														exit={{ height: 0, opacity: 0 }}
														transition={{ duration: 0.2, ease: 'easeOut' }}
														className="overflow-hidden"
													>
														<div className="border-y border-gray-100 bg-gray-50/50 px-4 py-4 dark:border-gray-800 dark:bg-gray-900/40">
															{isLoading ? (
																<p className="py-4 text-center text-sm text-gray-500">Loading issue details...</p>
															) : detail ? (
																<div>
																	{detail.issue.externalUrl && (
																		<a
																			className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
																			href={detail.issue.externalUrl}
																			target="_blank"
																			rel="noreferrer"
																		>
																			Open in Sentry
																		</a>
																	)}
																	{detail.detail ? (
																		<LogDetailPanel detail={detail.detail} source="sentry" />
																	) : (
																		<p className="text-sm text-gray-500">No event details available for this issue.</p>
																	)}
																</div>
															) : null}
														</div>
													</motion.div>
												</td>
											</tr>
										)}
									</AnimatePresence>
								</Fragment>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
