import { useSchoolStore, getClientSyncSeq } from '@/store/schoolStore';
import type { CachedDomain } from '@/utils/domainSyncCache';
import { checksum } from '@/lib/syncChecksum';
import { reportSyncMetric } from '@/lib/syncMetrics';

export type ClientSyncDomain =
	| 'grades'
	| 'attendance'
	| 'teacher_attendance'
	| 'calendar'
	| 'schedules'
	| 'gradeRequests';

const CACHED_DOMAIN_BY_SYNC: Record<ClientSyncDomain, CachedDomain> = {
	grades: 'grades',
	attendance: 'attendance',
	teacher_attendance: 'teacherAttendance',
	calendar: 'calendar',
	schedules: 'schedules',
	gradeRequests: 'gradeRequests',
};

// Query param name sent to /api/auth/me for each client-synced domain
// (must match SYNC_DOMAIN_PARAM_KEYS server-side).
export const SYNC_DOMAIN_PARAM_KEYS: Record<ClientSyncDomain, string> = {
	grades: 'since_grades',
	attendance: 'since_attendance',
	teacher_attendance: 'since_teacher_attendance',
	calendar: 'since_calendar',
	schedules: 'since_schedules',
	gradeRequests: 'since_grade_requests',
};

export { CACHED_DOMAIN_BY_SYNC };

// /api/sync/snapshot expects camelCase bootstrap include keys (teacherAttendance),
// while /api/sync/delta and the ChangeLog use snake_case (teacher_attendance).
const SNAPSHOT_DOMAIN_KEY: Record<ClientSyncDomain, string> = {
	grades: 'grades',
	attendance: 'attendance',
	teacher_attendance: 'teacherAttendance',
	calendar: 'calendar',
	schedules: 'schedules',
	gradeRequests: 'gradeRequests',
};

const DELTA_ENDPOINT = '/api/sync/delta';
const SNAPSHOT_ENDPOINT = '/api/sync/snapshot';
const USERS_ENDPOINT = '/api/sync/users';

export const CLIENT_SYNC_DOMAINS: ClientSyncDomain[] = [
	'grades',
	'attendance',
	'teacher_attendance',
	'calendar',
	'schedules',
	'gradeRequests',
];

type DeltaChange = {
	seq: number;
	op: 'create' | 'update' | 'delete' | string;
	documentId: string;
	documentType?: string;
	document?: unknown;
	createdAt: string;
};

type DeltaResponse = {
	success: boolean;
	domain: string;
	academicYear: string;
	sinceSeq: number;
	/**
	 * Seq of the last change in THIS page — the cursor to resume from. Distinct
	 * from `currentSeq`, which is the domain head and may be many pages ahead.
	 */
	nextSeq?: number;
	currentSeq: number;
	hasMore: boolean;
	changes: DeltaChange[];
};

type SnapshotResponse = {
	success: boolean;
	domain: string;
	academicYear: string;
	currentSeq: number;
	checksum?: string | null;
	data: any;
};

type UsersSyncResponse = {
	success: boolean;
	academicYear: string;
	version: number;
	sinceVersion: number;
	hasChanges: boolean;
	affectedUserIds: string[];
};

const getJson = async <T>(url: string): Promise<T> => {
	const response = await fetch(url, { cache: 'no-store' });
	if (!response.ok) {
		throw new Error(`Sync request failed (${response.status}): ${url}`);
	}
	return (await response.json()) as T;
};

export const fetchDelta = async (
	domain: ClientSyncDomain,
	academicYear: string,
	sinceSeq: number,
	limit = 500,
): Promise<DeltaResponse> => {
	const params = new URLSearchParams({
		domain,
		academicYear,
		sinceSeq: String(sinceSeq),
		limit: String(limit),
	});
	return getJson<DeltaResponse>(`${DELTA_ENDPOINT}?${params.toString()}`);
};

export const fetchSnapshot = async (
	domain: ClientSyncDomain,
	academicYear: string,
): Promise<SnapshotResponse> => {
	const params = new URLSearchParams({
		domain: SNAPSHOT_DOMAIN_KEY[domain],
		academicYear,
	});
	return getJson<SnapshotResponse>(`${SNAPSHOT_ENDPOINT}?${params.toString()}`);
};

export const fetchUsersSyncStatus = async (
	academicYear: string,
	sinceVersion: number,
): Promise<UsersSyncResponse> => {
	const params = new URLSearchParams({
		academicYear,
		sinceVersion: String(sinceVersion),
	});
	return getJson<UsersSyncResponse>(`${USERS_ENDPOINT}?${params.toString()}`);
};

const applySnapshotToStore = (
	domain: ClientSyncDomain,
	academicYear: string,
	data: any,
) => {
	if (!data) return;
	const store = useSchoolStore.getState();
	switch (domain) {
		case 'grades':
			store.setGradesForYear(academicYear, Array.isArray(data) ? data : []);
			break;
		case 'attendance':
			store.setAttendanceForYear(
				academicYear,
				Array.isArray(data) ? data : [],
			);
			break;
		case 'teacher_attendance':
			store.setTeacherAttendanceForYear(
				academicYear,
				Array.isArray(data) ? data : [],
			);
			break;
		case 'calendar':
			store.setCalendarForYear(academicYear, Array.isArray(data) ? data : []);
			break;
		case 'schedules':
			store.setSchedulesForYear(academicYear, data);
			break;
		case 'gradeRequests':
			store.setGradeRequestsForYear(
				academicYear,
				Array.isArray(data) ? data : [],
			);
			break;
	}
};

// ── Delta op application ──────────────────────────────────────────────────
//
// The server's ChangeLog stores full document payloads (§ architecture doc), so
// individual create/update/delete changes can be applied directly to the store
// instead of re-downloading the whole domain. Each applier returns `false` when
// a change cannot be applied from its document (e.g. marker/partial documents);
// the caller then heals with an authoritative snapshot for that domain.

const gradeKey = (grade: any) => {
	if (grade?._id) return `_id:${String(grade._id)}`;
	return `${String(grade?.submissionId ?? '')}:${String(grade?.studentId ?? '')}`;
};

const applyGradesChange = (
	store: ReturnType<typeof useSchoolStore.getState>,
	academicYear: string,
	change: DeltaChange,
): boolean => {
	if (change.op === 'delete') return true;
	const docs = Array.isArray(change.document)
		? (change.document as any[])
		: change.document && typeof change.document === 'object'
			? [change.document]
			: [];
	if (docs.length === 0) return true;
	// Partial markers (e.g. { originalGradeId, grade }) cannot be applied.
	const isFullRecord = (doc: any) =>
		doc && (doc._id || (doc.submissionId && doc.studentId));
	if (!docs.every(isFullRecord)) return false;

	const existing = store.gradesByAcademicYear[academicYear] ?? [];
	const keys = new Set(docs.map(gradeKey));
	const next = existing.filter((grade) => !keys.has(gradeKey(grade)));
	next.push(...docs.map((doc) => ({ ...doc })));
	store.setGradesForYear(academicYear, next);
	return true;
};

const attendanceKey = (record: any) =>
	`${String(record?.classId ?? '')}:${String(record?.date ?? '')}`;

const applyAttendanceChange = (
	store: ReturnType<typeof useSchoolStore.getState>,
	academicYear: string,
	change: DeltaChange,
): boolean => {
	const existing = store.attendanceByAcademicYear[academicYear] ?? [];
	if (change.op === 'delete') {
		const doc = change.document as any;
		const classId =
			doc?.classId ?? String(change.documentId ?? '').split(':')[0];
		if (!classId) return false;
		store.setAttendanceForYear(
			academicYear,
			existing.filter((record) => String(record?.classId ?? '') !== String(classId)),
		);
		return true;
	}
	const record = change.document as any;
	if (!record || typeof record !== 'object' || !record.classId || !record.date) {
		return false;
	}
	const key = attendanceKey(record);
	const next = existing.filter((r) => attendanceKey(r) !== key);
	next.push({ ...record });
	store.setAttendanceForYear(academicYear, next);
	return true;
};

const applyTeacherAttendanceChange = (
	store: ReturnType<typeof useSchoolStore.getState>,
	academicYear: string,
	change: DeltaChange,
): boolean => {
	const existing = store.teacherAttendanceByAcademicYear[academicYear] ?? [];
	if (change.op === 'delete') return false;
	const docs = Array.isArray(change.document)
		? (change.document as any[])
		: [];
	const date = docs[0]?.date;
	if (!date) return false;
	const dateStr = String(date);
	const next = existing.filter((record) => String(record?.date ?? '') !== dateStr);
	next.push(...docs.map((doc) => ({ ...doc })));
	store.setTeacherAttendanceForYear(academicYear, next);
	return true;
};

const applyCalendarChange = (
	store: ReturnType<typeof useSchoolStore.getState>,
	academicYear: string,
	change: DeltaChange,
): boolean => {
	const existing = store.calendarByAcademicYear[academicYear] ?? [];
	if (change.op === 'delete') {
		const id = change.documentId || (change.document as any)?.id;
		if (!id) return false;
		store.setCalendarForYear(
			academicYear,
			existing.filter((event) => event?._id != null && String(event._id) !== String(id)),
		);
		return true;
	}
	const doc = change.document as any;
	if (!doc || typeof doc !== 'object' || !doc._id) return false;
	const next = existing.filter(
		(event) => event?._id != null && String(event._id) !== String(doc._id),
	);
	next.push({ ...doc });
	store.setCalendarForYear(academicYear, next);
	return true;
};

const applySchedulesChange = (
	store: ReturnType<typeof useSchoolStore.getState>,
	academicYear: string,
	change: DeltaChange,
): boolean => {
	const current = store.schedulesByAcademicYear[academicYear] ?? {};
	const classSchedules = Array.isArray(current.classSchedules)
		? current.classSchedules
		: [];
	const testSchedules = Array.isArray(current.testSchedules)
		? current.testSchedules
		: [];

	if (change.op === 'delete') {
		const id = change.documentId || (change.document as any)?.id;
		if (!id) return false;
		store.setSchedulesForYear(academicYear, {
			classSchedules: classSchedules.filter(
				(event) => event?._id != null && String(event._id) !== String(id),
			),
			testSchedules: testSchedules.filter(
				(event) => event?._id != null && String(event._id) !== String(id),
			),
		});
		return true;
	}

	const doc = change.document as any;
	if (!doc || typeof doc !== 'object' || !doc._id) return false;
	const isTest = doc.eventType === 'test_schedule';
	const bucket = isTest ? testSchedules : classSchedules;
	const nextBucket = bucket.filter(
		(event) => event?._id != null && String(event._id) !== String(doc._id),
	);
	nextBucket.push({ ...doc });
	if (isTest) {
		store.setSchedulesForYear(academicYear, {
			classSchedules,
			testSchedules: nextBucket,
		});
	} else {
		store.setSchedulesForYear(academicYear, {
			classSchedules: nextBucket,
			testSchedules,
		});
	}
	return true;
};

const applyGradeRequestsChange = (
	store: ReturnType<typeof useSchoolStore.getState>,
	academicYear: string,
	change: DeltaChange,
): boolean => {
	const requestIdOf = (request: any) => String(request?._id ?? '');
	const existing = store.gradeRequestsByAcademicYear[academicYear] ?? [];

	if (change.op === 'delete') {
		const ids = Array.isArray((change.document as any)?.requestIds)
			? ((change.document as any).requestIds as any[])
			: change.documentId
				? [change.documentId]
				: (change.document as any)?.requestId
					? [String((change.document as any).requestId)]
					: [];
		const remove = new Set(ids.map((id) => String(id ?? '')));
		if (remove.size === 0) return false;
		store.setGradeRequestsForYear(
			academicYear,
			existing.filter((request) => !remove.has(requestIdOf(request))),
		);
		return true;
	}

	const docs = Array.isArray(change.document)
		? (change.document as any[])
		: change.document && typeof change.document === 'object'
			? [change.document]
			: [];
	if (docs.length === 0) return true;
	// Marker documents like { requestIds } cannot be applied per-record.
	if (!docs.every((doc) => doc?._id)) return false;

	const keys = new Set(docs.map(requestIdOf));
	const next = existing.filter((request) => !keys.has(requestIdOf(request)));
	next.push(...docs.map((doc) => ({ ...doc })));
	store.setGradeRequestsForYear(academicYear, next);
	return true;
};

const applyChangeToStore = (
	domain: ClientSyncDomain,
	academicYear: string,
	change: DeltaChange,
): boolean => {
	const store = useSchoolStore.getState();
	switch (domain) {
		case 'grades':
			return applyGradesChange(store, academicYear, change);
		case 'attendance':
			return applyAttendanceChange(store, academicYear, change);
		case 'teacher_attendance':
			return applyTeacherAttendanceChange(store, academicYear, change);
		case 'calendar':
			return applyCalendarChange(store, academicYear, change);
		case 'schedules':
			return applySchedulesChange(store, academicYear, change);
		case 'gradeRequests':
			return applyGradeRequestsChange(store, academicYear, change);
	}
	return false;
};

const MAX_SNAPSHOT_ATTEMPTS = 2;

/**
 * Fetches a snapshot and verifies its content checksum. On mismatch the pull
 * is retried once (self-healing §6.5); a persistent mismatch throws so the
 * caller keeps its old cursor and retries on the next reconcile cycle.
 */
const fetchVerifiedSnapshot = async (
	domain: ClientSyncDomain,
	academicYear: string,
): Promise<SnapshotResponse> => {
	for (let attempt = 0; attempt < MAX_SNAPSHOT_ATTEMPTS; attempt++) {
		const snapshot = await fetchSnapshot(domain, academicYear);
		if (snapshot.checksum != null && snapshot.data != null) {
			if (checksum(snapshot.data) !== snapshot.checksum) {
				console.warn(
					`[clientSync] checksum mismatch ${domain}:${academicYear} (attempt ${attempt + 1}); re-pulling`,
				);
				reportSyncMetric({
					event: 'checksum-mismatch',
					domain,
					academicYear,
					seq: snapshot.currentSeq,
					metrics: { attempt: attempt + 1 },
				});
				continue;
			}
		}
		return snapshot;
	}
	throw new Error(
		`Snapshot checksum verification failed for ${domain}:${academicYear}`,
	);
};

/**
 * How far a delta page advanced the cursor.
 *
 * Prefers the server's `nextSeq` (last seq in the page). Falls back to the
 * highest seq actually returned, then to the request's own `sinceSeq`, so an
 * older server that omits `nextSeq` still paginates correctly instead of
 * skipping to the head.
 */
const resolvePageEnd = (delta: DeltaResponse, sinceSeq: number): number => {
	if (typeof delta.nextSeq === 'number' && delta.nextSeq > 0) {
		return delta.nextSeq;
	}
	let highest = sinceSeq;
	for (const change of delta.changes) {
		if (typeof change.seq === 'number' && change.seq > highest) {
			highest = change.seq;
		}
	}
	return highest;
};

const setCursor = (
	cachedDomain: CachedDomain,
	academicYear: string,
	seq: number,
) => {
	if (seq > 0) {
		useSchoolStore
			.getState()
			.setSyncSeqForYear(academicYear, { [cachedDomain]: seq });
	}
};

/**
 * Reconciles a single (domain, academicYear) pair against the server.
 *
 * - cursor == 0 → full role-scoped snapshot, then persist cursor.
 * - cursor != 0 → pull deltas since the stored cursor and apply each change
 *   op to the store. If a change cannot be applied from its document (marker
 *   or partial payload), heal with an authoritative snapshot. The cursor is
 *   advanced to the server's currentSeq either way, so later pulls stay cheap.
 */
export const reconcileDomain = async (
	domain: ClientSyncDomain,
	academicYear: string,
	options: { onError?: (error: unknown) => void } = {},
): Promise<{ domain: ClientSyncDomain; academicYear: string; action: string }> => {
	const cachedDomain = CACHED_DOMAIN_BY_SYNC[domain];
	const cursor = getClientSyncSeq(cachedDomain, academicYear);

	try {
		if (cursor === 0) {
			const snapshot = await fetchVerifiedSnapshot(domain, academicYear);
			setCursor(cachedDomain, academicYear, snapshot.currentSeq);
			applySnapshotToStore(domain, academicYear, snapshot.data);
			return { domain, academicYear, action: 'snapshot' };
		}

		let sinceSeq = cursor;
		let delta = await fetchDelta(domain, academicYear, sinceSeq);
		let appliedCount = 0;

		while (true) {
			let needsResnapshot = false;
			for (const change of delta.changes) {
				if (applyChangeToStore(domain, academicYear, change)) {
					appliedCount += 1;
				} else {
					needsResnapshot = true;
					break;
				}
			}

			// Advance only as far as this page actually reached. Using the
			// domain head (`currentSeq`) here would jump the cursor past every
			// page still queued behind `hasMore`, silently dropping them.
			const pageEnd = resolvePageEnd(delta, sinceSeq);
			setCursor(cachedDomain, academicYear, pageEnd);

			if (needsResnapshot) {
				const snapshot = await fetchVerifiedSnapshot(domain, academicYear);
				applySnapshotToStore(domain, academicYear, snapshot.data);
				setCursor(cachedDomain, academicYear, snapshot.currentSeq);
				return { domain, academicYear, action: 'resnapshot' };
			}

			if (!delta.hasMore) {
				// The last page is caught up with the head by definition; settle
				// the cursor there so filtered-out trailing changes (role scoping
				// can empty a page) don't leave the client permanently behind.
				setCursor(cachedDomain, academicYear, delta.currentSeq);
				break;
			}
			if (pageEnd <= sinceSeq) {
				// No forward progress despite `hasMore` — bail rather than spin.
				console.warn(
					`[clientSync] delta stalled for ${domain}:${academicYear} at seq ${sinceSeq}`,
				);
				break;
			}
			sinceSeq = pageEnd;
			delta = await fetchDelta(domain, academicYear, sinceSeq);
		}

		return {
			domain,
			academicYear,
			action: appliedCount > 0 ? 'applied' : 'noop',
		};
	} catch (error) {
		reportSyncMetric({
			event: 'error',
			domain,
			academicYear,
			metrics: {
				message: error instanceof Error ? error.message : String(error),
			},
		});
		options.onError?.(error);
		return { domain, academicYear, action: 'error' };
	}
};

/**
 * Reconciles every sync domain for a given academic year, in parallel.
 */
export const reconcileYear = async (
	academicYear: string,
	options: {
		onError?: (error: unknown) => void;
	} = {},
): Promise<Array<{ domain: ClientSyncDomain; academicYear: string; action: string }>> => {
	if (!academicYear) return [];
	const results = await Promise.all(
		CLIENT_SYNC_DOMAINS.map((domain) =>
			reconcileDomain(domain, academicYear, options),
		),
	);
	return results;
};

/**
 * Next-gen sync entry point, driven from /api/auth/me (or login) refreshes.
 *
 * `serverCursors` is the server's current ChangeLog seq per domain (the
 * `syncCursors` field returned by /api/auth/me). For each client-synced domain:
 *
 * - no local cursor and serverSeq == 0 → nothing has ever been logged; the
 *   bootstrap payload already seeded the store, so skip.
 * - no local cursor and serverSeq > 0 → snapshot baseline + persist cursor.
 * - local cursor >= serverSeq → already caught up; skip (no network).
 * - local cursor < serverSeq → pull and apply deltas.
 *
 * Skipping caught-up domains means a refresh with no changes issues zero sync
 * requests beyond the single /api/auth/me call.
 */
export const syncFromCursors = async (
	academicYear: string,
	serverCursors: Record<string, number>,
	options: {
		onError?: (error: unknown) => void;
	} = {},
): Promise<Array<{ domain: ClientSyncDomain; academicYear: string; action: string }>> => {
	if (!academicYear) return [];
	const results = await Promise.all(
		CLIENT_SYNC_DOMAINS.map(async (domain) => {
			const cachedDomain = CACHED_DOMAIN_BY_SYNC[domain];
			const cursor = getClientSyncSeq(cachedDomain, academicYear);
			const serverSeq =
				typeof serverCursors[domain] === 'number'
					? serverCursors[domain]
					: 0;
			if (cursor === 0 && serverSeq === 0) {
				return { domain, academicYear, action: 'skip-empty' };
			}
			if (cursor > 0 && serverSeq <= cursor) {
				return { domain, academicYear, action: 'caught-up' };
			}
			return reconcileDomain(domain, academicYear, options);
		}),
	);
	return results;
};
