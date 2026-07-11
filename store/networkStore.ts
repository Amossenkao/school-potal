import { create } from 'zustand';

interface NetworkState {
	isOnline: boolean;
	isChecking: boolean;
	isSyncing: boolean;
	ablyState: 'connected' | 'failed' | 'suspended' | 'disconnected' | null;
	authCheckFailed: boolean;
	offlineReason: string | null;
	checkStartedAt: number | null;

	// Actions
	initNetworkListeners: () => void;
	refreshConnectivity: (options?: {
		timeoutMs?: number;
		force?: boolean;
		reason?: string;
	}) => Promise<boolean>;
	markOffline: (reason?: string) => void;
	markOnline: () => void;
	setAblyState: (
		state: 'connected' | 'failed' | 'suspended' | 'disconnected',
	) => void;
	setAuthCheckFailed: (failed: boolean) => void;
	stopNetworkListeners: () => void;
}

const POLL_INTERVAL_MS = 10_000; // 10 seconds
const RECOVERY_RETRY_INTERVAL_MS = 5_000;
const CONNECTIVITY_CHECK_URL = '/favicon.ico';
const STUCK_CHECK_TIMEOUT_MS = 8_000;

// --- Recovery retry timer -------------------------------------------------
// Lives at module scope (not nested inside initNetworkListeners) so it can
// be armed from ANYWHERE we transition to offline — not just the browser's
// native 'offline' event. markOffline() calls from a failed connectivity
// ping (refreshConnectivity's catch block), checkAuthStatus, login, or
// logout should all be able to arm this without depending on which
// component happened to call initNetworkListeners.
const clearRecoveryRetryTimer = () => {
	if (typeof window === 'undefined') return;
	const timerId = (window as any).__networkRecoveryRetryIntervalId;
	if (timerId) {
		window.clearInterval(timerId);
		(window as any).__networkRecoveryRetryIntervalId = null;
	}
};

// IDEMPOTENT: only starts a new interval if one isn't already running.
// Previously this unconditionally cleared + recreated itself every time
// markOffline() ran (i.e. on every failed retry while offline), which
// meant there was never one stable long-lived interval — just a chain of
// short-lived ones, more exposed to background-tab timer throttling and
// vulnerable to being killed off by an unrelated teardown (see
// initNetworkListeners below) with nothing to restart it.
const scheduleRecoveryRetryTimer = (getState: () => NetworkState) => {
	if (typeof window === 'undefined') return;
	if ((window as any).__networkRecoveryRetryIntervalId) return;
	const timerId = window.setInterval(() => {
		if (getState().isOnline) {
			clearRecoveryRetryTimer();
			return;
		}
		void getState().refreshConnectivity({
			force: true,
			reason: 'offline-recovery-poll',
		});
	}, RECOVERY_RETRY_INTERVAL_MS);
	(window as any).__networkRecoveryRetryIntervalId = timerId;
};

// Probes a single URL; resolves true on any response that doesn't throw
// (opaque no-cors responses can't be read for status, so "didn't throw"
// is the online signal), rejects on abort/network failure.
const probeUrl = async (url: string, signal: AbortSignal): Promise<true> => {
	await fetch(url, {
		method: 'HEAD',
		mode: 'no-cors',
		cache: 'no-store',
		signal,
	});
	return true;
};

export const useNetworkStore = create<NetworkState>((set, get) => ({
	isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
	isChecking: false,
	isSyncing: false,
	ablyState: null,
	authCheckFailed: false,
	offlineReason: null,
	checkStartedAt: null,

	initNetworkListeners: () => {
		if (typeof window === 'undefined') return;

		// RECOMMENDATION: idempotent init. Previously this unconditionally
		// tore down and rebuilt every listener (including the recovery
		// timer) on every call, on the assumption there's exactly one
		// caller. In practice AuthProvider and RootProviders can both call
		// this, and remounts/effect re-runs make repeat calls likely. If
		// we're already fully attached, don't rebuild — just make sure the
		// recovery loop matches current offline state and bail.
		if ((window as any).__networkListenersAttached) {
			if (!get().isOnline) {
				scheduleRecoveryRetryTimer(get);
			}
			return;
		}

		const handleOnline = async () => {
			clearRecoveryRetryTimer();
			await get().refreshConnectivity({
				force: true,
				reason: 'browser-online-event',
			});
		};

		const handleOffline = () => {
			get().markOffline('browser-offline');
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		window.addEventListener('focus', handleOnline);

		const intervalId = window.setInterval(() => {
			if (document.visibilityState !== 'visible') return;
			void get().refreshConnectivity({ reason: 'interval-poll' });
		}, POLL_INTERVAL_MS);

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				void get().refreshConnectivity({ reason: 'visibility-change' });
			}
		};
		document.addEventListener('visibilitychange', handleVisibilityChange);

		(window as any).__networkPollIntervalId = intervalId;
		(window as any).__networkOnlineHandler = handleOnline;
		(window as any).__networkOfflineHandler = handleOffline;
		(window as any).__networkVisibilityHandler = handleVisibilityChange;
		(window as any).__networkListenersAttached = true;

		if (!navigator.onLine) {
			handleOffline();
		} else if (!get().isOnline) {
			// navigator.onLine can read true while we're still marked
			// offline (flaky DNS, captive portal, server unreachable but
			// link physically up). Make sure recovery is running in that
			// case too, not just the hard-offline branch above.
			scheduleRecoveryRetryTimer(get);
		}
	},

	// NOTE: this is now a true full teardown — call it on logout / actual
	// app unmount, not as a "reset before rebuild" step inside init.
	stopNetworkListeners: () => {
		if (typeof window === 'undefined') return;

		const intervalId = (window as any).__networkPollIntervalId;
		if (intervalId) {
			window.clearInterval(intervalId);
			(window as any).__networkPollIntervalId = null;
		}

		clearRecoveryRetryTimer();

		const onlineHandler = (window as any).__networkOnlineHandler;
		if (onlineHandler) {
			window.removeEventListener('online', onlineHandler);
			(window as any).__networkOnlineHandler = null;
		}

		const offlineHandler = (window as any).__networkOfflineHandler;
		if (offlineHandler) {
			window.removeEventListener('offline', offlineHandler);
			(window as any).__networkOfflineHandler = null;
		}

		const visibilityHandler = (window as any).__networkVisibilityHandler;
		if (visibilityHandler) {
			document.removeEventListener('visibilitychange', visibilityHandler);
			(window as any).__networkVisibilityHandler = null;
		}

		(window as any).__networkListenersAttached = false;
	},

	refreshConnectivity: async (options) => {
		const state = get();

		if (state.isChecking && !options?.force) {
			const stuckSince = state.checkStartedAt;
			const isStuck =
				stuckSince !== null && Date.now() - stuckSince > STUCK_CHECK_TIMEOUT_MS;
			if (!isStuck) {
				return state.isOnline;
			}
		}

		set({ isChecking: true, checkStartedAt: Date.now() });

		const controller = new AbortController();
		const timeoutId = setTimeout(
			() => controller.abort(),
			options?.timeoutMs || 3000,
		);

		try {
			await probeUrl(CONNECTIVITY_CHECK_URL, controller.signal);
			get().markOnline();
			return true;
		} catch (error) {
			get().markOffline('network-error');
			return false;
		} finally {
			clearTimeout(timeoutId);
		}
	},

	markOffline: (reason = 'network-error') => {
		set({
			isOnline: false,
			isChecking: false,
			offlineReason: reason,
			authCheckFailed: true,
			checkStartedAt: null,
		});
		// Arm the fast recovery loop regardless of *why* we went offline.
		// scheduleRecoveryRetryTimer is idempotent now, so calling this on
		// every failed check (not just the first transition) is harmless —
		// it won't tear down and recreate an already-running timer.
		scheduleRecoveryRetryTimer(get);
	},
	markOnline: () => {
		clearRecoveryRetryTimer();
		set({
			isOnline: true,
			isChecking: false,
			offlineReason: null,
			checkStartedAt: null,
		});
	},

	setAblyState: (state) => set({ ablyState: state }),
	setAuthCheckFailed: (failed) => set({ authCheckFailed: failed }),
}));
