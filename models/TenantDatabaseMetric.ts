import { Schema, Document } from 'mongoose';

const TenantDatabaseMetricSchema = new Schema(
	{
		schoolId: { type: String, required: true, index: true },
		databaseName: { type: String, required: true, index: true },
		collections: { type: Number, default: 0 },
		documents: { type: Number, default: 0 },
		dataSizeBytes: { type: Number, default: 0 },
		storageSizeBytes: { type: Number, default: 0 },
		indexSizeBytes: { type: Number, default: 0 },
		collectedAt: { type: Date, required: true, default: Date.now },
	},
	{ timestamps: true },
);

TenantDatabaseMetricSchema.index({ schoolId: 1, collectedAt: -1 });
TenantDatabaseMetricSchema.index({ collectedAt: -1 });

export interface TenantDatabaseMetricDocument extends Document {
	schoolId: string;
	databaseName: string;
	collections: number;
	documents: number;
	dataSizeBytes: number;
	storageSizeBytes: number;
	indexSizeBytes: number;
	collectedAt: Date;
}

export default TenantDatabaseMetricSchema;
