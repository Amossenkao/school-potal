'use client';
import React, { useState } from 'react';
import {
	MessageSquare,
	Phone,
	Mail,
	Clock,
	AlertCircle,
	CheckCircle,
	Send,
	FileText,
	Upload,
	X,
	HelpCircle,
	Zap,
	User,
	Calendar,
	Download,
} from 'lucide-react';

// Priority Badge Component
const PriorityBadge = ({ priority }) => {
	const styles = {
		low: 'bg-green-100 text-green-800 border-green-200',
		medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
		high: 'bg-red-100 text-red-800 border-red-200',
		critical: 'bg-red-200 text-red-900 border-red-300',
	};

	return (
		<span
			className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[priority]}`}
		>
			{priority.charAt(0).toUpperCase() + priority.slice(1)}
		</span>
	);
};

// Support Card Component
const SupportCard = ({
	icon: Icon,
	title,
	description,
	action,
	variant = 'default',
}) => {
	const variants = {
		default: 'border-border hover:border-primary/50',
		emergency: 'border-red-200 bg-red-50/50 hover:border-red-300',
	};

	return (
		<div
			className={`rounded-xl border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md ${variants[variant]}`}
		>
			<div className="flex items-start gap-4">
				<div
					className={`rounded-lg p-3 ${
						variant === 'emergency' ? 'bg-red-100' : 'bg-primary/10'
					}`}
				>
					<Icon
						className={`h-6 w-6 ${
							variant === 'emergency' ? 'text-red-600' : 'text-primary'
						}`}
					/>
				</div>
				<div className="flex-1">
					<h3 className="text-lg font-semibold text-foreground mb-2">
						{title}
					</h3>
					<p className="text-muted-foreground mb-4">{description}</p>
					{action}
				</div>
			</div>
		</div>
	);
};

export default function AdminSupport() {
	const [activeTab, setActiveTab] = useState('contact');

	const tabs = [
		{ id: 'contact', label: 'Contact Support', icon: MessageSquare },
		{ id: 'resources', label: 'Resources', icon: HelpCircle },
	];

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="mx-auto max-w-6xl space-y-8">
				{/* Header */}
				<div className="text-center space-y-2">
					<div className="inline-flex items-center justify-center rounded-full bg-blue-100 p-3 mb-4">
						<MessageSquare className="h-8 w-8 text-blue-600" />
					</div>
					<h1 className="text-3xl font-bold text-foreground">
						Admin Support Center
					</h1>
					<p className="text-muted-foreground max-w-2xl mx-auto">
						Get help with system administration, technical issues, and feature
						requests. Our development team is here to support you.
					</p>
				</div>

				{/* Emergency Banner */}
				<div className="rounded-lg bg-red-50 border border-red-200 p-4">
					<div className="flex items-center gap-3">
						<AlertCircle className="h-5 w-5 text-red-600" />
						<div>
							<p className="font-medium text-red-800">Emergency Support</p>
							<p className="text-red-700 text-sm">
								For critical system failures or security issues, call our
								emergency hotline:
								<strong className="ml-1">0776949463</strong>
							</p>
						</div>
					</div>
				</div>

				{/* Tab Navigation */}
				<div className="border-b border-border">
					<nav className="flex space-x-8">
						{tabs.map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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

				{/* Tab Content */}
				<div className="space-y-6">
					{/* Contact Support Tab */}
					{activeTab === 'contact' && (
						<div className="grid gap-6 md:grid-cols-2">
							<SupportCard
								icon={Phone}
								title="Phone Support"
								description="Speak with our support team during business hours."
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
								description="Send detailed technical questions and get comprehensive solutions."
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

							{/* <SupportCard
								icon={Zap}
								title="Critical Issues"
								description="For system outages, security breaches, or data corruption issues."
								variant="emergency"
								action={
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<Phone className="h-4 w-4 text-red-600" />
											<span className="font-medium text-red-800">
												+1 (555) 123-HELP
											</span>
										</div>
										<div className="flex items-center gap-2">
											<Clock className="h-4 w-4 text-red-600" />
											<span className="text-sm text-red-700">
												24/7 Emergency Line
											</span>
										</div>
									</div>
								}
							/> */}

							{/* <SupportCard
								icon={MessageSquare}
								title="Live Chat"
								description="Chat with our technical team for quick questions and guidance."
								action={
									<button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
										<MessageSquare className="h-4 w-4" />
										Start Chat
									</button>
								}
							/> */}
						</div>
					)}

					{/* Resources Tab */}
					{activeTab === 'resources' && (
						<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
								<div className="flex items-center gap-3 mb-4">
									<FileText className="h-6 w-6 text-primary" />
									<h3 className="text-lg font-semibold text-foreground">
										Documentation
									</h3>
								</div>
								<p className="text-muted-foreground mb-4">
									Comprehensive guides for system administration and
									troubleshooting.
								</p>
								<button className="inline-flex items-center gap-2 text-primary hover:text-primary/80">
									<Download className="h-4 w-4" />
									Download Admin Guide
								</button>
							</div>

							<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
								<div className="flex items-center gap-3 mb-4">
									<HelpCircle className="h-6 w-6 text-primary" />
									<h3 className="text-lg font-semibold text-foreground">FAQ</h3>
								</div>
								<p className="text-muted-foreground mb-4">
									Common questions and solutions for system administrators.
								</p>
								<button className="inline-flex items-center gap-2 text-primary hover:text-primary/80">
									<HelpCircle className="h-4 w-4" />
									View FAQ
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
