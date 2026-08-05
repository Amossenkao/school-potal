import { Schema } from 'mongoose';

/**
 * Tenant-scoped, append-only financial audit trail.
 *
 * Distinct from the platform `AuditLog` in the shared schoolmesh DB
 * (app/api/audit-logs/route.ts), which is superadmin-only, carries no actor,
 * and is not tenant-filtered. This collection answers "who changed this
 * school's money, when, and what were the values before".
 *
 * Deliberately NOT registered in lib/syncEngine.ts `LOG_BACKED_DOMAINS`: that
 * list is hand-maintained, so a collection absent from it never gets a `seq`
 * and never enters the delta/IndexedDB sync path. Audit rows are fetched on
 * demand through their own REST route instead.
 *
 * There is no update or delete path anywhere in the app. Combined with the
 * hash chain below, that makes after-the-fact edits detectable.
 */

export const AUDIT_CATEGORIES = [
	'payment',
	'scholarship',
	'fee_schedule',
	'enrollment',
] as const;

export const AUDIT_ACTIONS = [
	'payment.created',
	'payment.updated',
	'payment.voided',
	'scholarship.assigned',
	'scholarship.removed',
	'ward.changed',
	'fee_schedule.updated',
	'student.class_changed',
	'student.type_changed',
	'student.deleted_with_payments',
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const ActorSchema = new Schema(
	{
		// Authoritative identity. Names are mutable; this is not.
		id: { type: String, required: true },
		// Point-in-time snapshot, so a later rename cannot rewrite history.
		name: { type: String, default: '' },
		username: { type: String, default: '' },
		role: { type: String, default: '' },
	},
	{ _id: false },
);

const TargetSchema = new Schema(
	{
		type: { type: String, required: true },
		id: { type: String, default: '' },
		label: { type: String, default: '' },
		studentId: { type: String, default: '' },
		receiptNumber: { type: String, default: '' },
		/**
		 * Who the student was at the moment of the change. Snapshots, not joins:
		 * the trail must still read correctly after a rename, a class move, or
		 * the student being deleted outright.
		 */
		studentName: { type: String, default: '' },
		className: { type: String, default: '' },
	},
	{ _id: false },
);

const AmountSchema = new Schema(
	{
		currency: { type: String, default: '' },
		// Signed money impact of this event: negative for a void.
		delta: { type: Number, default: 0 },
	},
	{ _id: false },
);

const ContextSchema = new Schema(
	{
		ip: { type: String, default: '' },
		userAgent: { type: String, default: '' },
		// Shared across events emitted by one logical action (e.g. a bulk
		// scholarship strip that issues one request per student).
		requestId: { type: String, default: '' },
	},
	{ _id: false },
);

const AuditEventSchema = new Schema(
	{
		category: {
			type: String,
			enum: AUDIT_CATEGORIES,
			required: true,
			index: true,
		},
		action: {
			type: String,
			enum: AUDIT_ACTIONS,
			required: true,
			index: true,
		},
		/** Human-readable sentence, rendered at write time while context is known. */
		summary: { type: String, required: true },
		actor: { type: ActorSchema, required: true },
		target: { type: TargetSchema, required: true },
		before: { type: Schema.Types.Mixed, default: null },
		after: { type: Schema.Types.Mixed, default: null },
		amount: { type: AmountSchema, default: null },
		academicYear: { type: String, default: '', index: true },
		context: { type: ContextSchema, default: () => ({}) },

		/**
		 * ISO timestamp fixed by the writer and included in the hash. Distinct
		 * from `createdAt`, which Mongoose's `timestamps` owns and overwrites —
		 * hashing that one would make the chain unverifiable.
		 */
		eventAt: { type: String, required: true },

		// ── Tamper evidence ──
		/** SHA-256 over the canonical event body plus `prevHash`. */
		hash: { type: String, required: true, unique: true },
		/** Hash of the immediately preceding event; '' for the first. */
		prevHash: { type: String, default: '' },
	},
	{
		timestamps: true,
		collection: 'auditevents',
	},
);

AuditEventSchema.index({ createdAt: -1 });
AuditEventSchema.index({ category: 1, createdAt: -1 });
AuditEventSchema.index({ 'target.studentId': 1, createdAt: -1 });
AuditEventSchema.index({ academicYear: 1, createdAt: -1 });
AuditEventSchema.index({ 'actor.id': 1, createdAt: -1 });

export default AuditEventSchema;
