import { Schema } from 'mongoose';

/**
 * One line of a payment batch: a single fee (optionally a specific installment
 * of it) and the amount paid toward it in this transaction.
 */
const PaymentItemSchema = new Schema(
	{
		// References FeeDefinition.id when known; blank for legacy records.
		feeId: { type: String, trim: true },
		// The fee's display name, as recorded at payment time.
		feeType: { type: String, required: true, default: 'fee' },
		category: { type: String, required: true, default: '' },
		// Optional: which Installment.id this line was recorded against.
		// Per-installment collection is still derived by greedy rollover on read.
		installmentId: { type: String, trim: true },
		amount: { type: Number, required: true },
	},
	{ _id: false },
);

/**
 * A payment is a BATCH: one transaction covering one or more fee items, sharing
 * a single receipt number, currency, date, and payer.
 *
 * Legacy records wrote one document per fee item with the fee fields at the top
 * level and no `items` array. Those fields are kept optional here so historical
 * documents still load; `normalizePaymentDoc` in utils/payments.ts folds them
 * into a one-item batch on read, so nothing downstream sees the old shape.
 */
const PaymentSchema = new Schema(
	{
		studentId: { type: String, required: true, index: true },
		classId: { type: String, required: true },
		paidBy: { type: String, required: true },

		// ── Batch ──
		items: { type: [PaymentItemSchema], default: [] },
		// Sum of items[].amount. Denormalized so totals never need an unwind.
		totalAmount: { type: Number, default: 0 },
		currency: { type: String, required: false, default: 'LRD' },
		// One receipt per batch.
		receiptNumber: { type: String, required: true, unique: true },

		// ── Legacy per-item fields (pre-batch records only) ──
		feeType: { type: String },
		category: { type: String },
		installmentId: { type: String, trim: true },
		paymentAmount: { type: Number },

		paymentAcademicYear: { type: String, required: true },
		paymentDate: { type: String, required: true },
		paymentTime: { type: String, required: true },
		paymentMethod: { type: String },
		phoneNumber: { type: String },

		// ── Void ──
		// Receipts are external artefacts: someone may be holding a printout.
		// Voiding keeps the record so /api/payments/verify can answer honestly,
		// while every balance and collection read excludes it.
		voidedAt: { type: Date, default: null },
		voidedBy: {
			type: new Schema(
				{
					id: { type: String, default: '' },
					name: { type: String, default: '' },
				},
				{ _id: false },
			),
			default: null,
		},
		voidReason: { type: String, default: '' },
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
