// store/networkStore.ts
import { create } from 'zustand';

interface NetworkState {
	isOnline: boolean;
	authCheckFailed: boolean; // Track if auth check failed due to network
	setIsOnline: (status: boolean) => void;
	setAuthCheckFailed: (status: boolean) => void;
}

const getInitialOnlineState = () => {
	if (typeof navigator === 'undefined') return true;
	return navigator.onLine;
};

export const useNetworkStore = create<NetworkState>((set) => ({
	isOnline: getInitialOnlineState(),
	authCheckFailed: false,
	setIsOnline: (status) => set({ isOnline: status }),
	setAuthCheckFailed: (status) => set({ authCheckFailed: status }),
}));
