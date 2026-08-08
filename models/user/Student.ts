import { Schema, Document } from 'mongoose';
import { Student } from '@/types';

const YearSchema = new Schema(
	{
		year: { type: String, required: true },
		classId: { type: String, required: true },
		className: { type: String, required: false },
	},
	{ _id: false },
);

const StudentSchema = new Schema<Student & Document>({
	studentId: { type: String, required: true, unique: true },
	classId: { type: String, required: true },
	className: { type: String, required: true },
	enrollmentYear: { type: String, required: true },
	enrollmentSemester: { type: String, required: true },
	shareContactWithClassmates: { type: Boolean, required: true, default: false },
	recordAttendanceToday: { type: Date, required: false, default: null },
	enrollmentStatus: {
		type: String,
		enum: ['enrolled', 'graduated', 'transferred', 'dropped'],
		required: true,
	},
	isLateRegistration: { type: Boolean, required: false, default: false },
	academicYears: { type: [YearSchema], required: true },
	wardTeacherId: { type: String, required: false },
	scholarships: { type: [String], required: false },
	studentType: { type: String, enum: ['old', 'new'], required: false, default: 'old' },
});

export default StudentSchema;
