import React, { useState } from 'react';
import {
	AlertTriangle,
	Mail,
	Phone,
	Clock,
	RefreshCw,
	X,
	ExternalLink,
	Copy,
} from 'lucide-react';

interface InactiveAccountProps {
	schoolName: string[];
	contactEmail?: string;
	contactPhone?: string;
	onRetry?: () => void;
}

const InactiveAccountDisplay: React.FC<InactiveAccountProps> = ({
	schoolName = ['School'],
	contactEmail = 'amossenkao@gmail.com',
	contactPhone = '0776949463',
	onRetry,
}) => {
	const [showContactModal, setShowContactModal] = useState(false);
	const [copiedText, setCopiedText] = useState<string | null>(null);

	const copyToClipboard = async (text: string, label: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedText(label);
			setTimeout(() => setCopiedText(null), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};
	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<div className="max-w-2xl w-full">
				{/* Main Card */}
				<div className="bg-card rounded-2xl shadow-lg border overflow-hidden">
					{/* Header Section */}
					<div className="bg-destructive p-8 text-center">
						<div className="inline-flex items-center justify-center w-20 h-20 bg-background/20 rounded-full mb-4">
							<AlertTriangle className="w-10 h-10 text-destructive-foreground" />
						</div>
						<h1 className="text-3xl font-bold text-destructive-foreground mb-2">
							Account Suspended
						</h1>
						<p className="text-destructive-foreground/80 text-lg">
							{schoolName} Portal Access Restricted
						</p>
					</div>

					{/* Content Section */}
					<div className="p-8 space-y-6">
						<div className="text-center">
							<h2 className="text-2xl font-semibold text-foreground mb-4">
								Service Temporarily Unavailable
							</h2>
							<p className="text-muted-foreground text-lg leading-relaxed">
								Your school's account is currently inactive. This may be due to
								subscription expiry, payment issues, or administrative
								requirements that need attention.
							</p>
						</div>

						{/* Status Indicators */}
						<div className="grid md:grid-cols-3 gap-4 my-8">
							<div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
								<div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-3">
									<Clock className="w-6 h-6 text-destructive" />
								</div>
								<h3 className="font-semibold text-destructive mb-1">
									Access Suspended
								</h3>
								<p className="text-sm text-destructive/80">
									Portal temporarily disabled
								</p>
							</div>

							<div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 text-center">
								<div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
									<AlertTriangle className="w-6 h-6 text-orange-500" />
								</div>
								<h3 className="font-semibold text-orange-500 mb-1">
									Action Required
								</h3>
								<p className="text-sm text-orange-500/80">
									Administrator attention needed
								</p>
							</div>

							<div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
								<div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
									<RefreshCw className="w-6 h-6 text-primary" />
								</div>
								<h3 className="font-semibold text-primary mb-1">
									Quick Restoration
								</h3>
								<p className="text-sm text-primary/80">
									Contact support for help
								</p>
							</div>
						</div>

						{/* Contact Support Button */}
						<div className="text-center">
							<button
								onClick={() => setShowContactModal(true)}
								className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors text-lg"
							>
								<Mail className="w-5 h-5 mr-3" />
								Contact Support
							</button>
						</div>

						{/* Retry Button */}
						{onRetry && (
							<div className="text-center pt-4">
								<button
									onClick={onRetry}
									className="inline-flex items-center px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
								>
									<RefreshCw className="w-4 h-4 mr-2" />
									Check Status Again
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Contact Support Modal */}
				{showContactModal && (
					<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
						<div className="bg-card rounded-xl shadow-lg border max-w-md w-full">
							{/* Modal Header */}
							<div className="flex items-center justify-between p-6 border-b border-border">
								<h3 className="text-xl font-semibold text-foreground">
									Contact System Support
								</h3>
								<button
									onClick={() => setShowContactModal(false)}
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									<X className="w-5 h-5" />
								</button>
							</div>

							{/* Modal Content */}
							<div className="p-6 space-y-6">
								<div className="text-center">
									<div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
										<Mail className="w-8 h-8 text-primary" />
									</div>
									<p className="text-muted-foreground">
										Get help from our system administrators to restore your
										shcool's account.
									</p>
								</div>

								{/* Contact Methods */}
								<div className="space-y-4">
									{/* Email */}
									<div className="bg-muted rounded-lg p-4">
										<div className="flex items-center justify-between">
											<div className="flex items-center">
												<div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
													<Mail className="w-5 h-5 text-primary" />
												</div>
												<div>
													<h4 className="font-medium text-foreground">
														Email Support
													</h4>
													<p className="text-sm text-muted-foreground">
														{contactEmail}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<button
													onClick={() => copyToClipboard(contactEmail, 'email')}
													className="p-2 text-muted-foreground hover:text-foreground transition-colors"
													title="Copy email"
												>
													<Copy className="w-4 h-4" />
												</button>
												<a
													href={`mailto:${contactEmail}?subject=Account Activation Request - ${schoolName}&body=Hello,%0A%0AI am requesting account activation for ${schoolName}.%0A%0AAccount ID: ${schoolName
														.replace(/\s+/g, '')
														.toLowerCase()}-${Math.random()
														.toString(36)
														.substr(2, 8)}%0A%0AThank you.`}
													className="p-2 text-muted-foreground hover:text-foreground transition-colors"
													title="Send email"
												>
													<ExternalLink className="w-4 h-4" />
												</a>
											</div>
										</div>
										{copiedText === 'email' && (
											<p className="text-xs text-primary mt-2">
												Email copied to clipboard!
											</p>
										)}
									</div>

									{/* Phone */}
									<div className="bg-muted rounded-lg p-4">
										<div className="flex items-center justify-between">
											<div className="flex items-center">
												<div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center mr-3">
													<Phone className="w-5 h-5 text-emerald-600" />
												</div>
												<div>
													<h4 className="font-medium text-foreground">
														Phone Support
													</h4>
													<p className="text-sm text-muted-foreground">
														{contactPhone}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<button
													onClick={() => copyToClipboard(contactPhone, 'phone')}
													className="p-2 text-muted-foreground hover:text-foreground transition-colors"
													title="Copy phone"
												>
													<Copy className="w-4 h-4" />
												</button>
												<a
													href={`tel:${contactPhone}`}
													className="p-2 text-muted-foreground hover:text-foreground transition-colors"
													title="Call now"
												>
													<ExternalLink className="w-4 h-4" />
												</a>
											</div>
										</div>
										{copiedText === 'phone' && (
											<p className="text-xs text-primary mt-2">
												Phone number copied to clipboard!
											</p>
										)}
									</div>
								</div>
							</div>

							{/* Modal Footer */}
							<div className="border-t border-border p-6">
								<button
									onClick={() => setShowContactModal(false)}
									className="w-full px-4 py-2 bg-muted text-muted-foreground font-medium rounded-lg hover:bg-muted/80 transition-colors"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default InactiveAccountDisplay;
