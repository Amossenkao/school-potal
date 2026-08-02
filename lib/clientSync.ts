import { useSchoolStore } from '@/store/schoolStore';
import {
	getDomainCursor,
	setDomainCursor,
	type CachedDomain,
} from '@/utils/domainSyncCache';
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
	const params = new URLSearchParams({ domain, academicYear });
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
 * Reconciles a single (domain, academicYear) pair against the server.
 *
 * - cursor == 0  → full role-scoped snapshot, then persist cursor.
 * - cursor != 0  → pull deltas since the stored cursor. If any change
 *   landed, heal with a fresh snapshot (delta entries may carry partial
 *   documents, so a full fetch is authoritative); otherwise just advance
 *   the cursor to the server's currentSeq so later polls stay cheap.
 */
export const reconcileDomain = async (
	domain: ClientSyncDomain,
	academicYear: string,
	options: { onError?: (error: unknown) => void } = {},
): Promise<{ domain: ClientSyncDomain; academicYear: string; action: string }> => {
	const cachedDomain = CACHED_DOMAIN_BY_SYNC[domain];
	const cursor = await getDomainCursor(cachedDomain, academicYear);

	try {
		if (cursor === 0) {
			const snapshot = await fetchVerifiedSnapshot(domain, academicYear);
			if (snapshot.currentSeq > 0) {
				await setDomainCursor(cachedDomain, academicYear, snapshot.currentSeq);
			}
			applySnapshotToStore(domain, academicYear, snapshot.data);
			return { domain, academicYear, action: 'snapshot' };
		}

		let sinceSeq = cursor;
		let sawChanges = false;
		let delta = await fetchDelta(domain, academicYear, sinceSeq);

		while (delta.hasMore) {
			sawChanges = sawChanges || delta.changes.length > 0;
			await setDomainCursor(cachedDomain, academicYear, delta.currentSeq);
			sinceSeq = delta.currentSeq;
			delta = await fetchDelta(domain, academicYear, sinceSeq);
		}

		sawChanges = sawChanges || delta.changes.length > 0;

		if (sawChanges) {
			const snapshot = await fetchVerifiedSnapshot(domain, academicYear);
			applySnapshotToStore(domain, academicYear, snapshot.data);
			await setDomainCursor(cachedDomain, academicYear, snapshot.currentSeq);
			return { domain, academicYear, action: 'resnapshot' };
		}

		await setDomainCursor(cachedDomain, academicYear, delta.currentSeq);
		return { domain, academicYear, action: 'noop' };
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
