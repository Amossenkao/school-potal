import { Schema, Document } from 'mongoose';

const ApplicationLogSchema = new Schema(
	{
		level: {
			type: String,
			enum: ['debug', 'info', 'warning', 'error', 'critical'],
			required: true,
			index: true,
		},
		message: { type: String, required: true },
		requestId: { type: String, index: true },
		tenantId: { type: String, index: true },
		schoolId: { type: String, index: true },
		schoolName: { type: String },
		schoolSlug: { type: String, index: true },
		userId: { type: String, index: true },
		role: { type: String },
		module: { type: String, index: true },
		operation: { type: String, index: true },
		method: { type: String },
		path: { type: String, index: true },
		statusCode: { type: Number, index: true },
		duration: { type: Number },
		errorName: { type: String },
		errorCode: { type: String, index: true },
		errorDigest: { type: String },
		stackPreview: { type: String },
		source: { type: String, default: 'application', index: true },
		metadata: { type: Schema.Types.Mixed },
	},
	{ timestamps: true },
);

ApplicationLogSchema.index({ createdAt: -1 });
ApplicationLogSchema.index({ level: 1, createdAt: -1 });
ApplicationLogSchema.index({ tenantId: 1, createdAt: -1 });
ApplicationLogSchema.index({ module: 1, createdAt: -1 });
ApplicationLogSchema.index({ requestId: 1, createdAt: -1 });

export interface ApplicationLogDocument extends Document {
	level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
	message: string;
	createdAt: Date;
}

export default ApplicationLogSchema;
