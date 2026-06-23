import { Schema, Document } from 'mongoose';
import { Teacher } from '@/types';

const TeacherSubjectSchema = new Schema(
	{
		year: { type: String, required: true },
		classes: [
			{
				classId: { type: String, required: true },
				subjects: [{ type: String, required: true }],
			},
		],
	},
	{ _id: false },
);

const TeacherSchema = new Schema<Teacher & Document>({
	// teacherId removed to align with interface which uses base User fields
	subjects: [TeacherSubjectSchema],
	sponsorClass: { type: String, default: null },
});

export default TeacherSchema;
