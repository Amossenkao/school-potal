import { Schema, Document } from 'mongoose';
import { Student, StudentFinancialProfile, PaymentRecords } from '@/types';

const GuardianSchema = new Schema(
	{
		firstName: { type: String, required: true },
		middleName: String,
		lastName: { type: String, required: true },
		email: String,
		phone: { type: String, required: true },
		address: { type: String, required: true },
	},
	{ _id: false }
);

const YearSchema = new Schema({
	year: String,
	classIds: [String],
});

const PaymentReceiptSchema = new Schema<PaymentRecords & Document>({
	id: { type: String, required: true, unique: true },
	receiptNumber: { type: String, required: true, unique: true },
	paidBy: { type: String, required: true },
	feeType: { type: String, required: true },
	category: { type: String, required: true },
	paymentAmount: { type: Number, required: true },
	paymentAcademicYear: { type: String, required: true },
	paymentDate: { type: String, required: true },
	paymentTime: { type: String, required: true },
});

const FinancialProfileSchema = new Schema<StudentFinancialProfile & Document>(
	{
		outstandingBalances: [
			{
				feeType: { type: String, required: true },
				category: { type: String, required: true },
				requiredAmount: { type: Number, required: true },
				remainingBalance: { type: Number, required: true },
			},
		],
		paymentRecords: [PaymentReceiptSchema],
	},
	{ _id: false }
);

const StudentSchema = new Schema<Student & Document>({
	studentId: { type: String, required: true, unique: true },
	classId: { type: String, required: true },
	className: { type: String, required: true },
	enrollmentYear: { type: String, required: true },
	enrollmentSemester: { type: String, required: true },
	enrollmentStatus: {
		type: String,
		enum: ['enrolled', 'graduated', 'transferred', 'dropped'],
		required: true,
	},
	session: { type: String, required: true },
	classLevel: { type: String, required: true },
	guardian: { type: GuardianSchema, required: true },
	academicYears: { type: [YearSchema], required: true },
	financialProfile: { type: FinancialProfileSchema, required: true },
});

export default StudentSchema;
