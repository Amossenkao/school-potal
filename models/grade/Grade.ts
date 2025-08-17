import mongoose from 'mongoose';
import { GradeStatus } from '../constants';

const GradeSchema = new mongoose.Schema(
	{
		submissionId: { type: String, required: true },
		academicYear: { type: String, required: true },
		period: { type: String, required: true },
		classId: { type: String, required: true },
		subject: { type: String, required: true },
		teacherId: { type: String, required: true },
		studentId: { type: String, required: true },
		studentName: { type: String, required: true },
		grade: { type: Number, required: true },
		status: { type: String, enum: GradeStatus, required: true },
		lastUpdated: { type: Date, required: true },
	},
	{ _id: false }
);

// Check if the model is already defined before defining it
export default GradeSchema;
