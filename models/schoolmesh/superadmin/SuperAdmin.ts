import { Schema, Document } from 'mongoose';
import { SuperAdmin } from '@/types';
import { normalizePhone } from '@/utils/phone';

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
		// Derived from `phone` by the middleware below — never assign directly.
		phoneNormalized: { type: String },
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

// Sparse so superadmins without a phone are absent from the index. Sparse still
// indexes an explicit null, hence the unset in the middleware below.
SuperAdminSchema.index({ phoneNormalized: 1 }, { unique: true, sparse: true });

// --- Keep phoneNormalized in step with phone on every write path ---

SuperAdminSchema.pre('save', function (next) {
	if (this.isModified('phone')) {
		const normalized = normalizePhone(this.get('phone'));
		this.set('phoneNormalized', normalized ?? undefined);
	}
	next();
});

SuperAdminSchema.pre(
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

export default SuperAdminSchema;
