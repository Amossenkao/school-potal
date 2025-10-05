// utils/componentsMap.ts
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

// Component mappings - centralized component imports
const componentMappings: Record<string, any> = {
	// User Management
	'add-users': dynamic(() => import('@/app/dashboard/admin/users/AddUsers')),
	'manage-users': dynamic(
		() => import('@/app/dashboard/admin/users/ManageUsers')
	),

	// Grading
	submissions: dynamic(
		() => import('@/app/dashboard/admin/grades/GradeSubmissions')
	),
	requests: dynamic(() => import('@/app/dashboard/admin/grades/GradeRequests')),
	grading: dynamic(
		() => import('@/app/dashboard/teacher/grading/GradeManagement')
	),
	'periodic-grade': dynamic(
		() => import('@/app/dashboard/shared/PeriodicReport')
	),
	'yearly-grade': dynamic(() => import('@/app/dashboard/shared/YearlyReport')),

	// Classes
	'classes-overview': dynamic(
		() => import('@/app/dashboard/admin/classes/ClassOverview')
	),
	'manage-class': dynamic(
		() => import('@/app/dashboard/admin/classes/ManageClass')
	),

	// Academic Reports
	'periodic-reports': dynamic(
		() => import('@/app/dashboard/shared/PeriodicReport')
	),
	'yearly-reports': dynamic(
		() => import('@/app/dashboard/shared/YearlyReport')
	),
	masters: dynamic(() => import('@/app/dashboard/shared/MasterGradeSheet')),

	'grade-submissions': dynamic(
		() => import('@/app/dashboard/teacher/grading/GradeSubmissions')
	),
	'submit-grades': dynamic(
		() => import('@/app/dashboard/teacher/grading/SubmitGrade')
	),
	'grade-requests': dynamic(
		() => import('@/app/dashboard/teacher/grading/GradeRequests')
	),

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
	// 'add-event': dynamic(() => import('@/app/dashboard/admin/AddCalendarEvent')),
	// 'calendar/academic': dynamic(
	// 	() => import('@/app/dashboard/shared/CalendarAndSchedules')
	// ),

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
	pay: dynamic(() => import('@/app/dashboard/student/fees/PayFees')),
	'payment-history': dynamic(
		() => import('@/app/dashboard/student/fees/PaymentHistory')
	),

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
	notifications: dynamic(() => import('@/app/dashboard/shared/Notifications')),

	// Settings & Support
	settings: dynamic(() => import('@/app/dashboard/admin/Settings')),
	support: dynamic(() => import('@/app/dashboard/admin/Support')),

	// Shared components
	profile: dynamic(() => import('@/app/dashboard/shared/UserProfile')),
	chat: dynamic(() => import('@/app/dashboard/shared/Chat')),

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
					key: 'add-event',
					title: 'Add Event to Calendar',
					href: '/add-event',
					icon: CalendarDays,
				},
				{
					key: 'calendar/academic',
					title: 'Academic Calendar',
					href: '/calendar/academic',
					icon: CalendarDays,
				},
			],
			teacher: [
				{
					key: 'calendar/academic',
					title: 'Academic Calendar',
					href: '/calendar/academic',
					icon: CalendarDays,
				},
			],
			student: [
				{
					key: 'calendar/academic',
					title: 'Academic Calendar',
					href: '/calendar/academic',
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
	position: string
): boolean {
	return (
		!!schoolProfile.roleFeatureAccess?.administrator &&
		Object.keys(schoolProfile.roleFeatureAccess.administrator).includes(
			position
		)
	);
}

/**
 * Enhanced function to check if a user has access to a specific feature
 * Now supports administrator positions defined in the school profile.
 */
function hasFeatureAccess(
	schoolProfile: SchoolProfile,
	userRole: string,
	feature: FeatureKey,
	adminPosition?: string
): boolean {
	// Check if feature is enabled for the school
	if (!schoolProfile.enabledFeatures.includes(feature)) return false;

	// Handle administrator positions dynamically
	if (userRole === 'administrator' && adminPosition) {
		const adminAccess =
			schoolProfile.roleFeatureAccess.administrator[
				adminPosition.toLowerCase()
			];

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
	adminPosition?: string
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
		adminPosition
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
		'calendar/academic',
		'periodic-grade',
		'yearly-grade',
		'periodic-reports',
		'yearly-reports',
	];
	return sharedComponents.includes(key);
}

/**
 * Enhanced navigation generation with administrator position support
 */
export function generateNavigationItems(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPosition?: string
): NavItem[] {
	const navItems: NavItem[] = [];

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
		adminPosition
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
				routesByCategory[featureConfig.category].push(routeItem);
			} else {
				uncategorizedRoutes.push(routeItem);
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
	uncategorizedRoutes.forEach((route) => {
		navItems.push({
			name: route.title,
			icon: route.icon,
			href: route.href,
		});
	});

	return navItems;
}

/**
 * Enhanced component access validation with administrator position support
 */
export function validateComponentAccess(
	schoolProfile: SchoolProfile,
	userRole: string,
	routeKey: string,
	adminPosition?: string
): boolean {
	// Find which feature this route belongs to
	for (const feature of Object.values(featureConfigurations)) {
		let userRoutes = feature.routes[userRole];
		console.log('Validating routeKey:', routeKey, 'for feature:', feature.key);
		console.log('User routes for role:', userRole, userRoutes);
		if (!userRoutes) {
			continue;
		}

		if (userRoutes.some((route) => route.key === routeKey)) {
			return hasFeatureAccess(
				schoolProfile,
				userRole,
				feature.key,
				adminPosition
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
	adminPosition?: string
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
		adminPosition
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
	feature: FeatureKey
): boolean {
	return schoolProfile.enabledFeatures.includes(feature);
}

export function getUserAccessibleFeatures(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPosition?: string
): FeatureKey[] {
	if (userRole === 'administrator' && adminPosition) {
		const adminAccess =
			schoolProfile.roleFeatureAccess.administrator[
				adminPosition.toLowerCase()
			];
		const features = adminAccess || [];

		return features.filter((feature) =>
			schoolProfile.enabledFeatures.includes(feature)
		);
	}

	const roleAccess =
		schoolProfile.roleFeatureAccess[
			userRole as keyof typeof schoolProfile.roleFeatureAccess
		];

	const features = Array.isArray(roleAccess) ? roleAccess : [];

	return features.filter((feature) =>
		schoolProfile.enabledFeatures.includes(feature)
	);
}

export function getFeatureConfig(
	feature: FeatureKey
): FeatureConfig | undefined {
	return featureConfigurations[feature];
}

export default generateDynamicComponentsMap;
