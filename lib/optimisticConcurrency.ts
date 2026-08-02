// lib/optimisticConcurrency.ts
// Phase 4 optimistic concurrency helpers (§6.6 of sync-engine-architecture.md).
//
// Mutations may carry `expectedSeq` — the client's last-known seq for the
// target record. The server compares it against the record's current `seq`:
// match → apply; mismatch → 409 { currentSeq } so the client can reconcile.
// When `expectedSeq` is absent the check passes (legacy clients, offline
// replay without a known version, or first-time writes).

export type ExpectedSeqCheck =
	| { ok: true }
	| { ok: false; conflict: true; currentSeq: number };

/**
 * Compares a client-supplied `expectedSeq` against the record's current seq.
 * A missing/invalid `expectedSeq` passes (server-authority LWW applies).
 */
export function assertExpectedSeq(params: {
	recordSeq?: number | string | null;
	expectedSeq?: number | string | null;
}): ExpectedSeqCheck {
	const rawExpected = params.expectedSeq;
	if (rawExpected === undefined || rawExpected === null || rawExpected === '') {
		return { ok: true };
	}
	const currentSeq = Number(params.recordSeq || 0);
	const expectedSeq = Number(rawExpected);
	if (!Number.isFinite(expectedSeq)) {
		return { ok: true };
	}
	if (expectedSeq !== currentSeq) {
		return { ok: false, conflict: true, currentSeq };
	}
	return { ok: true };
}

/**
 * Reads a record's current `seq` from a Mongoose model + filter. Records that
 * do not exist (or that predate seq stamping) report seq 0.
 */
export async function getRecordSeq(
	model: any,
	filter: Record<string, unknown>,
): Promise<number> {
	try {
		const doc = await model.findOne(filter).select('seq').lean();
		return Number((doc as any)?.seq ?? 0);
	} catch {
		return 0;
	}
}

/**
 * Stamps a record with the seq of the change that just mutated it, keeping
 * the doc's version aligned with the ChangeLog so later expectedSeq checks
 * are meaningful.
 */
export async function stampRecordSeq(
	model: any,
	filter: Record<string, unknown>,
	seq: number,
): Promise<void> {
	if (!Number.isFinite(seq) || seq <= 0) return;
	try {
		await model.updateOne(filter, { $set: { seq } });
	} catch (error) {
		console.error('[optimisticConcurrency] Failed to stamp seq:', error);
	}
}
