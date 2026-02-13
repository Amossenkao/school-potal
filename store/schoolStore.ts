import { create } from 'zustand';
import type SchoolProfile from '@/types/schoolProfile';
import {
	clearDomainSnapshots,
	getAllDomainSnapshots,
	setDomainSnapshot,
} from '@/utils/domainSyncCache';

type UsersPayload = {
	students?: any[];
	teachers?: any[];
	administrators?: any[];
};

type SchedulesPayload = { classSchedules?: any[]; testSchedules?: any[] };

type SchoolStore = {
	school: SchoolProfile | null;
	schoolVersion: string | null;
	usersByAcademicYear: Record<
		string,
		{
			students: any[];
			teachers: any[];
			administrators: any[];
		}
	>;
	usersVersionByAcademicYear: Record<string, string>;
	calendarByAcademicYear: Record<string, any[]>;
	gradesByAcademicYear: Record<string, any[]>;
	gradeRequestsByAcademicYear: Record<string, any[]>;
	schedulesByAcademicYear: Record<
		string,
		{
			classSchedules: any[];
			testSchedules: any[];
		}
	>;
	calendarVersionByAcademicYear: Record<string, string>;
	gradesVersionByAcademicYear: Record<string, string>;
	gradeRequestsVersionByAcademicYear: Record<string, string>;
	schedulesVersionByAcademicYear: Record<string, string>;

	fetchSchool: (host?: string) => Promise<void>;
	setSchool: (school: SchoolProfile | null) => void;
	setSchoolVersion: (version: string | null) => void;
	setUsersForYear: (
		academicYear: string,
		payload: UsersPayload,
		options?: { merge?: boolean },
	) => void;
	setUsersVersionForYear: (academicYear: string, version: string) => void;
	setCalendarForYear: (academicYear: string, events: any[]) => void;
	setGradesForYear: (academicYear: string, grades: any[]) => void;
	setSchedulesForYear: (
		academicYear: string,
		payload: SchedulesPayload,
	) => void;
	setGradeRequestsForYear: (academicYear: string, requests: any[]) => void;
	setDomainVersionsForYear: (
		academicYear: string,
		versions: {
			users?: string;
			calendar?: string;
			grades?: string;
			gradeRequests?: string;
			schedules?: string;
		},
	) => void;
	clearCache: () => void;
	hydrateCache: () => void;
};

// Prevent multiple simultaneous fetches
let fetchPromise: Promise<void> | null = null;

const SCHOOL_META_CACHE_KEY = 'school-cache-v2';

const readMetaCache = () => {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(SCHOOL_META_CACHE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch (error) {
		console.warn('Failed to read school metadata cache:', error);
		return null;
	}
};

const writeMetaCache = (payload: {
	usersVersionByAcademicYear: Record<string, string>;
	calendarVersionByAcademicYear: Record<string, string>;
	gradesVersionByAcademicYear: Record<string, string>;
	gradeRequestsVersionByAcademicYear: Record<string, string>;
	schedulesVersionByAcademicYear: Record<string, string>;
	schoolVersion: string | null;
}) => {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(SCHOOL_META_CACHE_KEY, JSON.stringify(payload));
	} catch (error) {
		console.warn('Failed to persist school metadata cache:', error);
	}
};

const persistMeta = (state: Pick<
	SchoolStore,
	| 'usersVersionByAcademicYear'
	| 'calendarVersionByAcademicYear'
	| 'gradesVersionByAcademicYear'
	| 'gradeRequestsVersionByAcademicYear'
	| 'schedulesVersionByAcademicYear'
	| 'schoolVersion'
>) => {
	writeMetaCache({
		usersVersionByAcademicYear: state.usersVersionByAcademicYear,
		calendarVersionByAcademicYear: state.calendarVersionByAcademicYear,
		gradesVersionByAcademicYear: state.gradesVersionByAcademicYear,
		gradeRequestsVersionByAcademicYear:
			state.gradeRequestsVersionByAcademicYear,
		schedulesVersionByAcademicYear: state.schedulesVersionByAcademicYear,
		schoolVersion: state.schoolVersion,
	});
};

const persistDomainSnapshot = (
	domain: 'users' | 'grades' | 'calendar' | 'schedules' | 'gradeRequests',
	academicYear: string,
	value: unknown,
) => {
	void setDomainSnapshot(domain, academicYear, value).catch((error) => {
		console.warn(`Failed to persist ${domain} cache to IndexedDB:`, error);
	});
};

export const useSchoolStore = create<SchoolStore>((set, get) => ({
	school: null,
	schoolVersion: null,
	usersByAcademicYear: {},
	usersVersionByAcademicYear: {},
	calendarByAcademicYear: {},
	gradesByAcademicYear: {},
	gradeRequestsByAcademicYear: {},
	schedulesByAcademicYear: {},
	calendarVersionByAcademicYear: {},
	gradesVersionByAcademicYear: {},
	gradeRequestsVersionByAcademicYear: {},
	schedulesVersionByAcademicYear: {},

	fetchSchool: async () => {
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

		if (fetchPromise) return fetchPromise;

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

	setSchoolVersion: (version) => {
		set((state) => {
			const next = { ...state, schoolVersion: version };
			persistMeta(next);
			return { schoolVersion: version };
		});
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

			persistDomainSnapshot('users', academicYear, updated);
			persistMeta(state);

			return { usersByAcademicYear };
		});
	},

	setUsersVersionForYear: (academicYear, version) => {
		if (!academicYear || typeof version !== 'string') return;
		set((state) => {
			const usersVersionByAcademicYear = {
				...state.usersVersionByAcademicYear,
				[academicYear]: version,
			};
			const next = { ...state, usersVersionByAcademicYear };
			persistMeta(next);
			return { usersVersionByAcademicYear };
		});
	},

	setCalendarForYear: (academicYear, events) => {
		if (!academicYear) return;
		set((state) => {
			const calendarByAcademicYear = {
				...state.calendarByAcademicYear,
				[academicYear]: Array.isArray(events) ? events : [],
			};
			persistDomainSnapshot('calendar', academicYear, calendarByAcademicYear[academicYear]);
			persistMeta(state);
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
			persistDomainSnapshot('grades', academicYear, gradesByAcademicYear[academicYear]);
			persistMeta(state);
			return { gradesByAcademicYear };
		});
	},

	setGradeRequestsForYear: (academicYear, requests) => {
		if (!academicYear) return;
		set((state) => {
			const gradeRequestsByAcademicYear = {
				...state.gradeRequestsByAcademicYear,
				[academicYear]: Array.isArray(requests) ? requests : [],
			};
			persistDomainSnapshot(
				'gradeRequests',
				academicYear,
				gradeRequestsByAcademicYear[academicYear],
			);
			persistMeta(state);
			return { gradeRequestsByAcademicYear };
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
			persistDomainSnapshot(
				'schedules',
				academicYear,
				schedulesByAcademicYear[academicYear],
			);
			persistMeta(state);
			return { schedulesByAcademicYear };
		});
	},

	setDomainVersionsForYear: (academicYear, versions) => {
		if (!academicYear) return;
		set((state) => {
			const usersVersionByAcademicYear =
				typeof versions.users === 'string'
					? {
						...state.usersVersionByAcademicYear,
						[academicYear]: versions.users,
					}
					: state.usersVersionByAcademicYear;
			const calendarVersionByAcademicYear =
				typeof versions.calendar === 'string'
					? {
						...state.calendarVersionByAcademicYear,
						[academicYear]: versions.calendar,
					}
					: state.calendarVersionByAcademicYear;
			const gradesVersionByAcademicYear =
				typeof versions.grades === 'string'
					? {
						...state.gradesVersionByAcademicYear,
						[academicYear]: versions.grades,
					}
					: state.gradesVersionByAcademicYear;
			const gradeRequestsVersionByAcademicYear =
				typeof versions.gradeRequests === 'string'
					? {
						...state.gradeRequestsVersionByAcademicYear,
						[academicYear]: versions.gradeRequests,
					}
					: state.gradeRequestsVersionByAcademicYear;
			const schedulesVersionByAcademicYear =
				typeof versions.schedules === 'string'
					? {
						...state.schedulesVersionByAcademicYear,
						[academicYear]: versions.schedules,
					}
					: state.schedulesVersionByAcademicYear;
			const next = {
				...state,
				usersVersionByAcademicYear,
				calendarVersionByAcademicYear,
				gradesVersionByAcademicYear,
				gradeRequestsVersionByAcademicYear,
				schedulesVersionByAcademicYear,
			};
			persistMeta(next);
			return {
				usersVersionByAcademicYear,
				calendarVersionByAcademicYear,
				gradesVersionByAcademicYear,
				gradeRequestsVersionByAcademicYear,
				schedulesVersionByAcademicYear,
			};
		});
	},

	clearCache: () => {
		set({
			usersByAcademicYear: {},
			usersVersionByAcademicYear: {},
			calendarByAcademicYear: {},
			gradesByAcademicYear: {},
			gradeRequestsByAcademicYear: {},
			schedulesByAcademicYear: {},
			calendarVersionByAcademicYear: {},
			gradesVersionByAcademicYear: {},
			gradeRequestsVersionByAcademicYear: {},
			schedulesVersionByAcademicYear: {},
			schoolVersion: null,
		});
		if (typeof window !== 'undefined') {
			try {
				localStorage.removeItem(SCHOOL_META_CACHE_KEY);
			} catch (error) {
				console.warn('Failed to clear school metadata cache:', error);
			}
		}
		void clearDomainSnapshots().catch((error) => {
			console.warn('Failed to clear IndexedDB domain snapshots:', error);
		});
	},

	hydrateCache: () => {
		const cachedMeta = readMetaCache();
		if (cachedMeta) {
			set((state) => ({
				usersVersionByAcademicYear:
					cachedMeta.usersVersionByAcademicYear || state.usersVersionByAcademicYear,
				calendarVersionByAcademicYear:
					cachedMeta.calendarVersionByAcademicYear ||
					state.calendarVersionByAcademicYear,
				gradesVersionByAcademicYear:
					cachedMeta.gradesVersionByAcademicYear || state.gradesVersionByAcademicYear,
				gradeRequestsVersionByAcademicYear:
					cachedMeta.gradeRequestsVersionByAcademicYear ||
					state.gradeRequestsVersionByAcademicYear,
				schedulesVersionByAcademicYear:
					cachedMeta.schedulesVersionByAcademicYear ||
					state.schedulesVersionByAcademicYear,
				schoolVersion:
					typeof cachedMeta.schoolVersion === 'string'
						? cachedMeta.schoolVersion
						: state.schoolVersion,
			}));
		}

		void (async () => {
			try {
				const snapshots = await getAllDomainSnapshots();
				if (!Array.isArray(snapshots) || snapshots.length === 0) return;
				set((state) => {
					const usersByAcademicYear = { ...state.usersByAcademicYear };
					const gradesByAcademicYear = { ...state.gradesByAcademicYear };
					const gradeRequestsByAcademicYear = {
						...state.gradeRequestsByAcademicYear,
					};
					const calendarByAcademicYear = { ...state.calendarByAcademicYear };
					const schedulesByAcademicYear = { ...state.schedulesByAcademicYear };

					snapshots.forEach((snapshot) => {
						const year = String(snapshot.academicYear || '');
						if (!year) return;
						if (snapshot.domain === 'users') {
							const users = snapshot.value as UsersPayload;
							usersByAcademicYear[year] = {
								students: Array.isArray(users?.students) ? users.students : [],
								teachers: Array.isArray(users?.teachers) ? users.teachers : [],
								administrators: Array.isArray(users?.administrators)
									? users.administrators
									: [],
							};
						}
						if (snapshot.domain === 'grades') {
							gradesByAcademicYear[year] = Array.isArray(snapshot.value)
								? (snapshot.value as any[])
								: [];
						}
						if (snapshot.domain === 'calendar') {
							calendarByAcademicYear[year] = Array.isArray(snapshot.value)
								? (snapshot.value as any[])
								: [];
						}
						if (snapshot.domain === 'schedules') {
							const payload = (snapshot.value || {}) as SchedulesPayload;
							schedulesByAcademicYear[year] = {
								classSchedules: Array.isArray(payload.classSchedules)
									? payload.classSchedules
									: [],
								testSchedules: Array.isArray(payload.testSchedules)
									? payload.testSchedules
									: [],
							};
						}
						if (snapshot.domain === 'gradeRequests') {
							gradeRequestsByAcademicYear[year] = Array.isArray(snapshot.value)
								? (snapshot.value as any[])
								: [];
						}
					});

					return {
						usersByAcademicYear,
						gradesByAcademicYear,
						gradeRequestsByAcademicYear,
						calendarByAcademicYear,
						schedulesByAcademicYear,
					};
				});
			} catch (error) {
				console.warn('Failed to hydrate IndexedDB domain snapshots:', error);
			}
		})();
	},
}));
