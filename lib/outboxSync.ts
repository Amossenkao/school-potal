// lib/outboxSync.ts
// Page-owned outbox flush engine (§6.7): exponential backoff with jitter,
// dead-letter after max attempts, online-gated, leader-tab only. The result
// is broadcast via BroadcastChannel so every tab can update the shared
// "pending changes" indicator.

import {
	getOutboxEntries,
	updateOutboxEntry,
	removeOutboxEntry,
} from '@/utils/domainSyncCache';
import { useNetworkStore } from '@/store/networkStore';
import { broadcastSyncState, requestLeaderFlush } from '@/lib/tabSync';
import { reportSyncMetric } from '@/lib/syncMetrics';

export const OUTBOX_MAX_ATTEMPTS = 8;
export const OUTBOX_BASE_BACKOFF_MS = 1000;
export const OUTBOX_MAX_BACKOFF_MS = 5 * 60_000;

export const computeOutboxBackoff = (attemptCount: number) => {
	const exponent = Math.max(0, Math.min(attemptCount, 10));
	const base = OUTBOX_BASE_BACKOFF_MS * 2 ** exponent;
	const jitter = Math.floor(Math.random() * Math.max(1, base * 0.25));
	return Math.min(base + jitter, OUTBOX_MAX_BACKOFF_MS);
};

const isRetryableStatus = (status: number) =>
	status === 408 || status === 429 || status >= 500;

export type OutboxFlushResult = {
	flushed: number;
	dead: number;
	remaining: number;
	failed: number;
};

/**
 * Flushes every outbox entry that is due. Returns counts for the caller to
 * broadcast. Idempotent per entry: the mutation id stays the same across
 * retries so the server's idempotency layer can dedupe replay.
 */
export const flushOutboxOnce = async (): Promise<OutboxFlushResult> => {
	if (!useNetworkStore.getState().isOnline) {
		return { flushed: 0, dead: 0, remaining: 0, failed: 0 };
	}

	const entries = await getOutboxEntries();
	const due = entries.filter(
		(entry) =>
			entry.status !== 'dead' &&
			(typeof entry.nextRetryAt !== 'number' || entry.nextRetryAt <= Date.now()),
	);

	let flushed = 0;
	let dead = 0;
	let failed = 0;

	for (const entry of due) {
		const attemptCount = (entry.attemptCount || 0) + 1;
		await updateOutboxEntry(entry.id, {
			status: 'in-flight',
			attemptCount,
			lastAttemptAt: Date.now(),
		});

		try {
			const response = await fetch(entry.url, {
				method: entry.method,
				headers: entry.headers,
				body: ['GET', 'HEAD'].includes(String(entry.method || '').toUpperCase())
					? undefined
					: entry.body,
				credentials: 'include',
				cache: 'no-store',
			});

			if (response.ok) {
				await removeOutboxEntry(entry.id);
				flushed += 1;
				continue;
			}

			if (!isRetryableStatus(response.status)) {
				await updateOutboxEntry(entry.id, {
					status: 'dead',
					lastError: `HTTP ${response.status}`,
				});
				dead += 1;
				continue;
			}

			if (attemptCount >= OUTBOX_MAX_ATTEMPTS) {
				await updateOutboxEntry(entry.id, {
					status: 'dead',
					lastError: `Exhausted ${attemptCount} attempts`,
				});
				dead += 1;
				continue;
			}

			await updateOutboxEntry(entry.id, {
				status: 'pending',
				nextRetryAt: Date.now() + computeOutboxBackoff(attemptCount),
				lastError: `HTTP ${response.status}`,
			});
			failed += 1;
		} catch (error) {
			if (attemptCount >= OUTBOX_MAX_ATTEMPTS) {
				await updateOutboxEntry(entry.id, {
					status: 'dead',
					lastError: error instanceof Error ? error.message : 'Network error',
				});
				dead += 1;
				continue;
			}
			await updateOutboxEntry(entry.id, {
				status: 'pending',
				nextRetryAt: Date.now() + computeOutboxBackoff(attemptCount),
				lastError: error instanceof Error ? error.message : 'Network error',
			});
			failed += 1;
		}
	}

	const remaining = (await getOutboxEntries()).filter(
		(entry) => entry.status !== 'dead',
	).length;

	return { flushed, dead, remaining, failed };
};

/**
 * Runs a flush and broadcasts the resulting shared sync state to all tabs.
 */
export const runLeaderOutboxFlush = async (): Promise<OutboxFlushResult> => {
	const result = await flushOutboxOnce();
	const summary =
		result.flushed > 0 || result.dead > 0 || result.remaining > 0
			? `${result.flushed} synced · ${result.remaining} pending · ${result.dead} failed`
			: null;
	broadcastSyncState({
		summary,
		pending: result.remaining,
		dead: result.dead,
		conflict: result.dead > 0,
	});
	if (result.flushed > 0 || result.dead > 0) {
		reportSyncMetric({
			event: result.dead > 0 ? 'conflict' : 'flush',
			metrics: {
				flushed: result.flushed,
				dead: result.dead,
				remaining: result.remaining,
				failed: result.failed,
			},
		});
	}
	return result;
};

/**
 * Requests the leader tab to flush (safe no-op from the leader itself).
 */
export const requestOutboxFlush = () => {
	requestLeaderFlush();
};

export const registerOutboxBackgroundSync = async () => {
	if (typeof navigator === 'undefined' || !('sync' in navigator)) return;
	try {
		const registration = await navigator.serviceWorker.ready;
		const syncManager = (navigator as any).sync as
			| { register: (tag: string) => Promise<void> }
			| undefined;
		await syncManager?.register('schoolmesh-outbox');
		return registration;
	} catch (error) {
		console.warn('Background Sync registration failed:', error);
		return undefined;
	}
};
