'use client';

import { WifiOff, RefreshCw, Clock, Database } from 'lucide-react';

export default function OfflinePage() {
	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-6">
			<div className="max-w-sm w-full flex flex-col items-center gap-6 text-center">
				{/* Icon cluster */}
				<div className="relative flex items-center justify-center">
					<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
						<WifiOff
							className="w-9 h-9 text-muted-foreground"
							strokeWidth={1.5}
						/>
					</div>
					{/* Pulse ring */}
					<span className="absolute inset-0 rounded-full border border-border animate-ping opacity-30" />
				</div>

				{/* Heading + body */}
				<div className="flex flex-col gap-2">
					<h1 className="text-lg font-semibold tracking-tight text-foreground">
						You're offline
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed">
						Cached data is still available. Actions that need the server will
						resume automatically when you reconnect.
					</p>
				</div>

				{/* Status pills */}
				<div className="w-full flex flex-col gap-2">
					<StatusRow
						icon={<Database className="w-3.5 h-3.5" />}
						label="Cached data available"
						status="ok"
					/>
					<StatusRow
						icon={<Clock className="w-3.5 h-3.5" />}
						label="Pending changes queued"
						status="waiting"
					/>
					<StatusRow
						icon={<WifiOff className="w-3.5 h-3.5" />}
						label="Server connection lost"
						status="error"
					/>
				</div>

				{/* Divider */}
				<div className="w-full h-px bg-border" />

				{/* Retry button */}
				<button
					onClick={() => window.location.reload()}
					className="
						group inline-flex items-center gap-2
						text-sm font-medium text-muted-foreground
						hover:text-foreground transition-colors duration-150
						focus-visible:outline-none focus-visible:ring-2
						focus-visible:ring-ring focus-visible:ring-offset-2 rounded
					"
				>
					<RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" />
					Retry connection
				</button>
			</div>
		</div>
	);
}

type StatusVariant = 'ok' | 'waiting' | 'error';

function StatusRow({
	icon,
	label,
	status,
}: {
	icon: React.ReactNode;
	label: string;
	status: StatusVariant;
}) {
	const dot: Record<StatusVariant, string> = {
		ok: 'bg-emerald-500',
		waiting: 'bg-amber-400',
		error: 'bg-destructive',
	};

	return (
		<div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-left">
			<span className="text-muted-foreground">{icon}</span>
			<span className="flex-1 text-xs text-muted-foreground">{label}</span>
			<span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot[status]}`} />
		</div>
	);
}
