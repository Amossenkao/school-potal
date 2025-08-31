import { create } from 'zustand';
import type SchoolProfile from '@/types/schoolProfile';

type SchoolStore = {
	school: SchoolProfile | null;
	fetchSchool: (host: string) => Promise<void>;
};

// This helps prevent re-fetching if multiple components call fetchSchool simultaneously.
let fetchPromise: Promise<void> | null = null;

export const useSchoolStore = create<SchoolStore>((set, get) => ({
	school: null,
	fetchSchool: async (host: string) => {
		// 1. If the correct school is already loaded, we're done.
		if (get().school?.host === host) {
			return;
		}

		// 2. If a fetch for the school is already in progress, just wait for it to finish.
		if (fetchPromise) {
			return fetchPromise;
		}

		// 3. Otherwise, start a new fetch by calling our new API route.
		fetchPromise = (async () => {
			try {
				const response = await fetch(`/api/school?host=${host}`);
				if (!response.ok) {
					throw new Error(`Failed to fetch: ${response.statusText}`);
				}
				const schoolProfile: SchoolProfile = await response.json();
				set({ school: schoolProfile });
			} catch (error) {
				console.error('Failed to fetch school profile:', error);
				set({ school: null }); // Clear school on error
			} finally {
				// Once the request is complete (success or fail), clear the promise cache.
				fetchPromise = null;
			}
		})();

		await fetchPromise;
	},
}));
