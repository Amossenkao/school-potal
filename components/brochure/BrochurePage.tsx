'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
	ArrowLeft,
	BarChart3,
	BookOpen,
	CalendarDays,
	CheckCircle2,
	CircleDollarSign,
	CloudOff,
	Database,
	FileText,
	Globe,
	LayoutDashboard,
	LifeBuoy,
	Lock,
	LogOut,
	Mail,
	Phone,
	Printer,
	QrCode,
	Share2,
	ShieldCheck,
	Star,
	UserCheck,
	Users,
	ChevronDown,
	ClipboardList,
	Smartphone,
	Award,
	DollarSign,
} from 'lucide-react';

const features = [
	{
		icon: FileText,
		title: 'Admissions',
		description:
			'Digital applications, automated workflows, real-time status tracking.',
		color: '#465fff',
	},
	{
		icon: UserCheck,
		title: 'Attendance',
		description:
			'Daily tracking with instant notifications and pattern analysis.',
		color: '#12b76a',
	},
	{
		icon: CircleDollarSign,
		title: 'Finance',
		description: 'Fees, invoices, payments, and financial reporting unified.',
		color: '#f79009',
	},
	{
		icon: BookOpen,
		title: 'Report Cards',
		description:
			'Professional reports with customizable templates and auto-grading.',
		color: '#8b5cf6',
	},
	{
		icon: Users,
		title: 'Student Portal',
		description: 'Students view reports, attendance, balances, and schedules.',
		color: '#06b6d4',
	},
	{
		icon: BarChart3,
		title: 'Analytics',
		description:
			'Live dashboards surfacing insights across academics and operations.',
		color: '#465fff',
	},
	{
		icon: CloudOff,
		title: 'Offline Mode',
		description:
			'Keep working without internet. Changes sync when back online.',
		color: '#f79009',
	},
	{
		icon: CalendarDays,
		title: 'Calendar',
		description:
			'Manage events, timetables, and academic calendars in one place.',
		color: '#8b5cf6',
	},
];

const stats = [
	{ value: '2,500+', label: 'Students', color: '#465fff' },
	{ value: '5+', label: 'Schools', color: '#12b76a' },
	{ value: '99.9%', label: 'Uptime', color: '#f79009' },
	{ value: '1.6M+', label: 'Records', color: '#8b5cf6' },
];

const schoolBenefits = [
	{
		icon: Globe,
		color: '#465fff',
		title: 'Custom Domain',
		description:
			'Establish a fully branded experience with your own dedicated web domain.',
	},
	{
		icon: Smartphone,
		color: '#12b76a',
		title: 'Progressive Web Apps (PWA)',
		description:
			'Install seamless, app-like experiences across desktop, iOS, Android, and tablets.',
	},
	{
		icon: Award,
		color: '#f79009',
		title: 'Easier & Transparent Grading',
		description:
			'Streamline score inputs, automated calculations, and real-time visibility for parents.',
	},
	{
		icon: DollarSign,
		color: '#8b5cf6',
		title: 'Transparent Financial Records',
		description:
			'Track fee payments, balance statements, and ledger summaries with absolute accuracy.',
	},
];

const testimonials = [
	{
		name: 'James Doe',
		role: 'Teacher · UCA',
		quote:
			'Submitting grades in SchoolMesh is very easy and convenient for us teachers.',
	},
	{
		name: 'Abu B. Bangura',
		role: 'Teacher · UCA',
		quote: 'Very intuitive and fast — makes grading completely hassle-free.',
	},
	{
		name: 'Mr. Joseph Kolleh',
		role: 'Proprietor · JRKMI',
		quote:
			"I've heard many positive things and I'm looking forward to introducing it at my school.",
	},
];

const pricingPlans = [
	{
		name: 'Starter',
		price: '500 LRD',
		period: 'per student / year',
		features: [
			'Full web platform',
			'Role-based dashboards',
			'Attendance & grading',
			'Parent & student portals',
			'Report cards & analytics',
		],
	},
	{
		name: 'Premium',
		price: '700 LRD',
		period: 'per student / year',
		features: [
			'Everything in Starter',
			"PWA (installable on iOS, Android, desktop)",
			'Offline-first with sync',
			'Push notifications',
		],
	},
];

function CompactDashboardMockup() {
	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-[8px] leading-tight shadow-sm">
			{/* browser chrome */}
			<div className="flex items-center gap-1.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
				<div className="h-2 w-2 rounded-full bg-[#FF5F57]" />
				<div className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
				<div className="h-2 w-2 rounded-full bg-[#28C840]" />
				<div className="mx-auto flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-0.5 text-[7px] text-black font-medium">
					<Lock className="h-[6px] w-[6px] text-[#12b76a]" />
					app.schoolmesh.io
				</div>
			</div>
			<div className="flex">
				{/* sidebar */}
				<div className="w-24 shrink-0 border-r border-gray-200 bg-[#111827] p-1.5">
					<div className="mb-2 flex items-center gap-1 border-b border-white/10 pb-1.5">
						<span className="text-[8px] font-bold text-white">
							School<span className="text-[#465fff]">Mesh</span>
						</span>
					</div>
					{[
						{ icon: LayoutDashboard, label: 'Dashboard', active: true },
						{ icon: Users, label: 'Users', active: false },
						{ icon: ClipboardList, label: 'Grading', active: false },
						{ icon: FileText, label: 'Reports', active: false },
						{ icon: UserCheck, label: 'Attendance', active: false },
					].map(({ icon: Icon, label, active }) => (
						<div
							key={label}
							className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[7px] ${active ? 'bg-[#465fff]/30 text-white' : 'text-white/80'}`}
							style={active ? { borderLeft: '1.5px solid #465fff' } : {}}
						>
							<Icon className="h-2.5 w-2.5 opacity-80" />
							{label}
						</div>
					))}
					<div className="mt-1 border-t border-white/10 pt-1">
						<div className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[7px] text-red-400">
							<LogOut className="h-2.5 w-2.5" /> Logout
						</div>
					</div>
				</div>
				{/* main */}
				<div className="flex-1 bg-[#f9fafb] p-2">
					<div className="mb-2 rounded-lg border border-gray-200 bg-white p-2">
						<div className="mb-0.5 text-[7px] font-semibold text-[#111827]">
							Good morning, Admin ✨
						</div>
						<div className="text-[6px] text-black font-medium">
							Full access · 2025–2026
						</div>
					</div>
					<div className="grid grid-cols-3 gap-1">
						{[
							{ label: 'Students', value: '2,847', color: '#465fff' },
							{ label: 'Teachers', value: '186', color: '#12b76a' },
							{ label: 'Pass Rate', value: '86%', color: '#f79009' },
						].map((s) => (
							<div
								key={s.label}
								className="rounded border border-gray-200 bg-white p-1 text-center"
							>
								<div className="text-[6px] text-black font-medium">
									{s.label}
								</div>
								<div
									className="text-[10px] font-bold"
									style={{ color: s.color }}
								>
									{s.value}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export default function BrochurePage() {
	const [qrDataUrl, setQrDataUrl] = useState('');

	useEffect(() => {
		QRCode.toDataURL('https://schoolmesh.net', {
			errorCorrectionLevel: 'M',
			margin: 1,
			width: 256,
			color: { dark: '#111827', light: '#FFFFFF' },
		}).then(setQrDataUrl);
	}, []);

	const handleDownloadPdf = useCallback(() => {
		window.print();
	}, []);

	/* Shared column divider style */
	const colDivider = 'border-l border-gray-100 pl-8';

	return (
		<>
			<style
				dangerouslySetInnerHTML={{
					__html: `
				@media print {
					@page { size: A4 landscape; margin: 0; }
					.no-print { display: none !important; }
					.brochure-body { background: white !important; }
					.brochure-page {
						width: 297mm !important;
						height: 210mm !important;
						page-break-after: always;
						box-shadow: none !important;
						margin: 0 !important;
						border-radius: 0 !important;
						border: none !important;
						overflow: hidden !important;
					}
					.brochure-page:last-child { page-break-after: auto; }
					* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
				}
			`,
				}}
			/>

			{/* Toolbar */}
			<div className="no-print fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-xl">
				<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
					<div className="flex items-center gap-3">
						<Link
							href="/"
							className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-black hover:bg-gray-50"
						>
							<ArrowLeft className="h-3.5 w-3.5" /> Back
						</Link>
						<span className="hidden text-sm font-semibold text-black sm:inline">
							SchoolMesh Brochure
						</span>
					</div>
					<button
						type="button"
						onClick={handleDownloadPdf}
						className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
					>
						<Printer className="h-3.5 w-3.5" />
						<span className="hidden sm:inline">Print / Save as PDF</span>
					</button>
				</div>
			</div>

			<div className="brochure-body pt-16 print:pt-0 bg-gray-100 min-h-screen">
				<div className="mx-auto max-w-[297mm] space-y-8 py-12 px-4 print:space-y-0 print:py-0 print:px-0">
					{/* ══════════════════════ PAGE 1 ══════════════════════ */}
					<div
						className="brochure-page overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg print:rounded-none print:shadow-none"
						style={{ aspectRatio: '297/210' }}
					>
						<div className="grid h-full grid-cols-3 p-8 gap-8">
							{/* COL 1 — Dashboard + Standout Capabilities */}
							<div className="flex flex-col">
								<div className="mb-4 border-b border-gray-100 pb-3">
									<p className="text-[10px] font-bold uppercase tracking-widest text-[#465fff]">
										Platform
									</p>
									<h2 className="mt-0.5 text-xl font-bold text-[#111827]">
										What sets us apart.
									</h2>
								</div>

								{/* Dashboard mockup */}
								<div className="mb-4">
									<CompactDashboardMockup />
								</div>

								{/* 3 standout capabilities */}
								<div className="space-y-2.5">
									{[
										{
											icon: Share2,
											color: '#465fff',
											title: 'Digital Report Sharing',
											text: 'Students share reports instantly via link — no printing, from any device, anywhere in the world.',
										},
										{
											icon: QrCode,
											color: '#12b76a',
											title: 'QR Code Verification',
											text: 'Every report includes a unique QR code to verify authenticity — protecting against forgery.',
										},
										{
											icon: LifeBuoy,
											color: '#f79009',
											title: 'Responsive Support',
											text: 'Dedicated team for onboarding, training, and migration. Premium customers get priority response.',
										},
									].map((item) => (
										<div
											key={item.title}
											className="flex items-start gap-3 rounded-xl border p-3"
											style={{
												borderColor: `${item.color}30`,
												backgroundColor: `${item.color}05`,
											}}
										>
											<div
												className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
												style={{ backgroundColor: `${item.color}15` }}
											>
												<item.icon
													className="h-3.5 w-3.5"
													style={{ color: item.color }}
												/>
											</div>
											<div>
												<h3 className="text-xs font-bold text-[#111827]">
													{item.title}
												</h3>
												<p className="mt-0.5 text-[10px] leading-relaxed text-black">
													{item.text}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>

							{/* COL 2 — Features Grid */}
							<div className={`flex flex-col ${colDivider}`}>
								<div className="mb-4 border-b border-gray-100 pb-3">
									<p className="text-[10px] font-bold uppercase tracking-widest text-[#465fff]">
										Features
									</p>
									<h2 className="mt-0.5 text-xl font-bold text-[#111827]">
										Everything your school needs.
									</h2>
									<p className="mt-1 text-xs text-black font-medium">
										Purpose-built modules covering every aspect of school
										management.
									</p>
								</div>

								<div className="grid grid-cols-2 gap-2 flex-1">
									{features.map((f) => (
										<div
											key={f.title}
											className="flex items-start gap-2 rounded-xl border border-gray-100 p-3"
										>
											<div
												className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
												style={{ backgroundColor: `${f.color}12` }}
											>
												<f.icon
													className="h-3.5 w-3.5"
													style={{ color: f.color }}
												/>
											</div>
											<div>
												<h3 className="text-xs font-bold text-[#111827]">
													{f.title}
												</h3>
												<p className="mt-0.5 text-[10px] leading-relaxed text-black">
													{f.description}
												</p>
											</div>
										</div>
									))}
								</div>

								<p className="mt-3 text-center text-[9px] font-semibold text-black">
									01 / 02
								</p>
							</div>

							{/* COL 3 — Brand + Stats + QR CTA (Centered Vertically) */}
							<div
								className={`flex flex-col h-full justify-between ${colDivider}`}
							>
								<div className="my-auto flex flex-col justify-center space-y-6">
									{/* Larger Logo + wordmark */}
									<div className="flex flex-col items-start gap-3">
										<Image
											src="/images/SchoolMesh.png"
											alt="SchoolMesh"
											width={80}
											height={80}
											className="h-20 w-20 rounded-2xl object-contain shadow-sm"
										/>
										<div>
											<h1 className="text-4xl font-extrabold tracking-tight text-[#111827]">
												School<span className="text-[#465fff]">Mesh</span>
											</h1>
											<p className="text-xs font-bold text-[#465fff] tracking-wide mt-0.5">
												One platform. Every school.
											</p>
										</div>
									</div>

									<p className="text-sm leading-relaxed text-black font-normal">
										The connected operating system for modern schools — managing
										everything from admissions to analytics in one platform your
										whole school will actually enjoy using.
									</p>

									<div className="inline-flex items-center gap-2 self-start rounded-full border border-[#12b76a]/30 bg-[#12b76a]/8 px-3.5 py-1.5">
										<span className="h-2 w-2 rounded-full bg-[#12b76a]" />
										<span className="text-xs font-semibold text-black">
											Available for schools nationwide
										</span>
									</div>

									{/* Stats */}
									<div className="grid grid-cols-2 gap-3">
										{stats.map((s) => (
											<div
												key={s.label}
												className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center"
											>
												<p
													className="text-2xl font-bold"
													style={{ color: s.color }}
												>
													{s.value}
												</p>
												<p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
													{s.label}
												</p>
											</div>
										))}
									</div>

									{/* QR CTA */}
									<div className="flex items-center gap-4 rounded-xl bg-[#111827] p-4">
										<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white p-1">
											{qrDataUrl ? (
												<img
													src={qrDataUrl}
													alt="SchoolMesh QR"
													className="h-full w-full object-contain"
												/>
											) : (
												<QrCode className="h-8 w-8 text-black" />
											)}
										</div>
										<div>
											<p className="text-sm font-bold text-white">
												Scan to get started
											</p>
											<p className="mt-0.5 text-[10px] font-medium text-gray-200">
												No credit card required
											</p>
											<p className="mt-1 text-xs font-bold text-[#465fff]">
												www.schoolmesh.net
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* ══════════════════════ PAGE 2 ══════════════════════ */}
					<div
						className="brochure-page overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg print:rounded-none print:shadow-none"
						style={{ aspectRatio: '297/210' }}
					>
						<div className="grid h-full grid-cols-3 p-8 gap-8">
							{/* COL 1 — About + Benefits to the School */}
							<div className="flex flex-col">
								<div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
									<div className="flex items-center gap-2">
										<Image
											src="/images/SchoolMesh.png"
											alt="SchoolMesh"
											width={24}
											height={24}
											className="h-6 w-6 rounded object-contain"
										/>
										<span className="text-xs font-bold text-[#111827]">
											SchoolMesh
										</span>
									</div>
									<span className="text-[10px] font-bold text-black">
										02 / 02
									</span>
								</div>

								<p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#465fff]">
									About
								</p>
								<h2 className="mb-2 text-xl font-bold text-[#111827]">
									What is SchoolMesh?
								</h2>
								<p className="mb-4 text-xs leading-relaxed text-black">
									SchoolMesh is a complete cloud-based school management
									platform that connects administrators, teachers, parents, and
									students in one intelligent system — built for how schools
									actually operate.
								</p>

								{/* Benefits to the School Section (Replaced section) */}
								<div className="mt-2 flex flex-col justify-between flex-1">
									<div className="border-b border-gray-100 pb-2">
										<p className="text-[10px] font-bold uppercase tracking-widest text-[#465fff]">
											Why Choose Us
										</p>
										<h3 className="text-base font-bold text-[#111827]">
											Benefits to the School
										</h3>
									</div>

									<div className="space-y-2.5 my-auto">
										{schoolBenefits.map((item) => (
											<div
												key={item.title}
												className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-2.5"
											>
												<div
													className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
													style={{ backgroundColor: `${item.color}15` }}
												>
													<item.icon
														className="h-3.5 w-3.5"
														style={{ color: item.color }}
													/>
												</div>
												<div>
													<h4 className="text-xs font-bold text-[#111827]">
														{item.title}
													</h4>
													<p className="mt-0.5 text-[10px] leading-relaxed text-black">
														{item.description}
													</p>
												</div>
											</div>
										))}
									</div>
								</div>
							</div>

							{/* COL 2 — Pricing */}
							<div className={`flex flex-col ${colDivider}`}>
								<div className="mb-4 border-b border-gray-100 pb-3">
									<p className="text-[10px] font-bold uppercase tracking-widest text-[#465fff]">
										Pricing
									</p>
									<h2 className="mt-0.5 text-xl font-bold text-[#111827]">
										Simple, affordable pricing.
									</h2>
									<p className="mt-1 text-xs text-black font-medium">
										Two per-student annual plans, plus a custom option for
										networks.
									</p>
								</div>

								{/* Per-student plans */}
								<div className="mb-4 space-y-3">
									{pricingPlans.map((plan, idx) => (
										<div
											key={plan.name}
											className={`rounded-xl border p-4 ${idx === 1 ? 'border-[#465fff]/30 bg-[#465fff]/[0.03]' : 'border-gray-200'}`}
										>
											<div className="mb-3 flex items-start justify-between">
												<div>
													<h3 className="text-sm font-bold text-[#111827]">
														{plan.name}
													</h3>
													<p className="text-[10px] font-semibold text-black">
														{plan.period}
													</p>
												</div>
												<div className="text-right">
													<p className="text-2xl font-bold text-[#465fff]">
														{plan.price}
													</p>
												</div>
											</div>
											<div className="space-y-1">
												{plan.features.map((f) => (
													<div key={f} className="flex items-center gap-1.5">
														<CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#12b76a]" />
														<span className="text-xs text-black">{f}</span>
													</div>
												))}
											</div>
										</div>
									))}
								</div>

								{/* Enterprise */}
								<div className="rounded-xl border-2 border-dashed border-[#465fff]/30 bg-[#465fff]/[0.03] p-4">
									<div className="mb-2 flex items-center justify-between">
										<h3 className="text-sm font-bold text-[#111827]">
											Custom / Enterprise
										</h3>
										<span className="rounded-full bg-[#465fff]/10 px-2.5 py-0.5 text-[9px] font-bold text-[#465fff]">
											CUSTOM
										</span>
									</div>
									<p className="mb-3 text-xs leading-relaxed text-black">
										For schools and networks preferring a fixed annual fee —
										pre-agreed lump sum based on projected enrollment.
										Predictable budgeting with priority support.
									</p>
									<div className="space-y-1">
										{[
											'Lump-sum annual pricing',
											'Predictable budgeting',
											'Priority onboarding & support',
											'Custom branding & integrations',
										].map((f) => (
											<div key={f} className="flex items-center gap-1.5">
												<CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#465fff]" />
												<span className="text-xs text-black">{f}</span>
											</div>
										))}
									</div>
								</div>
							</div>

							{/* COL 3 — Contact + Testimonials */}
							<div className={`flex flex-col ${colDivider}`}>
								<div className="mb-4 border-b border-gray-100 pb-3">
									<p className="text-[10px] font-bold uppercase tracking-widest text-[#465fff]">
										Contact
									</p>
									<h2 className="mt-0.5 text-xl font-bold text-[#111827]">
										Get in touch.
									</h2>
									<p className="mt-1 text-xs text-black font-medium">
										Questions about SchoolMesh? We're here to help with
										onboarding, migration, and setup.
									</p>
								</div>

								{/* Contact details */}
								<div className="mb-5 space-y-3">
									{[
										{
											icon: Mail,
											color: '#465fff',
											label: 'Email',
											value: 'info@schoolmesh.net',
										},
										{
											icon: Phone,
											color: '#12b76a',
											label: 'Phone',
											value: '+231 776 949 463 / +231 887 956 586',
										},
										{
											icon: Globe,
											color: '#8b5cf6',
											label: 'Website',
											value: 'www.schoolmesh.net',
										},
										{
											icon: Globe,
											color: '#f79009',
											label: 'Location',
											value:
												'Unity Town, Lower Johnsonville, Montserrado County, Liberia',
										},
									].map((item) => (
										<div key={item.label} className="flex items-start gap-3">
											<div
												className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
												style={{ backgroundColor: `${item.color}10` }}
											>
												<item.icon
													className="h-4 w-4"
													style={{ color: item.color }}
												/>
											</div>
											<div>
												<p className="text-[10px] font-bold text-[#111827]">
													{item.label}
												</p>
												<p className="text-xs text-black">{item.value}</p>
											</div>
										</div>
									))}
								</div>

								{/* Testimonials */}
								<div className="mb-4 space-y-2">
									<p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#465fff]">
										What people say
									</p>
									{testimonials.map((t) => (
										<div
											key={t.name}
											className="rounded-xl border border-gray-100 bg-gray-50 p-3"
										>
											<div className="mb-1.5 flex gap-0.5">
												{[1, 2, 3, 4, 5].map((s) => (
													<Star
														key={s}
														className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]"
													/>
												))}
											</div>
											<p className="text-xs italic leading-relaxed text-black">
												&quot;{t.quote}&quot;
											</p>
											<p className="mt-1.5 text-xs font-bold text-[#111827]">
												{t.name}{' '}
												<span className="font-semibold text-gray-700">
													· {t.role}
												</span>
											</p>
										</div>
									))}
								</div>

								<p className="mt-auto text-center text-[10px] font-bold text-black">
									© {new Date().getFullYear()} SchoolMesh. All rights reserved.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
