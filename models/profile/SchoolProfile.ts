import mongoose, { Schema, Document } from 'mongoose';
import { SchoolProfile } from '@/types/schoolProfile';
import { FEATURE_KEYS } from '@/types';
import { TENANT_THEME_NAMES } from '@/types/tenantTheme';



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

// ============================================================================
// SECTION 1 — SCHOOL PROFILE SUB-SCHEMAS
// ============================================================================

// ---------------------------------------------------------------------------
// 1.1 System
// ---------------------------------------------------------------------------

const SchoolProfileSystemSchema = new Schema(
	{
		isActive: { type: Boolean, required: true, default: true },
		host: { type: String, required: true, trim: true },
		dbName: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

// ---------------------------------------------------------------------------
// 1.2 Identity
// ---------------------------------------------------------------------------

const SchoolProfileIdentitySchema = new Schema(
	{
		name: { type: String, required: true, trim: true },
		shortName: { type: String, required: true, trim: true },
		initials: { type: String, required: true, trim: true },
		slogan: { type: String, required: true, trim: true },
		studentIdPrefix: { type: String, required: true, trim: true },
		yearFounded: { type: Number },
		firstAcademicYear: { type: String, required: true, trim: true },
		currentAcademicYear: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

// ---------------------------------------------------------------------------
// 1.3 Branding
// ---------------------------------------------------------------------------

const SchoolProfileBrandingSchema = new Schema(
	{
		themeName: {
			type: String,
			enum: TENANT_THEME_NAMES,
			default: TENANT_THEME_NAMES[0],
		},
		logoUrl: { type: String, default: '', trim: true },
		logoUrl2: { type: String, trim: true },
		reportCardThemes: {
			type: Map,
			of: String,
			default: {},
		},
	},
	{ _id: false },
);

// ---------------------------------------------------------------------------
// 1.4 Contact
// ---------------------------------------------------------------------------

const SchoolProfileContactSchema = new Schema(
	{
		addresses: { type: [String], required: true, default: [] },
		phones: { type: [String], default: [] },
		emails: { type: [String], default: [] },
		website: { type: String, trim: true },
	},
	{ _id: false },
);

// ---------------------------------------------------------------------------
// 1.5 Academic Configuration
// ---------------------------------------------------------------------------

const SubjectSchema = new Schema(
	{
		name: { type: String, required: true, trim: true },
		isMajorSubject: { type: Boolean },
	},
	{ _id: false },
);

const ClassSchema = new Schema(
	{
		classId: { type: String, required: true, trim: true },
		name: { type: String, required: true, trim: true },
		index: { type: Number, default: 0 },
	},
	{ _id: false },
);

const LevelSchema = new Schema(
	{
		isSelfContained: { type: Boolean, default: false },
		classes: { type: [ClassSchema], required: true, default: [] },
		subjects: { type: [SubjectSchema], required: true, default: [] },
	},
	{ _id: false },
);

// AcademicYearConfig only holds the year string now — fee schedule lives in financialConfig
const AcademicYearConfigSchema = new Schema(
	{
		academicYear: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

const GradingRuleSchema = new Schema(
	{
		maxMajor: { type: Number, required: true },
		maxMinor: { type: Number, required: true },
	},
	{ _id: false },
);

const GradingSettingsSchema = new Schema(
	{
		passMark: { type: Number, required: true },
		gradeScale: {
			min: { type: Number, required: true },
			max: { type: Number, required: true },
		},
		hasSummerSchool: { type: Boolean, required: true },
		givesDoublePromotion: { type: Boolean, required: true },
		promotionRules: { type: [GradingRuleSchema], default: [{ maxMajor: 0, maxMinor: 2 }] },
		failureRules: { type: [GradingRuleSchema], default: [{ maxMajor: 2, maxMinor: 0 }] },
		summerSchoolRules: { type: [GradingRuleSchema], default: [{ maxMajor: 1, maxMinor: 1 }] },
		// Legacy threshold fields kept for backward compatibility
		majorFailuresAllowed: { type: Number, default: 0 },
		minorFailuresAllowed: { type: Number, default: 2 },
		oneMajorWithMinorFailuresAllowed: { type: Number, default: 1 },
	},
	{ _id: false },
);

const NextClassAfterLastSchema = new Schema(
	{
		classId: { type: String, required: true, trim: true },
		className: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

const SchoolProfileAcademicConfigSchema = new Schema(
	{
		gradingSettings: { type: GradingSettingsSchema },
		isHighSchool: { type: Boolean, default: false },
		nextClassAfterLast: { type: NextClassAfterLastSchema, default: null },
		// Outer key: session name; inner key: level name → LevelSchema
		classLevels: {
			type: Map,
			of: {
				type: Map,
				of: LevelSchema,
			},
			default: {},
		},
		// Keyed by academic year string, e.g. "2025-2026"
		academicYearConfigs: {
			type: Map,
			of: AcademicYearConfigSchema,
			default: {},
		},
	},
	{ _id: false },
);

// ---------------------------------------------------------------------------
// 1.6 User Configuration
// ---------------------------------------------------------------------------

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

const ParentSettingsSchema = new Schema(
	{
		loginAccess: { type: Boolean, default: true },
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

const SchoolProfileUserConfigSchema = new Schema(
	{
		sysAdmin: { type: SystemAdminSchema, required: true },
		administrativePositions: {
			type: [AdministrativePositionSchema],
			required: true,
			default: [],
		},
		studentSettings: { type: StudentSettingsSchema, required: true },
		teacherSettings: { type: TeacherSettingsSchema, required: true },
		administratorSettings: {
			type: AdministratorSettingsSchema,
			required: true,
		},
		parentSettings: {
			type: ParentSettingsSchema,
			required: true,
			default: () => ({ loginAccess: true }),
		},
	},
	{ _id: false },
);

// ---------------------------------------------------------------------------
// 1.7 Feature Configuration
// ---------------------------------------------------------------------------

const RoleFeatureAccessSchema = new Schema(
	{
		student: { type: [String], enum: FEATURE_KEYS, required: true, default: [] },
		teacher: { type: [String], enum: FEATURE_KEYS, required: true, default: [] },
		system_admin: {
			type: [String],
			enum: FEATURE_KEYS,
			required: true,
			default: [],
		},
		administrator: { type: Schema.Types.Mixed, default: {} },
		parent: { type: [String], enum: FEATURE_KEYS, default: [] },
	},
	{ _id: false },
);

const SchoolProfileFeatureConfigSchema = new Schema(
	{
		enabledFeatures: { type: [String], enum: FEATURE_KEYS, default: [] },
		roleFeatureAccess: { type: RoleFeatureAccessSchema, required: true },
	},
	{ _id: false },
);

// ---------------------------------------------------------------------------
// 1.8 Financial Configuration — permanent definitions
// ---------------------------------------------------------------------------

const CurrencyConfigSchema = new Schema(
	{
		code: { type: String, required: true, trim: true },
		label: { type: String, required: true, trim: true },
		symbol: { type: String, required: true, trim: true },
		isDefault: { type: Boolean, required: true, default: false },
	},
	{ _id: false },
);

const FeeDefinitionSchema = new Schema(
	{
		id: { type: String, required: true, trim: true },
		name: { type: String, required: true, trim: true },
		category: { type: String, required: true, trim: true },
		description: { type: String, trim: true },
		flag: { type: String, trim: true },
		isActive: { type: Boolean, required: true, default: true },
	},
	{ _id: false },
);

const MoneySchema = new Schema(
	{
		amount: { type: Number, required: true },
		currency: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

// A school-wide installment (due milestone) referenced by ScheduledFee.installments
const InstallmentSchema = new Schema(
	{
		id: { type: String, required: true, trim: true },
		label: { type: String, required: true, trim: true },
		dueWindow: { type: String, trim: true },
	},
	{ _id: false },
);

const RuleConditionSchema = new Schema(
	{
		field: { type: String, required: true, trim: true },
		operator: {
			type: String,
			required: true,
			enum: [
				'equals',
				'notEquals',
				'contains',
				'notContains',
				'greaterThan',
				'lessThan',
				'greaterThanOrEquals',
				'lessThanOrEquals',
				'in',
				'notIn',
			],
		},
		// Mixed to accommodate string | number | boolean | array
		value: { type: Schema.Types.Mixed, required: true },
	},
	{ _id: false },
);

const StudentGroupSchema = new Schema(
	{
		id: { type: String, required: true, trim: true },
		name: { type: String, required: true, trim: true },
		priority: { type: Number, required: true, default: 0 },
		conditions: { type: [RuleConditionSchema], required: true, default: [] },
		isActive: { type: Boolean, required: true, default: true },
	},
	{ _id: false },
);

// ============================================================================
// SECTION 2 — FEE SCHEDULE SUB-SCHEMAS
// Embedded inside SchoolProfileFinancialConfig as an array of FeeSchedule docs,
// one per academic year.
// ============================================================================

const FeeInstallmentSchema = new Schema(
	{
		installmentId: { type: String, required: true, trim: true },
		// Mutually exclusive: set percentage OR fixedAmount, not both
		percentage: { type: Number, min: 0, max: 1 },
		fixedAmount: { type: MoneySchema },
	},
	{ _id: false },
);

const ScheduledFeeSchema = new Schema(
	{
		feeId: { type: String, required: true, trim: true },
		amount: { type: MoneySchema, required: true },
		isRequired: { type: Boolean, required: true, default: true },
		// How the fee is split across Installment.id values. Empty = due immediately (full amount).
		// The implied total (percentage × amount, or fixedAmount) must not exceed the fee amount.
		installments: {
			type: [FeeInstallmentSchema],
			default: [],
			validate: {
				validator: function (value: any[]) {
					const feeAmount = (this as any).amount?.amount;
					if (feeAmount == null || !Array.isArray(value)) return true;
					const total = value.reduce((sum: number, entry: any) => {
						if (!entry) return sum;
						if (entry.fixedAmount?.amount != null) {
							return sum + (Number(entry.fixedAmount.amount) || 0);
						}
						return sum + (Number(entry.percentage) || 0) * feeAmount;
					}, 0);
					return total <= feeAmount + 0.000001;
				},
				message: 'Total of all installments cannot exceed the fee amount.',
			},
		},
		// Empty array = applies to all students in the group
		applicableStudentGroupIds: { type: [String], default: [] },
	},
	{ _id: false },
);

const FeeGroupSchema = new Schema(
	{
		id: { type: String, required: true, trim: true },
		name: { type: String, required: true, trim: true },
		appliesToClassIds: { type: [String], required: true, default: [] },
		scheduledFees: { type: [ScheduledFeeSchema], required: true, default: [] },
	},
	{ _id: false },
);

const SessionFeeScheduleSchema = new Schema(
	{
		sessionName: { type: String, required: true, trim: true },
		feeGroups: { type: [FeeGroupSchema], required: true, default: [] },
	},
	{ _id: false },
);

const ScholarshipSchema = new Schema(
	{
		id: { type: String, required: true, trim: true },
		name: { type: String, required: true, trim: true },
		description: { type: String, trim: true },
		scholarshipType: { type: String, required: true, enum: ['fixedPayment', 'fixedDeduction', 'percentage'] },
		amount: { type: Number, required: true },
		currency: { type: String, trim: true },
		appliesTo: { type: [String], required: true, default: [] },
		// How a fixedPayment scholarship's amount is split across installments.
		// Mirrored onto the generated "{name} Payment" scheduled fee by the admin form.
		installments: { type: [FeeInstallmentSchema], default: [] },
	},
	{ _id: false },
);

const FeeScheduleSchema = new Schema(
	{
		academicYear: { type: String, required: true, trim: true },
		sessionFeeSchedules: {
			type: [SessionFeeScheduleSchema],
			required: true,
			default: [],
		},
		scholarships: {
			type: [ScholarshipSchema],
			required: true,
			default: [],
		},
	},
	{ _id: false },
);

// ---------------------------------------------------------------------------
// 1.8 Financial Configuration (assembled)
// ---------------------------------------------------------------------------

const PaymentCategorySchema = new Schema(
	{
		id: { type: String, required: true, trim: true },
		name: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

const SchoolProfileFinancialConfigSchema = new Schema(
	{
		currencies: { type: [CurrencyConfigSchema], required: true, default: [] },
		paymentCategories: {
			type: [PaymentCategorySchema],
			required: true,
			default: [],
		},
		feeDefinitions: {
			type: [FeeDefinitionSchema],
			required: true,
			default: [],
		},
		installments: { type: [InstallmentSchema], required: true, default: [] },
		studentGroups: { type: [StudentGroupSchema], required: true, default: [] },
		feeSchedules: { type: [FeeScheduleSchema], required: true, default: [] },
	},
	{ _id: false },
);

// ============================================================================
// ROOT SCHOOL PROFILE SCHEMA
// ============================================================================

const SchoolProfileSchema = new Schema<SchoolProfile & Document>(
	{
		system: { type: SchoolProfileSystemSchema, required: true },
		identity: { type: SchoolProfileIdentitySchema, required: true },
		branding: { type: SchoolProfileBrandingSchema, required: true },
		contact: { type: SchoolProfileContactSchema, required: true },
		academicConfig: { type: SchoolProfileAcademicConfigSchema, required: true },
		userConfig: { type: SchoolProfileUserConfigSchema, required: true },
		featureConfig: { type: SchoolProfileFeatureConfigSchema, required: true },
		financialConfig: {
			type: SchoolProfileFinancialConfigSchema,
			required: true,
		},
	},
	{
		timestamps: true,
	},
);

export default SchoolProfileSchema;
