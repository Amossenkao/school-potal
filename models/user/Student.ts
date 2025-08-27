import { Schema, Document } from 'mongoose';
import { Student } from '@/types';

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

const StudentSchema = new Schema<Student & Document>({
	studentId: { type: String, required: true, unique: true },
	classId: { type: String, required: true },
	className: { type: String, required: true },
	session: { type: String },
	classLevel: { type: String, required: true },
	guardian: { type: GuardianSchema, required: true },
});

export default StudentSchema;
