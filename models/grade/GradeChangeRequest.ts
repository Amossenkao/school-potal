import { Schema, model, models } from 'mongoose';

const GradeChangeRequestSchema = new Schema({
	batchId: { type: String, required: true, index: true },
	submissionId: { type: String, required: true },

	// Reference to the original grade document in the 'grades' collection.
	originalGradeId: {
		type: Schema.Types.ObjectId,
		ref: 'Grade',
		required: true,
	},

	teacherId: { type: String, required: true, index: true },
	teacherName: { type: String, required: true },

	// Information about the student whose grade is being changed.
	studentId: { type: String, required: true, index: true },
	studentName: { type: String, required: true },

	classId: { type: String, required: true },
	subject: { type: String, required: true },
	period: { type: String, required: true },
	academicYear: { type: String, required: true, index: true },

	// The grade change details.
	originalGrade: { type: Number, required: true },
	requestedGrade: { type: Number, required: true },
	reasonForChange: { type: String, required: true, trim: true },

	// Administrative tracking fields.
	status: {
		type: String,
		enum: ['Pending', 'Approved', 'Rejected'],
		default: 'Pending',
		index: true,
	},
	adminRejectionReason: { type: String, trim: true },

	// Timestamps for the request lifecycle.
	submittedAt: { type: Date, default: Date.now },
	resolvedAt: { type: Date },
	lastUpdated: { type: Date, required: true },
});

export default GradeChangeRequestSchema;
