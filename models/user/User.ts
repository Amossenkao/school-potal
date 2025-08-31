import { Schema, Document } from 'mongoose';
import { User, Notification } from '@/types';
import { UserRoles } from '../constants';

const NotificationSchema = new Schema<Notification & Document>(
	{
		title: { type: String, required: true },
		message: { type: String, required: true },
		details: String,
		timestamp: { type: Date, default: Date.now },
		read: { type: Boolean, default: false },
		dismissed: { type: Boolean, default: false },
		type: {
			type: String,
			enum: ['Login', 'Grades', 'Security', 'Profile'],
			required: true,
		},
	},
	{ _id: false }
);

const UserSchema = new Schema<User & Document>(
	{
		role: { type: String, enum: UserRoles, required: true },
		firstName: { type: String, required: true },
		middleName: String,
		lastName: { type: String, required: true },
		username: { type: String, required: true, unique: true },
		password: { type: String },
		nickName: String,
		gender: { type: String, required: true },
		dateOfBirth: { type: String, required: true },
		isActive: { type: Boolean, default: true },
		mustChangePassword: { type: Boolean, default: false },
		passwordChangedAt: { type: Date, default: null },
		phone: { type: String, required: true },
		email: String,
		address: { type: String, required: true },
		bio: String,
		avatar: String,
		lockedUntil: Date,
		notifications: { type: [NotificationSchema], required: true, default: [] },
	},
	{
		timestamps: true,
		discriminatorKey: 'role',
	}
);

export default UserSchema;
