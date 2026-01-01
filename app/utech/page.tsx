import React, { useState, useEffect } from 'react';
import {
	Menu,
	X,
	ChevronRight,
	Phone,
	MapPin,
	Mail,
	Facebook,
	Instagram,
	Linkedin,
	Award,
	Users,
	CheckCircle,
	Clock,
	ArrowRight,
	Star,
	TrendingUp,
} from 'lucide-react';

export default function UTechHomepage() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [currentSlide, setCurrentSlide] = useState(0);
	const [isScrolled, setIsScrolled] = useState(false);
	const [visibleSections, setVisibleSections] = useState({});
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

	const heroSlides = [
		{
			title: "Empowering Tomorrow's Tech Leaders Today",
			subtitle: 'Where Technology Meets Opportunity',
			image:
				'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80',
		},
		{
			title: 'Train Today, Lead Tomorrow',
			subtitle: 'World-Class IT Education in Liberia',
			image:
				'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1920&q=80',
		},
		{
			title: 'Innovation Through Education',
			subtitle: 'Practical Skills for Real-World Success',
			image:
				'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1920&q=80',
		},
	];

	const programs = [
		{
			title: 'Web Development',
			description:
				'Master modern web technologies including HTML, CSS, JavaScript, React, and full-stack development',
			image:
				'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80',
			duration: '6 months',
			students: '120+',
		},
		{
			title: 'Network Engineering',
			description:
				'Learn network infrastructure, cybersecurity, cloud computing, and system administration',
			image:
				'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
			duration: '8 months',
			students: '85+',
		},
		{
			title: 'Data Science',
			description:
				'Analyze data and build intelligent solutions with Python, machine learning, and AI',
			image:
				'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
			duration: '10 months',
			students: '95+',
		},
		{
			title: 'Graphic Design',
			description:
				'Create stunning visuals with Adobe Creative Suite, UI/UX design, and digital marketing',
			image:
				'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80',
			duration: '5 months',
			students: '110+',
		},
	];

	const facilities = [
		{
			title: 'Well-Equipped Computer Labs',
			description:
				'State-of-the-art computers and software for hands-on learning',
			image:
				'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
		},
		{
			title: 'Modern Classrooms',
			description: 'Comfortable learning spaces with multimedia capabilities',
			image:
				'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
		},
		{
			title: 'Innovation Hub',
			description: 'Collaborative workspace for projects and entrepreneurship',
			image:
				'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
		},
	];

	const testimonials = [
		{
			name: 'Sarah Johnson',
			role: 'Web Developer, TechCorp',
			quote:
				'U-Tech gave me the practical skills I needed to launch my career in tech. The instructors are experienced and supportive.',
			image:
				'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
			rating: 5,
		},
		{
			name: 'Michael Kpana',
			role: 'Network Engineer',
			quote:
				'The hands-on training and real-world projects prepared me for the challenges of the IT industry.',
			image:
				'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
			rating: 5,
		},
	];

	const stats = [
		{ label: 'Graduates', value: 500, suffix: '+' },
		{ label: 'Programs', value: 15, suffix: '+' },
		{ label: 'Job Placement', value: 85, suffix: '%' },
		{ label: 'Industry Partners', value: 20, suffix: '+' },
	];

	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
		}, 5000);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);

			const sections = document.querySelectorAll('[data-animate]');
			sections.forEach((section) => {
				const rect = section.getBoundingClientRect();
				const isVisible = rect.top < window.innerHeight * 0.8;
				if (isVisible) {
					setVisibleSections((prev) => ({ ...prev, [section.id]: true }));
				}
			});
		};

		window.addEventListener('scroll', handleScroll);
		handleScroll();
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	useEffect(() => {
		const handleMouseMove = (e) => {
			setMousePosition({ x: e.clientX, y: e.clientY });
		};
		window.addEventListener('mousemove', handleMouseMove);
		return () => window.removeEventListener('mousemove', handleMouseMove);
	}, []);

	const AnimatedCounter = ({ end, duration = 2000, suffix = '' }) => {
		const [count, setCount] = useState(0);
		const [hasAnimated, setHasAnimated] = useState(false);

		useEffect(() => {
			if (!hasAnimated && visibleSections['stats']) {
				setHasAnimated(true);
				let start = 0;
				const increment = end / (duration / 16);
				const timer = setInterval(() => {
					start += increment;
					if (start >= end) {
						setCount(end);
						clearInterval(timer);
					} else {
						setCount(Math.floor(start));
					}
				}, 16);
				return () => clearInterval(timer);
			}
		}, [visibleSections, hasAnimated, end, duration]);

		return (
			<span>
				{count}
				{suffix}
			</span>
		);
	};

	return (
		<div className="min-h-screen bg-white overflow-x-hidden">
			{/* Floating Background Elements */}
			<div className="fixed inset-0 pointer-events-none overflow-hidden">
				<div
					className="absolute w-96 h-96 bg-blue-500/5 rounded-full blur-3xl transition-all duration-1000"
					style={{
						left: `${mousePosition.x * 0.02}px`,
						top: `${mousePosition.y * 0.02}px`,
					}}
				/>
				<div
					className="absolute w-96 h-96 bg-purple-500/5 rounded-full blur-3xl transition-all duration-1000"
					style={{
						right: `${mousePosition.x * 0.01}px`,
						bottom: `${mousePosition.y * 0.01}px`,
					}}
				/>
			</div>

			{/* Navigation */}
			<nav
				className={`fixed w-full z-50 transition-all duration-500 ${
					isScrolled
						? 'bg-white/95 backdrop-blur-lg shadow-lg py-3'
						: 'bg-white/90 backdrop-blur-sm py-4'
				}`}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center">
						<div className="flex items-center space-x-3 group cursor-pointer">
							<div className="w-12 h-12 bg-gradient-to-br from-blue-900 via-blue-600 to-blue-400 rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300 shadow-lg">
								<span className="text-white font-bold text-xl">U</span>
							</div>
							<div>
								<div className="font-bold text-xl text-blue-900 tracking-tight">
									U-TECH
								</div>
								<div className="text-xs text-gray-600">
									Technology Education
								</div>
							</div>
						</div>

						{/* Desktop Menu */}
						<div className="hidden lg:flex items-center space-x-1">
							{['Home', 'About Us', 'Programs', 'Facilities', 'Contact'].map(
								(item, index) => (
									<a
										key={item}
										href={`#${item.toLowerCase().replace(' ', '-')}`}
										className="relative px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium group"
										style={{ animationDelay: `${index * 100}ms` }}
									>
										{item}
										<span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-900 to-blue-600 group-hover:w-full transition-all duration-300"></span>
									</a>
								)
							)}
							<button className="ml-4 relative overflow-hidden bg-gradient-to-r from-blue-900 to-blue-600 text-white px-6 py-2.5 rounded-xl font-medium group">
								<span className="relative z-10">Apply Now</span>
								<div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-900 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
							</button>
						</div>

						{/* Mobile Menu Button */}
						<button
							className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
							onClick={() => setIsMenuOpen(!isMenuOpen)}
						>
							{isMenuOpen ? (
								<X className="w-6 h-6 text-blue-900" />
							) : (
								<Menu className="w-6 h-6 text-blue-900" />
							)}
						</button>
					</div>
				</div>

				{/* Mobile Menu */}
				<div
					className={`lg:hidden transition-all duration-300 ${
						isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
					} overflow-hidden`}
				>
					<div className="px-4 py-4 space-y-2 bg-white/95 backdrop-blur-lg border-t">
						{['Home', 'About Us', 'Programs', 'Facilities', 'Contact'].map(
							(item, index) => (
								<a
									key={item}
									href={`#${item.toLowerCase().replace(' ', '-')}`}
									className="block px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all transform hover:translate-x-2"
									style={{ animationDelay: `${index * 50}ms` }}
									onClick={() => setIsMenuOpen(false)}
								>
									{item}
								</a>
							)
						)}
						<button className="w-full bg-gradient-to-r from-blue-900 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-xl transition-all">
							Apply Now
						</button>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<section id="home" className="relative h-screen">
				<div className="absolute inset-0">
					{heroSlides.map((slide, index) => (
						<div
							key={index}
							className={`absolute inset-0 transition-all duration-1000 ${
								index === currentSlide
									? 'opacity-100 scale-100'
									: 'opacity-0 scale-105'
							}`}
						>
							<img
								src={slide.image}
								alt={slide.title}
								className="w-full h-full object-cover"
							/>
							<div className="absolute inset-0 bg-gradient-to-br from-blue-900/95 via-blue-800/90 to-blue-600/80"></div>
						</div>
					))}
				</div>

				<div className="relative h-full flex items-center">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
						<div className="max-w-4xl">
							<div className="inline-block mb-6 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 animate-fade-in">
								<span className="text-white text-sm font-medium">
									🎓 Transform Your Future with Technology
								</span>
							</div>
							<h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight animate-slide-up">
								{heroSlides[currentSlide].title}
							</h1>
							<p
								className="text-xl md:text-2xl text-blue-100 mb-8 animate-slide-up"
								style={{ animationDelay: '200ms' }}
							>
								{heroSlides[currentSlide].subtitle}
							</p>
							<div
								className="flex flex-col sm:flex-row gap-4 animate-slide-up"
								style={{ animationDelay: '400ms' }}
							>
								<button className="group relative overflow-hidden bg-white text-blue-900 px-8 py-4 rounded-xl font-semibold shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 flex items-center justify-center">
									<span className="relative z-10 flex items-center">
										Apply Now
										<ChevronRight className="ml-2 group-hover:translate-x-2 transition-transform duration-300" />
									</span>
									<div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
								</button>
								<button className="group relative overflow-hidden border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-blue-900 transition-all duration-300 flex items-center justify-center">
									Explore Programs
									<ArrowRight className="ml-2 group-hover:translate-x-2 transition-transform duration-300" />
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Slide Indicators */}
				<div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex space-x-3">
					{heroSlides.map((_, index) => (
						<button
							key={index}
							onClick={() => setCurrentSlide(index)}
							className={`transition-all duration-500 rounded-full ${
								index === currentSlide
									? 'bg-white w-12 h-3'
									: 'bg-white/40 w-3 h-3 hover:bg-white/60'
							}`}
						/>
					))}
				</div>

				{/* Scroll Indicator */}
				<div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
					<div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
						<div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
					</div>
				</div>
			</section>

			{/* About Snapshot */}
			<section
				id="about-us"
				className="py-24 bg-gradient-to-b from-gray-50 to-white relative"
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div
						data-animate
						id="about-section"
						className={`text-center mb-20 transition-all duration-1000 ${
							visibleSections['about-section']
								? 'opacity-100 translate-y-0'
								: 'opacity-0 translate-y-10'
						}`}
					>
						<div className="inline-block mb-4 px-4 py-2 bg-blue-100 rounded-full">
							<span className="text-blue-600 text-sm font-semibold">
								About U-Tech
							</span>
						</div>
						<h2 className="text-5xl font-bold text-blue-900 mb-6">
							Shaping Digital Futures
						</h2>
						<p className="text-xl text-gray-600 max-w-3xl mx-auto">
							Leading technology education in Liberia with innovation,
							excellence, and commitment to student success
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-8 mb-16">
						{[
							{
								icon: Award,
								title: 'Our Mission',
								text: "To leverage technology to foster innovation, provide practical training, and equip students with IT skills for tomorrow's challenges.",
								delay: 0,
							},
							{
								icon: Users,
								title: 'Our Vision',
								text: "To be Liberia's leading technology education institution, producing skilled professionals who drive digital transformation.",
								delay: 200,
							},
							{
								icon: CheckCircle,
								title: 'Our Values',
								text: 'Excellence in education, innovation in teaching, integrity in service, and commitment to student success.',
								delay: 400,
							},
						].map((item, index) => (
							<div
								key={index}
								data-animate
								id={`value-${index}`}
								className={`group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 ${
									visibleSections[`value-${index}`]
										? 'opacity-100 translate-y-0'
										: 'opacity-0 translate-y-10'
								}`}
								style={{ transitionDelay: `${item.delay}ms` }}
							>
								<div className="w-16 h-16 bg-gradient-to-br from-blue-900 to-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-lg">
									<item.icon className="w-8 h-8 text-white" />
								</div>
								<h3 className="text-xl font-bold text-blue-900 mb-4 text-center">
									{item.title}
								</h3>
								<p className="text-gray-600 text-center leading-relaxed">
									{item.text}
								</p>
							</div>
						))}
					</div>

					{/* Animated Stats */}
					<div
						data-animate
						id="stats"
						className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-blue-600 rounded-3xl p-12 text-white overflow-hidden"
					>
						<div className="absolute inset-0 opacity-10">
							<div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
							<div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
						</div>
						<div className="relative grid md:grid-cols-4 gap-8 text-center">
							{stats.map((stat, index) => (
								<div
									key={index}
									className="transform hover:scale-110 transition-transform duration-300"
								>
									<div className="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
										<AnimatedCounter end={stat.value} suffix={stat.suffix} />
									</div>
									<div className="text-blue-100 font-medium">{stat.label}</div>
									<div className="mt-2 w-16 h-1 bg-white/30 mx-auto rounded-full"></div>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Programs Preview */}
			<section id="programs" className="py-24 bg-white relative">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div
						data-animate
						id="programs-header"
						className={`text-center mb-20 transition-all duration-1000 ${
							visibleSections['programs-header']
								? 'opacity-100 translate-y-0'
								: 'opacity-0 translate-y-10'
						}`}
					>
						<div className="inline-block mb-4 px-4 py-2 bg-blue-100 rounded-full">
							<span className="text-blue-600 text-sm font-semibold">
								Our Programs
							</span>
						</div>
						<h2 className="text-5xl font-bold text-blue-900 mb-6">
							Choose Your Path
						</h2>
						<p className="text-xl text-gray-600 max-w-3xl mx-auto">
							Comprehensive technology courses designed to prepare you for the
							digital economy
						</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
						{programs.map((program, index) => (
							<div
								key={index}
								data-animate
								id={`program-${index}`}
								className={`group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 ${
									visibleSections[`program-${index}`]
										? 'opacity-100 translate-y-0'
										: 'opacity-0 translate-y-10'
								}`}
								style={{ transitionDelay: `${index * 100}ms` }}
							>
								<div className="relative h-64 overflow-hidden">
									<img
										src={program.image}
										alt={program.title}
										className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/50 to-transparent"></div>
									<div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center space-x-1">
										<Users className="w-4 h-4 text-blue-600" />
										<span className="text-sm font-semibold text-blue-900">
											{program.students}
										</span>
									</div>
								</div>

								<div className="p-6 bg-white">
									<h3 className="text-xl font-bold text-blue-900 mb-3 group-hover:text-blue-600 transition-colors">
										{program.title}
									</h3>
									<p className="text-gray-600 text-sm mb-4 leading-relaxed">
										{program.description}
									</p>
									<div className="flex items-center justify-between">
										<div className="flex items-center text-blue-600 text-sm font-medium">
											<Clock className="w-4 h-4 mr-2" />
											<span>{program.duration}</span>
										</div>
										<button className="text-blue-600 font-semibold flex items-center group-hover:gap-2 transition-all">
											Learn More
											<ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
										</button>
									</div>
								</div>

								{/* Hover Overlay */}
								<div className="absolute inset-0 bg-gradient-to-t from-blue-600/95 to-blue-900/95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
									<button className="bg-white text-blue-900 px-6 py-3 rounded-xl font-semibold transform scale-90 group-hover:scale-100 transition-transform duration-300 shadow-xl">
										Enroll Now
									</button>
								</div>
							</div>
						))}
					</div>

					<div className="text-center mt-16">
						<button className="group relative overflow-hidden bg-gradient-to-r from-blue-900 to-blue-600 text-white px-10 py-4 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300">
							<span className="relative z-10 flex items-center">
								View All Programs
								<ArrowRight className="ml-2 group-hover:translate-x-2 transition-transform duration-300" />
							</span>
						</button>
					</div>
				</div>
			</section>

			{/* Facilities */}
			<section
				id="facilities"
				className="py-24 bg-gradient-to-b from-gray-50 to-white"
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div
						data-animate
						id="facilities-header"
						className={`text-center mb-20 transition-all duration-1000 ${
							visibleSections['facilities-header']
								? 'opacity-100 translate-y-0'
								: 'opacity-0 translate-y-10'
						}`}
					>
						<div className="inline-block mb-4 px-4 py-2 bg-blue-100 rounded-full">
							<span className="text-blue-600 text-sm font-semibold">
								Our Facilities
							</span>
						</div>
						<h2 className="text-5xl font-bold text-blue-900 mb-6">
							World-Class Infrastructure
						</h2>
						<p className="text-xl text-gray-600 max-w-3xl mx-auto">
							State-of-the-art facilities providing the perfect environment for
							hands-on learning and innovation
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-8">
						{facilities.map((facility, index) => (
							<div
								key={index}
								data-animate
								id={`facility-${index}`}
								className={`group relative overflow-hidden rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 ${
									visibleSections[`facility-${index}`]
										? 'opacity-100 translate-y-0'
										: 'opacity-0 translate-y-10'
								}`}
								style={{ transitionDelay: `${index * 150}ms` }}
							>
								<div className="relative h-96 overflow-hidden">
									<img
										src={facility.image}
										alt={facility.title}
										className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-blue-900/95 via-blue-900/60 to-transparent"></div>

									<div className="absolute inset-0 flex flex-col justify-end p-8">
										<div className="transform transition-all duration-500 group-hover:-translate-y-4">
											<h3 className="text-3xl font-bold text-white mb-3">
												{facility.title}
											</h3>
											<p className="text-blue-100 text-lg">
												{facility.description}
											</p>
										</div>

										<button className="mt-6 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 hover:bg-white hover:text-blue-900 inline-flex items-center">
											Explore
											<ArrowRight className="ml-2 w-5 h-5" />
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Testimonials */}
			<section className="py-24 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div
						data-animate
						id="testimonials-header"
						className={`text-center mb-20 transition-all duration-1000 ${
							visibleSections['testimonials-header']
								? 'opacity-100 translate-y-0'
								: 'opacity-0 translate-y-10'
						}`}
					>
						<div className="inline-block mb-4 px-4 py-2 bg-blue-100 rounded-full">
							<span className="text-blue-600 text-sm font-semibold">
								Success Stories
							</span>
						</div>
						<h2 className="text-5xl font-bold text-blue-900 mb-6">
							What Our Alumni Say
						</h2>
						<p className="text-xl text-gray-600">
							Real stories from graduates making an impact in tech
						</p>
					</div>

					<div className="grid md:grid-cols-2 gap-10">
						{testimonials.map((testimonial, index) => (
							<div
								key={index}
								data-animate
								id={`testimonial-${index}`}
								className={`group relative bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 ${
									visibleSections[`testimonial-${index}`]
										? 'opacity-100 translate-x-0'
										: 'opacity-0 translate-x-10'
								}`}
								style={{ transitionDelay: `${index * 200}ms` }}
							>
								<div className="absolute top-8 right-8 text-blue-900/10 transform group-hover:scale-110 transition-transform duration-300">
									<svg
										className="w-16 h-16"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609v.391c-2.099 2.026-3.327 4.79-3.327 7.609v10h-5.656zm-11.656 0v-7.391c0-5.704 3.731-9.57 8.983-10.609v.391c-2.099 2.026-3.327 4.79-3.327 7.609v10h-5.656z" />
									</svg>
								</div>

								<div className="flex items-center mb-6">
									<div className="relative">
										<img
											src={testimonial.image}
											alt={testimonial.name}
											className="w-20 h-20 rounded-2xl object-cover shadow-lg transform group-hover:scale-105 transition-transform duration-300"
										/>
										<div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-blue-900 to-blue-600 rounded-lg flex items-center justify-center">
											<CheckCircle className="w-5 h-5 text-white" />
										</div>
									</div>
									<div className="ml-6">
										<div className="font-bold text-xl text-blue-900">
											{testimonial.name}
										</div>
										<div className="text-gray-600 text-sm mb-2">
											{testimonial.role}
										</div>
										<div className="flex space-x-1">
											{[...Array(testimonial.rating)].map((_, i) => (
												<Star
													key={i}
													className="w-4 h-4 fill-yellow-400 text-yellow-400"
												/>
											))}
										</div>
									</div>
								</div>

								<p className="text-gray-700 text-lg italic leading-relaxed">
									"{testimonial.quote}"
								</p>

								<div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-full"></div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Admissions CTA */}
			<section className="py-24 relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600"></div>
				<div className="absolute inset-0 opacity-10">
					<div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
					<div
						className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"
						style={{ animationDelay: '1s' }}
					></div>
				</div>

				<div
					data-animate
					id="cta-section"
					className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-1000 ${
						visibleSections['cta-section']
							? 'opacity-100 scale-100'
							: 'opacity-0 scale-95'
					}`}
				>
					<div className="inline-block mb-6 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
						<span className="text-white font-medium flex items-center">
							<TrendingUp className="w-5 h-5 mr-2" />
							Start Your Journey Today
						</span>
					</div>

					<h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
						Ready to Start Your
						<br />
						Tech Journey?
					</h2>
					<p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
						Join hundreds of students who have transformed their careers through
						quality tech education
					</p>

					<div className="flex flex-col sm:flex-row gap-6 justify-center">
						<button className="group relative overflow-hidden bg-white text-blue-900 px-10 py-5 rounded-xl font-semibold shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105">
							<span className="relative z-10 flex items-center justify-center text-lg">
								Apply Now
								<ChevronRight className="ml-2 group-hover:translate-x-2 transition-transform duration-300" />
							</span>
						</button>
						<button className="group relative overflow-hidden border-2 border-white text-white px-10 py-5 rounded-xl font-semibold hover:bg-white hover:text-blue-900 transition-all duration-300 transform hover:scale-105">
							<span className="flex items-center justify-center text-lg">
								Request Information
								<Mail className="ml-2 w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
							</span>
						</button>
					</div>

					<div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
						{[
							{ icon: Award, text: 'Accredited Programs' },
							{ icon: Users, text: 'Expert Instructors' },
							{ icon: CheckCircle, text: 'Job Placement' },
							{ icon: TrendingUp, text: 'Career Growth' },
						].map((item, index) => (
							<div
								key={index}
								className="text-center transform hover:scale-110 transition-transform duration-300"
							>
								<div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
									<item.icon className="w-8 h-8 text-white" />
								</div>
								<p className="text-white font-medium">{item.text}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Contact Section */}
			<section
				id="contact"
				className="py-24 bg-gradient-to-b from-gray-50 to-white"
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div
						data-animate
						id="contact-header"
						className={`text-center mb-20 transition-all duration-1000 ${
							visibleSections['contact-header']
								? 'opacity-100 translate-y-0'
								: 'opacity-0 translate-y-10'
						}`}
					>
						<div className="inline-block mb-4 px-4 py-2 bg-blue-100 rounded-full">
							<span className="text-blue-600 text-sm font-semibold">
								Contact Us
							</span>
						</div>
						<h2 className="text-5xl font-bold text-blue-900 mb-6">
							Get In Touch
						</h2>
						<p className="text-xl text-gray-600">
							We're here to answer your questions and help you get started
						</p>
					</div>

					<div className="grid lg:grid-cols-2 gap-12">
						<div
							data-animate
							id="contact-info"
							className={`space-y-8 transition-all duration-1000 ${
								visibleSections['contact-info']
									? 'opacity-100 translate-x-0'
									: 'opacity-0 -translate-x-10'
							}`}
						>
							<div>
								<h3 className="text-3xl font-bold text-blue-900 mb-8">
									Main Campus
								</h3>

								<div className="space-y-6">
									<div className="group flex items-start p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
										<div className="w-14 h-14 bg-gradient-to-br from-blue-900 to-blue-600 rounded-xl flex items-center justify-center mr-5 group-hover:scale-110 transition-transform duration-300">
											<MapPin className="w-7 h-7 text-white" />
										</div>
										<div>
											<div className="font-bold text-lg text-gray-900 mb-1">
												Address
											</div>
											<div className="text-gray-600">Monrovia, Liberia</div>
										</div>
									</div>

									<div className="group flex items-start p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
										<div className="w-14 h-14 bg-gradient-to-br from-blue-900 to-blue-600 rounded-xl flex items-center justify-center mr-5 group-hover:scale-110 transition-transform duration-300">
											<Phone className="w-7 h-7 text-white" />
										</div>
										<div>
											<div className="font-bold text-lg text-gray-900 mb-1">
												Phone
											</div>
											<div className="text-gray-600">+231 XXX XXX XXX</div>
										</div>
									</div>

									<div className="group flex items-start p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
										<div className="w-14 h-14 bg-gradient-to-br from-blue-900 to-blue-600 rounded-xl flex items-center justify-center mr-5 group-hover:scale-110 transition-transform duration-300">
											<Mail className="w-7 h-7 text-white" />
										</div>
										<div>
											<div className="font-bold text-lg text-gray-900 mb-1">
												Email
											</div>
											<div className="text-gray-600">
												info@uniquetechedu.org
											</div>
										</div>
									</div>
								</div>
							</div>

							<div className="pt-8">
								<h4 className="font-bold text-xl text-gray-900 mb-6">
									Connect With Us
								</h4>
								<div className="flex space-x-4">
									{[
										{ icon: Facebook, href: '#' },
										{ icon: Instagram, href: '#' },
										{ icon: Linkedin, href: '#' },
									].map((social, index) => (
										<a
											key={index}
											href={social.href}
											className="group w-14 h-14 bg-gradient-to-br from-blue-900 to-blue-600 rounded-xl flex items-center justify-center text-white hover:shadow-xl transition-all duration-300 transform hover:scale-110 hover:-rotate-6"
										>
											<social.icon className="w-6 h-6" />
										</a>
									))}
								</div>
							</div>
						</div>

						<div
							data-animate
							id="contact-form"
							className={`transition-all duration-1000 ${
								visibleSections['contact-form']
									? 'opacity-100 translate-x-0'
									: 'opacity-0 translate-x-10'
							}`}
						>
							<div className="bg-white rounded-3xl p-10 shadow-2xl">
								<h3 className="text-2xl font-bold text-blue-900 mb-8">
									Send Us a Message
								</h3>
								<div className="space-y-6">
									<div className="group">
										<label className="block text-gray-700 font-semibold mb-3">
											Full Name
										</label>
										<input
											type="text"
											className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-600 transition-colors duration-300 group-hover:border-gray-300"
											placeholder="Your name"
										/>
									</div>

									<div className="group">
										<label className="block text-gray-700 font-semibold mb-3">
											Email Address
										</label>
										<input
											type="email"
											className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-600 transition-colors duration-300 group-hover:border-gray-300"
											placeholder="your@email.com"
										/>
									</div>

									<div className="group">
										<label className="block text-gray-700 font-semibold mb-3">
											Phone Number
										</label>
										<input
											type="tel"
											className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-600 transition-colors duration-300 group-hover:border-gray-300"
											placeholder="+231 XXX XXX XXX"
										/>
									</div>

									<div className="group">
										<label className="block text-gray-700 font-semibold mb-3">
											Message
										</label>
										<textarea
											rows="5"
											className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-600 transition-colors duration-300 group-hover:border-gray-300 resize-none"
											placeholder="Tell us about your interest..."
										></textarea>
									</div>

									<button className="group relative overflow-hidden w-full bg-gradient-to-r from-blue-900 to-blue-600 text-white px-8 py-5 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
										<span className="relative z-10 flex items-center justify-center text-lg">
											Send Message
											<ChevronRight className="ml-2 group-hover:translate-x-2 transition-transform duration-300" />
										</span>
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white py-16 relative overflow-hidden">
				<div className="absolute inset-0 opacity-5">
					<div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
					<div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
				</div>

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid md:grid-cols-4 gap-12 mb-12">
						<div>
							<div className="flex items-center space-x-3 mb-6 group cursor-pointer">
								<div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
									<span className="text-blue-900 font-bold text-xl">U</span>
								</div>
								<div>
									<div className="font-bold text-xl">U-TECH</div>
									<div className="text-xs text-blue-200">Tech Education</div>
								</div>
							</div>
							<p className="text-blue-200 leading-relaxed mb-6">
								Empowering tomorrow's tech leaders through quality education and
								innovation.
							</p>
							<div className="flex space-x-3">
								{[Facebook, Instagram, Linkedin].map((Icon, index) => (
									<a
										key={index}
										href="#"
										className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white hover:text-blue-900 transition-all duration-300 transform hover:scale-110"
									>
										<Icon className="w-5 h-5" />
									</a>
								))}
							</div>
						</div>

						<div>
							<h4 className="font-bold text-lg mb-6">Quick Links</h4>
							<ul className="space-y-3">
								{[
									'About Us',
									'Programs',
									'Facilities',
									'Admissions',
									'Contact',
								].map((item, index) => (
									<li key={index}>
										<a
											href={`#${item.toLowerCase().replace(' ', '-')}`}
											className="text-blue-200 hover:text-white transition-colors duration-300 flex items-center group"
										>
											<ChevronRight className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
											{item}
										</a>
									</li>
								))}
							</ul>
						</div>

						<div>
							<h4 className="font-bold text-lg mb-6">Programs</h4>
							<ul className="space-y-3">
								{[
									'Web Development',
									'Network Engineering',
									'Data Science',
									'Graphic Design',
								].map((item, index) => (
									<li key={index}>
										<a
											href="#programs"
											className="text-blue-200 hover:text-white transition-colors duration-300 flex items-center group"
										>
											<ChevronRight className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
											{item}
										</a>
									</li>
								))}
							</ul>
						</div>

						<div>
							<h4 className="font-bold text-lg mb-6">Contact Info</h4>
							<ul className="space-y-4 text-blue-200">
								<li className="flex items-start">
									<MapPin className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
									<span>Monrovia, Liberia</span>
								</li>
								<li className="flex items-start">
									<Phone className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
									<span>+231 XXX XXX XXX</span>
								</li>
								<li className="flex items-start">
									<Mail className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
									<span>info@uniquetechedu.org</span>
								</li>
							</ul>
						</div>
					</div>

					<div className="border-t border-blue-700/30 pt-8">
						<div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
							<p className="text-blue-200 text-sm text-center md:text-left">
								&copy; 2025 Unique Technology Education Institute. All rights
								reserved.
							</p>
							<div className="flex space-x-6 text-sm">
								<a
									href="#"
									className="text-blue-200 hover:text-white transition-colors duration-300"
								>
									Privacy Policy
								</a>
								<a
									href="#"
									className="text-blue-200 hover:text-white transition-colors duration-300"
								>
									Terms of Service
								</a>
							</div>
						</div>
					</div>
				</div>
			</footer>

			<style jsx>{`
				@keyframes fade-in {
					from {
						opacity: 0;
						transform: translateY(20px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				@keyframes slide-up {
					from {
						opacity: 0;
						transform: translateY(40px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				.animate-fade-in {
					animation: fade-in 0.8s ease-out forwards;
				}
				.animate-slide-up {
					animation: slide-up 1s ease-out forwards;
					opacity: 0;
				}
			`}</style>
		</div>
	);
}
