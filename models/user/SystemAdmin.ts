import { Schema, Document } from 'mongoose';
import { SystemAdmin } from '@/types';

const SystemAdminSchema = new Schema<SystemAdmin & Document>({});

export default SystemAdminSchema;
