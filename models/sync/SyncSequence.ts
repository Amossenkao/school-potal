import { Schema } from 'mongoose';

const SyncSequenceSchema = new Schema(
	{
		domain: { type: String, required: true },
		academicYear: { type: String, required: true },
		seq: { type: Number, required: true, default: 0 },
	},
	{ collection: 'syncsequences', timestamps: true },
);

SyncSequenceSchema.index(
	{ domain: 1, academicYear: 1 },
	{ unique: true },
);

export default SyncSequenceSchema;
