import { Schema, Document } from 'mongoose';

const PaymentSchema = new Schema(
	{
		studentId: { type: String, required: true, index: true },
		classId: { type: String, required: true },
		paidBy: { type: String, required: true },
		feeType: { type: String, required: true, default: 'fee' },
		category: { type: String, required: true },
		paymentAmount: { type: Number, required: true },
		currency: { type: String, required: false, default: 'LRD' },
		paymentAcademicYear: { type: String, required: true },
		paymentDate: { type: String, required: true },
		paymentTime: { type: String, required: true },
		receiptNumber: { type: String, required: true, unique: true },
		paymentMethod: { type: String },
		phoneNumber: { type: String },
		status: {
			type: String,
			enum: ['success', 'pending', 'failed'],
			default: 'success',
		},
		seq: { type: Number, default: 0 },
		deletedAt: { type: Date, default: null },
	},
	{
		timestamps: true,
		collection: 'payments',
	},
);

PaymentSchema.index({ studentId: 1, paymentAcademicYear: 1 });

export default PaymentSchema;
