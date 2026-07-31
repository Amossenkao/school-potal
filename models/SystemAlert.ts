import { Schema, Document } from 'mongoose';

const SystemAlertSchema = new Schema(
	{
		type: { type: String, required: true, index: true },
		severity: {
			type: String,
			enum: ['info', 'warning', 'critical'],
			required: true,
			index: true,
		},
		message: { type: String, required: true },
		schoolId: { type: String, index: true },
		schoolName: { type: String },
		module: { type: String, index: true },
		resolved: { type: Boolean, default: false, index: true },
		resolvedAt: { type: Date },
	},
	{ timestamps: true },
);

SystemAlertSchema.index({ createdAt: -1 });
SystemAlertSchema.index({ resolved: 1, severity: 1, createdAt: -1 });

export interface SystemAlertDocument extends Document {
	type: string;
	severity: 'info' | 'warning' | 'critical';
	message: string;
	resolved: boolean;
}

export default SystemAlertSchema;
