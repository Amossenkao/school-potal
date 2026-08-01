'use client';

import { ChevronRight, ExternalLink, ListTree } from 'lucide-react';

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

function StackFrameView({ frame, showCode }: { frame: StackTraceFrame; showCode?: boolean }) {
	const location = [frame.filename, frame.lineNo ? `:${frame.lineNo}` : '', frame.colNo ? `:${frame.colNo}` : ''].join('');
	const startLine = (frame.lineNo ?? 0) - (frame.preContext?.length ?? 0);

	return (
		<div>
			<div className="flex flex-wrap items-baseline gap-x-2 font-mono text-xs">
				<span className="font-semibold text-gray-900 dark:text-white">
					{frame.function || '&lt;anonymous&gt;'}
				</span>
				{location && <span className="break-all text-gray-500">{location}</span>}
			</div>
			<span className="mt-0.5 inline-block rounded-full bg-[#465fff]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#465fff] dark:text-[#8b9bff]">
				in app
			</span>
			{showCode && (frame.contextLine || frame.preContext?.length || frame.postContext?.length) && (
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
	if (detail.exceptions.length === 0) {
		return <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{detail.message || detail.title || 'No exception payload.'}</p>;
	}

	return (
		<div className="mt-2 space-y-4">
			{detail.exceptions.map((exception, index) => {
				const frames = exception.frames.filter((frame) => frame.inApp);
				return (
					<div key={index}>
						{(exception.type || exception.value) && (
							<p className="font-mono text-sm font-bold text-red-700 dark:text-red-300">
								{exception.type}
								{exception.value ? <span className="ml-2 font-medium text-red-600/80 dark:text-red-400/80">{exception.value}</span> : null}
							</p>
						)}
						<div className="mt-2 space-y-3">
							{frames.length > 0 ? (
								frames.map((frame, frameIndex) => (
									<StackFrameView
										key={frameIndex}
										frame={frame}
										showCode={frameIndex === frames.length - 1}
									/>
								))
							) : (
								<p className="text-sm text-gray-500">No in-app stack frames available for this event.</p>
							)}
						</div>
					</div>
				);
			})}
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
