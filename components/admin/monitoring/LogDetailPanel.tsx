'use client';

import { useState } from 'react';
import { ChevronRight, ExternalLink, Globe, ListTree, Braces } from 'lucide-react';

import type { IncidentDetail, LogEventDetail, StackTraceFrame } from '@/lib/monitoring/types';

type Detail = LogEventDetail | IncidentDetail;

function isIncidentDetail(detail: Detail): detail is IncidentDetail {
	return 'updates' in detail;
}

function formatTime(value?: string) {
	if (!value) return '—';
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).format(new Date(value));
}

function ProviderLink({ url, label }: { url?: string; label: string }) {
	if (!url) return null;
	return (
		<a
			className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
			href={url}
			target="_blank"
			rel="noreferrer"
		>
			<ExternalLink className="h-3.5 w-3.5" />
			Open in {label}
		</a>
	);
}

function CodeLine({ line, isActive }: { line?: string; isActive?: boolean }) {
	if (line === undefined) return null;
	return (
		<div
			className={`flex items-center gap-3 whitespace-pre px-3 font-mono text-xs leading-6 ${
				isActive ? 'bg-[#465fff]/10 text-[#465fff] dark:text-[#8b9bff]' : 'text-gray-200 dark:text-gray-300'
			}`}
		>
			<span className="w-8 shrink-0 select-none" />
			<span className="min-w-0 flex-1">{line}</span>
		</div>
	);
}

function StackFrameView({ frame }: { frame: StackTraceFrame }) {
	const [showVars, setShowVars] = useState(false);
	const location = [frame.filename, frame.lineNo ? `:${frame.lineNo}` : '', frame.colNo ? `:${frame.colNo}` : ''].join('');

	return (
		<div className={`rounded-lg border px-3 py-2 ${frame.inApp ? 'border-[#465fff]/30 bg-[#465fff]/5' : 'border-gray-100 dark:border-gray-800'}`}>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="min-w-0 font-mono text-xs">
					{frame.function ? (
						<span className="font-semibold text-gray-900 dark:text-white">{frame.function}</span>
					) : (
						<span className="text-gray-400">&lt;anonymous&gt;</span>
					)}
					{location && <span className="ml-2 text-gray-500">{location}</span>}
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{frame.inApp && (
						<span className="rounded-full bg-[#465fff]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#465fff] dark:text-[#8b9bff]">in app</span>
					)}
					{frame.vars && Object.keys(frame.vars).length > 0 && (
						<button
							className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300"
							onClick={() => setShowVars((current) => !current)}
							type="button"
						>
							<Braces className="h-3 w-3" />
							Vars {showVars ? 'hide' : 'show'}
						</button>
					)}
				</div>
			</div>
			{(frame.contextLine || frame.preContext?.length || frame.postContext?.length) && (
				<pre className="mt-2 overflow-x-auto rounded-md bg-gray-950 py-2 dark:bg-gray-950">
					{frame.preContext?.map((line, index) => (
						<CodeLine key={`pre-${index}`} line={line} />
					))}
					<CodeLine line={frame.contextLine} isActive />
					{frame.postContext?.map((line, index) => (
						<CodeLine key={`post-${index}`} line={line} />
					))}
				</pre>
			)}
			{showVars && frame.vars && (
				<pre className="mt-2 max-h-48 overflow-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
					{JSON.stringify(frame.vars, null, 2)}
				</pre>
			)}
		</div>
	);
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
	return (
		<div className="mt-4">
			<p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-400">
				{icon}
				{title}
			</p>
			{children}
		</div>
	);
}

function SentryDetail({ detail }: { detail: LogEventDetail }) {
	return (
		<div>
			{detail.exceptions.length > 0 ? (
				detail.exceptions.map((exception, index) => (
					<div key={index} className="mt-3 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
						<p className="font-mono text-sm font-bold text-red-700 dark:text-red-300">
							{exception.type}
							{exception.value ? <span className="ml-2 font-medium text-red-600/80 dark:text-red-400/80">{exception.value}</span> : null}
						</p>
						{exception.mechanism && (
							<p className="mt-1 text-xs text-gray-500">Mechanism: {exception.mechanism}</p>
						)}
						<div className="mt-3 space-y-2">
							{exception.frames.length > 0 ? (
								exception.frames.map((frame, frameIndex) => (
									<StackFrameView key={frameIndex} frame={frame} />
								))
							) : (
								<p className="text-sm text-gray-500">No stack trace frames available for this event.</p>
							)}
						</div>
					</div>
				))
			) : (
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{detail.message || detail.title || 'No exception payload.'}</p>
			)}

			{detail.request && (
				<Section icon={<Globe className="h-3.5 w-3.5" />} title="Request">
					<div className="rounded-lg border border-gray-100 dark:border-gray-800">
						<div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2 text-xs dark:border-gray-800">
							{detail.request.method && (
								<span className="rounded bg-[#465fff]/10 px-1.5 py-0.5 font-mono font-semibold text-[#465fff]">{detail.request.method}</span>
							)}
							<span className="font-mono text-gray-700 dark:text-gray-300">{detail.request.url || detail.request.path || '—'}</span>
						</div>
						<div className="grid gap-2 px-3 py-2 sm:grid-cols-2">
							{detail.request.query && detail.request.query.length > 0 && (
								<div className="text-xs">
									<p className="font-semibold text-gray-500">Query</p>
									<p className="mt-1 break-all font-mono text-gray-700 dark:text-gray-300">{detail.request.query.join('&')}</p>
								</div>
							)}
							{detail.request.headers && Object.keys(detail.request.headers).length > 0 && (
								<div className="text-xs">
									<p className="font-semibold text-gray-500">Headers</p>
									<pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 font-mono text-[11px] text-gray-600 dark:bg-gray-900 dark:text-gray-300">
										{Object.entries(detail.request.headers).map(([key, value]) => `${key}: ${value}`).join('\n')}
									</pre>
								</div>
							)}
							{detail.request.data !== undefined && (
								<div className="text-xs">
									<p className="font-semibold text-gray-500">Body</p>
									<pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 font-mono text-[11px] text-gray-600 dark:bg-gray-900 dark:text-gray-300">
										{typeof detail.request.data === 'string' ? detail.request.data : JSON.stringify(detail.request.data, null, 2)}
									</pre>
								</div>
							)}
							{detail.request.env && Object.keys(detail.request.env).length > 0 && (
								<div className="text-xs">
									<p className="font-semibold text-gray-500">Environment</p>
									<pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 font-mono text-[11px] text-gray-600 dark:bg-gray-900 dark:text-gray-300">
										{Object.entries(detail.request.env).map(([key, value]) => `${key}: ${String(value)}`).join('\n')}
									</pre>
								</div>
							)}
						</div>
					</div>
				</Section>
			)}

			{detail.breadcrumbs.length > 0 && (
				<Section icon={<ListTree className="h-3.5 w-3.5" />} title="Breadcrumbs">
					<div className="space-y-1.5">
						{detail.breadcrumbs.map((crumb, index) => (
							<div key={index} className="flex flex-col gap-1 rounded-lg border border-gray-100 px-3 py-2 text-xs dark:border-gray-800 sm:flex-row sm:items-baseline sm:gap-3">
								<span className="w-24 shrink-0 font-mono text-gray-400">{formatTime(crumb.timestamp)}</span>
								<span className="w-20 shrink-0 font-semibold uppercase text-gray-600 dark:text-gray-300">
									{crumb.type || crumb.category || 'event'}
								</span>
								<span className="min-w-0 flex-1 text-gray-700 dark:text-gray-200">{crumb.message || '—'}</span>
								{crumb.level && <span className="shrink-0 text-gray-400">{crumb.level}</span>}
							</div>
						))}
					</div>
				</Section>
			)}

			{(detail.tags?.length || detail.contexts) && (
				<div className="grid gap-4 sm:grid-cols-2">
					{detail.tags && detail.tags.length > 0 && (
						<Section icon={<Braces className="h-3.5 w-3.5" />} title="Tags">
							<div className="flex flex-wrap gap-1.5">
								{detail.tags.map((tag, index) => (
									<span key={index} className="rounded-full bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-600 dark:bg-gray-900 dark:text-gray-300">
										<span className="text-gray-400">{tag.key}:</span> {tag.value}
									</span>
								))}
							</div>
						</Section>
					)}
					{detail.contexts && Object.keys(detail.contexts).length > 0 && (
						<Section icon={<Globe className="h-3.5 w-3.5" />} title="Contexts">
							<pre className="max-h-48 overflow-auto rounded-lg bg-gray-50 p-3 text-[11px] text-gray-600 dark:bg-gray-900 dark:text-gray-300">
								{JSON.stringify(detail.contexts, null, 2)}
							</pre>
						</Section>
					)}
				</div>
			)}
		</div>
	);
}

function IncidentDetailView({ detail }: { detail: IncidentDetail }) {
	const timeline = [
		{
			status: 'created',
			message: detail.message,
			createdAt: detail.createdAt,
			current: true,
		},
		...detail.updates,
	].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

	return (
		<div>
			<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
				<span className="font-semibold uppercase text-gray-400">Status</span>
				<span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-gray-800 dark:text-gray-300">{detail.status}</span>
				{detail.monitorName && <span>Monitor: {detail.monitorName}</span>}
				{detail.resolvedAt && <span>Resolved: {formatTime(detail.resolvedAt)}</span>}
			</div>
			<Section icon={<ListTree className="h-3.5 w-3.5" />} title="Timeline">
				<div className="space-y-1.5">
					{timeline.length === 0 ? (
						<p className="text-sm text-gray-500">No incident updates recorded.</p>
					) : (
						timeline.map((update, index) => (
							<div key={index} className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2 text-xs dark:border-gray-800">
								<ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
								<div className="min-w-0 flex-1">
									<p className="text-gray-700 dark:text-gray-200">{update.message || 'Status change'}</p>
									<p className="mt-0.5 text-gray-400">
										{update.status && <span className="font-semibold uppercase">{update.status}</span>}
										{update.status && update.createdAt && <span> · </span>}
										{formatTime(update.createdAt)}
									</p>
								</div>
							</div>
						))
					)}
				</div>
			</Section>
		</div>
	);
}

export default function LogDetailPanel({ detail, source }: { detail: Detail; source: string }) {
	const isBetterStack = source === 'betterstack' || isIncidentDetail(detail);

	return (
		<div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
			<div className="mb-2 flex items-center justify-between gap-2">
				<p className="text-sm font-semibold text-gray-900 dark:text-white">
					{isBetterStack ? (detail as IncidentDetail).message : (detail as LogEventDetail).title || (detail as LogEventDetail).message}
				</p>
				<div className="flex shrink-0 items-center gap-2">
					<ProviderLink url={isBetterStack ? (detail as IncidentDetail).externalUrl : (detail as LogEventDetail).externalUrl} label={isBetterStack ? 'BetterStack' : 'Sentry'} />
				</div>
			</div>
			{isBetterStack ? (
				<IncidentDetailView detail={detail as IncidentDetail} />
			) : (
				<SentryDetail detail={detail as LogEventDetail} />
			)}
		</div>
	);
}
