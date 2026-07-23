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
	BookOpen,
	CalendarDays,
	CloudOff,
	ChevronDown,
	CheckCircle2,
	ClipboardList,
	CircleDollarSign,
	Database,
	FileText,
	Globe,
	GraduationCap,
	LayoutDashboard,
	LogOut,
	Mail,
	Menu,
	MessageSquare,
	Phone,
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
	{ label: 'Features', href: '#features' },
	{ label: 'Solutions', href: '#solutions' },
	{ label: 'Pricing', href: '#pricing' },
	{ label: 'About', href: '#about' },
	{ label: 'Contact', href: '#contact' },
];

const features = [
	{ icon: FileText, title: 'Admissions', description: 'Streamline enrollment with digital applications, automated workflows, and real-time status tracking.' },
	{ icon: UserCheck, title: 'Attendance', description: 'Track daily attendance with instant notifications, pattern analysis, and reporting dashboards.' },
	{ icon: CircleDollarSign, title: 'Finance', description: 'Manage fees, invoices, payments, and financial reporting from one unified system.' },
	{ icon: BookOpen, title: 'Report Cards', description: 'Generate professional report cards with customizable templates and automated grade calculations.' },
	{ icon: MessageSquare, title: 'Communication', description: 'Connect teachers, parents, and students with built-in messaging, announcements, and notifications.' },
	{ icon: Users, title: 'Parent Portal', description: 'Give parents real-time access to grades, attendance, schedules, and school communications.' },
	{ icon: BarChart3, title: 'Analytics', description: 'Surface actionable insights across academics, operations, and student outcomes with live dashboards.' },
	{ icon: Sparkles, title: 'AI Assistance', description: 'Intelligent automation for grading suggestions, schedule optimization, and predictive insights.' },
	{ icon: CloudOff, title: 'Offline Mode', description: 'Keep working without internet. Changes sync automatically when connectivity returns.' },
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
		tag: 'Report Cards',
		title: 'Professional reports, generated instantly.',
		description: 'Select a class and subject, and SchoolMesh builds a complete grade report with assessments, exam scores, averages, and class rank — ready to share or download as PDF.',
		features: ['Multi-period grade tables', 'Automatic average & rank', 'PDF generation & share links'],
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

const stats = [
	{ value: 10000, suffix: '+', label: 'Students', color: '#465fff' },
	{ value: 250, suffix: '+', label: 'Schools', color: '#10B981' },
	{ value: 99.9, suffix: '%', label: 'Availability', color: '#F59E0B' },
	{ value: 50, suffix: 'M+', label: 'Records Managed', color: '#8B5CF6' },
];

const testimonials = [
	{
		name: 'Grace Toe',
		role: 'Principal',
		school: 'Upstairs Christian Academy',
		quote: 'SchoolMesh transformed how we manage everything from attendance to report cards. Our teachers save hours every week.',
		avatar: 'GT',
	},
	{
		name: 'Samuel Koffa',
		role: 'School Administrator',
		school: 'Buchanan Scholars Institute',
		quote: 'The multi-tenant setup lets us manage multiple campuses from one platform. The analytics give us insights we never had before.',
		avatar: 'SK',
	},
	{
		name: 'Martha Jallah',
		role: 'Director of IT',
		school: 'Paynesville STEM College',
		quote: 'Offline capability is a game-changer. Our staff can work from anywhere and everything syncs when they are back online.',
		avatar: 'MJ',
	},
];

const pricingPlans = [
	{
		name: 'Starter',
		description: 'Full access via the web platform',
		price: '500 LRD',
		period: 'per student · per academic year',
		features: [
			'Full web platform access',
			'Role-based dashboards',
			'Attendance & grading',
			'Parent & student portals',
			'Report cards & analytics',
			'Grade submissions & requests',
			'Standard support',
		],
		highlight: false,
		cta: 'Get Started',
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
			'Priority support',
			'Custom branding',
		],
		highlight: true,
		cta: 'Get Started',
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
			<div className="flex flex-wrap items-end gap-2 border-b border-gray-100 bg-gray-50/80 p-3">
				{[
					{ label: 'Year', value: '2025-2026' },
					{ label: 'Session', value: 'Junior' },
					{ label: 'Class', value: 'Grade 7A' },
				].map((f) => (
					<div key={f.label} className="flex flex-col gap-0.5">
						<span className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">{f.label}</span>
						<div className="flex h-6 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 text-[10px] font-medium text-gray-700">
							{f.value}
							<ChevronDown className="h-2.5 w-2.5 text-gray-400" />
						</div>
					</div>
				))}
				<div className="flex flex-col gap-0.5">
					<span className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">Date Range</span>
					<div className="flex h-6 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 text-[10px] font-medium text-gray-700">
						Jun 16 – Jun 20
						<ChevronDown className="h-2.5 w-2.5 text-gray-400" />
					</div>
				</div>
			</div>
			{/* Action strip */}
			<div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
				<span className="text-[8px] font-semibold uppercase tracking-wider text-gray-400">Actions</span>
									<div className="flex items-center gap-1 rounded-full border border-[#465fff] bg-[#465fff] px-2 py-0.5 text-[9px] font-semibold text-white">
										✏️ Take attendance
									</div>
									<div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[9px] font-medium text-gray-600">
										📥 Export CSV
									</div>
			</div>
			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full min-w-[400px]">
					<thead>
						<tr className="border-b border-gray-100 bg-gray-50">
							<th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-gray-500">Student</th>
							{days.map((d) => (
								<th key={d} className="px-2 py-2 text-center text-[9px] font-semibold text-gray-500">
									<div className="flex flex-col items-center">
										<span>{d}</span>
										<span className="font-bold text-gray-700">{16 + days.indexOf(d)}</span>
									</div>
								</th>
							))}
							<th className="px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider text-gray-500">Rate</th>
						</tr>
					</thead>
					<tbody>
						{students.map((s) => (
							<tr key={s.name} className="border-b border-gray-50 hover:bg-gray-50/50">
								<td className="whitespace-nowrap px-3 py-2 text-[11px] font-medium text-[#111827]">{s.name}</td>
								{days.map((d) => {
									const val = s[d.toLowerCase() as keyof typeof s] as string;
									const isP = val === 'P';
									return (
										<td key={d} className="px-2 py-2 text-center">
											<span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${isP ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{val}</span>
										</td>
									);
								})}
								<td className="px-2 py-2 text-center">
									<span className={`text-[11px] font-bold tabular-nums ${s.rate >= 85 ? 'text-green-600' : s.rate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{s.rate}%</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="border-t border-gray-100 px-3 py-1.5 text-center text-[9px] font-medium text-gray-400">
				Showing 5 school days · 5 students · Weekends excluded
			</div>
		</div>
	);
}

function ReportCardMockup() {
	const grades = [
		{ subject: 'Mathematics', assessment: 42, exam: 35, average: 77, rank: 3 },
		{ subject: 'English', assessment: 38, exam: 30, average: 68, rank: 8 },
		{ subject: 'Science', assessment: 45, exam: 38, average: 83, rank: 1 },
		{ subject: 'Social Studies', assessment: 40, exam: 32, average: 72, rank: 5 },
		{ subject: 'French', assessment: 36, exam: 28, average: 64, rank: 12 },
	];

	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
			{/* PDF-like header */}
			<div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-center">
				<div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-[#465fff]">
					<Image
						src="/images/SchoolMesh.png"
						alt="SchoolMesh"
						width={32}
						height={32}
						className="h-6 w-6 object-contain"
					/>
				</div>
				<p className="text-xs font-bold text-[#111827]">Upstairs Christian Academy</p>
				<p className="text-[9px] text-gray-500">Monrovia, Liberia</p>
				<p className="mt-1 text-[10px] font-bold text-[#1a365d]">STUDENT YEARLY REPORT CARD</p>
			</div>
			{/* Student info */}
			<div className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-gray-100 px-4 py-2.5">
				{[
					['Student', 'Alice Johnson'],
					['Class', 'Grade 7A'],
					['Academic Year', '2025-2026'],
					['Class Rank', '3 / 42'],
				].map(([k, v]) => (
					<div key={k} className="flex items-baseline gap-1.5">
						<span className="text-[9px] font-semibold text-gray-500">{k}:</span>
						<span className="text-[10px] font-bold text-[#111827]">{v}</span>
					</div>
				))}
			</div>
			{/* Grade table */}
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b border-gray-200 bg-gray-50">
							{['Subject', 'Assessment', 'Exam', 'Average', 'Rank'].map((h) => (
								<th key={h} className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-600 ${h === 'Subject' ? 'text-left' : 'text-center'}`}>{h}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{grades.map((g, i) => (
							<tr key={g.subject} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
								<td className="whitespace-nowrap px-3 py-1.5 text-[11px] font-medium text-[#111827]">{g.subject}</td>
								<td className="px-3 py-1.5 text-center text-[11px] text-gray-600 tabular-nums">{g.assessment}</td>
								<td className="px-3 py-1.5 text-center text-[11px] text-gray-600 tabular-nums">{g.exam}</td>
								<td className="px-3 py-1.5 text-center">
									<span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${g.average >= 80 ? 'bg-green-100 text-green-700' : g.average >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{g.average}</span>
								</td>
								<td className="px-3 py-1.5 text-center text-[11px] font-semibold text-gray-600 tabular-nums">#{g.rank}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{/* Summary */}
			<div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2">
				<div className="flex items-center gap-3">
					<div>
						<p className="text-[9px] text-gray-500">Yearly Average</p>
						<p className="text-sm font-bold text-[#111827]">72.8</p>
					</div>
					<div>
						<p className="text-[9px] text-gray-500">Class Position</p>
						<p className="text-sm font-bold text-[#111827]">#3 / 42</p>
					</div>
				</div>
				<div className="flex gap-1.5">
					<div className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[9px] font-semibold text-gray-600">📄 PDF</div>
					<div className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[9px] font-semibold text-gray-600">🔗 Share</div>
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

	useEffect(() => {
		const handler = () => setIsScrolled(window.scrollY > 20);
		window.addEventListener('scroll', handler, { passive: true });
		return () => window.removeEventListener('scroll', handler);
	}, []);

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
			className={`${inter.variable} scroll-smooth bg-[#FAFBFC] font-sans text-[#111827] antialiased`}
		>
			{/* ── Navigation ───────────────────────────────────── */}
			<header
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
						{navItems.map((item) => (
							<a
								key={item.href}
								href={item.href}
								className="text-sm font-medium text-gray-600 transition-colors hover:text-[#111827]"
							>
								{item.label}
							</a>
						))}
					</div>

					<div className="hidden items-center gap-3 md:flex">
						<a
							href="#contact"
							className="text-sm font-medium text-gray-600 transition-colors hover:text-[#111827]"
						>
							Log In
						</a>
						<a
							href="#pricing"
							className="rounded-full bg-[#111827] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/10"
						>
							Start Free
						</a>
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
								{navItems.map((item) => (
									<a
										key={item.href}
										href={item.href}
										onClick={() => setIsMobileMenuOpen(false)}
										className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-[#111827]"
									>
										{item.label}
									</a>
								))}
								<div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
									<a
										href="#contact"
										className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
									>
										Log In
									</a>
									<a
										href="#pricing"
										onClick={() => setIsMobileMenuOpen(false)}
										className="block rounded-full bg-[#111827] px-5 py-2.5 text-center text-sm font-medium text-white"
									>
										Start Free
									</a>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</header>

			<main id="home">
				{/* ── Hero ──────────────────────────────────────── */}
				<section className="relative overflow-hidden bg-[#FAFBFC] pt-32 pb-20 sm:pt-40 sm:pb-28">
					<div className="absolute inset-0 overflow-hidden">
						<div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-[#465fff]/5 blur-3xl" />
						<div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#10B981]/5 blur-3xl" />
					</div>

					<div className="relative mx-auto max-w-7xl px-5 sm:px-8">
						<div className="mx-auto max-w-4xl text-center">
							<AnimateWhenVisible custom={0}>
								<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 shadow-sm">
									<span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
									Now available for schools worldwide
								</div>
							</AnimateWhenVisible>

							<AnimateWhenVisible custom={1}>
								<h1 className="text-5xl font-bold tracking-tight text-[#111827] sm:text-6xl lg:text-7xl">
									School management,{' '}
									<span className="bg-gradient-to-r from-[#465fff] to-[#12b76a] bg-clip-text text-transparent">
										finally effortless.
									</span>
								</h1>
							</AnimateWhenVisible>

							<AnimateWhenVisible custom={2}>
								<p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500 leading-relaxed sm:text-xl">
									Admissions, attendance, grades, finance, and communication — connected
									in one platform that your whole school will actually enjoy using.
								</p>
							</AnimateWhenVisible>

							<AnimateWhenVisible custom={3}>
								<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
									<a
										href="#pricing"
										className="group inline-flex items-center gap-2 rounded-full bg-[#465fff] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#465fff]/20 transition-all hover:bg-[#3a4fe6] hover:shadow-xl hover:shadow-[#465fff]/30 hover:-translate-y-0.5"
									>
										Start Free
										<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
									</a>
									<a
										href="#contact"
										className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-8 py-3.5 text-sm font-semibold text-[#111827] shadow-sm transition-all hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5"
									>
										Book Demo
									</a>
								</div>
							</AnimateWhenVisible>
						</div>

						{/* Product Preview — matches actual DashboardHome */}
						<AnimateWhenVisible custom={4} className="mt-16 sm:mt-20">
							<div className="relative mx-auto max-w-5xl">
								<div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-b from-[#465fff]/10 to-transparent blur-2xl" />
								<div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/5">
									{/* Browser chrome */}
									<div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
										<div className="flex gap-1.5">
											<div className="h-3 w-3 rounded-full bg-red-400" />
											<div className="h-3 w-3 rounded-full bg-amber-400" />
											<div className="h-3 w-3 rounded-full bg-green-400" />
										</div>
										<div className="ml-4 flex flex-1 items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
											<Globe className="h-3.5 w-3.5 text-gray-400" />
											<span className="text-xs text-gray-400">app.schoolmesh.com</span>
										</div>
									</div>
									{/* App shell: sidebar + content */}
									<div className="grid min-h-[340px] sm:min-h-[440px] lg:grid-cols-[220px_1fr]">
										{/* Sidebar */}
										<div className="hidden border-r border-gray-100 bg-[#f9fafb] p-3 lg:block">
											<div className="mb-4 flex items-center gap-2.5 px-2">
												<Image
													src="/images/SchoolMesh.png"
													alt="SchoolMesh"
													width={28}
													height={28}
													className="h-7 w-7 rounded-lg object-contain"
												/>
												<span className="text-xs font-bold text-[#111827]">School<span className="text-[#465fff]">Mesh</span></span>
											</div>
											<div className="space-y-0.5">
												{[
													{ label: 'Dashboard', icon: LayoutDashboard, active: true },
													{ label: 'User Management', icon: Users },
													{ label: 'Grading', icon: ClipboardList },
													{ label: 'Academic Reports', icon: GraduationCap },
													{ label: 'Calendar', icon: CalendarDays },
													{ label: 'Attendance', icon: UserCheck },
													{ label: 'Settings', icon: Settings },
												].map((item) => (
													<div
														key={item.label}
														className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
															item.active
																? 'relative border-[#465fff]/20 bg-[#465fff]/5 text-[#465fff]'
																: 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
														}`}
													>
														{item.active && (
															<span className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-[#465fff]" />
														)}
														<div className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
															item.active
																? 'border-[#465fff]/20 bg-[#465fff]/10 text-[#465fff]'
																: 'border-gray-200 bg-white text-gray-400'
														}`}>
															<item.icon className="h-3 w-3" />
														</div>
														{item.label}
													</div>
												))}
											</div>
										</div>
										{/* Main content — Dashboard Home hero */}
										<div className="p-4 sm:p-5">
											{/* Hero card with role glow */}
											<div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
												{/* Animated gradient glow — admin purple */}
												<div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-gradient-to-br from-purple-400/25 via-fuchsia-400/15 to-transparent blur-3xl" />
												<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,0,0,0.015),transparent_60%)]" />
												{/* Background role icon watermark */}
												<div className="absolute top-4 right-4 opacity-[0.04] pointer-events-none">
													<ShieldCheck size={140} />
												</div>
												<div className="relative z-10">
													{/* Role badge + academic year */}
													<div className="mb-3 flex flex-wrap items-center gap-2">
														<span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700">
															<ShieldCheck size={10} strokeWidth={2.5} />
															System Admin
														</span>
														<span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">
															2025-2026
														</span>
													</div>
													{/* Greeting */}
													<h3 className="text-xl font-extrabold text-[#111827] tracking-tight sm:text-2xl">
														Good morning, Admin! ✨
													</h3>
													<p className="mt-1 text-xs text-gray-500">
														You have full system access to manage users, settings, and all school operations.
													</p>
													{/* Day timeline */}
													<div className="relative mt-4">
														<div className="relative h-1 rounded-full bg-gray-100 overflow-visible">
															<div className="absolute inset-y-0 left-0 rounded-full bg-purple-400 opacity-30" style={{ width: '38%' }} />
															<div className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-purple-500 ring-2 ring-white animate-pulse" style={{ left: '38%' }} />
														</div>
														<div className="mt-1.5 flex justify-between">
															{['Dawn', 'Midday', 'Dusk', 'Night'].map((s, i) => (
																<span key={s} className={`text-[9px] font-medium uppercase tracking-wider ${i === 1 ? 'text-purple-600' : 'text-gray-400'}`}>{s}</span>
															))}
														</div>
													</div>
												</div>
											</div>
											{/* Insights tabs */}
											<div className="mt-4 flex gap-1 rounded-lg border border-gray-100 bg-gray-50 p-0.5">
												{['Insights', 'Performance', 'Enrollment'].map((tab, i) => (
													<div
														key={tab}
														className={`flex-1 rounded-md px-3 py-1.5 text-center text-[11px] font-semibold transition-colors ${
															i === 0 ? 'bg-white text-[#465fff] shadow-sm' : 'text-gray-500'
														}`}
													>
														{tab}
													</div>
												))}
											</div>
											{/* Mini stat cards */}
											<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
												{[
													{ label: 'Students', value: '2,847', icon: '👩‍🎓', color: '#465fff' },
													{ label: 'Teachers', value: '186', icon: '👩‍🏫', color: '#12b76a' },
													{ label: 'Avg. Grade', value: '78.4', icon: '📊', color: '#f79009' },
													{ label: 'Pass Rate', value: '86%', icon: '✅', color: '#8b5cf6' },
												].map((s) => (
													<div key={s.label} className="rounded-xl border border-gray-100 bg-white p-2.5 sm:p-3">
														<p className="text-[10px] font-medium text-gray-500">{s.label}</p>
														<p className="mt-0.5 text-lg font-bold text-[#111827]">{s.value}</p>
													</div>
												))}
											</div>
										</div>
									</div>
								</div>
							</div>
						</AnimateWhenVisible>
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
										<div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#465fff]/10 text-[#465fff] transition-colors group-hover:bg-[#465fff] group-hover:text-white">
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
											{item.type === 'reportcard' && <ReportCardMockup />}
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
								SchoolMesh goes beyond basic management with features designed to protect
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
											Access SchoolMesh from any web browser, or use our dedicated mobile
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
								Hear from the schools that have transformed their operations with SchoolMesh.
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
								Simple, transparent pricing.
							</h2>
							<p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
								Two simple plans. Per-student annual pricing with no hidden fees.
							</p>
						</AnimateWhenVisible>

						<motion.div
							className="mt-14 grid max-w-3xl mx-auto gap-6 lg:grid-cols-2"
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
										plan.highlight
											? 'border-[#465fff] bg-[#465fff]/[0.02] shadow-lg shadow-[#465fff]/10'
											: 'border-gray-100 bg-white shadow-sm hover:shadow-lg hover:shadow-gray-900/5'
									}`}
								>
									{plan.highlight && (
										<div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#465fff] px-4 py-1 text-xs font-semibold text-white">
											Most Popular
										</div>
									)}
									<div>
										<h3 className="text-xl font-bold text-[#111827]">{plan.name}</h3>
										<p className="mt-1 text-sm text-gray-500">{plan.description}</p>
									</div>
									<div className="mt-6">
										<p className="text-3xl font-bold text-[#111827]">{plan.price}</p>
										<p className="mt-1 text-sm text-gray-500">{plan.period}</p>
									</div>
									<ul className="mt-6 space-y-3">
										{plan.features.map((f) => (
											<li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
												<CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
												{f}
											</li>
										))}
									</ul>
									<a
										href="#contact"
										className={`mt-8 block w-full rounded-full py-3 text-center text-sm font-semibold transition-all ${
											plan.highlight
												? 'bg-[#465fff] text-white shadow-md shadow-[#465fff]/20 hover:bg-[#3a4fe6] hover:shadow-lg'
												: 'border border-gray-200 text-[#111827] hover:border-gray-300 hover:bg-gray-50'
										}`}
									>
										{plan.cta}
									</a>
								</motion.div>
							))}
						</motion.div>
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
										Join hundreds of schools already using SchoolMesh to streamline
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
										Have questions about SchoolMesh? Planning a rollout for your school or
										network? We&apos;re here to help with onboarding, migration, and setup.
									</p>
									<div className="mt-8 space-y-5">
										<div className="flex items-center gap-4">
											<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#465fff]/10 text-[#465fff]">
												<Mail className="h-5 w-5" />
											</div>
											<div>
												<p className="text-sm font-semibold text-[#111827]">Email</p>
												<p className="text-sm text-gray-500">team@schoolmesh.io</p>
											</div>
										</div>
										<div className="flex items-center gap-4">
											<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10B981]/10 text-[#10B981]">
												<Phone className="h-5 w-5" />
											</div>
											<div>
												<p className="text-sm font-semibold text-[#111827]">Phone</p>
												<p className="text-sm text-gray-500">+231 77 000 0000</p>
											</div>
										</div>
										<div className="flex items-center gap-4">
											<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B]/10 text-[#F59E0B]">
												<Globe className="h-5 w-5" />
											</div>
											<div>
												<p className="text-sm font-semibold text-[#111827]">Location</p>
												<p className="text-sm text-gray-500">Monrovia, Liberia</p>
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
							&copy; {new Date().getFullYear()} SchoolMesh. All rights reserved.
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
