import { create } from 'zustand';
import type SchoolProfile from '@/types/schoolProfile';
import {
	clearDomainSnapshots,
	getAllDomainSnapshots,
	setDomainSnapshot,
} from '@/utils/domainSyncCache';
import { useNetworkStore } from './networkStore';

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
	mergeGradesForYear: (academicYear: string, grades: any[]) => void;
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

const normalizeAcademicYearKey = (value?: string | null) => {
	if (!value) return '';
	return String(value)
		.trim()
		.replace(/[–—]/g, '-')
		.replace(/\s+/g, '')
		.replace(/\//g, '-');
};

const buildAcademicYearKeyVariants = (academicYear: string) => {
	const raw = String(academicYear || '').trim();
	if (!raw) return [] as string[];
	const normalized = normalizeAcademicYearKey(raw);
	const slash = normalized ? normalized.replace(/-/g, '/') : '';
	return Array.from(
		new Set([raw, normalized, slash].filter((value): value is string => Boolean(value))),
	);
};

const getAcademicYearPrimaryKey = (academicYear: string) => {
	const variants = buildAcademicYearKeyVariants(academicYear);
	return variants.find((value) => value.includes('-')) || variants[0] || academicYear;
};

const resolveAcademicYearRecord = <T,>(
	map: Record<string, T> | undefined,
	academicYear: string,
): T | undefined => {
	if (!map) return undefined;
	const variants = buildAcademicYearKeyVariants(academicYear);
	for (const key of variants) {
		if (Object.prototype.hasOwnProperty.call(map, key)) {
			return map[key];
		}
	}
	const normalized = normalizeAcademicYearKey(academicYear);
	if (!normalized) return undefined;
	const matchedKey = Object.keys(map).find(
		(key) => normalizeAcademicYearKey(key) === normalized,
	);
	return matchedKey ? map[matchedKey] : undefined;
};

const assignAcademicYearRecord = <T,>(
	map: Record<string, T>,
	academicYear: string,
	value: T,
) => {
	const next = { ...map };
	buildAcademicYearKeyVariants(academicYear).forEach((key) => {
		next[key] = value;
	});
	return next;
};

const expandAcademicYearRecordMap = <T,>(map?: Record<string, T> | null) => {
	const expanded: Record<string, T> = {};
	if (!map || typeof map !== 'object') return expanded;
	Object.entries(map).forEach(([academicYear, value]) => {
		buildAcademicYearKeyVariants(academicYear).forEach((key) => {
			expanded[key] = value as T;
		});
	});
	return expanded;
};

const getGradeIdentity = (grade: any) => {
	const naturalKey = [
		grade?.academicYear,
		grade?.classId,
		grade?.subject,
		grade?.period,
		grade?.studentId,
		grade?.teacherUsername,
	]
		.map((part) => String(part || '').trim().toLowerCase())
		.join('|');
	if (naturalKey.replaceAll('|', '')) return naturalKey;
	const id = grade?._id || grade?.id;
	return id ? `id:${String(id)}` : '';
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

		// Cache-first: if school exists in memory or local storage, skip network fetch.
		if (get().school) return;

		const isOnline = await useNetworkStore.getState().refreshConnectivity({
			timeoutMs: 2500,
			reason: 'school-fetch',
		});
		if (!isOnline) return;

			if (fetchPromise) return fetchPromise;

			fetchPromise = (async () => {
				try {
					const controller = new AbortController();
					const timeoutId = window.setTimeout(() => controller.abort(), 5000);
					const response = await (async () => {
						try {
							return await fetch(`/api/school`, {
								signal: controller.signal,
							});
						} finally {
							window.clearTimeout(timeoutId);
						}
					})();
					if (!response.ok) {
						throw new Error(`Failed to fetch: ${response.statusText}`);
					}
				const schoolProfile: SchoolProfile = await response.json();
				set({ school: schoolProfile });

				localStorage.setItem('school-profile', JSON.stringify(schoolProfile));
			} catch (error) {
				console.error('Failed to fetch school profile:', error);
				// Keep existing cached school data if available instead of blanking UI.
				if (!get().school) {
					try {
						const storedSchool = localStorage.getItem('school-profile');
						if (storedSchool) {
							set({ school: JSON.parse(storedSchool) });
						}
					} catch (cacheError) {
						console.warn('Failed to restore cached school profile:', cacheError);
					}
				}
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
			const existing = resolveAcademicYearRecord(
				state.usersByAcademicYear,
				academicYear,
			) || {
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

			const usersByAcademicYear = assignAcademicYearRecord(
				state.usersByAcademicYear,
				academicYear,
				updated,
			);

			persistDomainSnapshot('users', getAcademicYearPrimaryKey(academicYear), updated);
			persistMeta(state);

			return { usersByAcademicYear };
		});
	},

	setUsersVersionForYear: (academicYear, version) => {
		if (!academicYear || typeof version !== 'string') return;
		set((state) => {
			const usersVersionByAcademicYear = assignAcademicYearRecord(
				state.usersVersionByAcademicYear,
				academicYear,
				version,
			);
			const next = { ...state, usersVersionByAcademicYear };
			persistMeta(next);
			return { usersVersionByAcademicYear };
		});
	},

	setCalendarForYear: (academicYear, events) => {
		if (!academicYear) return;
		set((state) => {
			const value = Array.isArray(events) ? events : [];
			const calendarByAcademicYear = assignAcademicYearRecord(
				state.calendarByAcademicYear,
				academicYear,
				value,
			);
			persistDomainSnapshot('calendar', getAcademicYearPrimaryKey(academicYear), value);
			persistMeta(state);
			return { calendarByAcademicYear };
		});
	},

	setGradesForYear: (academicYear, grades) => {
		if (!academicYear) return;
		set((state) => {
			const value = Array.isArray(grades) ? grades : [];
			const gradesByAcademicYear = assignAcademicYearRecord(
				state.gradesByAcademicYear,
				academicYear,
				value,
			);
			persistDomainSnapshot('grades', getAcademicYearPrimaryKey(academicYear), value);
			persistMeta(state);
			return { gradesByAcademicYear };
		});
	},

	mergeGradesForYear: (academicYear, grades) => {
		if (!academicYear || !Array.isArray(grades) || grades.length === 0) return;
		set((state) => {
			const existing =
				resolveAcademicYearRecord(state.gradesByAcademicYear, academicYear) ||
				[];
			const merged = new Map<string, any>();
			existing.forEach((grade) => {
				const key = getGradeIdentity(grade);
				if (key) merged.set(key, grade);
			});
			grades.forEach((grade) => {
				const key = getGradeIdentity(grade);
				if (key) merged.set(key, grade);
			});
			const value = Array.from(merged.values());
			const gradesByAcademicYear = assignAcademicYearRecord(
				state.gradesByAcademicYear,
				academicYear,
				value,
			);
			persistDomainSnapshot('grades', getAcademicYearPrimaryKey(academicYear), value);
			persistMeta(state);
			return { gradesByAcademicYear };
		});
	},

	setGradeRequestsForYear: (academicYear, requests) => {
		if (!academicYear) return;
		set((state) => {
			const value = Array.isArray(requests) ? requests : [];
			const gradeRequestsByAcademicYear = assignAcademicYearRecord(
				state.gradeRequestsByAcademicYear,
				academicYear,
				value,
			);
			persistDomainSnapshot(
				'gradeRequests',
				getAcademicYearPrimaryKey(academicYear),
				value,
			);
			persistMeta(state);
			return { gradeRequestsByAcademicYear };
		});
	},

	setSchedulesForYear: (academicYear, payload) => {
		if (!academicYear) return;
		set((state) => {
			const value = {
				classSchedules: payload.classSchedules || [],
				testSchedules: payload.testSchedules || [],
			};
			const schedulesByAcademicYear = assignAcademicYearRecord(
				state.schedulesByAcademicYear,
				academicYear,
				value,
			);
			persistDomainSnapshot(
				'schedules',
				getAcademicYearPrimaryKey(academicYear),
				value,
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
					? assignAcademicYearRecord(
						state.usersVersionByAcademicYear,
						academicYear,
						versions.users,
					)
					: state.usersVersionByAcademicYear;
			const calendarVersionByAcademicYear =
				typeof versions.calendar === 'string'
					? assignAcademicYearRecord(
						state.calendarVersionByAcademicYear,
						academicYear,
						versions.calendar,
					)
					: state.calendarVersionByAcademicYear;
			const gradesVersionByAcademicYear =
				typeof versions.grades === 'string'
					? assignAcademicYearRecord(
						state.gradesVersionByAcademicYear,
						academicYear,
						versions.grades,
					)
					: state.gradesVersionByAcademicYear;
			const gradeRequestsVersionByAcademicYear =
				typeof versions.gradeRequests === 'string'
					? assignAcademicYearRecord(
						state.gradeRequestsVersionByAcademicYear,
						academicYear,
						versions.gradeRequests,
					)
					: state.gradeRequestsVersionByAcademicYear;
			const schedulesVersionByAcademicYear =
				typeof versions.schedules === 'string'
					? assignAcademicYearRecord(
						state.schedulesVersionByAcademicYear,
						academicYear,
						versions.schedules,
					)
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
			const usersVersions = expandAcademicYearRecordMap<string>(
				cachedMeta.usersVersionByAcademicYear,
			);
			const calendarVersions = expandAcademicYearRecordMap<string>(
				cachedMeta.calendarVersionByAcademicYear,
			);
			const gradesVersions = expandAcademicYearRecordMap<string>(
				cachedMeta.gradesVersionByAcademicYear,
			);
			const gradeRequestsVersions = expandAcademicYearRecordMap<string>(
				cachedMeta.gradeRequestsVersionByAcademicYear,
			);
			const schedulesVersions = expandAcademicYearRecordMap<string>(
				cachedMeta.schedulesVersionByAcademicYear,
			);
			set((state) => ({
				usersVersionByAcademicYear:
					Object.keys(usersVersions).length > 0
						? usersVersions
						: state.usersVersionByAcademicYear,
				calendarVersionByAcademicYear:
					Object.keys(calendarVersions).length > 0
						? calendarVersions
						: state.calendarVersionByAcademicYear,
				gradesVersionByAcademicYear:
					Object.keys(gradesVersions).length > 0
						? gradesVersions
						: state.gradesVersionByAcademicYear,
				gradeRequestsVersionByAcademicYear:
					Object.keys(gradeRequestsVersions).length > 0
						? gradeRequestsVersions
						: state.gradeRequestsVersionByAcademicYear,
				schedulesVersionByAcademicYear:
					Object.keys(schedulesVersions).length > 0
						? schedulesVersions
						: state.schedulesVersionByAcademicYear,
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
							const value = {
								students: Array.isArray(users?.students) ? users.students : [],
								teachers: Array.isArray(users?.teachers) ? users.teachers : [],
								administrators: Array.isArray(users?.administrators)
									? users.administrators
									: [],
							};
							const nextUsers = assignAcademicYearRecord(
								usersByAcademicYear,
								year,
								value,
							);
							Object.assign(usersByAcademicYear, nextUsers);
						}
						if (snapshot.domain === 'grades') {
							const value = Array.isArray(snapshot.value)
								? (snapshot.value as any[])
								: [];
							const nextGrades = assignAcademicYearRecord(
								gradesByAcademicYear,
								year,
								value,
							);
							Object.assign(gradesByAcademicYear, nextGrades);
						}
						if (snapshot.domain === 'calendar') {
							const value = Array.isArray(snapshot.value)
								? (snapshot.value as any[])
								: [];
							const nextCalendar = assignAcademicYearRecord(
								calendarByAcademicYear,
								year,
								value,
							);
							Object.assign(calendarByAcademicYear, nextCalendar);
						}
						if (snapshot.domain === 'schedules') {
							const payload = (snapshot.value || {}) as SchedulesPayload;
							const value = {
								classSchedules: Array.isArray(payload.classSchedules)
									? payload.classSchedules
									: [],
								testSchedules: Array.isArray(payload.testSchedules)
									? payload.testSchedules
									: [],
							};
							const nextSchedules = assignAcademicYearRecord(
								schedulesByAcademicYear,
								year,
								value,
							);
							Object.assign(schedulesByAcademicYear, nextSchedules);
						}
						if (snapshot.domain === 'gradeRequests') {
							const value = Array.isArray(snapshot.value)
								? (snapshot.value as any[])
								: [];
							const nextGradeRequests = assignAcademicYearRecord(
								gradeRequestsByAcademicYear,
								year,
								value,
							);
							Object.assign(gradeRequestsByAcademicYear, nextGradeRequests);
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
