import type { TenantThemeName } from '@/types/tenantTheme';

export type FeatureKey =
	// Core Features
	| 'dashboard'
	| 'user_management'
	| 'profile_management'
	| 'ai_chat'
	| 'apps'
	| 'attendance'

	// Academic Features
	| 'grading_system'
	| 'academic_reports'
	| 'academic_resources'
	| 'calendar_events'
	| 'class_management'

	// Financial Features
	| 'fee_payment'

	// Student Features
	| 'admissions'

	// Communication & Support
	| 'support_system'
	| 'community'
	| 'notifications'

	// System Features
	| 'school_settings';

export interface RoleFeatureAccess {
	student: FeatureKey[];
	teacher: FeatureKey[];
	system_admin: FeatureKey[];
	administrator: {
		[key: string]: FeatureKey[];
	};
}

export interface Subject {
	name: string;
	weight: number;
}

export interface Class {
	classId: string;
	name: string;
	feeGroup: string;
}

export interface Level {
	isSelfContained?: boolean;
	classes: Class[];
	subjects: Subject[];
}

export interface Session {
	[levelName: string]: Level;
}

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

export type AcademicYear = string;

// ---------------------------------------------------------------------------
// Student report access, grouped by academic year
// ---------------------------------------------------------------------------

export interface StudentReportAccessYearSettings {
	enabled: boolean;
	yearlyReportAccess: boolean;
	periods: AcademicPeriod[];
	semesters: Semester[];
}

export interface StudentSettings {
	loginAccess: boolean;
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
	enabled: boolean;
	gradeSubmission: TeacherGradeSubmissionSettings;
	viewGradeSubmissions: TeacherViewGradeSubmissionsSettings;
	gradeChangeRequest: TeacherGradeChangeRequestSettings;
	viewMasters: TeacherViewMastersSettings;
}

export interface TeacherSettings {
	loginAccess: boolean;
	permissionsByYear: Record<AcademicYear, TeacherPermissionsYearSettings>;
}

export interface AdministratorSettings {
	loginAccess: boolean;
}

export interface SystemAdmin {
	name: string;
	phone: string;
	email?: string;
}

export interface SchoolSettings {
	studentSettings: StudentSettings;
	teacherSettings: TeacherSettings;
	administratorSettings: AdministratorSettings;
	reportCardThemes?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Fee schedule types
// ---------------------------------------------------------------------------

export interface FeeScheduleInstallment {
	label: string;
	dueWindow?: string;
	/** Morning groups use old/new pricing; Night groups use a single amount. */
	old?: number;
	new?: number;
	amount?: number;
}

export interface FeeScheduleRequirement {
	item: string;
	amount: number;
	currency?: string;
	dueAt: string;
}

export interface FeeScheduleAccessory {
	item: string;
	amount: number;
	dueAt: string;
	studentType: string;
}

export interface TuitionAndRegistration {
	old: {
		reg1stSem: number;
		reg2ndSem: number;
		tuition: number;
		total: number;
	};
	new: {
		reg1stSem: number;
		reg2ndSem: number;
		tuition: number;
		total: number;
	};
}

export interface FlatFees {
	[key: string]: number;
}

export interface FeeGroup {
	label: string;
	appliesTo: string[];
	currency: string;
	tuitionAndRegistration?: TuitionAndRegistration;
	flatFees?: FlatFees;
	installments: FeeScheduleInstallment[];
	requirements?: FeeScheduleRequirement[];
	accessories?: FeeScheduleAccessory[];
	extraClasses?: {
		amount: number;
		period?: string;
	};
}

export interface SessionFeeGroups {
	[feeGroupKey: string]: FeeGroup;
}

export interface FeeScheduleYear {
	paymentWindows: Record<string, string>;
	[sessionName: string]: Record<string, unknown> | Record<string, string>;
}

export interface FeeSchedules {
	[academicYear: string]: FeeScheduleYear;
}

// ---------------------------------------------------------------------------
// School Profile
// ---------------------------------------------------------------------------

export interface SchoolProfile {
	isActive: boolean;
	host: string;
	dbName: string;
	id?: string;
	name: string;
	slogan: string;
	shortName: string;
	initials: string;
	studentIdPrefix: string;
	logoUrl: string;
	logoUrl2?: string;
	firstAcademicYear: string;
	currentAcademicYear: string;
	administrativePositions: { id: string; name: string }[];
	sysAdmin: SystemAdmin;
	themeName?: TenantThemeName;

	enabledFeatures: FeatureKey[];
	roleFeatureAccess: RoleFeatureAccess;

	settings: SchoolSettings;
	feeSchedules?: FeeSchedules;

	address: string[];
	phones: string[];
	emails: string[];
	classLevels: ClassLevels;
}

export default SchoolProfile;
