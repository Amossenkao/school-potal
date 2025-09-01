// utils/componentsMap.ts
// Enhanced components map with feature-based navigation generation

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

	// Lesson Planning
	'view-lessonplans': dynamic(
		() => import('@/app/dashboard/admin/ViewLessonPlans')
	),
	'view-schemeofwork': dynamic(
		() => import('@/app/dashboard/admin/ViewSchemeOrWork')
	),
	'lesson-plans/submit': dynamic(
		() => import('@/app/dashboard/teacher/SubmitLessonPlan')
	),
	'lesson-plans/scheme': dynamic(
		() => import('@/app/dashboard/teacher/SubmitSchemeOfWork')
	),
	'lesson-plans/manage': dynamic(
		() => import('@/app/dashboard/teacher/ManageLessonPlans')
	),

	// Calendar
	'add-event': dynamic(() => import('@/app/dashboard/admin/AddCalendarEvent')),
	'calendar/academic': dynamic(
		() => import('@/app/dashboard/shared/CalendarAndSchedules')
	),

	// Academic Resources
	'resources/view': dynamic(
		() => import('@/app/dashboard/shared/ViewResources')
	),
	'resources/add': dynamic(() => import('@/app/dashboard/admin/AddResource')),
	'resources/add-teacher': dynamic(
		() => import('@/app/dashboard/teacher/AddResource')
	),
	'resources/manage': dynamic(
		() => import('@/app/dashboard/admin/ManageResources')
	),
	'resources/manage-teacher': dynamic(
		() => import('@/app/dashboard/teacher/ManageResources')
	),

	// Fees Payment
	pay: dynamic(() => import('@/app/dashboard/student/fees/PayFees')),
	'payment-history': dynamic(
		() => import('@/app/dashboard/student/fees/PaymentHistory')
	),

	// Salary
	'salary/advance': dynamic(
		() => import('@/app/dashboard/teacher/RequestSalaryAdvance')
	),
	'salary/sign': dynamic(() => import('@/app/dashboard/teacher/SignForSalary')),
	'salary/advance-admin': dynamic(
		() => import('@/app/dashboard/administrator/requestSalaryAdvance')
	),
	'salary/sign-admin': dynamic(
		() => import('@/app/dashboard/administrator/signForSalary')
	),

	// Events Log
	notifications: dynamic(() => import('@/app/dashboard/shared/Notifications')),

	// Settings & Support
	settings: dynamic(() => import('@/app/dashboard/admin/Settings')),
	support: dynamic(() => import('@/app/dashboard/admin/Support')),

	// Shared components
	profile: dynamic(() => import('@/app/dashboard/shared/UserProfile')),
	messages: dynamic(() => import('@/app/dashboard/shared/Messages')),
};

// Feature configurations with navigation structure - NOW COMPLETE!
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

	// NEW: User Management Feature
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

	// NEW: Grading System Feature
	grading_system: {
		key: 'grading_system',
		title: 'Grading System',
		icon: CheckSquare,
		category: 'Academics',
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
			],
			teacher: [
				{
					key: 'grading',
					title: 'Grade Management',
					href: '/grading',
					icon: CheckSquare,
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

	// NEW: Class Management Feature
	class_management: {
		key: 'class_management',
		title: 'Class Management',
		icon: GraduationCap,
		category: 'Academics',
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

	// NEW: Academic Reports Feature
	academic_reports: {
		key: 'academic_reports',
		title: 'Academic Reports',
		icon: Library,
		category: 'Academics',
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
					key: 'masters',
					title: 'Master Grade Sheets',
					href: '/masters',
					icon: ClipboardList,
				},
			],
		},
	},

	// NEW: Lesson Planning Feature
	lesson_planning: {
		key: 'lesson_planning',
		title: 'Lesson Planning',
		icon: BookOpen,
		category: 'Academics',
		routes: {
			system_admin: [
				{
					key: 'view-lessonplans',
					title: 'View Lesson Plans',
					href: '/view-lessonplans',
					icon: BookOpen,
				},
				{
					key: 'view-schemeofwork',
					title: 'View Scheme of Work',
					href: '/view-schemeofwork',
					icon: ClipboardList,
				},
			],
			teacher: [
				{
					key: 'lesson-plans/submit',
					title: 'Submit Lesson Plan',
					href: '/lesson-plans/submit',
					icon: FilePen,
				},
				{
					key: 'lesson-plans/scheme',
					title: 'Submit Scheme of Work',
					href: '/lesson-plans/scheme',
					icon: FilePen,
				},
				{
					key: 'lesson-plans/manage',
					title: 'Manage Lesson Plans',
					href: '/lesson-plans/manage',
					icon: BookOpen,
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

	notifications: {
		key: 'notifications',
		title: 'Notificatios',
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

	support_system: {
		key: 'support_system',
		title: 'Support System',
		icon: Shield,
		routes: {
			system_admin: [
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

	messages: {
		key: 'messages',
		title: 'Messages',
		icon: MessageCircle,
		routes: {
			system_admin: [
				{
					key: 'messages',
					title: 'Messages',
					href: '/messages',
					icon: MessageCircle,
				},
			],
			teacher: [
				{
					key: 'messages',
					title: 'Messages',
					href: '/messages',
					icon: MessageCircle,
				},
			],
			student: [
				{
					key: 'messages',
					title: 'Messages',
					href: '/messages',
					icon: MessageCircle,
				},
			],
			administrator: [
				{
					key: 'messages',
					title: 'Messages',
					href: '/messages',
					icon: MessageCircle,
				},
			],
		},
	},

	// Placeholder features (no routes yet, but structure ready)
	financial_reports: {
		key: 'financial_reports',
		title: 'Financial Reports',
		icon: FileText,
		category: 'Financial',
		routes: {},
	},

	admissions: {
		key: 'admissions',
		title: 'Admissions',
		icon: GraduationCap,
		category: 'Student Management',
		routes: {},
	},

	scholarships: {
		key: 'scholarships',
		title: 'Scholarships',
		icon: GraduationCap,
		category: 'Student Management',
		routes: {},
	},

	student_records: {
		key: 'student_records',
		title: 'Student Records',
		icon: FileText,
		category: 'Student Management',
		routes: {},
	},
};

// Rest of the code remains the same...
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
 * Checks if a user has access to a specific feature
 */
function hasFeatureAccess(
	schoolProfile: SchoolProfile,
	userRole: string,
	feature: FeatureKey
): boolean {
	// Check if feature is enabled for the school
	if (!schoolProfile.enabledFeatures.includes(feature)) return false;

	// Check if user role has access to the feature
	const roleAccess = schoolProfile.roleFeatureAccess[userRole];
	if (!roleAccess) return false;

	return roleAccess.features.includes(feature);
}

/**
 * Generates dynamic components map based on school profile and user role
 */
export function generateDynamicComponentsMap(
	schoolProfile: SchoolProfile,
	userRole: string
): any {
	const dynamicMap: any = {
		[userRole]: {
			items: {},
		},
		shared: {
			items: {},
		},
	};

	// Process each feature the user has access to
	const userFeatures =
		schoolProfile.roleFeatureAccess[userRole]?.features || [];

	userFeatures.forEach((feature) => {
		// Check if feature is enabled for the school
		if (!schoolProfile.enabledFeatures.includes(feature)) return;

		const featureConfig = featureConfigurations[feature];
		if (!featureConfig || !featureConfig.routes[userRole]) return;

		// Add each route for this feature
		featureConfig.routes[userRole].forEach((route) => {
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
		'messages',
		'resources/view',
		'calendar/academic',
		'periodic-grade',
		'yearly-grade',
	];
	return sharedComponents.includes(key);
}

// Rest of the functions remain the same...
/**
 * Generate navigation structure for sidebar
 */
export function generateNavigationItems(
	schoolProfile: SchoolProfile,
	userRole: string
): NavItem[] {
	const navItems: NavItem[] = [];

	// Add dashboard home (always first)
	navItems.push({
		name: 'Dashboard',
		icon: LayoutDashboard,
		href: '/dashboard',
	});

	// Get user's accessible features
	const userFeatures =
		schoolProfile.roleFeatureAccess[userRole]?.features || [];
	const accessibleFeatures = userFeatures.filter((feature) =>
		schoolProfile.enabledFeatures.includes(feature)
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

		const featureConfig = featureConfigurations[feature];
		if (!featureConfig || !featureConfig.routes[userRole]) return;

		featureConfig.routes[userRole].forEach((route) => {
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
 * Check if a feature is enabled for the school
 */
export function isFeatureEnabled(
	schoolProfile: SchoolProfile,
	feature: FeatureKey
): boolean {
	return schoolProfile.enabledFeatures.includes(feature);
}

/**
 * Get user's accessible features
 */
export function getUserAccessibleFeatures(
	schoolProfile: SchoolProfile,
	userRole: string
): FeatureKey[] {
	const roleAccess = schoolProfile.roleFeatureAccess[userRole];
	if (!roleAccess) return [];

	// Return only features that are both enabled for school and accessible to user
	return roleAccess.features.filter((feature) =>
		schoolProfile.enabledFeatures.includes(feature)
	);
}

/**
 * Validate component access for a specific route
 */
export function validateComponentAccess(
	schoolProfile: SchoolProfile,
	userRole: string,
	routeKey: string
): boolean {
	// Find which feature this route belongs to
	for (const feature of Object.values(featureConfigurations)) {
		const userRoutes = feature.routes[userRole];
		if (userRoutes && userRoutes.some((route) => route.key === routeKey)) {
			return hasFeatureAccess(schoolProfile, userRole, feature.key);
		}
	}
	return false;
}

/**
 * Get feature configuration by key
 */
export function getFeatureConfig(
	feature: FeatureKey
): FeatureConfig | undefined {
	return featureConfigurations[feature];
}

/**
 * Get all available routes for a user role
 */
export function getUserRoutes(
	schoolProfile: SchoolProfile,
	userRole: string
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

	const userFeatures =
		schoolProfile.roleFeatureAccess[userRole]?.features || [];
	const accessibleFeatures = userFeatures.filter((feature) =>
		schoolProfile.enabledFeatures.includes(feature)
	);

	accessibleFeatures.forEach((feature) => {
		const featureConfig = featureConfigurations[feature];
		if (!featureConfig || !featureConfig.routes[userRole]) return;

		featureConfig.routes[userRole].forEach((route) => {
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

export default generateDynamicComponentsMap;
