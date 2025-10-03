'use client';
import React, { useState, useMemo } from 'react';
import {
	Home,
	MapPin,
	Bed,
	Bath,
	Square,
	DollarSign,
	Search,
	Filter,
	Phone,
	Mail,
	Facebook,
	Instagram,
	Twitter,
	ChevronDown,
	X,
	Menu,
} from 'lucide-react';

// Use the new logo URL
const LOGO_URL =
	'https://res.cloudinary.com/dcalueltd/image/upload/v1759498143/samples/Adobe_Express_-_file_3_skpohb.png';

const properties = [
	{
		id: 1,
		title: 'Luxury Villa in Mamba Point',
		location: 'Mamba Point, Monrovia',
		price: 450000,
		beds: 5,
		baths: 4,
		sqft: 4500,
		images: [
			'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80',
		],
		type: 'sale',
		facilities: ['pool', 'parking', 'garden', 'security'],
	},
	{
		id: 2,
		title: 'Modern Apartment in Sinkor',
		location: 'Sinkor, Monrovia',
		price: 1800,
		beds: 3,
		baths: 2,
		sqft: 1800,
		images: [
			'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1556020685-ae41abfc9365?auto=format&fit=crop&w=800&q=80',
		],
		type: 'rent',
		facilities: ['parking', 'security', 'generator'],
	},
	{
		id: 3,
		title: 'Beachfront Property in Robertsport',
		location: 'Robertsport, Grand Cape Mount',
		price: 320000,
		beds: 4,
		baths: 3,
		sqft: 3200,
		images: [
			'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=800&q=80',
		],
		type: 'sale',
		facilities: ['beach', 'pool', 'garden', 'parking'],
	},
	{
		id: 4,
		title: 'Executive Office Space',
		location: 'Congo Town, Monrovia',
		price: 3500,
		beds: 0,
		baths: 2,
		sqft: 2500,
		images: [
			'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80',
		],
		type: 'rent',
		facilities: ['parking', 'security', 'generator', 'ac'],
	},
	{
		id: 5,
		title: 'Cozy Family Home in Paynesville',
		location: 'Paynesville, Monrovia',
		price: 180000,
		beds: 3,
		baths: 2,
		sqft: 2000,
		images: [
			'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
		],
		type: 'sale',
		facilities: ['parking', 'garden', 'security'],
	},
	{
		id: 6,
		title: 'Furnished Studio Apartment',
		location: 'Sinkor, Monrovia',
		price: 850,
		beds: 1,
		baths: 1,
		sqft: 650,
		images: [
			'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80',
			'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80',
		],
		type: 'rent',
		facilities: ['parking', 'security', 'furnished'],
	},
];

const PropertyCard = ({ property }) => {
	const [activeImage, setActiveImage] = useState(0);

	return (
		<div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105">
			<div className="relative">
				<img
					src={property.images[activeImage]}
					alt={property.title}
					className="w-full h-64 object-cover transition-opacity duration-300"
				/>
				<div className="absolute top-4 right-4">
					<span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
						{property.type === 'sale' ? 'For Sale' : 'For Rent'}
					</span>
				</div>

				{/* Thumbnail Gallery */}
				<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
					<div className="flex gap-2 justify-center">
						{property.images.map((img, idx) => (
							<button
								key={idx}
								onClick={() => setActiveImage(idx)}
								className={`w-16 h-12 rounded overflow-hidden border-2 transition-all duration-300 ${
									activeImage === idx
										? 'border-white scale-110'
										: 'border-transparent opacity-70 hover:opacity-100'
								}`}
							>
								<img
									src={img}
									alt={`Thumbnail ${idx + 1}`}
									className="w-full h-full object-cover"
								/>
							</button>
						))}
					</div>
				</div>
			</div>
			<div className="p-6">
				<h3 className="text-xl font-bold text-gray-900 mb-2">
					{property.title}
				</h3>
				<div className="flex items-center text-gray-600 mb-4">
					<MapPin className="w-4 h-4 mr-1" />
					<span className="text-sm">{property.location}</span>
				</div>
				<div className="flex items-center justify-between mb-4">
					<span className="text-2xl font-bold text-emerald-600">
						${property.price.toLocaleString()}
						{property.type === 'rent' && (
							<span className="text-sm text-gray-600">/mo</span>
						)}
					</span>
				</div>
				<div className="flex items-center space-x-4 text-gray-600 border-t pt-4">
					{property.beds > 0 && (
						<div className="flex items-center">
							<Bed className="w-4 h-4 mr-1" />
							<span className="text-sm">{property.beds}</span>
						</div>
					)}
					<div className="flex items-center">
						<Bath className="w-4 h-4 mr-1" />
						<span className="text-sm">{property.baths}</span>
					</div>
					<div className="flex items-center">
						<Square className="w-4 h-4 mr-1" />
						<span className="text-sm">{property.sqft} sqft</span>
					</div>
				</div>
				<div className="flex flex-wrap gap-2 mt-4">
					{property.facilities.slice(0, 3).map((facility) => (
						<span
							key={facility}
							className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
						>
							{facility}
						</span>
					))}
				</div>
				<button className="w-full mt-4 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition duration-300 font-semibold">
					View Details
				</button>
			</div>
		</div>
	);
};

const App = () => {
	const [selectedType, setSelectedType] = useState('all');
	const [priceRange, setPriceRange] = useState([0, 1000000]);
	const [minPrice, setMinPrice] = useState('0');
	const [maxPrice, setMaxPrice] = useState('1000000');
	const [selectedLocation, setSelectedLocation] = useState('all');
	const [selectedFacilities, setSelectedFacilities] = useState([]);
	const [minBeds, setMinBeds] = useState(0);
	const [showFilters, setShowFilters] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const locations = [
		'all',
		'Mamba Point',
		'Sinkor',
		'Congo Town',
		'Paynesville',
		'Robertsport',
	];
	const facilities = [
		'pool',
		'parking',
		'garden',
		'security',
		'generator',
		'beach',
		'ac',
		'furnished',
	];

	const toggleFacility = (facility) => {
		setSelectedFacilities((prev) =>
			prev.includes(facility)
				? prev.filter((f) => f !== facility)
				: [...prev, facility]
		);
	};

	const handleMinPriceChange = (e) => {
		const value = e.target.value.replace(/[^0-9]/g, '');
		setMinPrice(value);
		const numValue = value === '' ? 0 : parseInt(value);
		setPriceRange([numValue, priceRange[1]]);
	};

	const handleMaxPriceChange = (e) => {
		const value = e.target.value.replace(/[^0-9]/g, '');
		setMaxPrice(value);
		const numValue = value === '' ? 1000000 : parseInt(value);
		setPriceRange([priceRange[0], numValue]);
	};

	const filteredProperties = useMemo(() => {
		return properties.filter((property) => {
			const matchesType =
				selectedType === 'all' || property.type === selectedType;
			const matchesPrice =
				property.price >= priceRange[0] && property.price <= priceRange[1];
			const matchesLocation =
				selectedLocation === 'all' ||
				property.location.includes(selectedLocation);
			const matchesBeds = property.beds >= minBeds;
			const matchesFacilities =
				selectedFacilities.length === 0 ||
				selectedFacilities.every((f) => property.facilities.includes(f));

			return (
				matchesType &&
				matchesPrice &&
				matchesLocation &&
				matchesBeds &&
				matchesFacilities
			);
		});
	}, [selectedType, priceRange, selectedLocation, minBeds, selectedFacilities]);

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Navigation */}
			<nav className="bg-white shadow-sm sticky top-0 z-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center space-x-2">
							<img src={LOGO_URL} alt="Company Logo" className="w-8 h-8" />
							<span className="text-xl font-bold text-gray-900">
								<span className="inline md:hidden">LREI</span>
								<span className="hidden md:inline">
									Liberia Real Estate Institute
								</span>
							</span>
						</div>

						{/* Desktop Navigation */}
						<div className="hidden md:flex md:items-center md:space-x-8">
							<a
								href="#properties"
								className="text-gray-700 hover:text-emerald-600 transition"
							>
								Properties
							</a>
							<a
								href="#about"
								className="text-gray-700 hover:text-emerald-600 transition"
							>
								About
							</a>
							<a
								href="#contact"
								className="text-gray-700 hover:text-emerald-600 transition"
							>
								Contact
							</a>
							<div className="flex items-center space-x-3">
								<button className="text-emerald-600 font-semibold px-4 py-2 rounded-lg hover:bg-emerald-50 transition duration-300">
									Landlord Login
								</button>
								<button className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition duration-300">
									List Property
								</button>
							</div>
						</div>

						{/* Mobile menu button */}
						<div className="-mr-2 flex md:hidden">
							<button
								onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
								className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
							>
								<span className="sr-only">Open main menu</span>
								{isMobileMenuOpen ? (
									<X className="block h-6 w-6" aria-hidden="true" />
								) : (
									<Menu className="block h-6 w-6" aria-hidden="true" />
								)}
							</button>
						</div>
					</div>
				</div>

				{/* Mobile Menu Panel */}
				<div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
					<div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
						<a
							href="#properties"
							className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
						>
							Properties
						</a>
						<a
							href="#about"
							className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
						>
							About
						</a>
						<a
							href="#contact"
							className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
						>
							Contact
						</a>
						<div className="pt-4 border-t border-gray-200">
							<button className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-emerald-600 hover:bg-emerald-50">
								Landlord Login
							</button>
							<button className="w-full mt-2 bg-emerald-600 text-white px-3 py-2 rounded-md text-base font-medium hover:bg-emerald-700">
								List Property
							</button>
						</div>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white animate-fade-in-down">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
					<div className="text-center">
						<h1 className="text-5xl font-bold mb-6">
							Find Your Dream Property in Liberia
						</h1>
						<p className="text-xl mb-8 text-emerald-50">
							Discover the finest real estate opportunities across Liberia
						</p>
						<div className="flex justify-center space-x-4">
							<button
								onClick={() => setSelectedType('sale')}
								className={`px-8 py-3 rounded-lg font-semibold transition-all duration-300 ${
									selectedType === 'sale'
										? 'bg-white text-emerald-600'
										: 'bg-emerald-700 text-white hover:bg-emerald-800'
								}`}
							>
								Buy
							</button>
							<button
								onClick={() => setSelectedType('rent')}
								className={`px-8 py-3 rounded-lg font-semibold transition-all duration-300 ${
									selectedType === 'rent'
										? 'bg-white text-emerald-600'
										: 'bg-emerald-700 text-white hover:bg-emerald-800'
								}`}
							>
								Rent
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Filters Section */}
			<div className="bg-white shadow-md -mt-8 relative z-10">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<div className="flex flex-wrap items-center gap-4">
						<button
							onClick={() => setShowFilters(!showFilters)}
							className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:border-emerald-600 transition duration-300"
						>
							<Filter className="w-5 h-5" />
							<span>Filters</span>
							<ChevronDown
								className={`w-4 h-4 transition-transform ${
									showFilters ? 'rotate-180' : ''
								}`}
							/>
						</button>

						<select
							value={selectedLocation}
							onChange={(e) => setSelectedLocation(e.target.value)}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 transition duration-300"
						>
							{locations.map((loc) => (
								<option key={loc} value={loc}>
									{loc === 'all' ? 'All Locations' : loc}
								</option>
							))}
						</select>

						<select
							value={minBeds}
							onChange={(e) => setMinBeds(Number(e.target.value))}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 transition duration-300"
						>
							<option value={0}>Any Bedrooms</option>
							<option value={1}>1+ Bedrooms</option>
							<option value={2}>2+ Bedrooms</option>
							<option value={3}>3+ Bedrooms</option>
							<option value={4}>4+ Bedrooms</option>
						</select>

						<div className="flex-1"></div>
						<span className="text-gray-600">
							{filteredProperties.length} properties found
						</span>
					</div>

					{/* Extended Filters */}
					<div
						className={`transition-all duration-500 ease-in-out overflow-hidden ${
							showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
						}`}
					>
						<div className="mt-6 pt-6 border-t border-gray-200">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-3">
										Price Range
									</label>
									<div className="flex items-center space-x-3">
										<div className="flex-1">
											<label className="block text-xs text-gray-500 mb-1">
												Min Price
											</label>
											<div className="relative">
												<span className="absolute left-3 top-2 text-gray-500">
													$
												</span>
												<input
													type="text"
													value={minPrice}
													onChange={handleMinPriceChange}
													placeholder="0"
													className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 transition duration-300"
												/>
											</div>
										</div>
										<span className="text-gray-500 mt-6">-</span>
										<div className="flex-1">
											<label className="block text-xs text-gray-500 mb-1">
												Max Price
											</label>
											<div className="relative">
												<span className="absolute left-3 top-2 text-gray-500">
													$
												</span>
												<input
													type="text"
													value={maxPrice}
													onChange={handleMaxPriceChange}
													placeholder="1000000"
													className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600 transition duration-300"
												/>
											</div>
										</div>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Facilities
									</label>
									<div className="flex flex-wrap gap-2">
										{facilities.map((facility) => (
											<button
												key={facility}
												onClick={() => toggleFacility(facility)}
												className={`px-3 py-1 rounded-full text-sm transition-colors duration-300 ${
													selectedFacilities.includes(facility)
														? 'bg-emerald-600 text-white'
														: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
												}`}
											>
												{facility}
											</button>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Properties Grid */}
			<div
				id="properties"
				className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
			>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{filteredProperties.map((property) => (
						<PropertyCard key={property.id} property={property} />
					))}
				</div>
			</div>

			{/* About Section */}
			<div id="about" className="bg-white py-16">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-12 animate-fade-in">
						<h2 className="text-4xl font-bold text-gray-900 mb-4">
							About Liberia Real Estate Institute
						</h2>
						<p className="text-xl text-gray-600 max-w-3xl mx-auto">
							Your trusted partner in finding the perfect property across
							Liberia. With years of experience and local expertise, we help you
							make informed real estate decisions.
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="text-center p-6 transition-transform duration-300 hover:scale-105">
							<div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
								<img src={LOGO_URL} alt="Logo" className="w-8 h-8" />
							</div>
							<h3 className="text-xl font-bold mb-2">500+ Properties</h3>
							<p className="text-gray-600">
								Extensive portfolio across all major cities
							</p>
						</div>
						<div className="text-center p-6 transition-transform duration-300 hover:scale-105">
							<div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
								<MapPin className="w-8 h-8 text-emerald-600" />
							</div>
							<h3 className="text-xl font-bold mb-2">Local Expertise</h3>
							<p className="text-gray-600">
								Deep knowledge of Liberian real estate market
							</p>
						</div>
						<div className="text-center p-6 transition-transform duration-300 hover:scale-105">
							<div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
								<DollarSign className="w-8 h-8 text-emerald-600" />
							</div>
							<h3 className="text-xl font-bold mb-2">Best Prices</h3>
							<p className="text-gray-600">
								Competitive rates and transparent pricing
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Contact Section */}
			<div id="contact" className="bg-gray-50 py-16">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-12 animate-fade-in">
						<h2 className="text-4xl font-bold text-gray-900 mb-4">
							Get In Touch
						</h2>
						<p className="text-xl text-gray-600">
							Ready to find your dream property? Contact us today
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="bg-white p-6 rounded-lg shadow-md text-center transition-transform duration-300 hover:scale-105">
							<Phone className="w-8 h-8 text-emerald-600 mx-auto mb-4" />
							<h3 className="font-bold mb-2">Phone</h3>
							<p className="text-gray-600">+231 770 123 456</p>
						</div>
						<div className="bg-white p-6 rounded-lg shadow-md text-center transition-transform duration-300 hover:scale-105">
							<Mail className="w-8 h-8 text-emerald-600 mx-auto mb-4" />
							<h3 className="font-bold mb-2">Email</h3>
							<p className="text-gray-600">info@lrei.com.lr</p>
						</div>
						<div className="bg-white p-6 rounded-lg shadow-md text-center transition-transform duration-300 hover:scale-105">
							<MapPin className="w-8 h-8 text-emerald-600 mx-auto mb-4" />
							<h3 className="font-bold mb-2">Office</h3>
							<p className="text-gray-600">Sinkor, Monrovia, Liberia</p>
						</div>
					</div>
				</div>
			</div>

			{/* Footer */}
			<footer className="bg-gray-900 text-white py-12">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
						<div>
							<div className="flex items-center space-x-2 mb-4">
								<img src={LOGO_URL} alt="Company Logo" className="w-6 h-6" />
								<span className="font-bold">LREI</span>
							</div>
							<p className="text-gray-400 text-sm">
								Leading real estate solutions across Liberia
							</p>
						</div>
						<div>
							<h4 className="font-bold mb-4">Quick Links</h4>
							<ul className="space-y-2 text-gray-400 text-sm">
								<li>
									<a
										href="#properties"
										className="hover:text-white transition duration-300"
									>
										Properties
									</a>
								</li>
								<li>
									<a
										href="#about"
										className="hover:text-white transition duration-300"
									>
										About Us
									</a>
								</li>
								<li>
									<a
										href="#contact"
										className="hover:text-white transition duration-300"
									>
										Contact
									</a>
								</li>
							</ul>
						</div>
						<div>
							<h4 className="font-bold mb-4">Services</h4>
							<ul className="space-y-2 text-gray-400 text-sm">
								<li>Property Sales</li>
								<li>Property Rentals</li>
								<li>Property Management</li>
								<li>Consulting</li>
							</ul>
						</div>
						<div>
							<h4 className="font-bold mb-4">Follow Us</h4>
							<div className="flex space-x-4">
								<Facebook className="w-6 h-6 hover:text-emerald-400 cursor-pointer transition duration-300" />
								<Instagram className="w-6 h-6 hover:text-emerald-400 cursor-pointer transition duration-300" />
								<Twitter className="w-6 h-6 hover:text-emerald-400 cursor-pointer transition duration-300" />
							</div>
						</div>
					</div>
					<div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
						<p>
							&copy; 2025 Liberia Real Estate Institute. All rights reserved.
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default App;