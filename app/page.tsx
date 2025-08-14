'use client';
import React, { useEffect, useState } from 'react';
import { GraduationCap, MapPin, Phone, Mail, ArrowRight } from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';
import NavBar from '@/components/sections/NavBar';
import { PageLoading } from '@/components/loading';

export default function SchoolHomepage() {
	const [school, setSchool] = useState<null | any>(null);
	const [loading, setLoading] = useState(true);
	const currentSchool = useSchoolStore((state) => state.school);

	useEffect(() => {
		const loadSchoolData = async () => {
			setLoading(true);
			try {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				setSchool(currentSchool);
			} catch (error) {
				console.error('Failed to load school profile:', error);
				setSchool(null);
			} finally {
				setLoading(false);
			}
		};
		loadSchoolData();
	}, [currentSchool]);

	if (loading) {
		return (
			<PageLoading variant="pulse" message="Loading Home Page..." size="lg" />
		);
	}

	if (!school) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<p className="text-red-600 mb-4">Failed to load school information</p>
					<button
						onClick={() => window.location.reload()}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-white">
			{/* NavBar */}
			<NavBar />

			{/* Hero Section */}
			<section
				id="home"
				className="relative h-screen flex items-center justify-center"
			>
				<div
					className="absolute inset-0 bg-cover bg-center bg-no-repeat"
					style={{
						backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('${
							school.heroImageUrl ||
							'https://images.unsplash.com/photo-1523050854058-8df90110c9d1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
						}')`,
					}}
				/>
				<div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
					<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
						{school.name}
					</h1>
					<p className="text-lg sm:text-xl md:text-2xl mb-8 text-gray-200 max-w-2xl mx-auto">
						{school.tagline || school.description}
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<button className="text-base sm:text-lg px-6 sm:px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
							Apply Now
							<ArrowRight className="ml-2 h-5 w-5" />
						</button>
						<button className="text-base sm:text-lg px-6 sm:px-8 py-3 bg-white/10 border border-white text-white hover:bg-white hover:text-blue-600 rounded-lg transition-colors">
							Learn More
						</button>
					</div>
				</div>
			</section>

			{/* Why Choose Our School Section */}
			<section id="about" className="py-16 sm:py-20 bg-gray-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-12 sm:mb-16">
						<h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-800">
							Why Choose {school.name}
						</h2>
						<p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
							{school.description}
						</p>
					</div>
					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
						{school.whyChoose?.map((item: any, idx: number) => (
							<div
								key={idx}
								className="group bg-white rounded-lg p-6 hover:shadow-lg transition-all duration-300 border border-gray-200"
							>
								<div className="text-center">
									<div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
										{item.icon}
									</div>
									<h3 className="text-xl font-semibold mb-3 text-gray-800">
										{item.title}
									</h3>
									<p className="text-gray-600">{item.description}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Facilities Section */}
			<section id="facilities" className="py-16 sm:py-20 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-12 sm:mb-16">
						<h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-800">
							World-Class Facilities
						</h2>
						<p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
							State-of-the-art facilities designed to enhance learning and
							provide the best educational experience
						</p>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
						{school.facilities?.map((facility: any, idx: number) => (
							<div
								key={idx}
								className="group bg-white rounded-lg p-4 hover:shadow-lg transition-all duration-300 border border-gray-200"
							>
								<div className="text-center">
									<div className="mx-auto w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
										{facility.icon}
									</div>
									<h3 className="text-lg font-semibold mb-2 text-gray-800">
										{facility.title}
									</h3>
									<p className="text-sm text-gray-600">
										{facility.description}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Administrative Team Section */}
			<section id="team" className="py-16 sm:py-20 bg-gray-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-12 sm:mb-16">
						<h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-800">
							Our Leadership Team
						</h2>
						<p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
							Experienced educators and administrators dedicated to your child's
							success
						</p>
					</div>
					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
						{school.team?.map((member: any, idx: number) => (
							<div
								key={idx}
								className="group bg-white rounded-lg p-6 hover:shadow-lg transition-all duration-300 border border-gray-200"
							>
								<div className="text-center">
									<div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gray-200">
										{member.avatarUrl ? (
											<img
												src={member.avatarUrl}
												alt={member.name}
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
												{member.name
													.split(' ')
													.map((n) => n[0])
													.join('')
													.slice(0, 2)}
											</div>
										)}
									</div>
									<h3 className="text-xl font-semibold mb-2 text-gray-800">
										{member.name}
									</h3>
									<span
										className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${
											member.badgeBg || 'bg-blue-100 text-blue-800'
										}`}
									>
										{member.title}
									</span>
									<p className="text-gray-600 mb-4">{member.bio}</p>
									{member.email && (
										<a
											href={`mailto:${member.email}`}
											className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors"
										>
											<Mail className="h-4 w-4 mr-1" />
											Contact
										</a>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer id="contact" className="bg-gray-900 text-white py-16">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
						{/* School Info */}
						<div>
							<div className="flex items-center gap-3 mb-6">
								{school.logoUrl ? (
									<img
										src={school.logoUrl}
										alt={school.name}
										className="h-10 w-10 rounded-lg object-cover"
									/>
								) : (
									<div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
										<GraduationCap className="h-6 w-6 text-white" />
									</div>
								)}
								<div>
									<h3 className="text-lg font-bold">{school.name}</h3>
									<p className="text-sm text-gray-400">
										Excellence in Education
									</p>
								</div>
							</div>
							<p className="text-gray-400 mb-4">
								{school.tagline ||
									`Nurturing minds, building character, and inspiring excellence through quality education${
										school.yearFounded ? ` since ${school.yearFounded}` : ''
									}.`}
							</p>
						</div>

						{/* Quick Links */}
						<div>
							<h4 className="text-lg font-semibold mb-6">Quick Links</h4>
							<ul className="space-y-3">
								{school.quickLinks?.map((link: any) => (
									<li key={link.label}>
										<a
											href={link.href}
											className="text-gray-400 hover:text-white transition-colors"
										>
											{link.label}
										</a>
									</li>
								))}
							</ul>
						</div>

						{/* Academic Info */}
						<div>
							<h4 className="text-lg font-semibold mb-6">Academics</h4>
							<ul className="space-y-3">
								{school.academicLinks?.map((link: any) => (
									<li key={link.label}>
										<a
											href={link.href}
											className="text-gray-400 hover:text-white transition-colors"
										>
											{link.label}
										</a>
									</li>
								))}
							</ul>
						</div>

						{/* Contact Info */}
						<div>
							<h4 className="text-lg font-semibold mb-6">Contact Us</h4>
							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
									<div>
										{school.address?.map((line: any, idx: number) => (
											<p className="text-gray-400" key={idx}>
												{line}
											</p>
										))}
									</div>
								</div>
								<div className="flex items-center gap-3">
									<Phone className="h-5 w-5 text-gray-400" />
									<div>
										{school.phones?.map((phone: any, idx: number) => (
											<p className="text-gray-400" key={idx}>
												{phone}
											</p>
										))}
									</div>
								</div>
								<div className="flex items-center gap-3">
									<Mail className="h-5 w-5 text-gray-400" />
									<div>
										{school.emails?.map((email: string, idx: number) => (
											<p className="text-gray-400" key={idx}>
												{email}
											</p>
										))}
									</div>
								</div>
							</div>

							<div className="mt-6">
								<h5 className="font-semibold mb-3">School Hours</h5>
								<div className="text-gray-400 text-sm">
									{school.hours?.map((line: any, idx: number) => (
										<p key={idx}>{line}</p>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Bottom Footer */}
					<div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
						<p className="text-gray-400 text-sm">
							© {new Date().getFullYear()} {school.name}. All rights reserved.
						</p>
						<div className="flex gap-6 mt-4 md:mt-0">
							{school.footerLinks?.map((link: any) => (
								<a
									key={link.label}
									href={link.href}
									className="text-gray-400 hover:text-white text-sm transition-colors"
								>
									{link.label}
								</a>
							))}
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
