import { Schema, Document } from 'mongoose';
import { User } from '@/types';
import { UserRoles } from '../constants';

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
		mustChangePassowrd: { type: Boolean, default: false },
		requiresOtp: { type: Boolean, default: false },
		phone: { type: String, required: true },
		email: String,
		address: { type: String, required: true },
		bio: String,
		avatar: String,
		lockedUntil: Date,
	},
	{
		timestamps: true,
		discriminatorKey: 'role',
	}
);

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

export default UserSchema;
