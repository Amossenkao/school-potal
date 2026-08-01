import { Schema, Document } from 'mongoose';
import { Parent } from '@/types';

const ParentSchema = new Schema<Parent & Document>({
	studentIds: { type: [String], default: [] },
	phone: { type: String, required: false },
	gender: { type: String, required: false },
	dateOfBirth: { type: String, required: false },
	address: { type: String, required: false },
});

ParentSchema.index({ studentIds: 1 });

export default ParentSchema;
