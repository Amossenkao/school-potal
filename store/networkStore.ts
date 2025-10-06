// store/networkStore.ts
import { create } from 'zustand';

interface NetworkState {
	isOnline: boolean;
	authCheckFailed: boolean; // Track if auth check failed due to network
	setIsOnline: (status: boolean) => void;
	setAuthCheckFailed: (status: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
	isOnline: true,
	authCheckFailed: false,
	setIsOnline: (status) => set({ isOnline: status }),
	setAuthCheckFailed: (status) => set({ authCheckFailed: status }),
}));
