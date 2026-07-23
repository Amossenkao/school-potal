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
	ChevronDown,
	CircleDollarSign,
	ClipboardList,
	CloudOff,
	Database,
	FileText,
	Globe,
	LayoutDashboard,
	Lock,
	LogOut,
	Mail,
	Phone,
	Printer,
	QrCode,
	LifeBuoy,
	Share2,
	ShieldCheck,
	Star,
	UserCheck,
	Users,
} from 'lucide-react';

const features = [
	{ icon: FileText, title: 'Admissions', description: 'Streamline enrollment with digital applications, automated workflows, and real-time status tracking.', color: '#465fff' },
	{ icon: UserCheck, title: 'Attendance', description: 'Track daily attendance with instant notifications, pattern analysis, and reporting dashboards.', color: '#12b76a' },
	{ icon: CircleDollarSign, title: 'Finance', description: 'Manage fees, invoices, payments, and financial reporting from one unified system.', color: '#f79009' },
	{ icon: BookOpen, title: 'Report Cards', description: 'Generate professional report cards with customizable templates and automated grade calculations.', color: '#8b5cf6' },
	{ icon: Users, title: 'Student Portal', description: "Students can view their reports, attendance, balances and schedules", color: '#06b6d4' },
	{ icon: BarChart3, title: 'Analytics', description: 'Surface actionable insights across academics, operations, and student outcomes with live dashboards.', color: '#465fff' },
	{ icon: CloudOff, title: 'Offline Mode', description: 'Keep working without internet. Changes sync automatically when connectivity returns.', color: '#f79009' },
];

const stats = [
	{ value: '2,500+', label: 'Students', color: '#465fff' },
	{ value: '5+', label: 'Schools', color: '#12b76a' },
	{ value: '99.9%', label: 'Availability', color: '#f79009' },
	{ value: '1.6M+', label: 'Records Managed', color: '#8b5cf6' },
];

const testimonials = [
	{
		name: 'James Doe',
		role: 'Teacher',
		school: 'Upstairs Christian Academy',
		quote:
			'Submitting grades in the SchoolMesh system is very easy and convenient for us teachers.',
	},
	{
		name: 'Abu B. Bangura',
		role: 'Teacher',
		school: 'Upstairs Christian Academy',
		quote:
			'This platform is very intuitive, fast, and makes grading hassle-free.',
	},
	{
		name: 'Mr. Joseph Kolleh',
		role: 'Proprietor',
		school: 'Jessica Rachel Kolleh Memorial Institute',
		quote:
			"I've heard many positive things from my teachers who have used this system, and I'm looking forward to introducing it at my school next academic year.",
	},
];

const comparisonRows = [
	{ feature: 'Cloud-Native', schoolMesh: true, traditional: false },
	{ feature: 'Offline Support', schoolMesh: true, traditional: false },
	{ feature: 'Mobile-First Design', schoolMesh: true, traditional: false },
	{ feature: 'Real-Time Updates', schoolMesh: true, traditional: false },
	{ feature: 'Modern Security', schoolMesh: true, traditional: 'partial' },
	{ feature: 'Intuitive UI', schoolMesh: true, traditional: false },
	{ feature: 'Multi-Tenant Architecture', schoolMesh: true, traditional: false },
];

const pricingPlans = [
	{
		name: 'Starter',
		price: '500 LRD',
		period: 'per student · per academic year',
		description: 'Full web platform access',
		features: ['Full web platform access', 'Role-based dashboards', 'Attendance & grading', 'Parent & student portals', 'Report cards & analytics'],
	},
	{
		name: 'Premium',
		price: '700 LRD',
		period: 'per student · per academic year',
		description: 'Web + dedicated mobile & desktop apps',
		features: ['Everything in Starter', 'Dedicated mobile app (iOS & Android)', 'Desktop app (Windows & macOS)', 'Offline-first with sync', 'Push notifications'],
	},
];

const customPlan = {
	name: 'Custom / Enterprise',
	description: 'For schools and networks that prefer a fixed annual fee. We pre-agree a lump sum based on your projected enrollment — no per-student billing, predictable budgeting, and priority support.',
	features: ['Lump-sum annual pricing', 'Based on projected enrollment', 'Predictable budgeting', 'Priority onboarding & support', 'Custom branding & integrations'],
};

function CompactDashboardMockup() {
	return (
		<div className="overflow-hidden rounded-lg border border-gray-200 bg-white text-[8px] leading-tight">
			<div className="flex border-b border-gray-200 bg-gray-50 px-2 py-1">
				<div className="flex gap-1">
					<div className="h-1.5 w-1.5 rounded-full bg-[#FF5F57]" />
					<div className="h-1.5 w-1.5 rounded-full bg-[#FEBC2E]" />
					<div className="h-1.5 w-1.5 rounded-full bg-[#28C840]" />
				</div>
				<div className="mx-auto flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-[6px] text-gray-400">
					<Lock className="h-[5px] w-[5px] text-[#12b76a]" />
					app.schoolmesh.io
				</div>
			</div>
			<div className="flex">
				<div className="hidden w-24 shrink-0 border-r border-gray-200 bg-[#111827] p-1.5 lg:block">
					<div className="mb-2 flex items-center gap-1 border-b border-white/10 pb-1.5">
						<Image src="/images/SchoolMesh.png" alt="SchoolMesh" width={16} height={16} className="h-4 w-4 rounded object-contain" />
						<span className="text-[7px] font-bold text-white">School<span className="text-[#465fff]">Mesh</span></span>
					</div>
					{/* Dashboard - active */}
					<div className="flex items-center gap-1 rounded bg-[#465fff]/30 px-1.5 py-0.5 text-[6px] text-white" style={{ borderLeft: '1.5px solid #465fff' }}>
						<LayoutDashboard className="h-2 w-2 opacity-80" />
						Dashboard
					</div>
					{/* User Management - collapsed */}
					<div className="flex items-center justify-between rounded px-1.5 py-0.5 text-[6px] text-white/45">
						<div className="flex items-center gap-1">
							<Users className="h-2 w-2 opacity-80" />
							User Management
						</div>
						<ChevronDown className="h-1.5 w-1.5 opacity-40" />
					</div>
					{/* Grading - collapsed */}
					<div className="flex items-center justify-between rounded px-1.5 py-0.5 text-[6px] text-white/45">
						<div className="flex items-center gap-1">
							<ClipboardList className="h-2 w-2 opacity-80" />
							Grading
						</div>
						<ChevronDown className="h-1.5 w-1.5 opacity-40" />
					</div>
					{/* Academic Reports - collapsed */}
					<div className="flex items-center justify-between rounded px-1.5 py-0.5 text-[6px] text-white/45">
						<div className="flex items-center gap-1">
							<FileText className="h-2 w-2 opacity-80" />
							Academic Reports
						</div>
						<ChevronDown className="h-1.5 w-1.5 opacity-40" />
					</div>
					{/* Calendar & Schedules - collapsed */}
					<div className="flex items-center justify-between rounded px-1.5 py-0.5 text-[6px] text-white/45">
						<div className="flex items-center gap-1">
							<CalendarDays className="h-2 w-2 opacity-80" />
							Calendar & Schedules
						</div>
						<ChevronDown className="h-1.5 w-1.5 opacity-40" />
					</div>
					{/* Attendance */}
					<div className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[6px] text-white/45">
						<UserCheck className="h-2 w-2 opacity-80" />
						Attendance
					</div>
					{/* Logout */}
					<div className="mt-1 border-t border-white/10 pt-1">
						<div className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[6px] text-red-400">
							<LogOut className="h-2 w-2 opacity-80" />
							Logout
						</div>
					</div>
				</div>
				<div className="flex-1 bg-[#f9fafb] p-2">
					<div className="relative mb-2 overflow-hidden rounded-md border border-gray-200 bg-white p-2">
						<div className="absolute -top-3 -right-3 h-10 w-10 rounded-full bg-[radial-gradient(circle,rgba(70,95,255,0.15)_0%,transparent_70%)]" />
						<div className="relative z-10">
							<div className="mb-0.5 inline-flex items-center gap-0.5 rounded-full border border-[#465fff]/20 bg-[#465fff]/10 px-1.5 py-[1px] text-[5px] font-medium text-[#465fff]">
								<ShieldCheck className="h-[5px] w-[5px]" /> Admin
							</div>
							<div className="text-[8px] font-semibold text-[#111827]">Good morning, Admin ✨</div>
							<div className="text-[5px] text-gray-400">Full access · 2025-2026</div>
						</div>
					</div>
					<div className="mb-1.5 flex gap-0.5 rounded border border-gray-200 bg-gray-50 p-[2px]">
						{['Insights', 'Performance', 'Enrollment'].map((tab, i) => (
							<div key={tab} className={`flex-1 rounded px-1 py-[1px] text-center text-[5px] font-medium ${i === 0 ? 'bg-[#465fff] text-white' : 'text-gray-400'}`}>{tab}</div>
						))}
					</div>
					<div className="grid grid-cols-3 gap-1">
						{[
							{ label: 'Students', value: '2,847', color: '#465fff' },
							{ label: 'Teachers', value: '186', color: '#12b76a' },
							{ label: 'Pass Rate', value: '86%', color: '#f79009' },
						].map((s) => (
							<div key={s.label} className="rounded border border-gray-200 bg-white p-1">
								<div className="text-[5px] text-gray-400">{s.label}</div>
								<div className="text-[8px] font-bold" style={{ color: s.color }}>{s.value}</div>
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

	return (
		<>
			<style dangerouslySetInnerHTML={{ __html: `
				@media print {
					@page { size: A4 landscape; margin: 0; }
					.brochure-toolbar { display: none !important; }
					.brochure-nav { display: none !important; }
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
			`}} />

			{/* Toolbar */}
			<div className="brochure-toolbar fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-xl print:hidden">
				<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8">
					<div className="flex items-center gap-3">
						<Link
							href="/"
							className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							Back
						</Link>
						<div className="hidden h-5 w-px bg-gray-200 sm:block" />
						<span className="hidden text-sm font-medium text-gray-400 sm:inline">SchoolMesh Brochure</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleDownloadPdf}
							className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
						>
							<Printer className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">Print / Save as PDF</span>
						</button>
					</div>
				</div>
			</div>

			{/* Brochure Pages */}
			<div className="brochure-body pt-16 print:pt-0 bg-gray-100 min-h-screen">
				<div className="mx-auto max-w-[297mm] space-y-8 py-16 px-4 print:space-y-0 print:py-0 print:px-0">

					{/* ═══════════════════════════════════════════════ PAGE 1: Cover ═══════════════════════════════════════════════ */}
					<div className="brochure-page overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg print:rounded-none print:shadow-none print:border-none" style={{ aspectRatio: '297/210' }}>
						<div className="flex h-full flex-row gap-16 p-8">
							{/* Left Column: Light theme with watermark logo */}
							<div className="relative flex flex-1 flex-col bg-gray-50 items-center justify-center">
								<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.06]">
									<Image src="/images/SchoolMesh.png" alt="" width={160} height={160} className="h-40 w-40 object-contain" />
								</div>
							</div>

							{/* Right Column: Dark theme with school info */}
							<div className="relative flex flex-1 flex-col bg-[#111827] px-10 justify-center">
								<div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-[#465fff]/10" />
								<div className="absolute -bottom-24 -right-12 h-64 w-64 rounded-full bg-[#12b76a]/8" />
								<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full border border-white/5" />
								<Image
									src="/images/SchoolMesh.png"
									alt="SchoolMesh"
									width={64}
									height={64}
									className="mb-5 h-16 w-16 rounded-xl object-contain"
								/>
								<h1 className="mb-1 text-4xl font-bold tracking-tight text-white">
									School<span className="text-[#465fff]">Mesh</span>
								</h1>
								<p className="mb-4 text-sm font-medium text-[#465fff]">One platform. Every school.</p>
								<p className="mb-6 text-sm leading-relaxed text-gray-400 max-w-sm">
									The connected operating system for modern schools. Manage everything
									from admissions to analytics — in one platform your whole school will
									actually enjoy using.
								</p>
								<div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 self-start">
									<span className="h-2 w-2 rounded-full bg-[#12b76a]" />
									<span className="text-xs text-gray-300">Now available for schools nationwide</span>
								</div>
								<div className="grid grid-cols-2 gap-3 mb-6">
									{stats.map((s) => (
										<div key={s.label} className="rounded-lg bg-white/5 p-3 text-center">
											<p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
											<p className="mt-0.5 text-[9px] uppercase tracking-wider text-gray-400">{s.label}</p>
										</div>
									))}
								</div>
								<p className="text-xs text-gray-500">www.schoolmesh.net</p>
							</div>
						</div>
					</div>

					{/* ═══════════════════════════════════════════════ PAGE 2: About + Platform ═══════════════════════════════════════════════ */}
					<div className="brochure-page overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg print:rounded-none print:shadow-none print:border-none" style={{ aspectRatio: '297/210' }}>
						<div className="flex h-full flex-row gap-16 p-8">
							{/* Left Column */}
							<div className="flex flex-1 flex-col">
								<div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
									<div className="flex items-center gap-2">
										<Image src="/images/SchoolMesh.png" alt="SchoolMesh" width={20} height={20} className="h-5 w-5 rounded object-contain" />
										<span className="text-xs font-bold text-[#111827]">SchoolMesh</span>
									</div>
									<span className="text-[10px] text-gray-400">02 / 04</span>
								</div>

								<p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#465fff]">About SchoolMesh</p>
								<h2 className="mb-2 text-2xl font-bold tracking-tight text-[#111827]">What is SchoolMesh?</h2>
								<p className="mb-5 text-xs leading-relaxed text-gray-500">
									SchoolMesh is a complete cloud-based school management platform that connects
									administrators, teachers, parents, and students in one intelligent system.
									Built with modern technology and designed for how schools actually operate.
								</p>

								<div className="mb-5 space-y-3">
									{[
										{ icon: Globe, title: 'Cloud-Native', text: 'Access from any device, anywhere. No hardware to maintain. Always up to date with automatic updates.', color: '#465fff' },
										{ icon: Database, title: 'Multi-Tenant Architecture', text: 'Each school gets its own branded environment with independent data, users, and settings — all on one shared platform.', color: '#12b76a' },
										{ icon: CloudOff, title: 'Offline-First Design', text: 'Keep working without internet. Teachers and admins can continue offline — everything syncs automatically when back online.', color: '#f79009' },
										{ icon: ShieldCheck, title: 'Enterprise Security', text: 'Industry-standard encryption, secure data isolation, role-based access controls, and regular security audits.', color: '#8b5cf6' },
									].map((item) => (
										<div key={item.title} className="flex gap-3 rounded-lg bg-gray-50 p-3">
											<div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${item.color}12` }}>
												<item.icon className="h-4 w-4" style={{ color: item.color }} />
											</div>
											<div>
												<h3 className="text-xs font-bold text-[#111827]">{item.title}</h3>
												<p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">{item.text}</p>
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Right Column */}
							<div className="flex flex-1 flex-col">
								<div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
									<span className="text-xs font-bold text-[#111827]">Why SchoolMesh</span>
									<span className="text-[10px] text-gray-400">Comparison</span>
								</div>

								<h3 className="mb-2 text-lg font-bold text-[#111827]">Built for modern schools.</h3>
								<p className="mb-4 text-[10px] leading-relaxed text-gray-500">
									SchoolMesh goes beyond basic management with features designed to protect
									integrity, strengthen family connections, and keep your school running from anywhere.
								</p>

								{/* Comparison Table */}
								<div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
									<table className="w-full">
										<thead>
											<tr className="bg-gray-50">
												<th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-500">Feature</th>
												<th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-[#465fff]">SchoolMesh</th>
												<th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-gray-400">Traditional</th>
											</tr>
										</thead>
										<tbody>
											{comparisonRows.map((row, i) => (
												<tr key={row.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
													<td className="px-3 py-1.5 text-[10px] font-medium text-[#111827]">{row.feature}</td>
													<td className="px-3 py-1.5 text-center">
														{row.schoolMesh === true ? (
															<CheckCircle2 className="mx-auto h-3.5 w-3.5 text-[#12b76a]" />
														) : (
															<span className="text-[10px] text-gray-400">Partial</span>
														)}
													</td>
													<td className="px-3 py-1.5 text-center">
														{row.traditional === true ? (
															<CheckCircle2 className="mx-auto h-3.5 w-3.5 text-gray-400" />
														) : row.traditional === 'partial' ? (
															<span className="text-[10px] text-gray-400">Partial</span>
														) : (
															<span className="text-[10px] text-gray-300">—</span>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>

					{/* ═══════════════════════════════════════════════ PAGE 3: Features ═══════════════════════════════════════════════ */}
					<div className="brochure-page overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg print:rounded-none print:shadow-none print:border-none" style={{ aspectRatio: '297/210' }}>
						<div className="flex h-full flex-row gap-16 p-8">
							{/* Left Column: Features + Dashboard Preview */}
							<div className="flex flex-1 flex-col">
								<div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
									<div className="flex items-center gap-2">
										<Image src="/images/SchoolMesh.png" alt="SchoolMesh" width={20} height={20} className="h-5 w-5 rounded object-contain" />
										<span className="text-xs font-bold text-[#111827]">SchoolMesh</span>
									</div>
									<span className="text-[10px] text-gray-400">03 / 04</span>
								</div>

								<p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#465fff]">Features</p>
								<h2 className="mb-2 text-xl font-bold tracking-tight text-[#111827]">Everything your school needs.</h2>
								<p className="mb-2 text-[10px] leading-relaxed text-gray-500">
									Purpose-built modules that cover every aspect of school management, from
									admissions to analytics.
								</p>

								<div className="mb-2 grid grid-cols-2 gap-2">
									{features.slice(0, 4).map((f) => (
										<div key={f.title} className="flex items-start gap-1.5 rounded-lg border border-gray-100 p-2">
											<div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${f.color}10` }}>
												<f.icon className="h-3 w-3" style={{ color: f.color }} />
											</div>
											<div>
												<h3 className="text-[9px] font-bold text-[#111827]">{f.title}</h3>
												<p className="mt-0.5 text-[7px] leading-relaxed text-gray-500">{f.description}</p>
											</div>
										</div>
									))}
								</div>

								<p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#465fff]">Dashboard</p>
								<h3 className="mb-1 text-sm font-bold tracking-tight text-[#111827]">Everything you need, one glance away.</h3>
								<p className="mb-2 text-[8px] leading-relaxed text-gray-500">
									A role-aware dashboard that greets every user by name, shows live
									insights, and adapts to your role.
								</p>

								<div className="flex-1 overflow-hidden">
									<CompactDashboardMockup />
								</div>
							</div>

							{/* Right Column: Key Differentiators */}
							<div className="flex flex-1 flex-col">
								<div className="mb-4 border-b border-gray-100 pb-3">
									<span className="text-xs font-bold text-[#111827]">Why Schools Choose Us</span>
								</div>

								<p className="mb-4 text-[10px] leading-relaxed text-gray-500">
									Beyond the core modules, SchoolMesh delivers standout capabilities that
									set it apart from any other platform.
								</p>

								{/* Emphasis Features */}
								<div className="mb-4 space-y-3">
									{/* Report Sharing */}
									<div className="rounded-xl border border-[#465fff]/20 bg-[#465fff]/[0.03] p-3.5">
										<div className="mb-2 flex items-center gap-2">
											<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#465fff]/10">
												<Share2 className="h-3.5 w-3.5 text-[#465fff]" />
											</div>
											<h3 className="text-[11px] font-bold text-[#111827]">Digital Report Sharing</h3>
										</div>
										<p className="text-[9px] leading-relaxed text-gray-500">
											Students share reports digitally with parents or sponsors — instantly,
											from any device, anywhere in the world. One-click share via link or
											direct transfer. No printing required.
										</p>
									</div>

									{/* QR Code Security */}
									<div className="rounded-xl border border-[#12b76a]/20 bg-[#12b76a]/[0.03] p-3.5">
										<div className="mb-2 flex items-center gap-2">
											<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#12b76a]/10">
												<QrCode className="h-3.5 w-3.5 text-[#12b76a]" />
											</div>
											<h3 className="text-[11px] font-bold text-[#111827]">QR Code Verification</h3>
										</div>
										<p className="text-[9px] leading-relaxed text-gray-500">
											Every generated report includes a unique QR code anyone can scan to
											verify its authenticity — protecting against forgery and giving
											institutions complete confidence.
										</p>
									</div>

									{/* Customer Support */}
									<div className="rounded-xl border border-[#f79009]/20 bg-[#f79009]/[0.03] p-3.5">
										<div className="mb-2 flex items-center gap-2">
											<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f79009]/10">
												<LifeBuoy className="h-3.5 w-3.5 text-[#f79009]" />
											</div>
											<h3 className="text-[11px] font-bold text-[#111827]">Responsive Customer Support</h3>
										</div>
										<p className="text-[9px] leading-relaxed text-gray-500">
											Our dedicated support team is available to help with onboarding,
											training, migration, and any issues. Premium plan customers receive
											priority support with faster response times.
										</p>
									</div>

									{/* Multi-Device */}
									<div className="rounded-xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/[0.03] p-3.5">
										<div className="mb-2 flex items-center gap-2">
											<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8b5cf6]/10">
												<Globe className="h-3.5 w-3.5 text-[#8b5cf6]" />
											</div>
											<h3 className="text-[11px] font-bold text-[#111827]">Every Device, One Platform</h3>
										</div>
										<p className="text-[9px] leading-relaxed text-gray-500">
											Web, iOS, Android, Windows & macOS. Native apps with push
											notifications. Same data across all devices — always in sync.
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* ═══════════════════════════════════════════════ PAGE 4: Pricing + Contact ═══════════════════════════════════════════════ */}
					<div className="brochure-page overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg print:rounded-none print:shadow-none print:border-none" style={{ aspectRatio: '297/210' }}>
						<div className="flex h-full flex-row gap-16 p-8">
							{/* Left Column: Pricing */}
							<div className="flex flex-1 flex-col">
								<div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
									<div className="flex items-center gap-2">
										<Image src="/images/SchoolMesh.png" alt="SchoolMesh" width={20} height={20} className="h-5 w-5 rounded object-contain" />
										<span className="text-xs font-bold text-[#111827]">SchoolMesh</span>
									</div>
									<span className="text-[10px] text-gray-400">04 / 04</span>
								</div>

								<p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#465fff]">Pricing</p>
								<h2 className="mb-2 text-xl font-bold tracking-tight text-[#111827]">Simple, transparent pricing.</h2>
								<p className="mb-4 text-[10px] leading-relaxed text-gray-500">
									Two simple plans with per-student annual pricing, plus a custom option for schools and networks that prefer a fixed annual fee.
								</p>

								{/* Per-Student Plans */}
								<div className="mb-4 space-y-3">
									{pricingPlans.map((plan) => (
										<div key={plan.name} className="rounded-xl border border-gray-200 p-4">
											<div className="mb-2 flex items-center justify-between">
												<div>
													<h3 className="text-sm font-bold text-[#111827]">{plan.name}</h3>
													<p className="text-[9px] text-gray-400">{plan.description}</p>
												</div>
												<div className="text-right">
													<p className="text-lg font-bold text-[#465fff]">{plan.price}</p>
													<p className="text-[7px] text-gray-400">{plan.period}</p>
												</div>
											</div>
											<div className="flex flex-wrap gap-1.5">
												{plan.features.map((f) => (
													<span key={f} className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[8px] text-gray-600">
														<CheckCircle2 className="h-2.5 w-2.5 text-[#12b76a]" />
														{f}
													</span>
												))}
											</div>
										</div>
									))}
								</div>

								{/* Custom / Enterprise Plan */}
								<div className="rounded-xl border-2 border-dashed border-[#465fff]/30 bg-[#465fff]/[0.03] p-4">
									<div className="mb-2 flex items-center justify-between">
										<h3 className="text-sm font-bold text-[#111827]">{customPlan.name}</h3>
										<span className="rounded-full bg-[#465fff]/10 px-2.5 py-0.5 text-[8px] font-bold text-[#465fff]">CUSTOM</span>
									</div>
									<p className="mb-3 text-[9px] leading-relaxed text-gray-500">{customPlan.description}</p>
									<div className="flex flex-wrap gap-1.5">
										{customPlan.features.map((f) => (
											<span key={f} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[8px] text-gray-600 border border-gray-100">
												<CheckCircle2 className="h-2.5 w-2.5 text-[#465fff]" />
												{f}
											</span>
										))}
									</div>
								</div>

								<p className="mt-auto pt-3 text-center text-[8px] text-gray-300">Start free · No credit card required</p>
							</div>

							{/* Right Column: Contact + CTA */}
							<div className="flex flex-1 flex-col">
								<div className="mb-4 border-b border-gray-100 pb-3">
									<p className="text-[10px] font-bold uppercase tracking-widest text-[#465fff]">Contact</p>
									<h2 className="mt-1 text-lg font-bold tracking-tight text-[#111827]">Get in touch with our team.</h2>
									<p className="mt-1 text-[10px] leading-relaxed text-gray-500">
										Have questions about SchoolMesh? Planning a rollout for your school or
										network? We&apos;re here to help with onboarding, migration, and setup.
									</p>
								</div>

								<div className="mb-4 space-y-3">
									{[
										{ icon: Mail, label: 'Email', value: 'info@schoolmesh.net / amossenkao@gmail.com', color: '#465fff' },
										{ icon: Phone, label: 'Phone', value: '+231 776949463 / +231 887956586', color: '#12b76a' },
										{ icon: Globe, label: 'Website', value: 'www.schoolmesh.net', color: '#8b5cf6' },
										{ icon: Globe, label: 'Location', value: 'Unity Town, Lower Johnsonville, Montserrado County Liberia', color: '#f79009' },
									].map((item) => (
										<div key={item.label} className="flex items-center gap-3">
											<div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${item.color}10` }}>
												<item.icon className="h-4 w-4" style={{ color: item.color }} />
											</div>
											<div>
												<p className="text-[9px] font-bold text-[#111827]">{item.label}</p>
												<p className="text-[10px] text-gray-500">{item.value}</p>
											</div>
										</div>
									))}
								</div>

								{/* Testimonials */}
								<div className="mb-4 space-y-2">
									{testimonials.map((t) => (
										<div key={t.name} className="rounded-lg border border-gray-100 p-2.5">
											<div className="mb-1 flex gap-0.5">
												{[1, 2, 3, 4, 5].map((s) => (
													<Star key={s} className="h-2 w-2 fill-[#F59E0B] text-[#F59E0B]" />
												))}
											</div>
											<p className="text-[8px] italic leading-relaxed text-gray-600">&quot;{t.quote}&quot;</p>
											<p className="mt-1 text-[7px] font-bold text-[#111827]">{t.name} <span className="font-normal text-gray-400">· {t.role}</span></p>
										</div>
									))}
								</div>

								{/* QR Code + CTA */}
								<div className="mt-auto flex items-center gap-4 rounded-xl bg-[#111827] p-4">
									<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white p-1">
										{qrDataUrl ? (
											<img src={qrDataUrl} alt="SchoolMesh QR Code" className="h-full w-full object-contain" />
										) : (
											<QrCode className="h-8 w-8 text-gray-300" />
										)}
									</div>
									<div>
										<p className="text-xs font-bold text-white">Ready to modernize your school?</p>
										<p className="mt-0.5 text-[9px] text-white/50">Start free · No credit card required</p>
										<p className="mt-1 text-[9px] font-medium text-[#465fff]">www.schoolmesh.net</p>
									</div>
								</div>

								<p className="mt-2 text-center text-[8px] text-gray-300">
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
