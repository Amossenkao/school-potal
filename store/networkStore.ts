// store/networkStore.ts
import { create } from 'zustand';

type ConnectivityCheckOptions = {
	force?: boolean;
	timeoutMs?: number;
	reason?: string;
};

interface NetworkState {
	browserOnline: boolean;
	internetReachable: boolean | null;
	isOnline: boolean;
	authCheckFailed: boolean;
	isCheckingConnectivity: boolean;
	lastCheckedAt: number | null;
	setIsOnline: (status: boolean) => void;
	setBrowserOnline: (status: boolean) => void;
	setAuthCheckFailed: (status: boolean) => void;
	markOffline: (reason?: string) => void;
	refreshConnectivity: (options?: ConnectivityCheckOptions) => Promise<boolean>;
}

const CONNECTIVITY_ENDPOINT = '/api/ping';
const CONNECTIVITY_TIMEOUT_MS = 15000;
const CONNECTIVITY_RECHECK_WINDOW_MS = 5000;
let connectivityCheckPromise: Promise<boolean> | null = null;

const getBrowserOnline = () => {
	if (typeof navigator === 'undefined') return true;
	return navigator.onLine;
};

const resolveIsOnline = (
	browserOnline: boolean,
	internetReachable: boolean | null,
) => {
	if (!browserOnline) return false;
	if (internetReachable === null) return browserOnline;
	return browserOnline && internetReachable;
};

const probeInternetReachability = async (timeoutMs: number) => {
	if (typeof window === 'undefined') return true;

	const controller = new AbortController();
	let timeoutTriggered = false;
	let timeoutId: number | null = null;

	const fetchAttempt = (async () => {
		try {
			const response = await fetch(
				`${CONNECTIVITY_ENDPOINT}?ts=${Date.now().toString(36)}`,
				{
					method: 'HEAD',
					cache: 'no-store',
					credentials: 'same-origin',
					signal: controller.signal,
					headers: {
						'x-network-probe': '1',
					},
				},
			);
			return Boolean(response);
		} catch {
			return false;
		}
	})();

	const timeoutGuard = new Promise<boolean>((resolve) => {
		timeoutId = window.setTimeout(() => {
			timeoutTriggered = true;
			controller.abort();
			resolve(false);
		}, timeoutMs);
	});

	const result = await Promise.race([fetchAttempt, timeoutGuard]);
	if (timeoutId !== null) {
		window.clearTimeout(timeoutId);
	}
	if (timeoutTriggered) {
		controller.abort();
	}
	return result;
};

const probeInternetReachabilityWithRetry = async (timeoutMs: number) => {
	const firstAttempt = await probeInternetReachability(timeoutMs);
	if (firstAttempt) {
		return true;
	}
	if (!getBrowserOnline()) {
		return false;
	}
	const retryTimeoutMs = Math.max(2200, Math.floor(timeoutMs * 0.6));
	return probeInternetReachability(retryTimeoutMs);
};

export const useNetworkStore = create<NetworkState>((set, get) => ({
	browserOnline: getBrowserOnline(),
	internetReachable: null,
	isOnline: getBrowserOnline(),
	authCheckFailed: false,
	isCheckingConnectivity: false,
	lastCheckedAt: null,
	setIsOnline: (status) => {
		get().setBrowserOnline(status);
	},
	setBrowserOnline: (status) => {
		set((state) => {
			if (!status) {
				return {
					browserOnline: false,
					internetReachable: false,
					isOnline: false,
					lastCheckedAt: Date.now(),
					isCheckingConnectivity: false,
				};
			}

			return {
				browserOnline: true,
				isOnline: resolveIsOnline(true, state.internetReachable),
			};
		});
	},
	setAuthCheckFailed: (status) => set({ authCheckFailed: status }),
	markOffline: () => {
		set(() => ({
			browserOnline: getBrowserOnline(),
			internetReachable: false,
			isOnline: false,
			lastCheckedAt: Date.now(),
			isCheckingConnectivity: false,
		}));
	},
	refreshConnectivity: async (options) => {

		const timeoutMs = options?.timeoutMs ?? CONNECTIVITY_TIMEOUT_MS;
		const force = options?.force ?? false;
		const browserOnline = getBrowserOnline();

		if (!browserOnline) {
			get().setBrowserOnline(false);
			return false;
		}

		const state = get();
		if (
			!force &&
			state.internetReachable !== null &&
			state.lastCheckedAt !== null &&
			Date.now() - state.lastCheckedAt < CONNECTIVITY_RECHECK_WINDOW_MS
		) {
			return resolveIsOnline(browserOnline, state.internetReachable);
		}

		if (connectivityCheckPromise) {
			return connectivityCheckPromise;
		}

		set({ browserOnline: true, isCheckingConnectivity: true });

		connectivityCheckPromise = (async () => {
			const reachable = await probeInternetReachabilityWithRetry(timeoutMs);
			const latestBrowserOnline = getBrowserOnline();
			set({
				browserOnline: latestBrowserOnline,
				internetReachable: reachable,
				isOnline: latestBrowserOnline && reachable,
				lastCheckedAt: Date.now(),
				isCheckingConnectivity: false,
			});
			return latestBrowserOnline && reachable;
		})()
			.catch(() => {
				set({
					browserOnline: getBrowserOnline(),
					internetReachable: false,
					isOnline: false,
					lastCheckedAt: Date.now(),
					isCheckingConnectivity: false,
				});
				return false;
			})
			.finally(() => {
				connectivityCheckPromise = null;
			});

		return connectivityCheckPromise;
	},
}));
