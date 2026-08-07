import { useSchoolStore, getClientSyncSeq } from '@/store/schoolStore';
import {
	reconcileDomain,
	CACHED_DOMAIN_BY_SYNC,
	type ClientSyncDomain,
} from '@/lib/clientSync';
import type { RealtimeEvent } from '@/lib/realtimeTypes';

// Server publishes happen after the ChangeLog append, and the latency of each
// publish varies, so seq N+1 can reach a subscriber before seq N. Applying them
// as they arrive regresses the version maps that drive /api/auth/me negotiation
// (an older seq overwrites a newer one). This gate holds events until their
// (domain, academicYear) seq is contiguous with the client's cursor, and
// delegates gap-filling to reconcileDomain, which replays the missing ChangeLog
// rows into the store and only advances the cursor once the data is in hand.

const GAP_RECONCILE_DEBOUNCE_MS = 500;
const GAP_RETRY_MS = 10_000;

type PendingEntry = {
	event: RealtimeEvent;
	apply: (evt: RealtimeEvent) => void;
};

const pendingByKey = new Map<string, Map<number, PendingEntry>>();
const reconcileTimers = new Map<string, ReturnType<typeof setTimeout>>();
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const reconciling = new Set<string>();

export const BUFFERED_SYNC_DOMAINS = new Set<ClientSyncDomain>([
	'grades',
	'attendance',
	'teacher_attendance',
	'calendar',
	'schedules',
	'gradeRequests',
]);

const resolveKey = (domain: string, academicYear: string) =>
	`${domain}:${academicYear}`;

const getCursor = (domain: ClientSyncDomain, academicYear: string): number =>
	getClientSyncSeq(CACHED_DOMAIN_BY_SYNC[domain], academicYear);

const advanceCursor = (
	domain: ClientSyncDomain,
	academicYear: string,
	seq: number,
) => {
	if (seq > 0) {
		useSchoolStore.getState().setSyncSeqForYear(academicYear, {
			[CACHED_DOMAIN_BY_SYNC[domain]]: seq,
		});
	}
};

const clearTimers = (key: string) => {
	const reconcileTimer = reconcileTimers.get(key);
	if (reconcileTimer) clearTimeout(reconcileTimer);
	reconcileTimers.delete(key);
	const retryTimer = retryTimers.get(key);
	if (retryTimer) clearTimeout(retryTimer);
	retryTimers.delete(key);
};

const scheduleGapReconcile = (domain: ClientSyncDomain, academicYear: string) => {
	const key = resolveKey(domain, academicYear);
	const existing = reconcileTimers.get(key);
	if (existing) clearTimeout(existing);
	const timer = setTimeout(() => {
		reconcileTimers.delete(key);
		const pending = pendingByKey.get(key);
		if (!pending || pending.size === 0) return;
		const cursor = getCursor(domain, academicYear);
		const earliest = Math.min(...pending.keys());
		if (earliest > cursor + 1) {
			void fillGap(domain, academicYear);
		}
	}, GAP_RECONCILE_DEBOUNCE_MS);
	reconcileTimers.set(key, timer);
};

const scheduleGapRetry = (domain: ClientSyncDomain, academicYear: string) => {
	const key = resolveKey(domain, academicYear);
	const existing = retryTimers.get(key);
	if (existing) clearTimeout(existing);
	const timer = setTimeout(() => {
		retryTimers.delete(key);
		const pending = pendingByKey.get(key);
		if (!pending || pending.size === 0) return;
		const cursor = getCursor(domain, academicYear);
		const earliest = Math.min(...pending.keys());
		if (earliest > cursor + 1) {
			void fillGap(domain, academicYear);
		}
	}, GAP_RETRY_MS);
	retryTimers.set(key, timer);
};

const fillGap = async (domain: ClientSyncDomain, academicYear: string) => {
	const key = resolveKey(domain, academicYear);
	if (reconciling.has(key)) return;
	const pending = pendingByKey.get(key);
	if (!pending || pending.size === 0) return;
	reconciling.add(key);
	try {
		await reconcileDomain(domain, academicYear, {
			onError: (error) =>
				console.warn(
					`[realtimeBuffer] gap reconcile failed for ${key}:`,
					error,
				),
		});
	} finally {
		reconciling.delete(key);
	}
	const stillPending = pendingByKey.get(key);
	if (stillPending && stillPending.size > 0) {
		const cursor = getCursor(domain, academicYear);
		const earliest = Math.min(...stillPending.keys());
		if (earliest > cursor + 1) {
			scheduleGapRetry(domain, academicYear);
		}
	}
	flushPending(domain, academicYear);
};

/**
 * Applies any buffered events whose seq is now contiguous with the cursor,
 * advancing the cursor as it goes. Events behind a still-open gap stay
 * buffered — the cursor is never advanced past data the client has not applied.
 */
export const flushPending = (domain: ClientSyncDomain, academicYear: string) => {
	const key = resolveKey(domain, academicYear);
	const pending = pendingByKey.get(key);
	if (!pending || pending.size === 0) {
		pendingByKey.delete(key);
		clearTimers(key);
		return;
	}
	const sorted = [...pending.entries()].sort((a, b) => a[0] - b[0]);
	let cursor = getCursor(domain, academicYear);
	let advanced = false;
	for (const [seq, entry] of sorted) {
		if (seq <= cursor) {
			pending.delete(seq);
			continue;
		}
		if (seq !== cursor + 1) break;
		pending.delete(seq);
		try {
			entry.apply(entry.event);
		} catch (error) {
			console.warn('[realtimeBuffer] event apply threw:', error);
		}
		advanceCursor(domain, academicYear, seq);
		cursor = seq;
		advanced = true;
	}
	if (pending.size === 0) {
		pendingByKey.delete(key);
		clearTimers(key);
	} else if (advanced) {
		scheduleGapReconcile(domain, academicYear);
	}
};

export type EnqueueResult = 'applied' | 'buffered' | 'stale';

/**
 * Routes a realtime event through the ordering gate. Events without a seq (or
 * without an academicYear) bypass the gate and apply immediately. Seq events
 * apply only when contiguous with the cursor; anything ahead of a gap is held
 * and the gap is reconciled from the ChangeLog delta.
 */
export const enqueueRealtimeEvent = (
	domain: ClientSyncDomain,
	academicYear: string,
	event: RealtimeEvent,
	apply: (evt: RealtimeEvent) => void,
): EnqueueResult => {
	if (!academicYear || typeof event.seq !== 'number') {
		apply(event);
		return 'applied';
	}
	const key = resolveKey(domain, academicYear);
	const cursor = getCursor(domain, academicYear);
	const seq = event.seq;

	if (seq <= cursor) return 'stale';

	if (seq === cursor + 1) {
		apply(event);
		advanceCursor(domain, academicYear, seq);
		flushPending(domain, academicYear);
		return 'applied';
	}

	let pending = pendingByKey.get(key);
	if (!pending) {
		pending = new Map();
		pendingByKey.set(key, pending);
	}
	if (!pending.has(seq)) {
		pending.set(seq, { event, apply });
	}

	scheduleGapReconcile(domain, academicYear);
	if (!retryTimers.has(key)) {
		scheduleGapRetry(domain, academicYear);
	}
	return 'buffered';
};
