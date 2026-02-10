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
	usersVersionByAcademicYear: Record<string, number>;
	calendarByAcademicYear: Record<string, any[]>;
	gradesByAcademicYear: Record<string, any[]>;
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
	setUsersVersionForYear: (academicYear: string, version: number) => void;
	setCalendarForYear: (academicYear: string, events: any[]) => void;
	setGradesForYear: (academicYear: string, grades: any[]) => void;
	setSchedulesForYear: (
		academicYear: string,
		payload: { classSchedules?: any[]; testSchedules?: any[] },
	) => void;
	clearCache: () => void;
	hydrateCache: () => void;
};

// Prevent multiple simultaneous fetches
let fetchPromise: Promise<void> | null = null;

const SCHOOL_CACHE_KEY = 'school-cache-v1';

const readSchoolCache = () => {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(SCHOOL_CACHE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch (error) {
		console.warn('Failed to read school cache:', error);
		return null;
	}
};

const writeSchoolCache = (payload: {
	usersByAcademicYear: Record<string, any>;
	usersVersionByAcademicYear: Record<string, number>;
	calendarByAcademicYear: Record<string, any[]>;
	gradesByAcademicYear: Record<string, any[]>;
	schedulesByAcademicYear: Record<string, any>;
}) => {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(SCHOOL_CACHE_KEY, JSON.stringify(payload));
	} catch (error) {
		console.warn('Failed to persist school cache:', error);
	}
};

export const useSchoolStore = create<SchoolStore>((set, get) => ({
	school: null,
	usersByAcademicYear: {},
	usersVersionByAcademicYear: {},
	calendarByAcademicYear: {},
	gradesByAcademicYear: {},
	schedulesByAcademicYear: {},

	fetchSchool: async () => {
		// 1. Load from local storage for immediate hydration if needed
		if (!get().school) {
			try {
				const storedSchool = localStorage.getItem('school-profile');
				if (storedSchool) {
					set({ school: JSON.parse(storedSchool) });
				}
			} catch (error) {
				console.error('Failed to load school profile from local storage:', error);
			}
		}

		const isOffline =
			typeof navigator !== 'undefined' && navigator.onLine === false;
		if (isOffline) return;

		// 2. If fetch is already in progress, wait for it
		if (fetchPromise) return fetchPromise;

		// 3. Otherwise, fetch from API (revalidate cached profile)
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

			const usersByAcademicYear = {
				...state.usersByAcademicYear,
				[academicYear]: updated,
			};
			writeSchoolCache({
				usersByAcademicYear,
				usersVersionByAcademicYear: state.usersVersionByAcademicYear,
				calendarByAcademicYear: state.calendarByAcademicYear,
				gradesByAcademicYear: state.gradesByAcademicYear,
				schedulesByAcademicYear: state.schedulesByAcademicYear,
			});
			return { usersByAcademicYear };
		});
	},

	setUsersVersionForYear: (academicYear, version) => {
		if (!academicYear || typeof version !== 'number') return;
		set((state) => ({
			usersVersionByAcademicYear: (() => {
				const usersVersionByAcademicYear = {
					...state.usersVersionByAcademicYear,
					[academicYear]: version,
				};
				writeSchoolCache({
					usersByAcademicYear: state.usersByAcademicYear,
					usersVersionByAcademicYear,
				calendarByAcademicYear: state.calendarByAcademicYear,
				gradesByAcademicYear: state.gradesByAcademicYear,
				schedulesByAcademicYear: state.schedulesByAcademicYear,
			});
				return usersVersionByAcademicYear;
			})(),
		}));
	},

	setCalendarForYear: (academicYear, events) => {
		if (!academicYear) return;
		set((state) => {
			const calendarByAcademicYear = {
				...state.calendarByAcademicYear,
				[academicYear]: Array.isArray(events) ? events : [],
			};
			writeSchoolCache({
				usersByAcademicYear: state.usersByAcademicYear,
				usersVersionByAcademicYear: state.usersVersionByAcademicYear,
				calendarByAcademicYear,
				gradesByAcademicYear: state.gradesByAcademicYear,
				schedulesByAcademicYear: state.schedulesByAcademicYear,
			});
			return { calendarByAcademicYear };
		});
	},

	setGradesForYear: (academicYear, grades) => {
		if (!academicYear) return;
		set((state) => {
			const gradesByAcademicYear = {
				...state.gradesByAcademicYear,
				[academicYear]: Array.isArray(grades) ? grades : [],
			};
			writeSchoolCache({
				usersByAcademicYear: state.usersByAcademicYear,
				usersVersionByAcademicYear: state.usersVersionByAcademicYear,
				calendarByAcademicYear: state.calendarByAcademicYear,
				gradesByAcademicYear,
				schedulesByAcademicYear: state.schedulesByAcademicYear,
			});
			return { gradesByAcademicYear };
		});
	},

	setSchedulesForYear: (academicYear, payload) => {
		if (!academicYear) return;
		set((state) => {
			const schedulesByAcademicYear = {
				...state.schedulesByAcademicYear,
				[academicYear]: {
					classSchedules: payload.classSchedules || [],
					testSchedules: payload.testSchedules || [],
				},
			};
			writeSchoolCache({
				usersByAcademicYear: state.usersByAcademicYear,
				usersVersionByAcademicYear: state.usersVersionByAcademicYear,
				calendarByAcademicYear: state.calendarByAcademicYear,
				gradesByAcademicYear: state.gradesByAcademicYear,
				schedulesByAcademicYear,
			});
			return { schedulesByAcademicYear };
		});
	},

	clearCache: () => {
		set({
			usersByAcademicYear: {},
			usersVersionByAcademicYear: {},
		calendarByAcademicYear: {},
		gradesByAcademicYear: {},
		schedulesByAcademicYear: {},
	});
		if (typeof window !== 'undefined') {
			try {
				localStorage.removeItem(SCHOOL_CACHE_KEY);
			} catch (error) {
				console.warn('Failed to clear school cache:', error);
			}
		}
	},
	hydrateCache: () => {
		const cached = readSchoolCache();
		if (!cached) return;
		set((state) => ({
			usersByAcademicYear: cached.usersByAcademicYear || state.usersByAcademicYear,
			usersVersionByAcademicYear:
				cached.usersVersionByAcademicYear || state.usersVersionByAcademicYear,
			calendarByAcademicYear:
				cached.calendarByAcademicYear || state.calendarByAcademicYear,
		schedulesByAcademicYear:
			cached.schedulesByAcademicYear || state.schedulesByAcademicYear,
		gradesByAcademicYear:
			cached.gradesByAcademicYear || state.gradesByAcademicYear,
	}));
	},
}));
