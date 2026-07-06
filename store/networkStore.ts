import { create } from 'zustand';

interface NetworkState {
	isOnline: boolean;
	isChecking: boolean;
	isSyncing: boolean;
	ablyState: 'connected' | 'failed' | 'suspended' | 'disconnected' | null;
	authCheckFailed: boolean;
	offlineReason: string | null;

	// Actions
	initNetworkListeners: () => void;
	refreshConnectivity: (options?: {
		timeoutMs?: number;
		force?: boolean;
		reason?: string;
	}) => Promise<boolean>;
	setAblyState: (
		state: 'connected' | 'failed' | 'suspended' | 'disconnected',
	) => void;
	setAuthCheckFailed: (failed: boolean) => void;
	stopNetworkListeners: () => void;
}

const POLL_INTERVAL_MS = 1_000; 
const CONNECTIVITY_CHECK_URL = 'https://www.gstatic.com/generate_204';

export const useNetworkStore = create<NetworkState>((set, get) => ({
	isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
	isChecking: false,
	isSyncing: false,
	ablyState: null,
	authCheckFailed: false,
	offlineReason: null,

	initNetworkListeners: () => {
		if (typeof window === 'undefined') return;
		if ((window as any).__networkListenersAttached) return;
		(window as any).__networkListenersAttached = true;

		const handleOnline = async () => {
			await get().refreshConnectivity({
				force: true,
				reason: 'browser-online-event',
			});
		};

		const handleOffline = () => {
			set({
				isOnline: false,
				offlineReason: 'browser-offline',
				authCheckFailed: true,
			});
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		const intervalId = window.setInterval(() => {
			if (get().isChecking) return;
			if (document.visibilityState !== 'visible') return;
			get().refreshConnectivity({ reason: 'interval-poll' });
		}, POLL_INTERVAL_MS);
		(window as any).__networkPollIntervalId = intervalId;

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				get().refreshConnectivity({ reason: 'visibility-change' });
			}
		};
		document.addEventListener('visibilitychange', handleVisibilityChange);
		(window as any).__networkVisibilityHandler = handleVisibilityChange;

		if (!navigator.onLine) {
			handleOffline();
		}
	},

	stopNetworkListeners: () => {
		if (typeof window === 'undefined') return;
		const intervalId = (window as any).__networkPollIntervalId;
		if (intervalId) {
			window.clearInterval(intervalId);
			(window as any).__networkPollIntervalId = null;
		}
		const visibilityHandler = (window as any).__networkVisibilityHandler;
		if (visibilityHandler) {
			document.removeEventListener('visibilitychange', visibilityHandler);
			(window as any).__networkVisibilityHandler = null;
		}
		(window as any).__networkListenersAttached = false;
	},

	refreshConnectivity: async (options) => {
		if (get().isChecking && !options?.force) return get().isOnline;

		set({ isChecking: true });
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(
				() => controller.abort(),
				options?.timeoutMs || 3000,
			);

			// no-cors means we can't read res.ok/status — an opaque response
			// that resolves (rather than throws) is treated as "online"
			await fetch(CONNECTIVITY_CHECK_URL, {
				method: 'HEAD',
				mode: 'no-cors',
				cache: 'no-store',
				signal: controller.signal,
			});

			clearTimeout(timeoutId);
			set({
				isOnline: true,
				isChecking: false,
				offlineReason: null,
			});
			return true;
		} catch (error) {
			set({
				isOnline: false,
				isChecking: false,
				offlineReason: 'network-error',
			});
			return false;
		}
	},

	setAblyState: (state) => set({ ablyState: state }),
	setAuthCheckFailed: (failed) => set({ authCheckFailed: failed }),
}));
