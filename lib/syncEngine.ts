import { getTenantModels } from '@/models';
import type { ChangeOp } from '@/models/sync/ChangeLog';

export type SyncDomainName =
	| 'grades'
	| 'attendance'
	| 'teacher_attendance'
	| 'calendar'
	| 'schedules'
	| 'gradeRequests';

export const LOG_BACKED_DOMAINS: SyncDomainName[] = [
	'grades',
	'attendance',
	'teacher_attendance',
	'calendar',
	'schedules',
	'gradeRequests',
];

export const isLogBackedDomain = (domain: string): domain is SyncDomainName =>
	(LOG_BACKED_DOMAINS as string[]).includes(domain);

const SYNC_CURSOR_DOMAINS = [
	'users',
	'grades',
	'attendance',
	'teacher_attendance',
	'calendar',
	'schedules',
	'gradeRequests',
];

/**
 * Server-side current ChangeLog seq per (domain, academicYear), for the
 * client to negotiate catch-up. Domains without any logged change are omitted
 * (a missing key is equivalent to seq 0).
 */
export const getSyncCursorsForYear = async (
	academicYear: string,
): Promise<Record<string, number>> => {
	const results = await Promise.allSettled(
		SYNC_CURSOR_DOMAINS.map(async (domain) => ({
			domain,
			seq: await getDomainSeq(domain, academicYear),
		})),
	);
	const cursors: Record<string, number> = {};
	results.forEach((result) => {
		if (result.status === 'fulfilled' && result.value.seq > 0) {
			cursors[result.value.domain] = result.value.seq;
		}
	});
	return cursors;
};

export const getDomainSeq = async (
	domain: string,
	academicYear: string,
): Promise<number> => {
	if (!academicYear) return 0;
	try {
		const models = await getTenantModels();
		const entry = await models.SyncSequence.findOne({ domain, academicYear })
			.select({ seq: 1 })
			.lean();
		return entry?.seq ?? 0;
	} catch (error) {
		console.warn(`getDomainSeq failed for ${domain}:${academicYear}`, error);
		return 0;
	}
};

export const nextSeq = async (
	domain: string,
	academicYear: string,
): Promise<number> => {
	const models = await getTenantModels();
	const entry = await models.SyncSequence.findOneAndUpdate(
		{ domain, academicYear },
		{ $inc: { seq: 1 } },
		{ upsert: true, new: true },
	).lean();
	return entry?.seq ?? 0;
};

/** How many times to retry a seq collision before giving up. */
const APPEND_MAX_ATTEMPTS = 5;

/**
 * Appends a change to the log, returning the seq assigned to it.
 *
 * Two invariants this function must not break:
 *
 * 1. **A returned seq always corresponds to a persisted row.** Clients treat
 *    the seq as a cursor, so handing one back for a change that was never
 *    logged makes them skip it forever — and the resulting hole means their
 *    `sinceSeq` can never reach the domain head, so /api/auth/me re-sends the
 *    whole domain on every poll from then on. Write failures therefore throw
 *    rather than being swallowed; the caller decides whether the mutation is
 *    still worth reporting as a success.
 * 2. **A failed write must not burn a seq.** The counter is bumped only after
 *    the row is safely in place. A collision (another writer took the seq
 *    first) is retried against a freshly allocated one.
 *
 * There are no Mongo transactions here — the deployment may be a standalone —
 * so the ordering is: reserve, insert, and on conflict retry. The unique index
 * on (domain, academicYear, seq) is what makes concurrent writers safe.
 */
export const appendChange = async (params: {
	domain: string;
	academicYear: string;
	op: ChangeOp;
	documentId: string;
	documentType?: string;
	document?: unknown;
	actorId?: string | null;
	idempotencyKey?: string;
}): Promise<number> => {
	const models = await getTenantModels();
	let lastError: any = null;

	for (let attempt = 0; attempt < APPEND_MAX_ATTEMPTS; attempt++) {
		const seq = await nextSeq(params.domain, params.academicYear);
		try {
			await models.ChangeLog.create({
				domain: params.domain,
				academicYear: params.academicYear,
				seq,
				op: params.op,
				documentId: params.documentId,
				documentType: params.documentType,
				document: params.document ?? null,
				actorId: params.actorId ?? null,
				idempotencyKey: params.idempotencyKey ?? null,
			});
			return seq;
		} catch (error: any) {
			lastError = error;
			if (error?.code !== 11000) throw error;

			// Duplicate key. Either this exact change is already logged (an
			// idempotent replay racing itself), in which case reuse its seq, or
			// another writer claimed this seq first, in which case retry.
			if (params.idempotencyKey) {
				const existing = await findChangeByIdempotencyKey({
					domain: params.domain,
					academicYear: params.academicYear,
					idempotencyKey: params.idempotencyKey,
				});
				if (existing) return existing.seq;
			}
		}
	}

	throw new Error(
		`appendChange exhausted ${APPEND_MAX_ATTEMPTS} attempts for ` +
			`${params.domain}:${params.academicYear}: ${lastError?.message ?? lastError}`,
	);
};

export type AppendChangeResult = {
	seq: number;
	replayed: boolean;
	document?: unknown;
};

export const findChangeByIdempotencyKey = async (params: {
	domain: string;
	academicYear: string;
	idempotencyKey: string;
}): Promise<{ seq: number; document?: unknown } | null> => {
	const models = await getTenantModels();
	const existing = await models.ChangeLog.findOne({
		domain: params.domain,
		academicYear: params.academicYear,
		idempotencyKey: params.idempotencyKey,
	})
		.select({ seq: 1, document: 1 })
		.lean();
	if (!existing) return null;
	return { seq: existing.seq, document: existing.document };
};

export const appendChangeIdempotent = async (params: {
	domain: string;
	academicYear: string;
	op: ChangeOp;
	documentId: string;
	documentType?: string;
	document?: unknown;
	actorId?: string | null;
	idempotencyKey?: string;
}): Promise<AppendChangeResult> => {
	if (params.idempotencyKey) {
		const existing = await findChangeByIdempotencyKey({
			domain: params.domain,
			academicYear: params.academicYear,
			idempotencyKey: params.idempotencyKey,
		});
		if (existing) {
			return { seq: existing.seq, replayed: true, document: existing.document };
		}
	}

	try {
		const seq = await appendChange(params);
		return { seq, replayed: false };
	} catch (error: any) {
		if (params.idempotencyKey && error?.code === 11000) {
			const existing = await findChangeByIdempotencyKey({
				domain: params.domain,
				academicYear: params.academicYear,
				idempotencyKey: params.idempotencyKey,
			});
			if (existing) {
				return {
					seq: existing.seq,
					replayed: true,
					document: existing.document,
				};
			}
		}
		throw error;
	}
};

export type ChangeLogEntry = {
	seq: number;
	op: ChangeOp;
	documentId: string;
	documentType?: string;
	document?: unknown;
	actorId?: string;
	createdAt: string;
};

export const listChanges = async (params: {
	domain: string;
	academicYear: string;
	sinceSeq: number;
	limit?: number;
}): Promise<{ changes: ChangeLogEntry[]; hasMore: boolean }> => {
	const limit = Math.min(Math.max(params.limit ?? 500, 1), 2000);
	const models = await getTenantModels();
	const raw = await models.ChangeLog.find({
		domain: params.domain,
		academicYear: params.academicYear,
		seq: { $gt: params.sinceSeq },
	})
		.sort({ seq: 1 })
		.limit(limit + 1)
		.lean();

	const hasMore = raw.length > limit;
	const rows = raw.slice(0, limit);

	const changes: ChangeLogEntry[] = rows.map((row: any) => ({
		seq: row.seq,
		op: row.op,
		documentId: row.documentId,
		documentType: row.documentType,
		document: row.document,
		actorId: row.actorId,
		createdAt: row.createdAt?.toISOString?.() ?? new Date(row.createdAt).toISOString(),
	}));

	return { changes, hasMore };
};
