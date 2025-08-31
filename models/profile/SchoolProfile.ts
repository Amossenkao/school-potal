import mongoose, { Schema, Document } from 'mongoose';
import { SchoolProfile, FeatureKey } from '@/types/schoolProfile';

// --- Enums and Constants ---
const featureKeys: FeatureKey[] = [
	'homepage',
	'dashboard',
	'user_management',
	'profile_management',
	'messages',
	'grading_system',
	'lesson_planning',
	'academic_reports',
	'academic_resources',
	'calendar_events',
	'class_management',
	'fee_payment',
	'salary_management',
	'financial_reports',
	'admissions',
	'scholarships',
	'student_records',
	'support_system',
	'notifications',
	'school_settings',
	'events_log',
];

// --- Sub-Schemas for nested objects ---

const StudentSettingsSchema = new Schema(
	{
		loginAccess: { type: Boolean, default: true },
		yearlyReportAccess: { type: Boolean, default: false },
		reportAccessPeriods: { type: [String], default: [] },
	},
	{ _id: false }
);

const TeacherSettingsSchema = new Schema(
	{
		loginAccess: { type: Boolean, default: true },
		gradeSubmissionPeriods: { type: [String], default: [] },
		gradeSubmissionAcademicYears: { type: [String], default: [] },
		viewMastersAcademicYears: { type: [String], default: [] },
		viewGradeSubmissionsAcademicYears: { type: [String], default: [] },
		gradeChangeRequestAcademicYears: { type: [String], default: [] },
		gradeChangeRequestPeriods: { type: [String], default: [] },
	},
	{ _id: false }
);

const AdministratorSettingsSchema = new Schema(
	{
		loginAccess: { type: Boolean, default: true },
	},
	{ _id: false }
);

const SchoolSettingsSchema = new Schema(
	{
		studentSettings: { type: StudentSettingsSchema, required: true },
		teacherSettings: { type: TeacherSettingsSchema, required: true },
		administratorSettings: {
			type: AdministratorSettingsSchema,
			required: true,
		},
	},
	{ _id: false }
);

const RoleFeatureAccessSchema = new Schema(
	{
		features: {
			type: [String],
			enum: featureKeys,
			required: true,
		},
		restrictions: {
			type: Map,
			of: [String],
			default: {},
		},
	},
	{ _id: false }
);

const BrandingSchema = new Schema(
	{
		primaryColor: { type: String },
		secondaryColor: { type: String },
		customCss: { type: String },
	},
	{ _id: false }
);

const CustomizationsSchema = new Schema(
	{
		theme: { type: String },
		branding: { type: BrandingSchema },
		modules: { type: Schema.Types.Mixed },
	},
	{ _id: false }
);

// --- Main School Profile Schema ---

const SchoolProfileSchema = new Schema<SchoolProfile & Document>(
	{
		// Basic school info
		host: { type: String, required: true },
		dbName: { type: String },
		name: { type: String, required: true, trim: true },
		slogan: { type: String, trim: true },
		shortName: { type: String, trim: true },
		initials: { type: String, trim: true },
		logoUrl: { type: String, trim: true },
		logoUrl2: { type: String, trim: true },
		description: { type: String, trim: true },
		heroImageUrl: { type: String, trim: true },
		tagline: { type: String, trim: true },
		yearFounded: { type: Number },

		// Features and Permissions
		enabledFeatures: {
			type: [String],
			enum: featureKeys,
			default: [],
		},
		roleFeatureAccess: {
			type: Map,
			of: RoleFeatureAccessSchema,
			default: {},
		},

		// Subscription/Plan info
		subscriptionPlan: {
			type: String,
			enum: ['basic', 'standard', 'premium', 'enterprise'],
			required: true,
		},
		subscriptionExpiry: { type: Date },

		// Custom configurations
		customizations: { type: CustomizationsSchema },

		// School-wide settings
		settings: { type: SchoolSettingsSchema },

		// Website/Profile content (using Mixed for flexibility)
		whyChoose: { type: [Schema.Types.Mixed], default: [] },
		facilities: { type: [Schema.Types.Mixed], default: [] },
		team: { type: [Schema.Types.Mixed], default: [] },
		quickLinks: { type: [Schema.Types.Mixed], default: [] },
		academicLinks: { type: [Schema.Types.Mixed], default: [] },
		footerLinks: { type: [Schema.Types.Mixed], default: [] },

		// Contact and location
		address: { type: [String], default: [] },
		phones: { type: [String], default: [] },
		emails: { type: [String], default: [] },
		hours: { type: [String], default: [] },

		// Academic structure (using Mixed due to deep and variable nesting)
		classLevels: { type: Schema.Types.Mixed, default: {} },
	},
	{
		timestamps: true,
	}
);

export default SchoolProfileSchema;
