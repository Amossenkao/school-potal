import { create } from 'zustand';
import type SchoolProfile from '@/types/schoolProfile';

type SchoolStore = {
	school: SchoolProfile | null;
	usersByAcademicYear: Record<
		string,
		{
			students: any[];
			teachers: any[];
			administrators: any[];
		}
	>;
	calendarByAcademicYear: Record<string, any[]>;
	schedulesByAcademicYear: Record<
		string,
		{
			classSchedules: any[];
			testSchedules: any[];
		}
	>;
	fetchSchool: (host?: string) => Promise<void>;
	setSchool: (school: SchoolProfile | null) => void;
	setUsersForYear: (
		academicYear: string,
		payload: {
			students?: any[];
			teachers?: any[];
			administrators?: any[];
		},
		options?: { merge?: boolean },
	) => void;
	setCalendarForYear: (academicYear: string, events: any[]) => void;
	setSchedulesForYear: (
		academicYear: string,
		payload: { classSchedules?: any[]; testSchedules?: any[] },
	) => void;
	clearCache: () => void;
};

// Prevent multiple simultaneous fetches
let fetchPromise: Promise<void> | null = null;

export const useSchoolStore = create<SchoolStore>((set, get) => ({
	school: null,
	usersByAcademicYear: {},
	calendarByAcademicYear: {},
	schedulesByAcademicYear: {},

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

	setUsersForYear: (academicYear, payload, options = {}) => {
		if (!academicYear) return;
		const merge = options.merge !== false;
		set((state) => {
			const existing = state.usersByAcademicYear[academicYear] || {
				students: [],
				teachers: [],
				administrators: [],
			};
			const nextStudents = payload.students || [];
			const nextTeachers = payload.teachers || [];
			const nextAdmins = payload.administrators || [];

			const mergeById = (current: any[], incoming: any[]) => {
				if (!merge) return incoming;
				const seen = new Map<string, any>();
				current.forEach((user) => {
					const id = user?.id || user?._id;
					if (id) seen.set(id, user);
				});
				incoming.forEach((user) => {
					const id = user?.id || user?._id;
					if (id) seen.set(id, user);
				});
				return Array.from(seen.values());
			};

			const updated = {
				students: mergeById(existing.students, nextStudents),
				teachers: mergeById(existing.teachers, nextTeachers),
				administrators: mergeById(existing.administrators, nextAdmins),
			};

			return {
				usersByAcademicYear: {
					...state.usersByAcademicYear,
					[academicYear]: updated,
				},
			};
		});
	},

	setCalendarForYear: (academicYear, events) => {
		if (!academicYear) return;
		set((state) => ({
			calendarByAcademicYear: {
				...state.calendarByAcademicYear,
				[academicYear]: Array.isArray(events) ? events : [],
			},
		}));
	},

	setSchedulesForYear: (academicYear, payload) => {
		if (!academicYear) return;
		set((state) => ({
			schedulesByAcademicYear: {
				...state.schedulesByAcademicYear,
				[academicYear]: {
					classSchedules: payload.classSchedules || [],
					testSchedules: payload.testSchedules || [],
				},
			},
		}));
	},

	clearCache: () => {
		set({
			usersByAcademicYear: {},
			calendarByAcademicYear: {},
			schedulesByAcademicYear: {},
		});
	},
}));
