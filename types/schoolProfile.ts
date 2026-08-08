import type { TenantThemeName } from '@/types/tenantTheme';
import type {FeatureKey} from "@/types"


// Maps each role to the features it can access
export interface RoleFeatureAccess {
	readonly student: readonly FeatureKey[];
	readonly teacher: readonly FeatureKey[];
	readonly system_admin: readonly FeatureKey[];
	readonly parent?: readonly FeatureKey[];
	readonly administrator?: Readonly<Record<string, readonly FeatureKey[]>>;
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
	// Global ordering across every session and level. Promotion/demotion follow
	// this index, so the class with index N+1 is the promotion target of index N.
	readonly index: number;
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

export interface ParentSettings {
	readonly loginAccess: boolean;
}

export type GradingRuleOperator = 'gte' | 'gt' | 'lte' | 'lt' | 'eq';

export interface GradingRuleComparison {
	readonly op: GradingRuleOperator;
	readonly value: number;
}

// A single pass/fail rule. A rule matches when the student's failed major count
// satisfies `majors` AND their failed minor count satisfies `minors`. Rules in
// an array are OR'd — the first matching rule in the array decides.
export interface GradingRule {
	readonly majors: GradingRuleComparison;
	readonly minors: GradingRuleComparison;
}

export interface GradingSettings {
	readonly passMark: number;
	readonly gradeScale: { readonly min: number; readonly max: number };
	readonly hasSummerSchool: boolean;
	readonly givesDoublePromotion: boolean;
	// Rule arrays evaluated against the student's failed major/minor counts.
	// Decision precedence: failureRules first, then summerSchoolRules (only when
	// hasSummerSchool is true). Students matching no rule at all are promoted.
	readonly failureRules: readonly GradingRule[];
	readonly summerSchoolRules: readonly GradingRule[];
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

export interface SchoolProfileContact {
	// Flat list of address lines, rendered in order (one per document line).
	readonly addresses: readonly string[];
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
	// True when the school's highest-index class is terminal (e.g. Grade 12) and
	// cannot be promoted to any other class. When false, students graduating the
	// last class are promoted to nextClassAfterLast instead.
	readonly isHighSchool?: boolean;
	// The class that graduates of the school's last class are promoted to when
	// isHighSchool is false. May reference a class in another school's profile,
	// so className is stored alongside the classId.
	readonly nextClassAfterLast?: { readonly classId: string; readonly className: string };
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
	readonly parentSettings?: ParentSettings;
}

// ============================================================================
// SCHOOL PROFILE — FEATURE CONFIG
// ============================================================================

export interface SchoolProfileFeatureConfig {
	readonly enabledFeatures: readonly FeatureKey[];
	readonly roleFeatureAccess: RoleFeatureAccess;
}

// ============================================================================
// PAYMENT CATEGORIES
// ============================================================================

export interface PaymentCategory {
	// Auto-generated from name (e.g. "tuition", "registration")
	readonly id: string;
	// User-defined (e.g. "Tuition", "Registration", "Lab Fees")
	readonly name: string;
}

// ============================================================================
// SCHOOL PROFILE — FINANCIAL CONFIG
// ============================================================================

// Describes WHAT a fee is — identity only, not price. Prices live in FeeSchedule
export interface FeeDefinition {
	// Referenced by ScheduledFee.feeId
	readonly id: string;
	// e.g. "Tuition", "PTA Levy"
	readonly name: string;
	// References PaymentCategory.id
	readonly category: string;
	readonly description?: string;
	// Informational only — e.g. "Required", "Waivable", "Government"
	readonly flag?: string;
	// Soft-delete flag
	readonly isActive: boolean;
}

// A school-wide installment (due milestone). Referenced by ScheduledFee.installments.
// Array order in financialConfig.installments determines due order.
export interface Installment {
	// e.g. "inst-1st", "upfront"
	readonly id: string;
	// e.g. "1st Installment", "Upfront Payment"
	readonly label: string;
	// Informational only, e.g. "Due by October 1"
	readonly dueWindow?: string;
}

// One split of a fee paid at a specific installment. Set percentage OR fixedAmount, not both
export interface FeeInstallment {
	// References Installment.id
	readonly installmentId: string;
	// 0–1 of the fee total. Mutually exclusive with fixedAmount
	readonly percentage?: number;
	// Fixed amount regardless of total. Mutually exclusive with percentage
	readonly fixedAmount?: Money;
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
	// School-defined fee categories — used by FeeDefinition and Scholarship
	readonly paymentCategories: readonly PaymentCategory[];
	// Catalogue of fee types — no prices here, prices live in FeeSchedule
	readonly feeDefinitions: readonly FeeDefinition[];
	// Reusable student group definitions referenced by ScheduledFees
	readonly studentGroups: readonly StudentGroup[];
	// School-wide installment catalog (ordered; array order = due order).
	// Referenced by ScheduledFee.installments[].installmentId
	readonly installments: readonly Installment[];
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
	// How the fee is split across Installment.id values. Empty array = due immediately (full amount).
	// The implied total (percentage × amount, or fixedAmount) must not exceed amount.
	readonly installments: readonly FeeInstallment[];
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
	readonly scheduledFees: readonly ScheduledFee[];
}

// Fee groups for one session, e.g. "Morning", "Night", "Weekend"
export interface SessionFeeSchedule {
	// Matches session keys in ClassLevels
	readonly sessionName: string;
	readonly feeGroups: readonly FeeGroup[];
}

// ============================================================================
// SCHOLARSHIPS
// ============================================================================

export interface Scholarship {
	readonly id: string;
	// e.g. "Academic Excellence Scholarship", "Proprietor's Ward"
	readonly name: string;
	readonly description?: string;
	readonly scholarshipType: 'fixedPayment' | 'fixedDeduction' | 'percentage';
	readonly amount: number;
	// ISO 4217 code, only applicable when scholarshipType is fixedPayment or fixedDeduction
	readonly currency?: string;
	// PaymentCategory.id[] — which categories this scholarship applies to. Empty = all categories
	readonly appliesTo: readonly string[];
	// How a fixedPayment scholarship's fixed amount is split across Installment.id values.
	// Mirrored onto the generated "{name} Payment" scheduled fee by the admin form.
	// Empty/absent = the full fixed amount is due at once.
	readonly installments?: readonly FeeInstallment[];
}

// ============================================================================
// ROOT FEE SCHEDULE
// ============================================================================

export interface FeeSchedule {
	// e.g. "2025-2026"
	readonly academicYear: AcademicYear;
	// Fee groups organised by session
	readonly sessionFeeSchedules: readonly SessionFeeSchedule[];
	// Year-specific scholarships, subsidies, staff benefits, etc.
	readonly scholarships: readonly Scholarship[];
}
