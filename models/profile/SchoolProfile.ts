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
	'enrollment_info',
	'apps',
	'attendance',

	// Academic Features
	'grading_system',
	'academic_reports',
	'academic_resources',
	'calendar_events',
	'class_management',
	'digital_signatures',

	// Financial Features
	'fee_payment',
	'salary_management',
	'financial_reports',
	'financial_profile',
	'scholarships_and_wards',
	'payroll_management',
	'receipts_and_clearances',

	// Student Features
	'admissions',
	'student_records',
	'information_sheet',
	'online_verification',
	'document_requests',

	// Communication & Support
	'support_system',
	'community',
	'notifications',

	// System Features
	'school_settings',
	'school_profile',
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

const schoolLevels = ['Elementary', 'Junior High', 'Senior High'];

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

const GradingSettingsSchema = new Schema(
	{
		passMark: { type: Number, required: true, default: 70 },

		gradeScale: {
			min: { type: Number, required: true, default: 60 },
			max: { type: Number, required: true, default: 100 },
		},

		summerSchoolWeight: { type: Number },

		failuerWeight: {
			type: Number,
			required: true,
			default: 0.5,
		},

		givesDoublePromotion: {
			type: Boolean,
			required: true,
			default: false,
		},

		givesDemotion: {
			type: Boolean,
			required: true,
			default: false,
		},
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
			type: GradingSettingsSchema,
			required: true,
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
		office: { type: String, required: true, trim: true },
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

		isMajorSubject: {
			type: Boolean,
			required: false,
			default: false,
		},
	},
	{ _id: false },
);

const ImagesSchema = new Schema(
	{
		logoUrl: {
			type: String,
			required: true,
		},

		logoUrl2: {
			type: String,
			required: false,
		},

		pwaIcon: {
			type: String,
			required: false,
		},

		loadingSpinnerIcon: {
			type: String,
			required: false,
		},

		semesterReportWatermark: {
			type: String,
			required: false,
		},

		yearlyReportWatermark: {
			type: String,
			required: false,
		},

		yearlyReportWatermark2: {
			type: String,
			required: false,
		},
	},
	{ _id: false },
);

const FeeSchema = new Schema(
	{
		feeType: {
			type: String,
			required: true,
			trim: true,
		},

		category: {
			type: String,
			required: true,
			trim: true,
		},

		requiredAmount: {
			type: Number,
			required: true,
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

		isSelfContained: {
			type: Boolean,
			required: false,
			default: false,
		},

		fees: {
			type: [FeeSchema],
			required: true,
			default: [],
		},
	},
	{ _id: false },
);

const LevelSchema = new Schema(
	{
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
			type: [String],
			required: true,
			default: [],
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

		highestLevel: {
			type: String,
			required: true,
			trim: true,
			enum: schoolLevels,
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

		images: {
			type: ImagesSchema,
			required: true,
		},

		yearFounded: {
			type: Number,
			required: true,
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

		financialProfile: {
			type: Schema.Types.Mixed,
			default: {},
		},

		// Settings
		settings: {
			type: SchoolSettingsSchema,
			required: true,
		},

		themeName: {
			type: String,
			enum: TENANT_THEME_NAMES,
			default: 'horizon',
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
