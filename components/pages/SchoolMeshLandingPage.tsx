'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Public_Sans, Sora } from 'next/font/google';
import { AnimatePresence, motion } from 'framer-motion';
import {
	ArrowRight,
	BarChart3,
	BellRing,
	Building2,
	CalendarClock,
	CheckCircle2,
	ChevronRight,
	Cloud,
	Database,
	Globe,
	GraduationCap,
	LayoutDashboard,
	Monitor,
	Mail,
	MapPin,
	Menu,
	NotebookPen,
	Phone,
	Settings,
	ShieldCheck,
	Smartphone,
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
	{ label: 'Platforms', href: '#platforms' },
	{ label: 'Pricing', href: '#pricing' },
	{ label: 'Partners', href: '#partners' },
	{ label: 'Contact', href: '#contact' },
];

const heroSlides = [
	{
		image:
			'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1800&q=80',
		title: 'School operations, simplified.',
		subtitle: 'One platform connecting students, teachers, and administrators.',
	},
	{
		image:
			'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1800&q=80',
		title: 'Built for multi-tenant growth.',
		subtitle: 'Independent school spaces with shared control and speed.',
	},
	{
		image:
			'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1800&q=80',
		title: 'Modern learning, backed by data.',
		subtitle: 'Real-time reporting, communication, and academic workflows.',
	},
];

const statItems = [
	{ label: 'Schools Onboarded', value: '20+' },
	{ label: 'Active Users', value: '15,000+' },
	{ label: 'Platform Uptime', value: '99.9%' },
];

const roleFeatures = [
	{
		title: 'Students',
		description: 'Track classes, grades, reports, and school notices in one dashboard.',
		icon: GraduationCap,
		items: [
			'View schedules and performance instantly.',
			'Access reports and request records online.',
			'Receive reminders for key deadlines.',
		],
	},
	{
		title: 'Teachers',
		description: 'Run classroom workflows faster with digital planning and grading.',
		icon: NotebookPen,
		items: [
			'Submit lesson plans and grades securely.',
			'Manage attendance, tests, and class updates.',
			'Coordinate with administration in real-time.',
		],
	},
	{
		title: 'System Admin',
		description: 'Manage every school tenant with centralized visibility and controls.',
		icon: ShieldCheck,
		items: [
			'Configure users, roles, and feature permissions.',
			'Monitor usage, activity, and system health.',
			'Scale school operations from one platform core.',
		],
	},
];

const platformHighlights = [
	{
		title: 'Tenant-Safe Data Layer',
		body: 'Each school remains isolated while admins maintain unified governance.',
		icon: Database,
	},
	{
		title: 'Cloud Availability',
		body: 'Reliable cloud workflows for daily school operations and reporting.',
		icon: Cloud,
	},
	{
		title: 'Operational Intelligence',
		body: 'See adoption, academic patterns, and school performance in one view.',
		icon: BarChart3,
	},
	{
		title: 'Adaptive Configuration',
		body: 'Match schedules, grading, and approvals to each school context.',
		icon: Settings,
	},
];

const accessPlatforms = [
	{
		name: 'Web Platform',
		description: 'Use SchoolMesh from any modern browser with no installation required.',
		icon: Globe,
	},
	{
		name: 'Mobile App',
		description: 'Manage school operations and updates on the go from your phone.',
		icon: Smartphone,
	},
	{
		name: 'Desktop App',
		description: 'Run a full desktop experience for school offices and admin teams.',
		icon: Monitor,
	},
];

const pricingPlans = [
	{
		name: 'Standard Plan',
		coverage: 'Web platform only',
		price: 'L$700',
		period: 'per student per year',
		features: ['Web access', 'Core school management tools', 'Role-based dashboards'],
	},
	{
		name: 'Premium Plan',
		coverage: 'Web + Desktop + Mobile apps',
		price: 'L$100',
		period: 'per student per year',
		features: ['All Standard features', 'Mobile app access', 'Desktop app access'],
	},
];

const workflowSteps = [
	{
		title: 'Launch',
		text: 'Onboard schools quickly with tenant setup and data migration.',
		icon: Building2,
	},
	{
		title: 'Operate',
		text: 'Run teaching, reporting, and communication from one digital core.',
		icon: LayoutDashboard,
	},
	{
		title: 'Improve',
		text: 'Use analytics and audit trails to drive better outcomes each term.',
		icon: CalendarClock,
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

const partnerLoop = [...partnerSchools, ...partnerSchools];

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
	const [currentSlide, setCurrentSlide] = useState(0);

	useEffect(() => {
		const timer = window.setInterval(() => {
			setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
		}, 5200);
		return () => window.clearInterval(timer);
	}, []);

	return (
		<div className={`${publicSans.className} scroll-smooth bg-[#F7FAFF] text-[#1F2937]`}>
			<header className="sticky top-0 z-50 border-b border-white/15 bg-[#071D39]/80 backdrop-blur-xl">
				<nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
					<Link href="#home" className="flex items-center gap-3" aria-label="SchoolMesh Home">
						<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0B3A6E] shadow-lg shadow-[#0B3A6E]/40">
							<Globe className="h-5 w-5 text-white" />
						</div>
						<div>
							<p className={`${sora.className} text-lg font-semibold tracking-tight text-white`}>SchoolMesh</p>
							<p className="text-xs font-medium text-white/70">Connecting Schools. Empowering Learning.</p>
						</div>
					</Link>

					<div className="hidden items-center gap-8 md:flex">
						{navItems.map((item) => (
							<a
								key={item.href}
								href={item.href}
								className="text-sm font-semibold text-white/85 transition-colors hover:text-white"
							>
								{item.label}
							</a>
						))}
					</div>

					<button
						type="button"
						onClick={() => setIsMenuOpen((open) => !open)}
						className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/30 text-white md:hidden"
						aria-label="Toggle navigation"
					>
						{isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</button>
				</nav>

				{isMenuOpen && (
					<div className="border-t border-white/15 bg-[#071D39] px-4 py-4 md:hidden">
						<div className="mx-auto flex max-w-7xl flex-col gap-3">
							{navItems.map((item) => (
								<a
									key={item.href}
									href={item.href}
									onClick={() => setIsMenuOpen(false)}
									className="rounded-lg px-3 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
								>
									{item.label}
								</a>
							))}
						</div>
					</div>
				)}
			</header>

			<main id="home" className="overflow-hidden">
				<section className="relative min-h-[92vh] overflow-hidden bg-[#071D39]">
					<div className="absolute inset-0 z-0">
						<AnimatePresence mode="wait">
							<motion.img
								key={currentSlide}
								src={heroSlides[currentSlide].image}
								alt="SchoolMesh hero background"
								className="h-full w-full object-cover"
								initial={{ opacity: 0, scale: 1.06 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 1.05 }}
								transition={{ duration: 0.9, ease: 'easeOut' }}
							/>
						</AnimatePresence>
						<div className="absolute inset-0 bg-gradient-to-br from-[#06132A]/90 via-[#0B3A6E]/75 to-[#D62828]/35" />
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,197,66,0.22),transparent_40%),radial-gradient(circle_at_80%_25%,rgba(11,58,110,0.30),transparent_42%),radial-gradient(circle_at_50%_80%,rgba(214,40,40,0.20),transparent_38%)]" />
					</div>

					<motion.div
						className="absolute -left-20 top-28 h-64 w-64 rounded-full bg-[#F4C542]/30 blur-3xl"
						animate={{ x: [0, 36, 0], y: [0, -26, 0] }}
						transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
					/>
					<motion.div
						className="absolute -right-24 bottom-16 h-72 w-72 rounded-full bg-[#D62828]/30 blur-3xl"
						animate={{ x: [0, -28, 0], y: [0, 28, 0] }}
						transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
					/>

					<div className="relative z-10 mx-auto grid min-h-[92vh] w-full max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8">
						<div>
							<motion.p
								initial={{ opacity: 0, y: 16 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5 }}
								className="mb-6 inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-white/90 sm:text-sm"
							>
								MULTI-TENANT SCHOOL MANAGEMENT
							</motion.p>

							<AnimatePresence mode="wait">
								<motion.div
									key={currentSlide}
									initial={{ opacity: 0, y: 18 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -18 }}
									transition={{ duration: 0.45, ease: 'easeOut' }}
								>
									<h1 className={`${sora.className} text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl`}>
										{heroSlides[currentSlide].title}
									</h1>
									<p className="mt-5 max-w-xl text-base text-white/85 sm:text-lg">
										{heroSlides[currentSlide].subtitle}
									</p>
								</motion.div>
							</AnimatePresence>

							<div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
								<a
									href="#contact"
									className="group inline-flex items-center justify-center rounded-xl bg-[#F4C542] px-7 py-3 text-sm font-semibold text-[#071D39] shadow-2xl shadow-[#F4C542]/30 transition-all hover:-translate-y-1"
								>
									Request a Demo
									<ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
								</a>
								<a
									href="#features"
									className="group inline-flex items-center justify-center rounded-xl border border-white/35 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white hover:text-[#0B3A6E]"
								>
									Explore Features
									<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
								</a>
							</div>

							<div className="mt-10 grid w-full max-w-xl gap-3 sm:grid-cols-3">
								{statItems.map((item, index) => (
									<motion.div
										key={item.label}
										initial={{ opacity: 0, y: 12 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.5, delay: 0.22 + index * 0.08 }}
										className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur"
									>
										<p className={`${sora.className} text-2xl font-bold text-white`}>{item.value}</p>
										<p className="text-xs text-white/80">{item.label}</p>
									</motion.div>
								))}
							</div>

							<div className="mt-8 flex items-center gap-2">
								{heroSlides.map((_, index) => (
									<button
										key={index}
										onClick={() => setCurrentSlide(index)}
										className="group p-1"
										aria-label={`Go to hero slide ${index + 1}`}
									>
										<div
											className={`rounded-full transition-all duration-300 ${
												index === currentSlide
													? 'h-2.5 w-10 bg-white'
													: 'h-2.5 w-2.5 bg-white/45 group-hover:bg-white/70'
											}`}
										/>
									</button>
								))}
							</div>

							<div className="mt-8 grid grid-cols-3 gap-3 lg:hidden">
								{heroSlides.map((slide, index) => (
									<button
										key={slide.image}
										onClick={() => setCurrentSlide(index)}
										className={`overflow-hidden rounded-xl border transition-all ${
											index === currentSlide
												? 'border-[#F4C542] shadow-lg shadow-[#F4C542]/35'
												: 'border-white/20'
										}`}
									>
										<img src={slide.image} alt={slide.title} className="h-24 w-full object-cover" />
									</button>
								))}
							</div>
						</div>

						<div className="relative hidden lg:block">
							<div className="grid grid-cols-2 gap-4">
								{heroSlides.map((slide, index) => (
									<motion.button
										type="button"
										key={slide.image}
										onClick={() => setCurrentSlide(index)}
										whileHover={{ y: -5 }}
										animate={{ y: index === 0 ? [0, -10, 0] : index === 1 ? [0, -7, 0] : [0, -11, 0] }}
										transition={{ duration: 5 + index, repeat: Infinity, ease: 'easeInOut' }}
										className={`relative overflow-hidden rounded-3xl border text-left shadow-2xl transition-all ${
											index === 0 ? 'col-span-2 h-64' : 'h-44'
										} ${
											index === currentSlide
												? 'border-[#F4C542] shadow-[#F4C542]/40'
												: 'border-white/25 shadow-black/20'
										}`}
									>
										<img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
										<div className="absolute inset-0 bg-gradient-to-t from-[#071D39]/70 to-transparent" />
										<p className="absolute bottom-4 left-4 pr-6 text-sm font-semibold text-white">
											{slide.title}
										</p>
									</motion.button>
								))}
							</div>
						</div>
					</div>
				</section>

				<section id="about" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
					<div className="grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
						<FadeIn>
							<p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#D62828]">About SchoolMesh</p>
							<h2 className={`${sora.className} text-3xl font-bold text-[#0B3A6E] sm:text-4xl`}>
								A modern backbone for school systems in Liberia.
							</h2>
							<p className="mt-5 text-base leading-relaxed text-[#1F2937]/80">
								SchoolMesh unifies academic operations, communication, and administration into one secure platform. Each school runs independently, while network leaders gain clean visibility and better control.
							</p>
							<div className="mt-8 space-y-3">
								<div className="flex items-start gap-3">
									<CheckCircle2 className="mt-0.5 h-5 w-5 text-[#22A06B]" />
									<p className="text-sm text-[#1F2937]/80">Fast onboarding and secure tenant separation for every school.</p>
								</div>
								<div className="flex items-start gap-3">
									<CheckCircle2 className="mt-0.5 h-5 w-5 text-[#22A06B]" />
									<p className="text-sm text-[#1F2937]/80">Role-aware experiences for students, teachers, and administrators.</p>
								</div>
								<div className="flex items-start gap-3">
									<CheckCircle2 className="mt-0.5 h-5 w-5 text-[#22A06B]" />
									<p className="text-sm text-[#1F2937]/80">Clear insights with reporting, notifications, and activity tracking.</p>
								</div>
							</div>
						</FadeIn>

						<FadeIn delay={0.08}>
							<div className="rounded-3xl border border-[#0B3A6E]/10 bg-white p-6 shadow-xl shadow-[#0B3A6E]/10 sm:p-8">
								<p className={`${sora.className} text-xl font-semibold text-[#0B3A6E]`}>How It Works</p>
								<div className="mt-6 space-y-4">
									{workflowSteps.map((step, index) => {
										const Icon = step.icon;
										return (
											<motion.div
												key={step.title}
												initial={{ opacity: 0, x: 20 }}
												whileInView={{ opacity: 1, x: 0 }}
												viewport={{ once: true }}
												transition={{ duration: 0.45, delay: 0.08 * index }}
												className="rounded-2xl bg-[#F7FAFF] p-4"
											>
												<div className="flex items-center gap-3">
													<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3A6E] text-white">
														<Icon className="h-5 w-5" />
													</div>
													<div>
														<p className="text-sm font-semibold text-[#0B3A6E]">{step.title}</p>
														<p className="text-sm text-[#1F2937]/75">{step.text}</p>
													</div>
												</div>
											</motion.div>
										);
									})}
								</div>
							</div>
						</FadeIn>
					</div>
				</section>

				<section id="features" className="bg-white py-20">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<FadeIn className="text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#D62828]">Features</p>
							<h2 className={`${sora.className} text-3xl font-bold text-[#0B3A6E] sm:text-4xl`}>
								Purpose-built modules for every role.
							</h2>
							<p className="mx-auto mt-4 max-w-2xl text-base text-[#1F2937]/75">
								Everything is designed around real school workflows, from classroom updates to tenant-wide governance.
							</p>
						</FadeIn>

						<div className="mt-12 grid gap-5 lg:grid-cols-3">
							{roleFeatures.map((group, index) => {
								const Icon = group.icon;
								return (
									<motion.div
										key={group.title}
										initial={{ opacity: 0, y: 24 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true, amount: 0.2 }}
										transition={{ duration: 0.55, delay: index * 0.08 }}
										whileHover={{ y: -8 }}
										className="h-full rounded-3xl border border-[#0B3A6E]/10 bg-[#F7FAFF] p-6 shadow-lg shadow-[#0B3A6E]/10"
									>
										<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B3A6E] text-white">
											<Icon className="h-5 w-5" />
										</div>
										<h3 className={`${sora.className} text-xl font-semibold text-[#0B3A6E]`}>{group.title}</h3>
										<p className="mt-2 text-sm text-[#1F2937]/75">{group.description}</p>
										<ul className="mt-5 space-y-2.5">
											{group.items.map((item) => (
												<li key={item} className="flex items-start gap-2 text-sm text-[#1F2937]/80">
													<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22A06B]" />
													<span>{item}</span>
												</li>
											))}
										</ul>
									</motion.div>
								);
							})}
						</div>

						<div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
							{platformHighlights.map((feature, index) => {
								const Icon = feature.icon;
								return (
									<FadeIn key={feature.title} delay={0.05 * index}>
										<div className="rounded-2xl border border-[#0B3A6E]/10 bg-white p-5 shadow-sm transition hover:shadow-md">
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

				<section id="platforms" className="py-20">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<FadeIn className="text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#D62828]">Platforms</p>
							<h2 className={`${sora.className} text-3xl font-bold text-[#0B3A6E] sm:text-4xl`}>
								Access SchoolMesh on web, mobile, and desktop.
							</h2>
							<p className="mx-auto mt-4 max-w-2xl text-base text-[#1F2937]/75">
								Choose the delivery channels that match how your school teams and families work every day.
							</p>
						</FadeIn>

						<div className="mt-10 grid gap-5 md:grid-cols-3">
							{accessPlatforms.map((platform, index) => {
								const Icon = platform.icon;
								return (
									<motion.div
										key={platform.name}
										initial={{ opacity: 0, y: 22 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true, amount: 0.2 }}
										transition={{ duration: 0.5, delay: index * 0.08 }}
										whileHover={{ y: -8 }}
										className="rounded-3xl border border-[#0B3A6E]/10 bg-white p-6 shadow-lg shadow-[#0B3A6E]/10"
									>
										<div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B3A6E] text-white">
											<Icon className="h-5 w-5" />
										</div>
										<h3 className={`${sora.className} text-xl font-semibold text-[#0B3A6E]`}>{platform.name}</h3>
										<p className="mt-2 text-sm text-[#1F2937]/75">{platform.description}</p>
									</motion.div>
								);
							})}
						</div>
					</div>
				</section>

				<section id="pricing" className="bg-white py-20">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<FadeIn className="text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#D62828]">Plans and Pricing</p>
							<h2 className={`${sora.className} text-3xl font-bold text-[#0B3A6E] sm:text-4xl`}>
								Super affordable pricing per student, per year.
							</h2>
							<p className="mx-auto mt-4 max-w-2xl text-base text-[#1F2937]/75">
								Pay annually based on active students. Pick the plan that fits your deployment model.
							</p>
						</FadeIn>

						<div className="mt-12 grid gap-5 lg:grid-cols-2">
							{pricingPlans.map((plan, index) => (
								<motion.div
									key={plan.name}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true, amount: 0.2 }}
									transition={{ duration: 0.55, delay: index * 0.08 }}
									className={`rounded-3xl border p-7 shadow-lg ${
										plan.name === 'Premium Plan'
											? 'border-[#D62828]/30 bg-[#FFF6F4] shadow-[#D62828]/10'
											: 'border-[#0B3A6E]/12 bg-[#F7FAFF] shadow-[#0B3A6E]/10'
									}`}
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<h3 className={`${sora.className} text-2xl font-semibold text-[#0B3A6E]`}>{plan.name}</h3>
											<p className="mt-1 text-sm font-medium text-[#1F2937]/70">{plan.coverage}</p>
										</div>
										<span
											className={`rounded-full px-3 py-1 text-xs font-semibold ${
												plan.name === 'Premium Plan'
													? 'bg-[#D62828]/12 text-[#A61C1C]'
													: 'bg-[#0B3A6E]/10 text-[#0B3A6E]'
											}`}
										>
											{plan.name === 'Premium Plan' ? 'Full App Access' : 'Web Only'}
										</span>
									</div>

									<div className="mt-6">
										<p className={`${sora.className} text-4xl font-bold text-[#0B3A6E]`}>{plan.price}</p>
										<p className="mt-1 text-sm text-[#1F2937]/70">{plan.period}</p>
									</div>

									<ul className="mt-6 space-y-2.5">
										{plan.features.map((item) => (
											<li key={item} className="flex items-start gap-2 text-sm text-[#1F2937]/80">
												<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22A06B]" />
												<span>{item}</span>
											</li>
										))}
									</ul>
								</motion.div>
							))}
						</div>
					</div>
				</section>

				<section id="partners" className="py-20">
					<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<FadeIn className="text-center">
							<p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#D62828]">Current Partners</p>
							<h2 className={`${sora.className} text-3xl font-bold text-[#0B3A6E] sm:text-4xl`}>
								Schools currently running SchoolMesh.
							</h2>
							<p className="mx-auto mt-4 max-w-2xl text-base text-[#1F2937]/75">
								Our network is expanding across Liberia as schools adopt a cleaner, faster operating model.
							</p>
						</FadeIn>

						<div className="mt-10 overflow-hidden rounded-3xl border border-[#0B3A6E]/10 bg-white p-4 shadow-lg shadow-[#0B3A6E]/8">
							<motion.div
								className="flex w-max gap-4"
								animate={{ x: ['0%', '-50%'] }}
								transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
							>
								{partnerLoop.map((partner, index) => (
									<div key={`${partner.name}-${index}`} className="w-[280px] rounded-2xl border border-[#0B3A6E]/10 bg-[#F7FAFF] p-4">
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className={`${sora.className} text-base font-semibold text-[#0B3A6E]`}>{partner.name}</p>
												<p className="mt-1 text-sm text-[#1F2937]/70">{partner.location}, Liberia</p>
											</div>
											<div className="rounded-full bg-[#0B3A6E]/8 p-2">
												<Building2 className="h-4 w-4 text-[#0B3A6E]" />
											</div>
										</div>
										<p className="mt-3 inline-flex items-center rounded-full bg-[#22A06B]/12 px-3 py-1 text-xs font-semibold text-[#0E7A4C]">
											{partner.users}
										</p>
									</div>
								))}
							</motion.div>
						</div>
					</div>
				</section>

				<section id="contact" className="bg-[#0B3A6E] py-20 text-white">
					<div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
						<FadeIn>
							<p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#F4C542]">Contact Us</p>
							<h2 className={`${sora.className} text-3xl font-bold sm:text-4xl`}>
								Talk with the SchoolMesh team.
							</h2>
							<p className="mt-4 max-w-lg text-sm text-white/80 sm:text-base">
								Planning rollout for one school or a full school network? We can map onboarding, migration, and admin setup.
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
