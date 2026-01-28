import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

export default function VercelUpgrade() {
	const [isModalOpen, setIsModalOpen] = useState(false);

	const plans = [
		{
			id: 'hobby',
			name: 'Hobby',
			price: 'Free',
			period: 'forever',
			description:
				'The perfect starting place for your web app or personal project.',
			features: [
				'Import your repo, deploy in seconds',
				'Automatic CI/CD',
				'Web Application Firewall',
				'Global, automated CDN',
				'Fluid compute',
				'DDoS Mitigation',
				'Traffic & performance insights',
			],
			cta: 'Start Deploying',
			url: 'https://vercel.com/new',
			disabled: true,
		},
		{
			id: 'pro',
			name: 'Pro',
			price: '$20',
			period: '/mo',
			additionalText: '+ additional usage',
			description: 'Everything you need to build and scale your app.',
			features: [
				'All Hobby features, plus:',
				'$20 of included usage credit',
				'Advanced spend management',
				'Team collaboration & free viewer seats',
				'Faster builds + no queues',
				'Cold start prevention',
				'Enterprise add-ons',
			],
			cta: 'Start a free trial',
			url: 'https://vercel.com/signup?plan=pro&next=/dashboard',
			popular: true,
		},
		{
			id: 'enterprise',
			name: 'Enterprise',
			price: 'Custom',
			period: '',
			description:
				'Critical security, performance, observability, platform SLAs, and support.',
			features: [
				'All Pro features, plus:',
				'Guest & Team access controls',
				'SCIM & Directory Sync',
				'Managed WAF Rulesets',
				'Multi-region compute & failover',
				'99.99% SLA',
				'Advanced Support',
			],
			cta: 'Get a demo',
			secondaryCta: 'Request Trial',
			url: 'https://vercel.com/contact/sales/pricing',
			secondaryUrl: 'https://vercel.com/contact/sales/enterprise-trial',
		},
	];

	const handleUpgrade = (plan) => {
		if (plan.url) {
			window.location.href = plan.url;
		}
	};

	return (
		<>
			{/* Expired Plan Banner */}
			<div className="min-h-screen bg-white flex items-center justify-center p-6">
				<div className="max-w-2xl w-full">
					<div className="text-center">
						{/* Vercel Logo */}
						<div className="flex items-center justify-center mb-8">
							<img src="/vercel.svg" alt="Vercel" className="h-6" />
						</div>

						{/* Icon */}
						<div className="flex items-center justify-center mb-6">
							<div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
								<svg
									className="w-8 h-8 text-white"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
							</div>
						</div>

						{/* Title */}
						<h1 className="text-4xl font-bold text-black mb-4 tracking-tight">
							Your Hobby plan has expired
						</h1>

						{/* Subtitle */}
						<p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
							Your projects are paused. Upgrade to restore access and unlock
							powerful deployment features.
						</p>

						{/* CTA Button */}
						<button
							onClick={() => setIsModalOpen(true)}
							className="bg-black hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
						>
							View Upgrade Options
						</button>

						<p className="text-sm text-gray-500 mt-6">
							Need help?{' '}
							<a
								href="https://vercel.com/contact/sales"
								className="text-black underline hover:no-underline"
							>
								Contact Sales
							</a>
						</p>
					</div>
				</div>
			</div>

			{/* Upgrade Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
						{/* Modal Header */}
						<div className="relative border-b border-gray-200 p-8">
							<button
								onClick={() => setIsModalOpen(false)}
								className="absolute top-6 right-6 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
							>
								<X className="w-5 h-5 text-gray-500" />
							</button>

							<div>
								<div className="mb-6">
									<img src="/vercel.svg" alt="Vercel" className="h-6" />
								</div>
								<h2 className="text-3xl font-bold text-black mb-2">
									Find a plan to power your apps.
								</h2>
								<p className="text-gray-600">
									Vercel supports teams of all sizes, with pricing that scales.
								</p>
							</div>
						</div>

						{/* Plans Grid */}
						<div className="overflow-y-auto max-h-[calc(90vh-140px)] p-8">
							<div className="grid md:grid-cols-3 gap-6">
								{plans.map((plan) => (
									<div
										key={plan.id}
										className={`relative rounded-xl border-2 p-8 ${
											plan.popular
												? 'border-black'
												: plan.disabled
													? 'border-gray-200 opacity-60'
													: 'border-gray-200'
										}`}
									>
										{plan.popular && (
											<div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black text-white text-xs font-medium rounded-full">
												Popular
											</div>
										)}

										{/* Plan Name */}
										<div className="mb-6">
											<h3 className="text-xl font-bold text-black mb-2">
												{plan.name}
											</h3>
											<div className="flex items-baseline gap-1 mb-3">
												<span className="text-4xl font-bold text-black">
													{plan.price}
												</span>
												{plan.period && (
													<span className="text-gray-500">{plan.period}</span>
												)}
											</div>
											{plan.additionalText && (
												<p className="text-sm text-gray-600 mb-3">
													{plan.additionalText}
												</p>
											)}
											<p className="text-sm text-gray-600 leading-relaxed">
												{plan.description}
											</p>
										</div>

										{/* CTA Buttons */}
										<div className="mb-8 space-y-2">
											<button
												onClick={() => handleUpgrade(plan)}
												disabled={plan.disabled}
												className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors ${
													plan.popular
														? 'bg-black hover:bg-gray-800 text-white'
														: plan.disabled
															? 'bg-gray-100 text-gray-400 cursor-not-allowed'
															: 'bg-gray-100 hover:bg-gray-200 text-black'
												}`}
											>
												{plan.cta}
											</button>
											{plan.secondaryCta && (
												<button
													onClick={() =>
														(window.location.href = plan.secondaryUrl)
													}
													className="w-full py-2.5 px-4 rounded-lg font-medium transition-colors border border-gray-300 hover:border-gray-400 text-black"
												>
													{plan.secondaryCta}
												</button>
											)}
										</div>

										{/* Features List */}
										<div className="space-y-3">
											{plan.features.map((feature, index) => (
												<div key={index} className="flex items-start gap-3">
													<Check
														className="w-5 h-5 text-black flex-shrink-0 mt-0.5"
														strokeWidth={2.5}
													/>
													<span className="text-sm text-gray-700 leading-relaxed">
														{feature}
													</span>
												</div>
											))}
										</div>
									</div>
								))}
							</div>

							{/* Footer Note */}
							<div className="mt-8 pt-6 border-t border-gray-200 text-center">
								<p className="text-sm text-gray-600">
									Not sure which plan to pick?{' '}
									<a
										href="https://vercel.com/contact/sales/pricing"
										className="text-black underline hover:no-underline"
									>
										Discuss Pro or Enterprise needs with us
									</a>
								</p>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
