import { create } from 'zustand';

interface NetworkState {
	isOnline: boolean;
	isChecking: boolean;
	isSyncing: boolean;
	ablyState: 'connected' | 'failed' | 'suspended' | 'disconnected' | null;
	authCheckFailed: boolean;
	offlineReason: string | null;
	checkStartedAt: number | null;
	consecutiveFailures: number;
	consecutiveSuccesses: number;

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

const POLL_INTERVAL_MS = 5_000;
const CONNECTIVITY_CHECK_URL = '/ping.txt';
const STUCK_CHECK_TIMEOUT_MS = 8_000;
const CONSECUTIVE_THRESHOLD = 3;

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
	consecutiveFailures: 0,
	consecutiveSuccesses: 0,

	initNetworkListeners: () => {
		if (typeof window === 'undefined') return;

		if ((window as any).__networkListenersAttached) {
			return;
		}

		const handleOnline = () => {
			void get().refreshConnectivity({
				force: true,
				reason: 'browser-online-event',
			});
		};

		const handleOffline = () => {
			void get().refreshConnectivity({
				force: true,
				reason: 'browser-offline-event',
			});
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		window.addEventListener('focus', handleOnline);

		const intervalId = window.setInterval(() => {
			void get().refreshConnectivity({ force: true, reason: 'interval-poll' });
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
	},

	stopNetworkListeners: () => {
		if (typeof window === 'undefined') return;

		const intervalId = (window as any).__networkPollIntervalId;
		if (intervalId) {
			window.clearInterval(intervalId);
			(window as any).__networkPollIntervalId = null;
		}

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
			const consecutiveSuccesses = get().consecutiveSuccesses + 1;
			set({ consecutiveSuccesses, consecutiveFailures: 0 });
			if (consecutiveSuccesses >= CONSECUTIVE_THRESHOLD && !get().isOnline) {
				get().markOnline();
			}
			return get().isOnline;
		} catch {
			const consecutiveFailures = get().consecutiveFailures + 1;
			set({ consecutiveFailures, consecutiveSuccesses: 0 });
			if (consecutiveFailures >= CONSECUTIVE_THRESHOLD && get().isOnline) {
				get().markOffline('network-error');
			}
			return get().isOnline;
		} finally {
			clearTimeout(timeoutId);
			set({ isChecking: false, checkStartedAt: null });
		}
	},

	markOffline: (reason = 'network-error') => {
		set({
			isOnline: false,
			isChecking: false,
			offlineReason: reason,
			authCheckFailed: true,
			checkStartedAt: null,
			consecutiveFailures: 0,
			consecutiveSuccesses: 0,
		});
	},
	markOnline: () => {
		set({
			isOnline: true,
			isChecking: false,
			offlineReason: null,
			checkStartedAt: null,
			consecutiveFailures: 0,
			consecutiveSuccesses: 0,
		});
	},

	setAblyState: (state) => set({ ablyState: state }),
	setAuthCheckFailed: (failed) => set({ authCheckFailed: failed }),
}));
