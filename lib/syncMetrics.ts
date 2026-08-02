// lib/syncMetrics.ts
// Fire-and-forget sync telemetry posted by the leader tab to
// /api/observability/sync-metrics. Never throws — telemetry must not
// interrupt sync itself. Rate-limited to avoid noise on busy cycles.

export type SyncMetricEvent =
	| 'cycle'
	| 'flush'
	| 'conflict'
	| 'checksum-mismatch'
	| 'error';

export type SyncMetricInput = {
	event: SyncMetricEvent;
	domain?: string;
	academicYear?: string;
	seq?: number;
	path?: string;
	metrics?: Record<string, unknown>;
};

const MIN_INTERVAL_MS = 1000;
let lastSentAt = 0;

export const reportSyncMetric = (input: SyncMetricInput) => {
	if (typeof window === 'undefined') return;
	const now = Date.now();
	if (now - lastSentAt < MIN_INTERVAL_MS) return;
	lastSentAt = now;
	try {
		void fetch('/api/observability/sync-metrics', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input),
			credentials: 'include',
			cache: 'no-store',
		}).catch(() => undefined);
	} catch {
		// swallow
	}
};
