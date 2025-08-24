// school-profiles/upstairs.tsx
// This file contains the profile data for Upstairs Christian Academy

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
export const upstairs = {
	name: 'Upstairs Christian Academy',
	slogan: 'Excellence in Education',
	shortName: 'Upstairs',
	initials: 'UCA',
	logoUrl:
		'https://res.cloudinary.com/dcalueltd/image/upload/v1753368059/school-management-system/uca/logo.png',
	logoUrl2:
		'https://res.cloudinary.com/dcalueltd/image/upload/v1753484515/uca_logo2_kqlgdl.png',
	description:
		'We provide exceptional education that nurtures both academic excellence and spiritual growth',
	heroImageUrl:
		'https://res.cloudinary.com/dcalueltd/image/upload/v1753368059/school-management-system/uca/Hero.png',
	tagline:
		'Nurturing minds, building character, and inspiring excellence through quality Christian education',
	yearFounded: 1995,

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
			name: 'Dr. John Doe',
			title: 'Principal',
			avatarUrl:
				'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
			bio: 'Ed.D in Educational Leadership with over 20 years experience in academic administration and curriculum development.',
			email: 'principal@unityca.edu.lr',
			badgeBg:
				'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
		},
		{
			name: 'Prof. Jane Smith',
			title: 'Vice Principal',
			avatarUrl:
				'https://images.unsplash.com/photo-1494790108755-2616b612b494?w=150&h=150&fit=crop&crop=face',
			bio: 'M.Ed in Secondary Education with expertise in student affairs, discipline management, and academic counseling.',
			email: 'vprincipal@unityca.edu.lr',
			badgeBg:
				'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
		},
		{
			name: 'Mr. Michael Brown',
			title: 'Registrar',
			avatarUrl:
				'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
			bio: 'B.A in Business Administration specializing in student records management, enrollment, and academic documentation.',
			email: 'registrar@unityca.edu.lr',
			badgeBg:
				'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
		},
		{
			name: 'Dr. Sarah Wilson',
			title: 'Academic Director',
			avatarUrl:
				'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
			bio: 'Ph.D in Curriculum and Instruction, responsible for academic programs, teacher development, and assessment.',
			email: 'academic@unityca.edu.lr',
			badgeBg:
				'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
		},
		{
			name: 'Mr. Robert Taylor',
			title: 'Student Affairs Director',
			avatarUrl:
				'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
			bio: 'M.A in Student Personnel Services, overseeing student activities, counseling services, and campus life.',
			email: 'studentaffairs@unityca.edu.lr',
			badgeBg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
		},
		{
			name: 'Ms. Linda Davis',
			title: 'Finance Director',
			avatarUrl:
				'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
			bio: 'CPA with MBA in Finance, managing school finances, budgeting, tuition, and financial aid programs.',
			email: 'finance@unityca.edu.lr',
			badgeBg:
				'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
		},
	],

	address: ['123 Education Street', 'Monrovia, Montserrado', 'Liberia'],

	phones: ['+231 770 123 456', '+231 880 789 012'],

	emails: ['info@unityca.edu.lr', 'admissions@unityca.edu.lr'],

	hours: [
		'Monday - Friday: 7:30 AM - 3:30 PM',
		'Saturday: 8:00 AM - 12:00 PM',
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
		{ label: 'Elementary School', href: '#elementary' },
		{ label: 'Junior High School', href: '#junior-high' },
		{ label: 'Senior High School', href: '#senior-high' },
		{ label: 'Course Catalog', href: '#catalog' },
		{ label: 'Academic Calendar', href: '#calendar' },
		{ label: 'Library', href: '#library' },
	],

	footerLinks: [
		{ label: 'Privacy Policy', href: '#privacy' },
		{ label: 'Terms of Service', href: '#terms' },
		{ label: 'Site Map', href: '#sitemap' },
	],

	classLevels: {
		Morning: {
			'Self Contained': {
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
					'Phonics',
					'Bible',
				],
				classes: [
					{ classId: 'Morning-Daycare', name: 'Daycare' },
					{ classId: 'Morning-Nursery', name: 'Nursery' },
					{ classId: 'Morning-kOne', name: 'K-I' },
					{ classId: 'Morning-kTwo', name: 'K-II' },
					{ classId: 'Morning-GradeOne', name: 'Grade 1' },
					{ classId: 'Morning-GradeTwo', name: 'Grade 2' },
					{ classId: 'Morning-GradeThree', name: 'Grade 3' },
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
					'Phonics',
					'Bible',
				],
				classes: [
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
					'Vocabulary',
					'Phonics',
					'Bible',
					'Agriculture',
					'Literature',
				],
				classes: [
					{ classId: 'Morning-GradeSeven', name: 'Grade 7' },
					{ classId: 'Morning-GradeEight', name: 'Grade 8' },
					{ classId: 'Morning-GradeNine', name: 'Grade 9' },
				],
			},
			'Senior High': {
				subjects: [
					'Math',
					'Biology',
					'English',
					'Physics',
					'Chemistry',
					'Computer',
					'Economics',
					'Government',
					'Geography',
					'History',
					'Literature',
					'Accounting',
					'Bible',
					'French',
					'Agriculture',
				],
				classes: [
					{ classId: 'Morning-GradeTenA', name: 'Grade 10-A' },
					{ classId: 'Morning-GradeTenB', name: 'Grade 10-B' },
					{ classId: 'Morning-GradeElevenA', name: 'Grade 11-A' },
					{ classId: 'Morning-GradeElevenB', name: 'Grade 11-B' },
					{ classId: 'Morning-GradeTwelveA', name: 'Grade 12-A' },
					{ classId: 'Morning-GradeTwelveB', name: 'Grade 12-B' },
				],
			},
		},
		Night: {
			'Self Contained': {
				subjects: ['Math', 'Science', 'English', 'Arts', 'Social Studies'],
				classes: [
					{ classId: 'Night-Nursery', name: 'Nursery' },
					{ classId: 'Night-kOne', name: 'K-I' },
					{ classId: 'Night-kTwo', name: 'K-II' },
					{ classId: 'Night-GradeOne', name: 'Grade 1' },
					{ classId: 'Night-GradeTwo', name: 'Grade 2' },
					{ classId: 'Night-GradeThree', name: 'Grade 3' },
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
					'Phonics',
					'Bible',
				],
				classes: [
					{ classId: 'Night-GradeFour', name: 'Grade 4' },
					{ classId: 'Night-GradeFive', name: 'Grade 5' },
					{ classId: 'Night-GradeSix', name: 'Grade 6' },
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
					'Vocabulary',
					'Phonics',
					'Bible',
					'Agriculture',
					'Literature',
				],
				classes: [
					{ classId: 'Night-GradeSeven', name: 'Grade 7' },
					{ classId: 'Night-GradeEight', name: 'Grade 8' },
					{ classId: 'Night-GradeNine', name: 'Grade 9' },
				],
			},
			'Senior High': {
				subjects: [
					'Math',
					'Biology',
					'English',
					'Physics',
					'Chemistry',
					'Computer',
					'Economics',
					'Government',
					'Geography',
					'History',
					'Literature',
					'Accounting',
					'Bible',
					'French',
					'Agriculture',
				],
				classes: [
					{ classId: 'Night-GradeTen', name: 'Grade 10' },
					{ classId: 'Night-GradeEleven', name: 'Grade 11' },
					{ classId: 'Night-GradeTwelve', name: 'Grade 12' },
				],
			},
		},
	},

	features: [
		'onlineAdmissions',
		'onlinePayments',
		'aiChat',
		'schoolAdministratorsAccount',
		'homepage',
	],
};
