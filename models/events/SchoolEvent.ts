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
		/**
		 * Test schedules only.
		 *
		 * `period` is the academic period the test belongs to ('first',
		 * 'third_period_exam', …) — the same vocabulary grading uses, so a test
		 * schedule and the grades it produces line up.
		 *
		 * `groupId` ties together the rows of a single published test schedule.
		 * One schedule ("3rd Period Exams") spans several classes, subjects and
		 * days; each of those is its own row so it can be edited independently,
		 * and this is what makes them one thing in the UI. The title belongs to
		 * the group, not to the row.
		 */
		period: { type: String, default: '' },
		groupId: { type: String, default: '' },
		teacher: { type: String },
		venue: { type: String },
		location: { type: String },
		description: { type: String },
		colorTag: { type: String, default: 'Primary' },
		academicYear: { type: String, required: true },
		createdBy: { type: String },
		updatedBy: { type: String },
		seq: { type: Number, default: 0 },
		deletedAt: { type: Date, default: null },
	},
	{ timestamps: true }
);

SchoolEventSchema.index({
	eventType: 1,
	academicYear: 1,
	session: 1,
	level: 1,
	classId: 1,
});
SchoolEventSchema.index({ eventType: 1, academicYear: 1, startDate: 1 });
// Editing or deleting a whole test schedule addresses it by group.
SchoolEventSchema.index({ eventType: 1, groupId: 1 });

export default SchoolEventSchema;
