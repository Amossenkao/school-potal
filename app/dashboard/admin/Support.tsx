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
	const [ticketForm, setTicketForm] = useState({
		priority: 'medium',
		category: 'technical',
		subject: '',
		description: '',
		systemInfo: true,
	});
	const [attachments, setAttachments] = useState([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitSuccess, setSubmitSuccess] = useState(false);

	const handleInputChange = (field, value) => {
		setTicketForm((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleFileUpload = (event) => {
		const files = Array.from(event.target.files);
		setAttachments((prev) => [...prev, ...files]);
	};

	const removeAttachment = (index) => {
		setAttachments((prev) => prev.filter((_, i) => i !== index));
	};

	const handleSubmitTicket = async () => {
		setIsSubmitting(true);
		setSubmitSuccess(false);

		// Collect system information
		const systemInfo = {
			userAgent: navigator.userAgent,
			timestamp: new Date().toISOString(),
			url: window.location.href,
			screenResolution: `${screen.width}x${screen.height}`,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		};

		const ticketData = {
			...ticketForm,
			attachments: attachments.map((file) => file.name),
			systemInfo: ticketForm.systemInfo ? systemInfo : null,
			ticketId: `ADMIN-${Date.now()}`,
		};

		try {
			console.log('Submitting support ticket:', ticketData);

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 2000));

			setSubmitSuccess(true);
			setTicketForm({
				priority: 'medium',
				category: 'technical',
				subject: '',
				description: '',
				systemInfo: true,
			});
			setAttachments([]);

			setTimeout(() => setSubmitSuccess(false), 5000);
		} catch (error) {
			console.error('Error submitting ticket:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const supportCategories = [
		{ value: 'technical', label: 'Technical Issue' },
		{ value: 'access', label: 'Access & Permissions' },
		{ value: 'data', label: 'Data & Reports' },
		{ value: 'performance', label: 'System Performance' },
		{ value: 'security', label: 'Security Concern' },
		{ value: 'feature', label: 'Feature Request' },
		{ value: 'other', label: 'Other' },
	];

	const tabs = [
		{ id: 'contact', label: 'Contact Support', icon: MessageSquare },
		{ id: 'ticket', label: 'Submit Ticket', icon: FileText },
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
								<strong className="ml-1">+1 (555) 123-HELP</strong>
							</p>
						</div>
					</div>
				</div>

				{/* Success Message */}
				{submitSuccess && (
					<div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
						<CheckCircle className="h-5 w-5 text-green-600" />
						<div>
							<p className="text-green-800 font-medium">
								Support ticket submitted successfully!
							</p>
							<p className="text-green-700 text-sm">
								You'll receive a confirmation email with your ticket ID shortly.
							</p>
						</div>
					</div>
				)}

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
								description="Speak directly with our technical support team during business hours."
								action={
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<Phone className="h-4 w-4 text-muted-foreground" />
											<span className="font-medium">+1 (555) 123-TECH</span>
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
											<span className="font-medium">
												admin-support@system.com
											</span>
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
							/>

							<SupportCard
								icon={MessageSquare}
								title="Live Chat"
								description="Chat with our technical team for quick questions and guidance."
								action={
									<button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
										<MessageSquare className="h-4 w-4" />
										Start Chat
									</button>
								}
							/>
						</div>
					)}

					{/* Submit Ticket Tab */}
					{activeTab === 'ticket' && (
						<div className="max-w-3xl mx-auto">
							<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
								<h2 className="text-xl font-semibold text-foreground mb-6">
									Submit Support Ticket
								</h2>

								<div className="space-y-6">
									{/* Priority and Category */}
									<div className="grid gap-4 md:grid-cols-2">
										<div>
											<label className="block text-sm font-medium text-foreground mb-2">
												Priority Level
											</label>
											<select
												value={ticketForm.priority}
												onChange={(e) =>
													handleInputChange('priority', e.target.value)
												}
												className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
											>
												<option value="low">Low - General inquiry</option>
												<option value="medium">Medium - Standard issue</option>
												<option value="high">
													High - Affecting operations
												</option>
												<option value="critical">Critical - System down</option>
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium text-foreground mb-2">
												Category
											</label>
											<select
												value={ticketForm.category}
												onChange={(e) =>
													handleInputChange('category', e.target.value)
												}
												className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
											>
												{supportCategories.map((category) => (
													<option key={category.value} value={category.value}>
														{category.label}
													</option>
												))}
											</select>
										</div>
									</div>

									{/* Subject */}
									<div>
										<label className="block text-sm font-medium text-foreground mb-2">
											Subject
										</label>
										<input
											type="text"
											value={ticketForm.subject}
											onChange={(e) =>
												handleInputChange('subject', e.target.value)
											}
											placeholder="Brief description of the issue"
											className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
										/>
									</div>

									{/* Description */}
									<div>
										<label className="block text-sm font-medium text-foreground mb-2">
											Detailed Description
										</label>
										<textarea
											value={ticketForm.description}
											onChange={(e) =>
												handleInputChange('description', e.target.value)
											}
											rows={6}
											placeholder="Please provide detailed information about the issue, including steps to reproduce, error messages, and any relevant context..."
											className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
										/>
									</div>

									{/* File Attachments */}
									<div>
										<label className="block text-sm font-medium text-foreground mb-2">
											Attachments
										</label>
										<div className="space-y-3">
											<div className="flex items-center justify-center w-full">
												<label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50">
													<div className="flex flex-col items-center justify-center pt-5 pb-6">
														<Upload className="w-8 h-8 mb-2 text-muted-foreground" />
														<p className="text-sm text-muted-foreground">
															Click to upload screenshots, logs, or error
															reports
														</p>
													</div>
													<input
														type="file"
														multiple
														onChange={handleFileUpload}
														className="hidden"
														accept=".jpg,.jpeg,.png,.pdf,.txt,.log"
													/>
												</label>
											</div>

											{/* Attached Files */}
											{attachments.length > 0 && (
												<div className="space-y-2">
													{attachments.map((file, index) => (
														<div
															key={index}
															className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
														>
															<div className="flex items-center gap-2">
																<FileText className="h-4 w-4 text-muted-foreground" />
																<span className="text-sm text-foreground">
																	{file.name}
																</span>
																<span className="text-xs text-muted-foreground">
																	({Math.round(file.size / 1024)} KB)
																</span>
															</div>
															<button
																onClick={() => removeAttachment(index)}
																className="text-muted-foreground hover:text-red-500"
															>
																<X className="h-4 w-4" />
															</button>
														</div>
													))}
												</div>
											)}
										</div>
									</div>

									{/* System Information */}
									<div className="flex items-center gap-3">
										<input
											type="checkbox"
											id="systemInfo"
											checked={ticketForm.systemInfo}
											onChange={(e) =>
												handleInputChange('systemInfo', e.target.checked)
											}
											className="rounded border-border"
										/>
										<label
											htmlFor="systemInfo"
											className="text-sm text-foreground"
										>
											Include system information (browser, OS, timestamp) to
											help with debugging
										</label>
									</div>

									{/* Submit Button */}
									<div className="flex justify-end pt-4">
										<button
											onClick={handleSubmitTicket}
											disabled={
												isSubmitting ||
												!ticketForm.subject ||
												!ticketForm.description
											}
											className={`inline-flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium transition-colors ${
												isSubmitting ||
												!ticketForm.subject ||
												!ticketForm.description
													? 'bg-muted text-muted-foreground cursor-not-allowed'
													: 'bg-primary text-primary-foreground hover:bg-primary/90'
											}`}
										>
											{isSubmitting ? (
												<>
													<div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"></div>
													Submitting...
												</>
											) : (
												<>
													<Send className="h-4 w-4" />
													Submit Ticket
												</>
											)}
										</button>
									</div>
								</div>
							</div>
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

							<div className="rounded-xl border border-border bg-card p-6 shadow-sm">
								<div className="flex items-center gap-3 mb-4">
									<Calendar className="h-6 w-6 text-primary" />
									<h3 className="text-lg font-semibold text-foreground">
										Training Sessions
									</h3>
								</div>
								<p className="text-muted-foreground mb-4">
									Schedule one-on-one training with our development team.
								</p>
								<button className="inline-flex items-center gap-2 text-primary hover:text-primary/80">
									<Calendar className="h-4 w-4" />
									Schedule Session
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
