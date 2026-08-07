import { getTenantModels } from '@/models';
import {
	getRoleGradesQuery,
	getRoleAttendanceQuery,
	getRoleTeacherAttendanceQuery,
	getRoleGradeRequestsQuery,
	getRoleUsersQuery,
	getRoleClassFilter,
} from '@/lib/bootstrap';
import { getAcademicYearFilterValue } from '@/utils/academicYearAccess';
import type { ChangeLogEntry } from '@/lib/syncEngine';

/**
 * Role scoping for the ChangeLog delta feed.
 *
 * `/api/sync/delta` replays raw ChangeLog rows, and those rows carry the full
 * serialized document. Without scoping, any authenticated user could replay
 * every logged document for the whole school — the delta feed would be a hole
 * straight through the role model that every other read path enforces.
 *
 * Rather than reimplement the role predicates in JS (which would drift from
 * lib/bootstrap.ts the first time a scope rule changes), this module authorizes
 * by asking Mongo the *same* question the bootstrap read path asks: it takes
 * the ids embedded in a page of changes and re-queries the source collection
 * with the role query applied. Anything the role query would not return is
 * dropped from the delta. The predicate therefore cannot diverge from the one
 * that governs /api/auth/me and /api/sync/snapshot.
 */

export type ScopeDecision =
	/** Caller may read this domain; `changes` have been filtered in place. */
	| { access: 'scoped'; changes: ChangeLogEntry[] }
	/** Caller has no access to this domain at all — serve an empty delta. */
	| { access: 'none' };

type SourceBinding = {
	/** Tenant model key holding the domain's documents. */
	model: string;
	/** Role query for the domain, or null when the role has no access. */
	query: any;
};

/**
 * Maps a sync domain to the collection its ChangeLog documents live in and the
 * role query that governs reads of it. Mirrors buildBootstrapPayload's fetches.
 */
const resolveBinding = (
	domain: string,
	currentUser: any,
	academicYear: string,
	schoolProfile?: any,
): SourceBinding | null => {
	const academicYearMatch = getAcademicYearFilterValue(academicYear);

	switch (domain) {
		case 'grades':
			return { model: 'Grade', query: getRoleGradesQuery(currentUser, academicYear) };
		case 'attendance':
			return {
				model: 'Attendance',
				query: getRoleAttendanceQuery(currentUser, academicYear),
			};
		case 'teacher_attendance':
			return {
				model: 'TeacherAttendance',
				query: getRoleTeacherAttendanceQuery(currentUser, academicYear),
			};
		case 'gradeRequests':
			return {
				model: 'GradeChangeRequest',
				query: getRoleGradeRequestsQuery(currentUser, academicYear),
			};
		case 'schedules': {
			// fetchSchedules scopes by level/class, not by role query — mirror it.
			const classFilter = getRoleClassFilter(
				currentUser,
				academicYear,
				schoolProfile,
			);
			return {
				model: 'SchoolEvent',
				query: { academicYear: academicYearMatch, ...classFilter },
			};
		}
		case 'users':
			return { model: 'User', query: getRoleUsersQuery(currentUser, academicYear) };
		case 'calendar':
			// fetchCalendarEvents is deliberately unscoped: the academic calendar
			// is school-wide and every role receives it in the bootstrap payload.
			return null;
		default:
			return null;
	}
};

/** Domains served to every role without per-document filtering. */
const UNSCOPED_DOMAINS = new Set(['calendar']);

const extractDocs = (document: unknown): any[] => {
	if (Array.isArray(document)) return document.filter(Boolean);
	if (document && typeof document === 'object') return [document];
	return [];
};

const docId = (doc: any): string | null => {
	const raw = doc?._id ?? doc?.id;
	return raw == null ? null : String(raw);
};

/**
 * Filters a page of ChangeLog entries down to what `currentUser` may read.
 *
 * Non-delete ops are authorized document-by-document: every `_id` embedded in
 * the page is checked against the source collection under the role query in a
 * single round trip, then each entry's `document` is narrowed to the surviving
 * elements (a grade batch logs an array, so a teacher sees only their own rows
 * within it). An entry whose documents are all filtered out is dropped.
 *
 * Delete ops carry only an id stub — there is no document left to authorize
 * against — so they pass through for any role with access to the domain. The
 * tombstone must reach the client for the delete to apply locally, and an
 * opaque id is the whole of its payload.
 *
 * Callers must derive the pagination cursor from the *unfiltered* page, or a
 * page that filters down to nothing would stall the client's cursor forever.
 */
export const scopeChangesForRole = async (params: {
	domain: string;
	academicYear: string;
	currentUser: any;
	schoolProfile?: any;
	changes: ChangeLogEntry[];
}): Promise<ScopeDecision> => {
	const { domain, academicYear, currentUser, schoolProfile, changes } = params;

	if (UNSCOPED_DOMAINS.has(domain)) {
		return { access: 'scoped', changes };
	}

	const binding = resolveBinding(domain, currentUser, academicYear, schoolProfile);
	if (!binding || !binding.query) {
		return { access: 'none' };
	}

	if (changes.length === 0) {
		return { access: 'scoped', changes };
	}

	// Collect every id referenced by a non-delete op in this page.
	const candidateIds = new Set<string>();
	for (const change of changes) {
		if (change.op === 'delete') continue;
		for (const doc of extractDocs(change.document)) {
			const id = docId(doc);
			if (id) candidateIds.add(id);
		}
	}

	let allowedIds = new Set<string>();
	if (candidateIds.size > 0) {
		const models: any = await getTenantModels();
		const model = models[binding.model];
		if (!model) return { access: 'none' };
		const visible = await model
			.find({ ...binding.query, _id: { $in: Array.from(candidateIds) } })
			.select({ _id: 1 })
			.lean();
		allowedIds = new Set(
			(visible as any[]).map((row) => String(row._id)),
		);
	}

	const scoped: ChangeLogEntry[] = [];
	for (const change of changes) {
		if (change.op === 'delete') {
			scoped.push(change);
			continue;
		}

		const docs = extractDocs(change.document);
		if (docs.length === 0) {
			// A bump-only entry carries no document to authorize; it conveys no
			// data, so it is safe to pass through and keeps seqs contiguous.
			scoped.push(change);
			continue;
		}

		const permitted = docs.filter((doc) => {
			const id = docId(doc);
			// A document with no id cannot be authorized — drop it rather than
			// fall open.
			return id !== null && allowedIds.has(id);
		});
		if (permitted.length === 0) continue;

		scoped.push({
			...change,
			document: Array.isArray(change.document) ? permitted : permitted[0],
		});
	}

	return { access: 'scoped', changes: scoped };
};
