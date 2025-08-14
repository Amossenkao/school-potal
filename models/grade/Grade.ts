import mongoose from 'mongoose';
import { GradeStatus } from '../constants';

const gradeSchema = new mongoose.Schema(
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
		submittedAt: { type: Date, required: true },
	},
	{ _id: false }
);

export const Grade = mongoose.model('Grade', gradeSchema);
