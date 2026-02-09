export default function OfflinePage() {
	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-6">
			<div className="max-w-md w-full rounded-lg border border-border bg-card p-6 text-center shadow-sm">
				<h1 className="text-xl font-semibold text-foreground">You're offline</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Some data is available from cache, but actions that require the
					server will be queued or blocked until you're back online.
				</p>
				<p className="mt-4 text-xs text-muted-foreground">
					Reconnect to sync pending changes.
				</p>
			</div>
		</div>
	);
}