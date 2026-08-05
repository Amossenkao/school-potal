import { create } from 'zustand';
import { isEqual } from 'lodash';
import type SchoolProfile from '@/types/schoolProfile';

import type { GradesCursor } from '@/lib/bootstrap';
import {
	clearDomainSnapshots,
	clearSyncCursors,
	getAllDomainSnapshots,
	getAllSyncCursors,
	setDomainCursor,
	setDomainSnapshot,
} from '@/utils/domainSyncCache';
import type { CachedDomain } from '@/utils/domainSyncCache';
import {
	getTeacherClassSubjectPairsForAcademicYear,
} from '@/utils/academicYearAccess';
import { useNetworkStore } from './networkStore';
import { resolveTenantSyncKey, type RealtimeEvent } from '@/lib/realtimeTypes';

// Set by AuthProvider when the current user's role is resolved.
// Used in applyRealtimeEvent to prevent superadmins from having
// their school store overwritten by cross-school events.
let _currentUserRole: string | null = null;
export const setCurrentUserRole = (role: string | null) => { _currentUserRole = role; };

const flattenSchoolPayload = (school: any): any => {
	if (!school || typeof school !== 'object') return school;
	const flat: any = { ...school };
	if (school.system) {
		flat.host = school.system.host;
		flat.dbName = school.system.dbName;
		flat.isActive = school.system.isActive;
	}
	if (school.identity) {
		flat.name = school.identity.name;
		flat.shortName = school.identity.shortName;
		flat.initials = school.identity.initials;
		flat.slogan = school.identity.slogan;
		flat.studentIdPrefix = school.identity.studentIdPrefix;
		flat.yearFounded = school.identity.yearFounded;
		flat.firstAcademicYear = school.identity.firstAcademicYear;
		flat.currentAcademicYear = school.identity.currentAcademicYear;
	}
	if (school.branding) {
		flat.logoUrl = school.branding.logoUrl;
		flat.logoUrl2 = school.branding.logoUrl2;
		flat.themeName = school.branding.themeName;
	}
	if (school.contact) {
		flat.address = (school.contact.addresses || []).flatMap((a: any) => a.lines || []);
		flat.phones = school.contact.phones || [];
		flat.emails = school.contact.emails || [];
		flat.website = school.contact.website;
	}
	return flat;
};

type UsersPayload = {
	students?: any[];
	teachers?: any[];
	administrators?: any[];
	parents?: any[];
};

type UsersRoster = {
	students: any[];
	teachers: any[];
	administrators: any[];
	parents: any[];
};

type SchedulesPayload = { classSchedules?: any[]; testSchedules?: any[] };

type SchoolStore = {
	school: SchoolProfile | null;
	schoolVersion: string | null;
	usersByAcademicYear: Record<string, UsersRoster>;
	hasPendingGradeSync: (academicYear: string) => boolean;
	usersVersionByAcademicYear: Record<string, string>;
	calendarByAcademicYear: Record<string, any[]>;
	gradesByAcademicYear: Record<string, any[]>;
	gradeRequestsByAcademicYear: Record<string, any[]>;
	attendanceByAcademicYear: Record<string, any[]>;
	teacherAttendanceByAcademicYear: Record<string, any[]>;
	paymentsByAcademicYear: Record<string, any[]>;
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
	attendanceVersionByAcademicYear: Record<string, string>;
	teacherAttendanceVersionByAcademicYear: Record<string, string>;
	paymentsVersionByAcademicYear: Record<string, string>;
	schedulesVersionByAcademicYear: Record<string, string>;
	syncSeqByAcademicYear: Record<
		string,
		Partial<Record<CachedDomain, number>>
	>;

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
	setAttendanceForYear: (academicYear: string, records: any[]) => void;
	mergeAttendanceForYear: (academicYear: string, records: any[]) => void;
	setTeacherAttendanceForYear: (academicYear: string, records: any[]) => void;
	mergeTeacherAttendanceForYear: (academicYear: string, records: any[]) => void;
	setPaymentsForYear: (academicYear: string, payments: any[]) => void;
	/** Drops a single payment from the cache after it is deleted server-side. */
	removePaymentForYear: (academicYear: string, paymentId: string) => void;
	setDomainVersionsForYear: (
		academicYear: string,
		versions: {
			users?: string;
			calendar?: string;
			grades?: string;
			gradeRequests?: string;
			schedules?: string;
			attendance?: string;
			teacherAttendance?: string;
			payments?: string;
		},
	) => void;
	setSyncSeqForYear: (
		academicYear: string,
		cursors: Partial<Record<CachedDomain, number>> | Record<string, number>,
	) => void;
	applyRealtimeEvent: (event: RealtimeEvent) => void;
	pruneGradesForUser: (user: any) => void;
	clearCache: () => void;
	clearYearCache: (academicYear: string) => void;
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
	attendanceVersionByAcademicYear: Record<string, string>;
	teacherAttendanceVersionByAcademicYear: Record<string, string>;
	paymentsVersionByAcademicYear: Record<string, string>;
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

// --- add near the cursor-related helpers ---
// Next-gen sync: client ChangeLog seq cursor for a (domain, year), read from
// the in-memory store (seeded from IndexedDB at hydrate). Returns 0 when the
// client has no cursor yet (no baseline) or the engine is off.
export const getClientSyncSeq = (
	domain: CachedDomain,
	academicYear: string,
): number => {
	if (!academicYear) return 0;
	const map = useSchoolStore.getState().syncSeqByAcademicYear;
	const record = resolveAcademicYearRecord<
		Partial<Record<CachedDomain, number>>
	>(map, academicYear);
	const value = record?.[domain];
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

export const readGradesSyncCursor = (academicYear: string): GradesCursor | null => {
	if (typeof window === 'undefined' || !academicYear) return null;
	try {
		const raw = localStorage.getItem(`sync_cursor_grades_${academicYear}`);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as GradesCursor;
		return parsed && typeof parsed.totalCount === 'number' ? parsed : null;
	} catch {
		return null;
	}
};

export const gradesSyncHasRemaining = (academicYear: string): boolean => {
	const cursor = readGradesSyncCursor(academicYear);
	if (!cursor) return false;
	return cursor.totalCount - cursor.fetchedCount > 0;
};

const persistMeta = (
	state: Pick<
		SchoolStore,
		| 'usersVersionByAcademicYear'
		| 'calendarVersionByAcademicYear'
		| 'gradesVersionByAcademicYear'
		| 'gradeRequestsVersionByAcademicYear'
		| 'attendanceVersionByAcademicYear'
		| 'teacherAttendanceVersionByAcademicYear'
		| 'paymentsVersionByAcademicYear'
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
		attendanceVersionByAcademicYear: state.attendanceVersionByAcademicYear,
		teacherAttendanceVersionByAcademicYear:
			state.teacherAttendanceVersionByAcademicYear,
		paymentsVersionByAcademicYear: state.paymentsVersionByAcademicYear,
		schedulesVersionByAcademicYear: state.schedulesVersionByAcademicYear,
		schoolVersion: state.schoolVersion,
	});
};

const persistDomainSnapshot = (
	domain:
		| 'users'
		| 'grades'
		| 'calendar'
		| 'schedules'
		| 'gradeRequests'
		| 'attendance'
		| 'teacherAttendance'
		| 'payments',
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

const getAttendanceIdentity = (record: any) => {
	const naturalKey = [record?.academicYear, record?.classId, record?.date]
		.map((part) =>
			String(part || '')
				.trim()
				.toLowerCase(),
		)
		.join('|');
	if (naturalKey.replaceAll('|', '')) return naturalKey;
	const id = record?._id || record?.id;
	return id ? `id:${String(id)}` : '';
};

const getTeacherAttendanceIdentity = (record: any) => {
	const naturalKey = [
		record?.academicYear,
		record?.teacherId,
		record?.date,
	]
		.map((part) =>
			String(part || '')
				.trim()
				.toLowerCase(),
		)
		.join('|');
	if (naturalKey.replaceAll('|', '')) return naturalKey;
	const id = record?._id || record?.id;
	return id ? `id:${String(id)}` : '';
};

const getUserIdentity = (user: any) =>
	String(user?.id || user?._id || '').trim();

const getPaymentIdentity = (payment: any) =>
	String(payment?.id || payment?._id || '').trim();

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

const removeUsersFromRoster = (
	roster: UsersPayload,
	userIds: string[],
): UsersRoster => {
	const ids = new Set(
		userIds.map((value) => String(value || '').trim()).filter(Boolean),
	);
	if (ids.size === 0) return roster as UsersRoster;
	const filterUsers = (users?: any[]) =>
		Array.isArray(users)
			? users.filter((user) => !ids.has(getUserIdentity(user)))
			: [];
	return {
		students: filterUsers(roster.students),
		teachers: filterUsers(roster.teachers),
		administrators: filterUsers(roster.administrators),
		parents: filterUsers(roster.parents),
	};
};

const upsertUserInRoster = (
	roster: UsersPayload,
	user: any,
): UsersRoster => {
	const userId = getUserIdentity(user);
	if (!userId) return roster as UsersRoster;
	const nextRoster = removeUsersFromRoster(roster, [userId]);
	const role = String(user?.role || '').trim();
	const bucket =
		role === 'teacher'
			? 'teachers'
			: role === 'administrator'
				? 'administrators'
				: role === 'parent'
					? 'parents'
					: 'students';
	return {
		...nextRoster,
		[bucket]: [...(nextRoster[bucket] || []), user],
	};
};

const gradeSyncInProgress = new Set<string>();

const readSchoolProfileCache = (): SchoolProfile | null => {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem('school-profile');
		return raw ? (JSON.parse(raw) as SchoolProfile) : null;
	} catch (error) {
		console.warn('Failed to read cached school profile:', error);
		return null;
	}
};


export const useSchoolStore = create<SchoolStore>((set, get) => ({
	school: readSchoolProfileCache(),
	schoolVersion: null,
	usersByAcademicYear: {},
	usersVersionByAcademicYear: {},
	calendarByAcademicYear: {},
	gradesByAcademicYear: {},
	gradeRequestsByAcademicYear: {},
	attendanceByAcademicYear: {},
	teacherAttendanceByAcademicYear: {},
	paymentsByAcademicYear: {},
	schedulesByAcademicYear: {},
	calendarVersionByAcademicYear: {},
	gradesVersionByAcademicYear: {},
	gradeRequestsVersionByAcademicYear: {},
	attendanceVersionByAcademicYear: {},
	teacherAttendanceVersionByAcademicYear: {},
	paymentsVersionByAcademicYear: {},
	schedulesVersionByAcademicYear: {},
	syncSeqByAcademicYear: {},

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

				const { totalCount, fetchedCount, chunkSize = 10_000 } = parsedCursor;
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
					chunkSize: 10_000,
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
		// school is already hydrated synchronously at store creation (or via
		// a prior fetch), so if it's present there's nothing to do.
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
						return await fetch(`/api/school`, { signal: controller.signal });
					} finally {
						window.clearTimeout(timeoutId);
					}
				})();
				if (!response.ok)
					throw new Error(`Failed to fetch: ${response.statusText}`);
				const schoolProfile: SchoolProfile = await response.json();
				set({ school: schoolProfile });
				localStorage.setItem('school-profile', JSON.stringify(schoolProfile));
			} catch (error) {
				console.error('Failed to fetch school profile:', error);
				// Cache was already checked at store init — nothing further to fall back to.
			} finally {
				fetchPromise = null;
			}
		})();

		await fetchPromise;
	},

	setSchool: (school) => {
		if (isEqual(get().school, school)) {
			return;
		}
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

	hasPendingGradeSync: (academicYear) => gradesSyncHasRemaining(academicYear),

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
				parents: [],
			};
			const nextStudents = payload.students || [];
			const nextTeachers = payload.teachers || [];
			const nextAdmins = payload.administrators || [];
			const nextParents = payload.parents || [];

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
				parents: mergeById(existing.parents, nextParents),
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
			const gradesVersionByAcademicYear = assignAcademicYearRecord(
				state.gradesVersionByAcademicYear,
				academicYear,
				String(Date.now()),
			);
			persistDomainSnapshot(
				'grades',
				getAcademicYearPrimaryKey(academicYear),
				value,
			);
			persistMeta(state);
			return { gradesByAcademicYear, gradesVersionByAcademicYear };
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
			const gradesVersionByAcademicYear = assignAcademicYearRecord(
				state.gradesVersionByAcademicYear,
				academicYear,
				String(Date.now()),
			);
			persistDomainSnapshot(
				'grades',
				getAcademicYearPrimaryKey(academicYear),
				value,
			);
			persistMeta(state);
			return { gradesByAcademicYear, gradesVersionByAcademicYear };
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

	setAttendanceForYear: (academicYear, records) => {
		if (!academicYear) return;
		set((state) => {
			const value = Array.isArray(records) ? records : [];
			const attendanceByAcademicYear = assignAcademicYearRecord(
				state.attendanceByAcademicYear,
				academicYear,
				value,
			);
			persistDomainSnapshot(
				'attendance',
				getAcademicYearPrimaryKey(academicYear),
				value,
			);
			persistMeta(state);
			return { attendanceByAcademicYear };
		});
	},

	mergeAttendanceForYear: (academicYear, records) => {
		if (!academicYear || !Array.isArray(records) || records.length === 0)
			return;
		set((state) => {
			const existing =
				resolveAcademicYearRecord(
					state.attendanceByAcademicYear,
					academicYear,
				) || [];
			const merged = new Map<string, any>();
			existing.forEach((record) => {
				const key = getAttendanceIdentity(record);
				if (key) merged.set(key, record);
			});
			records.forEach((record) => {
				const key = getAttendanceIdentity(record);
				if (key) merged.set(key, record);
			});
			const value = Array.from(merged.values());
			const attendanceByAcademicYear = assignAcademicYearRecord(
				state.attendanceByAcademicYear,
				academicYear,
				value,
			);
			persistDomainSnapshot(
				'attendance',
				getAcademicYearPrimaryKey(academicYear),
				value,
			);
			persistMeta(state);
			return { attendanceByAcademicYear };
		});
	},

	setTeacherAttendanceForYear: (academicYear, records) => {
		if (!academicYear) return;
		set((state) => {
			const value = Array.isArray(records) ? records : [];
			const teacherAttendanceByAcademicYear = assignAcademicYearRecord(
				state.teacherAttendanceByAcademicYear,
				academicYear,
				value,
			);
			persistDomainSnapshot(
				'teacherAttendance',
				getAcademicYearPrimaryKey(academicYear),
				value,
			);
			persistMeta(state);
			return { teacherAttendanceByAcademicYear };
		});
	},

	mergeTeacherAttendanceForYear: (academicYear, records) => {
		if (!academicYear || !Array.isArray(records) || records.length === 0)
			return;
		set((state) => {
			const existing =
				resolveAcademicYearRecord(
					state.teacherAttendanceByAcademicYear,
					academicYear,
				) || [];
			const merged = new Map<string, any>();
			existing.forEach((record) => {
				const key = getTeacherAttendanceIdentity(record);
				if (key) merged.set(key, record);
			});
			records.forEach((record) => {
				const key = getTeacherAttendanceIdentity(record);
				if (key) merged.set(key, record);
			});
			const value = Array.from(merged.values());
			const teacherAttendanceByAcademicYear = assignAcademicYearRecord(
				state.teacherAttendanceByAcademicYear,
				academicYear,
				value,
			);
			persistDomainSnapshot(
				'teacherAttendance',
				getAcademicYearPrimaryKey(academicYear),
				value,
			);
			persistMeta(state);
			return { teacherAttendanceByAcademicYear };
		});
	},

	setPaymentsForYear: (academicYear, payments) => {
		if (!academicYear) return;
		set((state) => {
			const existing =
				resolveAcademicYearRecord(state.paymentsByAcademicYear, academicYear) ||
				[];
			const merged = new Map<string, any>();
			existing.forEach((payment) => {
				const key = getPaymentIdentity(payment);
				if (key) merged.set(key, payment);
			});
			(Array.isArray(payments) ? payments : []).forEach((payment) => {
				const key = getPaymentIdentity(payment);
				if (key) merged.set(key, payment);
			});
			const value = Array.from(merged.values());
			const paymentsByAcademicYear = assignAcademicYearRecord(
				state.paymentsByAcademicYear,
				academicYear,
				value,
			);
			persistDomainSnapshot(
				'payments',
				getAcademicYearPrimaryKey(academicYear),
				value,
			);
			persistMeta(state);
			return { paymentsByAcademicYear };
		});
	},

	removePaymentForYear: (academicYear, paymentId) => {
		if (!academicYear || !paymentId) return;
		set((state) => {
			const existing =
				resolveAcademicYearRecord(state.paymentsByAcademicYear, academicYear) ||
				[];
			const value = existing.filter(
				(payment: any) => getPaymentIdentity(payment) !== String(paymentId),
			);
			if (value.length === existing.length) return {};
			const paymentsByAcademicYear = assignAcademicYearRecord(
				state.paymentsByAcademicYear,
				academicYear,
				value,
			);
			persistDomainSnapshot(
				'payments',
				getAcademicYearPrimaryKey(academicYear),
				value,
			);
			persistMeta(state);
			return { paymentsByAcademicYear };
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
			const attendanceVersionByAcademicYear =
				typeof versions.attendance === 'string'
					? assignAcademicYearRecord(
							state.attendanceVersionByAcademicYear,
							academicYear,
							versions.attendance,
						)
					: state.attendanceVersionByAcademicYear;
			const teacherAttendanceVersionByAcademicYear =
				typeof versions.teacherAttendance === 'string'
					? assignAcademicYearRecord(
							state.teacherAttendanceVersionByAcademicYear,
							academicYear,
							versions.teacherAttendance,
						)
					: state.teacherAttendanceVersionByAcademicYear;
			const paymentsVersionByAcademicYear =
				typeof versions.payments === 'string'
					? assignAcademicYearRecord(
							state.paymentsVersionByAcademicYear,
							academicYear,
							versions.payments,
						)
					: state.paymentsVersionByAcademicYear;
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
				attendanceVersionByAcademicYear,
				teacherAttendanceVersionByAcademicYear,
				paymentsVersionByAcademicYear,
				schedulesVersionByAcademicYear,
			};
			persistMeta(next);
			return {
				usersVersionByAcademicYear,
				calendarVersionByAcademicYear,
				gradesVersionByAcademicYear,
				gradeRequestsVersionByAcademicYear,
				attendanceVersionByAcademicYear,
				teacherAttendanceVersionByAcademicYear,
				paymentsVersionByAcademicYear,
				schedulesVersionByAcademicYear,
			};
		});
	},

	setSyncSeqForYear: (academicYear, cursors) => {
		if (!academicYear || !cursors) return;
		const primaryKey = getAcademicYearPrimaryKey(academicYear);
		set((state) => {
			const current = resolveAcademicYearRecord<
				Partial<Record<CachedDomain, number>>
			>(state.syncSeqByAcademicYear, academicYear) || {};
			const merged: Partial<Record<CachedDomain, number>> = { ...current };
			let changed = false;
			Object.entries(cursors).forEach(([domain, seq]) => {
				const value = Number(seq) || 0;
				const typedDomain = domain as CachedDomain;
				if (value > (merged[typedDomain] ?? 0)) {
					merged[typedDomain] = value;
					changed = true;
				}
			});
			if (!changed) return {};
			const syncSeqByAcademicYear = assignAcademicYearRecord(
				state.syncSeqByAcademicYear,
				primaryKey,
				merged,
			);
			Object.entries(merged).forEach(([domain, seq]) => {
				if (typeof seq === 'number' && seq > 0) {
					void setDomainCursor(
						domain as CachedDomain,
						primaryKey,
						seq,
					).catch((error) => {
						console.warn(
							`Failed to persist sync cursor for ${domain}/${primaryKey}:`,
							error,
						);
					});
				}
			});
			return { syncSeqByAcademicYear };
		});
	},

	applyRealtimeEvent: (event) => {
		console.log('[schoolStore] applyRealtimeEvent received:', event.type, {
			payload: event.payload,
			timestamp: event.timestamp,
		});

		const payload = (event?.payload || {}) as Record<string, unknown>;
		const academicYear = String(
			payload.academicYear || payload.year || payload.schoolYear || '',
		).trim();
		const version =
			typeof event.seq === 'number'
				? String(event.seq)
				: event.timestamp || new Date().toISOString();
		const schoolPayload =
			payload.school && typeof payload.school === 'object'
				? (payload.school as SchoolProfile)
				: null;
		const payloadUser =
			payload.user && typeof payload.user === 'object'
				? (payload.user as any)
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

		console.log(
			'[schoolStore] academicYear from payload:',
			academicYear || '(none)',
		);
		console.log(
			'[schoolStore] payloadUser present:',
			Boolean(payloadUser),
			payloadUser,
		);

		if (schoolPayload) {
			// Superadmins manage schools — they don't "have" a school.
			// Overwriting the school store with another school's data would
			// cause RootProviders to render <Inactive /> if that school is
			// deactivated. Skip setSchool() entirely for superadmins.
			if (_currentUserRole === 'superadmin') {
				// Still notify listeners so dashboard components can refetch
				// their school-specific data (stats, admins, etc.)
			} else {
				// SCHOOL_UPDATED/SCHOOL_DELETED events also publish on the
				// shared platform:events channel (every client subscribes to
				// it for cross-tenant observability broadcasts), not just
				// this tenant's own school:{tenantId} channel. Reject
				// anything that isn't for THIS session's school — otherwise
				// another school's profile update (name, logo, slogan, ...)
				// overwrites and persists over this one's.
				const sessionTenantId = resolveTenantSyncKey({
					schoolProfile: get().school,
				});
				const eventTenantId = String(event.tenantId || '').trim();
				const isForAnotherTenant = Boolean(
					sessionTenantId &&
						eventTenantId &&
						eventTenantId !== sessionTenantId,
				);
				if (!isForAnotherTenant) {
					get().setSchool(flattenSchoolPayload(schoolPayload));
				}
			}
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
		// Class transitions (a student moving classes, or a teacher/isTeacher
		// administrator gaining or losing a class assignment) move access to
		// grades/attendance/grade-requests between classes — bump those
		// versions so old-class peers lose access and new-class peers gain
		// access immediately. Triggers on either side of the transition: a
		// class can be added with nothing removed (first-time assignment) or
		// removed with nothing added (unassignment).
		const hasClassTransition =
			shouldTouchUsers &&
			((Array.isArray((payload as any).oldClassIds) &&
				(payload as any).oldClassIds.length > 0) ||
				(Array.isArray((payload as any).newClassIds) &&
					(payload as any).newClassIds.length > 0));
		const shouldTouchGrades = [
			'GRADE_CREATED',
			'GRADE_UPDATED',
			'GRADE_CHANGE_REQUESTED',
		].includes(event.type) || hasClassTransition;
		const shouldTouchSchedules = ['CLASS_UPDATED'].includes(event.type);
		const shouldTouchGradeRequests =
			event.type === 'GRADE_CHANGE_REQUESTED' || hasClassTransition;
		const shouldTouchAttendance = [
			'ATTENDANCE_CREATED',
			'ATTENDANCE_UPDATED',
		].includes(event.type) || hasClassTransition;
		const shouldTouchTeacherAttendance = [
			'TEACHER_ATTENDANCE_SAVED',
		].includes(event.type);

		console.log('[schoolStore] shouldTouchUsers:', shouldTouchUsers, {
			shouldTouchCalendar,
			shouldTouchGrades,
			shouldTouchSchedules,
			shouldTouchGradeRequests,
			shouldTouchAttendance,
			shouldTouchTeacherAttendance,
		});

		const fallbackYears =
			shouldTouchUsers && !academicYear
				? Object.keys(get().usersByAcademicYear)
				: [];

		set((state) => {
			if (academicYear) {
				const nextVersions = {
					users: shouldTouchUsers ? version : undefined,
					calendar: shouldTouchCalendar ? version : undefined,
					grades: shouldTouchGrades ? version : undefined,
					gradeRequests: shouldTouchGradeRequests ? version : undefined,
					schedules: shouldTouchSchedules ? version : undefined,
					attendance: shouldTouchAttendance ? version : undefined,
					teacherAttendance: shouldTouchTeacherAttendance ? version : undefined,
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
					const attendanceVersionByAcademicYear =
						typeof nextVersions.attendance === 'string'
							? assignAcademicYearRecord(
									state.attendanceVersionByAcademicYear,
									academicYear,
									nextVersions.attendance,
								)
							: state.attendanceVersionByAcademicYear;
					const teacherAttendanceVersionByAcademicYear =
						typeof nextVersions.teacherAttendance === 'string'
							? assignAcademicYearRecord(
									state.teacherAttendanceVersionByAcademicYear,
									academicYear,
									nextVersions.teacherAttendance,
								)
							: state.teacherAttendanceVersionByAcademicYear;
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
						attendanceVersionByAcademicYear,
						teacherAttendanceVersionByAcademicYear,
						schedulesVersionByAcademicYear,
					};
					persistMeta(next);
					return {
						usersVersionByAcademicYear,
						calendarVersionByAcademicYear,
						gradesVersionByAcademicYear,
						gradeRequestsVersionByAcademicYear,
						attendanceVersionByAcademicYear,
						teacherAttendanceVersionByAcademicYear,
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

			const targetYears =
				yearsToTouch.length > 0
					? yearsToTouch
					: fallbackYears.length > 0
						? fallbackYears
						: academicYear
							? [academicYear]
							: [];

			console.log('[schoolStore] roster upsert — targetYears:', targetYears, {
				yearsToTouch,
				fallbackYears,
				academicYear,
				removeFromAllYears,
				userIds,
				payloadUser,
			});

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
						parents: [],
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

				if (removeFromAllYears && userIds.length > 0) {
					Object.keys(usersByAcademicYear).forEach((year) => {
						updateRosterForYear(year);
					});
				} else {
					targetYears.forEach((year) => updateRosterForYear(year));
				}

				if (!touched) {
					console.warn(
						'[schoolStore] roster upsert — no years were touched, state unchanged',
					);
					return {};
				}

				console.log(
					'[schoolStore] roster upsert — state updated for years:',
					targetYears,
				);
				return { usersByAcademicYear };
			});
		} else if (shouldTouchUsers) {
			console.warn(
				'[schoolStore] shouldTouchUsers is true but payloadUser is null — roster will NOT be updated',
			);
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
						parents: Array.isArray((payload.users as any).parents)
							? (payload.users as any).parents
							: [],
					},
				);
				return { usersByAcademicYear };
			});
		}

		if (academicYear && Array.isArray(payload.grades)) {
			get().mergeGradesForYear(academicYear, payload.grades as any[]);
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
		if (academicYear && Array.isArray(payload.attendance)) {
			get().mergeAttendanceForYear(academicYear, payload.attendance as any[]);
		}
		if (academicYear && Array.isArray(payload.teacherAttendance)) {
			get().mergeTeacherAttendanceForYear(
				academicYear,
				payload.teacherAttendance as any[],
			);
		}

		// Next-gen sync: advance the ChangeLog cursor for a domain ONLY when the
		// event actually carried that domain's data and it was applied above.
		// The realtime seq is the primary domain's ChangeLog seq; events that
		// merely bump version stamps (no payload data) must NOT advance the
		// cursor, otherwise the delta reconcile would skip changes the store
		// never received. The delta pull then applies them on the next refresh.
		const eventSeq =
			typeof event.seq === 'number' && Number.isFinite(event.seq)
				? event.seq
				: null;
		if (academicYear && eventSeq !== null) {
			const appliedDomains: CachedDomain[] = [];
			if (Array.isArray(payload.grades)) appliedDomains.push('grades');
			if (Array.isArray(payload.attendance)) appliedDomains.push('attendance');
			if (Array.isArray(payload.teacherAttendance))
				appliedDomains.push('teacherAttendance');
			if (Array.isArray(payload.calendarEvents)) appliedDomains.push('calendar');
			if (payload.schedules && typeof payload.schedules === 'object')
				appliedDomains.push('schedules');
			if (Array.isArray(payload.gradeRequests))
				appliedDomains.push('gradeRequests');
			if (appliedDomains.length > 0) {
				const cursorPatch: Partial<Record<CachedDomain, number>> = {};
				appliedDomains.forEach((domain) => {
					cursorPatch[domain] = eventSeq;
				});
				get().setSyncSeqForYear(academicYear, cursorPatch);
			}
		}
	},

	pruneGradesForUser: (user: any) => {
		if (!user || typeof user !== 'object') return;
		const role = String(user.role || '').trim();
		// isTeacher administrators store their assignment in `classes` (same
		// shape as a teacher's `subjects`) — see utils/gradeActor.ts.
		const isTeacherLikeAdmin = role === 'administrator' && !!user.isTeacher;
		if (role !== 'teacher' && role !== 'student' && !isTeacherLikeAdmin) return;

		set((state) => {
			let touched = false;
			const nextGradesByAcademicYear = { ...state.gradesByAcademicYear };

			Object.keys(nextGradesByAcademicYear).forEach((academicYear) => {
				const currentGrades = nextGradesByAcademicYear[academicYear];
				if (!Array.isArray(currentGrades) || currentGrades.length === 0) return;

				if (role === 'teacher' || isTeacherLikeAdmin) {
					const teacherLikeUser = isTeacherLikeAdmin
						? { ...user, subjects: user.classes || [] }
						: user;
					const pairs = getTeacherClassSubjectPairsForAcademicYear(
						teacherLikeUser,
						academicYear,
					);
					if (pairs.length === 0) {
						nextGradesByAcademicYear[academicYear] = [];
						persistDomainSnapshot(
							'grades',
							getAcademicYearPrimaryKey(academicYear),
							[],
						);
						touched = true;
						return;
					}

					const allowedClassMap = new Map<string, Set<string>>();
					pairs.forEach((p) => {
						allowedClassMap.set(p.classId, new Set(p.subjects));
					});

					const filtered = currentGrades.filter((g) => {
						const classId = String(g?.classId || g?.gradeLevel || '').trim();
						const subject = String(g?.subject || '').trim();
						const allowedSubjects = allowedClassMap.get(classId);
						return allowedSubjects && allowedSubjects.has(subject);
					});

					if (filtered.length !== currentGrades.length) {
						nextGradesByAcademicYear[academicYear] = filtered;
						persistDomainSnapshot(
							'grades',
							getAcademicYearPrimaryKey(academicYear),
							filtered,
						);
						touched = true;
					}
				} else if (role === 'student') {
					const studentId = String(
						user.studentId || user.username || user.id || '',
					).trim();
					if (!studentId) return;

					const filtered = currentGrades.filter((g) => {
						const gStudentId = String(g?.studentId || '').trim();
						return gStudentId === studentId;
					});

					if (filtered.length !== currentGrades.length) {
						nextGradesByAcademicYear[academicYear] = filtered;
						persistDomainSnapshot(
							'grades',
							getAcademicYearPrimaryKey(academicYear),
							filtered,
						);
						touched = true;
					}
				}
			});

			if (!touched) return {};

			const gradesVersionByAcademicYear = {
				...state.gradesVersionByAcademicYear,
			};
			Object.keys(nextGradesByAcademicYear).forEach((year) => {
				gradesVersionByAcademicYear[year] = String(Date.now());
			});
			return {
				gradesByAcademicYear: nextGradesByAcademicYear,
				gradesVersionByAcademicYear,
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
			attendanceByAcademicYear: {},
			teacherAttendanceByAcademicYear: {},
			paymentsByAcademicYear: {},
			schedulesByAcademicYear: {},
			calendarVersionByAcademicYear: {},
			gradesVersionByAcademicYear: {},
			gradeRequestsVersionByAcademicYear: {},
			attendanceVersionByAcademicYear: {},
			teacherAttendanceVersionByAcademicYear: {},
			paymentsVersionByAcademicYear: {},
			schedulesVersionByAcademicYear: {},
			schoolVersion: null,
			syncSeqByAcademicYear: {},
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
		void clearSyncCursors().catch((error) => {
			console.warn('Failed to clear IndexedDB sync cursors:', error);
		});
	},

	clearYearCache: (academicYear) => {
		if (!academicYear) return;
		const dropYear = <T,>(record: Record<string, T>) => {
			const next = { ...record };
			delete next[academicYear];
			return next;
		};
		set((state) => ({
			usersByAcademicYear: dropYear(state.usersByAcademicYear),
			calendarByAcademicYear: dropYear(state.calendarByAcademicYear),
			gradesByAcademicYear: dropYear(state.gradesByAcademicYear),
			gradeRequestsByAcademicYear: dropYear(
				state.gradeRequestsByAcademicYear,
			),
			attendanceByAcademicYear: dropYear(state.attendanceByAcademicYear),
			teacherAttendanceByAcademicYear: dropYear(
				state.teacherAttendanceByAcademicYear,
			),
			paymentsByAcademicYear: dropYear(state.paymentsByAcademicYear),
			schedulesByAcademicYear: dropYear(state.schedulesByAcademicYear),
			usersVersionByAcademicYear: dropYear(state.usersVersionByAcademicYear),
			calendarVersionByAcademicYear: dropYear(
				state.calendarVersionByAcademicYear,
			),
			gradesVersionByAcademicYear: dropYear(
				state.gradesVersionByAcademicYear,
			),
			gradeRequestsVersionByAcademicYear: dropYear(
				state.gradeRequestsVersionByAcademicYear,
			),
			attendanceVersionByAcademicYear: dropYear(
				state.attendanceVersionByAcademicYear,
			),
			teacherAttendanceVersionByAcademicYear: dropYear(
				state.teacherAttendanceVersionByAcademicYear,
			),
			paymentsVersionByAcademicYear: dropYear(
				state.paymentsVersionByAcademicYear,
			),
			schedulesVersionByAcademicYear: dropYear(
				state.schedulesVersionByAcademicYear,
			),
			syncSeqByAcademicYear: dropYear(state.syncSeqByAcademicYear),
		}));
		void clearDomainSnapshots(academicYear).catch((error) => {
			console.warn(
				`Failed to clear IndexedDB domain snapshots for ${academicYear}:`,
				error,
			);
		});
		void clearSyncCursors(academicYear).catch((error) => {
			console.warn(
				`Failed to clear IndexedDB sync cursors for ${academicYear}:`,
				error,
			);
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
			const attendanceVersions = expandAcademicYearRecordMap<string>(
				cachedMeta.attendanceVersionByAcademicYear,
			);
			const teacherAttendanceVersions = expandAcademicYearRecordMap<string>(
				cachedMeta.teacherAttendanceVersionByAcademicYear,
			);
			const paymentsVersions = expandAcademicYearRecordMap<string>(
				cachedMeta.paymentsVersionByAcademicYear,
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
				attendanceVersionByAcademicYear:
					Object.keys(attendanceVersions).length > 0
						? attendanceVersions
						: state.attendanceVersionByAcademicYear,
				teacherAttendanceVersionByAcademicYear:
					Object.keys(teacherAttendanceVersions).length > 0
						? teacherAttendanceVersions
						: state.teacherAttendanceVersionByAcademicYear,
				paymentsVersionByAcademicYear:
					Object.keys(paymentsVersions).length > 0
						? paymentsVersions
						: state.paymentsVersionByAcademicYear,
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
					const attendanceByAcademicYear = {
						...state.attendanceByAcademicYear,
					};
					const teacherAttendanceByAcademicYear = {
						...state.teacherAttendanceByAcademicYear,
					};
					const paymentsByAcademicYear = {
						...state.paymentsByAcademicYear,
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
								parents: Array.isArray(users?.parents) ? users.parents : [],
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
						if (snapshot.domain === 'attendance') {
							const value = Array.isArray(snapshot.value)
								? (snapshot.value as any[])
								: [];
							const nextAttendance = assignAcademicYearRecord(
								attendanceByAcademicYear,
								year,
								value,
							);
							Object.assign(attendanceByAcademicYear, nextAttendance);
						}
						if (snapshot.domain === 'teacherAttendance') {
							const value = Array.isArray(snapshot.value)
								? (snapshot.value as any[])
								: [];
							const nextTeacherAttendance = assignAcademicYearRecord(
								teacherAttendanceByAcademicYear,
								year,
								value,
							);
							Object.assign(
								teacherAttendanceByAcademicYear,
								nextTeacherAttendance,
							);
						}
						if (snapshot.domain === 'payments') {
							const value = Array.isArray(snapshot.value)
								? (snapshot.value as any[])
								: [];
							const nextPayments = assignAcademicYearRecord(
								paymentsByAcademicYear,
								year,
								value,
							);
							Object.assign(paymentsByAcademicYear, nextPayments);
						}
					});

					return {
						usersByAcademicYear,
						gradesByAcademicYear,
						gradeRequestsByAcademicYear,
						attendanceByAcademicYear,
						teacherAttendanceByAcademicYear,
						paymentsByAcademicYear,
						calendarByAcademicYear,
						schedulesByAcademicYear,
					};
				});
			} catch (error) {
				console.warn('Failed to hydrate IndexedDB domain snapshots:', error);
			}
		})();

		void (async () => {
			try {
				const cursors = await getAllSyncCursors();
				if (!Array.isArray(cursors) || cursors.length === 0) return;
				const syncSeqByAcademicYear: Record<
					string,
					Partial<Record<CachedDomain, number>>
				> = {};
				cursors.forEach((cursor) => {
					const year = String(cursor.academicYear || '').trim();
					if (!year || typeof cursor.seq !== 'number' || cursor.seq <= 0) return;
					const primaryYear = getAcademicYearPrimaryKey(year);
					const existing = syncSeqByAcademicYear[primaryYear] || {};
					existing[cursor.domain] = Math.max(
						existing[cursor.domain] ?? 0,
						cursor.seq,
					);
					syncSeqByAcademicYear[primaryYear] = existing;
				});
				if (Object.keys(syncSeqByAcademicYear).length === 0) return;
				set((state) => ({
					syncSeqByAcademicYear: {
						...state.syncSeqByAcademicYear,
						...syncSeqByAcademicYear,
					},
				}));
			} catch (error) {
				console.warn('Failed to hydrate IndexedDB sync cursors:', error);
			}
		})();
	},
}));
