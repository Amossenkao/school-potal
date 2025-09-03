// school-profiles/types.ts
export type FeatureKey =
	// Core Features
	| 'dashboard'
	| 'user_management'
	| 'profile_management'
	| 'ai_chat'
	| 'homepage'

	// Academic Features
	| 'grading_system'
	| 'lesson_planning'
	| 'academic_reports'
	| 'academic_resources'
	| 'calendar_events'
	| 'class_management'

	// Financial Features
	| 'fee_payment'
	| 'salary_management'
	| 'financial_reports'

	// Student Features
	| 'admissions'
	| 'scholarships'
	| 'student_records'

	// Communication & Support
	| 'support_system'
	| 'notifications'

	// System Features
	| 'school_settings';

export interface RoleFeatureAccess {
	[role: string]: {
		features: FeatureKey[];
		restrictions?: {
			[feature: string]: string[];
		};
	};
}

export interface StudentSettings {
	loginAccess: boolean;
	yearlyReportAccess: boolean;
	reportAccessPeriods: string[];
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

export interface SchoolSettings {
	studentSettings: StudentSettings;
	teacherSettings: TeacherSettings;
	administratorSettings: AdministratorSettings;
}

export interface SchoolProfile {
	// Basic school info
	host: string;
	dbName: string;
	id?: string;
	name: string;
	slogan: string;
	shortName: string;
	initials: string;
	logoUrl: string;
	logoUrl2?: string;
	description: string;
	heroImageUrl?: string;
	tagline: string;
	yearFounded: number;

	enabledFeatures: FeatureKey[];
	roleFeatureAccess: RoleFeatureAccess;

	// Subscription/Plan info
	subscriptionPlan: 'basic' | 'standard' | 'premium';
	subscriptionExpiry?: Date;

	// Custom configurations
	customizations?: {
		theme?: string;
		branding?: {
			primaryColor?: string;
			secondaryColor?: string;
			customCss?: string;
		};
		modules?: {
			[moduleKey: string]: any;
		};
	};

	// School Settings
	settings?: SchoolSettings;

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
	classLevels: any;
}

// Subscription plan feature mappings
export const PLAN_FEATURES: Record<string, FeatureKey[]> = {
	basic: [
		'dashboard',
		'profile_management',
		'messages',
		'grading_system',
		'academic_resources',
	],
	standard: [
		'dashboard',
		'profile_management',
		'messages',
		'grading_system',
		'academic_resources',
		'lesson_planning',
		'calendar_events',
		'fee_payment',
	],
	premium: [
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
		'school_settings',
		'support_system',
		'notifications',
	],
};

export default SchoolProfile;
