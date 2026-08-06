import { Schema, Document } from 'mongoose';
import { User, Notification, AIChatMessage, AIChatSession } from '@/types';
import { UserRoles } from '../constants';
import { normalizePhone } from '@/utils/phone';

const NotificationSchema = new Schema<Notification & Document>({
	title: { type: String, required: true },
	message: { type: String, required: true },
	details: String,
	timestamp: { type: Date, default: Date.now },
	read: { type: Boolean, default: false },
	dismissed: { type: Boolean, default: false },
	type: {
		type: String,
		enum: ['Grades', 'Security', 'Profile', 'Others'],
		required: true,
	},
});

const ChatSchema = new Schema<AIChatMessage & Document>({
	sender: { type: String, enum: ['user', 'assistant'], required: true },
	content: { type: String, required: true },
	timestamp: { type: Date, required: true, default: Date.now },
});

const ChatSessionSchema = new Schema<AIChatSession & Document>({
	id: { type: String, required: true },
	title: { type: String, required: true, default: 'New conversation' },
	createdAt: { type: Date, required: true, default: Date.now },
	messages: { type: [ChatSchema], required: true, default: [] },
});

const UserSchema = new Schema<User & Document>(
	{
		role: { type: String, enum: UserRoles, required: true },
		firstName: { type: String, required: true },
		middleName: String,
		lastName: { type: String, required: true },
		fullName: { type: String, required: true },
		username: { type: String, required: true, unique: true },
		password: { type: String },
		nickName: String,
		gender: { type: String, required: true },
		dateOfBirth: { type: String, required: true },
		isActive: { type: Boolean, default: true },
		defaultPassword: String,
		mustChangePassword: { type: Boolean, default: false },
		passwordChangedAt: { type: Date, default: null },
		phone: { type: String, required: true, unique: true },
		// Derived from `phone` by the middleware below — never assign directly.
		phoneNormalized: { type: String },
		email: { type: String, unique: true, sparse: true, required: false },
		address: { type: String, required: true },
		bio: String,
		avatar: String,
		profilePictureUrl: String, // Added to align with User interface
		notifications: { type: [NotificationSchema], required: true, default: [] },
		chats: [ChatSchema],
		chatSessions: { type: [ChatSessionSchema], required: true, default: [] },
		seq: { type: Number, default: 0 },
		deletedAt: { type: Date, default: null },
	},
	{
		discriminatorKey: 'role',
	},
);

UserSchema.index({ role: 1 });
UserSchema.index({ role: 1, classId: 1 });
UserSchema.index({ role: 1, 'academicYears.year': 1 });
UserSchema.index({
	role: 1,
	'academicYears.year': 1,
	'academicYears.classId': 1,
});
UserSchema.index({ role: 1, 'subjects.year': 1 });
UserSchema.index({ role: 1, 'subjects.classes.classId': 1 });

// Sparse so users without a phone are simply absent from the index. Note that
// sparse skips *missing* fields but still indexes an explicit null, which is
// why the middleware below unsets the field rather than nulling it.
UserSchema.index({ phoneNormalized: 1 }, { unique: true, sparse: true });

// --- Keep phoneNormalized in step with phone on every write path ---
// Registered on the base schema at module load, so the discriminators compiled
// in models/index.ts inherit both hooks.

UserSchema.pre('save', function (next) {
	if (this.isModified('phone')) {
		const normalized = normalizePhone(this.get('phone'));
		// `undefined` leaves the key off the document; null would be indexed.
		this.set('phoneNormalized', normalized ?? undefined);
	}
	next();
});

UserSchema.pre(
	['findOneAndUpdate', 'updateOne', 'updateMany'],
	function (next) {
		const update: any = this.getUpdate() || {};
		const phone = update.$set?.phone ?? update.phone;

		if (phone !== undefined) {
			const normalized = normalizePhone(phone);
			if (normalized) {
				this.set('phoneNormalized', normalized);
			} else {
				update.$unset = { ...(update.$unset || {}), phoneNormalized: '' };
				if (update.$set) delete update.$set.phoneNormalized;
				delete update.phoneNormalized;
				this.setUpdate(update);
			}
		}
		next();
	},
);

export default UserSchema;
