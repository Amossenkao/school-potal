export type FeatureKey =
	// Core Features
	| 'dashboard'
	| 'user_management'
	| 'profile_management'
	| 'ai_chat'
	| 'homepage'
	| 'enrollment_info'
	| 'apps'

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
	weight: number;
}

export interface Level {
	classes: Class[];
	subjects: Subject[];
}

export interface Class {
	classId: string;
	name: string;
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
	logoUrl: string;
	logoUrl2?: string;
	description: string;
	heroImageUrl?: string;
	tagline: string;
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

	// Additional properties
	whyChoose: any;
	facilities: any;
	team: any;
	address: string[];
	phones: string[];
	emails: string[];
	hours: string[];
	quickLinks: any;
	academicLinks: any;
	footerLinks: any;
	classLevels: ClassLevels;
}

export default SchoolProfile;
