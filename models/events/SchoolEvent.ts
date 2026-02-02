import { Schema } from 'mongoose';

const SchoolEventSchema = new Schema(
	{
		eventType: {
			type: String,
			enum: ['academic_calendar', 'class_schedule', 'test_schedule'],
			required: true,
		},
		title: { type: String, required: true },
		startDate: { type: String },
		endDate: { type: String },
		startTime: { type: String },
		endTime: { type: String },
		dayOfWeek: { type: String },
		classId: { type: String },
		className: { type: String },
		level: { type: String },
		session: { type: String },
		subject: { type: String },
		isRecess: { type: Boolean, default: false },
		teacher: { type: String },
		venue: { type: String },
		location: { type: String },
		description: { type: String },
		colorTag: { type: String, default: 'Primary' },
		academicYear: { type: String, required: true },
		createdBy: { type: String },
		updatedBy: { type: String },
	},
	{ timestamps: true }
);

export default SchoolEventSchema;
