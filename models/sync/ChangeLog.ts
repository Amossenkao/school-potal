import { Schema } from 'mongoose';

export type ChangeOp = 'create' | 'update' | 'delete';

const ChangeLogSchema = new Schema(
	{
		domain: { type: String, required: true },
		academicYear: { type: String, required: true },
		seq: { type: Number, required: true },
		op: {
			type: String,
			enum: ['create', 'update', 'delete'],
			required: true,
		},
		documentId: { type: String, required: true },
		documentType: { type: String },
		document: { type: Schema.Types.Mixed },
		actorId: { type: String },
		idempotencyKey: { type: String },
	},
	{ collection: 'changelogs', timestamps: true },
);

ChangeLogSchema.index(
	{ domain: 1, academicYear: 1, seq: 1 },
	{ unique: true },
);
ChangeLogSchema.index({ domain: 1, academicYear: 1, createdAt: -1 });
ChangeLogSchema.index(
	{ domain: 1, academicYear: 1, idempotencyKey: 1 },
	{ unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);

export default ChangeLogSchema;
