'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { Public_Sans, Sora } from 'next/font/google';
import { motion } from 'framer-motion';
import {
	ArrowRight,
	BarChart3,
	BellRing,
	Building2,
	CalendarDays,
	CheckCircle2,
	Cloud,
	Database,
	Globe,
	GraduationCap,
	LayoutDashboard,
	Mail,
	MapPin,
	Menu,
	NotebookPen,
	Phone,
	Settings,
	ShieldCheck,
	Users,
	X,
} from 'lucide-react';

const sora = Sora({
	subsets: ['latin'],
	weight: ['600', '700'],
	display: 'swap',
});

const publicSans = Public_Sans({
	subsets: ['latin'],
	weight: ['400', '500', '600', '700'],
	display: 'swap',
});

const navItems = [
	{ label: 'About', href: '#about' },
	{ label: 'Features', href: '#features' },
	{ label: 'Partners', href: '#partners' },
	{ label: 'Contact', href: '#contact' },
];

const statItems = [
	{ label: 'Schools Onboarded', value: '20+' },
	{ label: 'Active Users', value: '15,000+' },
	{ label: 'Data Uptime', value: '99.9%' },
];

const roleFeatures = [
	{
		title: 'Students',
		description:
			'Track classes, results, fees, and announcements from one simple dashboard.',
		icon: GraduationCap,
		items: [
			'View schedules, grades, and school notices in real-time.',
			'Submit requests and access reports from any device.',
			'Receive reminders for fees, classes, and deadlines.',
		],
	},
	{
		title: 'Teachers',
		description:
			'Run teaching workflows faster with digital grading and lesson planning.',
		icon: NotebookPen,
		items: [
			'Manage lesson plans and submit grades securely.',
			'Coordinate classes, attendance, and assessments.',
			'Collaborate with administrators through shared tools.',
		],
	},
	{
		title: 'System Admin',
		description:
			'Control each tenant safely with centralized oversight and flexible permissions.',
		icon: ShieldCheck,
		items: [
			'Configure users, roles, and school-level feature access.',
			'Monitor health, usage, and audit-ready records.',
			'Scale multiple school tenants from one platform core.',
		],
	},
];

const platformHighlights = [
	{
		title: 'Multi-Tenant Architecture',
		body: 'Separate school data with strong tenant boundaries and centralized governance.',
		icon: Database,
	},
	{
		title: 'Cloud Reliability',
		body: 'Built for consistent availability with secure data handling and backups.',
		icon: Cloud,
	},
	{
		title: 'Operational Analytics',
		body: 'Understand engagement, academic trends, and admin performance quickly.',
		icon: BarChart3,
	},
	{
		title: 'Configurable Workflows',
		body: 'Adapt grading, schedules, and approval flows to each school context.',
		icon: Settings,
	},
];

const partnerSchools = [
	{ name: 'Monrovia Excellence Academy', location: 'Monrovia', users: '2,400 users' },
	{ name: 'Buchanan Scholars Institute', location: 'Grand Bassa', users: '1,750 users' },
	{ name: 'Kakata Future Leaders School', location: 'Margibi', users: '1,100 users' },
	{ name: 'Gbarnga Learning Center', location: 'Bong', users: '900 users' },
	{ name: 'Harper Community Academy', location: 'Maryland', users: '780 users' },
	{ name: 'Paynesville STEM College', location: 'Montserrado', users: '1,350 users' },
];

type FadeInProps = {
	children: ReactNode;
	className?: string;
	delay?: number;
};

function FadeIn({ children, className, delay = 0 }: FadeInProps) {
	return (
		<motion.div
			className={className}
			initial={{ opacity: 0, y: 24 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.2 }}
			transition={{ duration: 0.6, delay, ease: 'easeOut' }}
		>
			{children}
		</motion.div>
	);
}

export default function SchoolMeshLandingPage() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	return (
		<div className={`${publicSans.className} scroll-smooth bg-[#F7FAFF] text-[#1F2937]`}>
			<header className="sticky top-0 z-50 border-b border-[#0B3A6E]/10 bg-[#F7FAFF]/90 backdrop-blur-xl">
				<nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
					<Link href="#home" className="flex items-center gap-3" aria-label="SchoolMesh Home">
						<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0B3A6E] shadow-lg shadow-[#0B3A6E]/30">
							<Globe className="h-5 w-5 text-white" />
						</div>
						<div>
							<p className={`${sora.className} text-lg font-semibold tracking-tight text-[#0B3A6E]`}>
								SchoolMesh
							</p>
							<p className="text-xs font-medium text-[#1F2937]/70">Connecting Schools. Empowering Learning.</p>
						</div>
					</Link>

					<div className="hidden items-center gap-8 md:flex">
						{navItems.map((item) => (
							<a
								key={item.href}
								href={item.href}
								className="text-sm font-semibold text-[#1F2937]/80 transition-colors hover:text-[#0B3A6E]"
							>
								{item.label}
							</a>
						))}
						<Link
							href="/login"
							className="inline-flex items-center rounded-full bg-[#0B3A6E] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0B3A6E]/25 transition-all hover:bg-[#0B3A6E]/90"
						>
							Admin Login
						</Link>
					</div>

					<button
						type="button"
						onClick={() => setIsMenuOpen((open) => !open)}
						className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#0B3A6E]/20 text-[#0B3A6E] md:hidden"
						aria-label="Toggle navigation"
					>
						{isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</button>
				</nav>

				{isMenuOpen && (
					<div className="border-t border-[#0B3A6E]/10 bg-[#F7FAFF] px-4 py-4 md:hidden">
						<div className="mx-auto flex max-w-7xl flex-col gap-3">
							{navItems.map((item) => (
								<a
									key={item.href}
									href={item.href}
									onClick={() => setIsMenuOpen(false)}
									className="rounded-lg px-3 py-2 text-sm font-semibold text-[#1F2937] hover:bg-[#0B3A6E]/5"
								>
									{item.label}
								</a>
							))}
							<Link
								href="/login"
								onClick={() => setIsMenuOpen(false)}
								className="mt-1 inline-flex items-center justify-center rounded-lg bg-[#0B3A6E] px-4 py-2.5 text-sm font-semibold text-white"
							>
								Admin Login
							</Link>
						</div>
					</div>
				)}
			</header>

			<main id="home" className="overflow-hidden">
				<section className="relative isolate">
					<div className="absolute inset-0 -z-10 overflow-hidden">
						<motion.div
							className="absolute -left-24 top-8 h-80 w-80 rounded-full bg-[#0B3A6E]/20 blur-3xl"
							animate={{ x: [0, 30, 0], y: [0, 40, 0] }}
							transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
						/>
						<motion.div
							className="absolute -right-20 top-24 h-72 w-72 rounded-full bg-[#D62828]/20 blur-3xl"
							animate={{ x: [0, -35, 0], y: [0, -28, 0] }}
							transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
						/>
						<motion.div
							className="absolute bottom-[-10rem] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#F4C542]/25 blur-3xl"
							animate={{ y: [0, -20, 0] }}
							transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
						/>
					</div>

					<div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 md:pt-20 lg:px-8 lg:pb-28">
						<FadeIn className="mx-auto max-w-4xl text-center">
							<p className="mb-4 inline-flex items-center rounded-full border border-[#0B3A6E]/20 bg-white/80 px-4 py-1.5 text-xs font-semibold tracking-wide text-[#0B3A6E] sm:text-sm">
								Built for Multi-Tenant School Operations in Liberia
							</p>
							<h1 className={`${sora.className} text-4xl font-bold leading-tight text-[#0B3A6E] sm:text-5xl lg:text-6xl`}>
								SchoolMesh connects schools, staff, students, and systems in one platform.
							</h1>
							<p className="mx-auto mt-6 max-w-2xl text-base text-[#1F2937]/80 sm:text-lg">
								From admissions to reporting, SchoolMesh gives every school a clear digital operating model with strong tenant separation and modern UX.
							</p>
							<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
								<a
									href="#contact"
									className="inline-flex items-center justify-center rounded-full bg-[#0B3A6E] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0B3A6E]/30 transition-all hover:translate-y-[-2px] hover:bg-[#0A315D]"
								>
									Request a Demo
									<ArrowRight className="ml-2 h-4 w-4" />
								</a>
								<a
									href="#features"
									className="inline-flex items-center justify-center rounded-full border border-[#0B3A6E]/25 bg-white/85 px-7 py-3 text-sm font-semibold text-[#0B3A6E] transition-all hover:border-[#0B3A6E]/45"
								>
									Explore Features
								</a>
							</div>
						</FadeIn>

						<FadeIn delay={0.15} className="mt-12 grid gap-4 sm:grid-cols-3">
							{statItems.map((item) => (
								<div
									key={item.label}
									className="rounded-2xl border border-white/80 bg-white/80 p-5 text-center shadow-lg shadow-[#0B3A6E]/10"
								>
									<p className={`${sora.className} text-2xl font-bold text-[#0B3A6E]`}>{item.value}</p>
									<p className="mt-1 text-sm text-[#1F2937]/70">{item.label}</p>
								</div>
							))}
						</FadeIn>
					</div>
				</section>

				<section id="about" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
					<div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
						<FadeIn>
							<p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#D62828]">About Us</p>
							<h2 className={`${sora.className} text-3xl font-bold text-[#0B3A6E] sm:text-4xl`}>
								Modern school operations for growing institutions.
							</h2>
							<p className="mt-5 text-base leading-relaxed text-[#1F2937]/80">
								SchoolMesh helps schools in Liberia operate with clarity and consistency. We combine academic, administrative, and communication tools in one secure platform so each tenant can move faster without losing control.
							</p>
							<div className="mt-6 space-y-3">
								<div className="flex items-start gap-3">
									<CheckCircle2 className="mt-0.5 h-5 w-5 text-[#22A06B]" />
									<p className="text-sm text-[#1F2937]/80">Tenant-aware architecture for independent school environments.</p>
								</div>
								<div className="flex items-start gap-3">
									<CheckCircle2 className="mt-0.5 h-5 w-5 text-[#22A06B]" />
									<p className="text-sm text-[#1F2937]/80">Role-specific workflows for students, teachers, and system administrators.</p>
								</div>
								<div className="flex items-start gap-3">
									<CheckCircle2 className="mt-0.5 h-5 w-5 text-[#22A06B]" />
									<p className="text-sm text-[#1F2937]/80">Data-backed decisions through analytics, reports, and live operational visibility.</p>
								</div>
							</div>
						</FadeIn>

						<FadeIn delay={0.1}>
							<div className="rounded-3xl border border-[#0B3A6E]/10 bg-white p-6 shadow-xl shadow-[#0B3A6E]/10 sm:p-8">
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="rounded-2xl bg-[#0B3A6E]/6 p-4">
										<Users className="h-6 w-6 text-[#0B3A6E]" />
										<p className="mt-3 text-sm font-semibold text-[#0B3A6E]">Unified Users</p>
										<p className="mt-1 text-xs text-[#1F2937]/70">Manage students, teachers, admins, and guardians in one system.</p>
									</div>
									<div className="rounded-2xl bg-[#D62828]/8 p-4">
										<LayoutDashboard className="h-6 w-6 text-[#D62828]" />
										<p className="mt-3 text-sm font-semibold text-[#0B3A6E]">Operational Dashboards</p>
										<p className="mt-1 text-xs text-[#1F2937]/70">See attendance, performance, and engagement in real-time.</p>
									</div>
									<div className="rounded-2xl bg-[#F4C542]/20 p-4">
										<CalendarDays className="h-6 w-6 text-[#0B3A6E]" />
										<p className="mt-3 text-sm font-semibold text-[#0B3A6E]">Academic Calendar</p>
										<p className="mt-1 text-xs text-[#1F2937]/70">Coordinate events, exams, and school timelines efficiently.</p>
									</div>
									<div className="rounded-2xl bg-[#22A06B]/12 p-4">
										<BellRing className="h-6 w-6 text-[#22A06B]" />
										<p className="mt-3 text-sm font-semibold text-[#0B3A6E]">Smart Alerts</p>
										<p className="mt-1 text-xs text-[#1F2937]/70">Deliver important reminders instantly to the right audience.</p>
									</div>
								</div>
							</div>
						</FadeIn>
					</div>
				</section>

				<section id="features" className="bg-white py-20">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<FadeIn className="text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#D62828]">Features</p>
							<h2 className={`${sora.className} text-3xl font-bold text-[#0B3A6E] sm:text-4xl`}>
								Purpose-built tools for every role.
							</h2>
							<p className="mx-auto mt-4 max-w-2xl text-base text-[#1F2937]/75">
								Each module is designed for daily school operations with clear role boundaries and reliable data flow.
							</p>
						</FadeIn>

						<div className="mt-12 grid gap-5 lg:grid-cols-3">
							{roleFeatures.map((group, index) => {
								const Icon = group.icon;
								return (
									<FadeIn key={group.title} delay={index * 0.1}>
										<div className="h-full rounded-3xl border border-[#0B3A6E]/10 bg-[#F7FAFF] p-6 shadow-lg shadow-[#0B3A6E]/10 transition-transform hover:-translate-y-1">
											<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B3A6E] text-white">
												<Icon className="h-5 w-5" />
											</div>
											<h3 className={`${sora.className} text-xl font-semibold text-[#0B3A6E]`}>{group.title}</h3>
											<p className="mt-2 text-sm text-[#1F2937]/75">{group.description}</p>
											<ul className="mt-5 space-y-2">
												{group.items.map((item) => (
													<li key={item} className="flex items-start gap-2 text-sm text-[#1F2937]/80">
														<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22A06B]" />
														<span>{item}</span>
													</li>
												))}
											</ul>
										</div>
									</FadeIn>
								);
							})}
						</div>

						<div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
							{platformHighlights.map((feature, index) => {
								const Icon = feature.icon;
								return (
									<FadeIn key={feature.title} delay={0.05 * index}>
										<div className="rounded-2xl border border-[#0B3A6E]/10 bg-white p-5">
											<Icon className="h-5 w-5 text-[#D62828]" />
											<p className="mt-3 text-sm font-semibold text-[#0B3A6E]">{feature.title}</p>
											<p className="mt-2 text-sm text-[#1F2937]/75">{feature.body}</p>
										</div>
									</FadeIn>
								);
							})}
						</div>
					</div>
				</section>

				<section id="partners" className="py-20">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<FadeIn className="text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#D62828]">Current Partners</p>
							<h2 className={`${sora.className} text-3xl font-bold text-[#0B3A6E] sm:text-4xl`}>
								Schools currently running SchoolMesh.
							</h2>
							<p className="mx-auto mt-4 max-w-2xl text-base text-[#1F2937]/75">
								Our network keeps expanding across Liberia as institutions modernize records, communication, and academic workflows.
							</p>
						</FadeIn>

						<div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{partnerSchools.map((partner, index) => (
								<FadeIn key={partner.name} delay={index * 0.06}>
									<div className="rounded-2xl border border-[#0B3A6E]/10 bg-white p-5 shadow-sm">
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className={`${sora.className} text-lg font-semibold text-[#0B3A6E]`}>{partner.name}</p>
												<p className="mt-1 text-sm text-[#1F2937]/70">{partner.location}, Liberia</p>
											</div>
											<div className="rounded-full bg-[#0B3A6E]/7 p-2">
												<Building2 className="h-4 w-4 text-[#0B3A6E]" />
											</div>
										</div>
										<p className="mt-4 inline-flex items-center rounded-full bg-[#22A06B]/12 px-3 py-1 text-xs font-semibold text-[#0E7A4C]">
											{partner.users}
										</p>
									</div>
								</FadeIn>
							))}
						</div>
					</div>
				</section>

				<section id="contact" className="bg-[#0B3A6E] py-20 text-white">
					<div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
						<FadeIn>
							<p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#F4C542]">Contact Us</p>
							<h2 className={`${sora.className} text-3xl font-bold sm:text-4xl`}>
								Talk with the SchoolMesh team.
							</h2>
							<p className="mt-4 max-w-lg text-sm text-white/80 sm:text-base">
								Planning a rollout for one school or a full school group? We will help you map onboarding, migration, and admin setup.
							</p>
							<div className="mt-8 space-y-4">
								<div className="flex items-center gap-3 text-sm text-white/85">
									<Phone className="h-4 w-4 text-[#F4C542]" />
									<span>+231 77 000 0000</span>
								</div>
								<div className="flex items-center gap-3 text-sm text-white/85">
									<Mail className="h-4 w-4 text-[#F4C542]" />
									<span>team@schoolmesh.io</span>
								</div>
								<div className="flex items-center gap-3 text-sm text-white/85">
									<MapPin className="h-4 w-4 text-[#F4C542]" />
									<span>Monrovia, Liberia</span>
								</div>
							</div>
						</FadeIn>

						<FadeIn delay={0.08}>
							<form
								className="rounded-3xl bg-white/98 p-6 text-[#1F2937] shadow-2xl shadow-black/10 sm:p-8"
								onSubmit={(event) => {
									event.preventDefault();
									setIsSubmitting(true);
									window.setTimeout(() => setIsSubmitting(false), 900);
								}}
							>
								<p className={`${sora.className} text-xl font-semibold text-[#0B3A6E]`}>Request a Demo</p>
								<p className="mt-2 text-sm text-[#1F2937]/70">We will reach out with setup options for your school network.</p>
								<div className="mt-6 space-y-4">
									<div>
										<label htmlFor="fullName" className="text-sm font-semibold text-[#0B3A6E]">Full Name</label>
										<input
											id="fullName"
											type="text"
											required
											className="mt-2 w-full rounded-xl border border-[#0B3A6E]/20 px-4 py-2.5 text-sm outline-none transition focus:border-[#0B3A6E]"
											placeholder="Jane Doe"
										/>
									</div>
									<div className="grid gap-4 sm:grid-cols-2">
										<div>
											<label htmlFor="email" className="text-sm font-semibold text-[#0B3A6E]">Email</label>
											<input
												id="email"
												type="email"
												required
												className="mt-2 w-full rounded-xl border border-[#0B3A6E]/20 px-4 py-2.5 text-sm outline-none transition focus:border-[#0B3A6E]"
												placeholder="you@school.edu"
											/>
										</div>
										<div>
											<label htmlFor="organization" className="text-sm font-semibold text-[#0B3A6E]">School / Group</label>
											<input
												id="organization"
												type="text"
												required
												className="mt-2 w-full rounded-xl border border-[#0B3A6E]/20 px-4 py-2.5 text-sm outline-none transition focus:border-[#0B3A6E]"
												placeholder="School Name"
											/>
										</div>
									</div>
									<div>
										<label htmlFor="message" className="text-sm font-semibold text-[#0B3A6E]">Message</label>
										<textarea
											id="message"
											required
											rows={4}
											className="mt-2 w-full resize-none rounded-xl border border-[#0B3A6E]/20 px-4 py-2.5 text-sm outline-none transition focus:border-[#0B3A6E]"
											placeholder="Tell us what you need from SchoolMesh."
										/>
									</div>
								</div>
								<button
									type="submit"
									className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#D62828] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#BB1F1F]"
								>
									{isSubmitting ? 'Submitted' : 'Send Request'}
								</button>
							</form>
						</FadeIn>
					</div>
				</section>
			</main>

			<footer className="bg-[#071D39] py-10 text-white/80">
				<div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
					<div>
						<p className={`${sora.className} text-lg font-semibold text-white`}>SchoolMesh</p>
						<p className="mt-1 text-sm">Connecting Schools. Empowering Learning.</p>
					</div>
					<div className="flex flex-wrap items-center gap-5 text-sm">
						{navItems.map((item) => (
							<a key={item.href} href={item.href} className="transition-colors hover:text-white">
								{item.label}
							</a>
						))}
						<Link href="/login" className="font-semibold text-[#F4C542]">
							Admin Login
						</Link>
					</div>
				</div>
				<div className="mx-auto mt-6 max-w-7xl border-t border-white/10 px-4 pt-6 text-xs text-white/65 sm:px-6 lg:px-8">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<p>© {new Date().getFullYear()} SchoolMesh. All rights reserved.</p>
						<p>Designed for modern school operations across Liberia.</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
