import { Schema, Document } from 'mongoose';
import { Administrator } from '@/types';

const AdministratorSchema = new Schema<Administrator & Document>({
	// adminId removed to align with interface
	position: { type: String, required: true },
	permissions: { type: [String], default: [] },
	canRecordStudentAttendance: { type: Boolean, default: false },
	canRecordTeacherAttendance: { type: Boolean, default: false },
	academicYears: [
		{
			year: { type: String, required: true },
			position: { type: String, required: true },
		},
	],
});

export default AdministratorSchema;
