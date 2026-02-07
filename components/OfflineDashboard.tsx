'use client';

import { WifiOff } from 'lucide-react';

export default function OfflineDashboard() {
	return (
		<div className="min-h-[60vh] flex items-center justify-center px-4">
			<div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
					<WifiOff className="h-7 w-7 text-muted-foreground" />
				</div>
				<h2 className="mt-4 text-xl font-semibold text-foreground">
					You're Offline
				</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					This dashboard page needs a network connection. Please reconnect and
					try again.
				</p>
				<p className="mt-4 text-xs text-muted-foreground">
					We&apos;ll restore this page as soon as you&apos;re back online.
				</p>
			</div>
		</div>
	);
}
