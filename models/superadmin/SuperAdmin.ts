import { Schema, Document } from 'mongoose';
import { SuperAdmin } from '@/types';

const SuperAdminSchema = new Schema<SuperAdmin & Document>(
	{
		role: { type: String, required: true, default: 'superadmin' },
		firstName: { type: String, required: true },
		middleName: String,
		lastName: { type: String, required: true },
		fullName: { type: String, required: true },
		username: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		nickName: String,
		gender: { type: String, required: true },
		dateOfBirth: { type: String, required: true },
		isActive: { type: Boolean, default: true },
		defaultPassword: String,
		mustChangePassword: { type: Boolean, default: false },
		passwordChangedAt: { type: Date, default: null },
		phone: { type: String, required: true, unique: true },
		email: { type: String, unique: true, sparse: true },
		address: { type: String, required: true },
		bio: String,
		avatar: String,
		profilePictureUrl: String,
		notifications: { type: [], default: [] },
		chats: { type: [], default: [] },
		chatSessions: { type: [], default: [] },
	},
	{
		timestamps: true,
	}
);

SuperAdminSchema.index({ role: 1 });

export default SuperAdminSchema;
