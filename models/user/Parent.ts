import { Schema, Document } from 'mongoose';
import { Parent } from '@/types';

const ParentSchema = new Schema<Parent & Document>({
	// The studentId (username) of each child linked to this parent
	studentIds: { type: [String], default: [] },
	// Relax base-User required fields: parents may not have a phone/gender/DOB
	phone: { type: String, required: false },
	gender: { type: String, required: false },
	dateOfBirth: { type: String, required: false },
	address: { type: String, required: false },
});

ParentSchema.index({ studentIds: 1 });

export default ParentSchema;
