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
	Users2,
	ClipboardCheck,
	DollarSign,
} from 'lucide-react';
import type { SchoolProfile } from '@/types/schoolProfile';
import type {FeatureKey} from "@/types";

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
				React.createElement('div', { className: 'loader-ring loader-ring-outer' }),
				React.createElement('div', { className: 'loader-ring loader-ring-middle' }),
				React.createElement('div', { className: 'loader-ring loader-ring-inner' }),
				React.createElement(
					'div',
					{ className: 'loader-center' },
					React.createElement(GraduationCap, { className: 'h-5 w-5 text-primary' }),
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
		{
			className:
				'min-h-[60vh] flex items-center justify-center px-4',
		},
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
			importer().catch((error) => {
				console.warn(`Chunk load failed for key: ${key}`, error);
				return { default: ChunkLoadFallback };
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
	requests: () => import('@/app/dashboard/shared/GradeRequests'),
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
		import('@/app/dashboard/shared/GradeRequests'),

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
	'financial-profile': () =>
		import('@/app/dashboard/student/fees/FinancialProfile'),
	pay: () => import('@/app/dashboard/student/fees/PayFees'),
	'payment-history': () =>
		import('@/app/dashboard/student/fees/PaymentHistory'),

	// Record Payments
	'record-payments': () =>
		import('@/app/dashboard/record-payments/RecordPayments'),
	'scholarships': () =>
		import('@/app/dashboard/scholarships/Scholarships'),
	'clearances': () =>
		import('@/app/dashboard/clearances/Clearances'),

	// Financial Reports (admin)
	'financial-reports': () =>
		import('@/app/dashboard/shared/FinancialReports'),
	// Route key is `financial-audit`, not `audit`: /dashboard/audit is already a
	// static superadmin route and would shadow the dynamic [page] route.
	'financial-audit': () =>
		import('@/app/dashboard/shared/FinancialAudit'),
	'admin-payment-history': () =>
		import('@/app/dashboard/payment-history/AdminPaymentHistory'),

	// Documents
	documents: () =>
		import('@/app/dashboard/documents/TranscriptRecommendation'),
	attestation: () =>
		import('@/app/dashboard/attestation/Attestation'),
	'graduation-clearance': () =>
		import('@/app/dashboard/graduation-clearance/GraduationClearance'),
	diploma: () =>
		import('@/app/dashboard/diploma/Diploma'),
	'digital-id': () =>
		import('@/app/dashboard/digital-id/DigitalId'),

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
	"student-attendance": () => import('@/app/dashboard/shared/Attendance'),
	'teacher-attendance': () => import('@/app/dashboard/shared/TeacherAttendanceAdmin'),
	'my-attendance': () => import('@/app/dashboard/shared/TeacherAttendanceView'),

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

export function resolveEffectiveRole(userRole: string): string {
	return userRole === 'parent' ? 'student' : userRole;
}

/**
 * Resolves the feature-access list for a role from the school profile.
 * Parents use their own configured subset when present and non-empty,
 * otherwise they inherit the student feature access (backward compatible).
 */
function getRoleFeatureAccess(
	schoolProfile: SchoolProfile,
	role: string,
): readonly FeatureKey[] {
	const access = schoolProfile.featureConfig.roleFeatureAccess;
	if (role === 'parent') {
		if (Array.isArray(access.parent) && access.parent.length > 0) {
			return access.parent;
		}
		return Array.isArray(access.student) ? access.student : [];
	}
	return access[role as keyof typeof access] || [];
}

/**
 * Resolves the routes a user should see for a feature.
 * Administrators with `isTeacher: true` additionally get the feature's
 * teacher routes so they can access teacher-only grading/work routes.
 */
function getFeatureRoutesForUser(
	featureConfig: FeatureConfig,
	effectiveRole: string,
	isTeacher?: boolean,
): Array<{ key: string; title: string; href: string; icon?: any }> {
	const roleRoutes = featureConfig.routes[effectiveRole] || [];
	if (effectiveRole !== 'administrator' || !isTeacher) return roleRoutes;

	const teacherRoutes = featureConfig.routes['teacher'] || [];
	if (teacherRoutes.length === 0) return roleRoutes;

	const merged = [...roleRoutes];
	const seen = new Set(roleRoutes.map((route) => route.key));
	for (const route of teacherRoutes) {
		if (!seen.has(route.key)) {
			merged.push(route);
			seen.add(route.key);
		}
	}
	return merged;
}

function shouldExcludeRoute(
	feature: FeatureKey,
	routeKey: string,
	schoolProfile: SchoolProfile,
): boolean {
	if (feature === 'fee_payment' && routeKey === 'pay') {
		return !schoolProfile.featureConfig.enabledFeatures.includes('online_payment' as FeatureKey);
	}
	return false;
}

function getAccessibleRouteKeys(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPermissions?: FeatureKey[],
	isTeacher?: boolean,
): string[] {
	const routeKeys: string[] = [];
	const effectiveRole = resolveEffectiveRole(userRole);
	const userFeatures = getUserAccessibleFeatures(
		schoolProfile,
		userRole,
		adminPermissions,
		isTeacher,
	);

	userFeatures.forEach((feature) => {
		if (!schoolProfile.featureConfig.enabledFeatures.includes(feature)) return;
		const featureConfig = featureConfigurations[feature];
		if (!featureConfig) return;

		const routes = getFeatureRoutesForUser(
			featureConfig,
			effectiveRole,
			isTeacher,
		);
		if (routes.length === 0) return;

		routes.forEach((route) => {
			if (shouldExcludeRoute(feature, route.key, schoolProfile)) return;
			routeKeys.push(route.key);
		});
	});

	return routeKeys;
}

export function preloadComponentsForUser(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPermissions?: FeatureKey[],
	isTeacher?: boolean,
): void {
	const routeKeys = getAccessibleRouteKeys(
		schoolProfile,
		userRole,
		adminPermissions,
		isTeacher,
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

	grade_management: {
		key: 'grade_management',
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
		category: 'Finances',
		routes: {
			student: [
				{
					key: 'financial-profile',
					title: 'Financial Profile',
					href: '/financial-profile',
					icon: Wallet,
				},
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
					href: '/dashboard/financial-reports',
					icon: DollarSign,
				},
				{
					key: 'admin-payment-history',
					title: 'Payment History',
					// Must stay in sync with the route key: /dashboard/<key> is what
					// the dynamic dashboard route validates against. `/dashboard/
					// payment-history` belongs to the student fee_payment route.
					href: '/dashboard/admin-payment-history',
					icon: FileText,
				},
				{
					// Visibility lives here, on financial_reports; the ability to
					// actually award or remove a scholarship is a narrower check
					// inside the page itself, gated on the `record_payments`
					// permission — the same authority that can record a payment.
					key: 'scholarships',
					title: 'Scholarships & Wards',
					href: '/dashboard/scholarships',
					icon: GraduationCap,
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

	audit: {
		key: 'audit',
		title: 'Audit Trail',
		icon: Shield,
		category: 'Financial',
		routes: {
			administrator: [
				{
					key: 'financial-audit',
					title: 'Audit Trail',
					href: '/dashboard/financial-audit',
					icon: Shield,
				},
			],
			system_admin: [
				{
					key: 'financial-audit',
					title: 'Audit Trail',
					href: '/dashboard/financial-audit',
					icon: Shield,
				},
			],
		},
	},

	record_payments: {
		key: 'record_payments',
		title: 'Record Payments',
		icon: DollarSign,
		category: 'Financial',
		routes: {
			administrator: [
				{
					key: 'record-payments',
					title: 'Record Payments',
					href: '/dashboard/record-payments',
					icon: DollarSign,
				},
				{
					// Was reachable from both record_payments and academic_documents;
					// it's really a financial document (checks real payment status),
					// so it now lives only here — academic_documents gets the actual
					// Graduation Clearance letter instead.
					key: 'clearances',
					title: 'Financial Clearance',
					href: '/dashboard/clearances',
					icon: ClipboardCheck,
				},
			],
		},
	},

	academic_documents: {
		key: 'academic_documents',
		title: 'Academic Documents',
		icon: FileText,
		category: 'Academic Documents',
		routes: {
			system_admin: [
				{
					key: 'documents',
					title: 'Transcript & Recommendation',
					href: '/dashboard/documents',
					icon: FileText,
				},
				{
					key: 'attestation',
					title: 'Attestation',
					href: '/dashboard/attestation',
					icon: FileText,
				},
				{
					key: 'graduation-clearance',
					title: 'Graduation Clearance',
					href: '/dashboard/graduation-clearance',
					icon: GraduationCap,
				},
				{
					key: 'diploma',
					title: 'Diploma',
					href: '/dashboard/diploma',
					icon: GraduationCap,
				},
				{
					key: 'digital-id',
					title: 'Digital ID',
					href: '/dashboard/digital-id',
					icon: Shield,
				},
			],
			administrator: [
				{
					key: 'documents',
					title: 'Transcript & Recommendation',
					href: '/dashboard/documents',
					icon: FileText,
				},
				{
					key: 'attestation',
					title: 'Attestation',
					href: '/dashboard/attestation',
					icon: FileText,
				},
				{
					key: 'graduation-clearance',
					title: 'Graduation Clearance',
					href: '/dashboard/graduation-clearance',
					icon: GraduationCap,
				},
				{
					key: 'diploma',
					title: 'Diploma',
					href: '/dashboard/diploma',
					icon: GraduationCap,
				},
				{
					key: 'digital-id',
					title: 'Digital ID',
					href: '/dashboard/digital-id',
					icon: Shield,
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

	student_attendance: {
		key: 'student_attendance',
		title: 'Student Attendance',
		icon: AlignEndVerticalIcon,
		category: 'Attendance',
		routes: {
			system_admin: [
				{
					key: 'student-attendance',
					title: 'Student Attendance',
					href: '/student-attendance',
					icon: AlignEndVerticalIcon,
				},
			],
			teacher: [
				{
					key: 'student-attendance',
					title: 'Student Attendance',
					href: '/student-attendance',
					icon: AlignEndVerticalIcon,
				},
			],
			student: [
				{
					key: 'student-attendance',
					title: 'My Attendance',
					href: '/student-attendance',
					icon: AlignEndVerticalIcon,
				},
			],
			administrator: [
				{
					key: 'student-attendance',
					title: 'Student Attendance',
					href: '/student-attendance',
					icon: AlignEndVerticalIcon,
				},
			],
		},
	},

	teacher_attendance: {
		key: 'teacher_attendance',
		title: 'Teacher Attendance',
		icon: ClipboardCheck,
		category: 'Attendance',
		routes: {
			system_admin: [
				{
					key: 'teacher-attendance',
					title: 'Teacher Attendance',
					href: '/teacher-attendance',
					icon: ClipboardCheck,
				},
			],
			teacher: [
				{
					key: 'my-attendance',
					title: 'My Attendance',
					href: '/my-attendance',
					icon: ClipboardCheck,
				},
			],
			administrator: [
				{
					key: 'teacher-attendance',
					title: 'Teacher Attendance',
					href: '/teacher-attendance',
					icon: ClipboardCheck,
				},
			],
		},
	},

	community: {
		key: 'community',
		title: 'Community',
		icon: Users2,

		routes: {
			teacher: [
				{
					key: 'community',
					title: 'Community',
					href: '/community',
					icon: Users2,
				},
			],

			student: [
				{
					key: 'community',
					title: 'Community',
					href: '/community',
					icon: Users2,
				},
			],
		},
	},

	school_settings: {
		key: 'school_settings',
		title: 'School Settings',
		icon: Settings,
		category: 'School Settings',
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

	ai_chat: {
		key: 'ai_chat',
		title: 'AI Chat',
		icon: MessageCircle,
		category: 'AI Chat',
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
	default_features: {
		key: 'default_features',
		title: 'Default Pages',
		icon: LayoutDashboard,
		category: 'General',
		routes: {
			student: [
				{
					key: 'dashboard',
					title: 'Dashboard',
					href: '/dashboard',
					icon: LayoutDashboard,
				},
				{
					key: 'profile',
					title: 'Profile',
					href: '/profile',
					icon: UserCircle,
				},
				{
					key: 'notifications',
					title: 'Notifications',
					href: '/notifications',
					icon: BellDot,
				},
			],
			teacher: [
				{
					key: 'dashboard',
					title: 'Dashboard',
					href: '/dashboard',
					icon: LayoutDashboard,
				},
				{
					key: 'profile',
					title: 'Profile',
					href: '/profile',
					icon: UserCircle,
				},
				{
					key: 'notifications',
					title: 'Notifications',
					href: '/notifications',
					icon: BellDot,
				},
			],
			system_admin: [
				{
					key: 'dashboard',
					title: 'Dashboard',
					href: '/dashboard',
					icon: LayoutDashboard,
				},
				{
					key: 'profile',
					title: 'Profile',
					href: '/profile',
					icon: UserCircle,
				},
				{
					key: 'notifications',
					title: 'Notifications',
					href: '/notifications',
					icon: BellDot,
				},
			],
			administrator: [
				{
					key: 'dashboard',
					title: 'Dashboard',
					href: '/dashboard',
					icon: LayoutDashboard,
				},
				{
					key: 'profile',
					title: 'Profile',
					href: '/profile',
					icon: UserCircle,
				},
				{
					key: 'notifications',
					title: 'Notifications',
					href: '/notifications',
					icon: BellDot,
				},
			],
		},
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
	const adminAccessMap = schoolProfile.featureConfig.roleFeatureAccess?.administrator;
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
 * Administrators use their individual permissions array.
 * Other roles use roleFeatureAccess from the school profile.
 */
function hasFeatureAccess(
	schoolProfile: SchoolProfile,
	userRole: string,
	feature: FeatureKey,
	adminPermissions?: FeatureKey[],
	isTeacher?: boolean,
): boolean {
	const effectiveRole = resolveEffectiveRole(userRole);
	if (feature === 'default_features') return true;
	if (!schoolProfile.featureConfig.enabledFeatures.includes(feature)) return false;

	if (effectiveRole === 'administrator') {
		if (adminPermissions?.includes(feature)) return true;
		if (isTeacher) {
			const teacherFeatures = schoolProfile.featureConfig.roleFeatureAccess.teacher;
			if (Array.isArray(teacherFeatures) && teacherFeatures.includes(feature)) return true;
		}
		return false;
	}

	const roleAccess = getRoleFeatureAccess(schoolProfile, userRole);
	return roleAccess.includes(feature);
}

/**
 * Enhanced function to generate dynamic components map based on school profile and user role
 * Administrators use their individual permissions array.
 */
export function generateDynamicComponentsMap(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPermissions?: FeatureKey[],
	isTeacher?: boolean,
): any {
	const dynamicMap: any = {
		[userRole]: {
			items: {},
		},
		shared: {
			items: {},
		},
	};

	// Get user's accessible features with permissions support
	const effectiveRole = resolveEffectiveRole(userRole);
	const userFeatures = getUserAccessibleFeatures(
		schoolProfile,
		userRole,
		adminPermissions,
		isTeacher,
	);

	userFeatures.forEach((feature) => {
		// Check if feature is enabled for the school
		if (feature !== 'default_features' && !schoolProfile.featureConfig.enabledFeatures.includes(feature)) return;

		const featureConfig = featureConfigurations[feature];
		if (!featureConfig) return;

		// Get routes for the user's role (teacher routes are merged in for isTeacher admins)
		const routes = getFeatureRoutesForUser(
			featureConfig,
			effectiveRole,
			isTeacher,
		);
		if (routes.length === 0) return;

		// Add each route for this feature
		routes.forEach((route) => {
			if (shouldExcludeRoute(feature, route.key, schoolProfile)) return;

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
		'teacher-attendance',
	];
	return sharedComponents.includes(key);
}

/**
 * Enhanced navigation generation with administrator permissions support
 */
export function generateNavigationItems(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPermissions?: FeatureKey[],
	isTeacher?: boolean,
): NavItem[] {
	// Helper to move an item before another item in the array
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

	// Get user's accessible features with permissions support
	const effectiveRole = resolveEffectiveRole(userRole);
	const accessibleFeatures = getUserAccessibleFeatures(
		schoolProfile,
		userRole,
		adminPermissions,
		isTeacher,
	);

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

	// Process each accessible feature (skip default_features — handled separately)
	accessibleFeatures.forEach((feature) => {
		if (feature === 'default_features') return;
		if (!schoolProfile.featureConfig.enabledFeatures.includes(feature)) return;

		const featureConfig = featureConfigurations[feature];
		if (!featureConfig) return;

		let routes = getFeatureRoutesForUser(
			featureConfig,
			effectiveRole,
			isTeacher,
		);
		if (routes.length === 0) return;

		routes.forEach((route) => {
			if (shouldExcludeRoute(feature, route.key, schoolProfile)) return;

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
					(item) => item.href === routeItem.href,
				);
				if (!alreadyAdded) {
					routesByCategory[featureConfig.category].push(routeItem);
				}
			} else {
				const alreadyAdded = uncategorizedRoutes.some(
					(item) => item.href === routeItem.href,
				);
				if (!alreadyAdded) {
					uncategorizedRoutes.push(routeItem);
				}
			}
		});
	});

	// Priority order for main feature categories
	// Removed 'School Settings', 'AI Chat', and 'Support' so they can be explicitly placed at specific indexes below
	const categoryOrder = [
		'User Management',
		'Grading',
		'Academic Reports',
		'Academic Documents',
		// Money sits above timetables: the finance groups are worked daily,
		// the calendar is consulted occasionally. 'Enrollment' is listed only
		// to hold its existing position ahead of these.
		'Enrollment',
		'Finances',
		'Financial',
		'Calendar & Schedules',
	];

	const navItems: NavItem[] = [];

	// 1. Dashboard always first
	navItems.push({
		name: 'Dashboard',
		icon: LayoutDashboard,
		href: '/dashboard',
	});

	// 2. Categorized items in order, excluding custom-placed categories
	const excludedCategories = new Set(['School Settings', 'AI Chat', 'Support']);
	const sortedCategories = [
		...categoryOrder.filter((c) => routesByCategory[c]),
		...Object.keys(routesByCategory).filter(
			(c) => !categoryOrder.includes(c) && !excludedCategories.has(c),
		),
	];

	sortedCategories.forEach((categoryName) => {
		const routes = routesByCategory[categoryName];
		if (!routes || routes.length === 0) return;
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
				subItems: routes.map((route) => ({
					name: route.title,
					icon: route.icon,
					href: route.href,
				})),
			});
		}
	});

	// 3. Uncategorized routes (community, calendar, attendance, etc.)
	const excludeKeys = new Set([
		'profile',
		'notifications',
		'chat',
		'ai_chat',
		'support',
	]);
	const uncategorizedOrder = ['community'];
	uncategorizedRoutes
		.filter((r) => !excludeKeys.has(r.key))
		.sort((a, b) => {
			const aIndex = uncategorizedOrder.indexOf(a.key);
			const bIndex = uncategorizedOrder.indexOf(b.key);
			if (aIndex === -1 && bIndex === -1) return 0;
			if (aIndex === -1) return 1;
			if (bIndex === -1) return -1;
			return aIndex - bIndex;
		})
		.forEach((route) => {
			navItems.push({ name: route.title, icon: route.icon, href: route.href });
		});

	// Reorder Calendar & Attendance if present
	const calendarNavLabel = 'Calendar & Schedules';
	moveNavItemBefore(navItems, 'Attendance', calendarNavLabel);

	// 4. School Settings — placed right before Profile
	if (routesByCategory['School Settings']) {
		const settingRoutes = routesByCategory['School Settings'];
		if (settingRoutes.length === 1) {
			navItems.push({
				name: settingRoutes[0].title,
				icon: settingRoutes[0].icon,
				href: settingRoutes[0].href,
			});
		} else if (settingRoutes.length > 1) {
			navItems.push({
				name: 'School Settings',
				icon: settingRoutes[0].icon,
				subItems: settingRoutes.map((route) => ({
					name: route.title,
					icon: route.icon,
					href: route.href,
				})),
			});
		}
	}

	// 5. Profile and Notifications
	navItems.push({ name: 'Profile', icon: UserCircle, href: '/profile' });
	navItems.push({
		name: 'Notifications',
		icon: BellDot,
		href: '/notifications',
	});

	// 6. Support — checked once via categorized or uncategorized routes to prevent duplicates
	if (routesByCategory['Support']) {
		const supportRoutes = routesByCategory['Support'];
		if (supportRoutes.length === 1) {
			navItems.push({
				name: supportRoutes[0].title,
				icon: supportRoutes[0].icon,
				href: supportRoutes[0].href,
			});
		} else if (supportRoutes.length > 1) {
			navItems.push({
				name: 'Support',
				icon: supportRoutes[0].icon,
				subItems: supportRoutes.map((route) => ({
					name: route.title,
					icon: route.icon,
					href: route.href,
				})),
			});
		}
	} else {
		const supportRoute = uncategorizedRoutes.find((r) => r.key === 'support');
		if (supportRoute) {
			navItems.push({
				name: supportRoute.title,
				icon: supportRoute.icon,
				href: supportRoute.href,
			});
		}
	}

	// 7. AI Chat — right before Logout
	if (routesByCategory['AI Chat']) {
		const chatRoutes = routesByCategory['AI Chat'];
		if (chatRoutes.length === 1) {
			navItems.push({
				name: chatRoutes[0].title,
				icon: chatRoutes[0].icon,
				href: chatRoutes[0].href,
			});
		} else if (chatRoutes.length > 1) {
			navItems.push({
				name: 'AI Chat',
				icon: chatRoutes[0].icon,
				subItems: chatRoutes.map((route) => ({
					name: route.title,
					icon: route.icon,
					href: route.href,
				})),
			});
		}
	} else {
		const uncategorizedChat = uncategorizedRoutes.find(
			(r) => r.key === 'chat' || r.key === 'ai_chat',
		);
		if (uncategorizedChat) {
			navItems.push({
				name: uncategorizedChat.title,
				icon: uncategorizedChat.icon,
				href: uncategorizedChat.href,
			});
		}
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
	adminPermissions?: FeatureKey[],
	isTeacher?: boolean,
): boolean {
	const effectiveRole = resolveEffectiveRole(userRole);
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
			adminPermissions,
			isTeacher,
		);
	}

	if (
		routeKey === 'pay' &&
		!schoolProfile.featureConfig.enabledFeatures.includes('online_payment' as FeatureKey)
	) {
		return false;
	}

	// A route key may be reachable through more than one feature (e.g.
	// "clearances" is granted by both record_payments and academic_documents),
	// so access is granted when ANY owning feature grants it — stopping at the
	// first owner would deny users who hold only the other feature.
	let ownedByFeature = false;
	for (const feature of Object.values(featureConfigurations)) {
		const userRoutes = getFeatureRoutesForUser(
			feature,
			effectiveRole,
			isTeacher,
		);
		if (userRoutes.length === 0) {
			continue;
		}

		if (userRoutes.some((route) => route.key === routeKey)) {
			ownedByFeature = true;
			if (
				hasFeatureAccess(
					schoolProfile,
					userRole,
					feature.key,
					adminPermissions,
					isTeacher,
				)
			) {
				return true;
			}
		}
	}
	if (!ownedByFeature) {
		console.warn(`Route key "${routeKey}" not found in any feature.`);
	}
	return false;
}

/**
 * Enhanced user routes getter with administrator position support
 */
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
	const routes: Array<{
		key: string;
		title: string;
		href: string;
		icon: any;
		category?: string;
	}> = [];

	const effectiveRole = resolveEffectiveRole(userRole);
	const accessibleFeatures = getUserAccessibleFeatures(
		schoolProfile,
		userRole,
		adminPermissions,
		isTeacher,
	);

	accessibleFeatures.forEach((feature) => {
		const featureConfig = featureConfigurations[feature];
		if (!featureConfig) return;

		const featureRoutes = getFeatureRoutesForUser(
			featureConfig,
			effectiveRole,
			isTeacher,
		);
		if (featureRoutes.length === 0) {
			return;
		}

		featureRoutes.forEach((route) => {
			if (shouldExcludeRoute(feature, route.key, schoolProfile)) return;
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
	return schoolProfile.featureConfig.enabledFeatures.includes(feature);
}

export function getUserAccessibleFeatures(
	schoolProfile: SchoolProfile,
	userRole: string,
	adminPermissions?: FeatureKey[],
	isTeacher?: boolean,
): FeatureKey[] {
	const defaultFeatures: FeatureKey[] = ['default_features'];
	const effectiveRole = resolveEffectiveRole(userRole);

	if (effectiveRole === 'administrator') {
		const features = new Set(adminPermissions || []);
		if (isTeacher) {
			const teacherFeatures = schoolProfile.featureConfig.roleFeatureAccess.teacher;
			if (Array.isArray(teacherFeatures)) teacherFeatures.forEach((f) => features.add(f));
		}
		const enabled = Array.from(features).filter((f) =>
			schoolProfile.featureConfig.enabledFeatures.includes(f),
		);
		return [...defaultFeatures, ...enabled];
	}

	const roleAccess = getRoleFeatureAccess(schoolProfile, userRole);
	const features = Array.from(roleAccess);
	const uniqueFeatures = Array.from(new Set(features));

	const enabled = uniqueFeatures.filter((feature) =>
		schoolProfile.featureConfig.enabledFeatures.includes(feature),
	);
	return [...defaultFeatures, ...enabled];
}

export function getFeatureConfig(
	feature: FeatureKey,
): FeatureConfig | undefined {
	return featureConfigurations[feature];
}

export default generateDynamicComponentsMap;
