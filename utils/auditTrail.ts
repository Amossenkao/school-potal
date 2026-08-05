import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { getTenantModels } from '@/models';
import { getRequestIp } from '@/utils/rateLimit';
import type { AuditAction, AuditCategory } from '@/models/audit/AuditEvent';

/**
 * The single write path for the financial audit trail. Routes call
 * `recordAuditEvent` and nothing else — no route hand-rolls an event, so the
 * hash chain cannot be bypassed by accident.
 */

export interface AuditActor {
	id: string;
	name?: string;
	username?: string;
	role?: string;
}

export interface AuditTarget {
	type: string;
	id?: string;
	label?: string;
	studentId?: string;
	receiptNumber?: string;
	/** Point-in-time identity, so the trail never has to show a bare ID. */
	studentName?: string;
	className?: string;
}

export interface RecordAuditEventArgs {
	category: AuditCategory;
	action: AuditAction;
	summary: string;
	actor: AuditActor;
	target: AuditTarget;
	before?: unknown;
	after?: unknown;
	amount?: { currency: string; delta: number } | null;
	academicYear?: string;
	/** Shared across events emitted by one logical action. */
	requestId?: string;
	/**
	 * Tenant to write to. Required for superadmin routes that act on a school
	 * other than the one the request host resolves to — without it the event
	 * would land in the wrong tenant's database.
	 */
	host?: string;
}

/**
 * Builds the actor block from whatever `authorizeUser` returned.
 *
 * Uses `sessionUser.id`. `AuthenticatedUser.userId` is declared in proxy.ts but
 * `buildUserResponse` never populates it, so reading `.userId` yields undefined
 * (a live bug at app/api/users/route.ts:4877). The name is stored as a
 * point-in-time snapshot because session names are mutable.
 */
export function auditActorFrom(sessionUser: any): AuditActor {
	const name =
		sessionUser?.fullName ||
		`${sessionUser?.firstName || ''} ${sessionUser?.lastName || ''}`.trim() ||
		sessionUser?.username ||
		'Unknown';
	return {
		id: String(sessionUser?.id || ''),
		name,
		username: sessionUser?.username || '',
		role: sessionUser?.role || '',
	};
}

/** Stable stringify: key order must not affect the hash. */
function canonical(value: unknown): string {
	if (value === null || value === undefined) return 'null';
	if (typeof value !== 'object') return JSON.stringify(value);
	if (Array.isArray(value)) {
		return `[${value.map(canonical).join(',')}]`;
	}
	const entries = Object.entries(value as Record<string, unknown>)
		.filter(([, entryValue]) => entryValue !== undefined)
		.sort(([a], [b]) => a.localeCompare(b));
	return `{${entries
		.map(([key, entryValue]) => `${JSON.stringify(key)}:${canonical(entryValue)}`)
		.join(',')}}`;
}

/**
 * The exact target shape that enters the hash. Writer and verifier both go
 * through here, because any drift between the two silently invalidates the
 * chain.
 *
 * `studentName` and `className` collapse to `undefined` rather than `''` when
 * absent, and `canonical` drops undefined keys — so events written before
 * these fields existed still hash to the bytes they were signed with and stay
 * verifiable.
 */
function hashableTarget(target: any) {
	return {
		type: target?.type || '',
		id: target?.id || '',
		label: target?.label || '',
		studentId: target?.studentId || '',
		receiptNumber: target?.receiptNumber || '',
		studentName: target?.studentName || undefined,
		className: target?.className || undefined,
	};
}

/**
 * Point-in-time identity for a student, for the audit target.
 *
 * Reads the class name off the student record when it is there and falls back
 * to the profile's class tree, because `className` is denormalised and not
 * populated on every write path.
 */
export function studentAuditIdentity(
	student: any,
	schoolProfile?: any,
): { studentName: string; className: string } {
	const studentName =
		`${student?.firstName || ''} ${student?.lastName || ''}`.trim() ||
		student?.fullName ||
		student?.username ||
		String(student?.studentId || '');

	let className: string = student?.className || '';
	const classId = String(student?.classId || '');
	if (!className && classId) {
		outer: for (const levels of Object.values(
			schoolProfile?.academicConfig?.classLevels || {},
		)) {
			for (const level of Object.values((levels as any) || {})) {
				for (const cls of (level as any)?.classes || []) {
					if (cls?.classId === classId) {
						className = cls.name || cls.classId;
						break outer;
					}
				}
			}
		}
		if (!className) className = classId;
	}

	return { studentName, className };
}

const sha256 = (input: string) =>
	crypto.createHash('sha256').update(input).digest('hex');

function computeHash(body: Record<string, unknown>, prevHash: string): string {
	return sha256(`${canonical(body)}|${prevHash}`);
}

/**
 * Appends one event to the tenant's chain.
 *
 * Never throws. An audit trail that can fail the financial write it describes
 * is worse than one with a gap, so every error is swallowed and logged. The
 * unique index on `hash` is what makes the concurrent-writer retry safe: two
 * racers reading the same tip produce different bodies (different timestamps
 * and payloads), so a genuine collision means a duplicate write, not a lost one.
 */
export async function recordAuditEvent(
	req: NextRequest | null,
	args: RecordAuditEventArgs,
): Promise<void> {
	try {
		const models = await getTenantModels(args.host);
		const AuditEvent = models?.AuditEvent;
		if (!AuditEvent) return;

		const body = {
			category: args.category,
			action: args.action,
			summary: args.summary,
			actor: {
				id: args.actor.id,
				name: args.actor.name || '',
				username: args.actor.username || '',
				role: args.actor.role || '',
			},
			target: hashableTarget(args.target),
			before: args.before ?? null,
			after: args.after ?? null,
			amount: args.amount ?? null,
			academicYear: args.academicYear || '',
			context: {
				ip: req ? getRequestIp(req.headers) : '',
				userAgent: req?.headers.get('user-agent') || '',
				requestId: args.requestId || crypto.randomUUID(),
			},
			// Fixed here, not by Mongoose's `timestamps`, so verification can
			// reproduce the exact bytes that were hashed.
			eventAt: new Date().toISOString(),
		};

		for (let attempt = 0; attempt < 2; attempt += 1) {
			const tip = await AuditEvent.findOne({})
				.sort({ createdAt: -1, _id: -1 })
				.select('hash')
				.lean();
			const prevHash = (tip as any)?.hash || '';

			try {
				await AuditEvent.create({
					...body,
					prevHash,
					hash: computeHash(body, prevHash),
				});
				return;
			} catch (error: any) {
				// Duplicate hash: another writer won the race. Re-read the tip once.
				if (error?.code === 11000 && attempt === 0) continue;
				throw error;
			}
		}
	} catch (error) {
		console.error('[audit] failed to record event', {
			action: args.action,
			target: args.target,
			error,
		});
	}
}

export interface ChainVerification {
	ok: boolean;
	checked: number;
	/** Id of the first event whose hash does not reconcile, if any. */
	brokenAt?: string;
	message: string;
}

/**
 * Recomputes every hash in order and reports the first break. Detects both
 * an edited row (its own hash stops matching its body) and a removed row
 * (the next row's `prevHash` no longer matches its predecessor).
 */
export async function verifyAuditChain(
	limit = 5000,
): Promise<ChainVerification> {
	const models = await getTenantModels();
	const AuditEvent = models?.AuditEvent;
	if (!AuditEvent) {
		return { ok: true, checked: 0, message: 'No audit collection.' };
	}

	const events = await AuditEvent.find({})
		.sort({ eventAt: 1, _id: 1 })
		.limit(limit)
		.lean();

	let prevHash = '';
	let checked = 0;

	for (const event of events as any[]) {
		const body = {
			category: event.category,
			action: event.action,
			summary: event.summary,
			actor: {
				id: event.actor?.id || '',
				name: event.actor?.name || '',
				username: event.actor?.username || '',
				role: event.actor?.role || '',
			},
			target: hashableTarget(event.target),
			before: event.before ?? null,
			after: event.after ?? null,
			amount: event.amount ?? null,
			academicYear: event.academicYear || '',
			context: {
				ip: event.context?.ip || '',
				userAgent: event.context?.userAgent || '',
				requestId: event.context?.requestId || '',
			},
			eventAt: event.eventAt,
		};

		// A removed or reordered event breaks the link to its predecessor.
		if (event.prevHash !== prevHash) {
			return {
				ok: false,
				checked,
				brokenAt: String(event._id),
				message:
					'Chain break: an event was removed or reordered before this entry.',
			};
		}

		// An edited event no longer hashes to its stored hash.
		if (event.hash !== computeHash(body, prevHash)) {
			return {
				ok: false,
				checked,
				brokenAt: String(event._id),
				message: 'Tampering detected: this entry was modified after it was written.',
			};
		}

		checked += 1;
		prevHash = event.hash;
	}

	return {
		ok: true,
		checked,
		message: `${checked} event${checked === 1 ? '' : 's'} verified — chain intact.`,
	};
}
