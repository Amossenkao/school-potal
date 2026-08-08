// utils/componentsMap.ts
import React from 'react';
import dynamic from 'next/dynamic';
import {
	LayoutDashboard,
	GraduationCap,
	FileText,
	CheckSquare,
	ClipboardList,
	CalendarDays,
	Wallet,
	AlignEndVerticalIcon,
	Settings,
	Shield,
	UserCircle,
	MessageCircle,
	UserPlus,
	UserCheck,
	BellDot,
	BookCheck,
	Users2,
	ClipboardCheck,
	DollarSign,
	Users,
	Library,
} from 'lucide-react';
import type { SchoolProfile } from '@/types/schoolProfile';
import type { FeatureKey } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ComponentImporter = () => Promise<any>;

interface RouteDefinition {
	key: string;
	title: string;
	href: string;
	icon: any;
	/** Feature gate: route is only shown when this feature is enabled */
	feature: FeatureKey;
	/** Nav category used to group sidebar items */
	category?: string;
	/** Nav display order within its category (lower = higher) */
	order?: number;
	/** When true the route lives in the shared component map bucket */
	shared?: boolean;
	/** Extra feature that must also be enabled (e.g. online_payment for /pay) */
	requiresFeature?: FeatureKey;
}

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

// ---------------------------------------------------------------------------
// Loading / error UI (unchanged from original)
// ---------------------------------------------------------------------------

const DashboardSectionLoading = () =>
	React.createElement(
		'div',
		{ className: 'flex min-h-[40vh] items-center justify-center px-4' },
		React.createElement(
			'div',
			{
				className:
					'flex flex-col items-center gap-4 rounded-2xl border border-border/70 bg-card/90 px-6 py-6',
			},
			React.createElement(
				'div',
				{ className: 'loader-shell h-14 w-14' },
				React.createElement('div', {
					className: 'loader-ring loader-ring-outer',
				}),
				React.createElement('div', {
					className: 'loader-ring loader-ring-middle',
				}),
				React.createElement('div', {
					className: 'loader-ring loader-ring-inner',
				}),
				React.createElement(
					'div',
					{ className: 'loader-center' },
					React.createElement(GraduationCap, {
						className: 'h-5 w-5 text-primary',
					}),
				),
			),
			React.createElement(
				'span',
				{ className: 'text-sm text-muted-foreground' },
				'Opening section...',
			),
		),
	);

const ChunkLoadFallback = () =>
	React.createElement(
		'div',
		{ className: 'min-h-[60vh] flex items-center justify-center px-4' },
		React.createElement(
			'div',
			{
				className:
					'w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm',
			},
			React.createElement(
				'h2',
				{ className: 'text-xl font-semibold text-foreground' },
				"You're Offline",
			),
			React.createElement(
				'p',
				{ className: 'mt-2 text-sm text-muted-foreground' },
				'This dashboard section is not cached for offline use yet. Open it once while online, then try again offline.',
			),
		),
	);

const lazySection = (key: string, importer: ComponentImporter) =>
	dynamic(
		() =>
			importer().catch((error: unknown) => {
				console.warn(`Chunk load failed for key: ${key}`, error);
				return { default: ChunkLoadFallback };
			}),
		{ loading: () => React.createElement(DashboardSectionLoading) },
	);

// ---------------------------------------------------------------------------
// Component importers  (single source of truth for lazy imports)
// ---------------------------------------------------------------------------

const componentImporters: Record<string, ComponentImporter> = {
	dashboard: () => import('@/components/DashboardHomePage'),

	// User Management
	'add-users': () => import('@/app/dashboard/admin/users/AddUsers'),
	'manage-users': () => import('@/app/dashboard/admin/users/ManageUsers'),

	// Grading
	submissions: () => import('@/app/dashboard/admin/grades/GradeSubmissions'),
	'grade-submissions': () =>
		import('@/app/dashboard/teacher/grading/GradeSubmissions'),
	'submit-grades': () => import('@/app/dashboard/teacher/grading/SubmitGrade'),
	'grade-requests': () => import('@/app/dashboard/shared/GradeRequests'),
	masters: () => import('@/app/dashboard/shared/MasterGradeSheet'),

	// Academic Reports
	'periodic-reports': () => import('@/app/dashboard/shared/PeriodicReport'),
	'yearly-reports': () => import('@/app/dashboard/shared/YearlyReport'),
	'semester-report': () => import('@/app/dashboard/shared/SemesterReport'),

	// Classes
	'classes-overview': () =>
		import('@/app/dashboard/admin/classes/ClassOverview'),
	'manage-class': () => import('@/app/dashboard/admin/classes/ManageClass'),

	// Calendar
	'academic-calendar': () => import('@/app/dashboard/shared/AcademicCalendar'),
	schedules: () => import('@/app/dashboard/shared/Schedules'),

	// Student Fees
	'financial-profile': () =>
		import('@/app/dashboard/student/fees/FinancialProfile'),
	pay: () => import('@/app/dashboard/student/fees/PayFees'),
	'payment-history': () =>
		import('@/app/dashboard/student/fees/PaymentHistory'),

	// Admin Financial
	'record-payments': () =>
		import('@/app/dashboard/record-payments/RecordPayments'),
	scholarships: () => import('@/app/dashboard/scholarships/Scholarships'),
	clearances: () => import('@/app/dashboard/clearances/Clearances'),
	'financial-reports': () => import('@/app/dashboard/shared/FinancialReports'),
	// Route key is `financial-audit`, not `audit`: /dashboard/audit is already a
	// static superadmin route and would shadow the dynamic [page] route.
	'financial-audit': () => import('@/app/dashboard/shared/FinancialAudit'),
	'admin-payment-history': () =>
		import('@/app/dashboard/payment-history/AdminPaymentHistory'),

	// Academic Documents
	transcripts: () => import('@/app/dashboard/documents/TranscriptRecommendation'),
	attestation: () => import('@/app/dashboard/attestation/Attestation'),
	'graduation-clearance': () =>
		import('@/app/dashboard/graduation-clearance/GraduationClearance'),
	diploma: () => import('@/app/dashboard/diploma/Diploma'),
	'digital-id': () => import('@/app/dashboard/digital-id/DigitalId'),

	// Attendance
	'student-attendance': () => import('@/app/dashboard/shared/Attendance'),
	'teacher-attendance': () =>
		import('@/app/dashboard/shared/TeacherAttendanceAdmin'),
	'my-attendance': () => import('@/app/dashboard/shared/TeacherAttendanceView'),

	// Shared / General
	notifications: () => import('@/app/dashboard/shared/Notifications'),
	profile: () => import('@/app/dashboard/shared/UserProfile'),
	chat: () => import('@/app/dashboard/shared/Chat'),
	community: () => import('@/app/dashboard/shared/Community'),
	settings: () => import('@/app/dashboard/admin/Settings'),
	support: () => import('@/app/dashboard/admin/Support'),
};

const componentMappings: Record<string, any> = Object.fromEntries(
	Object.entries(componentImporters).map(([key, importer]) => [
		key,
		lazySection(key, importer),
	]),
);

// ---------------------------------------------------------------------------
// Route groups  (shared across multiple roles — define once, inherit freely)
// ---------------------------------------------------------------------------

/**
 * Routes that appear for every authenticated user regardless of role.
 * Listed last in nav (profile, notifications) or first (dashboard).
 */
const GROUP_AUTHENTICATED: RouteDefinition[] = [
	{
		key: 'dashboard',
		title: 'Dashboard',
		href: '/dashboard',
		icon: LayoutDashboard,
		feature: 'default_features',
		order: 0,
	},
	{
		key: 'profile',
		title: 'Profile',
		href: '/profile',
		icon: UserCircle,
		feature: 'default_features',
		shared: true,
		order: 900,
	},
	{
		key: 'notifications',
		title: 'Notifications',
		href: '/notifications',
		icon: BellDot,
		feature: 'default_features',
		shared: true,
		order: 910,
	},
];

/**
 * Routes shared between teachers AND students (and by extension, parents).
 */
const GROUP_ACADEMIC_USERS: RouteDefinition[] = [
	{
		key: 'academic-calendar',
		title: 'Academic Calendar',
		href: '/academic-calendar',
		icon: CalendarDays,
		feature: 'calendar_events',
		category: 'Calendar & Schedules',
		shared: true,
		order: 60,
	},
	{
		key: 'schedules',
		title: 'Schedules',
		href: '/schedules',
		icon: CalendarDays,
		feature: 'calendar_events',
		category: 'Calendar & Schedules',
		shared: true,
		order: 61,
	},
	{
		key: 'community',
		title: 'Community',
		href: '/community',
		icon: Users2,
		feature: 'community',
		order: 70,
	},
	{
		key: 'chat',
		title: 'AI Chat',
		href: '/chat',
		icon: MessageCircle,
		feature: 'ai_chat',
		category: 'AI Chat',
		shared: true,
		order: 920,
	},
];

/**
 * Grading routes for teachers (and teacher-admins).
 */
const GROUP_GRADING_STAFF: RouteDefinition[] = [

	{
		key: 'grade-requests',
		title: 'Grade Requests',
		href: '/grade-requests',
		icon: CheckSquare,
		feature: 'grade_management',
		category: 'Grading',
		order: 22,
	},
	{
		key: 'masters',
		title: 'Master Grade Sheets',
		href: '/masters',
		icon: ClipboardList,
		feature: 'grade_management',
		category: 'Grading',
		order: 23,
	},
	{
		key: 'student-attendance',
		title: 'Student Attendance',
		href: '/student-attendance',
		icon: AlignEndVerticalIcon,
		feature: 'student_attendance',
		category: 'Attendance',
		order: 50,
	},

];

/**
 * Academic document routes shared between system_admin and administrator.
 */
const GROUP_ACADEMIC_DOCUMENTS: RouteDefinition[] = [
	{
		key: 'transcripts',
		title: 'Transcript & Recommendation',
		href: '/dashboard/transcripts',
		icon: FileText,
		feature: 'transcripts',
		category: 'Academic Documents',
		order: 40,
	},
	{
		key: 'attestation',
		title: 'Attestation',
		href: '/dashboard/attestation',
		icon: FileText,
		feature: 'attestations',
		category: 'Academic Documents',
		order: 41,
	},
	{
		key: 'graduation-clearance',
		title: 'Graduation Clearance',
		href: '/dashboard/graduation-clearance',
		icon: GraduationCap,
		feature: 'graduation_clearance',
		category: 'Academic Documents',
		order: 42,
	},
	{
		key: 'diploma',
		title: 'Diploma',
		href: '/dashboard/diploma',
		icon: GraduationCap,
		feature: 'diplomas',
		category: 'Academic Documents',
		order: 43,
	},
	{
		key: 'digital-id',
		title: 'Digital ID',
		href: '/dashboard/digital-id',
		icon: Shield,
		feature: 'digital_id',
		category: 'Academic Documents',
		order: 44,
	},
];

// ---------------------------------------------------------------------------
// Role route tables
// Each role declares which groups it inherits plus its own exclusive routes.
// ---------------------------------------------------------------------------

const ROLE_ROUTES: Record<
	string,
	{ inherits: RouteDefinition[][]; routes: RouteDefinition[] }
> = {
	// ── System Admin ────────────────────────────────────────────────────────
	system_admin: {
		inherits: [GROUP_AUTHENTICATED, GROUP_ACADEMIC_DOCUMENTS, GROUP_GRADING_STAFF],
		routes: [
			// User management
			{
				key: 'add-users',
				title: 'Add Users',
				href: '/add-users',
				icon: UserPlus,
				feature: 'user_management',
				category: 'User Management',
				order: 10,
			},
			{
				key: 'manage-users',
				title: 'Manage Users',
				href: '/manage-users',
				icon: UserCheck,
				feature: 'user_management',
				category: 'User Management',
				order: 11,
			},
			// Grading (admin view)
			{
				key: 'submissions',
				title: 'Grade Submissions',
				href: '/submissions',
				icon: BookCheck,
				feature: 'grade_management',
				category: 'Grading',
				order: 20,
			},

			// Classes
			{
				key: 'classes-overview',
				title: 'Classes Overview',
				href: '/classes-overview',
				icon: GraduationCap,
				feature: 'class_management',
				category: 'Enrollment',
				order: 30,
			},
			{
				key: 'manage-class',
				title: 'Manage Classes',
				href: '/manage-class',
				icon: Settings,
				feature: 'class_management',
				category: 'Enrollment',
				order: 31,
			},
			// Academic Reports
			{
				key: 'periodic-reports',
				title: 'Periodic Reports',
				href: '/periodic-reports',
				icon: FileText,
				feature: 'academic_reports',
				category: 'Academic Reports',
				shared: true,
				order: 35,
			},
			{
				key: 'yearly-reports',
				title: 'Yearly Reports',
				href: '/yearly-reports',
				icon: FileText,
				feature: 'academic_reports',
				category: 'Academic Reports',
				shared: true,
				order: 36,
			},
			{
				key: 'semester-report',
				title: 'Semester Report',
				href: '/semester-report',
				icon: FileText,
				feature: 'academic_reports',
				category: 'Academic Reports',
				shared: true,
				order: 37,
			},
			// Calendar
			{
				key: 'academic-calendar',
				title: 'Academic Calendar',
				href: '/academic-calendar',
				icon: CalendarDays,
				feature: 'calendar_events',
				category: 'Calendar & Schedules',
				shared: true,
				order: 60,
			},
			{
				key: 'schedules',
				title: 'Schedules',
				href: '/schedules',
				icon: CalendarDays,
				feature: 'calendar_events',
				category: 'Calendar & Schedules',
				shared: true,
				order: 61,
			},
			// Attendance
			{
				key: 'student-attendance',
				title: 'Student Attendance',
				href: '/student-attendance',
				icon: AlignEndVerticalIcon,
				feature: 'student_attendance',
				category: 'Attendance',
				order: 50,
			},
			{
				key: 'teacher-attendance',
				title: 'Teacher Attendance',
				href: '/teacher-attendance',
				icon: ClipboardCheck,
				feature: 'teacher_attendance',
				category: 'Attendance',
				order: 51,
			},
			// Settings & support
			{
				key: 'settings',
				title: 'School Settings',
				href: '/settings',
				icon: Settings,
				feature: 'school_settings',
				category: 'School Settings',
				order: 800,
			},
			{
				key: 'support',
				title: 'Support',
				href: '/support',
				icon: Shield,
				feature: 'support_system',
				order: 850,
			},
			{
				key: 'chat',
				title: 'AI Chat',
				href: '/chat',
				icon: MessageCircle,
				feature: 'ai_chat',
				category: 'AI Chat',
				shared: true,
				order: 920,
			},
		],
	},

	// ── Teacher ─────────────────────────────────────────────────────────────
	teacher: {
		inherits: [GROUP_AUTHENTICATED, GROUP_ACADEMIC_USERS, GROUP_GRADING_STAFF],
		routes: [
			{
				key: 'grade-submissions',
				title: 'Grade Submissions',
				href: '/grade-submissions',
				icon: BookCheck,
				feature: 'grade_management',
				category: 'Grading',
				order: 20,
			},
			{
				key: 'submit-grades',
				title: 'Submit Grades',
				href: '/submit-grades',
				icon: CheckSquare,
				feature: 'grade_management',
				category: 'Grading',
				order: 21,
			},

			{
				key: 'my-attendance',
				title: 'My Attendance',
				href: '/my-attendance',
				icon: ClipboardCheck,
				feature: 'teacher_attendance',
				category: 'Attendance',
				order: 51,
			},
		],
	},

	// ── Student (also used by parent via resolveEffectiveRole) ──────────────
	student: {
		inherits: [GROUP_AUTHENTICATED, GROUP_ACADEMIC_USERS],
		routes: [
			// Grades (student-facing labels)
			{
				key: 'periodic-reports',
				title: 'Periodic Grades',
				href: '/periodic-reports',
				icon: FileText,
				feature: 'academic_reports',
				category: 'Academic Reports',
				shared: true,
				order: 35,
			},
			{
				key: 'yearly-reports',
				title: 'Yearly Grades',
				href: '/yearly-reports',
				icon: FileText,
				feature: 'academic_reports',
				category: 'Academic Reports',
				shared: true,
				order: 36,
			},
			{
				key: 'semester-report',
				title: 'Semester Report',
				href: '/semester-report',
				icon: FileText,
				feature: 'academic_reports',
				category: 'Academic Reports',
				shared: true,
				order: 37,
			},
			// Fees
			{
				key: 'financial-profile',
				title: 'Financial Profile',
				href: '/financial-profile',
				icon: Wallet,
				feature: 'finances',
				category: 'Finances',
				order: 55,
			},
			{
				key: 'pay',
				title: 'Pay Fees',
				href: '/pay',
				icon: Wallet,
				feature: 'online_payment',
				category: 'Finances',
				requiresFeature: 'online_payment',
				order: 56,
			},
			{
				key: 'payment-history',
				title: 'Payment History',
				href: '/payment-history',
				icon: FileText,
				feature: 'finances',
				category: 'Finances',
				order: 57,
			},
			// Attendance (student sees own record)
			{
				key: 'student-attendance',
				title: 'My Attendance',
				href: '/student-attendance',
				icon: AlignEndVerticalIcon,
				feature: 'student_attendance',
				category: 'Attendance',
				order: 50,
			},
		],
	},

	// ── Administrator ────────────────────────────────────────────────────────
	// Routes here are the full possible set; access is filtered at runtime by
	// adminPermissions. Teacher-admins additionally inherit GROUP_GRADING_STAFF.
	administrator: {
		inherits: [GROUP_AUTHENTICATED, GROUP_ACADEMIC_DOCUMENTS],
		routes: [
			// Financial
			{
				key: 'financial-reports',
				title: 'Financial Reports',
				href: '/dashboard/financial-reports',
				icon: DollarSign,
				feature: 'finances',
				category: 'Finances',
				order: 55,
			},
			{
				key: 'admin-payment-history',
				title: 'Payment History',
				href: '/dashboard/admin-payment-history',
				icon: FileText,
				feature: 'finances',
				category: 'Finances',
				order: 57,
			},
			{
				key: 'scholarships',
				title: 'Scholarships & Wards',
				href: '/dashboard/scholarships',
				icon: GraduationCap,
				feature: 'finances',
				category: 'Finances',
				order: 58,
			},
			{
				key: 'financial-audit',
				title: 'Audit Trail',
				href: '/dashboard/financial-audit',
				icon: Shield,
				feature: 'audit',
				category: 'Finances',
				order: 58,
			},
			{
				key: 'clearances',
				title: 'Test Clearance',
				href: '/dashboard/clearances',
				icon: ClipboardCheck,
				feature: 'financial_clearance',
				category: 'Finances',
				order: 59,
			},
			{
				key: 'record-payments',
				title: 'Record Payments',
				href: '/dashboard/record-payments',
				icon: DollarSign,
				feature: 'record_payments',
				category: 'Finances',
				order: 56,
			},
			// Calendar
			{
				key: 'academic-calendar',
				title: 'Academic Calendar',
				href: '/academic-calendar',
				icon: CalendarDays,
				feature: 'calendar_events',
				category: 'Calendar & Schedules',
				shared: true,
				order: 65,
			},
			{
				key: 'schedules',
				title: 'Schedules',
				href: '/schedules',
				icon: CalendarDays,
				feature: 'calendar_events',
				category: 'Calendar & Schedules',
				shared: true,
				order: 66,
			},
			// Attendance
			{
				key: 'student-attendance',
				title: 'Student Attendance',
				href: '/student-attendance',
				icon: AlignEndVerticalIcon,
				feature: 'student_attendance',
				category: 'Attendance',
				order: 70,
			},
			{
				key: 'teacher-attendance',
				title: 'Teacher Attendance',
				href: '/teacher-attendance',
				icon: ClipboardCheck,
				feature: 'teacher_attendance',
				category: 'Attendance',
				order: 71,
			},
			// Support & chat
			{
				key: 'support',
				title: 'Support',
				href: '/support',
				icon: Shield,
				feature: 'support_system',
				order: 850,
			},
			{
				key: 'chat',
				title: 'AI Chat',
				href: '/chat',
				icon: MessageCircle,
				feature: 'ai_chat',
				category: 'AI Chat',
				shared: true,
				order: 920,
			},
		],
	},
};

// ---------------------------------------------------------------------------
// Route resolution helpers
// ---------------------------------------------------------------------------

export function resolveEffectiveRole(userRole: string): string {
	return userRole === 'parent' ? 'student' : userRole;
}

/**
 * Merges inherited groups + role-specific routes, deduplicating by key.
 * For administrator + isTeacher, also folds in GROUP_GRADING_STAFF.
 */
function resolveRoleRoutes(
	role: string,
	isTeacher?: boolean,
): RouteDefinition[] {
	const effectiveRole = resolveEffectiveRole(role);
	const config = ROLE_ROUTES[effectiveRole];
	if (!config) return [];

	const groups = [...config.inherits];
	if (effectiveRole === 'administrator' && isTeacher) {
		groups.push(GROUP_GRADING_STAFF);
	}

	const seen = new Set<string>();
	const merged: RouteDefinition[] = [];

	for (const route of [...groups.flat(), ...config.routes]) {
		if (!seen.has(route.key)) {
			seen.add(route.key);
			merged.push(route);
		}
	}

	return merged;
}

/**
 * Applies school-profile feature gates and per-user permission filters,
 * returning only the routes a specific user may access.
 */
function filterRoutesForUser(
	routes: RouteDefinition[],
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPermissions?: FeatureKey[],
): RouteDefinition[] {
	const effectiveRole = resolveEffectiveRole(userRole);
	const enabled = new Set(schoolProfile.featureConfig.enabledFeatures);

	return routes.filter((route) => {
		// default_features are always on
		if (route.feature === 'default_features') return true;

		// Feature must be enabled for this school
		if (!enabled.has(route.feature)) return false;

		// Extra feature requirement (e.g. online_payment gate on /pay)
		if (route.requiresFeature && !enabled.has(route.requiresFeature))
			return false;

		// Administrators are gated by their runtime permission list
		if (effectiveRole === 'administrator') {
			return adminPermissions?.includes(route.feature) ?? false;
		}

		// All other roles: check roleFeatureAccess from school profile
		const roleAccess = getRoleFeatureAccess(schoolProfile, userRole);
		return roleAccess.includes(route.feature);
	});
}

function getRoleFeatureAccess(
	schoolProfile: SchoolProfile,
	role: string,
): readonly FeatureKey[] {
	const access = schoolProfile.featureConfig.roleFeatureAccess;
	if (role === 'parent') {
		if (Array.isArray(access.parent) && access.parent.length > 0)
			return access.parent;
		return Array.isArray(access.student) ? access.student : [];
	}
	return access[role as keyof typeof access] || [];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getUserAccessibleFeatures(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPermissions?: FeatureKey[],
	isTeacher?: boolean,
): FeatureKey[] {
	const routes = resolveRoleRoutes(userRole, isTeacher);
	const filtered = filterRoutesForUser(
		routes,
		schoolProfile,
		userRole,
		adminPermissions,
	);
	const features = filtered.map((r) => r.feature);
	return [
		'default_features',
		...Array.from(new Set(features)).filter((f) => f !== 'default_features'),
	];
}

export function isFeatureEnabled(
	schoolProfile: SchoolProfile,
	feature: FeatureKey,
): boolean {
	return schoolProfile.featureConfig.enabledFeatures.includes(feature);
}

export function isValidAdministratorPosition(
	schoolProfile: SchoolProfile,
	position: string,
): boolean {
	return !!getAdministratorFeatureAccess(schoolProfile, position);
}

function normalizeAdministratorPosition(position: string): string {
	return position
		.toLowerCase()
		.trim()
		.replace(/[\s-]+/g, '_');
}

function getAdministratorFeatureAccess(
	schoolProfile: SchoolProfile,
	adminPosition?: string,
): FeatureKey[] | null {
	if (!adminPosition) return null;
	const adminAccessMap =
		schoolProfile.featureConfig.roleFeatureAccess?.administrator;
	if (!adminAccessMap) return null;

	const normalized = normalizeAdministratorPosition(adminPosition);
	const directAccess = adminAccessMap[normalized];
	if (directAccess) return directAccess;

	const matchedKey = Object.keys(adminAccessMap).find(
		(key) => normalizeAdministratorPosition(key) === normalized,
	);
	return matchedKey ? adminAccessMap[matchedKey] : null;
}

export function validateComponentAccess(
	schoolProfile: SchoolProfile,
	userRole: string,
	routeKey: string,
	adminPermissions?: FeatureKey[],
	isTeacher?: boolean,
): boolean {
	const routes = resolveRoleRoutes(userRole, isTeacher);
	const filtered = filterRoutesForUser(
		routes,
		schoolProfile,
		userRole,
		adminPermissions,
	);
	return filtered.some((r) => r.key === routeKey);
}

export function getUserRoutes(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPermissions?: FeatureKey[],
	isTeacher?: boolean,
): Array<{
	key: string;
	title: string;
	href: string;
	icon: any;
	category?: string;
}> {
	const routes = resolveRoleRoutes(userRole, isTeacher);
	const filtered = filterRoutesForUser(
		routes,
		schoolProfile,
		userRole,
		adminPermissions,
	);
	return filtered.map(({ key, title, href, icon, category }) => ({
		key,
		title,
		href,
		icon,
		category,
	}));
}

export function preloadComponentsForUser(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPermissions?: FeatureKey[],
	isTeacher?: boolean,
): void {
	const routes = resolveRoleRoutes(userRole, isTeacher);
	const filtered = filterRoutesForUser(
		routes,
		schoolProfile,
		userRole,
		adminPermissions,
	);
	const uniqueKeys = Array.from(new Set(filtered.map((r) => r.key)));

	void Promise.allSettled(
		uniqueKeys.map((key) => {
			const importer = componentImporters[key];
			if (!importer) {
				console.warn(`Component importer not found for key: ${key}`);
				return Promise.resolve();
			}
			return importer().catch((error: unknown) => {
				console.warn(`Preload failed for key: ${key}`, error);
			});
		}),
	);
}

// ---------------------------------------------------------------------------
// Navigation generation
// ---------------------------------------------------------------------------

/**
 * Navigation category display order.
 * Categories not listed here appear after, in the order they are encountered.
 * Pinned items (Dashboard, Profile, Notifications, Support, AI Chat) are
 * placed explicitly and excluded from this list.
 */
const NAV_CATEGORY_ORDER = [
	'User Management',
	'Grading',
	'Academic Reports',
	'Academic Documents',
	'Enrollment',
	'Finances',
	'Financial',
	'Attendance',
	'Calendar & Schedules',
];

const NAV_PINNED_BOTTOM = new Set(['School Settings', 'AI Chat']);
const NAV_EXCLUDE_KEYS = new Set([
	'profile',
	'notifications',
	'dashboard',
	'support',
	'chat',
]);

export function generateNavigationItems(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPermissions?: FeatureKey[],
	isTeacher?: boolean,
): NavItem[] {
	const routes = resolveRoleRoutes(userRole, isTeacher);
	const filtered = filterRoutesForUser(
		routes,
		schoolProfile,
		userRole,
		adminPermissions,
	);

	// Sort by order so categories are assembled in the right sequence
	const sorted = [...filtered].sort(
		(a, b) => (a.order ?? 999) - (b.order ?? 999),
	);

	// Build category buckets (skip pinned-position items)
	const byCategory: Record<string, RouteDefinition[]> = {};

	for (const route of sorted) {
		if (NAV_EXCLUDE_KEYS.has(route.key)) continue;
		const cat = route.category;
		if (!cat) continue; // uncategorized routes without a category are skipped in nav
		if (!byCategory[cat]) byCategory[cat] = [];
		// Deduplicate by href within a category
		if (!byCategory[cat].some((r) => r.href === route.href)) {
			byCategory[cat].push(route);
		}
	}

	const navItems: NavItem[] = [];

	// 1. Dashboard always first
	navItems.push({
		name: 'Dashboard',
		icon: LayoutDashboard,
		href: '/dashboard',
	});

	// 2. Categorized items in defined order
	const categoriesInOrder = [
		...NAV_CATEGORY_ORDER.filter((c) => byCategory[c]),
		...Object.keys(byCategory).filter(
			(c) => !NAV_CATEGORY_ORDER.includes(c) && !NAV_PINNED_BOTTOM.has(c),
		),
	];

	for (const categoryName of categoriesInOrder) {
		const routes = byCategory[categoryName];
		if (!routes?.length) continue;

		if (routes.length === 1) {
			navItems.push({
				name: routes[0].title,
				icon: routes[0].icon,
				href: routes[0].href,
			});
		} else {
			navItems.push({
				name: categoryName,
				icon: routes[0].icon,
				subItems: routes.map((r) => ({
					name: r.title,
					icon: r.icon,
					href: r.href,
				})),
			});
		}
	}

	// 3. School Settings (pinned before Profile)
	if (byCategory['School Settings']) {
		const settingRoutes = byCategory['School Settings'];
		navItems.push(
			settingRoutes.length === 1
				? {
						name: settingRoutes[0].title,
						icon: settingRoutes[0].icon,
						href: settingRoutes[0].href,
					}
				: {
						name: 'School Settings',
						icon: settingRoutes[0].icon,
						subItems: settingRoutes.map((r) => ({
							name: r.title,
							icon: r.icon,
							href: r.href,
						})),
					},
		);
	}

	// 4. Profile & Notifications (always present via GROUP_AUTHENTICATED)
	navItems.push({ name: 'Profile', icon: UserCircle, href: '/profile' });
	navItems.push({
		name: 'Notifications',
		icon: BellDot,
		href: '/notifications',
	});

	// 5. Support
	const supportRoute = sorted.find((r) => r.key === 'support');
	if (supportRoute) {
		navItems.push({
			name: supportRoute.title,
			icon: supportRoute.icon,
			href: supportRoute.href,
		});
	}

	// 6. AI Chat (always last before logout)
	const chatRoute = sorted.find((r) => r.key === 'chat');
	if (chatRoute) {
		navItems.push({
			name: chatRoute.title,
			icon: chatRoute.icon,
			href: chatRoute.href,
		});
	}

	return navItems;
}

// ---------------------------------------------------------------------------
// Dynamic component map  (consumed by the dashboard page router)
// ---------------------------------------------------------------------------

export function generateDynamicComponentsMap(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPermissions?: FeatureKey[],
	isTeacher?: boolean,
): any {
	const dynamicMap: any = {
		[userRole]: { items: {} },
		shared: { items: {} },
	};

	const routes = resolveRoleRoutes(userRole, isTeacher);
	const filtered = filterRoutesForUser(
		routes,
		schoolProfile,
		userRole,
		adminPermissions,
	);

	for (const route of filtered) {
		const component = componentMappings[route.key];
		if (!component) {
			console.warn(`Component not found for key: ${route.key}`);
			continue;
		}

		const item: ComponentItem = {
			title: route.title,
			icon: route.icon,
			category: route.category,
			component,
		};

		if (route.shared) {
			dynamicMap.shared.items[route.key] = item;
		} else {
			dynamicMap[userRole].items[route.key] = item;
		}
	}

	return dynamicMap;
}

export default generateDynamicComponentsMap;
