import type { TenantThemeName } from '@/types/tenantTheme';

// ============================================================================
// FEATURES
// ============================================================================

export type FeatureKey =
	// Core
	| 'dashboard'
	| 'user_management'
	| 'profile_management'
	| 'ai_chat'
	| 'homepage'
	| 'apps'
	| 'attendance'
	| 'teacher_attendance'
	// Academic
	| 'grading_system'
	| 'academic_reports'
	| 'academic_resources'
	| 'calendar_events'
	| 'class_management'
	// Financial
	| 'fee_payment'
	| 'financial_reports'
	// Student
	| 'admissions'
	// Communication & Support
	| 'support_system'
	| 'community'
	| 'notifications'
	// System
	| 'school_settings';

// Maps each role to the features it can access
export interface RoleFeatureAccess {
	readonly student: readonly FeatureKey[];
	readonly teacher: readonly FeatureKey[];
	readonly system_admin: readonly FeatureKey[];
}

// ============================================================================
// ACADEMIC STRUCTURE
// ============================================================================

export interface Subject {
	readonly name: string;
	readonly isMajorSubject?: boolean;
}

export interface Class {
	readonly classId: string;
	readonly name: string;
}

// One academic level, e.g. "Grade 1". isSelfContained = single teacher handles all subjects
export interface Level {
	readonly isSelfContained?: boolean;
	readonly classes: readonly Class[];
	readonly subjects: readonly Subject[];
}

// Levels within one session, keyed by level name e.g. "Grade 1"
export interface Session {
	readonly [levelName: string]: Level;
}

// Full class hierarchy. Outer key = session name e.g. "Morning", inner key = level name
export interface ClassLevels {
	readonly [sessionName: string]: Session;
}

// ============================================================================
// ACADEMIC PERIOD TYPES
// ============================================================================

export type AcademicPeriod =
	| 'first'
	| 'second'
	| 'third'
	| 'third_period_exam'
	| 'fourth'
	| 'fifth'
	| 'sixth'
	| 'sixth_period_exam';

export type Semester = 'first' | 'second';

// e.g. "2025-2026"
export type AcademicYear = string;

// ============================================================================
// USER SETTINGS
// ============================================================================

// Controls which report types a student can view for a given year
export interface StudentReportAccessYearSettings {
	readonly enabled: boolean;
	readonly yearlyReportAccess: boolean;
	readonly periods: readonly AcademicPeriod[];
	readonly semesters: readonly Semester[];
}

export interface StudentSettings {
	readonly loginAccess: boolean;
	readonly reportAccessByYear: Readonly<
		Record<AcademicYear, StudentReportAccessYearSettings>
	>;
}

export interface TeacherGradeSubmissionSettings {
	readonly enabled: boolean;
	readonly periods: readonly AcademicPeriod[];
}

export interface TeacherGradeChangeRequestSettings {
	readonly enabled: boolean;
	readonly periods: readonly AcademicPeriod[];
}

export interface TeacherViewGradeSubmissionsSettings {
	readonly enabled: boolean;
}

export interface TeacherViewMastersSettings {
	readonly enabled: boolean;
}

// Full teacher permission set for one academic year
export interface TeacherPermissionsYearSettings {
	readonly enabled: boolean;
	readonly gradeSubmission: TeacherGradeSubmissionSettings;
	readonly viewGradeSubmissions: TeacherViewGradeSubmissionsSettings;
	readonly gradeChangeRequest: TeacherGradeChangeRequestSettings;
	readonly viewMasters: TeacherViewMastersSettings;
}

export interface TeacherSettings {
	readonly loginAccess: boolean;
	readonly permissionsByYear: Readonly<
		Record<AcademicYear, TeacherPermissionsYearSettings>
	>;
}

export interface AdministratorSettings {
	readonly loginAccess: boolean;
}

export interface GradingSettings {
	readonly passMark: number;
	readonly gradeScale: { readonly min: number; readonly max: number };
	readonly hasSummerSchool: boolean;
	readonly givesDoublePromotion: boolean;
}

// ============================================================================
// SHARED VALUE TYPES
// ============================================================================

// Always use Money instead of loose { amount, currency } pairs
export interface Money {
	// Natural unit for the currency (e.g. dollars, not cents)
	readonly amount: number;
	// ISO 4217 code, e.g. "USD" or "LRD"
	readonly currency: string;
}

export interface CurrencyConfig {
	// ISO 4217 code
	readonly code: string;
	// e.g. "Liberian Dollar"
	readonly label: string;
	// e.g. "L$"
	readonly symbol: string;
	// Exactly one currency per school should have isDefault: true
	readonly isDefault: boolean;
}

// ============================================================================
// SCHOOL PROFILE — SYSTEM
// ============================================================================

// Infrastructure settings set at provisioning time; rarely change
export interface SchoolProfileSystem {
	readonly id: string;
	readonly isActive: boolean;
	// Hostname used to route requests to this tenant, e.g. "ucaliberia.vercel.app"
	readonly host: string;
	readonly dbName: string;
}

// ============================================================================
// SCHOOL PROFILE — IDENTITY
// ============================================================================

export interface SchoolProfileIdentity {
	// Full legal name, e.g. "Upstairs Christian Academy"
	readonly name: string;
	// Abbreviated name for space-constrained UI, e.g. "Upstairs Academy"
	readonly shortName: string;
	// Used in student IDs and compact displays, e.g. "UCA"
	readonly initials: string;
	readonly slogan: string;
	// Prepended to auto-generated student IDs, e.g. "UCA" → "UCA-2025-00123"
	readonly studentIdPrefix: string;
	readonly yearFounded?: number;
	// Lower bound for year-range selectors, e.g. "2021-2022"
	readonly firstAcademicYear: AcademicYear;
	// Must match a key in academicYearConfigs
	readonly currentAcademicYear: AcademicYear;
}

// ============================================================================
// SCHOOL PROFILE — BRANDING
// ============================================================================

export interface SchoolProfileBranding {
	readonly themeName?: TenantThemeName;
	// Primary logo — used in headers, PDFs, and public pages
	readonly logoUrl: string;
	// Secondary logo, e.g. seal or emblem
	readonly logoUrl2?: string;
	readonly reportCardThemes?: Readonly<Record<string, string>>;
}

// ============================================================================
// SCHOOL PROFILE — CONTACT
// ============================================================================

export interface SchoolAddress {
	// e.g. "Main Campus", "Administrative Office"
	readonly label?: string;
	// First element = street; subsequent = city, country, etc.
	readonly lines: readonly string[];
}

export interface SchoolProfileContact {
	readonly addresses: readonly SchoolAddress[];
	readonly phones: readonly string[];
	readonly emails: readonly string[];
	readonly website?: string;
}

// ============================================================================
// SCHOOL PROFILE — ACADEMIC CONFIG
// ============================================================================


export interface SchoolProfileAcademicConfig {
	readonly gradingSettings?: GradingSettings;
	readonly classLevels: ClassLevels;
}

// ============================================================================
// SCHOOL PROFILE — USER CONFIG
// ============================================================================

export interface SystemAdmin {
	readonly name: string;
	readonly phone: string;
	readonly email?: string;
}

// A named administrative position, e.g. "Principal", "Registrar"
export interface AdministrativePosition {
	// Stable ID used in role-feature access maps
	readonly id: string;
	readonly name: string;
}

export interface SchoolProfileUserConfig {
	readonly sysAdmin: SystemAdmin;
	readonly administrativePositions: readonly AdministrativePosition[];
	readonly studentSettings: StudentSettings;
	readonly teacherSettings: TeacherSettings;
	readonly administratorSettings: AdministratorSettings;
}

// ============================================================================
// SCHOOL PROFILE — FEATURE CONFIG
// ============================================================================

export interface SchoolProfileFeatureConfig {
	readonly enabledFeatures: readonly FeatureKey[];
	readonly roleFeatureAccess: RoleFeatureAccess;
}

// ============================================================================
// SCHOOL PROFILE — FINANCIAL CONFIG
// ============================================================================

export type FeeCategory =
	| 'tuition'
	| 'registration'
	| 'requirements'
	| 'facility'
	| 'accessories'
	| 'transport'
	| 'boarding'
	| 'library'
	| 'documents'
	| 'graduation'
	| 'other';

// Describes WHAT a fee is — identity only, not price. Prices live in FeeSchedule
export interface FeeDefinition {
	// Referenced by ScheduledFee.feeId
	readonly id: string;
	// e.g. "Tuition", "PTA Levy"
	readonly name: string;
	readonly category: FeeCategory;
	readonly description?: string;
	// Informational only — e.g. "Required", "Waivable", "Government"
	readonly flag?: string;
	// Soft-delete flag
	readonly isActive: boolean;
}

// One installment within a payment plan. Set percentage OR fixedAmount, not both
export interface PaymentInstallment {
	// e.g. "1st-semester", "upfront"
	readonly id: string;
	// e.g. "1st Semester", "Upfront Payment"
	readonly label: string;
	// 0–1; all installments in a plan should sum to 1. Mutually exclusive with fixedAmount
	readonly percentage?: number;
	// Fixed amount regardless of total. Mutually exclusive with percentage
	readonly fixedAmount?: Money;
	// Informational only, e.g. "Due by October 1"
	readonly dueWindow?: string;
}

// Reusable payment plan template, referenced by FeeGroup.paymentPlanId
export interface PaymentPlan {
	readonly id: string;
	// e.g. "Two-Semester Plan"
	readonly name: string;
	readonly description?: string;
	readonly installments: readonly PaymentInstallment[];
	readonly isActive: boolean;
}

// ============================================================================
// STUDENT GROUPS
// ============================================================================

export type RuleOperator =
	| 'equals'
	| 'notEquals'
	| 'contains'
	| 'notContains'
	| 'greaterThan'
	| 'lessThan'
	| 'greaterThanOrEquals'
	| 'lessThanOrEquals'
	| 'in'
	| 'notIn';

// A single predicate evaluated against a student field
// field uses dot-notation, e.g. "studentType", "sports", "parentStaffId"
export interface RuleCondition {
	readonly field: string;
	readonly operator: RuleOperator;
	// For 'in' / 'notIn' operators, pass an array
	readonly value: string | number | boolean | readonly (string | number)[];
}

// Rule-driven student grouping. Replaces hardcoded concepts like "New Student", "Teacher's Ward"
export interface StudentGroup {
	readonly id: string;
	// e.g. "New Students", "Teacher's Ward"
	readonly name: string;
	// Lower number = evaluated first when multiple groups match
	readonly priority: number;
	// All conditions must match (implicit AND). For OR logic, create separate groups
	readonly conditions: readonly RuleCondition[];
	readonly isActive: boolean;
}

// ============================================================================
// FINANCIAL CONFIG (assembled)
// ============================================================================

export interface SchoolProfileFinancialConfig {
	// Exactly one entry must have isDefault: true
	readonly currencies: readonly CurrencyConfig[];
	// Catalogue of fee types — no prices here, prices live in FeeSchedule
	readonly feeDefinitions: readonly FeeDefinition[];
	// Reusable payment plan templates referenced by FeeGroups
	readonly paymentPlans: readonly PaymentPlan[];
	// Reusable student group definitions referenced by ScheduledFees and FeeAdjustments
	readonly studentGroups: readonly StudentGroup[];
	// All fee schedules across every academic year
	// Look up the active year via: feeSchedules.find(s => s.academicYear === currentAcademicYear)
	readonly feeSchedules: readonly FeeSchedule[];
}

// ============================================================================
// ROOT SCHOOL PROFILE
// ============================================================================

export interface SchoolProfile {
	readonly system: SchoolProfileSystem;
	readonly identity: SchoolProfileIdentity;
	readonly branding: SchoolProfileBranding;
	readonly contact: SchoolProfileContact;
	readonly academicConfig: SchoolProfileAcademicConfig;
	readonly userConfig: SchoolProfileUserConfig;
	readonly featureConfig: SchoolProfileFeatureConfig;
	readonly financialConfig: SchoolProfileFinancialConfig;
}

export default SchoolProfile;

// ============================================================================
// FEE SCHEDULE
// Accessed via: SchoolProfile.financialConfig.feeSchedules.find(s => s.academicYear === year)
// ============================================================================

// One fee line item within a FeeGroup for a specific academic year
export interface ScheduledFee {
	// References FeeDefinition.id
	readonly feeId: string;
	readonly amount: Money;
	readonly isRequired: boolean;
	// References PaymentInstallment.id from the parent FeeGroup's plan. Null = due immediately
	readonly dueInstallmentId: string | null;
	// OR logic — empty array means applies to all students in the group
	readonly applicableStudentGroupIds: readonly string[];
}

// A pricing bundle for a subset of classes within a session
export interface FeeGroup {
	readonly id: string;
	// e.g. "Night Grade 7–9"
	readonly name: string;
	// Class.classId values from ClassLevels. A class may appear in only one FeeGroup per session
	readonly appliesToClassIds: readonly string[];
	// References PaymentPlan.id
	readonly paymentPlanId: string;
	readonly scheduledFees: readonly ScheduledFee[];
}

// Fee groups for one session, e.g. "Morning", "Night", "Weekend"
export interface SessionFeeSchedule {
	// Matches session keys in ClassLevels
	readonly sessionName: string;
	readonly feeGroups: readonly FeeGroup[];
}

// ============================================================================
// FEE ADJUSTMENT ACTIONS
// ============================================================================

export type FeeAdjustmentActionType =
	| 'percentage_discount'
	| 'fixed_discount'
	| 'fixed_price_override'
	| 'waive_fee'
	| 'add_fee';

interface FeeAdjustmentActionBase {
	readonly type: FeeAdjustmentActionType;
	// Null only for actions that operate across all fees in a group
	readonly feeId: string | null;
}

// Reduces a fee by a fraction of its scheduled amount, e.g. discountPercent: 0.5 = 50% off
export interface PercentageDiscountAction extends FeeAdjustmentActionBase {
	readonly type: 'percentage_discount';
	// 0 = no discount, 1 = full waiver
	readonly discountPercent: number;
}

// Subtracts a fixed amount from a scheduled fee
export interface FixedDiscountAction extends FeeAdjustmentActionBase {
	readonly type: 'fixed_discount';
	readonly discountAmount: Money;
}

// Replaces the scheduled fee entirely with a new price
export interface FixedPriceOverrideAction extends FeeAdjustmentActionBase {
	readonly type: 'fixed_price_override';
	readonly overrideAmount: Money;
}

// Removes a fee entirely — sets effective amount to zero
export interface WaiveFeeAction extends FeeAdjustmentActionBase {
	readonly type: 'waive_fee';
}

// Adds a fee not present in the base FeeGroup schedule, e.g. a boarding surcharge
export interface AddFeeAction extends FeeAdjustmentActionBase {
	readonly type: 'add_fee';
	readonly feeId: string;
	readonly amount: Money;
	// References PaymentInstallment.id from the target FeeGroup's plan
	readonly dueInstallmentId: string | null;
}

export type FeeAdjustmentAction =
	| PercentageDiscountAction
	| FixedDiscountAction
	| FixedPriceOverrideAction
	| WaiveFeeAction
	| AddFeeAction;

// ============================================================================
// FEE ADJUSTMENT RULES
// ============================================================================

// A rule-driven adjustment applied during invoice calculation.
// Stored per-year because adjustments are often year-specific (e.g. "2027 Jubilee Scholarship")
export interface FeeAdjustment {
	readonly id: string;
	// e.g. "Academic Excellence Scholarship", "Government Subsidy"
	readonly name: string;
	readonly description?: string;
	// Toggle without deleting
	readonly enabled: boolean;
	// Lower number = evaluated first when multiple adjustments match
	readonly priority: number;
	// false = only highest-priority match applied; true = stacks on top of other adjustments
	readonly isStackable: boolean;
	// All conditions must match (implicit AND). For OR logic, create separate FeeAdjustments
	readonly conditions: readonly RuleCondition[];
	readonly actions: readonly FeeAdjustmentAction[];
}

// ============================================================================
// ROOT FEE SCHEDULE
// ============================================================================

export interface FeeSchedule {
	// e.g. "2025-2026"
	readonly academicYear: AcademicYear;
	// Fee groups organised by session
	readonly sessionFeeSchedules: readonly SessionFeeSchedule[];
	// Year-specific adjustments: scholarships, subsidies, staff benefits, etc.
	readonly feeAdjustments: readonly FeeAdjustment[];
}
