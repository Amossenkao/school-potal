import { Schema, Document } from 'mongoose';
import { Administrator } from '@/types';

const AdministratorSchema = new Schema<Administrator & Document>({
	adminId: { type: String, required: true, unique: true },
	position: { type: String, required: true },
});

export default AdministratorSchema;
