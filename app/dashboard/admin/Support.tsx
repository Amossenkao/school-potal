'use client';
import React, { useState, useMemo } from 'react';
import {
	MessageSquare,
	Phone,
	Mail,
	Clock,
	AlertCircle,
	CheckCircle,
	HelpCircle,
	FileText,
	Download,
	Search,
	ChevronDown,
	ChevronUp,
	BookOpen,
	Users,
	GraduationCap,
	Settings,
	Shield,
	Wifi,
	WifiOff,
	 Zap,
	Lock,
	ClipboardList,
	Calendar,
	CreditCard,
	 School,
	UserCog,
	BarChart3,
	RefreshCw,
	Monitor,
	Database,
	Globe,
	Printer,
	Eye,
	EyeOff,
	KeyRound,
	Trash2,
	Edit3,
	UserPlus,
	ToggleLeft,
	ToggleRight,
	X,
	Check,
	ArrowRight,
	ExternalLink,
	LifeBuoy,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FAQItem {
	question: string;
	answer: React.ReactNode;
	category: string;
	icon: React.ElementType;
}

interface GuideSection {
	id: string;
	title: string;
	description: string;
	icon: React.ElementType;
	content: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Priority Badge Component
// ---------------------------------------------------------------------------
const PriorityBadge = ({ priority }: { priority: string }) => {
	const styles: Record<string, string> = {
		low: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
		medium: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
		high: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
		critical: 'bg-red-200 text-red-900 border-red-300 dark:bg-red-800/50 dark:text-red-200 dark:border-red-600',
	};

	return (
		<span
			className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[priority] || styles.medium}`}
		>
			{priority.charAt(0).toUpperCase() + priority.slice(1)}
		</span>
	);
};

// ---------------------------------------------------------------------------
// Support Card Component
// ---------------------------------------------------------------------------
const SupportCard = ({
	icon: Icon,
	title,
	description,
	action,
	variant = 'default',
}: {
	icon: React.ElementType;
	title: string;
	description: string;
	action?: React.ReactNode;
	variant?: 'default' | 'emergency';
}) => {
	const variants = {
		default: 'border-border hover:border-primary/50',
		emergency: 'border-red-200 bg-red-50/50 hover:border-red-300 dark:border-red-800 dark:bg-red-900/20',
	};

	return (
		<div
			className={`rounded-xl border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md ${variants[variant]}`}
		>
			<div className="flex items-start gap-4">
				<div
					className={`rounded-lg p-3 ${variant === 'emergency' ? 'bg-red-100 dark:bg-red-900/40' : 'bg-primary/10'}`}
				>
					<Icon
						className={`h-6 w-6 ${variant === 'emergency' ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}
					/>
				</div>
				<div className="flex-1 min-w-0">
					<h3 className="text-lg font-semibold text-foreground mb-2">
						{title}
					</h3>
					<p className="text-muted-foreground mb-4 text-sm">{description}</p>
					{action}
				</div>
			</div>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Accordion Component for FAQ
// ---------------------------------------------------------------------------
const AccordionItem = ({
	question,
	answer,
	isOpen,
	onToggle,
	icon: Icon,
}: {
	question: string;
	answer: React.ReactNode;
	isOpen: boolean;
	onToggle: () => void;
	icon: React.ElementType;
}) => {
	return (
		<div className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-sm">
			<button
				onClick={onToggle}
				className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
			>
				<div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
					<Icon className="h-4 w-4 text-primary" />
				</div>
				<span className="flex-1 font-medium text-foreground text-sm sm:text-base">
					{question}
				</span>
				{isOpen ? (
					<ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
				) : (
					<ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
				)}
			</button>
			{isOpen && (
				<div className="px-5 pb-5 pt-0 border-t border-border">
					<div className="pt-4 text-sm text-muted-foreground leading-relaxed space-y-3">
						{answer}
					</div>
				</div>
			)}
		</div>
	);
};

// ---------------------------------------------------------------------------
// Guide Section Card
// ---------------------------------------------------------------------------
const GuideCard = ({
	section,
	isExpanded,
	onToggle,
}: {
	section: GuideSection;
	isExpanded: boolean;
	onToggle: () => void;
}) => {
	return (
		<div
			className={`rounded-xl border-2 overflow-hidden transition-all duration-300 ${isExpanded ? 'border-primary/50 shadow-md' : 'border-border hover:border-border/80'}`}
		>
			<button
				onClick={onToggle}
				className="w-full flex items-center gap-4 px-5 py-4 bg-card hover:bg-muted/30 transition-colors text-left"
			>
				<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
					<section.icon className="h-5 w-5 text-primary" />
				</div>
				<div className="flex-1 min-w-0">
					<h3 className="font-semibold text-foreground text-sm sm:text-base">
						{section.title}
					</h3>
					<p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
						{section.description}
					</p>
				</div>
				<ChevronDown
					className={`h-5 w-5 text-muted-foreground transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
				/>
			</button>
			{isExpanded && (
				<div className="border-t border-border bg-muted/10 p-5">
					{section.content}
				</div>
			)}
		</div>
	);
};

// ---------------------------------------------------------------------------
// Step Component
// ---------------------------------------------------------------------------
const Step = ({
	number,
	title,
	children,
}: {
	number: number;
	title: string;
	children: React.ReactNode;
}) => (
	<div className="flex gap-4">
		<div className="flex-shrink-0">
			<div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
				{number}
			</div>
		</div>
		<div className="flex-1 pb-5">
			<h4 className="font-semibold text-foreground text-sm mb-1.5">{title}</h4>
			<div className="text-sm text-muted-foreground">{children}</div>
		</div>
	</div>
);

// ---------------------------------------------------------------------------
// Tip Box
// ---------------------------------------------------------------------------
const TipBox = ({
	children,
	variant = 'info',
}: {
	children: React.ReactNode;
	variant?: 'info' | 'warning' | 'success';
}) => {
	const styles = {
		info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300',
		warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300',
		success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300',
	};

	return (
		<div className={`rounded-lg border p-3 text-sm ${styles[variant]}`}>
			<div className="flex items-start gap-2">
				<Zap className="h-4 w-4 flex-shrink-0 mt-0.5" />
				<div>{children}</div>
			</div>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Data: FAQ Items
// ---------------------------------------------------------------------------
const faqItems: FAQItem[] = [
	// ─── User Management ───
	{
		question: 'How do I add a new user to the system?',
		category: 'User Management',
		icon: UserPlus,
		answer: (
			<>
				<p>
					Navigate to <strong>Dashboard &rarr; Manage Users &rarr; Add Users</strong>. Select the user role (Student, Teacher, or Administrator), fill in the required profile information, and assign them to the appropriate academic year and class. The system will automatically generate a username and temporary password.
				</p>
				<TipBox variant="info">
					You can add multiple users at once using the bulk import feature. Prepare a CSV file with the required columns and upload it via the import button.
				</TipBox>
			</>
		),
	},
	{
		question: 'How do I reset a user\'s password?',
		category: 'User Management',
		icon: KeyRound,
		answer: (
			<>
				<p>
					Go to <strong>Dashboard &rarr; Manage Users</strong>, find the user in the list, click the action menu (three dots), and select <strong>Reset Password</strong>. You can either set a custom password or let the system reset it to their username.
				</p>
				<TipBox variant="warning">
					Password resets take effect immediately. The user will need to log in with the new password on their next session.
				</TipBox>
			</>
		),
	},
	{
		question: 'What happens when I deactivate a user?',
		category: 'User Management',
		icon: UserCog,
		answer: (
			<>
				<p>
					Deactivating a user prevents them from logging in but preserves all their data and records. Their grades, attendance, and historical data remain intact. You can reactivate them at any time from the same user management page.
				</p>
				<TipBox variant="info">
					Deactivation is reversible. For permanent removal, use the Delete option (available only for non-system-admin users).
				</TipBox>
			</>
		),
	},
	{
		question: 'Can I perform bulk actions on users?',
		category: 'User Management',
		icon: Users,
		answer: (
			<>
				<p>
					Yes. In the <strong>System Settings</strong> panel, you can perform bulk actions including:
				</p>
				<ul className="list-disc pl-5 space-y-1 mt-2">
					<li><strong>Activate All</strong> — Reactivate all deactivated accounts at once</li>
					<li><strong>Deactivate All</strong> — Temporarily disable all accounts (use with caution)</li>
					<li><strong>Reset All Passwords</strong> — Reset passwords for all users, optionally to a common password or their username</li>
				</ul>
				<TipBox variant="warning">
					Bulk actions affect all users in the current academic year context. Double-check your selection before confirming.
				</TipBox>
			</>
		),
	},
	// ─── Class Management ───
	{
		question: 'How do I create and assign classes?',
		category: 'Class Management',
		icon: School,
		answer: (
			<>
				<p>
					Go to <strong>Dashboard &rarr; Manage Classes</strong>. Click <strong>Create New Class</strong>, select the grade level and section (e.g., Grade 10A), assign a class teacher, and specify the classroom. You can then add subjects and assign subject teachers to the class.
				</p>
				<Step number={1} title="Define Class Structure">
					Choose the grade level and section letter. Each combination must be unique within an academic year.
				</Step>
				<Step number={2} title="Assign Class Teacher">
					Select a teacher who will serve as the class teacher. They will have oversight of all students in this class.
				</Step>
				<Step number={3} title="Add Subjects & Teachers">
					Assign subjects to the class and map each subject to a qualified teacher.
				</Step>
			</>
		),
	},
	{
		question: 'How do I assign students to a class?',
		category: 'Class Management',
		icon: Users,
		answer: (
			<>
				<p>
					When adding or editing a student in <strong>Manage Users</strong>, select their class from the dropdown. The class assignment is tied to the academic year, so a student can be in different classes across different years.
				</p>
				<TipBox variant="info">
					Use the bulk edit feature to move multiple students between classes at the start of a new academic year.
				</TipBox>
			</>
		),
	},
	// ─── Grade Management ───
	{
		question: 'How does the grade approval workflow work?',
		category: 'Grade Management',
		icon: ClipboardList,
		answer: (
			<>
				<p>
					Teachers submit grades for their assigned subjects and classes. As an admin, you review these submissions in <strong>Dashboard &rarr; Grade Submissions</strong>. You can:
				</p>
				<ul className="list-disc pl-5 space-y-1 mt-2">
					<li><strong>Approve</strong> individual grades or entire submissions</li>
					<li><strong>Reject</strong> grades with a reason — the teacher can correct and resubmit</li>
					<li><strong>Bulk Approve/Reject</strong> multiple submissions at once</li>
				</ul>
				<p className="mt-2">
					A grade must be approved before it appears on student report cards.
				</p>
			</>
		),
	},
	{
		question: 'What is a Grade Change Request?',
		category: 'Grade Management',
		icon: Edit3,
		answer: (
			<>
				<p>
					After grades are approved, teachers can submit <strong>Grade Change Requests</strong> if they discover an error. These requests appear in the <strong>Grade Requests</strong> section for admin review.
				</p>
				<p className="mt-2">
					Each request includes the original grade, proposed new grade, and a reason for the change. You can approve or reject each request individually.
				</p>
				<TipBox variant="warning">
					All grade changes are logged for audit purposes. The system maintains a full history of every grade modification.
				</TipBox>
			</>
		),
	},
	{
		question: 'How do I view Master Grade Sheets?',
		category: 'Grade Management',
		icon: BarChart3,
		answer: (
			<>
				<p>
					Master Grade Sheets provide a consolidated view of all grades for a class across all subjects. Navigate to the grade submissions page and select a class to view its master sheet. This shows every student\'s performance across all subjects taught in that class.
				</p>
				<TipBox variant="info">
					Master sheets are useful for identifying struggling students and analyzing class-wide performance trends.
				</TipBox>
			</>
		),
	},
	// ─── Academic Settings ───
	{
		question: 'How do I configure academic years and periods?',
		category: 'Academic Settings',
		icon: Calendar,
		answer: (
			<>
				<p>
					Go to <strong>Dashboard &rarr; Settings</strong>. Under the Academic Configuration section, you can:
				</p>
				<ul className="list-disc pl-5 space-y-1 mt-2">
					<li>Set the current academic year (e.g., 2025-2026)</li>
					<li>Define the range of available academic years</li>
					<li>Configure grading periods: First through Sixth Period, plus period exams</li>
					<li>Set up semester divisions (1st and 2nd Semester)</li>
				</ul>
				<TipBox variant="info">
					Academic year settings affect the entire system. Changes apply to all users and reports immediately.
				</TipBox>
			</>
		),
	},
	{
		question: 'How do Report Card Themes work?',
		category: 'Academic Settings',
		icon: FileText,
		answer: (
			<>
				<p>
					Report Card Themes control the visual appearance of generated report cards. In <strong>Settings</strong>, you can assign a different theme to each class level (e.g., a colorful theme for elementary, a professional theme for high school).
				</p>
				<p className="mt-2">
					The system provides several pre-built themes with different color palettes. Select a theme and preview it live before applying.
				</p>
			</>
		),
	},
	{
		question: 'How do I control what students can see?',
		category: 'Academic Settings',
		icon: Eye,
		answer: (
			<>
				<p>
					In <strong>Settings &rarr; Student Report Access</strong>, you can configure per-academic-year permissions:
				</p>
				<ul className="list-disc pl-5 space-y-1 mt-2">
					<li><strong>Enable/Disable</strong> report access for a specific year</li>
					<li><strong>Yearly Report Access</strong> — allow viewing full-year reports</li>
					<li><strong>Periodic Reports</strong> — select which grading periods are visible</li>
					<li><strong>Semester Reports</strong> — select which semester reports are visible</li>
				</ul>
				<TipBox variant="warning">
					If report access is disabled for a year, students will see a "Reports Not Available" message when they try to view grades for that period.
				</TipBox>
			</>
		),
	},
	// ─── Teacher Permissions ───
	{
		question: 'What permissions can I set for teachers?',
		category: 'Teacher Permissions',
		icon: Shield,
		answer: (
			<>
				<p>
					In <strong>Settings &rarr; Teacher Permissions</strong>, you can configure per-academic-year capabilities:
				</p>
				<ul className="list-disc pl-5 space-y-1 mt-2">
					<li><strong>Grade Submission</strong> — allow teachers to enter grades, with optional period restrictions</li>
					<li><strong>View Grade Submissions</strong> — let teachers see grades they\'ve submitted</li>
					<li><strong>View Master Grade Sheets</strong> — access to class-wide performance data</li>
					<li><strong>Grade Change Requests</strong> — allow teachers to request corrections to approved grades</li>
				</ul>
				<TipBox variant="info">
					Permissions are scoped per academic year, so you can give more access to senior teachers in advanced years.
				</TipBox>
			</>
		),
	},
	// ─── Financial & Payments ───
	{
		question: 'How does the payment system work?',
		category: 'Financial Management',
		icon: CreditCard,
		answer: (
			<>
				<p>
					The system supports student fee billing and payment recording. Students (and parents) can view outstanding balances and make payments. Supported payment methods include:
				</p>
				<ul className="list-disc pl-5 space-y-1 mt-2">
					<li>Visa & Mastercard</li>
					<li>Orange Money</li>
					<li>MTN Mobile Money</li>
				</ul>
				<p className="mt-2">
					Admins and accountants can record payments, generate receipts, and view financial reports. The system tracks outstanding balances automatically.
				</p>
			</>
		),
	},
	// ─── Offline & Sync ───
	{
		question: 'How does offline mode work?',
		category: 'System & Offline',
		icon: WifiOff,
		answer: (
			<>
				<p>
					The School Portal is built as an offline-first Progressive Web App (PWA). When you lose internet connectivity:
				</p>
				<ul className="list-disc pl-5 space-y-1 mt-2">
					<li>Cached dashboard pages remain fully functional</li>
					<li>You can continue viewing reports, grades, and user data</li>
					<li>Actions like grade approvals are queued and sync automatically when connectivity returns</li>
					<li>An offline banner appears at the top of the screen to indicate your status</li>
				</ul>
				<TipBox variant="success">
					Your data is safe — all queued actions will sync in the background once you\'re back online. No work is lost.
				</TipBox>
			</>
		),
	},
	{
		question: 'What is real-time synchronization?',
		category: 'System & Offline',
		icon: RefreshCw,
		answer: (
			<>
				<p>
					The platform uses real-time sync to keep data consistent across all devices. When a teacher submits grades, an admin approves them, or a payment is recorded, the changes are broadcast to all connected users instantly.
				</p>
				<p className="mt-2">
					This is powered by Server-Sent Events (SSE) via Cloudflare Workers and Upstash Redis Pub/Sub. You\'ll see updates appear in real-time without needing to refresh the page.
				</p>
			</>
		),
	},
	{
		question: 'How do I know if my data is synced?',
		category: 'System & Offline',
		icon: Wifi,
		answer: (
			<>
				<p>
					Look for the network status indicator in the app header:
				</p>
				<ul className="list-disc pl-5 space-y-1 mt-2">
					<li><strong>Green/Connected</strong> — You\'re online and data is syncing in real-time</li>
					<li><strong>Red/Offline</strong> — You\'ve lost connectivity; actions are being queued</li>
					<li><strong>Syncing spinner</strong> — A background sync is currently in progress</li>
				</ul>
				<p className="mt-2">
					You can also manually refresh grade data using the refresh button on the Grade Submissions page.
				</p>
			</>
		),
	},
	// ─── Admissions ───
	{
		question: 'How do entrance registration and general admission differ?',
		category: 'Admissions',
		icon: School,
		answer: (
			<>
				<p>The system supports two admission workflows:</p>
				<div className="mt-3 space-y-3">
					<div className="rounded-lg border border-border p-3">
						<h4 className="font-semibold text-foreground text-sm mb-1">Entrance Registration</h4>
						<p className="text-sm">For prospective students taking entrance exams. They register for an exam date, provide basic information, and can optionally pay the registration fee online.</p>
					</div>
					<div className="rounded-lg border border-border p-3">
						<h4 className="font-semibold text-foreground text-sm mb-1">General Admission</h4>
						<p className="text-sm">For direct student enrollment. Requires full academic history, parent/guardian details, document uploads, and optional online payment of admission fees.</p>
					</div>
				</div>
			</>
		),
	},
	// ─── Reports ───
	{
		question: 'How do I generate and print report cards?',
		category: 'Reports',
		icon: Printer,
		answer: (
			<>
				<p>
					Report cards are generated automatically from approved grades. Students and admins can access them from the dashboard:
				</p>
				<ul className="list-disc pl-5 space-y-1 mt-2">
					<li><strong>Periodic Reports</strong> — Individual grading period summaries</li>
					<li><strong>Semester Reports</strong> — Consolidated semester performance</li>
					<li><strong>Yearly Reports</strong> — Full academic year transcript</li>
				</ul>
				<p className="mt-2">
					Click the <strong>Download PDF</strong> button on any report to generate a print-ready PDF with your school\'s branding and the selected theme.
				</p>
				<TipBox variant="info">
					Reports can also be shared via secure links. Use the Share button to generate a verification link that recipients can use to view the report online.
				</TipBox>
			</>
		),
	},
	{
		question: 'Can I customize report card templates?',
		category: 'Reports',
		icon: FileText,
		answer: (
			<>
				<p>
					Yes. In <strong>Settings</strong>, navigate to the Report Card Themes section. You can:
				</p>
				<ul className="list-disc pl-5 space-y-1 mt-2">
					<li>Assign different color themes to different class levels</li>
					<li>Preview themes before applying them</li>
					<li>The theme applies to all PDF downloads and printouts for that class level</li>
				</ul>
				<TipBox variant="info">
					Your school logo and information are automatically included in the report header based on your School Profile settings.
				</TipBox>
			</>
		),
	},
	// ─── Multi-Tenant ───
	{
		question: 'What is multi-tenant architecture?',
		category: 'System & Offline',
		icon: Database,
		answer: (
			<>
				<p>
					The School Portal is built as a multi-tenant platform. Each school (tenant) has:
				</p>
				<ul className="list-disc pl-5 space-y-1 mt-2">
					<li>Its own independent MongoDB database</li>
					<li>Custom branding (logo, colors, school info)</li>
					<li>Unique user accounts and academic configuration</li>
					<li>Isolated data — no school can access another\'s data</li>
				</ul>
				<p className="mt-2">
					All schools share the same application codebase, but their data is completely separate and secure.
				</p>
			</>
		),
	},
];

// ---------------------------------------------------------------------------
// Data: Admin Guide Sections
// ---------------------------------------------------------------------------
const guideSections: GuideSection[] = [
	{
		id: 'getting-started',
		title: 'Getting Started',
		description: 'Essential first steps for new administrators',
		icon: BookOpen,
		content: (
			<div className="space-y-4">
				<p className="text-sm text-muted-foreground">
					Welcome to the School Portal Admin Panel. This guide will help you set up and manage your school efficiently.
				</p>
				<Step number={1} title="Configure School Profile">
					Navigate to <strong>Settings</strong> and fill in your school name, address, contact information, and upload your school logo. This information appears on report cards and official documents.
				</Step>
				<Step number={2} title="Set Academic Year">
					Define the current academic year and the range of years your school operates (e.g., 2020-2021 to 2025-2026). This controls what years are available throughout the system.
				</Step>
				<Step number={3} title="Configure Class Levels">
					Set up your class structure — define grade levels, sections, and the subjects taught at each level. This is the foundation for class and student management.
				</Step>
				<Step number={4} title="Add Users">
					Start adding teachers, students, and administrators. Each user needs a role assignment and academic year context.
				</Step>
				<TipBox variant="success">
					Complete these four steps before the school term begins to ensure a smooth start for all users.
				</TipBox>
			</div>
		),
	},
	{
		id: 'user-management',
		title: 'User Management',
		description: 'Adding, editing, and managing all school users',
		icon: Users,
		content: (
			<div className="space-y-4">
				<h4 className="font-semibold text-foreground">User Roles</h4>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div className="rounded-lg border border-border p-3">
						<div className="flex items-center gap-2 mb-1">
							<GraduationCap className="h-4 w-4 text-primary" />
							<span className="font-medium text-sm">Student</span>
						</div>
						<p className="text-xs text-muted-foreground">Can view grades, reports, schedules, and pay fees</p>
					</div>
					<div className="rounded-lg border border-border p-3">
						<div className="flex items-center gap-2 mb-1">
							<BookOpen className="h-4 w-4 text-primary" />
							<span className="font-medium text-sm">Teacher</span>
						</div>
						<p className="text-xs text-muted-foreground">Can submit grades, view master sheets, request changes</p>
					</div>
					<div className="rounded-lg border border-border p-3">
						<div className="flex items-center gap-2 mb-1">
							<Shield className="h-4 w-4 text-primary" />
							<span className="font-medium text-sm">Administrator</span>
						</div>
						<p className="text-xs text-muted-foreground">School-level admin: manages users, classes, grades</p>
					</div>
					<div className="rounded-lg border border-border p-3">
						<div className="flex items-center gap-2 mb-1">
							<Settings className="h-4 w-4 text-primary" />
							<span className="font-medium text-sm">System Admin</span>
						</div>
						<p className="text-xs text-muted-foreground">Full system access: settings, bulk actions, support</p>
					</div>
				</div>

				<h4 className="font-semibold text-foreground mt-4">Managing Users</h4>
				<Step number={1} title="Add Individual Users">
					Go to <strong>Manage Users &rarr; Add Users</strong>. Select the role, fill in personal details, and assign to a class (for students) or subjects (for teachers).
				</Step>
				<Step number={2} title="Bulk Import">
					Prepare a CSV with columns: Full Name, Email, Role, Class, etc. Use the import button for mass enrollment at the start of the year.
				</Step>
				<Step number={3} title="Edit & Update">
					Click the action menu on any user row to edit details, reset passwords, activate/deactivate, or delete accounts.
				</Step>
				<TipBox variant="info">
					Use filters to quickly find users by role, class, status, or subject. The search bar supports name, email, and username lookups.
				</TipBox>
			</div>
		),
	},
	{
		id: 'grade-management',
		title: 'Grade Management',
		description: 'Reviewing, approving, and managing grade submissions',
		icon: ClipboardList,
		content: (
			<div className="space-y-4">
				<h4 className="font-semibold text-foreground">The Grade Workflow</h4>
				<div className="flex flex-col sm:flex-row gap-2 sm:items-center text-sm">
					<div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
						<Clock className="h-4 w-4 text-amber-600" />
						<span>Teacher Submits</span>
					</div>
					<ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
					<div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2">
						<Shield className="h-4 w-4 text-blue-600" />
						<span>Admin Reviews</span>
					</div>
					<ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
					<div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-3 py-2">
						<CheckCircle className="h-4 w-4 text-green-600" />
						<span>Approved / Published</span>
					</div>
				</div>

				<h4 className="font-semibold text-foreground mt-4">Reviewing Submissions</h4>
				<Step number={1} title="Navigate to Grade Submissions">
					Go to <strong>Dashboard &rarr; Grade Submissions</strong>. Select the academic year to view submissions.
				</Step>
				<Step number={2} title="Filter & Search">
					Use filters for subject, class, period, and status. Use the search bar to find submissions by teacher name or subject.
				</Step>
				<Step number={3} title="Review Details">
					Click on any submission to see all student grades, statistics (pass rate, average, incompletes), and teacher information.
				</Step>
				<Step number={4} title="Approve or Reject">
					Select individual students or all pending grades. Click <strong>Approve</strong> to finalize, or <strong>Reject</strong> with a reason to send back to the teacher.
				</Step>

				<h4 className="font-semibold text-foreground mt-4">Grade Change Requests</h4>
				<p className="text-sm text-muted-foreground">
					When teachers discover errors in approved grades, they submit a Grade Change Request. These appear in the <strong>Grade Requests</strong> section. Review the original grade, proposed grade, and reason before approving or rejecting.
				</p>

				<TipBox variant="warning">
					Rejected grades are returned to the teacher with your reason. They can correct and resubmit. Always provide a clear rejection reason to avoid back-and-forth.
				</TipBox>
			</div>
		),
	},
	{
		id: 'academic-settings',
		title: 'Academic Settings',
		description: 'Configuring years, periods, and report access',
		icon: Calendar,
		content: (
			<div className="space-y-4">
				<h4 className="font-semibold text-foreground">Academic Year Configuration</h4>
				<p className="text-sm text-muted-foreground">
					The academic year is the backbone of the entire system. All data — users, grades, attendance, reports — is scoped to an academic year.
				</p>
				<Step number={1} title="Set Current Academic Year">
					In <strong>Settings</strong>, set the current academic year (e.g., 2025-2026). This controls what year users see by default.
				</Step>
				<Step number={2} title="Define Year Range">
					Set the first and last academic years your school has operated. This creates the dropdown options used throughout the system.
				</Step>

				<h4 className="font-semibold text-foreground mt-4">Grading Periods</h4>
				<p className="text-sm text-muted-foreground">
					The system supports up to six grading periods plus exams:
				</p>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
					{['1st Period', '2nd Period', '3rd Period', '3rd Pd Exam', '4th Period', '5th Period', '6th Period', '6th Pd Exam'].map((p) => (
						<div key={p} className="rounded-md bg-muted/50 border border-border px-2 py-1.5 text-xs text-center text-muted-foreground">
							{p}
						</div>
					))}
				</div>

				<h4 className="font-semibold text-foreground mt-4">Student Report Access</h4>
				<p className="text-sm text-muted-foreground">
					Control what students can see, per academic year:
				</p>
				<ul className="list-disc pl-5 space-y-1 mt-2 text-sm text-muted-foreground">
					<li><strong>Enable/Disable</strong> — Toggle all report access for a year</li>
					<li><strong>Yearly Report</strong> — Allow access to full-year summary</li>
					<li><strong>Periodic Reports</strong> — Select specific grading periods</li>
					<li><strong>Semester Reports</strong> — Select 1st and/or 2nd semester</li>
				</ul>

				<TipBox variant="info">
					At the start of a new academic year, remember to enable report access for that year so students can view their grades.
				</TipBox>
			</div>
		),
	},
	{
		id: 'teacher-permissions',
		title: 'Teacher Permissions',
		description: 'Controlling what teachers can do per academic year',
		icon: Shield,
		content: (
			<div className="space-y-4">
				<p className="text-sm text-muted-foreground">
					Teacher permissions are configured per academic year in <strong>Settings &rarr; Teacher Permissions</strong>. This gives you granular control over teacher capabilities.
				</p>

				<div className="space-y-3">
					<div className="rounded-lg border border-border p-4">
						<div className="flex items-center gap-2 mb-2">
							<ToggleRight className="h-4 w-4 text-primary" />
							<h4 className="font-semibold text-sm">Grade Submission</h4>
						</div>
						<p className="text-sm text-muted-foreground">
							Allows teachers to enter grades for their assigned subjects and classes. You can further restrict which grading periods are open for submission.
						</p>
					</div>

					<div className="rounded-lg border border-border p-4">
						<div className="flex items-center gap-2 mb-2">
							<Eye className="h-4 w-4 text-primary" />
							<h4 className="font-semibold text-sm">View Grade Submissions</h4>
						</div>
						<p className="text-sm text-muted-foreground">
							Lets teachers see the grades they have submitted. Useful for verification before report cards are published.
						</p>
					</div>

					<div className="rounded-lg border border-border p-4">
						<div className="flex items-center gap-2 mb-2">
							<BarChart3 className="h-4 w-4 text-primary" />
							<h4 className="font-semibold text-sm">View Master Grade Sheets</h4>
						</div>
						<p className="text-sm text-muted-foreground">
							Gives teachers access to class-wide performance data across all subjects. Useful for class teachers monitoring overall student performance.
						</p>
					</div>

					<div className="rounded-lg border border-border p-4">
						<div className="flex items-center gap-2 mb-2">
							<Edit3 className="h-4 w-4 text-primary" />
							<h4 className="font-semibold text-sm">Grade Change Requests</h4>
						</div>
						<p className="text-sm text-muted-foreground">
							Allows teachers to request corrections to already-approved grades. Restrict by period to control when changes can be requested.
						</p>
					</div>
				</div>

				<TipBox variant="warning">
					Permissions only take effect when the academic year is enabled. Make sure the year toggle is ON before configuring sub-permissions.
				</TipBox>
			</div>
		),
	},
	{
		id: 'class-management',
		title: 'Class Management',
		description: 'Creating classes and managing assignments',
		icon: School,
		content: (
			<div className="space-y-4">
				<h4 className="font-semibold text-foreground">Class Structure</h4>
				<p className="text-sm text-muted-foreground">
					Classes are organized by <strong>Session</strong> (e.g., Morning, Afternoon), <strong>Grade Level</strong> (e.g., Grade 10), and <strong>Section</strong> (e.g., A, B, C). Each class has a class teacher and assigned subjects.
				</p>

				<Step number={1} title="Create a Class">
					Go to <strong>Manage Classes</strong> and click <strong>Create New Class</strong>. Select the grade level, section, class teacher, and classroom.
				</Step>
				<Step number={2} title="Assign Subjects">
					In the class details panel, add subjects and assign a qualified teacher to each. A teacher can handle multiple subjects across multiple classes.
				</Step>
				<Step number={3} title="Add Students">
					Students are assigned to classes through their profile. Edit a student and select their class for the current academic year.
				</Step>

				<h4 className="font-semibold text-foreground mt-4">Class Teacher Responsibilities</h4>
				<ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
					<li>Oversees all students in the class</li>
					<li>Can view master grade sheets (if permitted)</li>
					<li>Primary point of contact for student-related matters</li>
				</ul>

				<TipBox variant="info">
					You can view class details including student rosters, subject allocations, and schedules from the class management page.
				</TipBox>
			</div>
		),
	},
	{
		id: 'payments-financial',
		title: 'Payments & Financial Management',
		description: 'Managing student fees, payments, and receipts',
		icon: CreditCard,
		content: (
			<div className="space-y-4">
				<h4 className="font-semibold text-foreground">Fee Management</h4>
				<p className="text-sm text-muted-foreground">
					The financial module allows you to track student billing, record payments, and generate receipts.
				</p>

				<Step number={1} title="View Outstanding Balances">
					Students can see their fee balance in the <strong>Pay Fees</strong> section. Admins can view all student financial profiles.
				</Step>
				<Step number={2} title="Record Payments">
					When a payment is made (online or offline), record it in the system. The student\'s balance updates automatically.
				</Step>
				<Step number={3} title="Generate Receipts">
					Every recorded payment generates a printable receipt with the school\'s branding, payment details, and a unique receipt number.
				</Step>

				<h4 className="font-semibold text-foreground mt-4">Supported Payment Methods</h4>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
					{['Visa', 'Mastercard', 'Orange Money', 'MTN Mobile Money'].map((method) => (
						<div key={method} className="rounded-md bg-muted/50 border border-border px-3 py-2 text-xs text-center text-muted-foreground font-medium">
							{method}
						</div>
					))}
				</div>

				<TipBox variant="info">
					Online payments are processed securely. Offline payments (cash, bank transfer) must be manually recorded by an admin or accountant.
				</TipBox>
			</div>
		),
	},
	{
		id: 'reports-transcripts',
		title: 'Reports & Transcripts',
		description: 'Generating report cards and academic transcripts',
		icon: FileText,
		content: (
			<div className="space-y-4">
				<h4 className="font-semibold text-foreground">Types of Reports</h4>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div className="rounded-lg border border-border p-3">
						<h4 className="font-medium text-sm mb-1">Periodic Reports</h4>
						<p className="text-xs text-muted-foreground">Individual grading period summaries with subject scores and teacher comments</p>
					</div>
					<div className="rounded-lg border border-border p-3">
						<h4 className="font-medium text-sm mb-1">Semester Reports</h4>
						<p className="text-xs text-muted-foreground">Consolidated semester performance combining multiple periods</p>
					</div>
					<div className="rounded-lg border border-border p-3">
						<h4 className="font-medium text-sm mb-1">Yearly Reports</h4>
						<p className="text-xs text-muted-foreground">Full academic year transcript with cumulative averages and rankings</p>
					</div>
				</div>

				<h4 className="font-semibold text-foreground mt-4">Generating Reports</h4>
				<Step number={1} title="Ensure Grades Are Approved">
					Only approved grades appear on reports. Make sure all relevant grade submissions are approved before generating reports.
				</Step>
				<Step number={2} title="Select Report Type">
					Students can access their reports from the dashboard. Admins can view reports for any student via the user profile or dedicated report pages.
				</Step>
				<Step number={3} title="Download or Share">
					Click <strong>Download PDF</strong> for a print-ready copy. Use <strong>Share</strong> to generate a secure link that others can use to view the report online.
				</Step>

				<h4 className="font-semibold text-foreground mt-4">Report Card Themes</h4>
				<p className="text-sm text-muted-foreground">
					Customize the look of report cards by assigning themes to class levels. Themes control colors, gradients, and styling. Preview before applying.
				</p>

				<TipBox variant="warning">
					Reports include a verification system. Each shared report link can be verified for authenticity using the Verify Report page.
				</TipBox>
			</div>
		),
	},
	{
		id: 'offline-sync',
		title: 'Offline Mode & Sync',
		description: 'Understanding PWA capabilities and data synchronization',
		icon: WifiOff,
		content: (
			<div className="space-y-4">
				<h4 className="font-semibold text-foreground">Offline-First Design</h4>
				<p className="text-sm text-muted-foreground">
					The School Portal is a Progressive Web App (PWA) designed to work even without an internet connection. Key pages and data are cached locally.
				</p>

				<div className="rounded-lg border border-border p-4 space-y-3">
					<h4 className="font-semibold text-sm">What Works Offline</h4>
					<ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
						<li>Viewing cached dashboard pages and reports</li>
						<li>Navigating between previously visited sections</li>
						<li>Viewing user profiles and class data</li>
						<li>Reading notifications and announcements</li>
					</ul>
				</div>

				<div className="rounded-lg border border-border p-4 space-y-3">
					<h4 className="font-semibold text-sm">What Gets Queued</h4>
					<ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
						<li>Grade approvals and rejections</li>
						<li>User edits and updates</li>
						<li>Settings changes</li>
					</ul>
					<p className="text-sm text-muted-foreground mt-2">
						These actions are stored locally and sent to the server automatically when connectivity returns.
					</p>
				</div>

				<h4 className="font-semibold text-foreground mt-4">Real-Time Sync</h4>
				<p className="text-sm text-muted-foreground">
					When online, the system maintains a live connection to the server via Server-Sent Events (SSE). This means:
				</p>
				<ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
					<li>New grade submissions appear instantly</li>
					<li>Approval status updates in real-time</li>
					<li>User changes are reflected immediately across all devices</li>
					<li>Notifications are delivered instantly</li>
				</ul>

				<TipBox variant="success">
					Install the app on your device for the best offline experience. Look for the install prompt or use your browser&apos;s &quot;Add to Home Screen&quot; option.
				</TipBox>
			</div>
		),
	},
	{
		id: 'troubleshooting',
		title: 'Troubleshooting',
		description: 'Common issues and how to resolve them',
		icon: LifeBuoy,
		content: (
			<div className="space-y-4">
				<div className="space-y-4">
					<div className="rounded-lg border border-border p-4">
						<h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
							<AlertCircle className="h-4 w-4 text-amber-600" />
							Grades not showing on reports
						</h4>
						<p className="text-sm text-muted-foreground">
							Ensure the grades are <strong>approved</strong> — only approved grades appear on report cards. Also check that <strong>Student Report Access</strong> is enabled for the relevant academic year and periods in Settings.
						</p>
					</div>

					<div className="rounded-lg border border-border p-4">
						<h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
							<AlertCircle className="h-4 w-4 text-amber-600" />
							Users can&apos;t log in
						</h4>
						<p className="text-sm text-muted-foreground">
							Check if the user is <strong>activated</strong>. Deactivated users cannot log in. Also verify they are using the correct username and that their account is for the current academic year.
						</p>
					</div>

					<div className="rounded-lg border border-border p-4">
						<h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
							<AlertCircle className="h-4 w-4 text-amber-600" />
							Data not syncing between devices
						</h4>
						<p className="text-sm text-muted-foreground">
							Ensure both devices are online. Check the network status indicator. If one device is offline, actions will queue and sync when it reconnects. You can also manually refresh data using the refresh buttons on grade and user pages.
						</p>
					</div>

					<div className="rounded-lg border border-border p-4">
						<h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
							<AlertCircle className="h-4 w-4 text-amber-600" />
							Teachers can&apos;t submit grades
						</h4>
						<p className="text-sm text-muted-foreground">
							Check <strong>Settings &rarr; Teacher Permissions</strong>. Ensure the academic year is enabled and that <strong>Grade Submission</strong> is turned on for the relevant periods. Also verify the teacher is assigned to the correct class and subjects.
						</p>
					</div>

					<div className="rounded-lg border border-border p-4">
						<h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
							<AlertCircle className="h-4 w-4 text-amber-600" />
							Report PDF not generating
						</h4>
						<p className="text-sm text-muted-foreground">
							Ensure you have approved grades for the selected period. Check that a <strong>Report Card Theme</strong> is assigned to the student&apos;s class level in Settings. If the issue persists, try refreshing the page or checking your internet connection.
						</p>
					</div>
				</div>

				<TipBox variant="info">
					For issues not covered here, use the Contact Support tab to reach our technical team. Include screenshots and steps to reproduce the problem for faster resolution.
				</TipBox>
			</div>
		),
	},
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AdminSupport() {
	const [activeTab, setActiveTab] = useState<'contact' | 'faq' | 'guides'>('contact');
	const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);
	const [faqSearch, setFAQSearch] = useState('');
	const [faqCategory, setFAQCategory] = useState('All');
	const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

	const tabs = [
		{ id: 'contact' as const, label: 'Contact Support', icon: MessageSquare },
		{ id: 'faq' as const, label: 'FAQs', icon: HelpCircle },
		{ id: 'guides' as const, label: 'Admin Guide', icon: BookOpen },
	];

	// FAQ filtering
	const categories = useMemo(() => {
		const cats = new Set(faqItems.map((f) => f.category));
		return ['All', ...Array.from(cats).sort()];
	}, []);

	const filteredFAQs = useMemo(() => {
		return faqItems.filter((item) => {
			const matchesCategory = faqCategory === 'All' || item.category === faqCategory;
			const searchLower = faqSearch.toLowerCase();
			const matchesSearch =
				!searchLower ||
				item.question.toLowerCase().includes(searchLower) ||
				item.category.toLowerCase().includes(searchLower);
			return matchesCategory && matchesSearch;
		});
	}, [faqCategory, faqSearch]);

	const faqCategoryCounts = useMemo(() => {
		const counts: Record<string, number> = { All: faqItems.length };
		faqItems.forEach((item) => {
			counts[item.category] = (counts[item.category] || 0) + 1;
		});
		return counts;
	}, []);

	return (
		<div className="min-h-screen bg-background p-4 sm:p-6">
			<div className="mx-auto max-w-6xl space-y-6">
				{/* Header */}
				<div className="text-center space-y-2">
					<div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 mb-2">
						<LifeBuoy className="h-8 w-8 text-primary" />
					</div>
					<h1 className="text-2xl sm:text-3xl font-bold text-foreground">
						Admin Support Center
					</h1>
					<p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
						Get help with system administration, technical issues, and feature
						requests. Browse our comprehensive guides and FAQs, or reach out to our support team.
					</p>
				</div>

				{/* Emergency Banner */}
				<div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
					<div className="flex items-start sm:items-center gap-3">
						<AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5 sm:mt-0" />
						<div>
							<p className="font-medium text-red-800 dark:text-red-300">Emergency Support</p>
							<p className="text-red-700 dark:text-red-400 text-sm">
								For critical system failures or security issues, call our
								emergency hotline:
								<strong className="ml-1">0776949463</strong>
							</p>
						</div>
					</div>
				</div>

				{/* Tab Navigation */}
				<div className="border-b border-border">
					<nav className="flex space-x-6 sm:space-x-8 overflow-x-auto">
						{tabs.map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
									activeTab === tab.id
										? 'border-primary text-primary'
										: 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
								}`}
							>
								<tab.icon className="h-4 w-4" />
								{tab.label}
							</button>
						))}
					</nav>
				</div>

				{/* ─── CONTACT SUPPORT TAB ─── */}
				{activeTab === 'contact' && (
					<div className="grid gap-6 md:grid-cols-2">
						<SupportCard
							icon={Phone}
							title="Phone Support"
							description="Speak with our support team during business hours for immediate assistance with urgent issues."
							action={
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<Phone className="h-4 w-4 text-muted-foreground" />
										<span className="font-medium">0776949463</span>
									</div>
									<div className="flex items-center gap-2">
										<Clock className="h-4 w-4 text-muted-foreground" />
										<span className="text-sm text-muted-foreground">
											Mon-Fri, 8 AM - 6 PM EST
										</span>
									</div>
								</div>
							}
						/>

						<SupportCard
							icon={Mail}
							title="Email Support"
							description="Send detailed technical questions and get comprehensive solutions. Best for non-urgent issues."
							action={
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<Mail className="h-4 w-4 text-muted-foreground" />
										<span className="font-medium">amossenkao@gmail.com</span>
									</div>
									<div className="flex items-center gap-2">
										<Clock className="h-4 w-4 text-muted-foreground" />
										<span className="text-sm text-muted-foreground">
											Response within 4-8 hours
										</span>
									</div>
								</div>
							}
						/>

						<SupportCard
							icon={HelpCircle}
							title="Self-Service Help"
							description="Browse our comprehensive FAQ and Admin Guide for instant answers to common questions."
							action={
								<div className="flex gap-2">
									<button
										onClick={() => setActiveTab('faq')}
										className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
									>
										<HelpCircle className="h-4 w-4" />
										Browse FAQs
									</button>
									<button
										onClick={() => setActiveTab('guides')}
										className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
									>
										<BookOpen className="h-4 w-4" />
										Admin Guide
									</button>
								</div>
							}
						/>

						<SupportCard
							icon={Monitor}
							title="System Status"
							description="Check the current operational status of all system components including real-time sync and payment processing."
							action={
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<CheckCircle className="h-4 w-4 text-green-600" />
										<span className="text-sm text-muted-foreground">All systems operational</span>
									</div>
									<div className="flex items-center gap-2">
										<RefreshCw className="h-4 w-4 text-green-600" />
										<span className="text-sm text-muted-foreground">Real-time sync active</span>
									</div>
								</div>
							}
						/>
					</div>
				)}

				{/* ─── FAQ TAB ─── */}
				{activeTab === 'faq' && (
					<div className="space-y-6">
						{/* Search & Filter */}
						<div className="flex flex-col sm:flex-row gap-3">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<input
									type="text"
									placeholder="Search FAQs..."
									value={faqSearch}
									onChange={(e) => setFAQSearch(e.target.value)}
									className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
								/>
							</div>
							<div className="flex gap-2 flex-wrap">
								{categories.map((cat) => (
									<button
										key={cat}
										onClick={() => setFAQCategory(cat)}
										className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
											faqCategory === cat
												? 'bg-primary text-primary-foreground border-primary'
												: 'bg-card text-muted-foreground border-border hover:bg-muted'
										}`}
									>
										{cat}
										{faqCategoryCounts[cat] > 0 && (
											<span className="ml-1 opacity-70">({faqCategoryCounts[cat]})</span>
										)}
									</button>
								))}
							</div>
						</div>

						{/* FAQ List */}
						{filteredFAQs.length > 0 ? (
							<div className="space-y-3">
								{filteredFAQs.map((item, index) => (
									<AccordionItem
										key={index}
										question={item.question}
										answer={item.answer}
										icon={item.icon}
										isOpen={openFAQIndex === index}
										onToggle={() =>
											setOpenFAQIndex(openFAQIndex === index ? null : index)
										}
									/>
									))}
							</div>
						) : (
							<div className="text-center py-12">
								<HelpCircle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
								<p className="text-muted-foreground text-sm">
									No FAQs match your search. Try a different keyword or browse all categories.
								</p>
								<button
									onClick={() => { setFAQSearch(''); setFAQCategory('All'); }}
									className="mt-3 text-primary text-sm font-medium hover:underline"
								>
									Clear filters
								</button>
							</div>
						)}
					</div>
				)}

				{/* ─── ADMIN GUIDE TAB ─── */}
				{activeTab === 'guides' && (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<p className="text-sm text-muted-foreground">
								Browse comprehensive guides organized by topic. Click any section to expand.
							</p>
							<span className="text-xs text-muted-foreground">
								{guideSections.length} guides available
							</span>
						</div>
						<div className="space-y-3">
							{guideSections.map((section) => (
								<GuideCard
									key={section.id}
									section={section}
									isExpanded={expandedGuide === section.id}
									onToggle={() =>
										setExpandedGuide(expandedGuide === section.id ? null : section.id)
									}
								/>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
