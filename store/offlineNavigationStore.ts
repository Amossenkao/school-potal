// store/offlineNavigationStore.ts
import { create } from 'zustand';

interface OfflineNavigationState {
	offlinePath: string | null;
	setOfflinePath: (path: string | null) => void;
	clearOfflinePath: () => void;
}

export const useOfflineNavigationStore = create<OfflineNavigationState>((set) => ({
	offlinePath: null,
	setOfflinePath: (path) => set({ offlinePath: path }),
	clearOfflinePath: () => set({ offlinePath: null }),
}));
