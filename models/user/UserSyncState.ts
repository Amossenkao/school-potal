import { Schema } from 'mongoose';

const UserSyncStateSchema = new Schema(
	{
		academicYear: { type: String, required: true, index: true, unique: true },
		version: { type: Number, default: 0 },
	},
	{ timestamps: true },
);

export default UserSyncStateSchema;
