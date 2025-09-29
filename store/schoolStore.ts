import { create } from 'zustand';
import type SchoolProfile from '@/types/schoolProfile';

type SchoolStore = {
	school: SchoolProfile | null;
	fetchSchool: (host?: string) => Promise<void>;
	setSchool: (school: SchoolProfile | null) => void;
};

// Prevent multiple simultaneous fetches
let fetchPromise: Promise<void> | null = null;

export const useSchoolStore = create<SchoolStore>((set, get) => ({
	school: null,

	fetchSchool: async () => {
		// 1. If we already have the correct school, no need to fetch
		if (get().school) return;

		// 2. Load from local storage
		try {
			const storedSchool = localStorage.getItem('school-profile');
			if (storedSchool) {
				set({ school: JSON.parse(storedSchool) });
				return;
			}
		} catch (error) {
			console.error('Failed to load school profile from local storage:', error);
		}

		// 3. If fetch is already in progress, wait for it
		if (fetchPromise) return fetchPromise;

		// 4. Otherwise, fetch from API
		fetchPromise = (async () => {
			try {
				const response = await fetch(`/api/school`);
				if (!response.ok) {
					throw new Error(`Failed to fetch: ${response.statusText}`);
				}
				const schoolProfile: SchoolProfile = await response.json();
				set({ school: schoolProfile });

				localStorage.setItem('school-profile', JSON.stringify(schoolProfile));
			} catch (error) {
				console.error('Failed to fetch school profile:', error);
				set({ school: null });
			} finally {
				fetchPromise = null;
			}
		})();

		await fetchPromise;
	},

	setSchool: (school) => {
		set({ school });
		if (school) {
			localStorage.setItem('school-profile', JSON.stringify(school));
		} else {
			localStorage.removeItem('school-profile');
		}
	},
}));
