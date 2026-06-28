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

export type schoolLevel = "Elementary" | "Junior High" | "Senior High"

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
	isMajorSubject?: number;
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

export interface StudentSettings {
	loginAccess: boolean;
	yearlyReportAccess: boolean;
	reportAccessPeriods: string[];
	reportAccessSemesters: string[];
}

export interface TeacherSettings {
	loginAccess: boolean;
	gradeSubmissionPeriods: string[];
	gradeSubmissionAcademicYears: string[];
	viewMastersAcademicYears: string[];
	viewGradeSubmissionsAcademicYears: string[];
	gradeChangeRequestAcademicYears: string[];
	gradeChangeRequestPeriods: string[];
}

export interface AdministratorSettings {
	loginAccess: boolean;
}

export interface GradingSettings {
	passMark: number;
	gradeScale: { min: number; max: number };
	summerSchoolWeight?: number;
	failuerWeight: number;
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
	highestLevel: schoolLevel,
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
