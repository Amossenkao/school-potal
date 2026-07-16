import mongoose, { Schema, Document } from 'mongoose';
import { SchoolProfile, FeatureKey } from '@/types/schoolProfile';
import { TENANT_THEME_NAMES } from '@/types/tenantTheme';

// --- Enums and Constants ---
const featureKeys: FeatureKey[] = [
	// Core Features
	'dashboard',
	'user_management',
	'profile_management',
	'ai_chat',
	'homepage',
	'apps',
	'attendance',

	// Academic Features
	'grading_system',
	'academic_reports',
	'academic_resources',
	'calendar_events',
	'class_management',

	// Financial Features
	'fee_payment',
	'financial_reports',

	// Student Features
	'admissions',

	// Communication & Support
	'support_system',
	'community',
	'notifications',

	// System Features
	'school_settings',
];

const academicPeriods = [
	'first',
	'second',
	'third',
	'third_period_exam',
	'fourth',
	'fifth',
	'sixth',
	'sixth_period_exam',
];

const semesters = ['first', 'second'];

// --- Sub-Schemas for nested objects ---

const StudentReportAccessYearSettingsSchema = new Schema(
	{
		enabled: { type: Boolean, required: true, default: false },
		yearlyReportAccess: { type: Boolean, required: true, default: false },
		periods: { type: [String], enum: academicPeriods, default: [] },
		semesters: { type: [String], enum: semesters, default: [] },
	},
	{ _id: false },
);

const StudentSettingsSchema = new Schema(
	{
		loginAccess: { type: Boolean, default: true },
		reportAccessByYear: {
			type: Map,
			of: StudentReportAccessYearSettingsSchema,
			default: {},
		},
	},
	{ _id: false },
);

const TeacherGradeSubmissionSettingsSchema = new Schema(
	{
		enabled: { type: Boolean, required: true, default: false },
		periods: { type: [String], enum: academicPeriods, default: [] },
	},
	{ _id: false },
);

const TeacherGradeChangeRequestSettingsSchema = new Schema(
	{
		enabled: { type: Boolean, required: true, default: false },
		periods: { type: [String], enum: academicPeriods, default: [] },
	},
	{ _id: false },
);

const TeacherViewGradeSubmissionsSettingsSchema = new Schema(
	{
		enabled: { type: Boolean, required: true, default: false },
	},
	{ _id: false },
);

const TeacherViewMastersSettingsSchema = new Schema(
	{
		enabled: { type: Boolean, required: true, default: false },
	},
	{ _id: false },
);

const TeacherPermissionsYearSettingsSchema = new Schema(
	{
		enabled: { type: Boolean, required: true, default: false },
		gradeSubmission: {
			type: TeacherGradeSubmissionSettingsSchema,
			required: true,
		},
		viewGradeSubmissions: {
			type: TeacherViewGradeSubmissionsSettingsSchema,
			required: true,
		},
		gradeChangeRequest: {
			type: TeacherGradeChangeRequestSettingsSchema,
			required: true,
		},
		viewMasters: {
			type: TeacherViewMastersSettingsSchema,
			required: true,
		},
	},
	{ _id: false },
);

const TeacherSettingsSchema = new Schema(
	{
		loginAccess: { type: Boolean, default: true },
		permissionsByYear: {
			type: Map,
			of: TeacherPermissionsYearSettingsSchema,
			default: {},
		},
	},
	{ _id: false },
);

const AdministratorSettingsSchema = new Schema(
	{
		loginAccess: { type: Boolean, default: true },
	},
	{ _id: false },
);

const SchoolSettingsSchema = new Schema(
	{
		studentSettings: {
			type: StudentSettingsSchema,
			required: true,
		},

		teacherSettings: {
			type: TeacherSettingsSchema,
			required: true,
		},

		administratorSettings: {
			type: AdministratorSettingsSchema,
			required: true,
		},

		gradingSettings: {
			type: Schema.Types.Mixed,
		},

		reportCardThemes: {
			type: Map,
			of: String,
			default: {},
		},
	},
	{ _id: false },
);

const SystemAdminSchema = new Schema(
	{
		name: { type: String, required: true, trim: true },
		phone: { type: String, required: true, trim: true },
		email: { type: String, trim: true },
	},
	{ _id: false },
);

const AdministrativePositionSchema = new Schema(
	{
		id: { type: String, required: true, trim: true },
		name: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

const RoleFeatureAccessSchema = new Schema(
	{
		student: {
			type: [String],
			enum: featureKeys,
			required: true,
			default: [],
		},

		teacher: {
			type: [String],
			enum: featureKeys,
			required: true,
			default: [],
		},

		system_admin: {
			type: [String],
			enum: featureKeys,
			required: true,
			default: [],
		},

		administrator: {
			type: Map,
			of: {
				type: [String],
				enum: featureKeys,
			},
			default: {},
		},
	},
	{ _id: false },
);

const SubjectSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},

		weight: {
			type: Number,
			required: true,
			default: 1,
		},
	},
	{ _id: false },
);

const ClassSchema = new Schema(
	{
		classId: {
			type: String,
			required: true,
			trim: true,
		},

		name: {
			type: String,
			required: true,
			trim: true,
		},

		feeGroup: {
			type: String,
			required: true,
			trim: true,
		},
	},
	{ _id: false },
);

const LevelSchema = new Schema(
	{
		isSelfContained: {
			type: Boolean,
			required: false,
			default: false,
		},

		classes: {
			type: [ClassSchema],
			required: true,
			default: [],
		},

		subjects: {
			type: [SubjectSchema],
			required: true,
			default: [],
		},
	},
	{ _id: false },
);

// --- Fee schedule sub-schemas ---

const FeeScheduleInstallmentSchema = new Schema(
	{
		label: { type: String, required: true, trim: true },
		dueWindow: { type: String, trim: true },
		old: { type: Number },
		new: { type: Number },
		amount: { type: Number },
	},
	{ _id: false },
);

const FeeScheduleRequirementSchema = new Schema(
	{
		item: { type: String, required: true, trim: true },
		amount: { type: Number, required: true },
		currency: { type: String, trim: true },
		dueAt: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

const FeeScheduleAccessorySchema = new Schema(
	{
		item: { type: String, required: true, trim: true },
		amount: { type: Number, required: true },
		dueAt: { type: String, required: true, trim: true },
		studentType: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

const FeeGroupSchema = new Schema(
	{
		label: { type: String, required: true, trim: true },
		appliesTo: { type: [String], required: true, default: [] },
		currency: { type: String, required: true, trim: true },

		tuitionAndRegistration: {
			type: Schema.Types.Mixed,
		},

		flatFees: {
			type: Schema.Types.Mixed,
		},

		installments: {
			type: [FeeScheduleInstallmentSchema],
			required: true,
			default: [],
		},

		requirements: {
			type: [FeeScheduleRequirementSchema],
		},

		accessories: {
			type: [FeeScheduleAccessorySchema],
		},

		extraClasses: {
			type: Schema.Types.Mixed,
		},
	},
	{ _id: false },
);

// --- Main School Profile Schema ---

const SchoolProfileSchema = new Schema<SchoolProfile & Document>(
	{
		// Basic school info
		isActive: {
			type: Boolean,
			required: true,
			default: true,
		},

		host: {
			type: String,
			required: true,
			trim: true,
		},

		dbName: {
			type: String,
			required: true,
			trim: true,
		},

		name: {
			type: String,
			required: true,
			trim: true,
		},

		slogan: {
			type: String,
			required: true,
			trim: true,
		},

		shortName: {
			type: String,
			required: true,
			trim: true,
		},

		initials: {
			type: String,
			required: true,
			trim: true,
		},

		studentIdPrefix: {
			type: String,
			required: true,
			trim: true,
		},

		logoUrl: {
			type: String,
			required: true,
			trim: true,
		},

		logoUrl2: {
			type: String,
			trim: true,
		},

		yearFounded: {
			type: Number,
		},

		firstAcademicYear: {
			type: String,
			required: true,
			trim: true,
		},

		currentAcademicYear: {
			type: String,
			required: true,
			trim: true,
		},

		administrativePositions: {
			type: [AdministrativePositionSchema],
			required: true,
			default: [],
		},

		sysAdmin: {
			type: SystemAdminSchema,
			required: true,
		},

		themeName: {
			type: String,
			enum: TENANT_THEME_NAMES,
			default: 'horizon',
		},

		// Features & Permissions
		enabledFeatures: {
			type: [String],
			enum: featureKeys,
			default: [],
		},

		roleFeatureAccess: {
			type: RoleFeatureAccessSchema,
			required: true,
		},

		// Settings
		settings: {
			type: SchoolSettingsSchema,
			required: true,
		},

		// Fee schedules
		feeSchedules: {
			type: Schema.Types.Mixed,
		},

		// Contact info
		address: {
			type: [String],
			default: [],
		},

		phones: {
			type: [String],
			default: [],
		},

		emails: {
			type: [String],
			default: [],
		},

		// Academic structure
		classLevels: {
			type: Map,
			of: {
				type: Map,
				of: LevelSchema,
			},
			default: {},
		},
	},
	{
		timestamps: true,
	},
);

export default SchoolProfileSchema;
