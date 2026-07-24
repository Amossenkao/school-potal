'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { AnimatePresence, motion, useInView, type Variants } from 'framer-motion';
import {
	ArrowRight,
	BarChart3,
	FileDown,
	BookOpen,
	CalendarDays,
	CloudOff,
	ChevronDown,
	CheckCircle2,
	ClipboardList,
	CircleDollarSign,
	Database,
	Download,
	FileText,
	Globe,
	GraduationCap,
	LayoutDashboard,
	Lock,
	LogIn,
	LogOut,
	Mail,
	Menu,
	MessageSquare,
	Phone,
	Play,
	Plus,
	QrCode,
	Settings,
	ShieldCheck,
	Share2,
	Sparkles,
	Star,
	UserCheck,
	Users,
	X,
} from 'lucide-react';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
	display: 'swap',
});

const fadeUp: Variants = {
	hidden: { opacity: 0, y: 32 },
	visible: (i: number) => ({
		opacity: 1,
		y: 0,
		transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
	}),
};

const fadeIn: Variants = {
	hidden: { opacity: 0 },
	visible: (i: number) => ({
		opacity: 1,
		transition: { duration: 0.6, delay: i * 0.08, ease: 'easeOut' },
	}),
};

const stagger: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: 0.06 } },
};

type AnimateWhenVisibleProps = {
	children: ReactNode;
	className?: string;
	custom?: number;
};

function AnimateWhenVisible({ children, className, custom = 0 }: AnimateWhenVisibleProps) {
	return (
		<motion.div
			className={className}
			custom={custom}
			initial="hidden"
			whileInView="visible"
			viewport={{ once: true, amount: 0.2 }}
			variants={fadeUp}
		>
			{children}
		</motion.div>
	);
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
	const ref = useRef<HTMLSpanElement>(null);
	const isInView = useInView(ref, { once: true });
	const [count, setCount] = useState(0);

	useEffect(() => {
		if (!isInView) return;
		const duration = 1800;
		const steps = 60;
		const increment = target / steps;
		let current = 0;
		const timer = window.setInterval(() => {
			current += increment;
			if (current >= target) {
				setCount(target);
				window.clearInterval(timer);
			} else {
				setCount(Math.floor(current));
			}
		}, duration / steps);
		return () => window.clearInterval(timer);
	}, [isInView, target]);

	return (
		<span ref={ref}>
			{count.toLocaleString()}
			{suffix}
		</span>
	);
}

const navItems = [
	{ label: 'About', href: '#about', icon: Sparkles },
	{ label: 'Features', href: '#features', icon: LayoutDashboard },
	{ label: 'Solutions', href: '#solutions', icon: ClipboardList },
	{ label: 'Pricing', href: '#pricing', icon: CircleDollarSign },
	{ label: 'Contact', href: '#contact', icon: Mail },
];

const features = [
	{ icon: FileText, title: 'Admissions', description: 'Streamline enrollment with digital applications, automated workflows, and real-time status tracking.', color: '#465fff' },
	{ icon: UserCheck, title: 'Attendance', description: 'Track daily attendance with instant notifications, pattern analysis, and reporting dashboards.', color: '#12b76a' },
	{ icon: CircleDollarSign, title: 'Finance', description: 'Manage fees, invoices, payments, and financial reporting from one unified system.', color: '#f79009' },
	{ icon: BookOpen, title: 'Report Cards', description: 'Generate professional report cards with customizable templates and automated grade calculations.', color: '#8b5cf6' },
	{ icon: Users, title: 'Student Portal', description: "Students can view their reports, attendance, balances and schedules", color: '#06b6d4' },
	{ icon: BarChart3, title: 'Analytics', description: 'Surface actionable insights across academics, operations, and student outcomes with live dashboards.', color: '#465fff' },
	{ icon: CalendarDays, title: 'Calendar & Schedules', description: 'Plan and manage school events, class timetables, and academic calendars in one place.', color: '#12b76a' },
	{ icon: Globe, title: 'Real-Time', description: 'Live updates across the platform — attendance, grades, and notifications sync instantly for all users.', color: '#f79009' },
	{ icon: CloudOff, title: 'Offline Mode', description: 'Keep working without internet. Changes sync automatically when connectivity returns.', color: '#8b5cf6' },
];

const showcaseItems = [
	{
		tag: 'Dashboard',
		title: 'Everything you need, one glance away.',
		description: 'A role-aware dashboard that greets every user by name, shows live insights, and adapts to whether you are an admin, teacher, or student.',
		features: ['Role-based personalized views', 'Real-time clock & day timeline', 'Performance charts & enrollment stats'],
		color: '#465fff',
		type: 'dashboard' as const,
	},
	{
		tag: 'Attendance',
		title: 'Mark attendance in seconds.',
		description: 'Filter by class, pick a date range, and toggle each student present or absent with a single tap. Stats update live — present count, absence rate, everything.',
		features: ['Date-range calendar picker', 'One-tap present/absent toggles', 'Live attendance rate per student'],
		color: '#12b76a',
		type: 'attendance' as const,
	},
	{
		tag: 'Grading',
		title: 'Submit grades in seconds, not hours.',
		description: 'Filter by class and subject, toggle periods with chips, and enter grades directly into a spreadsheet-like table. Drafts save offline and sync when you reconnect.',
		features: ['Period-based grade chips', 'Inline spreadsheet editing', 'Offline draft sync'],
		color: '#f79009',
		type: 'reportcard' as const,
	},
];

const comparisonRows: { feature: string; schoolMesh: boolean | 'partial'; traditional: boolean | 'partial' }[] = [
	{ feature: 'Cloud-Native', schoolMesh: true, traditional: false },
	{ feature: 'Offline Support', schoolMesh: true, traditional: false },
	{ feature: 'Mobile-First Design', schoolMesh: true, traditional: false },
	{ feature: 'Real-Time Updates', schoolMesh: true, traditional: false },
	{ feature: 'Modern Security', schoolMesh: true, traditional: 'partial' },
	{ feature: 'Intuitive UI', schoolMesh: true, traditional: false },
	{ feature: 'Automated Workflows', schoolMesh: true, traditional: false },
	{ feature: 'Multi-Tenant Architecture', schoolMesh: true, traditional: false },
	{ feature: 'AI-Powered Insights', schoolMesh: true, traditional: false },
];

const teamMembers = [
	{
		name: 'Amos Senkao',
		initials: 'AS',
		role: 'Founder & Lead Engineer',
		bio: 'Full-stack engineer and educator who built SchoolMesh from classroom feedback. Obsessed with fast, reliable software that works offline.',
		color: '#465fff',
		links: [
			{ icon: 'mail', label: 'Email', href: 'mailto:amossenkao@gmail.com' },
			{ icon: 'linkedin', label: 'LinkedIn', href: '#' },
		],
	},
	{
		name: 'James Doe',
		initials: 'JD',
		role: 'Head of Operations',
		bio: 'Oversees onboarding and school partnerships. Ensures every school gets a smooth rollout and hands-on training.',
		color: '#12b76a',
		links: [
			{ icon: 'mail', label: 'Email', href: 'mailto:james@schoolmesh.net' },
			{ icon: 'linkedin', label: 'LinkedIn', href: '#' },
		],
	},
	{
		name: 'Joseph D. Suah',
		initials: 'AB',
		role: 'Product & UX Lead',
		bio: 'Designs every screen with the end user in mind. Believes great software should feel invisible — just results.',
		color: '#f79009',
		links: [
			{ icon: 'mail', label: 'Email', href: 'mailto:joseph@schoolmesh.net' },
			{ icon: 'twitter', label: 'X', href: '#' },
		],
	},
	{
		name: 'Fredrick S. Boakai',
		initials: 'JK',
		role: 'School Partnerships',
		bio: 'Connects SchoolMesh with schools across Liberia. Former teacher who understands what educators need from their tools.',
		color: '#8b5cf6',
		links: [
			{ icon: 'mail', label: 'Email', href: 'mailto:fredrick@schoolmesh.net' },
			{ icon: 'globe', label: 'Website', href: '#' },
		],
	},
];

const stats = [
	{ value: 2500, suffix: '+', label: 'Students', color: '#465fff' },
	{ value: 5, suffix: '+', label: 'Schools', color: '#12b76a' },
	{ value: 99.9, suffix: '%', label: 'Availability', color: '#f79009' },
	{ value: 1.6, suffix: 'M+', label: 'Records Managed', color: '#8b5cf6' },
];

const testimonials = [
	{
		name: 'James Doe',
		role: 'Teacher',
		school: 'Upstairs Christian Academy',
		quote: 'Submitting grades in the SchoolMesh system is very easy and convenient for us teachers.',
		avatar: 'JD',
	},
	{
		name: 'Abu B. Bangura',
		role: 'Teacher',
		school: 'Upstairs Christian Academy',
		quote: 'This platform is very intuitive, fast, and makes grading hassle-free.',
		avatar: 'AB',
	},
	{
		name: 'Mr. Joseph Kolleh',
		role: 'Proprietor',
		school: 'Jessica Rachel Kolleh Memorial Institute',
		quote: "I've heard many positive things from my teachers who have used this system, and I'm looking forward to introducing it at my school next academic year.",
		avatar: 'JK',
	},
];

const pricingPlans = [
	{
		name: 'Starter',
		description: 'Full web platform access',
		price: '500 LRD',
		period: 'per student · per academic year',
		features: [
			'Full web platform access',
			'Role-based dashboards',
			'Attendance & grading',
			'Parent & student portals',
			'Report cards & analytics',
		],
		highlight: false,
		cta: 'Get Started',
		custom: false,
	},
	{
		name: 'Premium',
		description: 'Web + dedicated mobile & desktop apps',
		price: '700 LRD',
		period: 'per student · per academic year',
		features: [
			'Everything in Starter',
			'Dedicated mobile app (iOS & Android)',
			'Desktop app (Windows & macOS)',
			'Offline-first with sync',
			'Push notifications',
		],
		highlight: true,
		cta: 'Get Started',
		custom: false,
	},
	{
		name: 'Custom / Enterprise',
		description: 'For schools and networks that prefer a fixed annual fee.',
		price: 'Custom',
		period: 'lump-sum annual pricing',
		features: ['Lump-sum annual pricing', 'Based on projected enrollment', 'Predictable budgeting', 'Priority onboarding & support', 'Custom branding & integrations'],
		highlight: false,
		cta: 'Contact Us',
		custom: true,
	},
];

const faqs = [
	{
		question: 'What is SchoolMesh?',
		answer: 'SchoolMesh is a complete cloud-based school management platform that connects administrators, teachers, parents, and students in one intelligent system. It handles everything from admissions and attendance to finance and analytics.',
	},
	{
		question: 'How does multi-tenancy work?',
		answer: 'Each school gets its own isolated environment with custom branding, settings, and data. Multiple schools can share one platform instance while maintaining complete independence over their operations and information.',
	},
	{
		question: 'Does SchoolMesh work offline?',
		answer: 'Yes. SchoolMesh is designed to work without an internet connection. Teachers and administrators can continue working offline, and all changes are automatically synchronized when connectivity returns.',
	},
	{
		question: 'Is my school data secure?',
		answer: 'Absolutely. We use industry-standard encryption, secure data isolation between tenants, role-based access controls, and regular security audits to ensure your data is always protected.',
	},
	{
		question: 'Can I try SchoolMesh for free?',
		answer: 'Yes. We offer a free tier for individual schools to get started. You can explore all core features before committing to a paid plan. No credit card required.',
	},
	{
		question: 'What devices does SchoolMesh support?',
		answer: 'SchoolMesh works on any modern web browser, and we also offer dedicated mobile apps for iOS and Android, plus a desktop application for Windows and macOS.',
	},
];

const footerLinks = {
	Product: [
		{ label: 'Features', href: '#features' },
		{ label: 'Pricing', href: '#pricing' },
		{ label: 'Mobile App', href: '#' },
		{ label: 'Desktop App', href: '#' },
		{ label: 'API', href: '#' },
	],
	Company: [
		{ label: 'About', href: '#about' },
		{ label: 'Careers', href: '#' },
		{ label: 'Blog', href: '#' },
		{ label: 'Press', href: '#' },
	],
	Resources: [
		{ label: 'Documentation', href: '#' },
		{ label: 'Help Center', href: '#' },
		{ label: 'Guides', href: '#' },
		{ label: 'Community', href: '#' },
	],
	Support: [
		{ label: 'Contact Us', href: '#contact' },
		{ label: 'Status Page', href: '#' },
		{ label: 'Security', href: '#' },
	],
	Legal: [
		{ label: 'Privacy Policy', href: '#' },
		{ label: 'Terms of Service', href: '#' },
		{ label: 'Cookie Policy', href: '#' },
	],
};

/* ── Showcase Mockup Components ──────────────────────────── */

function DashboardMockup() {
	const sidebarItems = [
		{ name: 'Dashboard', icon: LayoutDashboard, active: true },
		{ name: 'User Management', icon: Users },
		{ name: 'Grading', icon: ClipboardList },
		{ name: 'Academic Reports', icon: GraduationCap },
		{ name: 'Calendar', icon: CalendarDays },
		{ name: 'Attendance', icon: UserCheck },
		{ name: 'Settings', icon: Settings },
	];

	return (
		<div className="flex overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg shadow-gray-900/5">
			{/* Sidebar */}
			<div className="hidden w-48 shrink-0 border-r border-gray-100 bg-[#f9fafb] p-3 lg:block">
					<div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-100 bg-white p-2">
					<Image
						src="/images/SchoolMesh.png"
						alt="SchoolMesh"
						width={28}
						height={28}
						className="h-7 w-7 rounded-md object-contain"
					/>
					<div>
						<p className="text-[10px] font-bold text-[#111827]">School<span className="text-[#465fff]">Mesh</span></p>
						<p className="text-[7px] text-gray-400">Excellence in Education</p>
					</div>
				</div>
				<nav className="flex flex-col gap-0.5">
					{sidebarItems.map((item) => (
						<div
							key={item.name}
							className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
								item.active
									? 'relative border-[#465fff]/20 bg-[#465fff]/5 text-[#465fff]'
									: 'border-transparent text-gray-500'
							}`}
						>
							{item.active && (
								<span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-[#465fff]" />
							)}
							<div className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
								item.active
									? 'border-[#465fff]/20 bg-[#465fff]/10 text-[#465fff]'
									: 'border-gray-200 bg-white text-gray-400'
							}`}>
								<item.icon className="h-3 w-3" />
							</div>
							<span className="truncate">{item.name}</span>
						</div>
					))}
					<div className="mt-2 border-t border-gray-100 pt-2">
						<div className="flex items-center gap-2 rounded-lg border border-transparent px-2.5 py-1.5 text-[10px] font-medium text-red-500">
							<div className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-red-100 bg-white text-red-400">
								<LogOut className="h-3 w-3" />
							</div>
							<span className="truncate">Logout</span>
						</div>
					</div>
				</nav>
			</div>

			{/* Main content */}
			<div className="flex-1 overflow-hidden bg-[#f9fafb]">
				{/* Hero card */}
				<div className="relative overflow-hidden bg-white m-2 rounded-lg border border-gray-100">
					<div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-gradient-to-br from-indigo-400/25 via-blue-400/15 to-transparent blur-2xl" />
					<div className="absolute top-3 right-3 opacity-[0.04] pointer-events-none">
						<ShieldCheck size={80} />
					</div>
					<div className="relative z-10 p-3 sm:p-4">
						<div className="mb-1.5 flex items-center gap-1.5">
							<span className="inline-flex items-center gap-1 rounded-full border border-[#465fff]/20 bg-[#465fff]/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#465fff]">
								<ShieldCheck size={7} strokeWidth={2.5} /> Administrator
							</span>
							<span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[8px] font-medium text-gray-500">
								2025-2026
							</span>
						</div>
						<h4 className="text-sm font-extrabold text-[#111827] tracking-tight">
							Good morning, Admin!
						</h4>
						<p className="mt-0.5 text-[9px] text-gray-500">Handle administrative tasks and manage staff-related functions.</p>
						{/* Day timeline */}
						<div className="mt-2">
							<div className="relative h-1 rounded-full bg-gray-100">
								<div className="absolute inset-y-0 left-0 rounded-full bg-[#465fff] opacity-30" style={{ width: '35%' }} />
								<div className="absolute top-1/2 h-2 w-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#465fff] ring-2 ring-white animate-pulse" style={{ left: '35%' }} />
							</div>
							<div className="mt-0.5 flex justify-between">
								{['Dawn', 'Midday', 'Dusk', 'Night'].map((s, i) => (
									<span key={s} className={`text-[7px] font-medium uppercase tracking-wider ${i === 1 ? 'text-[#465fff]' : 'text-gray-400'}`}>{s}</span>
								))}
							</div>
						</div>
					</div>
				</div>
				{/* Tabs */}
				<div className="px-2 pt-0.5">
					<div className="flex gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
						{['Insights', 'Performance', 'Enrollment'].map((tab, i) => (
							<div key={tab} className={`flex-1 rounded-md px-2 py-1 text-center text-[9px] font-semibold ${i === 0 ? 'bg-[#465fff] text-white shadow-sm' : 'text-gray-500'}`}>{tab}</div>
						))}
					</div>
				</div>
				{/* Stats grid */}
				<div className="grid grid-cols-3 gap-1.5 p-2">
					{[
						{ label: 'Total Students', value: '2,847', color: '#465fff' },
						{ label: 'Teachers', value: '186', color: '#12b76a' },
						{ label: 'Avg Pass Rate', value: '86%', color: '#f79009' },
					].map((s) => (
						<div key={s.label} className="rounded-lg border border-gray-100 bg-white p-2">
							<p className="text-[8px] font-medium text-gray-500">{s.label}</p>
							<p className="text-xs font-bold text-[#111827]">{s.value}</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function AttendanceMockup() {
	const students = [
		{ name: 'Alice Johnson', mon: 'P', tue: 'P', wed: 'A', thu: 'P', fri: 'P', rate: 80 },
		{ name: 'Bob Mensah', mon: 'P', tue: 'P', wed: 'P', thu: 'P', fri: 'P', rate: 100 },
		{ name: 'Clara Owusu', mon: 'A', tue: 'P', wed: 'P', thu: 'A', fri: 'P', rate: 60 },
		{ name: 'David Koffi', mon: 'P', tue: 'P', wed: 'P', thu: 'P', fri: 'A', rate: 80 },
		{ name: 'Emefa Adjei', mon: 'P', tue: 'A', wed: 'P', thu: 'P', fri: 'P', rate: 80 },
	];
	const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
			{/* Filter bar */}
			<div className="flex flex-wrap items-end gap-2 border-b border-gray-100 bg-gray-50/80 p-2 sm:p-3">
				{[
					{ label: 'Year', value: '2025-2026' },
					{ label: 'Session', value: 'Junior' },
					{ label: 'Class', value: 'Grade 7A' },
				].map((f) => (
					<div key={f.label} className="flex flex-col gap-0.5">
						<span className="text-[7px] font-semibold uppercase tracking-wider text-gray-400 sm:text-[8px]">{f.label}</span>
						<div className="flex h-5 items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 text-[9px] font-medium text-gray-700 sm:h-6 sm:px-2 sm:text-[10px]">
							{f.value}
							<ChevronDown className="h-2 w-2 text-gray-400 sm:h-2.5 sm:w-2.5" />
						</div>
					</div>
				))}
				<div className="flex flex-col gap-0.5">
					<span className="text-[7px] font-semibold uppercase tracking-wider text-gray-400 sm:text-[8px]">Date Range</span>
					<div className="flex h-5 items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 text-[9px] font-medium text-gray-700 sm:h-6 sm:px-2 sm:text-[10px]">
						Jun 16 – Jun 20
						<ChevronDown className="h-2 w-2 text-gray-400 sm:h-2.5 sm:w-2.5" />
					</div>
				</div>
			</div>
			{/* Action strip */}
			<div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
				<span className="text-[7px] font-semibold uppercase tracking-wider text-gray-400 sm:text-[8px]">Actions</span>
				<div className="flex items-center gap-1 rounded-full border border-[#465fff] bg-[#465fff] px-1.5 py-0.5 text-[8px] font-semibold text-white sm:px-2 sm:text-[9px]">
					✏️ Take attendance
				</div>
				<div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-[8px] font-medium text-gray-600 sm:px-2 sm:text-[9px]">
					📥 Export CSV
				</div>
			</div>
			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full min-w-[340px]">
					<thead>
						<tr className="border-b border-gray-100 bg-gray-50">
							<th className="px-2 py-1.5 text-left text-[8px] font-semibold uppercase tracking-wider text-gray-500 sm:px-3 sm:py-2 sm:text-[9px]">Student</th>
							{days.map((d) => (
								<th key={d} className="px-1 py-1.5 text-center text-[8px] font-semibold text-gray-500 sm:px-2 sm:py-2 sm:text-[9px]">
									<div className="flex flex-col items-center">
										<span>{d}</span>
										<span className="font-bold text-gray-700">{16 + days.indexOf(d)}</span>
									</div>
								</th>
							))}
							<th className="px-2 py-1.5 text-center text-[8px] font-semibold uppercase tracking-wider text-gray-500 sm:px-2 sm:py-2 sm:text-[9px]">Rate</th>
						</tr>
					</thead>
					<tbody>
						{students.map((s) => (
							<tr key={s.name} className="border-b border-gray-50 hover:bg-gray-50/50">
								<td className="whitespace-nowrap px-2 py-1.5 text-[10px] font-medium text-[#111827] sm:px-3 sm:py-2 sm:text-[11px]">{s.name}</td>
								{days.map((d) => {
									const val = s[d.toLowerCase() as keyof typeof s] as string;
									const isP = val === 'P';
									return (
										<td key={d} className="px-1 py-1.5 text-center sm:px-2 sm:py-2">
											<span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold sm:h-5 sm:w-5 sm:text-[9px] ${isP ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{val}</span>
										</td>
									);
								})}
								<td className="px-2 py-1.5 text-center sm:px-2 sm:py-2">
									<span className={`text-[10px] font-bold tabular-nums sm:text-[11px] ${s.rate >= 85 ? 'text-green-600' : s.rate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{s.rate}%</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="border-t border-gray-100 px-2 py-1 text-center text-[8px] font-medium text-gray-400 sm:px-3 sm:py-1.5 sm:text-[9px]">
				Showing 5 school days · 5 students · Weekends excluded
			</div>
		</div>
	);
}

function SubmitGradeMockup() {
	const students = [
		{ name: 'Alice Johnson', id: 'STU-001', grades: { first: 68, second: 78, third: 85, third_exam: 88 } },
		{ name: 'Bob Mensah', id: 'STU-002', grades: { first: 72, second: 68, third: 75, third_exam: 70 } },
		{ name: 'Clara Owusu', id: 'STU-003', grades: { first: 90, second: 88, third: 92, third_exam: 95 } },
		{ name: 'David Koffi', id: 'STU-004', grades: { first: 65, second: 0, third: 68, third_exam: 0 } },
		{ name: 'Emefa Adjei', id: 'STU-005', grades: { first: 78, second: 75, third: 0, third_exam: 72 } },
	] as const;
	const periods = [
		{ id: 'first', label: '1st Pd', active: true },
		{ id: 'second', label: '2nd Pd', active: true },
		{ id: 'third', label: '3rd Pd', active: true },
		{ id: 'third_exam', label: '3rd Pd Exam', active: false },
	];
	const gradeColor = (v: number) => {
		if (v === 0) return 'text-gray-400';
		return v >= 70 ? 'text-[#465fff]' : 'text-[#ff0000]';
	};

	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
			{/* Filter bar */}
			<div className="flex flex-wrap items-end gap-2 border-b border-gray-100 bg-gray-50/80 p-2 sm:p-3">
				{[
					{ label: 'Year', value: '2025–2026' },
					{ label: 'Session', value: 'Junior' },
					{ label: 'Class', value: 'Grade 7A' },
					{ label: 'Subject', value: 'Mathematics' },
				].map((f) => (
					<div key={f.label} className="flex flex-col gap-0.5">
						<span className="text-[7px] font-semibold uppercase tracking-wider text-gray-400 sm:text-[8px]">{f.label}</span>
						<div className="flex h-5 items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 text-[9px] font-medium text-gray-700 sm:h-6 sm:px-2 sm:text-[10px]">
							{f.value}
							<ChevronDown className="h-2 w-2 text-gray-400 sm:h-2.5 sm:w-2.5" />
						</div>
					</div>
				))}
			</div>
			{/* Period chips */}
			<div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
				<span className="text-[7px] font-semibold uppercase tracking-wider text-gray-400 sm:text-[8px]">Periods</span>
				{periods.map((p) => (
					<div
						key={p.id}
						className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-semibold sm:px-2.5 sm:text-[9px] ${
							p.active
								? 'bg-[#465fff] text-white'
								: 'border border-gray-200 bg-white text-gray-500'
						}`}
					>
						{p.label}
						{p.active && <CheckCircle2 className="h-2 w-2 sm:h-2.5 sm:w-2.5" />}
					</div>
				))}
			</div>
			{/* Grade table */}
			<div className="overflow-x-auto">
				<table className="w-full min-w-[380px]">
					<thead>
						<tr className="border-b border-gray-100 bg-gray-50">
							<th className="px-2 py-1.5 text-left text-[7px] font-semibold uppercase tracking-wider text-gray-500 sm:px-3 sm:text-[8px]">Student</th>
							{periods.filter((p) => p.active).map((p) => (
								<th key={p.id} className="px-1.5 py-1.5 text-center text-[7px] font-semibold uppercase tracking-wider text-gray-500 sm:px-2 sm:text-[8px]">{p.label}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{students.map((s, i) => (
							<tr key={s.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
								<td className="whitespace-nowrap px-2 py-1.5 sm:px-3 sm:py-2">
									<div className="text-[9px] font-medium text-[#111827] sm:text-[10px]">{s.name}</div>
								</td>
								{periods.filter((p) => p.active).map((p) => {
									const val = s.grades[p.id as keyof typeof s.grades];
									return (
										<td key={p.id} className="px-1.5 py-1.5 text-center sm:px-2 sm:py-2">
											<input
												type="text"
												readOnly
												value={val || ''}
												className={`w-10 rounded-md border border-gray-200 bg-white px-1 py-0.5 text-center text-[9px] font-semibold tabular-nums outline-none sm:w-12 sm:text-[10px] ${gradeColor(val)}`}
											/>
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{/* Submit bar */}
			<div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-2 py-1.5 sm:px-3 sm:py-2">
				<div className="flex items-center gap-2">
					<span className="text-[8px] font-semibold text-gray-500 sm:text-[9px]">3 periods selected</span>
					<span className="text-[7px] text-gray-400 sm:text-[8px]">·</span>
					<span className="text-[8px] text-gray-500 sm:text-[9px]">12 new grades</span>
				</div>
				<div className="flex items-center gap-1.5 rounded-full bg-[#465fff] px-2.5 py-1 text-[8px] font-semibold text-white sm:text-[9px]">
					<Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
					Submit
				</div>
			</div>
		</div>
	);
}

export default function SchoolMeshLandingPage() {
	const [isScrolled, setIsScrolled] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [openFaq, setOpenFaq] = useState<number | null>(null);
	const [mobileFaq, setMobileFaq] = useState<number | null>(null);
	const headerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handler = () => setIsScrolled(window.scrollY > 20);
		window.addEventListener('scroll', handler, { passive: true });
		return () => window.removeEventListener('scroll', handler);
	}, []);

	useEffect(() => {
		if (!isMobileMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
				setIsMobileMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isMobileMenuOpen]);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			setIsSubmitting(true);
			window.setTimeout(() => setIsSubmitting(false), 1200);
		},
		[],
	);

	return (
		<div
			className={`${inter.variable} scroll-smooth overflow-x-hidden bg-[#FAFBFC] font-sans text-[#111827] antialiased`}
		>
			{/* ── Navigation ───────────────────────────────────── */}
			<header
				ref={headerRef}
				className={`fixed top-0 z-50 w-full transition-all duration-300 ${
					isScrolled
						? 'border-b border-gray-200/60 bg-white/80 backdrop-blur-xl shadow-sm'
						: 'bg-transparent'
				}`}
			>
				<nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
					<Link href="#home" className="flex items-center gap-2.5" aria-label="SchoolMesh Home">
						<Image
							src="/images/SchoolMesh.png"
							alt="SchoolMesh logo"
							width={40}
							height={40}
							className="h-10 w-10 rounded-lg object-contain"
							priority
						/>
						<span className="text-xl font-bold tracking-tight text-[#111827]">School<span className="text-[#465fff]">Mesh</span></span>
					</Link>

					<div className="hidden items-center gap-8 md:flex">
						{navItems.map((item) => {
							const NavIcon = item.icon;
							return (
								<a
									key={item.href}
									href={item.href}
									className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-[#111827]"
								>
									<NavIcon className="h-3.5 w-3.5 text-gray-400" />
									{item.label}
								</a>
							);
						})}
						<Link
							href="/brochure"
							className="text-sm font-medium text-gray-600 transition-colors hover:text-[#111827]"
						>
							Brochure
						</Link>
					</div>

					<div className="hidden items-center gap-3 md:flex">
						<Link
							href="/superadmin/login"
							className="inline-flex items-center gap-1.5 rounded-full bg-[#111827] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/10"
						>
							<LogIn className="h-3.5 w-3.5" />
							Login
						</Link>
					</div>

					<button
						type="button"
						onClick={() => setIsMobileMenuOpen((o) => !o)}
						className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-700 md:hidden"
						aria-label="Toggle menu"
					>
						{isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</button>
				</nav>

				<AnimatePresence>
				{isMobileMenuOpen && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.25 }}
							className="overflow-hidden border-t border-gray-100 bg-white md:hidden"
						>
							<div className="space-y-1 px-5 py-4">
								{navItems.map((item) => {
									const NavIcon = item.icon;
									return (
										<a
											key={item.href}
											href={item.href}
											onClick={() => setIsMobileMenuOpen(false)}
											className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-[#111827]"
										>
											<NavIcon className="h-4 w-4 text-gray-400" />
											{item.label}
										</a>
									);
								})}
								<Link
									href="/brochure"
									onClick={() => setIsMobileMenuOpen(false)}
									className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-[#111827]"
								>
									Brochure
								</Link>
								<div className="border-t border-gray-100 pt-3 mt-3">
									<Link
										href="/superadmin/login"
										onClick={() => setIsMobileMenuOpen(false)}
										className="flex items-center justify-center gap-1.5 rounded-full bg-[#111827] px-5 py-2.5 text-sm font-medium text-white"
									>
										<LogIn className="h-4 w-4" />
										Login
									</Link>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</header>

			<main id="home">
			{/* ── Hero ──────────────────────────────────────── */}
			<style dangerouslySetInnerHTML={{ __html: `
				@keyframes sm-hero-pulse { 0% { opacity:0.4; r:6; } 50% { opacity:0.1; r:13; } 100% { opacity:0.4; r:6; } }
				@keyframes sm-hero-shimmer { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
				@keyframes sm-hero-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
				@keyframes sm-hero-dash { to { stroke-dashoffset:-24; } }
				.sm-hero-edge { stroke-dasharray:5 4; animation:sm-hero-dash 2s linear infinite; }
				.sm-hero-float-card { animation:sm-hero-float 4s ease-in-out infinite; }
				.sm-hero-float-pill1 { animation:sm-hero-float 3.5s 0.5s ease-in-out infinite; }
				.sm-hero-float-pill2 { animation:sm-hero-float 3.8s 1.2s ease-in-out infinite; }
				.sm-hero-badge-dot { animation:sm-hero-shimmer 2s ease-in-out infinite; }
			`}} />
			<section className="relative overflow-hidden bg-[#FAFBFC] pt-20 pb-5 lg:pt-9 lg:pb-5">
				<div className="mx-auto max-w-7xl px-5 sm:px-8">
					<div className="grid items-center gap-0 lg:grid-cols-2 lg:min-h-[520px]">
						{/* LEFT: Copy */}
						<motion.div
							initial={{ opacity: 0, y: 14 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, ease: 'easeOut' }}
							className="lg:pr-10"
						>
							<div className="mb-5 inline-flex items-center gap-[7px] rounded-full border border-gray-200/60 bg-white px-3 py-[5px] text-xs font-medium text-gray-600">
								<span className="sm-hero-badge-dot h-[6px] w-[6px] shrink-0 rounded-full bg-[#12b76a]" />
								Now available for schools nationwide
							</div>

							<h1 className="mb-3.5 text-3xl font-medium leading-[1.12] tracking-[-0.03em] text-[#111827] sm:text-[46px]">
								School management,<br />
								<span
									className="bg-gradient-to-br from-[#465fff] to-[#12b76a] bg-clip-text text-transparent"
									style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
								>
									finally effortless.
								</span>
							</h1>

							<p className="mb-7 max-w-[340px] text-base leading-[1.65] text-gray-500 sm:text-[20px]">
								Admissions, attendance, grades, finance, and communication — connected
								in one platform your whole school will actually enjoy using.
							</p>

							<div className="mb-8 flex flex-wrap items-center gap-2.5">
								<a
									href="#pricing"
									className="inline-flex items-center gap-1.5 rounded-full bg-[#465fff] px-5 py-2.5 text-[13px] font-medium text-white transition-all hover:opacity-[0.88] hover:-translate-y-px"
								>
									Start free
									<ArrowRight className="h-[13px] w-[13px]" />
								</a>
								<a
									href="#contact"
									className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-transparent px-[18px] py-2.5 text-[13px] font-medium text-[#111827] transition-all hover:bg-gray-50 hover:-translate-y-px"
								>
									<Play className="h-3 w-3" />
									Book a demo
								</a>
								<Link
									href="/brochure"
									className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-transparent px-[18px] py-2.5 text-[13px] font-medium text-[#111827] transition-all hover:bg-gray-50 hover:-translate-y-px"
								>
									<FileDown className="h-3 w-3" />
									Brochure
								</Link>
							</div>

							<div className="flex items-center gap-2.5 text-xs text-gray-400">
								<div className="flex">
									{[
										{ initials: 'JS', bg: '#465fff' },
										{ initials: 'AM', bg: '#12b76a' },
										{ initials: 'KO', bg: '#f79009' },
										{ initials: 'PL', bg: '#8b5cf6' },
										{ initials: 'NW', bg: '#ef4444' },
									].map((av, i) => (
										<div
											key={av.initials}
											className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] border-[#FAFBFC] text-[9px] font-medium text-white"
											style={{ background: av.bg, marginLeft: i === 0 ? 0 : -7 }}
										>
											{av.initials}
										</div>
									))}
								</div>
								<span>
									Trusted by <span className="font-medium text-[#111827]">&nbsp;20+ schools&nbsp;</span> across Liberia
								</span>
							</div>
						</motion.div>

						{/* RIGHT: Illustration + Dashboard */}
						<motion.div
							initial={{ opacity: 0, y: 14 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
							className="relative"
						>
							{/* SVG mesh background */}
							<svg
								viewBox="0 0 340 380"
								className="pointer-events-none absolute -top-5 z-[1] left-0 w-full"
								aria-hidden="true"
							>
								<line className="sm-hero-edge" x1="170" y1="88" x2="80" y2="160" stroke="#374151" strokeWidth="0.8" />
								<line className="sm-hero-edge" x1="170" y1="88" x2="260" y2="155" stroke="#374151" strokeWidth="0.8" style={{ animationDelay: '0.4s' }} />
								<line className="sm-hero-edge" x1="80" y1="160" x2="50" y2="265" stroke="#374151" strokeWidth="0.6" style={{ animationDelay: '0.8s' }} />
								<line className="sm-hero-edge" x1="260" y1="155" x2="295" y2="268" stroke="#374151" strokeWidth="0.6" style={{ animationDelay: '1.2s' }} />
								<line className="sm-hero-edge" x1="80" y1="160" x2="295" y2="268" stroke="#e5e7eb" strokeWidth="0.5" style={{ animationDelay: '1.6s' }} />
								<line className="sm-hero-edge" x1="260" y1="155" x2="50" y2="265" stroke="#e5e7eb" strokeWidth="0.5" style={{ animationDelay: '2.0s' }} />
								<line className="sm-hero-edge" x1="50" y1="265" x2="295" y2="268" stroke="#374151" strokeWidth="0.7" style={{ animationDelay: '0.6s' }} />

								<circle cx="170" cy="88" r="6" fill="#465fff" opacity="0.18" style={{ animation: 'sm-hero-pulse 2.4s ease-in-out infinite' }} />
								<circle cx="80" cy="160" r="6" fill="#8b5cf6" opacity="0.15" style={{ animation: 'sm-hero-pulse 2.8s 0.3s ease-in-out infinite' }} />
								<circle cx="260" cy="155" r="6" fill="#12b76a" opacity="0.15" style={{ animation: 'sm-hero-pulse 3.0s 0.6s ease-in-out infinite' }} />
								<circle cx="50" cy="265" r="6" fill="#f79009" opacity="0.15" style={{ animation: 'sm-hero-pulse 2.6s 0.9s ease-in-out infinite' }} />
								<circle cx="295" cy="268" r="6" fill="#465fff" opacity="0.15" style={{ animation: 'sm-hero-pulse 2.9s 1.1s ease-in-out infinite' }} />

								<circle cx="170" cy="88" r="20" fill="#465fff" opacity="0.10" />
								<circle cx="170" cy="88" r="13" fill="#465fff" />
								<text x="170" y="92" textAnchor="middle" fontSize="10" fontWeight="500" fill="#fff" fontFamily="sans-serif">HUB</text>

								<circle cx="80" cy="160" r="16" fill="#8b5cf6" opacity="0.12" />
								<circle cx="80" cy="160" r="10" fill="#8b5cf6" />
								<text x="80" y="164" textAnchor="middle" fontSize="8" fontWeight="500" fill="#fff" fontFamily="sans-serif">ADM</text>

								<circle cx="260" cy="155" r="16" fill="#12b76a" opacity="0.12" />
								<circle cx="260" cy="155" r="10" fill="#12b76a" />
								<text x="260" y="159" textAnchor="middle" fontSize="8" fontWeight="500" fill="#fff" fontFamily="sans-serif">TCH</text>

								<circle cx="50" cy="265" r="14" fill="#f79009" opacity="0.12" />
								<circle cx="50" cy="265" r="9" fill="#f79009" />
								<text x="50" y="269" textAnchor="middle" fontSize="7" fontWeight="500" fill="#fff" fontFamily="sans-serif">PRN</text>

								<circle cx="295" cy="268" r="14" fill="#465fff" opacity="0.12" />
								<circle cx="295" cy="268" r="9" fill="#465fff" />
								<text x="295" y="272" textAnchor="middle" fontSize="7" fontWeight="500" fill="#fff" fontFamily="sans-serif">STU</text>
							</svg>

							{/* Dashboard card */}
							<div className="sm-hero-float-card relative z-[2] mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.10),0_4px_16px_rgba(0,0,0,0.06)] sm:ml-5">
								<div className="flex items-center gap-2.5 border-b border-gray-200/60 bg-gray-50 px-3.5 py-[11px]">
									<div className="flex gap-[5px]">
										<div className="h-2 w-2 rounded-full bg-[#FF5F57]" />
										<div className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
										<div className="h-2 w-2 rounded-full bg-[#28C840]" />
									</div>
									<div className="flex flex-1 items-center gap-[5px] rounded-[5px] border border-gray-200/60 bg-gray-100 px-2.5 py-1 text-[10px] text-gray-400">
										<Lock className="h-[10px] w-[10px] text-[#12b76a]" />
										app.schoolmesh.io
									</div>
								</div>

								<div className="grid" style={{ gridTemplateColumns: '150px 1fr' }}>
									<div className="bg-[#111827] py-3">
										<div className="mb-2 flex items-center gap-[7px] border-b border-white/[0.08] px-3 pb-3">
											<Image
												src="/images/SchoolMesh.png"
												alt="SchoolMesh"
												width={18}
												height={18}
												className="h-[18px] w-[18px] rounded bg-[#465fff] object-contain p-[2px]"
											/>
											<span className="text-[11px] font-bold tracking-[-0.02em] text-white">School<span className="text-[#465fff]">Mesh</span></span>
										</div>
										{[
											{ label: 'Dashboard', icon: LayoutDashboard, active: true },
											{ label: 'Students', icon: Users },
											{ label: 'Grading', icon: ClipboardList },
											{ label: 'Attendance', icon: CalendarDays },
											{ label: 'Analytics', icon: BarChart3 },
											{ label: 'Settings', icon: Settings },
										].map((item) => (
											<div
												key={item.label}
												className={`flex items-center gap-[7px] px-3 py-[5px] text-[10px] ${
													item.active
														? 'bg-[#465fff]/30 text-white'
														: 'text-white/45'
												}`}
												style={item.active ? { borderLeft: '2px solid #465fff' } : undefined}
											>
												<item.icon className="h-[11px] w-[11px] opacity-80" />
												{item.label}
											</div>
										))}
									</div>

									<div className="bg-white p-3">
										<div className="relative mb-2.5 overflow-hidden rounded-[10px] border border-gray-200/60 bg-gray-100 p-3">
											<div className="absolute -top-5 -right-5 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.2)_0%,transparent_70%)]" />
											<div className="relative z-10">
												<div className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-purple-300/40 bg-purple-500/10 px-[7px] py-[2px] text-[9px] font-medium text-purple-700">
													<ShieldCheck className="h-[9px] w-[9px]" />
													System admin
												</div>
												<div className="text-[13px] font-medium text-[#111827]">Good morning, Admin ✨</div>
												<div className="text-[10px] text-gray-400">Full access · Academic year 2025–2026</div>
												<div className="relative mt-2.5 overflow-visible">
													<div className="h-[3px] rounded-[2px] bg-gray-200">
														<div className="h-full rounded-[2px] bg-purple-500 opacity-40" style={{ width: '38%' }} />
													</div>
													<div
														className="absolute top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500"
														style={{ left: '38%', border: '1.5px solid #f3f4f6' }}
													/>
												</div>
											</div>
										</div>

										<div className="mb-2 flex gap-[3px] rounded-[7px] border border-gray-200/60 bg-gray-50 p-[2px]">
											{['Insights', 'Performance', 'Enrollment'].map((tab, i) => (
												<div
													key={tab}
													className={`flex-1 rounded-[5px] py-1 text-center text-[10px] font-medium ${
														i === 0 ? 'border border-gray-200/60 bg-gray-100 text-[#465fff]' : 'text-gray-400'
													}`}
												>
													{tab}
												</div>
											))}
										</div>

										<div className="grid grid-cols-2 gap-1.5">
											{[
												{ label: 'Students', value: '2,847', color: '#465fff' },
												{ label: 'Teachers', value: '186', color: '#12b76a' },
												{ label: 'Avg grade', value: '78.4', color: '#f79009' },
												{ label: 'Pass rate', value: '86%', color: '#111827' },
											].map((stat) => (
												<div key={stat.label} className="rounded-[7px] border border-gray-200/60 bg-gray-100 p-2">
													<div className="text-[9px] text-gray-400">{stat.label}</div>
													<div className="text-base font-medium leading-none" style={{ color: stat.color }}>{stat.value}</div>
												</div>
											))}
										</div>
									</div>
								</div>
							</div>

							{/* Floating pills */}
							<div className="sm-hero-float-pill1 absolute -bottom-3 left-2 z-[3] flex items-center gap-2 rounded-[10px] border border-gray-200/60 bg-gray-100 px-3 py-2 text-[11px] shadow-[0_8px_24px_rgba(0,0,0,0.10)] sm:-left-6 sm:left-auto">
								<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(16,185,129,0.1)]">
									<CheckCircle2 className="h-3.5 w-3.5 text-[#12b76a]" />
								</div>
								<div>
									<div className="font-medium text-[#111827]">Report cards sent</div>
									<div className="text-[10px] text-gray-400">842 students · 2 min ago</div>
								</div>
							</div>

							<div className="sm-hero-float-pill2 absolute right-2 top-5 z-[3] flex items-center gap-2 rounded-[10px] border border-gray-200/60 bg-gray-100 px-3 py-2 text-[11px] shadow-[0_8px_24px_rgba(0,0,0,0.10)] sm:-right-5">
								<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(70,95,255,0.1)]">
									<CloudOff className="h-3.5 w-3.5 text-[#465fff]" />
								</div>
								<div>
									<div className="font-medium text-[#111827]">Offline sync complete</div>
									<div className="text-[10px] text-gray-400">Just now</div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

				{/* ── About SchoolMesh ───────────────────────────── */}
				<section id="about" className="bg-white py-20 sm:py-28">
					<div className="mx-auto max-w-7xl px-5 sm:px-8">
						<div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
							<AnimateWhenVisible>
								<div>
									<p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#465fff]">
										About SchoolMesh
									</p>
									<h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl lg:text-5xl">
										Built by educators, for educators.
									</h2>
									<p className="mt-4 text-lg leading-relaxed text-gray-500">
										School<span className="text-[#465fff]">Mesh</span> was born from a simple frustration: we were spending more
										time wrestling with disconnected software than focusing on our students. We
										built a platform that puts security, convenience, and user experience first — so
										that you can get back to what matters.
									</p>
									<p className="mt-4 text-base leading-relaxed text-gray-500">
										Every workflow in School<span className="text-[#465fff]">Mesh</span> is shaped by real classroom feedback from teachers,
										students, and school owners across Liberia. The result is a tool that feels
										familiar from day one — not something your staff needs weeks of training to use.
									</p>
									<div className="mt-8 grid grid-cols-2 gap-4">
										{[
											{ value: '99.9%', label: 'Uptime SLA', icon: ShieldCheck },
											{ value: '< 2s', label: 'Page loads', icon: Sparkles },
											{ value: '100%', label: 'Offline-ready', icon: CloudOff },
											{ value: '24/7', label: 'Support', icon: MessageSquare },
										].map((item) => (
											<div key={item.label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
												<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#465fff]/10 text-[#465fff]">
													<item.icon className="h-4 w-4" />
												</div>
												<div>
													<p className="text-lg font-bold text-[#111827]">{item.value}</p>
													<p className="text-xs text-gray-500">{item.label}</p>
												</div>
											</div>
										))}
									</div>
								</div>
							</AnimateWhenVisible>

							<AnimateWhenVisible custom={1}>
								<div className="relative">
									<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-900/5 sm:p-8">
										<div className="space-y-5">
											<div className="flex items-start gap-4">
												<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#465fff]/10 text-[#465fff]">
													<GraduationCap className="h-5 w-5" />
												</div>
												<div>
													<h4 className="text-sm font-bold text-[#111827]">Our Mission</h4>
													<p className="mt-1 text-sm leading-relaxed text-gray-500">
														Empower every school with a single, effortless platform — built by
														people who understand the classroom, not just the codebase.
													</p>
												</div>
											</div>
											<div className="flex items-start gap-4">
												<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#12b76a]/10 text-[#12b76a]">
													<Database className="h-5 w-5" />
												</div>
												<div>
													<h4 className="text-sm font-bold text-[#111827]">Security First</h4>
													<p className="mt-1 text-sm leading-relaxed text-gray-500">
														Fully encrypted, GDPR-aligned, with complete data isolation per
														school. Your students&apos; data stays safe and yours alone.
													</p>
												</div>
											</div>
											<div className="flex items-start gap-4">
												<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f79009]/10 text-[#f79009]">
													<CloudOff className="h-5 w-5" />
												</div>
												<div>
													<h4 className="text-sm font-bold text-[#111827]">Built for Real Conditions</h4>
													<p className="mt-1 text-sm leading-relaxed text-gray-500">
														Designed for Liberian internet conditions. Full offline support
														with automatic sync — because connectivity shouldn&apos;t block learning.
													</p>
												</div>
											</div>
											<div className="flex items-start gap-4">
												<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8b5cf6]/10 text-[#8b5cf6]">
													<Users className="h-5 w-5" />
												</div>
												<div>
													<h4 className="text-sm font-bold text-[#111827]">Designed for People</h4>
													<p className="mt-1 text-sm leading-relaxed text-gray-500">
														Clean interfaces, minimal clicks, zero jargon. We obsess over
														convenience so your team stays focused on education.
													</p>
												</div>
											</div>
										</div>
									</div>
								</div>
							</AnimateWhenVisible>
						</div>
					</div>
				</section>

				{/* ── Team ──────────────────────────────────────── */}
				<section id="team" className="py-20 sm:py-28">
					<div className="mx-auto max-w-7xl px-5 sm:px-8">
						<AnimateWhenVisible className="text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#465fff]">
								Our Team
							</p>
							<h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl lg:text-5xl">
								The people behind School<span className="text-[#465fff]">Mesh</span>.
							</h2>
							<p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
								A small, dedicated team of educators and engineers building the
								tools schools actually need.
							</p>
						</AnimateWhenVisible>

						<motion.div
							className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
							variants={stagger}
							initial="hidden"
							whileInView="visible"
							viewport={{ once: true, amount: 0.1 }}
						>
							{teamMembers.map((member) => (
								<motion.div
									key={member.name}
									variants={fadeUp}
									whileHover={{ y: -4, transition: { duration: 0.2 } }}
									className="group rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-lg hover:shadow-gray-900/5"
								>
									<div
										className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow-md"
										style={{ background: member.color }}
									>
										{member.initials}
									</div>
									<h3 className="text-base font-bold text-[#111827]">
										{member.name}
									</h3>
									<p
										className="mt-1 text-xs font-semibold uppercase tracking-wider"
										style={{ color: member.color }}
									>
										{member.role}
									</p>
									<p className="mt-3 text-sm leading-relaxed text-gray-500">
										{member.bio}
									</p>
									<div className="mt-4 flex justify-center gap-2">
										{member.links.map((link) => (
											<a
												key={link.label}
												href={link.href}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[10px] font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-[#111827]"
											>
												{link.icon === 'mail' && <Mail className="h-3 w-3" />}
												{link.icon === 'globe' && <Globe className="h-3 w-3" />}
												{link.icon === 'linkedin' && (
													<span className="text-[10px] font-bold">in</span>
												)}
												{link.icon === 'twitter' && (
													<span className="text-[10px] font-bold">X</span>
												)}
												{link.label}
											</a>
										))}
									</div>
								</motion.div>
							))}
						</motion.div>
					</div>
				</section>

				{/* ── Trust Section ──────────────────────────────── */}
				<section className="border-y border-gray-100 bg-white py-14">
					<div className="mx-auto max-w-7xl px-5 sm:px-8">
						<AnimateWhenVisible>
							<p className="text-center text-sm font-medium text-gray-400 uppercase tracking-widest">
								Trusted by schools across the region
							</p>
						</AnimateWhenVisible>
						<AnimateWhenVisible custom={1}>
							<div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
								{['Upstairs Christian Academy', 'Buchanan Scholars', 'Paynesville STEM', 'Kakata Future Leaders', 'Harper Academy'].map(
									(name) => (
										<div key={name} className="flex items-center gap-2 text-gray-300">
											<div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
												<GraduationCap className="h-4 w-4 text-gray-400" />
											</div>
											<span className="text-sm font-semibold text-gray-400 whitespace-nowrap">{name}</span>
										</div>
									),
								)}
							</div>
						</AnimateWhenVisible>
					</div>
				</section>

				{/* ── Features ────────────────────────────────────── */}
				<section id="features" className="py-20 sm:py-28">
					<div className="mx-auto max-w-7xl px-5 sm:px-8">
						<AnimateWhenVisible className="text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#465fff]">
								Features
							</p>
							<h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl lg:text-5xl">
								Everything your school needs.
							</h2>
							<p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
								Purpose-built modules that cover every aspect of school management, from
								admissions to analytics.
							</p>
						</AnimateWhenVisible>

						<motion.div
							className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
							variants={stagger}
							initial="hidden"
							whileInView="visible"
							viewport={{ once: true, amount: 0.1 }}
						>
							{features.map((feature) => {
								const Icon = feature.icon;
								return (
									<motion.div
										key={feature.title}
										variants={fadeUp}
										whileHover={{ y: -4, transition: { duration: 0.2 } }}
										className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg hover:shadow-gray-900/5"
									>
										<div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors" style={{ backgroundColor: `${feature.color}15`, color: feature.color }}>
											<Icon className="h-5 w-5" />
										</div>
										<h3 className="text-lg font-semibold text-[#111827]">{feature.title}</h3>
										<p className="mt-2 text-sm leading-relaxed text-gray-500">{feature.description}</p>
									</motion.div>
								);
							})}
						</motion.div>
					</div>
				</section>

				{/* ── Product Showcase ────────────────────────────── */}
				<section id="solutions" className="bg-white py-20 sm:py-28">
					<div className="mx-auto max-w-7xl px-5 sm:px-8">
						<AnimateWhenVisible className="text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#465fff]">
								Solutions
							</p>
							<h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl lg:text-5xl">
								Built around real workflows.
							</h2>
							<p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
								Every feature is designed around how schools actually operate — not how
								software expects them to.
							</p>
						</AnimateWhenVisible>

						<div className="mt-16 space-y-24">
							{showcaseItems.map((item, index) => (
								<div
									key={item.title}
									className={`grid items-center gap-12 lg:grid-cols-2 lg:gap-16 ${
										index % 2 === 1 ? 'lg:[direction:rtl]' : ''
									}`}
								>
									<AnimateWhenVisible className="lg:[direction:ltr]">
										<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg shadow-gray-900/5 sm:p-6">
											{item.type === 'dashboard' && <DashboardMockup />}
											{item.type === 'attendance' && <AttendanceMockup />}
											{item.type === 'reportcard' && <SubmitGradeMockup />}
										</div>
									</AnimateWhenVisible>
									<AnimateWhenVisible custom={1} className="lg:[direction:ltr]">
										<div>
											<p
												className="mb-3 text-sm font-semibold uppercase tracking-widest"
												style={{ color: item.color }}
											>
												{item.tag}
											</p>
											<h3 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
												{item.title}
											</h3>
											<p className="mt-4 text-lg leading-relaxed text-gray-500">
												{item.description}
											</p>
											<ul className="mt-6 space-y-3">
												{item.features.map((f) => (
													<li key={f} className="flex items-center gap-3 text-gray-600">
														<CheckCircle2
															className="h-5 w-5 shrink-0"
															style={{ color: item.color }}
														/>
														<span className="text-sm font-medium">{f}</span>
													</li>
												))}
											</ul>
										</div>
									</AnimateWhenVisible>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* ── Why SchoolMesh ────────────────────────────── */}
				<section className="bg-white py-20 sm:py-28">
					<div className="mx-auto max-w-7xl px-5 sm:px-8">
						<AnimateWhenVisible className="text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#465fff]">
								Why SchoolMesh
							</p>
							<h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl lg:text-5xl">
								Purpose-built for modern schools.
							</h2>
							<p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
								School<span className="text-[#465fff]">Mesh</span> goes beyond basic management with features designed to protect
								integrity, strengthen family connections, and keep your school running
								from anywhere.
							</p>
						</AnimateWhenVisible>

						<div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
							{/* Digital Report Sharing */}
							<AnimateWhenVisible custom={0}>
								<div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg hover:shadow-gray-900/5">
									<div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#465fff]/5 blur-3xl transition-colors group-hover:bg-[#465fff]/10" />
									<div className="relative z-10">
										<div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#465fff]/10 text-[#465fff]">
											<Share2 className="h-7 w-7" />
										</div>
										<h3 className="text-lg font-bold text-[#111827]">Digital Report Sharing</h3>
										<p className="mt-3 text-sm text-gray-500 leading-relaxed">
											Students share reports digitally with parents or sponsors — instantly,
											from any device, anywhere in the world. No printing required.
										</p>
										<ul className="mt-5 space-y-2">
											{[
												'One-click share via link or direct transfer',
												'Parents receive reports on their phone',
												'Works across schools and academic years',
											].map((f) => (
												<li key={f} className="flex items-start gap-2 text-sm text-gray-600">
													<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#465fff]" />
													{f}
												</li>
											))}
										</ul>
									</div>
								</div>
							</AnimateWhenVisible>

							{/* QR Code Verification */}
							<AnimateWhenVisible custom={1}>
								<div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg hover:shadow-gray-900/5">
									<div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#12b76a]/5 blur-3xl transition-colors group-hover:bg-[#12b76a]/10" />
									<div className="relative z-10">
										<div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#12b76a]/10 text-[#12b76a]">
											<QrCode className="h-7 w-7" />
										</div>
										<h3 className="text-lg font-bold text-[#111827]">QR Code Security</h3>
										<p className="mt-3 text-sm text-gray-500 leading-relaxed">
											Every report includes a unique QR code anyone can scan to verify
											its authenticity — protecting against forgery and giving institutions
											complete confidence.
										</p>
										<ul className="mt-5 space-y-2">
											{[
												'Unique QR on every generated report',
												'Scan to verify document authenticity',
												'Trusted by institutions worldwide',
											].map((f) => (
												<li key={f} className="flex items-start gap-2 text-sm text-gray-600">
													<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#12b76a]" />
													{f}
												</li>
											))}
										</ul>
									</div>
								</div>
							</AnimateWhenVisible>

							{/* Offline Mode */}
							<AnimateWhenVisible custom={2}>
								<div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg hover:shadow-gray-900/5">
									<div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#f79009]/5 blur-3xl transition-colors group-hover:bg-[#f79009]/10" />
									<div className="relative z-10">
										<div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f79009]/10 text-[#f79009]">
											<CloudOff className="h-7 w-7" />
										</div>
										<h3 className="text-lg font-bold text-[#111827]">Works Offline</h3>
										<p className="mt-3 text-sm text-gray-500 leading-relaxed">
											No internet? No problem. Teachers and admins keep working offline,
											and everything syncs automatically when connectivity returns.
										</p>
										<ul className="mt-5 space-y-2">
											{[
												'Full functionality without internet',
												'Automatic sync when back online',
												'Perfect for rural and low-connectivity areas',
											].map((f) => (
												<li key={f} className="flex items-start gap-2 text-sm text-gray-600">
													<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#f79009]" />
													{f}
												</li>
											))}
										</ul>
									</div>
								</div>
							</AnimateWhenVisible>

							{/* Mobile & Desktop Apps */}
							<AnimateWhenVisible custom={3}>
								<div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg hover:shadow-gray-900/5">
									<div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#8b5cf6]/5 blur-3xl transition-colors group-hover:bg-[#8b5cf6]/10" />
									<div className="relative z-10">
										<div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8b5cf6]/10 text-[#8b5cf6]">
											<Globe className="h-7 w-7" />
										</div>
										<h3 className="text-lg font-bold text-[#111827]">Every Device, One Platform</h3>
										<p className="mt-3 text-sm text-gray-500 leading-relaxed">
											Access School<span className="text-[#465fff]">Mesh</span> from any web browser, or use our dedicated mobile
											and desktop apps for the best experience on every device.
										</p>
										<ul className="mt-5 space-y-2">
											{[
												'Web, iOS, Android, Windows & macOS',
												'Native apps with push notifications',
												'Same data across all devices',
											].map((f) => (
												<li key={f} className="flex items-start gap-2 text-sm text-gray-600">
													<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8b5cf6]" />
													{f}
												</li>
											))}
										</ul>
									</div>
								</div>
							</AnimateWhenVisible>

							{/* AI-Powered Insights */}
							<AnimateWhenVisible custom={4}>
								<div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg hover:shadow-gray-900/5">
									<div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#ec4899]/5 blur-3xl transition-colors group-hover:bg-[#ec4899]/10" />
									<div className="relative z-10">
										<div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ec4899]/10 text-[#ec4899]">
											<Sparkles className="h-7 w-7" />
										</div>
										<h3 className="text-lg font-bold text-[#111827]">AI-Powered Insights</h3>
										<p className="mt-3 text-sm text-gray-500 leading-relaxed">
											Intelligent automation for grading suggestions, schedule optimization,
											and predictive analytics that help schools make data-driven decisions.
										</p>
										<ul className="mt-5 space-y-2">
											{[
												'Grading suggestions & pattern detection',
												'Schedule optimization',
												'Predictive student outcome analytics',
											].map((f) => (
												<li key={f} className="flex items-start gap-2 text-sm text-gray-600">
													<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ec4899]" />
													{f}
												</li>
											))}
										</ul>
									</div>
								</div>
							</AnimateWhenVisible>

							{/* Multi-Tenant */}
							<AnimateWhenVisible custom={5}>
								<div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg hover:shadow-gray-900/5">
									<div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#10B981]/5 blur-3xl transition-colors group-hover:bg-[#10B981]/10" />
									<div className="relative z-10">
										<div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10B981]/10 text-[#10B981]">
											<Database className="h-7 w-7" />
										</div>
										<h3 className="text-lg font-bold text-[#111827]">Multi-Tenant Architecture</h3>
										<p className="mt-3 text-sm text-gray-500 leading-relaxed">
											Each school gets its own branded environment with independent data,
											users, and settings — all powered by one shared platform.
										</p>
										<ul className="mt-5 space-y-2">
											{[
												'Custom branding & domain per school',
												'Complete data isolation & privacy',
												'Scalable from one school to hundreds',
											].map((f) => (
												<li key={f} className="flex items-start gap-2 text-sm text-gray-600">
													<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
													{f}
												</li>
											))}
										</ul>
									</div>
								</div>
							</AnimateWhenVisible>
						</div>
					</div>
				</section>

				{/* ── Statistics ──────────────────────────────────── */}
				<section className="relative overflow-hidden bg-[#111827] py-20 sm:py-28">
					<div className="absolute inset-0">
						<div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-[#465fff]/10 blur-3xl" />
						<div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-[#10B981]/10 blur-3xl" />
					</div>
					<div className="relative mx-auto max-w-7xl px-5 sm:px-8">
						<AnimateWhenVisible className="text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#465fff]">
								By the Numbers
							</p>
							<h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
								Growing every day.
							</h2>
						</AnimateWhenVisible>
						<motion.div
							className="mt-14 grid grid-cols-2 gap-6 lg:grid-cols-4"
							variants={stagger}
							initial="hidden"
							whileInView="visible"
							viewport={{ once: true, amount: 0.2 }}
						>
							{stats.map((stat) => (
								<motion.div
									key={stat.label}
									variants={fadeUp}
									className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm"
								>
									<p
										className="text-4xl font-bold sm:text-5xl"
										style={{ color: stat.color }}
									>
										<AnimatedCounter target={stat.value} suffix={stat.suffix} />
									</p>
									<p className="mt-2 text-sm font-medium text-gray-400">{stat.label}</p>
								</motion.div>
							))}
						</motion.div>
					</div>
				</section>

				{/* ── Testimonials ────────────────────────────────── */}
				<section className="py-20 sm:py-28">
					<div className="mx-auto max-w-7xl px-5 sm:px-8">
						<AnimateWhenVisible className="text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#465fff]">
								Testimonials
							</p>
							<h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl lg:text-5xl">
								Loved by educators.
							</h2>
							<p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
								Hear from the schools that have transformed their operations with School<span className="text-[#465fff]">Mesh</span>.
							</p>
						</AnimateWhenVisible>

						<motion.div
							className="mt-14 grid gap-6 md:grid-cols-3"
							variants={stagger}
							initial="hidden"
							whileInView="visible"
							viewport={{ once: true, amount: 0.1 }}
						>
							{testimonials.map((t) => (
								<motion.div
									key={t.name}
									variants={fadeUp}
									whileHover={{ y: -4, transition: { duration: 0.2 } }}
									className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg hover:shadow-gray-900/5"
								>
									<div className="mb-4 flex gap-1">
										{[1, 2, 3, 4, 5].map((s) => (
											<Star
												key={s}
												className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]"
											/>
										))}
									</div>
									<p className="text-sm leading-relaxed text-gray-600">
										&quot;{t.quote}&quot;
									</p>
									<div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-4">
										<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#465fff] to-[#10B981] text-xs font-bold text-white">
											{t.avatar}
										</div>
										<div>
											<p className="text-sm font-semibold text-[#111827]">{t.name}</p>
											<p className="text-xs text-gray-500">
												{t.role}, {t.school}
											</p>
										</div>
									</div>
								</motion.div>
							))}
						</motion.div>
					</div>
				</section>

				{/* ── Pricing ────────────────────────────────────── */}
				<section id="pricing" className="bg-white py-20 sm:py-28">
					<div className="mx-auto max-w-7xl px-5 sm:px-8">
						<AnimateWhenVisible className="text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#465fff]">
								Pricing
							</p>
							<h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl lg:text-5xl">
								Simple, transparent, and affordable pricing.
							</h2>
							<p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
								Two simple plans with per-student annual pricing, plus a custom option for schools and networks that prefer a fixed annual fee.
							</p>
						</AnimateWhenVisible>

						<motion.div
							className="mt-14 grid max-w-5xl mx-auto gap-6 sm:grid-cols-2 lg:grid-cols-3"
							variants={stagger}
							initial="hidden"
							whileInView="visible"
							viewport={{ once: true, amount: 0.1 }}
						>
							{pricingPlans.map((plan) => (
								<motion.div
									key={plan.name}
									variants={fadeUp}
									whileHover={{ y: -6, transition: { duration: 0.2 } }}
									className={`relative rounded-2xl border p-7 transition-shadow ${
										plan.custom
											? 'border-dashed border-[#465fff]/30 bg-[#465fff]/[0.02] hover:shadow-lg hover:shadow-gray-900/5'
											: plan.highlight
												? 'border-[#465fff] bg-[#465fff]/[0.02] shadow-lg shadow-[#465fff]/10'
												: 'border-gray-100 bg-white shadow-sm hover:shadow-lg hover:shadow-gray-900/5'
									}`}
								>
									{plan.highlight && (
										<div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#465fff] px-4 py-1 text-xs font-semibold text-white">
											Most Popular
										</div>
									)}
									{plan.custom && (
										<div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#465fff]/10 px-4 py-1 text-xs font-bold text-[#465fff]">
											CUSTOM
										</div>
									)}
									<div>
										<h3 className="text-xl font-bold text-[#111827]">{plan.name}</h3>
										<p className="mt-1 text-sm text-gray-500">{plan.description}</p>
									</div>
									<div className="mt-6">
										<p className={`text-3xl font-bold ${plan.custom ? 'text-[#465fff]' : 'text-[#111827]'}`}>{plan.price}</p>
										<p className="mt-1 text-sm text-gray-500">{plan.period}</p>
									</div>
									<ul className="mt-6 space-y-3">
										{plan.features.map((f) => (
											<li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
												<CheckCircle2 className={`h-4 w-4 shrink-0 ${plan.custom ? 'text-[#465fff]' : 'text-[#10B981]'}`} />
												{f}
											</li>
										))}
									</ul>
									<a
										href="#contact"
										className={`mt-8 block w-full rounded-full py-3 text-center text-sm font-semibold transition-all ${
											plan.highlight
												? 'bg-[#465fff] text-white shadow-md shadow-[#465fff]/20 hover:bg-[#3a4fe6] hover:shadow-lg'
												: plan.custom
													? 'border border-[#465fff]/30 text-[#465fff] hover:border-[#465fff]/50 hover:bg-[#465fff]/5'
													: 'border border-gray-200 text-[#111827] hover:border-gray-300 hover:bg-gray-50'
										}`}
									>
										{plan.cta}
									</a>
								</motion.div>
							))}
						</motion.div>

						<p className="mt-8 text-center text-sm text-gray-400">Start free · No credit card required</p>
					</div>
				</section>

				{/* ── FAQ ──────────────────────────────────────────── */}
				<section className="py-20 sm:py-28">
					<div className="mx-auto max-w-3xl px-5 sm:px-8">
						<AnimateWhenVisible className="text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#465fff]">
								FAQ
							</p>
							<h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
								Frequently asked questions.
							</h2>
						</AnimateWhenVisible>

						<div className="mt-12 space-y-3">
							{faqs.map((faq, index) => (
								<AnimateWhenVisible key={faq.question} custom={index}>
									<div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
										<button
											type="button"
											onClick={() => setOpenFaq(openFaq === index ? null : index)}
											className="flex w-full items-center justify-between px-6 py-4 text-left"
											aria-expanded={openFaq === index}
										>
											<span className="text-sm font-semibold text-[#111827] pr-4">
												{faq.question}
											</span>
											<motion.div
												animate={{ rotate: openFaq === index ? 180 : 0 }}
												transition={{ duration: 0.2 }}
												className="shrink-0"
											>
												<ChevronDown className="h-4 w-4 text-gray-400" />
											</motion.div>
										</button>
										<AnimatePresence>
											{openFaq === index && (
												<motion.div
													initial={{ height: 0, opacity: 0 }}
													animate={{ height: 'auto', opacity: 1 }}
													exit={{ height: 0, opacity: 0 }}
													transition={{ duration: 0.25, ease: 'easeInOut' }}
												>
													<div className="px-6 pb-5 text-sm leading-relaxed text-gray-500">
														{faq.answer}
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								</AnimateWhenVisible>
							))}
						</div>
					</div>
				</section>

				{/* ── Final CTA ───────────────────────────────────── */}
				<section className="bg-white py-20 sm:py-28">
					<div className="mx-auto max-w-7xl px-5 sm:px-8">
						<AnimateWhenVisible>
							<div className="relative overflow-hidden rounded-3xl bg-[#111827] px-8 py-16 text-center sm:px-16 sm:py-20">
								<div className="absolute inset-0">
									<div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-[#465fff]/20 blur-3xl" />
									<div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-[#10B981]/20 blur-3xl" />
								</div>
								<div className="relative">
									<h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
										Ready to modernize your school?
									</h2>
									<p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
										Join hundreds of schools already using School<span className="text-[#465fff]">Mesh</span> to streamline
										their operations and focus on what matters most — education.
									</p>
									<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
										<a
											href="#pricing"
											className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[#111827] shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
										>
											Start Free
											<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
										</a>
										<a
											href="#contact"
											className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5"
										>
											Request Demo
										</a>
									</div>
								</div>
							</div>
						</AnimateWhenVisible>
					</div>
				</section>

				{/* ── Contact ─────────────────────────────────────── */}
				<section id="contact" className="py-20 sm:py-28">
					<div className="mx-auto max-w-7xl px-5 sm:px-8">
						<div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
							<AnimateWhenVisible>
								<div>
									<p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#465fff]">
										Contact
									</p>
									<h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
										Get in touch with our team.
									</h2>
									<p className="mt-4 text-lg text-gray-500">
										Have questions about School<span className="text-[#465fff]">Mesh</span>? Planning a rollout for your school or
										network? We&apos;re here to help with onboarding, migration, and setup.
									</p>
									<div className="mt-8 space-y-5">
										<div className="flex items-center gap-4">
											<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#465fff]/10 text-[#465fff]">
												<Mail className="h-5 w-5" />
											</div>
											<div>
												<p className="text-sm font-semibold text-[#111827]">Email</p>
												<p className="text-sm text-gray-500">info@schoolmesh.net / amossenkao@gmail.com</p>
											</div>
										</div>
										<div className="flex items-center gap-4">
											<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#12b76a]/10 text-[#12b76a]">
												<Phone className="h-5 w-5" />
											</div>
											<div>
												<p className="text-sm font-semibold text-[#111827]">Phone</p>
												<p className="text-sm text-gray-500">+231 776949463 / +231 887956586</p>
											</div>
										</div>
										<div className="flex items-center gap-4">
											<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8b5cf6]/10 text-[#8b5cf6]">
												<Globe className="h-5 w-5" />
											</div>
											<div>
												<p className="text-sm font-semibold text-[#111827]">Website</p>
												<p className="text-sm text-gray-500">www.schoolmesh.net</p>
											</div>
										</div>
										<div className="flex items-center gap-4">
											<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f79009]/10 text-[#f79009]">
												<Globe className="h-5 w-5" />
											</div>
											<div>
												<p className="text-sm font-semibold text-[#111827]">Location</p>
												<p className="text-sm text-gray-500">Unity Town, Lower Johnsonville, Montserrado County Liberia</p>
											</div>
										</div>
									</div>
								</div>
							</AnimateWhenVisible>

							<AnimateWhenVisible custom={1}>
								<form
									onSubmit={handleSubmit}
									className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
								>
									<h3 className="text-lg font-bold text-[#111827]">Send us a message</h3>
									<p className="mt-1 text-sm text-gray-500">
										We&apos;ll get back to you within 24 hours.
									</p>
									<div className="mt-6 space-y-4">
										<div>
											<label htmlFor="contact-name" className="text-sm font-medium text-[#111827]">
												Full Name
											</label>
											<input
												id="contact-name"
												type="text"
												required
												placeholder="Jane Doe"
												className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10"
											/>
										</div>
										<div className="grid gap-4 sm:grid-cols-2">
											<div>
												<label htmlFor="contact-email" className="text-sm font-medium text-[#111827]">
													Email
												</label>
												<input
													id="contact-email"
													type="email"
													required
													placeholder="you@school.edu"
													className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10"
												/>
											</div>
											<div>
												<label htmlFor="contact-org" className="text-sm font-medium text-[#111827]">
													School / Organization
												</label>
												<input
													id="contact-org"
													type="text"
													required
													placeholder="School Name"
													className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10"
												/>
											</div>
										</div>
										<div>
											<label htmlFor="contact-message" className="text-sm font-medium text-[#111827]">
												Message
											</label>
											<textarea
												id="contact-message"
												required
												rows={4}
												placeholder="Tell us about your school and what you need."
												className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10"
											/>
										</div>
									</div>
									<button
										type="submit"
										className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#465fff] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#465fff]/20 transition-all hover:bg-[#1D4ED8] hover:shadow-lg disabled:opacity-60"
										disabled={isSubmitting}
									>
										{isSubmitting ? 'Sending...' : 'Send Message'}
									</button>
								</form>
							</AnimateWhenVisible>
						</div>
					</div>
				</section>
			</main>

			{/* ── Footer ───────────────────────────────────────── */}
			<footer className="border-t border-gray-100 bg-[#111827]">
				<div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
					<div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
						<div className="lg:col-span-2">
							<div className="flex items-center gap-2.5">
								<Image
									src="/images/SchoolMesh.png"
									alt="SchoolMesh logo"
									width={40}
									height={40}
									className="h-10 w-10 rounded-lg object-contain"
								/>
								<span className="text-xl font-bold tracking-tight text-white">School<span className="text-[#465fff]">Mesh</span></span>
							</div>
							<p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-400">
								The connected operating system for modern schools. Manage everything
								from admissions to analytics.
							</p>
							<div className="mt-6 flex gap-3">
								{['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
									<a
										key={social}
										href="#"
										aria-label={social}
										className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
									>
										<div className="h-4 w-4 rounded bg-current" />
									</a>
								))}
							</div>
						</div>
						{Object.entries(footerLinks).map(([category, links]) => (
							<div key={category}>
								<p className="text-sm font-semibold text-white">{category}</p>
								<ul className="mt-4 space-y-2.5">
									{links.map((link) => (
										<li key={link.label}>
											<a
												href={link.href}
												className="text-sm text-gray-400 transition-colors hover:text-white"
											>
												{link.label}
											</a>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>
				<div className="border-t border-white/10">
					<div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 sm:flex-row sm:px-8">
						<p className="text-xs text-gray-500">
							&copy; {new Date().getFullYear()} School<span className="text-[#465fff]">Mesh</span>. All rights reserved.
						</p>
						<p className="text-xs text-gray-500">
							Connecting people, processes, and information.
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
