import { Schema } from 'mongoose';

const ReportShareSchema = new Schema(
	{
		token: { type: String, required: true, unique: true, index: true },
		cacheKey: { type: String, required: true },
		pdfData: { type: Buffer },
		pdfSize: { type: Number },
		contentType: { type: String, default: 'application/pdf' },
		pinHash: { type: String, required: true },
		fileName: { type: String, required: true },
		reportType: { type: String, required: true },
		createdBy: { type: String },
		expiresAt: { type: Date, required: true, index: true },
	},
	{ timestamps: true }
);

ReportShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default ReportShareSchema;
