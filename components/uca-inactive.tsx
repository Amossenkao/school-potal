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
			<div
				style={{
					minHeight: '100vh',
					backgroundColor: '#000000',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					padding: '24px',
				}}
			>
				<div style={{ maxWidth: '672px', width: '100%' }}>
					<div style={{ textAlign: 'center' }}>
						{/* Vercel Logo with Text */}
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								gap: '12px',
								marginBottom: '48px',
							}}
						>
							<img src="/vercel.svg" alt="Vercel" style={{ height: '32px' }} />
							<span
								style={{
									color: '#FFFFFF',
									fontSize: '24px',
									fontWeight: '600',
								}}
							>
								Vercel
							</span>
						</div>

						{/* Icon */}
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								marginBottom: '24px',
							}}
						>
							<div
								style={{
									width: '64px',
									height: '64px',
									backgroundColor: '#FFFFFF',
									borderRadius: '50%',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<svg
									style={{ width: '32px', height: '32px', color: '#000000' }}
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
						<h1
							style={{
								fontSize: '36px',
								fontWeight: '700',
								color: '#FFFFFF',
								marginBottom: '16px',
								letterSpacing: '-0.025em',
							}}
						>
							Your Hobby plan has expired
						</h1>

						{/* Subtitle */}
						<p
							style={{
								fontSize: '18px',
								color: '#9CA3AF',
								marginBottom: '32px',
								maxWidth: '448px',
								marginLeft: 'auto',
								marginRight: 'auto',
							}}
						>
							Your projects are paused. Upgrade to restore access and unlock
							powerful deployment features.
						</p>

						{/* CTA Button */}
						<button
							onClick={() => setIsModalOpen(true)}
							style={{
								backgroundColor: '#FFFFFF',
								color: '#000000',
								fontWeight: '500',
								padding: '12px 24px',
								borderRadius: '8px',
								border: 'none',
								cursor: 'pointer',
								display: 'inline-flex',
								alignItems: 'center',
								gap: '8px',
								transition: 'background-color 0.2s',
							}}
							onMouseEnter={(e) =>
								(e.currentTarget.style.backgroundColor = '#F3F4F6')
							}
							onMouseLeave={(e) =>
								(e.currentTarget.style.backgroundColor = '#FFFFFF')
							}
						>
							View Upgrade Options
						</button>

						<p
							style={{ fontSize: '14px', color: '#6B7280', marginTop: '24px' }}
						>
							Need help?{' '}
							<a
								href="https://vercel.com/contact/sales"
								style={{ color: '#FFFFFF', textDecoration: 'underline' }}
							>
								Contact Sales
							</a>
						</p>
					</div>
				</div>
			</div>

			{/* Upgrade Modal */}
			{isModalOpen && (
				<div
					style={{
						position: 'fixed',
						inset: '0',
						backgroundColor: 'rgba(0, 0, 0, 0.5)',
						backdropFilter: 'blur(8px)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: '16px',
						zIndex: '50',
					}}
				>
					<div
						style={{
							backgroundColor: '#FFFFFF',
							borderRadius: '24px',
							maxWidth: '1152px',
							width: '100%',
							maxHeight: '90vh',
							overflow: 'hidden',
							boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
						}}
					>
						{/* Modal Header */}
						<div
							style={{
								position: 'relative',
								backgroundColor: '#000000',
								borderBottom: '1px solid #1F2937',
								padding: '32px',
							}}
						>
							<button
								onClick={() => setIsModalOpen(false)}
								style={{
									position: 'absolute',
									top: '24px',
									right: '24px',
									width: '32px',
									height: '32px',
									borderRadius: '50%',
									backgroundColor: 'transparent',
									border: 'none',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									cursor: 'pointer',
									transition: 'background-color 0.2s',
								}}
								onMouseEnter={(e) =>
									(e.currentTarget.style.backgroundColor = '#1F2937')
								}
								onMouseLeave={(e) =>
									(e.currentTarget.style.backgroundColor = 'transparent')
								}
							>
								<X
									style={{ width: '20px', height: '20px', color: '#9CA3AF' }}
								/>
							</button>

							<div>
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '12px',
										marginBottom: '32px',
									}}
								>
									<img
										src="/vercel.svg"
										alt="Vercel"
										style={{ height: '32px' }}
									/>
									<span
										style={{
											color: '#FFFFFF',
											fontSize: '24px',
											fontWeight: '600',
										}}
									>
										Vercel
									</span>
								</div>
								<h2
									style={{
										fontSize: '30px',
										fontWeight: '700',
										color: '#FFFFFF',
										marginBottom: '8px',
									}}
								>
									Find a plan to power your apps.
								</h2>
								<p style={{ color: '#9CA3AF' }}>
									Vercel supports teams of all sizes, with pricing that scales.
								</p>
							</div>
						</div>

						{/* Plans Grid */}
						<div
							style={{
								overflowY: 'auto',
								maxHeight: 'calc(90vh - 140px)',
								padding: '32px',
							}}
						>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
									gap: '24px',
								}}
							>
								{plans.map((plan) => (
									<div
										key={plan.id}
										style={{
											position: 'relative',
											borderRadius: '16px',
											border: plan.popular
												? '2px solid #000000'
												: plan.disabled
													? '2px solid #E5E7EB'
													: '2px solid #E5E7EB',
											padding: '32px',
											opacity: plan.disabled ? '0.6' : '1',
										}}
									>
										{plan.popular && (
											<div
												style={{
													position: 'absolute',
													top: '-12px',
													left: '50%',
													transform: 'translateX(-50%)',
													padding: '4px 12px',
													backgroundColor: '#000000',
													color: '#FFFFFF',
													fontSize: '12px',
													fontWeight: '500',
													borderRadius: '9999px',
												}}
											>
												Popular
											</div>
										)}

										{/* Plan Name */}
										<div style={{ marginBottom: '24px' }}>
											<h3
												style={{
													fontSize: '20px',
													fontWeight: '700',
													color: '#000000',
													marginBottom: '8px',
												}}
											>
												{plan.name}
											</h3>
											<div
												style={{
													display: 'flex',
													alignItems: 'baseline',
													gap: '4px',
													marginBottom: '12px',
												}}
											>
												<span
													style={{
														fontSize: '36px',
														fontWeight: '700',
														color: '#000000',
													}}
												>
													{plan.price}
												</span>
												{plan.period && (
													<span style={{ color: '#6B7280' }}>
														{plan.period}
													</span>
												)}
											</div>
											{plan.additionalText && (
												<p
													style={{
														fontSize: '14px',
														color: '#4B5563',
														marginBottom: '12px',
													}}
												>
													{plan.additionalText}
												</p>
											)}
											<p
												style={{
													fontSize: '14px',
													color: '#4B5563',
													lineHeight: '1.5',
												}}
											>
												{plan.description}
											</p>
										</div>

										{/* CTA Buttons */}
										<div
											style={{
												marginBottom: '32px',
												display: 'flex',
												flexDirection: 'column',
												gap: '8px',
											}}
										>
											<button
												onClick={() => handleUpgrade(plan)}
												disabled={plan.disabled}
												style={{
													width: '100%',
													padding: '10px 16px',
													borderRadius: '8px',
													fontWeight: '500',
													border: 'none',
													cursor: plan.disabled ? 'not-allowed' : 'pointer',
													backgroundColor: plan.popular
														? '#000000'
														: plan.disabled
															? '#F3F4F6'
															: '#F3F4F6',
													color: plan.popular
														? '#FFFFFF'
														: plan.disabled
															? '#9CA3AF'
															: '#000000',
													transition: 'background-color 0.2s',
												}}
												onMouseEnter={(e) => {
													if (!plan.disabled) {
														e.currentTarget.style.backgroundColor = plan.popular
															? '#1F2937'
															: '#E5E7EB';
													}
												}}
												onMouseLeave={(e) => {
													if (!plan.disabled) {
														e.currentTarget.style.backgroundColor = plan.popular
															? '#000000'
															: '#F3F4F6';
													}
												}}
											>
												{plan.cta}
											</button>
											{plan.secondaryCta && (
												<button
													onClick={() =>
														(window.location.href = plan.secondaryUrl)
													}
													style={{
														width: '100%',
														padding: '10px 16px',
														borderRadius: '8px',
														fontWeight: '500',
														border: '1px solid #D1D5DB',
														backgroundColor: 'transparent',
														color: '#000000',
														cursor: 'pointer',
														transition: 'border-color 0.2s',
													}}
													onMouseEnter={(e) =>
														(e.currentTarget.style.borderColor = '#9CA3AF')
													}
													onMouseLeave={(e) =>
														(e.currentTarget.style.borderColor = '#D1D5DB')
													}
												>
													{plan.secondaryCta}
												</button>
											)}
										</div>

										{/* Features List */}
										<div
											style={{
												display: 'flex',
												flexDirection: 'column',
												gap: '12px',
											}}
										>
											{plan.features.map((feature, index) => (
												<div
													key={index}
													style={{
														display: 'flex',
														alignItems: 'flex-start',
														gap: '12px',
													}}
												>
													<Check
														style={{
															width: '20px',
															height: '20px',
															color: '#000000',
															flexShrink: '0',
															marginTop: '2px',
															strokeWidth: '2.5',
														}}
													/>
													<span
														style={{
															fontSize: '14px',
															color: '#374151',
															lineHeight: '1.5',
														}}
													>
														{feature}
													</span>
												</div>
											))}
										</div>
									</div>
								))}
							</div>

							{/* Footer Note */}
							<div
								style={{
									marginTop: '32px',
									paddingTop: '24px',
									borderTop: '1px solid #E5E7EB',
									textAlign: 'center',
								}}
							>
								<p style={{ fontSize: '14px', color: '#4B5563' }}>
									Not sure which plan to pick?{' '}
									<a
										href="https://vercel.com/contact/sales/pricing"
										style={{ color: '#000000', textDecoration: 'underline' }}
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
