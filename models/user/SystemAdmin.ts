import { Schema, Document } from 'mongoose';
import { SystemAdmin } from '@/types';

// System Admin has no extra fields
const SystemAdminSchema = new Schema<SystemAdmin & Document>({});

export default SystemAdminSchema;
