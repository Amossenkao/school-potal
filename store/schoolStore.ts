import { create } from 'zustand';
import type SchoolProfile from '@/types/schoolProfile';

import type { GradesCursor } from '@/lib/bootstrap';
import {
	clearDomainSnapshots,
	getAllDomainSnapshots,
	setDomainSnapshot,
} from '@/utils/domainSyncCache';
import { useNetworkStore } from './networkStore';
import type { RealtimeEvent } from '@/lib/realtimeTypes';

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
	applyRealtimeEvent: (event: RealtimeEvent) => void;
	clearCache: () => void;
	hydrateCache: () => void;
	runBackgroundGradeSync: (
		academicYear: string,
		options?: {
			gradesCursor?: string | null;
			mode?: 'background-parallel' | 'refresh-sequential';
		},
	) => Promise<{
		status: 'success' | 'busy' | 'error' | 'no-op';
		fetchedCount: number;
	}>;
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

const persistMeta = (
	state: Pick<
		SchoolStore,
		| 'usersVersionByAcademicYear'
		| 'calendarVersionByAcademicYear'
		| 'gradesVersionByAcademicYear'
		| 'gradeRequestsVersionByAcademicYear'
		| 'schedulesVersionByAcademicYear'
		| 'schoolVersion'
	>,
) => {
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
		new Set(
			[raw, normalized, slash].filter((value): value is string =>
				Boolean(value),
			),
		),
	);
};

const getAcademicYearPrimaryKey = (academicYear: string) => {
	const variants = buildAcademicYearKeyVariants(academicYear);
	return (
		variants.find((value) => value.includes('-')) || variants[0] || academicYear
	);
};

const resolveAcademicYearRecord = <T>(
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

const assignAcademicYearRecord = <T>(
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

const expandAcademicYearRecordMap = <T>(map?: Record<string, T> | null) => {
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
		.map((part) =>
			String(part || '')
				.trim()
				.toLowerCase(),
		)
		.join('|');
	if (naturalKey.replaceAll('|', '')) return naturalKey;
	const id = grade?._id || grade?.id;
	return id ? `id:${String(id)}` : '';
};

const getUserIdentity = (user: any) =>
	String(user?.id || user?._id || '').trim();

const getUserYears = (user: any, fallbackAcademicYear?: string) => {
	const years = new Set<string>();
	const addYear = (year?: unknown) => {
		const value = String(year || '').trim();
		if (value) years.add(value);
	};

	if (Array.isArray(user?.academicYears)) {
		user.academicYears.forEach((entry: any) => addYear(entry?.year));
	}

	if (Array.isArray(user?.subjects)) {
		user.subjects.forEach((entry: any) => addYear(entry?.year));
	}

	addYear(fallbackAcademicYear);

	return Array.from(years);
};

const removeUsersFromRoster = (roster: UsersPayload, userIds: string[]) => {
	const ids = new Set(
		userIds.map((value) => String(value || '').trim()).filter(Boolean),
	);
	if (ids.size === 0) return roster;
	const filterUsers = (users?: any[]) =>
		Array.isArray(users)
			? users.filter((user) => !ids.has(getUserIdentity(user)))
			: [];
	return {
		students: filterUsers(roster.students),
		teachers: filterUsers(roster.teachers),
		administrators: filterUsers(roster.administrators),
	};
};

const upsertUserInRoster = (roster: UsersPayload, user: any) => {
	const userId = getUserIdentity(user);
	if (!userId) return roster;
	const nextRoster = removeUsersFromRoster(roster, [userId]);
	if (user?.isActive === false) return nextRoster;
	const role = String(user?.role || '').trim();
	const bucket =
		role === 'teacher'
			? 'teachers'
			: role === 'administrator'
				? 'administrators'
				: 'students';
	return {
		...nextRoster,
		[bucket]: [...(nextRoster[bucket] || []), user],
	};
};

const gradeSyncInProgress = new Set<string>();


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

	runBackgroundGradeSync: async (academicYear, options = {}) => {
		if (!academicYear) return { status: 'no-op', fetchedCount: 0 };
		if (gradeSyncInProgress.has(academicYear)) {
			console.log(`[Sync] Blocked: Sync already running for ${academicYear}`);
			return { status: 'busy', fetchedCount: 0 };
		}

		const networkStore = useNetworkStore.getState();
		if (!networkStore.isOnline) return { status: 'error', fetchedCount: 0 };

		const mode = options.mode || 'background-parallel';
		const CURSOR_KEY = `sync_cursor_grades_${academicYear}`;
		const rawCursor =
			options.gradesCursor ?? localStorage.getItem(CURSOR_KEY) ?? null;

		gradeSyncInProgress.add(academicYear);
		let totalFetched = 0;

		try {
			if (mode === 'background-parallel') {
				if (!rawCursor) return { status: 'no-op', fetchedCount: 0 };

				let parsedCursor: GradesCursor | null = null;
				try {
					parsedCursor = JSON.parse(rawCursor);
				} catch {
					localStorage.removeItem(CURSOR_KEY);
					return { status: 'error', fetchedCount: 0 };
				}

				const { totalCount, fetchedCount, chunkSize = 30_000 } = parsedCursor;
				const remaining = totalCount - fetchedCount;

				if (remaining > 0) {
					const chunkCount = Math.ceil(remaining / chunkSize);
					console.log(`[Sync] Parallel background fetch: ${chunkCount} chunks`);

					const fetchPromises = Array.from({ length: chunkCount }, (_, i) => {
						const skip = fetchedCount + i * chunkSize;
						const params = new URLSearchParams({
							academicYear,
							limit: String(chunkSize),
							skip: String(skip),
						});
						return fetch(`/api/sync/grades?${params.toString()}`).then(
							async (res) => {
								if (!res.ok) throw new Error(`Server error: ${res.status}`);
								const result = await res.json();
								const chunk = Array.isArray(result.data) ? result.data : [];

								if (chunk.length > 0) {
									get().mergeGradesForYear(academicYear, chunk);
									totalFetched += chunk.length;
								}
								return chunk;
							},
						);
					});

					await Promise.allSettled(fetchPromises);
				}
			} else if (mode === 'refresh-sequential') {
				console.log(`[Sync] Sequential refresh for ${academicYear}`);
				let currentCursor = rawCursor;
				let hasMore = true;
				const REFRESH_CHUNK_LIMIT = 10_000;

				while (hasMore) {
					if (!networkStore.isOnline) {
						localStorage.setItem(CURSOR_KEY, currentCursor || '');
						break;
					}

					const params = new URLSearchParams({
						academicYear,
						limit: String(REFRESH_CHUNK_LIMIT),
					});
					if (currentCursor) params.append('cursor', currentCursor);

					const res = await fetch(`/api/sync/grades?${params.toString()}`);
					if (!res.ok) {
						console.error(`[Sync] Server error: ${res.status}`);
						break;
					}

					const result = await res.json();
					const chunk = Array.isArray(result.data) ? result.data : [];

					if (chunk.length > 0) {
						get().mergeGradesForYear(academicYear, chunk);
						totalFetched += chunk.length;
					}

					if (result.nextCursor) {
						currentCursor = result.nextCursor;
						localStorage.setItem(CURSOR_KEY, currentCursor);
					} else {
						hasMore = false;
					}
				}
			}

			// ── Update cursor pointing past the latest grade ─
			const finalGrades =
				resolveAcademicYearRecord(get().gradesByAcademicYear, academicYear) ||
				[];

			if (finalGrades.length > 0) {
				let latest = finalGrades[0];
				for (const grade of finalGrades) {
					const t = new Date(grade.lastUpdated || 0).getTime();
					const lt = new Date(latest.lastUpdated || 0).getTime();
					if (t > lt || (t === lt && String(grade._id) > String(latest._id))) {
						latest = grade;
					}
				}
				const resumeCursor: GradesCursor = {
					lastUpdated: latest.lastUpdated ?? null,
					_id: latest._id.toString(),
					totalCount: finalGrades.length,
					fetchedCount: finalGrades.length,
					chunkSize: 30_000,
				};
				localStorage.setItem(CURSOR_KEY, JSON.stringify(resumeCursor));
			}

			persistDomainSnapshot(
				'grades',
				getAcademicYearPrimaryKey(academicYear),
				finalGrades,
			);
			persistMeta(get());

			return { status: 'success', fetchedCount: totalFetched };
		} catch (error) {
			console.error('[Sync] Error during background sync:', error);
			return { status: 'error', fetchedCount: totalFetched };
		} finally {
			gradeSyncInProgress.delete(academicYear);
		}
	},

	fetchSchool: async () => {
		if (!get().school) {
			try {
				const storedSchool = localStorage.getItem('school-profile');
				if (storedSchool) {
					set({ school: JSON.parse(storedSchool) });
				}
			} catch (error) {
				console.error(
					'Failed to load school profile from local storage:',
					error,
				);
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
						console.warn(
							'Failed to restore cached school profile:',
							cacheError,
						);
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

			persistDomainSnapshot(
				'users',
				getAcademicYearPrimaryKey(academicYear),
				updated,
			);
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
			persistDomainSnapshot(
				'calendar',
				getAcademicYearPrimaryKey(academicYear),
				value,
			);
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
			persistDomainSnapshot(
				'grades',
				getAcademicYearPrimaryKey(academicYear),
				value,
			);
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
			persistDomainSnapshot(
				'grades',
				getAcademicYearPrimaryKey(academicYear),
				value,
			);
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

	applyRealtimeEvent: (event) => {
		const payload = (event?.payload || {}) as Record<string, unknown>;
		const academicYear = String(
			payload.academicYear || payload.year || payload.schoolYear || '',
		).trim();
		const version = event.timestamp || new Date().toISOString();
		const schoolPayload =
			payload.school && typeof payload.school === 'object'
				? (payload.school as SchoolProfile)
				: null;
		const payloadUser =
			payload.user && typeof payload.user === 'object'
				? (payload.user as any)
				: null;
		const payloadUsers =
			payload.users && typeof payload.users === 'object'
				? (payload.users as UsersPayload)
				: null;
		const affectedUserIds = new Set<string>(
			Array.isArray(payload.targetUserIds)
				? payload.targetUserIds
						.map((value) => String(value || '').trim())
						.filter(Boolean)
				: [],
		);
		const payloadUserId = String(payload.userId || '').trim();
		if (payloadUserId) affectedUserIds.add(payloadUserId);

		if (schoolPayload) {
			get().setSchool(schoolPayload);
		}

		const shouldTouchUsers = [
			'USER_CREATED',
			'USER_UPDATED',
			'USER_DISABLED',
			'STUDENT_ADDED',
			'STUDENT_REMOVED',
			'CLASS_UPDATED',
		].includes(event.type);
		const shouldTouchCalendar = [
			'EVENT_CREATED',
			'EVENT_UPDATED',
			'EVENT_DELETED',
			'ANNOUNCEMENT_CREATED',
		].includes(event.type);
		const shouldTouchGrades = [
			'GRADE_CREATED',
			'GRADE_UPDATED',
			'GRADE_CHANGE_REQUESTED',
		].includes(event.type);
		const shouldTouchSchedules = ['CLASS_UPDATED'].includes(event.type);
		const shouldTouchGradeRequests = event.type === 'GRADE_CHANGE_REQUESTED';

		set((state) => {
			if (academicYear) {
				const nextVersions = {
					users: shouldTouchUsers ? version : undefined,
					calendar: shouldTouchCalendar ? version : undefined,
					grades: shouldTouchGrades ? version : undefined,
					gradeRequests: shouldTouchGradeRequests ? version : undefined,
					schedules: shouldTouchSchedules ? version : undefined,
				};
				const touched = Object.values(nextVersions).some(
					(value) => typeof value === 'string',
				);
				if (touched) {
					const usersVersionByAcademicYear =
						typeof nextVersions.users === 'string'
							? assignAcademicYearRecord(
									state.usersVersionByAcademicYear,
									academicYear,
									nextVersions.users,
								)
							: state.usersVersionByAcademicYear;
					const calendarVersionByAcademicYear =
						typeof nextVersions.calendar === 'string'
							? assignAcademicYearRecord(
									state.calendarVersionByAcademicYear,
									academicYear,
									nextVersions.calendar,
								)
							: state.calendarVersionByAcademicYear;
					const gradesVersionByAcademicYear =
						typeof nextVersions.grades === 'string'
							? assignAcademicYearRecord(
									state.gradesVersionByAcademicYear,
									academicYear,
									nextVersions.grades,
								)
							: state.gradesVersionByAcademicYear;
					const gradeRequestsVersionByAcademicYear =
						typeof nextVersions.gradeRequests === 'string'
							? assignAcademicYearRecord(
									state.gradeRequestsVersionByAcademicYear,
									academicYear,
									nextVersions.gradeRequests,
								)
							: state.gradeRequestsVersionByAcademicYear;
					const schedulesVersionByAcademicYear =
						typeof nextVersions.schedules === 'string'
							? assignAcademicYearRecord(
									state.schedulesVersionByAcademicYear,
									academicYear,
									nextVersions.schedules,
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
				}
			}
			return {};
		});

		if (payloadUser && shouldTouchUsers) {
			const yearsToTouch = getUserYears(payloadUser, academicYear);
			const removeFromAllYears =
				event.type === 'USER_DISABLED' || event.type === 'STUDENT_REMOVED';
			const userIds = Array.from(affectedUserIds);

			set((state) => {
				let usersByAcademicYear = state.usersByAcademicYear;
				let touched = false;

				const updateRosterForYear = (year: string) => {
					const existing = resolveAcademicYearRecord(
						usersByAcademicYear,
						year,
					) || {
						students: [],
						teachers: [],
						administrators: [],
					};
					const nextRoster = removeFromAllYears
						? removeUsersFromRoster(existing, userIds)
						: upsertUserInRoster(existing, payloadUser);
					usersByAcademicYear = assignAcademicYearRecord(
						usersByAcademicYear,
						year,
						nextRoster,
					);
					touched = true;
				};

				const targetYears =
					yearsToTouch.length > 0
						? yearsToTouch
						: academicYear
							? [academicYear]
							: [];

				if (removeFromAllYears && userIds.length > 0) {
					Object.keys(usersByAcademicYear).forEach((year) => {
						updateRosterForYear(year);
					});
				} else {
					targetYears.forEach((year) => updateRosterForYear(year));
				}

				if (!touched) return {};
				return { usersByAcademicYear };
			});
		}

		if (
			academicYear &&
			payload.users &&
			Array.isArray((payload.users as any)?.students)
		) {
			set((state) => {
				const usersByAcademicYear = assignAcademicYearRecord(
					state.usersByAcademicYear,
					academicYear,
					{
						students: Array.isArray((payload.users as any).students)
							? (payload.users as any).students
							: [],
						teachers: Array.isArray((payload.users as any).teachers)
							? (payload.users as any).teachers
							: [],
						administrators: Array.isArray((payload.users as any).administrators)
							? (payload.users as any).administrators
							: [],
					},
				);
				return { usersByAcademicYear };
			});
		}

		if (academicYear && Array.isArray(payload.grades)) {
			get().setGradesForYear(academicYear, payload.grades as any[]);
		}
		if (academicYear && Array.isArray(payload.calendarEvents)) {
			get().setCalendarForYear(academicYear, payload.calendarEvents as any[]);
		}
		if (
			academicYear &&
			payload.schedules &&
			typeof payload.schedules === 'object'
		) {
			get().setSchedulesForYear(academicYear, payload.schedules as any);
		}
		if (academicYear && Array.isArray(payload.gradeRequests)) {
			get().setGradeRequestsForYear(
				academicYear,
				payload.gradeRequests as any[],
			);
		}
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
