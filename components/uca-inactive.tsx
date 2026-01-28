import React, { useState } from 'react';
import { X, Check, Zap, Crown, Building2, ArrowRight } from 'lucide-react';

export default function VercelUpgrade() {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedPlan, setSelectedPlan] = useState('pro');

	const plans = [
		{
			id: 'pro',
			name: 'Pro',
			icon: Zap,
			price: '$20',
			period: '/month',
			color: 'from-amber-500 to-orange-600',
			description: 'For professional developers and growing teams',
			features: [
				'Unlimited deployments',
				'100GB bandwidth included',
				'Advanced analytics',
				'Custom domains (unlimited)',
				'Team collaboration (up to 10 members)',
				'Preview deployments',
				'Edge Functions',
				'Web Analytics',
				'Priority support',
				'Commercial usage rights',
			],
		},
		{
			id: 'premium',
			name: 'Premium',
			icon: Crown,
			price: '$50',
			period: '/month',
			color: 'from-violet-600 to-purple-700',
			description: 'Advanced features for scaling applications',
			features: [
				'Everything in Pro',
				'1TB bandwidth included',
				'Advanced security features',
				'Custom SSL certificates',
				'Team collaboration (up to 50 members)',
				'Password protection',
				'DDoS mitigation',
				'Real-time collaboration tools',
				'Advanced deployment controls',
				'Dedicated Slack channel',
				'99.99% uptime SLA',
				'Enhanced monitoring',
			],
			popular: true,
		},
		{
			id: 'enterprise',
			name: 'Enterprise',
			icon: Building2,
			price: 'Custom',
			period: 'pricing',
			color: 'from-slate-700 to-slate-900',
			description: 'Enterprise-grade infrastructure and support',
			features: [
				'Everything in Premium',
				'Custom bandwidth allocation',
				'White-glove onboarding',
				'Unlimited team members',
				'Single Sign-On (SSO)',
				'Advanced compliance (SOC 2, HIPAA)',
				'Custom contracts',
				'Dedicated account manager',
				'Priority feature requests',
				'24/7 premium support',
				'Custom integrations',
				'Service Level Agreements',
			],
		},
	];

	return (
		<>
			{/* Expired Plan Banner */}
			<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-6">
				<div className="max-w-2xl w-full">
					<div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
						{/* Decorative gradient bar */}
						<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500"></div>

						<div className="p-12">
							{/* Icon and Status */}
							<div className="flex items-center justify-center mb-8">
								<div className="relative">
									<div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 animate-pulse"></div>
									<div className="relative w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center rotate-3 shadow-lg">
										<svg
											className="w-10 h-10 text-white"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2.5}
												d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
											/>
										</svg>
									</div>
								</div>
							</div>

							{/* Title */}
							<h1 className="text-5xl font-bold text-center mb-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent leading-tight tracking-tight">
								Your Free Plan Has Expired
							</h1>

							{/* Subtitle */}
							<p className="text-xl text-slate-600 text-center mb-10 leading-relaxed max-w-lg mx-auto font-light">
								Your projects are currently paused. Upgrade to restore access
								and unlock powerful features for professional deployment.
							</p>

							{/* Features Lost */}
							<div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 mb-8 border border-slate-200">
								<p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
									Currently Limited
								</p>
								<div className="grid grid-cols-2 gap-3">
									{[
										'Deployments disabled',
										'Custom domains removed',
										'Analytics unavailable',
										'Team features locked',
									].map((item, i) => (
										<div
											key={i}
											className="flex items-center gap-2 text-slate-600"
										>
											<div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
											<span className="text-sm">{item}</span>
										</div>
									))}
								</div>
							</div>

							{/* CTA Button */}
							<button
								onClick={() => setIsModalOpen(true)}
								className="group w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:via-slate-700 hover:to-slate-800 text-white font-semibold py-5 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg"
							>
								<span>View Upgrade Options</span>
								<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
							</button>

							<p className="text-center text-sm text-slate-500 mt-6">
								Need help?{' '}
								<a
									href="#"
									className="text-slate-700 underline hover:text-slate-900"
								>
									Contact our sales team
								</a>
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Upgrade Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
					<div className="bg-white rounded-3xl max-w-7xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-slideUp">
						{/* Modal Header */}
						<div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white">
							<button
								onClick={() => setIsModalOpen(false)}
								className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all group"
							>
								<X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
							</button>

							<div className="max-w-3xl">
								<h2 className="text-5xl font-bold mb-3 tracking-tight">
									Choose Your Plan
								</h2>
								<p className="text-xl text-slate-300 font-light">
									Scale your deployments with the perfect plan for your needs
								</p>
							</div>
						</div>

						{/* Plans Grid */}
						<div className="overflow-y-auto max-h-[calc(90vh-180px)] p-8">
							<div className="grid md:grid-cols-3 gap-6">
								{plans.map((plan) => {
									const Icon = plan.icon;
									return (
										<div
											key={plan.id}
											className={`relative rounded-2xl border-2 transition-all duration-300 ${
												selectedPlan === plan.id
													? 'border-slate-900 shadow-2xl scale-105'
													: 'border-slate-200 hover:border-slate-300 hover:shadow-lg'
											} ${plan.popular ? 'ring-2 ring-violet-500 ring-offset-4' : ''}`}
										>
											{plan.popular && (
												<div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-violet-600 to-purple-700 text-white text-sm font-semibold rounded-full shadow-lg">
													Most Popular
												</div>
											)}

											<div className="p-8">
												{/* Plan Icon */}
												<div
													className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6 shadow-lg`}
												>
													<Icon className="w-7 h-7 text-white" />
												</div>

												{/* Plan Name */}
												<h3 className="text-2xl font-bold text-slate-900 mb-2">
													{plan.name}
												</h3>
												<p className="text-sm text-slate-600 mb-6 min-h-[2.5rem]">
													{plan.description}
												</p>

												{/* Pricing */}
												<div className="mb-8">
													<div className="flex items-baseline gap-1 mb-1">
														<span className="text-5xl font-bold text-slate-900">
															{plan.price}
														</span>
														<span className="text-lg text-slate-500 font-light">
															{plan.period}
														</span>
													</div>
												</div>

												{/* Select Button */}
												<button
													onClick={() => setSelectedPlan(plan.id)}
													className={`w-full py-3.5 px-6 rounded-xl font-semibold transition-all duration-300 mb-8 ${
														selectedPlan === plan.id
															? `bg-gradient-to-r ${plan.color} text-white shadow-lg`
															: 'bg-slate-100 text-slate-900 hover:bg-slate-200'
													}`}
												>
													{selectedPlan === plan.id
														? 'Selected'
														: plan.id === 'enterprise'
															? 'Contact Sales'
															: 'Select Plan'}
												</button>

												{/* Features List */}
												<div className="space-y-3">
													<p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
														What's Included
													</p>
													{plan.features.map((feature, index) => (
														<div key={index} className="flex items-start gap-3">
															<div
																className={`mt-0.5 w-5 h-5 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center flex-shrink-0`}
															>
																<Check
																	className="w-3 h-3 text-white"
																	strokeWidth={3}
																/>
															</div>
															<span className="text-sm text-slate-700 leading-relaxed">
																{feature}
															</span>
														</div>
													))}
												</div>
											</div>
										</div>
									);
								})}
							</div>

							{/* Bottom CTA */}
							<div className="mt-10 pt-8 border-t border-slate-200">
								<div className="flex items-center justify-between max-w-4xl mx-auto">
									<div>
										<p className="text-sm text-slate-600">
											All plans include a{' '}
											<span className="font-semibold text-slate-900">
												14-day money-back guarantee
											</span>
										</p>
									</div>
									<button className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-3.5 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 flex items-center gap-2 group">
										Continue to Checkout
										<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			<style jsx>{`
				@keyframes fadeIn {
					from {
						opacity: 0;
					}
					to {
						opacity: 1;
					}
				}
				@keyframes slideUp {
					from {
						opacity: 0;
						transform: translateY(20px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				.animate-fadeIn {
					animation: fadeIn 0.2s ease-out;
				}
				.animate-slideUp {
					animation: slideUp 0.3s ease-out;
				}
			`}</style>
		</>
	);
}
