'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
	ChevronDown,
	ChevronUp,
	Search,
	PlusCircle,
	Edit,
	Trash2,
	Shield,
	Users,
	Settings,
	LogOut,
	School,
	User,
	Bell,
	ChevronsLeft,
	ChevronsRight,
	MoreVertical,
	X,
	AlertCircle,
	Check,
	ArrowLeft,
	ArrowRight,
	Building,
	Paintbrush,
	Phone,
	Key,
	FileText,
	Link as LinkIcon,
	BookOpen,
} from 'lucide-react';

// Mock Data based on the structure from your files, now fully detailed
const initialSchools = [
	{
		id: 'uca_01',
		name: 'Upstairs Christian Academy',
		slogan: 'Excellence in Education',
		shortName: 'Upstairs',
		initials: 'UCA',
		logoUrl: 'https://placehold.co/100x100/7c3aed/ffffff?text=UCA',
		logoUrl2: 'https://placehold.co/200x100/7c3aed/ffffff?text=UCA+Logo',
		description:
			'We provide exceptional education that nurtures both academic excellence and spiritual growth.',
		heroImageUrl: 'https://placehold.co/1200x400/7c3aed/ffffff?text=UCA+Campus',
		tagline: 'Nurturing minds, building character, and inspiring excellence.',
		yearFounded: 1995,
		subscriptionPlan: 'premium',
		subscriptionExpiry: '2025-12-31',
		status: 'active',
		customizations: { theme: 'dark' },
		enabledFeatures: [
			'dashboard',
			'user_management',
			'profile_management',
			'messages',
			'grading_system',
			'lesson_planning',
			'academic_reports',
			'academic_resources',
			'calendar_events',
			'class_management',
			'fee_payment',
			'salary_management',
			'school_settings',
			'support_system',
			'events_log',
		],
		roleFeatureAccess: {
			system_admin: ['dashboard', 'user_management'],
			teacher: ['dashboard', 'grading_system'],
			student: ['dashboard', 'fee_payment'],
			administrator: ['dashboard', 'salary_management'],
		},
		whyChoose: [
			{
				icon: 'Award',
				title: 'Academic Excellence',
				description: 'Rigorous curriculum.',
			},
		],
		facilities: [
			{
				icon: 'Zap',
				title: 'Modern E-Portal',
				description: 'Advanced online platform.',
			},
		],
		team: [
			{
				name: 'Dr. John Doe',
				title: 'Principal',
				avatarUrl: 'https://i.pravatar.cc/150?u=john',
			},
			{
				name: 'Prof. Jane Smith',
				title: 'Vice Principal',
				avatarUrl: 'https://i.pravatar.cc/150?u=jane',
			},
		],
		address: ['123 Education Street', 'Monrovia, Montserrado', 'Liberia'],
		phones: ['+231 770 123 456', '+231 880 789 012'],
		emails: ['info@unityca.edu.lr', 'admissions@unityca.edu.lr'],
		hours: ['Monday - Friday: 7:30 AM - 3:30 PM'],
		quickLinks: [{ label: 'About Us', href: '#about' }],
		academicLinks: [{ label: 'Elementary School', href: '#elementary' }],
		footerLinks: [{ label: 'Privacy Policy', href: '#privacy' }],
		classLevels: {
			Morning: {
				Elementary: {
					subjects: ['Math', 'Science'],
					classes: [{ classId: 'M-G1', name: 'Grade 1' }],
				},
			},
		},
	},
	// ... other schools
];

const allFeatures = [
	'dashboard',
	'user_management',
	'profile_management',
	'messages',
	'grading_system',
	'lesson_planning',
	'academic_reports',
	'academic_resources',
	'calendar_events',
	'class_management',
	'fee_payment',
	'salary_management',
	'school_settings',
	'support_system',
	'events_log',
];

const initialAdmins = [
	{
		id: 1,
		name: 'Alex Johnson',
		email: 'alex.j@superadmin.com',
		role: 'Super Admin',
		lastLogin: '2024-08-25 10:30 AM',
	},
	{
		id: 2,
		name: 'Maria Garcia',
		email: 'maria.g@superadmin.com',
		role: 'Admin',
		lastLogin: '2024-08-25 09:15 AM',
	},
	{
		id: 3,
		name: 'Sam Chen',
		email: 'sam.c@superadmin.com',
		role: 'Admin',
		lastLogin: '2024-08-24 04:45 PM',
	},
];

// Reusable Components
const Card = ({ children, className = '' }) => (
	<div
		className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden ${className}`}
	>
		{children}
	</div>
);

const Button = ({
	children,
	onClick,
	variant = 'primary',
	className = '',
	...props
}) => {
	const baseClasses =
		'px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
	const variants = {
		primary:
			'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
		secondary:
			'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-400',
		danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
	};
	return (
		<button
			onClick={onClick}
			className={`${baseClasses} ${variants[variant]} ${className}`}
			{...props}
		>
			{children}
		</button>
	);
};

const Modal = ({ isOpen, onClose, title, children }) => {
	if (!isOpen) return null;
	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
				<div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
					<h3 className="text-lg font-bold text-gray-900 dark:text-white">
						{title}
					</h3>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
					>
						<X size={24} />
					</button>
				</div>
				<div className="p-6 overflow-y-auto">{children}</div>
			</div>
		</div>
	);
};

const Input = ({ label, id, ...props }) => (
	<div>
		<label
			htmlFor={id}
			className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
		>
			{label}
		</label>
		<input
			id={id}
			className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
			{...props}
		/>
	</div>
);

const Textarea = ({ label, id, ...props }) => (
	<div>
		<label
			htmlFor={id}
			className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
		>
			{label}
		</label>
		<textarea
			id={id}
			rows="3"
			className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
			{...props}
		></textarea>
	</div>
);

const Checkbox = ({ label, id, checked, onChange }) => (
	<label
		htmlFor={id}
		className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
	>
		<input
			type="checkbox"
			id={id}
			checked={checked}
			onChange={onChange}
			className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
		/>
		<span className="font-medium text-gray-800 dark:text-gray-200 capitalize">
			{label.replace(/_/g, ' ')}
		</span>
	</label>
);

const JsonTextarea = ({ label, id, value, onChange, ...props }) => {
	const [text, setText] = useState('');
	const [error, setError] = useState('');

	useEffect(() => {
		try {
			setText(JSON.stringify(value, null, 2));
		} catch (e) {
			setText('');
		}
	}, [value]);

	const handleTextChange = (e) => {
		const newText = e.target.value;
		setText(newText);
		try {
			const parsed = JSON.parse(newText);
			onChange(parsed);
			setError('');
		} catch (err) {
			setError('Invalid JSON format. Please check syntax.');
		}
	};

	return (
		<div>
			<label
				htmlFor={id}
				className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
			>
				{label}
			</label>
			<textarea
				id={id}
				rows="8"
				className={`w-full px-3 py-2 font-mono text-sm bg-gray-50 dark:bg-gray-700 border rounded-lg focus:ring-2 focus:border-indigo-500 outline-none transition ${
					error
						? 'border-red-500 focus:ring-red-500'
						: 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
				}`}
				value={text}
				onChange={handleTextChange}
				{...props}
			/>
			{error && (
				<p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
					<AlertCircle size={14} /> {error}
				</p>
			)}
		</div>
	);
};

const StringArrayTextarea = ({ label, id, value, onChange, ...props }) => {
	const textValue = Array.isArray(value) ? value.join('\n') : '';

	const handleTextChange = (e) => {
		onChange(e.target.value.split('\n').filter((line) => line.trim() !== ''));
	};

	return (
		<div>
			<label
				htmlFor={id}
				className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
			>
				{label}
			</label>
			<textarea
				id={id}
				rows="3"
				className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
				value={textValue}
				onChange={handleTextChange}
				{...props}
			/>
			<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
				Enter one item per line.
			</p>
		</div>
	);
};

// Page Components
const SchoolManagementPage = ({
	schools,
	setSchools,
	setCurrentPage,
	setCurrentSchool,
}) => {
	const [searchTerm, setSearchTerm] = useState('');
	const [sortConfig, setSortConfig] = useState({
		key: 'name',
		direction: 'ascending',
	});
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [schoolToDelete, setSchoolToDelete] = useState(null);

	const sortedSchools = useMemo(() => {
		let sortableItems = [...schools];
		if (sortConfig !== null) {
			sortableItems.sort((a, b) => {
				if (a[sortConfig.key] < b[sortConfig.key]) {
					return sortConfig.direction === 'ascending' ? -1 : 1;
				}
				if (a[sortConfig.key] > b[sortConfig.key]) {
					return sortConfig.direction === 'ascending' ? 1 : -1;
				}
				return 0;
			});
		}
		return sortableItems.filter((school) =>
			school.name.toLowerCase().includes(searchTerm.toLowerCase())
		);
	}, [schools, searchTerm, sortConfig]);

	const requestSort = (key) => {
		let direction = 'ascending';
		if (sortConfig.key === key && sortConfig.direction === 'ascending') {
			direction = 'descending';
		}
		setSortConfig({ key, direction });
	};

	const handleEdit = (school) => {
		setCurrentSchool(school);
		setCurrentPage('editSchool');
	};

	const handleAddNew = () => {
		setCurrentSchool(null);
		setCurrentPage('editSchool');
	};

	const toggleStatus = (schoolId) => {
		setSchools(
			schools.map((s) =>
				s.id === schoolId
					? { ...s, status: s.status === 'active' ? 'inactive' : 'active' }
					: s
			)
		);
	};

	const openDeleteModal = (school) => {
		setSchoolToDelete(school);
		setIsDeleteModalOpen(true);
	};

	const confirmDelete = () => {
		setSchools(schools.filter((s) => s.id !== schoolToDelete.id));
		setIsDeleteModalOpen(false);
		setSchoolToDelete(null);
	};

	const SortableHeader = ({ children, name }) => {
		const isSorted = sortConfig.key === name;
		return (
			<th
				className="p-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
				onClick={() => requestSort(name)}
			>
				<div className="flex items-center gap-1">
					{children}
					{isSorted ? (
						sortConfig.direction === 'ascending' ? (
							<ChevronUp size={14} />
						) : (
							<ChevronDown size={14} />
						)
					) : null}
				</div>
			</th>
		);
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col md:flex-row justify-between items-center gap-4">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
					School Management
				</h1>
				<div className="flex items-center gap-2 w-full md:w-auto">
					<div className="relative w-full md:w-64">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
							size={18}
						/>
						<input
							type="text"
							placeholder="Search schools..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
						/>
					</div>
					<Button onClick={handleAddNew}>
						<PlusCircle size={18} />
						New School
					</Button>
				</div>
			</div>

			<Card>
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-gray-50 dark:bg-gray-700/50">
							<tr>
								<SortableHeader name="name">School</SortableHeader>
								<SortableHeader name="status">Status</SortableHeader>
								<SortableHeader name="subscriptionPlan">Plan</SortableHeader>
								<SortableHeader name="subscriptionExpiry">
									Expiry Date
								</SortableHeader>
								<th className="p-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
							{sortedSchools.map((school) => (
								<tr
									key={school.id}
									className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
								>
									<td className="p-3 whitespace-nowrap">
										<div className="flex items-center gap-3">
											<img
												src={school.logoUrl}
												alt={`${school.name} logo`}
												className="w-10 h-10 rounded-full object-cover"
												onError={(e) =>
													(e.target.src =
														'https://placehold.co/100x100/cccccc/ffffff?text=Error')
												}
											/>
											<div>
												<div className="font-bold text-gray-900 dark:text-white">
													{school.name}
												</div>
												<div className="text-sm text-gray-500 dark:text-gray-400">
													{school.shortName}
												</div>
											</div>
										</div>
									</td>
									<td className="p-3 whitespace-nowrap">
										<span
											onClick={() => toggleStatus(school.id)}
											className={`cursor-pointer px-2.5 py-1 text-xs font-semibold rounded-full ${
												school.status === 'active'
													? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
													: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
											}`}
										>
											{school.status}
										</span>
									</td>
									<td className="p-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 capitalize">
										{school.subscriptionPlan}
									</td>
									<td className="p-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
										{school.subscriptionExpiry}
									</td>
									<td className="p-3 whitespace-nowrap">
										<div className="flex items-center gap-2">
											<Button
												onClick={() => handleEdit(school)}
												variant="secondary"
												className="px-3 py-1 text-xs"
											>
												<Edit size={14} /> Manage
											</Button>
											<Button
												onClick={() => openDeleteModal(school)}
												variant="danger"
												className="px-3 py-1 text-xs"
											>
												<Trash2 size={14} />
											</Button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>
			<Modal
				isOpen={isDeleteModalOpen}
				onClose={() => setIsDeleteModalOpen(false)}
				title="Confirm Deletion"
			>
				<p className="text-gray-600 dark:text-gray-300">
					Are you sure you want to delete the school "{schoolToDelete?.name}"?
					This action cannot be undone.
				</p>
				<div className="flex justify-end gap-3 mt-6">
					<Button
						variant="secondary"
						onClick={() => setIsDeleteModalOpen(false)}
					>
						Cancel
					</Button>
					<Button variant="danger" onClick={confirmDelete}>
						Delete School
					</Button>
				</div>
			</Modal>
		</div>
	);
};

const SchoolFormPage = ({ school, setSchools, setCurrentPage }) => {
	const isNew = !school;
	const [currentStep, setCurrentStep] = useState(1);
	const [formData, setFormData] = useState(
		isNew
			? {
					name: '',
					slogan: '',
					shortName: '',
					initials: '',
					logoUrl: '',
					logoUrl2: '',
					description: '',
					heroImageUrl: '',
					tagline: '',
					yearFounded: new Date().getFullYear(),
					subscriptionPlan: 'standard',
					subscriptionExpiry: '',
					status: 'active',
					customizations: { theme: 'light' },
					enabledFeatures: [],
					roleFeatureAccess: {},
					whyChoose: [],
					facilities: [],
					team: [],
					address: [],
					phones: [],
					emails: [],
					hours: [],
					quickLinks: [],
					academicLinks: [],
					footerLinks: [],
					classLevels: {},
			  }
			: school
	);

	const steps = [
		{ num: 1, title: 'Basic Info', icon: School },
		{ num: 2, title: 'Branding', icon: Paintbrush },
		{ num: 3, title: 'Contact', icon: Phone },
		{ num: 4, title: 'Subscription & Features', icon: Key },
		{ num: 5, title: 'Homepage Content', icon: FileText },
		{ num: 6, title: 'Navigation Links', icon: LinkIcon },
		{ num: 7, title: 'Academic Structure', icon: BookOpen },
	];
	const totalSteps = steps.length;

	const nextStep = () =>
		setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
	const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleComplexChange = (name, value) => {
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleFeatureChange = (feature) => {
		setFormData((prev) => {
			const enabledFeatures = prev.enabledFeatures.includes(feature)
				? prev.enabledFeatures.filter((f) => f !== feature)
				: [...prev.enabledFeatures, feature];
			return { ...prev, enabledFeatures };
		});
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		if (isNew) {
			setSchools((prev) => [
				...prev,
				{ ...formData, id: `school_${Date.now()}` },
			]);
		} else {
			setSchools((prev) =>
				prev.map((s) => (s.id === school.id ? formData : s))
			);
		}
		setCurrentPage('schools');
	};

	const roles = ['system_admin', 'teacher', 'student', 'administrator'];

	const Stepper = () => (
		<div className="mb-8">
			<ol className="flex items-center w-full">
				{steps.map((step, index) => (
					<li
						key={step.num}
						className={`flex w-full items-center ${
							index < totalSteps - 1
								? "after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-300 dark:after:border-gray-600 after:border-4 after:inline-block"
								: ''
						}`}
					>
						<button
							onClick={() => setCurrentStep(step.num)}
							className="flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20"
						>
							<span
								className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
									currentStep >= step.num
										? 'bg-indigo-600 text-white'
										: 'bg-gray-200 dark:bg-gray-700'
								}`}
							>
								{currentStep > step.num ? (
									<Check size={20} />
								) : (
									<step.icon size={20} />
								)}
							</span>
							<span
								className={`mt-2 text-xs sm:text-sm text-center ${
									currentStep >= step.num
										? 'font-bold text-indigo-600 dark:text-indigo-400'
										: 'text-gray-500'
								}`}
							>
								{step.title}
							</span>
						</button>
					</li>
				))}
			</ol>
		</div>
	);

	return (
		<div className="space-y-6">
			<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
				{isNew ? 'Onboard New School' : `Manage ${school.name}`}
			</h1>
			<Stepper />
			<form onSubmit={handleSubmit} className="space-y-8">
				{currentStep === 1 && (
					<Card>
						<div className="p-6 space-y-6">
							<h2 className="text-xl font-semibold">
								Step 1: Basic Information
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<Input
									label="School Name"
									id="name"
									name="name"
									value={formData.name}
									onChange={handleChange}
									required
								/>
								<Input
									label="Slogan"
									id="slogan"
									name="slogan"
									value={formData.slogan}
									onChange={handleChange}
								/>
								<Input
									label="Short Name"
									id="shortName"
									name="shortName"
									value={formData.shortName}
									onChange={handleChange}
								/>
								<Input
									label="Initials"
									id="initials"
									name="initials"
									value={formData.initials}
									onChange={handleChange}
								/>
								<Input
									label="Year Founded"
									id="yearFounded"
									name="yearFounded"
									type="number"
									value={formData.yearFounded}
									onChange={handleChange}
								/>
								<Input
									label="Tagline"
									id="tagline"
									name="tagline"
									value={formData.tagline}
									onChange={handleChange}
								/>
								<div className="md:col-span-2">
									<Textarea
										label="Description"
										id="description"
										name="description"
										value={formData.description}
										onChange={handleChange}
									/>
								</div>
							</div>
						</div>
					</Card>
				)}
				{currentStep === 2 && (
					<Card>
						<div className="p-6 space-y-6">
							<h2 className="text-xl font-semibold">
								Step 2: Branding & Customization
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<Input
									label="Logo URL"
									id="logoUrl"
									name="logoUrl"
									value={formData.logoUrl}
									onChange={handleChange}
								/>
								<Input
									label="Secondary Logo URL"
									id="logoUrl2"
									name="logoUrl2"
									value={formData.logoUrl2}
									onChange={handleChange}
								/>
								<div className="md:col-span-2">
									<Input
										label="Hero Image URL"
										id="heroImageUrl"
										name="heroImageUrl"
										value={formData.heroImageUrl}
										onChange={handleChange}
									/>
								</div>
								<div>
									<label
										htmlFor="theme"
										className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
									>
										Theme
									</label>
									<select
										id="theme"
										name="theme"
										value={formData.customizations.theme}
										onChange={(e) =>
											handleComplexChange('customizations', {
												theme: e.target.value,
											})
										}
										className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
									>
										<option value="light">Light</option>
										<option value="dark">Dark</option>
									</select>
								</div>
							</div>
						</div>
					</Card>
				)}
				{currentStep === 3 && (
					<Card>
						<div className="p-6 space-y-6">
							<h2 className="text-xl font-semibold">
								Step 3: Contact Information
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<StringArrayTextarea
									label="Address"
									id="address"
									value={formData.address}
									onChange={(val) => handleComplexChange('address', val)}
								/>
								<StringArrayTextarea
									label="Phone Numbers"
									id="phones"
									value={formData.phones}
									onChange={(val) => handleComplexChange('phones', val)}
								/>
								<StringArrayTextarea
									label="Email Addresses"
									id="emails"
									value={formData.emails}
									onChange={(val) => handleComplexChange('emails', val)}
								/>
								<StringArrayTextarea
									label="Operating Hours"
									id="hours"
									value={formData.hours}
									onChange={(val) => handleComplexChange('hours', val)}
								/>
							</div>
						</div>
					</Card>
				)}
				{currentStep === 4 && (
					<div className="space-y-8">
						<Card>
							<div className="p-6 space-y-6">
								<h2 className="text-xl font-semibold">
									Step 4: Subscription & Features
								</h2>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label
											htmlFor="subscriptionPlan"
											className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
										>
											Subscription Plan
										</label>
										<select
											id="subscriptionPlan"
											name="subscriptionPlan"
											value={formData.subscriptionPlan}
											onChange={handleChange}
											className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
										>
											<option value="standard">Standard</option>
											<option value="premium">Premium</option>
											<option value="enterprise">Enterprise</option>
										</select>
									</div>
									<Input
										label="Subscription Expiry"
										id="subscriptionExpiry"
										name="subscriptionExpiry"
										type="date"
										value={formData.subscriptionExpiry}
										onChange={handleChange}
										required
									/>
								</div>
								<h3 className="text-lg font-semibold pt-4 border-t dark:border-gray-700">
									Enabled Features
								</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
									{allFeatures.map((feature) => (
										<Checkbox
											key={feature}
											id={feature}
											label={feature}
											checked={formData.enabledFeatures.includes(feature)}
											onChange={() => handleFeatureChange(feature)}
										/>
									))}
								</div>
							</div>
						</Card>
					</div>
				)}
				{currentStep === 5 && (
					<Card>
						<div className="p-6 space-y-6">
							<h2 className="text-xl font-semibold">
								Step 5: Homepage Content (JSON)
							</h2>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								Provide structured data for homepage sections. The 'icon' field
								should be a string matching a Lucide icon name.
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<JsonTextarea
									label="Why Choose Us Section"
									id="whyChoose"
									value={formData.whyChoose}
									onChange={(val) => handleComplexChange('whyChoose', val)}
								/>
								<JsonTextarea
									label="Facilities Section"
									id="facilities"
									value={formData.facilities}
									onChange={(val) => handleComplexChange('facilities', val)}
								/>
								<JsonTextarea
									label="Team Members Section"
									id="team"
									value={formData.team}
									onChange={(val) => handleComplexChange('team', val)}
								/>
							</div>
						</div>
					</Card>
				)}
				{currentStep === 6 && (
					<Card>
						<div className="p-6 space-y-6">
							<h2 className="text-xl font-semibold">
								Step 6: Navigation Links (JSON)
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								<JsonTextarea
									label="Quick Links"
									id="quickLinks"
									value={formData.quickLinks}
									onChange={(val) => handleComplexChange('quickLinks', val)}
								/>
								<JsonTextarea
									label="Academic Links"
									id="academicLinks"
									value={formData.academicLinks}
									onChange={(val) => handleComplexChange('academicLinks', val)}
								/>
								<JsonTextarea
									label="Footer Links"
									id="footerLinks"
									value={formData.footerLinks}
									onChange={(val) => handleComplexChange('footerLinks', val)}
								/>
							</div>
						</div>
					</Card>
				)}
				{currentStep === 7 && (
					<Card>
						<div className="p-6 space-y-6">
							<h2 className="text-xl font-semibold">
								Step 7: Academic Structure (JSON)
							</h2>
							<JsonTextarea
								label="Class Levels & Subjects"
								id="classLevels"
								value={formData.classLevels}
								onChange={(val) => handleComplexChange('classLevels', val)}
							/>
						</div>
					</Card>
				)}

				<div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
					<Button
						type="button"
						variant="secondary"
						onClick={prevStep}
						disabled={currentStep === 1}
					>
						<ArrowLeft size={16} /> Previous
					</Button>
					<div className="text-sm font-medium text-gray-600 dark:text-gray-400">
						Step {currentStep} of {totalSteps}
					</div>
					{currentStep < totalSteps ? (
						<Button type="button" onClick={nextStep}>
							Next <ArrowRight size={16} />
						</Button>
					) : (
						<Button type="submit">
							{isNew ? 'Onboard School' : 'Save Changes'}
						</Button>
					)}
				</div>
			</form>
		</div>
	);
};

const AdminManagementPage = () => {
	const [admins, setAdmins] = useState(initialAdmins);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [currentAdmin, setCurrentAdmin] = useState(null);
	const isNew = !currentAdmin;

	const handleOpenModal = (admin = null) => {
		setCurrentAdmin(admin);
		setIsModalOpen(true);
	};

	const handleSaveAdmin = (e) => {
		e.preventDefault();
		const formData = new FormData(e.target);
		const adminData = Object.fromEntries(formData.entries());

		if (isNew) {
			setAdmins([
				...admins,
				{ ...adminData, id: Date.now(), lastLogin: 'Never' },
			]);
		} else {
			setAdmins(
				admins.map((a) =>
					a.id === currentAdmin.id ? { ...a, ...adminData } : a
				)
			);
		}
		setIsModalOpen(false);
		setCurrentAdmin(null);
	};

	const handleDeleteAdmin = (adminId) => {
		setAdmins(admins.filter((a) => a.id !== adminId));
	};

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
					System Administrators
				</h1>
				<Button onClick={() => handleOpenModal()}>
					<PlusCircle size={18} />
					New Admin
				</Button>
			</div>
			<Card>
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-gray-50 dark:bg-gray-700/50">
							<tr>
								<th className="p-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Name
								</th>
								<th className="p-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Role
								</th>
								<th className="p-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Last Login
								</th>
								<th className="p-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
							{admins.map((admin) => (
								<tr
									key={admin.id}
									className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
								>
									<td className="p-3">
										<div className="font-bold text-gray-900 dark:text-white">
											{admin.name}
										</div>
										<div className="text-sm text-gray-500 dark:text-gray-400">
											{admin.email}
										</div>
									</td>
									<td className="p-3">
										<span
											className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
												admin.role === 'Super Admin'
													? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
													: 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
											}`}
										>
											{admin.role}
										</span>
									</td>
									<td className="p-3 text-sm text-gray-600 dark:text-gray-300">
										{admin.lastLogin}
									</td>
									<td className="p-3">
										<div className="flex items-center gap-2">
											<Button
												onClick={() => handleOpenModal(admin)}
												variant="secondary"
												className="px-3 py-1 text-xs"
											>
												<Edit size={14} /> Edit
											</Button>
											<Button
												onClick={() => handleDeleteAdmin(admin.id)}
												variant="danger"
												className="px-3 py-1 text-xs"
											>
												<Trash2 size={14} />
											</Button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>
			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={isNew ? 'Add New Admin' : 'Edit Admin'}
			>
				<form onSubmit={handleSaveAdmin} className="space-y-4">
					<Input
						label="Full Name"
						id="name"
						name="name"
						defaultValue={currentAdmin?.name}
						required
					/>
					<Input
						label="Email Address"
						id="email"
						name="email"
						type="email"
						defaultValue={currentAdmin?.email}
						required
					/>
					<div>
						<label
							htmlFor="role"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
						>
							Role
						</label>
						<select
							id="role"
							name="role"
							defaultValue={currentAdmin?.role || 'Admin'}
							className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
						>
							<option>Admin</option>
							<option>Super Admin</option>
						</select>
					</div>
					<div className="flex justify-end gap-3 pt-4">
						<Button
							type="button"
							variant="secondary"
							onClick={() => setIsModalOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit">Save Admin</Button>
					</div>
				</form>
			</Modal>
		</div>
	);
};

// Main App Component
export default function App() {
	const [currentPage, setCurrentPage] = useState('schools');
	const [schools, setSchools] = useState(initialSchools);
	const [currentSchool, setCurrentSchool] = useState(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);

	const NavItem = ({ icon: Icon, label, page, isExpanded }) => (
		<button
			onClick={() => setCurrentPage(page)}
			className={`flex items-center w-full h-12 px-4 rounded-lg transition-colors duration-200 ${
				currentPage === page
					? 'bg-indigo-600 text-white'
					: 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
			}`}
			title={label}
		>
			<Icon size={20} />
			{isExpanded && <span className="ml-4 font-medium">{label}</span>}
		</button>
	);

	const renderPage = () => {
		switch (currentPage) {
			case 'schools':
				return (
					<SchoolManagementPage
						schools={schools}
						setSchools={setSchools}
						setCurrentPage={setCurrentPage}
						setCurrentSchool={setCurrentSchool}
					/>
				);
			case 'editSchool':
				return (
					<SchoolFormPage
						school={currentSchool}
						setSchools={setSchools}
						setCurrentPage={setCurrentPage}
					/>
				);
			case 'admins':
				return <AdminManagementPage />;
			default:
				return (
					<SchoolManagementPage
						schools={schools}
						setSchools={setSchools}
						setCurrentPage={setCurrentPage}
						setCurrentSchool={setCurrentSchool}
					/>
				);
		}
	};

	return (
		<div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
			{/* Sidebar */}
			<aside
				className={`flex flex-col bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ${
					isSidebarOpen ? 'w-64' : 'w-20'
				}`}
			>
				<div
					className={`flex items-center justify-between h-16 px-4 border-b dark:border-gray-700 ${
						isSidebarOpen ? '' : 'justify-center'
					}`}
				>
					{isSidebarOpen && (
						<span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
							EduAdmin
						</span>
					)}
					<button
						onClick={() => setIsSidebarOpen(!isSidebarOpen)}
						className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
					>
						{isSidebarOpen ? (
							<ChevronsLeft size={20} />
						) : (
							<ChevronsRight size={20} />
						)}
					</button>
				</div>
				<nav className="flex-1 p-4 space-y-2">
					<NavItem
						icon={School}
						label="Schools"
						page="schools"
						isExpanded={isSidebarOpen}
					/>
					<NavItem
						icon={Shield}
						label="Admins"
						page="admins"
						isExpanded={isSidebarOpen}
					/>
					<NavItem
						icon={Settings}
						label="Settings"
						page="settings"
						isExpanded={isSidebarOpen}
					/>
				</nav>
				<div className="p-4 border-t dark:border-gray-700">
					<NavItem
						icon={LogOut}
						label="Logout"
						page="logout"
						isExpanded={isSidebarOpen}
					/>
				</div>
			</aside>

			{/* Main Content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Header */}
				<header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
					<div>{/* Breadcrumbs can go here */}</div>
					<div className="flex items-center gap-4">
						<button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
							<Bell size={20} />
						</button>
						<div className="flex items-center gap-3">
							<img
								src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
								alt="Admin"
								className="w-10 h-10 rounded-full"
							/>
							<div>
								<div className="font-semibold text-sm">Alex Johnson</div>
								<div className="text-xs text-gray-500">Super Admin</div>
							</div>
							<button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
								<MoreVertical size={20} />
							</button>
						</div>
					</div>
				</header>

				{/* Page Content */}
				<main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
					{renderPage()}
				</main>
			</div>
		</div>
	);
}
