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
	fetchSchool: async () => {
		// 1. If the correct school is already loaded, we're done.
		if (get().school) {
			return;
		}

		// 2. Try to load from local storage first.
		try {
			const storedSchool = localStorage.getItem('school-profile');
			if (storedSchool) {
				set({ school: JSON.parse(storedSchool) });
				return;
			}
		} catch (error) {
			console.error('Failed to load school profile from local storage:', error);
		}

		// 3. If a fetch for the school is already in progress, just wait for it to finish.
		if (fetchPromise) {
			return fetchPromise;
		}

		// 4. Otherwise, start a new fetch by calling our new API route.
		fetchPromise = (async () => {
			try {
				const response = await fetch(`/api/school`);
				if (!response.ok) {
					throw new Error(`Failed to fetch: ${response.statusText}`);
				}
				const schoolProfile: SchoolProfile = await response.json();
				set({ school: schoolProfile });

				// Save to local storage on successful fetch
				localStorage.setItem('school-profile', JSON.stringify(schoolProfile));
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
