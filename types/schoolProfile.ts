import type { TenantThemeName } from '@/types/tenantTheme';

export type FeatureKey =
	// Core Features
	| 'dashboard'
	| 'user_management'
	| 'profile_management'
	| 'ai_chat'
	| 'homepage'
	| 'enrollment_info'
	| 'apps'
	| 'attendance'

	// Academic Features
	| 'grading_system'
	| 'academic_reports'
	| 'academic_resources'
	| 'calendar_events'
	| 'class_management'
	| 'digital_signatures'

	// Financial Features
	| 'fee_payment'
	| 'salary_management'
	| 'financial_reports'
	| 'financial_profile'
	| 'scholarships_and_wards'
	| 'payroll_management'
	| 'receipts_and_clearances'

	// Student Features
	| 'admissions'
	| 'student_records'
	| 'information_sheet'
	| 'online_verification'
	| 'document_requests'

	// Communication & Support
	| 'support_system'
	| 'community'
	| 'notifications'

	// System Features
	| 'school_settings'
	| 'school_profile';

export type schoolLevel = 'Elementary' | 'Junior High' | 'Senior High';

export interface RoleFeatureAccess {
	student: FeatureKey[];
	teacher: FeatureKey[];
	system_admin: FeatureKey[];
	administrator: {
		[key: string]: FeatureKey[];
	};
}

// Subject inside each level
export interface Subject {
	name: string;
	isMajorSubject?: boolean;
}

export interface Level {
	classes: Class[];
	subjects: Subject[];
}

export interface Class {
	classId: string;
	name: string;
	isSelfContained?: boolean;
	fees: { feeType: string; category: string; requiredAmount: number }[];
}

export interface Session {
	[levelName: string]: Level;
}

// The overall structure
export interface ClassLevels {
	[sessionName: string]: Session;
}

// ---------------------------------------------------------------------------
// Shared academic-period / semester / academic-year enums
// ---------------------------------------------------------------------------

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

/**
 * An academic year label, e.g. "2024-2025". Kept as a plain string (rather
 * than a template literal type) so it can be used directly as a Record key.
 */
export type AcademicYear = string;

// ---------------------------------------------------------------------------
// Student report access, grouped by academic year
// ---------------------------------------------------------------------------

export interface StudentReportAccessYearSettings {
	/** Master switch for this academic year. When false, none of the report
	 * access settings below apply for this year, regardless of their values. */
	enabled: boolean;
	yearlyReportAccess: boolean;
	periods: AcademicPeriod[];
	semesters: Semester[];
}

export interface StudentSettings {
	loginAccess: boolean;
	/** Report access settings keyed by academic year (e.g. "2024-2025"),
	 * spanning the school's first academic year through the current one. */
	reportAccessByYear: Record<AcademicYear, StudentReportAccessYearSettings>;
}

// ---------------------------------------------------------------------------
// Teacher permissions, grouped by academic year
// ---------------------------------------------------------------------------

export interface TeacherGradeSubmissionSettings {
	enabled: boolean;
	periods: AcademicPeriod[];
}

export interface TeacherGradeChangeRequestSettings {
	enabled: boolean;
	periods: AcademicPeriod[];
}

export interface TeacherViewGradeSubmissionsSettings {
	enabled: boolean;
}

export interface TeacherViewMastersSettings {
	enabled: boolean;
}

export interface TeacherPermissionsYearSettings {
	/** Master switch for this academic year. When false, none of the
	 * permissions below apply for this year, regardless of their values. */
	enabled: boolean;
	gradeSubmission: TeacherGradeSubmissionSettings;
	viewGradeSubmissions: TeacherViewGradeSubmissionsSettings;
	gradeChangeRequest: TeacherGradeChangeRequestSettings;
	viewMasters: TeacherViewMastersSettings;
}

export interface TeacherSettings {
	loginAccess: boolean;
	/** Grade submission / viewing / change-request permissions keyed by
	 * academic year (e.g. "2024-2025"), spanning the school's first
	 * academic year through the current one. */
	permissionsByYear: Record<AcademicYear, TeacherPermissionsYearSettings>;
}

export interface AdministratorSettings {
	loginAccess: boolean;
}

export interface GradingSettings {
	passMark: number;
	gradeScale: { min: number; max: number };
	summerSchoolWeight?: number;
	failureWeight: number;
	givesDoublePromotion: boolean;
	givesDemotion: boolean;
}

export interface SystemAdmin {
	name: string;
	phone: string;
	email?: string;
	office: string;
}

export interface SchoolSettings {
	studentSettings: StudentSettings;
	teacherSettings: TeacherSettings;
	administratorSettings: AdministratorSettings;
	gradingSettings: GradingSettings;
	reportCardThemes?: Record<string, string>;
}

export interface Images {
	logoUrl: string;
	logoUrl2?: string;
	pwaIcon?: string;
	loadingSpinnerIcon?: string;
	semesterReportWatermark?: string;
	yearlyReportWatermark?: string;
	yearlyReportWatermark2?: string;
}

export interface SchoolProfile {
	// Basic school info
	isActive: boolean;
	host: string;
	dbName: string;
	id?: string;
	name: string[];
	slogan: string;
	shortName: string;
	initials: string;
	studentIdPrefix: string;
	highestLevel: schoolLevel;
	logoUrl: string;
	logoUrl2?: string;
	images: Images;
	yearFounded: number;
	firstAcademicYear: string;
	currentAcademicYear: string;
	administrativePositions: { id: string; name: string }[];
	sysAdmin: SystemAdmin;

	enabledFeatures: FeatureKey[];
	roleFeatureAccess: RoleFeatureAccess;
	financialProfile: any;

	// School Settings
	settings: SchoolSettings;
	themeName?: TenantThemeName;

	// Additional properties

	address: string[];
	phones: string[];
	emails: string[];
	classLevels: ClassLevels;
}

export default SchoolProfile;
