'use client';

import { useState } from 'react';
import { ChevronRight, ExternalLink, Globe, ListTree, Braces, Info } from 'lucide-react';

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

function CodeLine({ line, isActive, lineNo }: { line?: string; isActive?: boolean; lineNo?: number }) {
	if (line === undefined) return null;
	return (
		<div
			className={`flex items-center gap-3 whitespace-pre px-3 font-mono text-xs leading-6 ${
				isActive
					? 'bg-[#465fff]/20 text-white'
					: 'text-gray-200 dark:text-gray-300'
			}`}
		>
			<span className={`w-10 shrink-0 select-none text-right ${isActive ? 'text-[#8b9bff]' : 'text-gray-600'}`}>
				{lineNo ?? ''}
			</span>
			<span className="min-w-0 flex-1">{line}</span>
		</div>
	);
}

function StackFrameView({ frame }: { frame: StackTraceFrame }) {
	const [showVars, setShowVars] = useState(false);
	const location = [frame.filename, frame.lineNo ? `:${frame.lineNo}` : '', frame.colNo ? `:${frame.colNo}` : ''].join('');
	const startLine = (frame.lineNo ?? 0) - (frame.preContext?.length ?? 0);

	return (
		<div className="rounded-lg border border-[#465fff]/30 bg-[#465fff]/5 px-3 py-2">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="min-w-0 font-mono text-xs">
					<span className="font-semibold text-gray-900 dark:text-white">
						{frame.function || '&lt;anonymous&gt;'}
					</span>
					{location && <span className="ml-2 text-gray-500">{location}</span>}
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<span className="rounded-full bg-[#465fff]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#465fff] dark:text-[#8b9bff]">in app</span>
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
						<CodeLine key={`pre-${index}`} line={line} lineNo={startLine + index} />
					))}
					<CodeLine line={frame.contextLine} isActive lineNo={frame.lineNo} />
					{frame.postContext?.map((line, index) => (
						<CodeLine key={`post-${index}`} line={line} lineNo={(frame.lineNo ?? 0) + 1 + index} />
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

function RequestInfo({ request }: { request: NonNullable<LogEventDetail['request']> }) {
	return (
		<Section icon={<Globe className="h-3.5 w-3.5" />} title="Request">
			<div className="rounded-lg border border-gray-100 dark:border-gray-800">
				<div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2 text-xs dark:border-gray-800">
					{request.method && (
						<span className="rounded bg-[#465fff]/10 px-1.5 py-0.5 font-mono font-semibold text-[#465fff]">{request.method}</span>
					)}
					<span className="break-all font-mono text-gray-700 dark:text-gray-300">{request.url || request.path || '—'}</span>
				</div>
				<div className="grid gap-2 px-3 py-2 sm:grid-cols-2">
					{request.query && request.query.length > 0 && (
						<div className="text-xs">
							<p className="font-semibold text-gray-500">Query</p>
							<p className="mt-1 break-all font-mono text-gray-700 dark:text-gray-300">{request.query.join('&')}</p>
						</div>
					)}
					{request.data !== undefined && (
						<div className={`text-xs ${request.query?.length ? '' : 'sm:col-span-2'}`}>
							<p className="font-semibold text-gray-500">Body</p>
							<pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 font-mono text-[11px] text-gray-600 dark:bg-gray-900 dark:text-gray-300">
								{typeof request.data === 'string' ? request.data : JSON.stringify(request.data, null, 2)}
							</pre>
						</div>
					)}
				</div>
			</div>
		</Section>
	);
}

function contextLabel(context: Record<string, unknown> | undefined): string | undefined {
	if (!context) return undefined;
	const name = context.name;
	const version = context.version;
	if (!name && !version) return undefined;
	return [name, version].filter((value) => value !== undefined && value !== null && value !== '').map(String).join(' ');
}

function InfoSection({ detail }: { detail: LogEventDetail }) {
	const rows: Array<[string, string]> = [];
	if (detail.level) rows.push(['Level', detail.level]);
	if (detail.platform) rows.push(['Platform', detail.platform]);
	if (detail.sdk) rows.push(['SDK', detail.sdk]);
	if (detail.timestamp) rows.push(['Timestamp', formatTime(detail.timestamp)]);
	if (detail.groupID) rows.push(['Group ID', detail.groupID]);

	const os = contextLabel(detail.contexts?.os as Record<string, unknown> | undefined);
	const runtime = contextLabel(detail.contexts?.runtime as Record<string, unknown> | undefined);
	const browser = contextLabel(detail.contexts?.browser as Record<string, unknown> | undefined);
	if (os) rows.push(['OS', os]);
	if (runtime) rows.push(['Runtime', runtime]);
	if (browser) rows.push(['Browser', browser]);

	if (rows.length === 0 && !detail.tags?.length) return null;

	return (
		<Section icon={<Info className="h-3.5 w-3.5" />} title="Information">
			{rows.length > 0 && (
				<div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
					{rows.map(([label, value]) => (
						<div key={label} className="flex items-baseline justify-between gap-4 px-3 py-1.5 text-xs">
							<span className="shrink-0 text-gray-500">{label}</span>
							<span className="truncate text-right font-medium text-gray-900 dark:text-white">{value}</span>
						</div>
					))}
				</div>
			)}
			{detail.tags && detail.tags.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-1.5">
					{detail.tags.map((tag, index) => (
						<span key={index} className="rounded-full bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-600 dark:bg-gray-900 dark:text-gray-300">
							<span className="text-gray-400">{tag.key}:</span> {tag.value}
						</span>
					))}
				</div>
			)}
		</Section>
	);
}

function SentryDetail({ detail }: { detail: LogEventDetail }) {
	return (
		<div>
			{detail.exceptions.length > 0 ? (
				detail.exceptions.map((exception, index) => {
					const frames = exception.frames.filter((frame) => frame.inApp);
					return (
						<div key={index} className="mt-3 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
							<p className="font-mono text-sm font-bold text-red-700 dark:text-red-300">
								{exception.type}
								{exception.value ? <span className="ml-2 font-medium text-red-600/80 dark:text-red-400/80">{exception.value}</span> : null}
							</p>
							{exception.mechanism && (
								<p className="mt-1 text-xs text-gray-500">Mechanism: {exception.mechanism}</p>
							)}
							<div className="mt-3 space-y-2">
								{frames.length > 0 ? (
									frames.map((frame, frameIndex) => (
										<StackFrameView key={frameIndex} frame={frame} />
									))
								) : (
									<p className="text-sm text-gray-500">No in-app stack frames available for this event.</p>
								)}
							</div>
						</div>
					);
				})
			) : (
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{detail.message || detail.title || 'No exception payload.'}</p>
			)}

			{detail.request && <RequestInfo request={detail.request} />}

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

			<InfoSection detail={detail} />
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
