import { Schema, Document } from 'mongoose';
import { Teacher, TeacherSubject } from '@/types';
import { ClassLevels } from '../constants';

const TeacherSubjectSchema = new Schema<TeacherSubject>(
	{
		subject: { type: String, required: true },
		level: { type: String, enum: ClassLevels, required: true },
		session: { type: String, required: true },
	},
	{ _id: false }
);

const TeacherSchema = new Schema<Teacher & Document>({
	teacherId: { type: String, required: true, unique: true },
	subjects: [TeacherSubjectSchema],
	sponsorClass: { type: String, default: null },
});

export default TeacherSchema;
