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
/**
 * Keys whose next reconcile must run even with nothing buffered — set when an
 * event announced a seq but carried no data for its domain, so the change only
 * exists in the ChangeLog.
 */
const forcedReconcile = new Set<string>();

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

/**
 * Applies an event and reports whether the store accepted its data for this
 * domain.
 *
 * The store advances the domain cursor itself, but only when the event
 * actually carried that domain's records (see schoolStore.applyRealtimeEvent).
 * Reading the cursor back is therefore the authoritative test: if it reached
 * `seq`, the data landed. Calendar and schedules publish a bare seq with no
 * payload, so those events must NOT move the cursor — the change is pulled by
 * a delta reconcile instead. Advancing here regardless would tell
 * /api/auth/me the client is caught up on a change it never received, and the
 * change would be lost permanently.
 */
const applyAndConfirm = (
	domain: ClientSyncDomain,
	academicYear: string,
	seq: number,
	entry: PendingEntry,
): boolean => {
	try {
		entry.apply(entry.event);
	} catch (error) {
		console.warn('[realtimeBuffer] event apply threw:', error);
		return false;
	}
	return getCursor(domain, academicYear) >= seq;
};

const clearTimers = (key: string) => {
	const reconcileTimer = reconcileTimers.get(key);
	if (reconcileTimer) clearTimeout(reconcileTimer);
	reconcileTimers.delete(key);
	const retryTimer = retryTimers.get(key);
	if (retryTimer) clearTimeout(retryTimer);
	retryTimers.delete(key);
};

/**
 * Whether this (domain, year) still needs a delta pull: either buffered events
 * sit behind a gap, or an event announced a seq the store never applied
 * (notification-only publishes), leaving the cursor short of the head.
 */
const needsReconcile = (
	key: string,
	domain: ClientSyncDomain,
	academicYear: string,
): boolean => {
	if (forcedReconcile.has(key)) return true;
	const pending = pendingByKey.get(key);
	if (!pending || pending.size === 0) return false;
	const cursor = getCursor(domain, academicYear);
	return Math.min(...pending.keys()) > cursor + 1;
};

const scheduleGapReconcile = (domain: ClientSyncDomain, academicYear: string) => {
	const key = resolveKey(domain, academicYear);
	const existing = reconcileTimers.get(key);
	if (existing) clearTimeout(existing);
	const timer = setTimeout(() => {
		reconcileTimers.delete(key);
		if (needsReconcile(key, domain, academicYear)) {
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
		if (needsReconcile(key, domain, academicYear)) {
			void fillGap(domain, academicYear);
		}
	}, GAP_RETRY_MS);
	retryTimers.set(key, timer);
};

const fillGap = async (domain: ClientSyncDomain, academicYear: string) => {
	const key = resolveKey(domain, academicYear);
	if (reconciling.has(key)) return;
	if (!needsReconcile(key, domain, academicYear)) return;
	// Cleared up front: a change logged after this pull starts must be able to
	// re-arm the flag rather than be swallowed by this in-flight reconcile.
	forcedReconcile.delete(key);
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
	if (needsReconcile(key, domain, academicYear)) {
		scheduleGapRetry(domain, academicYear);
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
		// Keep the timers alive when a forced reconcile is still owed: an event
		// may have announced a seq without shipping data, leaving nothing
		// buffered but a pull still outstanding.
		if (!forcedReconcile.has(key)) clearTimers(key);
		return;
	}
	const sorted = [...pending.entries()].sort((a, b) => a[0] - b[0]);
	let cursor = getCursor(domain, academicYear);
	let advanced = false;
	let mustReconcile = false;
	for (const [seq, entry] of sorted) {
		if (seq <= cursor) {
			pending.delete(seq);
			continue;
		}
		if (seq !== cursor + 1) break;
		pending.delete(seq);
		if (!applyAndConfirm(domain, academicYear, seq, entry)) {
			// Notification-only event: the data still has to be pulled, and the
			// cursor stays put so the reconcile actually fetches it. Stop here —
			// later seqs are no longer contiguous with the cursor.
			forcedReconcile.add(key);
			mustReconcile = true;
			break;
		}
		cursor = seq;
		advanced = true;
	}
	if (mustReconcile) {
		scheduleGapReconcile(domain, academicYear);
		return;
	}
	if (pending.size === 0) {
		pendingByKey.delete(key);
		if (!forcedReconcile.has(key)) clearTimers(key);
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
		if (applyAndConfirm(domain, academicYear, seq, { event, apply })) {
			flushPending(domain, academicYear);
			return 'applied';
		}
		// The event announced seq but shipped no data for this domain. Leave the
		// cursor where it is and pull the change from the ChangeLog.
		forcedReconcile.add(key);
		scheduleGapReconcile(domain, academicYear);
		return 'buffered';
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
