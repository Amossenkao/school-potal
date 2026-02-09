// utils/componentsMap.ts
import React from 'react';
import dynamic from 'next/dynamic';
import {
	LayoutDashboard,
	GraduationCap,
	Users,
	FileText,
	CheckSquare,
	FilePen,
	ClipboardList,
	CalendarDays,
	Library,
	Wallet,
	AlignEndVerticalIcon,
	Settings,
	Shield,
	UserCircle,
	MessageCircle,
	UserPlus,
	UserCheck,
	BookOpen,
	BellDot,
	Book,
	BookA,
	BookCheck,
} from 'lucide-react';
import type { SchoolProfile, FeatureKey } from '@/types/schoolProfile';

// Feature configuration with UI metadata
interface FeatureConfig {
	key: FeatureKey;
	title: string;
	icon: any;
	category?: string;
	routes: {
		[role: string]: Array<{
			key: string;
			title: string;
			href: string;
			icon?: any;
		}>;
	};
}

type ComponentImporter = () => Promise<any>;

const DashboardSectionLoading = () =>
	React.createElement(
		'div',
		{ className: 'flex items-center justify-center min-h-[40vh]' },
		React.createElement(
			'div',
			{ className: 'flex flex-col items-center gap-3 text-muted-foreground' },
			React.createElement('div', {
				className:
					'h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin',
			}),
			React.createElement('span', { className: 'text-sm' }, 'Loading...'),
		),
	);

const lazySection = (key: string, importer: ComponentImporter) =>
	dynamic(
		() =>
			importer().catch((error) => {
				console.warn(`Chunk load failed for key: ${key}`, error);
				return import('@/components/OfflineDashboardFallback');
			}),
		{
			loading: () => React.createElement(DashboardSectionLoading),
		},
	);

const componentImporters: Record<string, ComponentImporter> = {
	dashboard: () => import('@/components/DashboardHomePage'),
	// User Management
	'add-users': () => import('@/app/dashboard/admin/users/AddUsers'),
	'manage-users': () => import('@/app/dashboard/admin/users/ManageUsers'),

	// Grading
	submissions: () => import('@/app/dashboard/admin/grades/GradeSubmissions'),
	requests: () => import('@/app/dashboard/admin/grades/GradeRequests'),
	grading: () => import('@/app/dashboard/teacher/grading/GradeManagement'),
	'periodic-grade': () => import('@/app/dashboard/shared/PeriodicReport'),
	'yearly-grade': () => import('@/app/dashboard/shared/YearlyReport'),

	// Classes
	'classes-overview': () =>
		import('@/app/dashboard/admin/classes/ClassOverview'),
	'manage-class': () => import('@/app/dashboard/admin/classes/ManageClass'),

	// Academic Reports
	'periodic-reports': () => import('@/app/dashboard/shared/PeriodicReport'),
	'yearly-reports': () => import('@/app/dashboard/shared/YearlyReport'),
	'semester-report': () => import('@/app/dashboard/shared/SemesterReport'),
	masters: () => import('@/app/dashboard/shared/MasterGradeSheet'),

	'grade-submissions': () =>
		import('@/app/dashboard/teacher/grading/GradeSubmissions'),
	'submit-grades': () =>
		import('@/app/dashboard/teacher/grading/SubmitGrade'),
	'grade-requests': () =>
		import('@/app/dashboard/teacher/grading/GradeRequests'),

	// Lesson Planning
	// 'view-lessonplans': dynamic(
	// 	() => import('@/app/dashboard/admin/ViewLessonPlans')
	// ),
	// 'view-schemeofwork': dynamic(
	// 	() => import('@/app/dashboard/admin/ViewSchemeOrWork')
	// ),
	// 'lesson-plans/submit': dynamic(
	// 	() => import('@/app/dashboard/teacher/SubmitLessonPlan')
	// ),
	// 'lesson-plans/scheme': dynamic(
	// 	() => import('@/app/dashboard/teacher/SubmitSchemeOfWork')
	// ),
	// 'lesson-plans/manage': dynamic(
	// 	() => import('@/app/dashboard/teacher/ManageLessonPlans')
	// ),

	// // Calendar
	'calendar-academic': () => import('@/app/dashboard/shared/AcademicCalendar'),
	schedules: () => import('@/app/dashboard/shared/Schedules'),

	// Academic Resources
	// 'resources/view': dynamic(
	// 	() => import('@/app/dashboard/shared/ViewResources')
	// ),
	// 'resources/add': dynamic(() => import('@/app/dashboard/admin/AddResource')),
	// 'resources/add-teacher': dynamic(
	// 	() => import('@/app/dashboard/shared/AddResource')
	// ),
	// 'resources/manage': dynamic(
	// 	() => import('@/app/dashboard/admin/ManageResources')
	// ),
	// 'resources/manage-teacher': dynamic(
	// 	() => import('@/app/dashboard/teacher/ManageResources')
	// ),

	// Fees Payment
	pay: () => import('@/app/dashboard/student/fees/PayFees'),
	'payment-history': () =>
		import('@/app/dashboard/student/fees/PaymentHistory'),

	// Salary
	// 'salary/advance': dynamic(
	// 	() => import('@/app/dashboard/teacher/RequestSalaryAdvance')
	// ),
	// 'salary/sign': dynamic(() => import('@/app/dashboard/teacher/SignForSalary')),
	// 'salary/advance-admin': dynamic(
	// 	() => import('@/app/dashboard/administrator/requestSalaryAdvance')
	// ),
	// 'salary/sign-admin': dynamic(
	// 	() => import('@/app/dashboard/administrator/signForSalary')
	// ),

	// Events Log
	notifications: () => import('@/app/dashboard/shared/Notifications'),

	// Settings & Support
	settings: () => import('@/app/dashboard/admin/Settings'),
	support: () => import('@/app/dashboard/admin/Support'),

	// Shared components
	profile: () => import('@/app/dashboard/shared/UserProfile'),
	chat: () => import('@/app/dashboard/shared/Chat'),
	community: () => import('@/app/dashboard/shared/Community'),

	// Dynamic Administrator pages (to be defined in school profile)
	// 'financial-reports': dynamic(
	// 	() => import('@/app/dashboard/admin/FinancialReports')
	// ),
	// 'student-records': dynamic(
	// 	() => import('@/app/dashboard/admin/StudentRecords')
	// ),
	// admissions: dynamic(() => import('@/app/dashboard/admin/Admissions')),
	// 'school-profile': dynamic(
	// 	() => import('@/app/dashboard/admin/SchoolProfile')
	// ),
};

// Component mappings - centralized component imports
const componentMappings: Record<string, any> = Object.fromEntries(
	Object.entries(componentImporters).map(([key, importer]) => [
		key,
		lazySection(key, importer),
	]),
);

function getAccessibleRouteKeys(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPosition?: string,
): string[] {
	const routeKeys: string[] = [];
	const userFeatures = getUserAccessibleFeatures(
		schoolProfile,
		userRole,
		adminPosition,
	);

	userFeatures.forEach((feature) => {
		if (!schoolProfile.enabledFeatures.includes(feature)) return;
		const featureConfig = featureConfigurations[feature];
		if (!featureConfig) return;

		let routes = featureConfig.routes[userRole];
		if (!routes && userRole === 'administrator') {
			return;
		}
		if (!routes) return;

		routes.forEach((route) => {
			routeKeys.push(route.key);
		});
	});

	return routeKeys;
}

export function preloadComponentsForUser(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPosition?: string,
): void {
	const routeKeys = getAccessibleRouteKeys(
		schoolProfile,
		userRole,
		adminPosition,
	);
	const uniqueKeys = Array.from(new Set(routeKeys));

	const preloadPromises = uniqueKeys.map((key) => {
		const importer = componentImporters[key];
		if (!importer) {
			console.warn(`Component importer not found for key: ${key}`);
			return Promise.resolve();
		}
		return importer().catch((error) => {
			console.warn(`Preload failed for key: ${key}`, error);
		});
	});

	void Promise.allSettled(preloadPromises);
}

// Feature configurations with navigation structure
const featureConfigurations: Record<FeatureKey, FeatureConfig> = {
	dashboard: {
		key: 'dashboard',
		title: 'Dashboard',
		icon: LayoutDashboard,
		routes: {
			system_admin: [
				{ key: 'dashboard', title: 'Dashboard', href: '/dashboard' },
			],
			teacher: [{ key: 'dashboard', title: 'Dashboard', href: '/dashboard' }],
			student: [{ key: 'dashboard', title: 'Dashboard', href: '/dashboard' }],
			administrator: [
				{ key: 'dashboard', title: 'Dashboard', href: '/dashboard' },
			],
		},
	},

	user_management: {
		key: 'user_management',
		title: 'User Management',
		icon: Users,
		category: 'User Management',
		routes: {
			system_admin: [
				{
					key: 'add-users',
					title: 'Add Users',
					href: '/add-users',
					icon: UserPlus,
				},
				{
					key: 'manage-users',
					title: 'Manage Users',
					href: '/manage-users',
					icon: UserCheck,
				},
			],
		},
	},

	grading_system: {
		key: 'grading_system',
		title: 'Grading System',
		icon: CheckSquare,
		category: 'Grading',
		routes: {
			system_admin: [
				{
					key: 'submissions',
					title: 'Grade Submissions',
					href: '/submissions',
					icon: BookCheck,
				},
				{
					key: 'requests',
					title: 'Grade Requests',
					href: '/requests',
					icon: CheckSquare,
				},
				{
					key: 'masters',
					title: 'Master Grade Sheets',
					href: '/masters',
					icon: ClipboardList,
				},
			],
			teacher: [
				{
					key: 'grade-submissions',
					title: 'Grade Submissions',
					href: '/grade-submissions',
					icon: BookCheck,
				},
				{
					key: 'submit-grades',
					title: 'Submit Grades',
					href: '/submit-grades',
					icon: CheckSquare,
				},
				{
					key: 'grade-requests',
					title: 'Grade Requests',
					href: '/grade-requests',
					icon: CheckSquare,
				},
				{
					key: 'masters',
					title: 'Master Grade Sheets',
					href: '/masters',
					icon: ClipboardList,
				},
			],
		},
	},

	class_management: {
		key: 'class_management',
		title: 'Class Management',
		icon: GraduationCap,
		category: 'Enrollment',
		routes: {
			system_admin: [
				{
					key: 'classes-overview',
					title: 'Classes Overview',
					href: '/classes-overview',
					icon: GraduationCap,
				},
				{
					key: 'manage-class',
					title: 'Manage Classes',
					href: '/manage-class',
					icon: Settings,
				},
			],
		},
	},

	academic_reports: {
		key: 'academic_reports',
		title: 'Academic Reports',
		icon: Library,
		category: 'Academic Reports',
		routes: {
			system_admin: [
				{
					key: 'periodic-reports',
					title: 'Periodic Reports',
					href: '/periodic-reports',
					icon: FileText,
				},
				{
					key: 'yearly-reports',
					title: 'Yearly Reports',
					href: '/yearly-reports',
					icon: FileText,
				},
				{
					key: 'semester-report',
					title: 'Semester Report',
					href: '/semester-report',
					icon: FileText,
				},
			],
			student: [
				{
					key: 'periodic-grade',
					title: 'Periodic Grades',
					href: '/periodic-grade',
					icon: FileText,
				},
				{
					key: 'yearly-grade',
					title: 'Yearly Grades',
					href: '/yearly-grade',
					icon: FileText,
				},
				{
					key: 'semester-report',
					title: 'Semester Report',
					href: '/semester-report',
					icon: FileText,
				},
			],
		},
	},

	academic_resources: {
		key: 'academic_resources',
		title: 'Academic Resources',
		icon: Library,
		category: 'Academic Resources',
		routes: {
			system_admin: [
				{
					key: 'resources/view',
					title: 'View Resources',
					href: '/resources/view',
					icon: Library,
				},
				{
					key: 'resources/add',
					title: 'Add a Resource',
					href: '/resources/add',
					icon: FilePen,
				},
				{
					key: 'resources/manage',
					title: 'Manage Resources',
					href: '/resources/manage',
					icon: Library,
				},
			],
			teacher: [
				{
					key: 'resources/view',
					title: 'View Resources',
					href: '/resources/view',
					icon: Library,
				},
				{
					key: 'resources/add-teacher',
					title: 'Add a Resource',
					href: '/resources/add',
					icon: FilePen,
				},
				{
					key: 'resources/manage-teacher',
					title: 'Manage Resources',
					href: '/resources/manage',
					icon: Library,
				},
			],
			student: [
				{
					key: 'resources/view',
					title: 'View Resources',
					href: '/resources/view',
					icon: Library,
				},
			],

			administrator: [
				{
					key: 'resources/view',
					title: 'View Resources',
					href: '/resources/view',
					icon: Library,
				},
				{
					key: 'resources/add',
					title: 'Add a Resource',
					href: '/resources/add',
					icon: FilePen,
				},
			],
		},
	},

	calendar_events: {
		key: 'calendar_events',
		title: 'Calendar & Events',
		icon: CalendarDays,
		category: 'Calendar & Schedules',
		routes: {
			system_admin: [
				{
					key: 'calendar-academic',
					title: 'Academic Calendar',
					href: '/calendar-academic',
					icon: CalendarDays,
				},
				{
					key: 'schedules',
					title: 'Schedules',
					href: '/schedules',
					icon: CalendarDays,
				},
			],
			teacher: [
				{
					key: 'calendar-academic',
					title: 'Academic Calendar',
					href: '/calendar-academic',
					icon: CalendarDays,
				},
				{
					key: 'schedules',
					title: 'Schedules',
					href: '/schedules',
					icon: CalendarDays,
				},
			],
			student: [
				{
					key: 'schedules',
					title: 'Schedules',
					href: '/schedules',
					icon: CalendarDays,
				},
				{
					key: 'calendar-academic',
					title: 'Academic Calendar',
					href: '/calendar-academic',
					icon: CalendarDays,
				},
			],
			administrator: [
				{
					key: 'calendar-academic',
					title: 'Academic Calendar',
					href: '/calendar-academic',
					icon: CalendarDays,
				},
				{
					key: 'schedules',
					title: 'Schedules',
					href: '/schedules',
					icon: CalendarDays,
				},
			],
		},
	},

	fee_payment: {
		key: 'fee_payment',
		title: 'Fee Payment',
		icon: Wallet,
		category: 'Fees Payment',
		routes: {
			student: [
				{ key: 'pay', title: 'Pay Fees', href: '/pay', icon: Wallet },
				{
					key: 'payment-history',
					title: 'Payment History',
					href: '/payment-history',
					icon: FileText,
				},
			],
		},
	},

	financial_reports: {
		key: 'financial_reports',
		title: 'Financial Reports',
		icon: FileText,
		category: 'Financial',
		routes: {
			administrator: [
				{
					key: 'financial-reports',
					title: 'Financial Reports',
					href: '/financial-reports',
					icon: FileText,
				},
			],
		},
	},

	salary_management: {
		key: 'salary_management',
		title: 'Salary Management',
		icon: Wallet,
		category: 'Salary',
		routes: {
			teacher: [
				{
					key: 'salary/advance',
					title: 'Request Salary Advance',
					href: '/salary/advance',
					icon: Wallet,
				},
				{
					key: 'salary/sign',
					title: 'Sign for Salary',
					href: '/salary/sign',
					icon: FilePen,
				},
			],
			administrator: [
				{
					key: 'salary/advance-admin',
					title: 'Request Salary Advance',
					href: '/salary/advance',
					icon: Wallet,
				},
				{
					key: 'salary/sign-admin',
					title: 'Sign for Salary',
					href: '/salary/sign',
					icon: FilePen,
				},
			],
		},
	},

	student_records: {
		key: 'student_records',
		title: 'Student Records',
		icon: FileText,
		category: 'Student Management',
		routes: {
			administrator: [
				{
					key: 'student-records',
					title: 'Student Records',
					href: '/student-records',
					icon: FileText,
				},
			],
		},
	},

	admissions: {
		key: 'admissions',
		title: 'Admissions',
		icon: GraduationCap,
		category: 'Student Management',
		routes: {
			administrator: [
				{
					key: 'admissions',
					title: 'Admissions',
					href: '/admissions',
					icon: GraduationCap,
				},
			],
		},
	},

	notifications: {
		key: 'notifications',
		title: 'Notifications',
		icon: AlignEndVerticalIcon,
		routes: {
			teacher: [
				{
					key: 'notifications',
					title: 'Notifications',
					href: '/notifications',
					icon: BellDot,
				},
			],
			system_admin: [
				{
					key: 'notifications',
					title: 'Notifications',
					href: '/notifications',
					icon: BellDot,
				},
			],
			student: [
				{
					key: 'notifications',
					title: 'Notifications',
					href: '/notifications',
					icon: BellDot,
				},
			],
			administrator: [
				{
					key: 'notifications',
					title: 'Notifications',
					href: '/notifications',
					icon: BellDot,
				},
			],
		},
	},
	community: {
		key: 'community',
		title: 'Community',
		icon: UserCircle,
		routes: {
			student: [
				{ key: 'community', title: 'Community', href: '/dashboard/community' },
			],
			teacher: [
				{ key: 'community', title: 'Community', href: '/dashboard/community' },
			],
		},
	},

	school_settings: {
		key: 'school_settings',
		title: 'School Settings',
		icon: Settings,
		routes: {
			system_admin: [
				{
					key: 'settings',
					title: 'School Settings',
					href: '/settings',
					icon: Settings,
				},
			],
		},
	},

	school_profile: {
		key: 'school_profile',
		title: 'School Profile',
		icon: Shield,
		routes: {
			administrator: [
				{
					key: 'school-profile',
					title: 'School Profile',
					href: '/school-profile',
					icon: Shield,
				},
			],
		},
	},

	support_system: {
		key: 'support_system',
		title: 'Support System',
		icon: Shield,
		routes: {
			system_admin: [
				{ key: 'support', title: 'Support', href: '/support', icon: Shield },
			],
			administrator: [
				{ key: 'support', title: 'Support', href: '/support', icon: Shield },
			],
		},
	},

	profile_management: {
		key: 'profile_management',
		title: 'Profile Management',
		icon: UserCircle,
		routes: {
			system_admin: [
				{
					key: 'profile',
					title: 'Profile',
					href: '/profile',
					icon: UserCircle,
				},
			],
			teacher: [
				{
					key: 'profile',
					title: 'Profile',
					href: '/profile',
					icon: UserCircle,
				},
			],
			student: [
				{
					key: 'profile',
					title: 'Profile',
					href: '/profile',
					icon: UserCircle,
				},
			],
			administrator: [
				{
					key: 'profile',
					title: 'Profile',
					href: '/profile',
					icon: UserCircle,
				},
			],
		},
	},

	ai_chat: {
		key: 'ai_chat',
		title: 'AI Chat',
		icon: MessageCircle,
		routes: {
			system_admin: [
				{
					key: 'chat',
					title: 'AI Chat',
					href: '/chat',
					icon: MessageCircle,
				},
			],
			teacher: [
				{
					key: 'chat',
					title: 'AI Chat',
					href: '/chat',
					icon: MessageCircle,
				},
			],
			student: [
				{
					key: 'chat',
					title: 'AI Chat',
					href: '/chat',
					icon: MessageCircle,
				},
			],
			administrator: [
				{
					key: 'chat',
					title: 'AI Chat',
					href: '/chat',
					icon: MessageCircle,
				},
			],
		},
	},

	// Placeholder features
	homepage: {
		key: 'homepage',
		title: 'Homepage',
		icon: LayoutDashboard,
		routes: {},
	},
	enrollment_info: {
		key: 'enrollment_info',
		title: 'Enrollment Info',
		icon: FileText,
		routes: {},
	},
	digital_signatures: {
		key: 'digital_signatures',
		title: 'Digital Signatures',
		icon: FilePen,
		routes: {},
	},
	financial_profile: {
		key: 'financial_profile',
		title: 'Financial Profile',
		icon: Wallet,
		routes: {},
	},
	scholarships_and_wards: {
		key: 'scholarships_and_wards',
		title: 'Scholarships',
		icon: GraduationCap,
		routes: {},
	},
	payroll_management: {
		key: 'payroll_management',
		title: 'Payroll Management',
		icon: Wallet,
		routes: {},
	},
	receipts_and_clearances: {
		key: 'receipts_and_clearances',
		title: 'Receipts & Clearances',
		icon: FileText,
		routes: {},
	},
	information_sheet: {
		key: 'information_sheet',
		title: 'Information Sheet',
		icon: FileText,
		routes: {},
	},
	online_verification: {
		key: 'online_verification',
		title: 'Online Verification',
		icon: CheckSquare,
		routes: {},
	},
	document_requests: {
		key: 'document_requests',
		title: 'Document Requests',
		icon: FileText,
		routes: {},
	},
};

// Rest of the interfaces and types remain the same...
interface NavItem {
	name: string;
	icon: any;
	href?: string;
	isLogout?: boolean;
	category?: string;
	subItems?: NavItem[];
}

interface ComponentItem {
	title: string;
	icon: any;
	category?: string;
	component: any;
}

/**
 * Checks if a given position is a valid administrator position for the school profile.
 */
export function isValidAdministratorPosition(
	schoolProfile: SchoolProfile,
	position: string,
): boolean {
	return !!getAdministratorFeatureAccess(schoolProfile, position);
}

function normalizeAdministratorPosition(position: string): string {
	return position.toLowerCase().trim().replace(/[\s-]+/g, '_');
}

function getAdministratorFeatureAccess(
	schoolProfile: SchoolProfile,
	adminPosition?: string,
): FeatureKey[] | null {
	if (!adminPosition) return null;
	const adminAccessMap = schoolProfile.roleFeatureAccess?.administrator;
	if (!adminAccessMap) return null;

	const normalizedPosition = normalizeAdministratorPosition(adminPosition);
	const directAccess = adminAccessMap[normalizedPosition];
	if (directAccess) return directAccess;

	const matchedKey = Object.keys(adminAccessMap).find(
		(key) => normalizeAdministratorPosition(key) === normalizedPosition,
	);
	return matchedKey ? adminAccessMap[matchedKey] : null;
}

/**
 * Enhanced function to check if a user has access to a specific feature
 * Now supports administrator positions defined in the school profile.
 */
function hasFeatureAccess(
	schoolProfile: SchoolProfile,
	userRole: string,
	feature: FeatureKey,
	adminPosition?: string,
): boolean {
	// Check if feature is enabled for the school
	if (!schoolProfile.enabledFeatures.includes(feature)) return false;

	// Handle administrator positions dynamically
	if (userRole === 'administrator' && adminPosition) {
		const adminAccess = getAdministratorFeatureAccess(
			schoolProfile,
			adminPosition,
		);
		return adminAccess ? adminAccess.includes(feature) : false;
	}

	// Handle standard roles
	const roleAccess =
		schoolProfile.roleFeatureAccess[
			userRole as keyof typeof schoolProfile.roleFeatureAccess
		];

	if (Array.isArray(roleAccess)) {
		return roleAccess.includes(feature);
	}

	return false;
}

/**
 * Enhanced function to generate dynamic components map based on school profile and user role
 * Now supports administrator positions defined in the school profile.
 */
export function generateDynamicComponentsMap(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPosition?: string,
): any {
	const dynamicMap: any = {
		[userRole]: {
			items: {},
		},
		shared: {
			items: {},
		},
	};

	// Get user's accessible features with position support
	const userFeatures = getUserAccessibleFeatures(
		schoolProfile,
		userRole,
		adminPosition,
	);

	// Process each feature the user has access to
	userFeatures.forEach((feature) => {
		// Check if feature is enabled for the school
		if (!schoolProfile.enabledFeatures.includes(feature)) return;

		const featureConfig = featureConfigurations[feature];
		if (!featureConfig) return;

		// Get routes for the user's role
		let routes = featureConfig.routes[userRole];
		if (!routes && userRole === 'administrator') {
			// If no specific routes for 'administrator' are defined for this feature,
			// this indicates a configuration error or a feature that's not
			// meant to have specific admin routes. We will skip it.
			return;
		}
		if (!routes) {
			return;
		}

		// Add each route for this feature
		routes.forEach((route) => {
			const component = componentMappings[route.key];

			if (!component) {
				console.warn(`Component not found for key: ${route.key}`);
				return;
			}

			const componentItem: ComponentItem = {
				title: route.title,
				icon: route.icon || featureConfig.icon,
				category: featureConfig.category,
				component: component,
			};

			// Add to role-specific section or shared section
			if (isSharedComponent(route.key)) {
				dynamicMap.shared.items[route.key] = componentItem;
			} else {
				dynamicMap[userRole].items[route.key] = componentItem;
			}
		});
	});

	return dynamicMap;
}

/**
 * Check if a component should be in the shared section
 */
function isSharedComponent(key: string): boolean {
	const sharedComponents = [
		'profile',
		'chat',
		'notifications',
		'resources/view',
		'calendar-academic',
		'schedules',
		'periodic-grade',
		'yearly-grade',
		'periodic-reports',
		'yearly-reports',
		'semester-report',
	];
	return sharedComponents.includes(key);
}

/**
 * Enhanced navigation generation with administrator position support
 */
export function generateNavigationItems(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPosition?: string,
): NavItem[] {
	const navItems: NavItem[] = [];
	const moveNavItemBefore = (
		items: NavItem[],
		itemName: string,
		beforeName: string,
	) => {
		const fromIndex = items.findIndex((item) => item.name === itemName);
		const toIndex = items.findIndex((item) => item.name === beforeName);
		if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
		const [moved] = items.splice(fromIndex, 1);
		const nextIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
		items.splice(nextIndex, 0, moved);
	};

	// Add dashboard home (always first)
	navItems.push({
		name: 'Dashboard',
		icon: LayoutDashboard,
		href: '/dashboard',
	});

	// Get user's accessible features with position support
	const accessibleFeatures = getUserAccessibleFeatures(
		schoolProfile,
		userRole,
		adminPosition,
	);

	// Group routes by category
	const routesByCategory: Record<
		string,
		Array<{
			title: string;
			icon: any;
			href: string;
			key: string;
		}>
	> = {};
	const uncategorizedRoutes: Array<{
		title: string;
		icon: any;
		href: string;
		key: string;
	}> = [];

	// Process each accessible feature
	accessibleFeatures.forEach((feature) => {
		if (feature === 'dashboard') return; // Skip dashboard as it's already added
		// Check if feature is enabled for the school
		if (!schoolProfile.enabledFeatures.includes(feature)) return;

		const featureConfig = featureConfigurations[feature];
		if (!featureConfig) return;

		// Get routes for the user's role
		let routes = featureConfig.routes[userRole];
		if (!routes) {
			return;
		}

		routes.forEach((route) => {
			const routeItem = {
				title: route.title,
				icon: route.icon || featureConfig.icon,
				href: route.href,
				key: route.key,
			};

			if (featureConfig.category) {
				if (!routesByCategory[featureConfig.category]) {
					routesByCategory[featureConfig.category] = [];
				}
				const alreadyAdded = routesByCategory[featureConfig.category].some(
					(item) => item.href === routeItem.href
				);
				if (!alreadyAdded) {
					routesByCategory[featureConfig.category].push(routeItem);
				}
			} else {
				const alreadyAdded = uncategorizedRoutes.some(
					(item) => item.href === routeItem.href
				);
				if (!alreadyAdded) {
					uncategorizedRoutes.push(routeItem);
				}
			}
		});
	});

	// Convert categories to nav items
	Object.entries(routesByCategory).forEach(([categoryName, routes]) => {
		if (routes.length === 1) {
			// Single route - add directly
			navItems.push({
				name: routes[0].title,
				icon: routes[0].icon,
				href: routes[0].href,
			});
		} else {
			// Multiple routes - create submenu
			navItems.push({
				name: categoryName,
				icon: routes[0].icon, // Use first route's icon for category
				subItems: routes.map((route) => ({
					name: route.title,
					icon: route.icon,
					href: route.href,
				})),
			});
		}
	});

	// Add uncategorized routes
	const uncategorizedOrder = ['community', 'profile'];
	uncategorizedRoutes
		.sort((a, b) => {
			const aIndex = uncategorizedOrder.indexOf(a.key);
			const bIndex = uncategorizedOrder.indexOf(b.key);
			if (aIndex === -1 && bIndex === -1) return 0;
			if (aIndex === -1) return 1;
			if (bIndex === -1) return -1;
			return aIndex - bIndex;
		})
		.forEach((route) => {
			navItems.push({
				name: route.title,
				icon: route.icon,
				href: route.href,
			});
		});

	const calendarNavLabel = 'Calendar & Schedules';
	if (userRole === 'system_admin') {
		moveNavItemBefore(navItems, calendarNavLabel, 'Profile');
	} else {
		moveNavItemBefore(navItems, calendarNavLabel, 'Community');
	}

	return navItems;
}

/**
 * Enhanced component access validation with administrator position support
 */
export function validateComponentAccess(
	schoolProfile: SchoolProfile,
	userRole: string,
	routeKey: string,
	adminPosition?: string,
): boolean {
	// Explicitly tie report routes to academic_reports feature access
	const reportRouteFeatureMap: Record<string, FeatureKey> = {
		'periodic-grade': 'academic_reports',
		'yearly-grade': 'academic_reports',
		'periodic-reports': 'academic_reports',
		'yearly-reports': 'academic_reports',
		'semester-report': 'academic_reports',
	};
	if (reportRouteFeatureMap[routeKey]) {
		return hasFeatureAccess(
			schoolProfile,
			userRole,
			reportRouteFeatureMap[routeKey],
			adminPosition,
		);
	}

	// Find which feature this route belongs to
	for (const feature of Object.values(featureConfigurations)) {
		let userRoutes = feature.routes[userRole];
		if (!userRoutes) {
			continue;
		}

		if (userRoutes.some((route) => route.key === routeKey)) {
			return hasFeatureAccess(
				schoolProfile,
				userRole,
				feature.key,
				adminPosition,
			);
		}
	}
	console.warn(`Route key "${routeKey}" not found in any feature.`);
	return false;
}

/**
 * Enhanced user routes getter with administrator position support
 */
export function getUserRoutes(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPosition?: string,
): Array<{
	key: string;
	title: string;
	href: string;
	icon: any;
	category?: string;
}> {
	const routes: Array<{
		key: string;
		title: string;
		href: string;
		icon: any;
		category?: string;
	}> = [];

	const accessibleFeatures = getUserAccessibleFeatures(
		schoolProfile,
		userRole,
		adminPosition,
	);

	accessibleFeatures.forEach((feature) => {
		const featureConfig = featureConfigurations[feature];
		if (!featureConfig) return;

		let featureRoutes = featureConfig.routes[userRole];
		if (!featureRoutes) {
			return;
		}

		featureRoutes.forEach((route) => {
			routes.push({
				key: route.key,
				title: route.title,
				href: route.href,
				icon: route.icon || featureConfig.icon,
				category: featureConfig.category,
			});
		});
	});

	return routes;
}

// Export utility functions
export function isFeatureEnabled(
	schoolProfile: SchoolProfile,
	feature: FeatureKey,
): boolean {
	return schoolProfile.enabledFeatures.includes(feature);
}

export function getUserAccessibleFeatures(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPosition?: string,
): FeatureKey[] {
	if (userRole === 'administrator' && adminPosition) {
		const adminAccess = getAdministratorFeatureAccess(
			schoolProfile,
			adminPosition,
		);
		const features = adminAccess || [];

		const uniqueFeatures = Array.from(new Set(features));
		return uniqueFeatures.filter((feature) =>
			schoolProfile.enabledFeatures.includes(feature),
		);
	}

	const roleAccess =
		schoolProfile.roleFeatureAccess[
			userRole as keyof typeof schoolProfile.roleFeatureAccess
		];

	const features = Array.isArray(roleAccess) ? roleAccess : [];
	const uniqueFeatures = Array.from(new Set(features));
	if (
		userRole === 'student' &&
		schoolProfile.enabledFeatures.includes('notifications') &&
		!uniqueFeatures.includes('notifications')
	) {
		uniqueFeatures.push('notifications');
	}

	return uniqueFeatures.filter((feature) =>
		schoolProfile.enabledFeatures.includes(feature),
	);
}

export function getFeatureConfig(
	feature: FeatureKey,
): FeatureConfig | undefined {
	return featureConfigurations[feature];
}

export default generateDynamicComponentsMap;
