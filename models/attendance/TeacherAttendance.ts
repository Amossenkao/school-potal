import { Schema, Document } from 'mongoose';
import type { TeacherAttendance } from '@/types';

const TeacherAttendanceSchema = new Schema<TeacherAttendance & Document>({
	academicYear: { type: String, required: true },
	teacherId: { type: String, required: true },
	date: { type: Date, required: true },
	status: { type: String, enum: ['present', 'late', 'absent'], required: true },
	recordedBy: { type: String, required: false },
});

TeacherAttendanceSchema.index(
	{ academicYear: 1, teacherId: 1, date: 1 },
	{ unique: true },
);

export default TeacherAttendanceSchema;
