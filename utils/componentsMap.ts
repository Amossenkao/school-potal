import dynamic from 'next/dynamic';
import {
	Users,
	GraduationCap,
	BookOpen,
	Shield,
	ChevronDown,
	LayoutDashboard,
	UserCircle,
	Settings,
	CalendarDays,
	FilePen,
	Wallet,
	ClipboardList,
	FileText,
	Medal,
	CheckSquare,
	Library,
	School,
	MessageCircle,
	LogOut,
	AlignEndVerticalIcon,
} from 'lucide-react';

export const componentsMap: any = {
	system_admin: {
		items: {
			// Single nav items
			// 'financial-reports': {
			// 	title: 'Financial Reports',
			// 	icon: Wallet,
			// 	component: dynamic(
			// 		() => import('@/app/dashboard/admin/FinancialReports')
			// 	),
			// },

			// User Management
			'add-users': {
				title: 'Add Users',
				icon: GraduationCap,
				category: 'User Management',
				component: dynamic(
					() => import('@/app/dashboard/admin/users/AddUsers')
				),
			},
			'manage-users': {
				title: 'Manage Users',
				icon: Users,
				category: 'User Management',
				component: dynamic(
					() => import('@/app/dashboard/admin/users/ManageUsers')
				),
			},

			// Grading
			submissions: {
				title: 'Grade Submissions',
				icon: FileText,
				category: 'Grading',
				component: dynamic(
					() => import('@/app/dashboard/admin/grades/GradeSubmissions')
				),
			},
			requests: {
				title: 'Grade Requests',
				icon: CheckSquare,
				category: 'Grading',
				component: dynamic(
					() => import('@/app/dashboard/admin/grades/ApproveGrades')
				),
			},

			// Classes
			'classes-overview': {
				title: 'Classes Overview',
				icon: ClipboardList,
				category: 'Classes',
				component: dynamic(
					() => import('@/app/dashboard/admin/classes/ClassOverview')
				),
			},
			'manage-class': {
				title: 'Manage Classes',
				icon: FilePen,
				category: 'Classes',
				component: dynamic(
					() => import('@/app/dashboard/admin/classes/ManageClass')
				),
			},

			// Academic Reports
			'periodic-reports': {
				title: 'Periodic Reports',
				icon: FileText,
				category: 'Academic Reports',
				component: dynamic(
					() => import('@/app/dashboard/admin/reports/PeriodicReports')
				),
			},
			'yearly-reports': {
				title: 'Yearly Reports',
				icon: FileText,
				category: 'Academic Reports',
				component: dynamic(() => import('@/app/dashboard/shared/YearlyReport')),
			},
			masters: {
				title: 'Master Grade Sheets',
				icon: FileText,
				category: 'Academic Reports',
				component: dynamic(
					() => import('@/app/dashboard/admin/reports/MasterGradeSheets')
				),
			},

			// Lesson Planning
			'view-lessonplans': {
				title: 'View Lesson Plans',
				icon: FileText,
				category: 'Lesson Planning',
				component: dynamic(
					() => import('@/app/dashboard/admin/ViewLessonPlans')
				),
			},
			'view-schemeofwork': {
				title: 'View Scheme of Work',
				icon: ClipboardList,
				category: 'Lesson Planning',
				component: dynamic(
					() => import('@/app/dashboard/admin/ViewSchemeOrWork')
				),
			},

			// Calendar
			'add-event': {
				title: 'Add Event to Calendar',
				icon: CalendarDays,
				category: 'Calendar & Schedules',
				component: dynamic(
					() => import('@/app/dashboard/admin/AddCalendarEvent')
				),
			},

			'calendar/academic': {
				title: 'Academic Calendar',
				icon: CalendarDays,
				category: 'Calendar & Schedules',
				component: dynamic(
					() => import('@/app/dashboard/shared/CalendarAndSchedules')
				),
			},

			// Academic Resources
			'resources/view': {
				title: 'View Resources',
				icon: Library,
				category: 'Academic Resources',
				component: dynamic(
					() => import('@/app/dashboard/shared/ViewResources')
				),
			},
			'resources/add': {
				title: 'Add a Resource',
				icon: FilePen,
				category: 'Academic Resources',
				component: dynamic(() => import('@/app/dashboard/admin/AddResource')),
			},
			'resources/manage': {
				title: 'Manage Resources',
				icon: Library,
				category: 'Academic Resources',
				component: dynamic(
					() => import('@/app/dashboard/admin/ManageResources')
				),
			},

			settings: {
				title: 'School Settings',
				icon: Settings,
				component: dynamic(() => import('@/app/dashboard/admin/Settings')),
			},
			support: {
				title: 'Support',
				icon: Shield,
				component: dynamic(() => import('@/app/dashboard/admin/Support')),
			},
		},
	},

	// registrar: {
	// 	items: {
	// 		// Admissions
	// 		'admissions/applications': {
	// 			title: 'View Applications',
	// 			icon: GraduationCap,
	// 			category: 'Admissions',
	// 			component: dynamic(
	// 				() => import('@/app/dashboard/registrar/ViewApplications')
	// 			),
	// 		},
	// 		'admissions/admit-student': {
	// 			title: 'Admit New Student',
	// 			icon: BookOpen,
	// 			category: 'Admissions',
	// 			component: dynamic(
	// 				() => import('@/app/dashboard/registrar/AdmitStudent')
	// 			),
	// 		},

	// 		// Scholarships & Awards
	// 		'scholarships/manage': {
	// 			title: 'Manage Scholarships',
	// 			icon: Medal,
	// 			category: 'Scholarships & Awards',
	// 			component: dynamic(
	// 				() => import('@/app/dashboard/registrar/ManageScholarships')
	// 			),
	// 		},
	// 		'scholarships/recipients': {
	// 			title: 'Ward Students',
	// 			icon: Users,
	// 			category: 'Scholarships & Awards',
	// 			component: dynamic(
	// 				() => import('@/app/dashboard/registrar/WardStudents')
	// 			),
	// 		},
	// 	},
	// },

	// casher: {
	// 	items: {
	// 		'financial-reports': {
	// 			title: 'Financial Reports',
	// 			icon: Wallet,
	// 			component: dynamic(
	// 				() => import('@/app/dashboard/casher/FinancialReports')
	// 			),
	// 		},
	// 	},
	// },

	teacher: {
		items: {
			// Grading
			grading: {
				title: 'Grading',
				icon: FilePen,
				category: 'Grading',
				component: dynamic(
					() => import('@/app/dashboard/teacher/grading/GradeManagement')
				),
			},

			// Lesson Planning
			'lesson-plans/submit': {
				title: 'Submit Lesson Plan',
				icon: FilePen,
				category: 'Lesson Planning',
				component: dynamic(
					() => import('@/app/dashboard/teacher/SubmitLessonPlan')
				),
			},
			'lesson-plans/scheme': {
				title: 'Submit Scheme of Work',
				icon: ClipboardList,
				category: 'Lesson Planning',
				component: dynamic(
					() => import('@/app/dashboard/teacher/SubmitSchemeOfWork')
				),
			},
			'lesson-plans/manage': {
				title: 'Manage Lesson Plans',
				icon: FileText,
				category: 'Lesson Planning',
				component: dynamic(
					() => import('@/app/dashboard/teacher/ManageLessonPlans')
				),
			},

			// Salary
			'salary/advance': {
				title: 'Request Salary Advance',
				icon: Wallet,
				category: 'Salary',
				component: dynamic(
					() => import('@/app/dashboard/teacher/RequestSalaryAdvance')
				),
			},
			'salary/sign': {
				title: 'Sign for Salary',
				icon: FilePen,
				category: 'Salary',
				component: dynamic(
					() => import('@/app/dashboard/teacher/SignForSalary')
				),
			},

			// Academic Resources
			'resources/view': {
				title: 'View Resources',
				icon: Library,
				category: 'Academic Resources',
				component: dynamic(
					() => import('@/app/dashboard/shared/ViewResources')
				),
			},
			'resources/add': {
				title: 'Add a Resource',
				icon: FilePen,
				category: 'Academic Resources',
				component: dynamic(() => import('@/app/dashboard/teacher/AddResource')),
			},
			'resources/manage': {
				title: 'Manage Resources',
				icon: Library,
				category: 'Academic Resources',
				component: dynamic(
					() => import('@/app/dashboard/teacher/ManageResources')
				),
			},

			Events: {
				title: 'Events Log',
				icon: AlignEndVerticalIcon,
				component: dynamic(() => import('@/app/dashboard/teacher/EventsLog')),
			},
		},
	},

	student: {
		items: {
			// Fees Payment
			pay: {
				title: 'Pay Fees',
				icon: Wallet,
				category: 'Fees Payment',
				component: dynamic(
					() => import('@/app/dashboard/student/fees/PayFees')
				),
			},
			'payment-history': {
				title: 'Payment History',
				icon: FileText,
				category: 'Fees Payment',
				component: dynamic(
					() => import('@/app/dashboard/student/fees/PaymentHistory')
				),
			},

			// Grading
			'periodic-grade': {
				title: 'View Periodic Grades',
				icon: CheckSquare,
				category: 'Grading',
				component: dynamic(
					() => import('@/app/dashboard/student/grades/periodicReports')
				),
			},
			'yearly-grade': {
				title: 'View Yearly Grades',
				icon: CheckSquare,
				category: 'Grading',
				component: dynamic(() => import('@/app/dashboard/shared/YearlyReport')),
			},
			'resources/view': {
				title: 'View Resources',
				icon: Library,
				category: 'Academic Resources',
				component: dynamic(
					() => import('@/app/dashboard/shared/ViewResources')
				),
			},
		},
	},

	administrator: {
		items: {
			// Salary
			'salary/advance': {
				title: 'Request Salary Advance',
				icon: Wallet,
				category: 'Salary',
				component: dynamic(
					() => import('@/app/dashboard/administrator/requestSalaryAdvance')
				),
			},
			'salary/sign': {
				title: 'Sign for Salary',
				icon: FilePen,
				category: 'Salary',
				component: dynamic(
					() => import('@/app/dashboard/administrator/signForSalary')
				),
			},
		}, // <-- Close items here
	}, // <-- Close administrator object here

	// proprietor: {
	// 	items: {
	// 		// Single nav item
	// 		students: {
	// 			title: 'Students',
	// 			icon: GraduationCap,
	// 			component: dynamic(() => import('@/app/dashboard/proprietor/Students')),
	// 		},

	// 		// Salary Management
	// 		'salary/pay': {
	// 			title: 'Pay Salaries',
	// 			icon: Wallet,
	// 			category: 'Salary Management',
	// 			component: dynamic(
	// 				() => import('@/app/dashboard/proprietor/PaySalaries')
	// 			),
	// 		},
	// 		'salary/requests': {
	// 			title: 'Salary Requests',
	// 			icon: FilePen,
	// 			category: 'Salary Management',
	// 			component: dynamic(
	// 				() => import('@/app/dashboard/proprietor/SalaryRequests')
	// 			),
	// 		},

	// 		// Employee Management
	// 		'employees/teachers': {
	// 			title: 'Teachers',
	// 			icon: Users,
	// 			category: 'Employee Management',
	// 			component: dynamic(() => import('@/app/dashboard/proprietor/Teachers')),
	// 		},
	// 		'employees/administrative': {
	// 			title: 'Administrative Staff',
	// 			icon: Users,
	// 			category: 'Employee Management',
	// 			component: dynamic(
	// 				() => import('@/app/dashboard/proprietor/AdministrativeStaff')
	// 			),
	// 		},
	// 		'employees/other': {
	// 			title: 'Other Employees',
	// 			icon: Users,
	// 			category: 'Employee Management',
	// 			component: dynamic(
	// 				() => import('@/app/dashboard/proprietor/OtherEmployees')
	// 			),
	// 		},

	// 		// School Management
	// 		'school/edit': {
	// 			title: 'Edit Profile',
	// 			icon: FilePen,
	// 			category: 'School Management',
	// 			component: dynamic(
	// 				() => import('@/app/dashboard/proprietor/EditSchoolProfile')
	// 			),
	// 		},
	// 		'school/info': {
	// 			title: 'Manage Info',
	// 			icon: FileText,
	// 			category: 'School Management',
	// 			component: dynamic(
	// 				() => import('@/app/dashboard/proprietor/ManageSchoolInfo')
	// 			),
	// 		},
	// 	},
	// },

	// supervisor: {
	// 	items: {
	// 		// School Management
	// 		'school/edit': {
	// 			title: 'Edit Profile',
	// 			icon: FilePen,
	// 			category: 'School Management',
	// 			component: dynamic(
	// 				() => import('@/app/dashboard/supervisor/EditSchoolProfile')
	// 			),
	// 		},
	// 		'school/info': {
	// 			title: 'Manage Info',
	// 			icon: FileText,
	// 			category: 'School Management',
	// 			component: dynamic(
	// 				() => import('@/app/dashboard/supervisor/ManageSchoolInfo')
	// 			),
	// 		},
	// 	},
	// },

	// vpa: {
	// 	items: {
	// 		'resources/manage': {
	// 			title: 'Manage Resources',
	// 			icon: Library,
	// 			component: dynamic(() => import('@/app/dashboard/vpa/ManageResources')),
	// 		},
	// 	},
	// },

	shared: {
		items: {
			// Profile & Communication
			profile: {
				title: 'Profile',
				icon: UserCircle,
				component: dynamic(() => import('@/app/dashboard/shared/UserProfile')),
			},
			messages: {
				title: 'Messages',
				icon: MessageCircle,
				component: dynamic(() => import('@/app/dashboard/shared/Messages')),
			},

			// Calendar & Schedules

			// 'calendar/classes': {
			// 	title: 'Class Schedule',
			// 	icon: CalendarDays,
			// 	category: 'Calendar & Schedules',
			// 	component: dynamic(
			// 		() => import('@/app/dashboard/shared/ClassSchedule')
			// 	),
			// },
			// 'calendar/exams': {
			// 	title: 'Exam Schedule',
			// 	icon: CalendarDays,
			// 	category: 'Calendar & Schedules',
			// 	component: dynamic(() => import('@/app/dashboard/shared/ExamSchedule')),
			// },

			// Academic Resources
		},
	},
};
