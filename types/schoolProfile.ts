/**
 * @file schoolMeshTypes.ts
 * @description Enterprise-grade type definitions for SchoolMesh — a multi-tenant
 * school management platform. Covers the full SchoolProfile configuration model
 * and the separate FeeSchedule model for per-academic-year pricing.
 *
 * Design principles:
 *  - Configuration over code: no hardcoded fee names, student groups, or billing logic
 *  - Data-driven: schools extend behaviour by adding records, not changing code
 *  - Separation of concerns: permanent config (SchoolProfile) vs yearly pricing (FeeSchedule)
 *  - Strong typing with JSDoc on every exported symbol
 *  - MongoDB-serialisable (plain objects, string IDs, no circular refs)
 *  - Backward-compatible with the existing FeatureKey / RoleFeatureAccess / ClassLevels surface
 */

// ============================================================================
// RE-EXPORTED EXISTING TYPES (unchanged from current codebase)
// ============================================================================

import type { TenantThemeName } from '@/types/tenantTheme';

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

/** Union of every known feature key in SchoolMesh. Extend as new modules ship. */
export type FeatureKey =
	// Core Features
	| 'dashboard'
	| 'user_management'
	| 'profile_management'
	| 'ai_chat'
	| 'homepage'
	| 'apps'
	| 'attendance'
	| 'teacher_attendance'
	// Academic Features
	| 'grading_system'
	| 'academic_reports'
	| 'academic_resources'
	| 'calendar_events'
	| 'class_management'
	// Financial Features
	| 'fee_payment'
	| 'financial_reports'
	// Student Features
	| 'admissions'
	// Communication & Support
	| 'support_system'
	| 'community'
	| 'notifications'
	// System Features
	| 'school_settings';

/**
 * Maps each role to the set of features it may access.
 * Administrator positions are keyed by their position ID for fine-grained control.
 */
export interface RoleFeatureAccess {
	readonly student: readonly FeatureKey[];
	readonly teacher: readonly FeatureKey[];
	readonly system_admin: readonly FeatureKey[];
}

// ---------------------------------------------------------------------------
// Academic structure (classes / levels)
// ---------------------------------------------------------------------------

/** A single subject offered within a level. */
export interface Subject {
	readonly name: string;
	readonly isMajorSubject?: boolean;
}

/** One class within a level (e.g. "Grade 1A"). */
export interface Class {
	readonly classId: string;
	readonly name: string;
	/**
	 * References a FeeGroup.id within the active FeeSchedule.
	 * Kept as a string reference so FeeGroups can change per year.
	 */
	readonly feeGroup: string;
}

/** One academic level (e.g. "Grade 1"), optionally self-contained. */
export interface Level {
	/** True for self-contained classrooms (single teacher handles all subjects). */
	readonly isSelfContained?: boolean;
	readonly classes: readonly Class[];
	readonly subjects: readonly Subject[];
}

/** One session's worth of levels, keyed by level name (e.g. "Grade 1"). */
export interface Session {
	readonly [levelName: string]: Level;
}

/**
 * Full class-level hierarchy for the school.
 * Outer key is session name (e.g. "Morning", "Night").
 */
export interface ClassLevels {
	readonly [sessionName: string]: Session;
}

// ---------------------------------------------------------------------------
// Academic period types
// ---------------------------------------------------------------------------

/**
 * A discrete grading period within an academic year.
 * Extend the union as the school's calendar requires.
 */
export type AcademicPeriod =
	| 'first'
	| 'second'
	| 'third'
	| 'third_period_exam'
	| 'fourth'
	| 'fifth'
	| 'sixth'
	| 'sixth_period_exam';

/** Semester within an academic year. */
export type Semester = 'first' | 'second';

/**
 * An academic year identifier string, e.g. "2025-2026".
 * Kept as a branded string type for clarity; use AcademicYear everywhere
 * rather than raw `string` so the intent is self-documenting.
 */
export type AcademicYear = string;

// ---------------------------------------------------------------------------
// User settings (student / teacher / administrator) — unchanged
// ---------------------------------------------------------------------------

/** Per-year settings controlling which report types a student can view. */
export interface StudentReportAccessYearSettings {
	readonly enabled: boolean;
	readonly yearlyReportAccess: boolean;
	readonly periods: readonly AcademicPeriod[];
	readonly semesters: readonly Semester[];
}

/** Student access configuration, indexed by academic year. */
export interface StudentSettings {
	readonly loginAccess: boolean;
	readonly reportAccessByYear: Readonly<
		Record<AcademicYear, StudentReportAccessYearSettings>
	>;
}

/** Controls which periods a teacher may submit grades for. */
export interface TeacherGradeSubmissionSettings {
	readonly enabled: boolean;
	readonly periods: readonly AcademicPeriod[];
}

/** Controls which periods a teacher may raise grade-change requests for. */
export interface TeacherGradeChangeRequestSettings {
	readonly enabled: boolean;
	readonly periods: readonly AcademicPeriod[];
}

/** Whether a teacher can view all submitted grade masters. */
export interface TeacherViewGradeSubmissionsSettings {
	readonly enabled: boolean;
}

/** Whether a teacher can view master grade sheets. */
export interface TeacherViewMastersSettings {
	readonly enabled: boolean;
}

/** Full permission set for teachers, scoped to one academic year. */
export interface TeacherPermissionsYearSettings {
	readonly enabled: boolean;
	readonly gradeSubmission: TeacherGradeSubmissionSettings;
	readonly viewGradeSubmissions: TeacherViewGradeSubmissionsSettings;
	readonly gradeChangeRequest: TeacherGradeChangeRequestSettings;
	readonly viewMasters: TeacherViewMastersSettings;
}

/** Teacher access and permissions, indexed by academic year. */
export interface TeacherSettings {
	readonly loginAccess: boolean;
	readonly permissionsByYear: Readonly<
		Record<AcademicYear, TeacherPermissionsYearSettings>
	>;
}

/** Top-level settings for administrative staff accounts. */
export interface AdministratorSettings {
	readonly loginAccess: boolean;
}

/** Grade-scale and promotion configuration. */
export interface GradingSettings {
	readonly passMark: number;
	readonly gradeScale: { readonly min: number; readonly max: number };
	readonly hasSummerSchool: boolean;
	readonly givesDoublePromotion: boolean;
}

// ============================================================================
// SHARED VALUE TYPES
// ============================================================================

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/**
 * A typed monetary value. Always use `Money` instead of scattering
 * `{ amount: number; currency: string }` pairs across the codebase.
 *
 * @example
 * const fee: Money = { amount: 20000, currency: 'LRD' };
 */
export interface Money {
	/** Numeric amount in the smallest natural unit for this currency (e.g. dollars, not cents). */
	readonly amount: number;
	/** ISO 4217 currency code, e.g. "USD" or "LRD". */
	readonly currency: string;
}

// ---------------------------------------------------------------------------
// Currency configuration
// ---------------------------------------------------------------------------

/** Configuration for one currency supported by the school. */
export interface CurrencyConfig {
	/** ISO 4217 code. */
	readonly code: string;
	/** Human-readable label, e.g. "Liberian Dollar". */
	readonly label: string;
	/** Symbol shown in the UI, e.g. "L$". */
	readonly symbol: string;
	/** If true, this is used as the default when no currency is specified. Exactly one should be true. */
	readonly isDefault: boolean;
}

// ============================================================================
// SECTION 1 — SCHOOL PROFILE
// ============================================================================

// ---------------------------------------------------------------------------
// 1.1 System
// ---------------------------------------------------------------------------

/**
 * Low-level infrastructure settings for the tenant.
 * These are set at provisioning time and almost never change.
 */
export interface SchoolProfileSystem {
	/** Unique tenant identifier (MongoDB ObjectId string or slug). */
	readonly id: string;
	/** Whether this school is active and accessible. */
	readonly isActive: boolean;
	/**
	 * Hostname used to route requests to this tenant,
	 * e.g. "ucaliberia.vercel.app".
	 */
	readonly host: string;
	/** MongoDB database name for this tenant's data. */
	readonly dbName: string;
}

// ---------------------------------------------------------------------------
// 1.2 Identity
// ---------------------------------------------------------------------------

/**
 * Core identifying information about the school.
 * Changes very rarely — only on legal name changes, rebranding, etc.
 */
export interface SchoolProfileIdentity {
	/** Full legal name, e.g. "Upstairs Christian Academy". */
	readonly name: string;
	/** Abbreviated name used in space-constrained UI, e.g. "Upstairs Academy". */
	readonly shortName: string;
	/** Initials used in student IDs and compact displays, e.g. "UCA". */
	readonly initials: string;
	/** School motto or tagline. */
	readonly slogan: string;
	/**
	 * Prefix prepended to auto-generated student IDs.
	 * Example: "UCA" → "UCA-2025-00123".
	 */
	readonly studentIdPrefix: string;
	/** Calendar year the school was established. */
	readonly yearFounded?: number;
	/**
	 * The first academic year for which SchoolMesh has records,
	 * e.g. "2021-2022". Used as the lower bound in year-range selectors.
	 */
	readonly firstAcademicYear: AcademicYear;
	/**
	 * The academic year currently in session.
	 * Must match a key in `academicYearConfigs`.
	 */
	readonly currentAcademicYear: AcademicYear;
}

// ---------------------------------------------------------------------------
// 1.3 Branding
// ---------------------------------------------------------------------------

/** Branding and visual identity assets. */
export interface SchoolProfileBranding {
	/** Active UI theme name applied across the tenant. */
	readonly themeName?: TenantThemeName;
	/** Primary logo — used in headers, PDFs, and public pages. */
	readonly logoUrl: string;
	/** Secondary / alternate logo (e.g. seal or emblem). */
	readonly logoUrl2?: string;
	readonly reportCardThemes?: Readonly<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// 1.4 Contact
// ---------------------------------------------------------------------------

/** Physical or mailing address block. */
export interface SchoolAddress {
	/** Optional label, e.g. "Main Campus", "Administrative Office". */
	readonly label?: string;
	/** Address lines; first element is street, subsequent for city/country etc. */
	readonly lines: readonly string[];
}

/** Contact information for the school. */
export interface SchoolProfileContact {
	readonly addresses: readonly SchoolAddress[];
	readonly phones: readonly string[];
	readonly emails: readonly string[];
	readonly website?: string;
}

// ---------------------------------------------------------------------------
// 1.5 Academic Configuration
// ---------------------------------------------------------------------------

/**
 * A reference tying an academic year to its calendar and pricing schedule.
 * Stored as IDs so the linked documents remain independently versioned.
 */
export interface AcademicYearConfig {
	/** The academic year this config covers, e.g. "2025-2026". */
	readonly academicYear: AcademicYear;
	/**
	 * Foreign key → CalendarEvent collection (or calendar config document).
	 * Null if the calendar has not yet been published for this year.
	 */
	readonly calendarId: string | null;
	/**
	 * Foreign key → FeeSchedule.id for this academic year.
	 * Null before the fee schedule is approved.
	 */
	readonly feeScheduleId: string | null;
}

/** School-wide academic structure and calendar linkage. */
export interface SchoolProfileAcademicConfig {
	readonly gradingSettings?: GradingSettings;
	readonly classLevels: ClassLevels;
	/**
	 * One entry per academic year the school has operated on SchoolMesh.
	 * Keyed by academic year string for O(1) lookup.
	 */
	readonly academicYearConfigs: Readonly<
		Record<AcademicYear, AcademicYearConfig>
	>;
}

// ---------------------------------------------------------------------------
// 1.6 User Configuration
// ---------------------------------------------------------------------------

/** System administrator contact and identity. */
export interface SystemAdmin {
	readonly name: string;
	readonly phone: string;
	readonly email?: string;
}

/** A named administrative position (e.g. "Principal", "Registrar"). */
export interface AdministrativePosition {
	/** Stable identifier used in role-feature access maps. */
	readonly id: string;
	/** Display name shown in the UI. */
	readonly name: string;
}

/** All user-related configuration for the school. */
export interface SchoolProfileUserConfig {
	readonly sysAdmin: SystemAdmin;
	readonly administrativePositions: readonly AdministrativePosition[];
	readonly studentSettings: StudentSettings;
	readonly teacherSettings: TeacherSettings;
	readonly administratorSettings: AdministratorSettings;
}

// ---------------------------------------------------------------------------
// 1.7 Feature Configuration
// ---------------------------------------------------------------------------

/** Controls which features are available to which roles. */
export interface SchoolProfileFeatureConfig {
	/** Full list of features enabled for this school. */
	readonly enabledFeatures: readonly FeatureKey[];
	/** Per-role feature access gates. */
	readonly roleFeatureAccess: RoleFeatureAccess;
}

// ---------------------------------------------------------------------------
// 1.8 Financial Configuration (permanent, no yearly pricing)
// ---------------------------------------------------------------------------

/**
 * Category of a fee. Extend as new categories emerge without touching
 * existing FeeDefinitions.
 *
 * @example 'tuition' | 'registration' | 'activity' | 'facility' | 'other'
 */
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

/**
 * Describes WHAT a fee is — its identity, not its price.
 * Pricing lives in FeeSchedule.ScheduledFee.
 *
 * FeeDefinitions are reusable across academic years.
 */
export interface FeeDefinition {
	/** Stable unique identifier referenced by ScheduledFee.feeId. */
	readonly id: string;
	/** Human-readable fee name, e.g. "Tuition", "PTA Levy". */
	readonly name: string;
	/** Broad classification used for grouping in reports and UI. */
	readonly category: FeeCategory;
	/** Optional longer description for administrative clarity. */
	readonly description?: string;
	/**
	 * Optional short flag or label surfaced in the UI (e.g. "Required",
	 * "Waivable", "Government"). Not used in fee logic; purely informational.
	 */
	readonly flag?: string;
	/** Whether this definition is currently in use. Soft-delete pattern. */
	readonly isActive: boolean;
}

// ---------------------------------------------------------------------------
// Payment Plans
// ---------------------------------------------------------------------------

/**
 * One installment within a payment plan.
 * Exactly one of `percentage` or `fixedAmount` should be set — not both.
 */
export interface PaymentInstallment {
	/** Stable identifier, e.g. "1st-semester", "upfront". */
	readonly id: string;
	/** Display label, e.g. "1st Semester", "Upfront Payment". */
	readonly label: string;
	/**
	 * Share of the total amount due at this installment.
	 * Value between 0 and 1. Percentages across all installments should sum to 1.
	 * Mutually exclusive with `fixedAmount`.
	 */
	readonly percentage?: number;
	/**
	 * A fixed monetary amount due at this installment regardless of total.
	 * Mutually exclusive with `percentage`.
	 */
	readonly fixedAmount?: Money;
	/**
	 * Human-readable window description, e.g. "Due by October 1".
	 * Informational only; enforcement logic lives in the billing module.
	 */
	readonly dueWindow?: string;
}

/**
 * A reusable payment plan template.
 * Referenced by FeeGroup.paymentPlanId within a FeeSchedule.
 *
 * Examples: "One Payment", "Two Installments", "Monthly".
 */
export interface PaymentPlan {
	/** Stable unique identifier. */
	readonly id: string;
	/** Display name, e.g. "Two-Semester Plan". */
	readonly name: string;
	/** Optional description for administrative reference. */
	readonly description?: string;
	/** Ordered installment breakdown. */
	readonly installments: readonly PaymentInstallment[];
	/** Whether this plan is offered to new enrolments. */
	readonly isActive: boolean;
}

// ---------------------------------------------------------------------------
// Student Groups (rule-based, replaces hardcoded new/old/scholarship/etc.)
// ---------------------------------------------------------------------------

/** Comparison operators for rule conditions. */
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

/**
 * A single predicate evaluated against an arbitrary student field.
 *
 * @example
 * // Matches returning students
 * { field: 'studentType', operator: 'equals', value: 'returning' }
 *
 * @example
 * // Matches students in a sport
 * { field: 'sports', operator: 'contains', value: 'kickball' }
 */
export interface RuleCondition {
	/**
	 * Dot-notation path into the student document.
	 * Examples: "studentType", "gender", "sports", "boarding", "parentStaffId".
	 */
	readonly field: string;
	readonly operator: RuleOperator;
	/**
	 * The value to compare against. For `in` / `notIn` operators, pass an array.
	 */
	readonly value: string | number | boolean | readonly (string | number)[];
}

/**
 * A named, reusable grouping of students driven entirely by rules.
 * Replaces all hardcoded concepts such as "New Student", "Teacher's Ward",
 * "Scholarship Student", "Kickball Team", etc.
 *
 * StudentGroups are defined in SchoolProfile and referenced by ScheduledFee
 * and FeeAdjustment within FeeSchedule.
 */
export interface StudentGroup {
	/** Stable unique identifier. */
	readonly id: string;
	/** Human-readable name, e.g. "New Students", "Teacher's Ward". */
	readonly name: string;
	/**
	 * Evaluation priority when multiple groups match.
	 * Lower number = evaluated first. Used to resolve conflicts in fee logic.
	 */
	readonly priority: number;
	/**
	 * All conditions must be satisfied for a student to belong to this group
	 * (implicit AND). For OR logic, create separate StudentGroups.
	 */
	readonly conditions: readonly RuleCondition[];
	/** Soft-delete flag. */
	readonly isActive: boolean;
}

// ---------------------------------------------------------------------------
// 1.8 (assembled) Financial Configuration
// ---------------------------------------------------------------------------

/**
 * Permanent financial configuration for the school.
 * Contains reusable definitions only — NO yearly pricing.
 * Yearly pricing belongs exclusively in FeeSchedule.
 */
export interface SchoolProfileFinancialConfig {
	/**
	 * Currencies accepted by this school.
	 * Exactly one entry must have `isDefault: true`.
	 */
	readonly currencies: readonly CurrencyConfig[];
	/**
	 * Catalogue of all fee types this school uses.
	 * Prices are NOT stored here; see FeeSchedule.ScheduledFee.
	 */
	readonly feeDefinitions: readonly FeeDefinition[];
	/**
	 * Reusable payment plan templates referenced by FeeGroups in each schedule.
	 */
	readonly paymentPlans: readonly PaymentPlan[];
	/**
	 * Reusable student group definitions referenced by ScheduledFees and
	 * FeeAdjustments in each schedule.
	 */
	readonly studentGroups: readonly StudentGroup[];
}

// ---------------------------------------------------------------------------
// 1.9 School Settings (misc operational settings)
// ---------------------------------------------------------------------------

/**
 * Miscellaneous operational settings that don't fit a narrower domain.
 * Kept separate so it can grow without polluting SchoolProfile's root.
 */
export interface SchoolSettings {
	readonly studentSettings: StudentSettings;
	readonly teacherSettings: TeacherSettings;
	readonly administratorSettings: AdministratorSettings;
	readonly gradingSettings?: GradingSettings;
	/** @deprecated Use SchoolProfileBranding.reportCardThemes instead. Present for backward compat. */
	readonly reportCardThemes?: Readonly<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// 1.10 Root SchoolProfile
// ---------------------------------------------------------------------------

/**
 * The root configuration document for one school (tenant) in SchoolMesh.
 *
 * Contains only information that changes infrequently.
 * Yearly pricing is stored in FeeSchedule, referenced via
 * `academicConfig.academicYearConfigs[year].feeScheduleId`.
 *
 * @remarks
 * Each school in the multi-tenant system has exactly one SchoolProfile
 * document. It is loaded once per session and cached.
 */
export interface SchoolProfile {
	/** Infrastructure and routing settings. */
	readonly system: SchoolProfileSystem;
	/** Legal identity and naming. */
	readonly identity: SchoolProfileIdentity;
	/** Visual identity and theming. */
	readonly branding: SchoolProfileBranding;
	/** Physical and digital contact information. */
	readonly contact: SchoolProfileContact;
	/** Class hierarchy, grading, and calendar linkage. */
	readonly academicConfig: SchoolProfileAcademicConfig;
	/** User accounts and permissions configuration. */
	readonly userConfig: SchoolProfileUserConfig;
	/** Feature flag and role access control. */
	readonly featureConfig: SchoolProfileFeatureConfig;
	/**
	 * Permanent financial setup — currencies, fee catalogue, payment plans,
	 * and student group definitions. No yearly pricing.
	 */
	readonly financialConfig: SchoolProfileFinancialConfig;
}

export default SchoolProfile;

// ============================================================================
// SECTION 2 — FEE SCHEDULE
// ============================================================================
//
// One FeeSchedule document per academic year.
// Immutable once the year begins so historical reports stay accurate.
// New years are provisioned by cloning the previous schedule and adjusting prices.

// ---------------------------------------------------------------------------
// 2.1 Scheduled Fee
// ---------------------------------------------------------------------------

/**
 * Represents one fee line item within a FeeGroup for a specific academic year.
 * Ties a FeeDefinition (what) to a price (how much) and eligibility (who).
 */
export interface ScheduledFee {
	/** References FeeDefinition.id from SchoolProfile.financialConfig.feeDefinitions. */
	readonly feeId: string;
	/** The amount charged for this fee in this academic year. */
	readonly amount: Money;
	/** If true, the fee must be paid; if false, it is optional / add-on. */
	readonly isRequired: boolean;
	/**
	 * Which installment this fee is due on.
	 * References PaymentInstallment.id from the parent FeeGroup's payment plan.
	 * Null means due immediately / not tied to an installment.
	 */
	readonly dueInstallmentId: string | null;
	/**
	 * If populated, this fee only applies to students belonging to at least one
	 * of the listed StudentGroup IDs (OR logic).
	 * Empty array means the fee applies to all students in the FeeGroup.
	 */
	readonly applicableStudentGroupIds: readonly string[];
}

// ---------------------------------------------------------------------------
// 2.2 Fee Group
// ---------------------------------------------------------------------------

/**
 * A coherent pricing bundle for a subset of classes within a session.
 *
 * @example
 * // Morning Grade 1–3
 * { id: 'morning-g1-3', name: 'Morning Grade 1–3', appliesToClassIds: ['g1a','g1b','g2a','g3a'] }
 */
export interface FeeGroup {
	/** Stable unique identifier within this FeeSchedule. */
	readonly id: string;
	/** Human-readable name, e.g. "Night Grade 7–9". */
	readonly name: string;
	/**
	 * Class IDs (Class.classId from ClassLevels) to which this group applies.
	 * A class may only appear in one FeeGroup per session.
	 */
	readonly appliesToClassIds: readonly string[];
	/**
	 * References PaymentPlan.id from SchoolProfile.financialConfig.paymentPlans.
	 * Determines the installment schedule used for fees in this group.
	 */
	readonly paymentPlanId: string;
	/** The individual fee line items for this group in this academic year. */
	readonly scheduledFees: readonly ScheduledFee[];
}

// ---------------------------------------------------------------------------
// 2.3 Session Fee Schedule
// ---------------------------------------------------------------------------

/**
 * Fee groups for one session within an academic year.
 * A "session" is a physical/time-based programme, e.g. "Morning", "Night",
 * "Weekend", "Vacation School".
 */
export interface SessionFeeSchedule {
	/** Session name, e.g. "Morning", "Night". Matches keys in ClassLevels. */
	readonly sessionName: string;
	/** All fee groups that belong to this session. */
	readonly feeGroups: readonly FeeGroup[];
}

// ---------------------------------------------------------------------------
// 2.4 Fee Adjustment Actions
// ---------------------------------------------------------------------------

/** Discriminated union tag for fee adjustment actions. */
export type FeeAdjustmentActionType =
	| 'percentage_discount'
	| 'fixed_discount'
	| 'fixed_price_override'
	| 'waive_fee'
	| 'add_fee';

/**
 * Base fields shared by all adjustment actions.
 * Identify the concrete type via `type`.
 */
interface FeeAdjustmentActionBase {
	readonly type: FeeAdjustmentActionType;
	/**
	 * References FeeDefinition.id.
	 * The fee this action applies to.
	 * For `add_fee`, this is the fee being added.
	 * Null is only valid for adjustments that operate on ALL fees in a group.
	 */
	readonly feeId: string | null;
}

/**
 * Reduces a fee by a percentage of its scheduled amount.
 *
 * @example
 * 50% discount on Tuition → { type: 'percentage_discount', feeId: 'tuition', discountPercent: 0.5 }
 */
export interface PercentageDiscountAction extends FeeAdjustmentActionBase {
	readonly type: 'percentage_discount';
	/** Value between 0 (no discount) and 1 (full waiver). */
	readonly discountPercent: number;
}

/**
 * Subtracts a fixed monetary amount from a scheduled fee.
 *
 * @example
 * Subtract L$500 from Registration → { type: 'fixed_discount', feeId: 'registration', discountAmount: { amount: 500, currency: 'LRD' } }
 */
export interface FixedDiscountAction extends FeeAdjustmentActionBase {
	readonly type: 'fixed_discount';
	readonly discountAmount: Money;
}

/**
 * Replaces the scheduled fee entirely with a new fixed price.
 * Use this when the school offers a completely different rate rather than
 * a discount — e.g. the Kickball Team pays L$5,000 instead of the
 * standard L$20,000 tuition.
 *
 * @example
 * { type: 'fixed_price_override', feeId: 'tuition', overrideAmount: { amount: 5000, currency: 'LRD' } }
 */
export interface FixedPriceOverrideAction extends FeeAdjustmentActionBase {
	readonly type: 'fixed_price_override';
	/** The new total amount that replaces the scheduled fee entirely. */
	readonly overrideAmount: Money;
}

/**
 * Removes a fee entirely (sets effective amount to zero).
 * Useful for exemptions such as "Teacher's Ward pays no Registration fee."
 */
export interface WaiveFeeAction extends FeeAdjustmentActionBase {
	readonly type: 'waive_fee';
}

/**
 * Adds a fee line item that is not in the base FeeGroup schedule.
 * Useful for automatic surcharges, e.g. boarding students automatically
 * receive a Boarding Fee.
 */
export interface AddFeeAction extends FeeAdjustmentActionBase {
	readonly type: 'add_fee';
	/** The fee being added (must be a valid FeeDefinition.id). */
	readonly feeId: string;
	/** Amount to charge for the added fee. */
	readonly amount: Money;
	/**
	 * Which installment this added fee is due on.
	 * References PaymentInstallment.id from the target FeeGroup's payment plan.
	 */
	readonly dueInstallmentId: string | null;
}

/** Discriminated union of all possible adjustment action shapes. */
export type FeeAdjustmentAction =
	| PercentageDiscountAction
	| FixedDiscountAction
	| FixedPriceOverrideAction
	| WaiveFeeAction
	| AddFeeAction;

// ---------------------------------------------------------------------------
// 2.5 Fee Adjustments (rule-based, per FeeSchedule)
// ---------------------------------------------------------------------------

/**
 * A rule-driven fee adjustment applied during invoice calculation.
 * Adjustments are stored per FeeSchedule because they are often specific
 * to one academic year (e.g. "2027 Jubilee Scholarship", "Government Subsidy").
 *
 * @example
 * // Teacher's Ward — no registration, 50% tuition
 * {
 *   id: 'teachers-ward-2026',
 *   name: "Teacher's Ward Program",
 *   enabled: true,
 *   priority: 10,
 *   isStackable: false,
 *   conditions: [{ field: 'parentStaffRole', operator: 'equals', value: 'teacher' }],
 *   actions: [
 *     { type: 'waive_fee', feeId: 'registration' },
 *     { type: 'percentage_discount', feeId: 'tuition', discountPercent: 0.5 }
 *   ]
 * }
 */
export interface FeeAdjustment {
	/** Stable unique identifier within this FeeSchedule. */
	readonly id: string;
	/** Display name, e.g. "Academic Excellence Scholarship", "Government Subsidy". */
	readonly name: string;
	/** Optional description for administrative reference. */
	readonly description?: string;
	/** Whether this adjustment is currently active. Allows toggling without deletion. */
	readonly enabled: boolean;
	/**
	 * Evaluation order when multiple adjustments match.
	 * Lower number = evaluated first. Critical when adjustments are not stackable.
	 */
	readonly priority: number;
	/**
	 * If false, only the highest-priority matching adjustment is applied per student.
	 * If true, this adjustment stacks on top of other active adjustments.
	 */
	readonly isStackable: boolean;
	/**
	 * All conditions must be satisfied for the adjustment to apply (implicit AND).
	 * For OR logic, create separate FeeAdjustments.
	 */
	readonly conditions: readonly RuleCondition[];
	/** One or more actions applied when all conditions match. */
	readonly actions: readonly FeeAdjustmentAction[];
}

// ---------------------------------------------------------------------------
// 2.6 Root FeeSchedule
// ---------------------------------------------------------------------------

/**
 * The complete fee schedule for one academic year.
 *
 * @remarks
 * **Immutability rule**: once `isLocked` is true (i.e., the academic year has
 * begun), this document must never be modified. Any corrections require a new
 * schedule or a separate amendment document to preserve report accuracy.
 *
 * **Cloning**: new academic years are provisioned by cloning the previous
 * FeeSchedule and updating amounts. The `clonedFromScheduleId` field tracks
 * provenance.
 */
export interface FeeSchedule {

	/** The academic year this schedule covers, e.g. "2025-2026". */
	readonly academicYear: AcademicYear;

	/**
	 * Fee groups organised by session (e.g. "Morning", "Night", "Vacation School").
	 * Each session contains its own set of FeeGroups and their ScheduledFees.
	 */
	readonly sessionFeeSchedules: readonly SessionFeeSchedule[];
	/**
	 * Rule-driven fee adjustments for this academic year.
	 * Examples: scholarships, subsidies, staff benefits, team sponsorships.
	 * These are year-specific and must not live in SchoolProfile.
	 */
	readonly feeAdjustments: readonly FeeAdjustment[];
}
