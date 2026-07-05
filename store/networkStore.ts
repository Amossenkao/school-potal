import { create } from 'zustand';

interface NetworkState {
	isOnline: boolean;
	isChecking: boolean;
	isSyncing: boolean; // TRACKS PIPELINE PERFORMANCE
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
}

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
			// Phase 1 verification step is initiated right here
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

		if (!navigator.onLine) {
			handleOffline();
		}
	},

	refreshConnectivity: async (options) => {
		set({ isChecking: true });
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(
				() => controller.abort(),
				options?.timeoutMs || 3000,
			);

			const res = await fetch('/api/ping', {
				method: 'HEAD',
				cache: 'no-store',
				signal: controller.signal,
			});

			clearTimeout(timeoutId);
			const isOnline = res.ok;
			set({
				isOnline,
				isChecking: false,
				offlineReason: isOnline ? null : 'ping-failed',
			});
			return isOnline;
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
