// lib/tabSync.ts
// Multi-tab coordination: BroadcastChannel gossip + Web-Locks leader election.
//
// - One tab holds the "schoolmesh-leader:{tenantId}" lock. That tab is the
//   sole runner of the sync pipeline and the outbox flusher.
// - BroadcastChannel carries: applied-event gossip (realtime dedup across
//   tabs), sync-state summaries (leader -> followers), and flush requests
//   (follower -> leader).
// - Falls back to "single tab, always leader" when Web Locks or
//   BroadcastChannel are unavailable.

import {
	isEventApplied,
	markEventApplied,
	type CachedDomain,
} from '@/utils/domainSyncCache';

export type AppliedEventGossip = {
	eventId: string;
	domain: CachedDomain | string;
	academicYear: string;
	seq?: number;
};

export type TabSyncState = {
	summary: string | null;
	pending: number;
	dead: number;
	conflict: boolean;
};

type TabSyncMessage =
	| ({ type: 'applied-event' } & AppliedEventGossip)
	| ({ type: 'sync-state' } & TabSyncState)
	| { type: 'leader'; tabId: string }
	| { type: 'request-flush' };

const LEADER_RETRY_MS = 4000;

const getChannelName = (tenantId?: string) =>
	`schoolmesh-sync:${tenantId || 'global'}`;

let channel: BroadcastChannel | null = null;
let channelName = '';
let tabId = '';
let stopped = false;
let holdResolve: (() => void) | null = null;
let leaderRetryTimer: number | null = null;
let locksAvailable = typeof navigator !== 'undefined' && !!navigator.locks;

let isLeaderFlag = false;
const leadershipListeners = new Set<(isLeader: boolean) => void>();
const appliedEventListeners = new Set<(msg: AppliedEventGossip) => void>();
const syncStateListeners = new Set<(state: TabSyncState) => void>();
const flushRequestListeners = new Set<() => void>();

const ensureTabId = () => {
	if (!tabId) {
		try {
			tabId = crypto.randomUUID();
		} catch {
			tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		}
	}
};

const setLeader = (value: boolean) => {
	if (isLeaderFlag === value) return;
	isLeaderFlag = value;
	leadershipListeners.forEach((cb) => cb(value));
};

const scheduleLeaderRetry = () => {
	if (stopped || leaderRetryTimer !== null) return;
	leaderRetryTimer = window.setTimeout(() => {
		leaderRetryTimer = null;
		void acquireLeadership();
	}, LEADER_RETRY_MS);
};

const releaseHold = () => {
	if (holdResolve) {
		holdResolve();
		holdResolve = null;
	}
};

const acquireLeadership = async () => {
	if (stopped) return;
	if (!locksAvailable) {
		// No Web Locks: assume a single-tab environment and act as leader.
		setLeader(true);
		return;
	}
	try {
		const acquired = await navigator.locks.request(
			`schoolmesh-leader:${channelName}`,
			{ ifAvailable: true },
			async (lock) => {
				if (!lock) {
					setLeader(false);
					return false;
				}
				ensureTabId();
				setLeader(true);
				channel?.postMessage({ type: 'leader', tabId } satisfies TabSyncMessage);
				// Hold the lock for the lifetime of this tab's leadership.
				await new Promise<void>((resolve) => {
					holdResolve = resolve;
				});
				return true;
			},
		);
		if (!acquired && !stopped) {
			scheduleLeaderRetry();
		}
	} catch {
		// Web Locks unavailable or errored at request time.
		locksAvailable = false;
		setLeader(true);
	}
};

const handleMessage = (message: TabSyncMessage) => {
	switch (message.type) {
		case 'applied-event':
			appliedEventListeners.forEach((cb) =>
				cb({
					eventId: message.eventId,
					domain: message.domain,
					academicYear: message.academicYear,
					seq: message.seq,
				}),
			);
			break;
		case 'sync-state':
			syncStateListeners.forEach((cb) =>
				cb({
					summary: message.summary,
					pending: message.pending,
					dead: message.dead,
					conflict: message.conflict,
				}),
			);
			break;
		case 'request-flush':
			if (isLeaderFlag) {
				flushRequestListeners.forEach((cb) => cb());
			}
			break;
		case 'leader':
			break;
	}
};

export const initTabSync = (options: { tenantId?: string } = {}) => {
	if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
		locksAvailable = false;
		setLeader(true);
		return;
	}

	const nextChannelName = getChannelName(options.tenantId);
	if (channel) {
		if (nextChannelName === channelName) return;
		stopTabSync();
	}
	channelName = nextChannelName;
	stopped = false;
	ensureTabId();
	channel = new BroadcastChannel(channelName);
	channel.onmessage = (event: MessageEvent) => {
		if (event?.data && typeof event.data === 'object') {
			handleMessage(event.data as TabSyncMessage);
		}
	};
	void acquireLeadership();
};

export const stopTabSync = () => {
	stopped = true;
	if (leaderRetryTimer !== null) {
		window.clearTimeout(leaderRetryTimer);
		leaderRetryTimer = null;
	}
	releaseHold();
	if (channel) {
		channel.close();
		channel = null;
	}
	setLeader(false);
};

export const isTabLeader = (): boolean => isLeaderFlag;

export const getTabId = (): string => {
	ensureTabId();
	return tabId;
};

export const onLeadershipChange = (cb: (isLeader: boolean) => void) => {
	leadershipListeners.add(cb);
	return () => leadershipListeners.delete(cb);
};

export const broadcastAppliedEvent = (gossip: AppliedEventGossip) => {
	channel?.postMessage({ type: 'applied-event', ...gossip } satisfies TabSyncMessage);
};

export const onAppliedEvent = (cb: (gossip: AppliedEventGossip) => void) => {
	appliedEventListeners.add(cb);
	return () => appliedEventListeners.delete(cb);
};

export const broadcastSyncState = (state: TabSyncState) => {
	if (!isLeaderFlag) return;
	channel?.postMessage({ type: 'sync-state', ...state } satisfies TabSyncMessage);
};

export const onSyncState = (cb: (state: TabSyncState) => void) => {
	syncStateListeners.add(cb);
	return () => syncStateListeners.delete(cb);
};

export const requestLeaderFlush = () => {
	channel?.postMessage({ type: 'request-flush' } satisfies TabSyncMessage);
};

export const onFlushRequest = (cb: () => void) => {
	flushRequestListeners.add(cb);
	return () => flushRequestListeners.delete(cb);
};

/**
 * Returns true when the event has already been applied (in this tab's IDB or
 * by a peer tab via gossip), and marks it applied + gossips it otherwise.
 * Used as the realtime dedup guard (§6.5 idempotent realtime application).
 */
export const tryMarkEventApplied = async (
	gossip: AppliedEventGossip,
): Promise<boolean> => {
	if (!gossip.eventId) return false;
	const already = await isEventApplied(gossip.eventId);
	if (already) return true;
	await markEventApplied(gossip);
	broadcastAppliedEvent(gossip);
	return false;
};
