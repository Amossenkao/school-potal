// school-profiles/samore.tsx
// Updated profile for Samore Foundation Academy with new feature management structure

import {
	Award,
	Laptop,
	Target,
	Heart,
	Users,
	Globe,
	Zap,
	BookOpen,
	FlaskConical,
	Building,
	Shield,
	Star,
	Wifi,
} from 'lucide-react';

// Define available features for the system
export type FeatureKey =
	// Core Features
	| 'dashboard'
	| 'user_management'
	| 'profile_management'
	| 'messages'

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
	| 'school_settings'
	| 'events_log';

// Define role-based feature access
export interface RoleFeatureAccess {
	[role: string]: {
		features: FeatureKey[];
		restrictions?: {
			[feature: string]: string[];
		};
	};
}

// School profile interface
export interface SchoolProfile {
	// Basic school info
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

	// Dynamic features configuration
	enabledFeatures: FeatureKey[];
	roleFeatureAccess: RoleFeatureAccess;

	// Subscription/Plan info
	subscriptionPlan: 'basic' | 'standard' | 'premium';
	subscriptionExpiry?: Date;

	// Custom configurations
	customizations?: {
		theme?: 'default' | 'modern' | 'classic';
		branding?: {
			primaryColor?: string;
			secondaryColor?: string;
			customCss?: string;
		};
		modules?: {
			[moduleKey: string]: any;
		};
	};

	// Existing properties
	whyChoose: any[];
	facilities: any[];
	team: any[];
	address: string[];
	phones: string[];
	emails: string[];
	hours: string[];
	quickLinks: any[];
	academicLinks: any[];
	footerLinks: any[];
	classLevels: any;
}

export const samore: SchoolProfile = {
	name: 'Samore Foundation Academy',
	slogan: 'Empowering Future Leaders',
	shortName: 'Samore',
	initials: 'SFACSS',
	logoUrl:
		'https://res.cloudinary.com/dcalueltd/image/upload/v1756021042/school-management-system/samore/logo_r39gzb.png',
	description:
		'We provide exceptional education that nurtures both academic excellence and spiritual growth',
	heroImageUrl:
		'https://res.cloudinary.com/dcalueltd/image/upload/v1754304331/school-management-system/samore/samore-hero_q8sv1d.png',
	tagline:
		'Nurturing minds, building character, and inspiring excellence through quality Christian education',
	yearFounded: 1995,
	subscriptionPlan: 'standard', // Different plan than Upstairs
	subscriptionExpiry: new Date('2025-06-30'),

	// Samore has fewer features enabled (standard plan)
	enabledFeatures: [
		'dashboard',
		'profile_management',
		'messages',
		'grading_system',
		'academic_resources',
		'calendar_events',
		'fee_payment',
		'admissions',
		'user_management',
		'class_management',
		'academic_reports',
	],

	// Role-based feature access for Samore
	roleFeatureAccess: {
		system_admin: {
			features: [
				'dashboard',
				'user_management',
				'grading_system',
				'class_management',
				'academic_reports',
				'calendar_events',
				'academic_resources',
				'admissions',
				'profile_management',
				'messages',
			],
		},
		teacher: {
			features: [
				'dashboard',
				'grading_system',
				'academic_resources',
				'profile_management',
				'messages',
			],
		},
		student: {
			features: [
				'dashboard',
				'fee_payment',
				'grading_system',
				'academic_resources',
				'profile_management',
				'messages',
			],
		},
		administrator: {
			features: ['dashboard', 'profile_management', 'messages'],
		},
	},

	// Custom theme for Samore
	customizations: {
		theme: 'modern',
		branding: {
			primaryColor: '#2563eb', // Blue theme
			secondaryColor: '#1d4ed8',
		},
	},

	whyChoose: [
		{
			icon: <Award className="h-8 w-8 text-blue-600 dark:text-blue-400" />,
			title: 'Academic Excellence',
			description:
				'Our rigorous curriculum and dedicated teachers ensure students achieve their highest potential with consistently high test scores.',
		},
		{
			icon: <Laptop className="h-8 w-8 text-purple-600 dark:text-purple-400" />,
			title: 'Technology Focused',
			description:
				'Modern computer labs, smart classrooms, and digital learning tools prepare students for the future.',
		},
		{
			icon: <Heart className="h-8 w-8 text-green-600 dark:text-green-400" />,
			title: 'Character Development',
			description:
				'We focus on building strong moral values and character through Christian principles and community service.',
		},
		{
			icon: <Users className="h-8 w-8 text-orange-600 dark:text-orange-400" />,
			title: 'Small Class Sizes',
			description:
				'Our low student-to-teacher ratio ensures personalized attention and better learning outcomes for every student.',
		},
		{
			icon: <Target className="h-8 w-8 text-red-600 dark:text-red-400" />,
			title: 'Holistic Education',
			description:
				'We develop the whole child through academics, arts, athletics, and spiritual growth programs.',
		},
		{
			icon: <Globe className="h-8 w-8 text-teal-600 dark:text-teal-400" />,
			title: 'Global Perspective',
			description:
				'Our international programs and diverse community prepare students for success in a global society.',
		},
	],

	facilities: [
		{
			icon: <Zap className="h-7 w-7 text-blue-600 dark:text-blue-400" />,
			title: 'Modern E-Portal System',
			description:
				'Advanced online platform for grades, assignments, and parent communication',
		},
		{
			icon: <Laptop className="h-7 w-7 text-purple-600 dark:text-purple-400" />,
			title: 'Computer Laboratory',
			description:
				'Fully equipped with latest computers and high-speed internet connectivity',
		},
		{
			icon: (
				<FlaskConical className="h-7 w-7 text-green-600 dark:text-green-400" />
			),
			title: 'Science Laboratory',
			description:
				'Well-equipped labs for chemistry, biology, and physics experiments',
		},
		{
			icon: (
				<BookOpen className="h-7 w-7 text-orange-600 dark:text-orange-400" />
			),
			title: 'Digital Library',
			description:
				'Extensive collection of books and digital resources for research',
		},
		{
			icon: <Wifi className="h-7 w-7 text-red-600 dark:text-red-400" />,
			title: 'Campus-Wide WiFi',
			description:
				'High-speed wireless internet access throughout the entire campus',
		},
		{
			icon: <Building className="h-7 w-7 text-teal-600 dark:text-teal-400" />,
			title: 'Smart Classrooms',
			description:
				'Interactive whiteboards and multimedia systems in every classroom',
		},
		{
			icon: <Shield className="h-7 w-7 text-pink-600 dark:text-pink-400" />,
			title: 'Security System',
			description:
				'24/7 CCTV monitoring and secure campus environment for student safety',
		},
		{
			icon: <Star className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />,
			title: 'Multi-Purpose Hall',
			description:
				'Large auditorium for assemblies, performances, and special events',
		},
	],

	team: [
		{
			name: 'Dr. Emmanuel Samore',
			title: 'Principal',
			avatarUrl:
				'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
			bio: 'Ed.D in Educational Leadership with over 15 years experience in academic administration and curriculum development.',
			email: 'principal@samore.edu.lr',
			badgeBg:
				'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
		},
		{
			name: 'Prof. Mary Johnson',
			title: 'Vice Principal',
			avatarUrl:
				'https://images.unsplash.com/photo-1494790108755-2616b612b494?w=150&h=150&fit=crop&crop=face',
			bio: 'M.Ed in Secondary Education with expertise in student affairs, discipline management, and academic counseling.',
			email: 'vprincipal@samore.edu.lr',
			badgeBg:
				'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
		},
		{
			name: 'Mr. James Wilson',
			title: 'Registrar',
			avatarUrl:
				'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
			bio: 'B.A in Business Administration specializing in student records management, enrollment, and academic documentation.',
			email: 'registrar@samore.edu.lr',
			badgeBg:
				'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
		},
		{
			name: 'Dr. Grace Thompson',
			title: 'Academic Director',
			avatarUrl:
				'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
			bio: 'Ph.D in Curriculum and Instruction, responsible for academic programs, teacher development, and assessment.',
			email: 'academic@samore.edu.lr',
			badgeBg:
				'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
		},
		{
			name: 'Mr. David Miller',
			title: 'Student Affairs Director',
			avatarUrl:
				'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
			bio: 'M.A in Student Personnel Services, overseeing student activities, counseling services, and campus life.',
			email: 'studentaffairs@samore.edu.lr',
			badgeBg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
		},
		{
			name: 'Ms. Sarah Davis',
			title: 'Finance Director',
			avatarUrl:
				'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
			bio: 'CPA with MBA in Finance, managing school finances, budgeting, tuition, and financial aid programs.',
			email: 'finance@samore.edu.lr',
			badgeBg:
				'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
		},
	],

	address: ['456 Foundation Boulevard', 'Paynesville, Montserrado', 'Liberia'],
	phones: ['+231 775 654 321', '+231 886 432 109'],
	emails: ['info@samore.edu.lr', 'admissions@samore.edu.lr'],
	hours: [
		'Monday - Friday: 7:00 AM - 3:00 PM',
		'Saturday: 8:00 AM - 1:00 PM',
		'Sunday: Closed',
	],

	quickLinks: [
		{ label: 'About Us', href: '#about' },
		{ label: 'Admissions', href: '#admissions' },
		{ label: 'Academic Programs', href: '#programs' },
		{ label: 'Facilities', href: '#facilities' },
		{ label: 'Student Life', href: '#student-life' },
		{ label: 'News & Events', href: '#news' },
	],

	academicLinks: [
		{ label: 'Kindergarten', href: '#kindergarten' },
		{ label: 'Elementary School', href: '#elementary' },
		{ label: 'Junior High School', href: '#junior-high' },
		{ label: 'Course Catalog', href: '#catalog' },
		{ label: 'Academic Calendar', href: '#calendar' },
		{ label: 'Library', href: '#library' },
	],

	footerLinks: [
		{ label: 'Privacy Policy', href: '#privacy' },
		{ label: 'Terms of Service', href: '#terms' },
		{ label: 'Site Map', href: '#sitemap' },
	],

	// Updated class structure for Samore
	classLevels: {
		Morning: {
			Kindergarten: {
				subjects: [
					'Math',
					'Science',
					'English',
					'Arts',
					'Social Studies',
					'Physical Education',
					'Bible',
				],
				classes: [
					{ classId: 'Morning-Nursery', name: 'Nursery' },
					{ classId: 'Morning-kOne', name: 'K-I' },
					{ classId: 'Morning-kTwo', name: 'K-II' },
				],
			},
			Elementary: {
				subjects: [
					'Math',
					'General Science',
					'English',
					'French',
					'Social Studies',
					'Health Science',
					'Physical Education',
					'Computer',
					'Reading',
					'Writing',
					'Spelling',
					'Bible',
				],
				classes: [
					{ classId: 'Morning-GradeOne', name: 'Grade 1' },
					{ classId: 'Morning-GradeTwo', name: 'Grade 2' },
					{ classId: 'Morning-GradeThree', name: 'Grade 3' },
					{ classId: 'Morning-GradeFour', name: 'Grade 4' },
					{ classId: 'Morning-GradeFive', name: 'Grade 5' },
					{ classId: 'Morning-GradeSix', name: 'Grade 6' },
				],
			},
			'Junior High': {
				subjects: [
					'Math',
					'General Science',
					'English',
					'French',
					'Geography',
					'Health Science',
					'Physical Education',
					'Computer',
					'History',
					'Civics',
					'Literature',
					'Bible',
					'Agriculture',
				],
				classes: [
					{ classId: 'Morning-GradeSeven', name: 'Grade 7' },
					{ classId: 'Morning-GradeEight', name: 'Grade 8' },
					{ classId: 'Morning-GradeNine', name: 'Grade 9' },
				],
			},
		},
	},
};
