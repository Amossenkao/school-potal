import { Schema, Document } from 'mongoose';

const MonitoringSnapshotSchema = new Schema(
	{
		timestamp: { type: Date, required: true, index: true },
		systemStatus: {
			type: String,
			enum: ['healthy', 'warning', 'critical'],
			required: true,
			index: true,
		},
		errors: {
			total: { type: Number, default: 0 },
			critical: { type: Number, default: 0 },
			last24Hours: { type: Number, default: 0 },
		},
		logs: {
			warnings: { type: Number, default: 0 },
			errors: { type: Number, default: 0 },
		},
		storage: {
			usedBytes: { type: Number, default: 0 },
			objects: { type: Number, default: 0 },
			requests: { type: Number, default: 0 },
		},
		uptime: { type: Number, default: 0 },
		deployment: {
			status: { type: String, default: 'unknown' },
			version: { type: String },
		},
		database: {
			cluster: { type: Schema.Types.Mixed },
			tenants: { type: Schema.Types.Mixed },
		},
		health: { type: Schema.Types.Mixed },
	},
	{ timestamps: true },
);

MonitoringSnapshotSchema.index({ createdAt: -1 });

export interface MonitoringSnapshotDocument extends Document {
	timestamp: Date;
	systemStatus: string;
}

export default MonitoringSnapshotSchema;
