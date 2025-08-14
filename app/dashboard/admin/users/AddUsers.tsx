'use client';
import React, { useState } from 'react';
import {
	ChevronLeft,
	ChevronRight,
	User,
	Users,
	Shield,
	Eye,
	EyeOff,
	RefreshCw,
	Camera,
	ArrowLeft,
} from 'lucide-react';

const DashboardUserForm = ({ onUserCreated, onBack }) => {
	const [currentStep, setCurrentStep] = useState(1);
	const [userType, setUserType] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState({});
	const [isValidating, setIsValidating] = useState(false);

	// Form data state aligned with schema
	const [formData, setFormData] = useState({
		// Base User fields
		firstName: '',
		middleName: '',
		lastName: '',
		gender: '',
		username: '',
		password: '',
		nickName: '',
		dateOfBirth: '',
		phone: '',
		email: '',
		address: '',
		bio: '',
		photo: '',

		// Student specific
		classId: '',
		guardian: {
			firstName: '',
			middleName: '',
			lastName: '',
			email: '',
			phone: '',
			address: '',
		},

		// Teacher specific
		subjects: [], // Array of {subject: string, level: ClassLevel}
		isSponsor: false,
		sponsorClass: null,

		// Administrator specific
		position: '',
		permissions: [],
	});

	// Constants aligned with schema
	const classLevels = [
		'Self Contained',
		'Elementry',
		'Junior High',
		'Senior High',
	];

	const classIds = [
		{ id: 'daycare', name: 'Daycare', level: 'Self Contained' },
		{ id: 'nursery', name: 'Nursery', level: 'Self Contained' },
		{ id: 'kOne', name: 'Kindergarten 1', level: 'Self Contained' },
		{ id: 'kTwo', name: 'Kindergarten 2', level: 'Self Contained' },
		{ id: 'one', name: 'Grade 1', level: 'Self Contained' },
		{ id: 'two', name: 'Grade 2', level: 'Self Contained' },
		{ id: 'three', name: 'Grade 3', level: 'Self Contained' },
		{ id: 'four', name: 'Grade 4', level: 'Elementry' },
		{ id: 'five', name: 'Grade 5', level: 'Elementry' },
		{ id: 'six', name: 'Grade 6', level: 'Elementry' },
		{ id: 'seven', name: 'Grade 7', level: 'Junior High' },
		{ id: 'eight', name: 'Grade 8', level: 'Junior High' },
		{ id: 'nine', name: 'Grade 9', level: 'Junior High' },
		{ id: 'tenOne', name: 'Grade 10-A', level: 'Senior High' },
		{ id: 'tenTwo', name: 'Grade 10-B', level: 'Senior High' },
		{ id: 'elevenOne', name: 'Grade 11-A', level: 'Senior High' },
		{ id: 'elevenTwo', name: 'Grade 11-B', level: 'Senior High' },
		{ id: 'twelveOne', name: 'Grade 12-A', level: 'Senior High' },
		{ id: 'twelveTwo', name: 'Grade 12-B', level: 'Senior High' },
	];

	// Subjects by education level
	const subjectsByLevel = {
		'Self Contained': [
			'Reading',
			'Writing',
			'Basic Math',
			'Science Discovery',
			'Social Awareness',
			'Art & Crafts',
			'Music & Movement',
			'Physical Play',
			'Life Skills',
			'Story Time',
		],
		Elementry: [
			'Mathematics',
			'English Language Arts',
			'Science',
			'Social Studies',
			'Art',
			'Music',
			'Physical Education',
			'Health Education',
			'Computer Basics',
			'Library Skills',
			'Character Education',
		],
		'Junior High': [
			'Mathematics',
			'English',
			'Science',
			'Social Studies',
			'Physical Education',
			'Art',
			'Music',
			'Technology',
			'Health & Wellness',
			'Study Skills',
			'Career Exploration',
			'Foreign Language',
		],
		'Senior High': [
			'Advanced Mathematics',
			'English Literature',
			'Biology',
			'Chemistry',
			'Physics',
			'World History',
			'Government',
			'Economics',
			'Physical Education',
			'Art',
			'Music',
			'Computer Science',
			'Foreign Language',
			'Psychology',
			'Philosophy',
			'Advanced Placement Courses',
			'Vocational Training',
		],
	};

	const adminPositions = [
		'Principal',
		'Vice Principal',
		'Academic Director',
		'Dean of Students',
		'Registrar',
		'Finance Officer',
		'IT Administrator',
		'HR Manager',
		'Guidance Counselor',
		'Librarian',
		'Secretary',
		'Administrative Assistant',
	];

	const adminPermissions = [
		'user_management',
		'grade_management',
		'schedule_management',
		'financial_management',
		'system_administration',
		'reporting',
		'student_records',
		'teacher_records',
		'academic_planning',
		'disciplinary_actions',
		'parent_communication',
	];

	// Mock existing data for validation
	const existingUsers = [
		{ username: 'john.doe', email: 'john@school.edu' },
		{ username: 'jane.smith', email: 'jane@school.edu' },
	];

	// Helper functions
	const generateUsername = () => {
		const { firstName, lastName } = formData;
		if (!firstName || !lastName) return '';

		const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
		const variations = [
			base,
			`${firstName.toLowerCase()}${lastName.charAt(0).toLowerCase()}`,
			`${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`,
			`${base}${Math.floor(Math.random() * 100)}`,
		];

		for (const variation of variations) {
			if (!existingUsers.find((user) => user.username === variation)) {
				return variation;
			}
		}
		return `${base}${Math.floor(Math.random() * 1000)}`;
	};

	const generatePassword = () => {
		const chars =
			'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
		let password = '';
		for (let i = 0; i < 12; i++) {
			password += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return password;
	};

	const generateUserId = () => {
		const prefix =
			userType === 'student' ? 'STU' : userType === 'teacher' ? 'TCH' : 'ADM';
		return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
	};

	// Self-contained class logic
	const getSelfContainedClasses = () => {
		return classIds.filter((cls) => cls.level === 'Self Contained');
	};

	const handleSelfContainedSelection = (classId, checked) => {
		if (checked) {
			// When selecting a self-contained class, add all subjects for that level
			const selfContainedSubjects = subjectsByLevel['Self Contained'].map(
				(subject) => ({
					subject,
					level: 'Self Contained',
				})
			);

			setFormData({
				...formData,
				subjects: selfContainedSubjects,
				isSponsor: true,
				sponsorClass: classId,
			});
		} else {
			// When deselecting, clear all subjects and sponsorship
			setFormData({
				...formData,
				subjects: [],
				isSponsor: false,
				sponsorClass: null,
			});
		}
	};

	// Validation functions
	const validateStep = async (step) => {
		setIsValidating(true);
		type ErrorType = {
			[name: string]: string;
		};
		const newErrors: ErrorType = {};

		switch (step) {
			case 2: // Personal Information
				if (!formData.firstName.trim())
					newErrors['firstName'] = 'First name is required';
				if (!formData.lastName.trim())
					newErrors.lastName = 'Last name is required';
				if (!formData.gender.trim()) newErrors.gender = 'Gender is required';
				if (!formData.dateOfBirth)
					newErrors.dateOfBirth = 'Date of birth is required';
				if (!formData.phone.trim())
					newErrors.phone = 'Phone number is required';
				if (!formData.address.trim()) newErrors.address = 'Address is required';

				if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
					newErrors.email = 'Invalid email format';
				}
				if (
					formData.email &&
					existingUsers.find((user) => user.email === formData.email)
				) {
					newErrors.email = 'Email already registered';
				}
				break;

			case 3: // Role-specific information
				if (userType === 'student') {
					if (!formData.classId)
						newErrors.classId = 'Class selection is required';

					// Guardian validation
					if (!formData.guardian.firstName.trim()) {
						newErrors.guardianFirstName = 'Guardian first name is required';
					}
					if (!formData.guardian.lastName.trim()) {
						newErrors.guardianLastName = 'Guardian last name is required';
					}
					if (!formData.guardian.phone.trim()) {
						newErrors.guardianPhone = 'Guardian phone is required';
					}
					if (!formData.guardian.address.trim()) {
						newErrors.guardianAddress = 'Guardian address is required';
					}
				} else if (userType === 'teacher') {
					if (formData.subjects.length === 0) {
						newErrors.subjects = 'At least one subject must be selected';
					}
				} else if (userType === 'administrator') {
					if (!formData.position) newErrors.position = 'Position is required';
					if (formData.permissions.length === 0) {
						newErrors.permissions = 'At least one permission must be selected';
					}
				}
				break;

			case 4: // Account credentials
				if (!formData.username.trim())
					newErrors.username = 'Username is required';
				if (!formData.password.trim())
					newErrors.password = 'Password is required';
				if (formData.password.length < 8)
					newErrors.password = 'Password must be at least 8 characters';
				if (existingUsers.find((user) => user.username === formData.username)) {
					newErrors.username = 'Username already exists';
				}
				break;
		}

		setErrors(newErrors);
		setIsValidating(false);
		return Object.keys(newErrors).length === 0;
	};

	const handleNext = async () => {
		if (await validateStep(currentStep)) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handlePrevious = () => {
		setCurrentStep(currentStep - 1);
	};

	const handleSubjectChange = (
		subject: string,
		level: string,
		checked: boolean
	) => {
		const updatedSubjects = [...formData.subjects];
		const existingIndex = updatedSubjects.findIndex(
			(s) => s.subject === subject && s.level === level
		);

		if (checked && existingIndex === -1) {
			updatedSubjects.push({ subject, level });
		} else if (!checked && existingIndex !== -1) {
			updatedSubjects.splice(existingIndex, 1);
		}

		setFormData({ ...formData, subjects: updatedSubjects });
	};

	const handlePermissionChange = (permission, checked) => {
		let updatedPermissions = [...formData.permissions];

		if (checked && !updatedPermissions.includes(permission)) {
			updatedPermissions.push(permission);
		} else if (!checked) {
			updatedPermissions = updatedPermissions.filter((p) => p !== permission);
		}

		setFormData({ ...formData, permissions: updatedPermissions });
	};

	const handleSubmit = async () => {
		// Create user object based on schema
		const baseUser = {
			role: userType,
			firstName: formData.firstName,
			middleName: formData.middleName || undefined,
			lastName: formData.lastName,
			gender: formData.gender,
			username: formData.username,
			password: formData.password,
			nickName: formData.nickName || undefined,
			dateOfBirth: formData.dateOfBirth,
			isActive: true,
			mustChangePassword: true,
			phone: formData.phone,
			email: formData.email || undefined,
			address: formData.address,
			bio: formData.bio || undefined,
			photo: formData.photo || undefined,
		};

		let userData;

		switch (userType) {
			case 'student':
				userData = {
					...baseUser,
					classId: formData.classId,
					status: 'enrolled',
					guardian: formData.guardian,
				};
				break;
			case 'teacher':
				userData = {
					...baseUser,
					subjects: formData.subjects,
					isSponsor: formData.isSponsor,
					sponsorClass: formData.sponsorClass,
				};
				break;
			case 'administrator':
				userData = {
					...baseUser,
					position: formData.position,
					permissions: formData.permissions,
				};
				break;
			default:
				userData = baseUser;
		}

		setIsValidating(true);

		try {
			const res = await fetch('/api/users', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(userData),
			});
			const result = await res.json();

			if (result.success) {
				if (onUserCreated) {
					onUserCreated(result.data.user);
				}
				resetForm();
				alert(result.message || 'User created successfully!');
			} else {
				setErrors(result.errors || {});
				alert(result.message || 'Failed to create user');
			}
		} catch (err) {
			alert('Network error: Unable to create user');
		} finally {
			setIsValidating(false);
		}
	};

	const resetForm = () => {
		setCurrentStep(1);
		setUserType('');
		setFormData({
			firstName: '',
			middleName: '',
			lastName: '',
			gender: '',
			username: '',
			password: '',
			nickName: '',
			dateOfBirth: '',
			phone: '',
			email: '',
			address: '',
			bio: '',
			photo: '',
			classId: '',
			guardian: {
				firstName: '',
				middleName: '',
				lastName: '',
				email: '',
				phone: '',
				address: '',
			},
			subjects: [],
			isSponsor: false,
			sponsorClass: null,
			position: '',
			permissions: [],
		});
		setErrors({});
	};

	const getTotalSteps = () => 4;

	return (
		<div className="w-full max-w-6xl mx-auto">
			{/* Header */}
			<div className="mb-8">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-4">
						{onBack && (
							<button
								onClick={onBack}
								className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
							>
								<ArrowLeft className="w-4 h-4" />
								Back
							</button>
						)}
						<h1 className="text-2xl font-semibold text-foreground">
							Create New User
						</h1>
					</div>
				</div>

				{/* Progress Bar */}
				<div className="bg-card rounded-lg border border-border p-6">
					<div className="flex items-center space-x-2">
						{Array.from({ length: getTotalSteps() }, (_, i) => (
							<div key={i} className="flex items-center">
								<div
									className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
										i + 1 <= currentStep
											? 'bg-primary text-primary-foreground'
											: 'bg-muted text-muted-foreground'
									}`}
								>
									{i + 1}
								</div>
								{i < getTotalSteps() - 1 && (
									<div
										className={`w-12 h-1 mx-2 transition-colors ${
											i + 1 < currentStep ? 'bg-primary' : 'bg-muted'
										}`}
									/>
								)}
							</div>
						))}
					</div>
					<div className="mt-2 text-sm text-muted-foreground">
						Step {currentStep} of {getTotalSteps()}
					</div>
				</div>
			</div>

			{/* Content Card */}
			<div className="bg-card rounded-lg border border-border">
				<div className="p-8">
					{/* Step 1: User Type Selection */}
					{currentStep === 1 && (
						<div className="space-y-6">
							<h3 className="text-lg font-medium text-foreground">
								Select User Type
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								{[
									{
										type: 'student',
										icon: User,
										label: 'Student',
										desc: 'Create a new student account',
									},
									{
										type: 'teacher',
										icon: Users,
										label: 'Teacher',
										desc: 'Create a new teacher account',
									},
									{
										type: 'administrator',
										icon: Shield,
										label: 'Administrator',
										desc: 'Create a new admin account',
									},
								].map(({ type, icon: Icon, label, desc }) => (
									<button
										key={type}
										onClick={() => setUserType(type)}
										className={`p-6 border-2 rounded-lg text-left transition-all ${
											userType === type
												? 'border-primary bg-primary/10'
												: 'border-border hover:bg-muted'
										}`}
									>
										<Icon
											className={`w-10 h-10 mb-3 ${
												userType === type
													? 'text-primary'
													: 'text-muted-foreground'
											}`}
										/>
										<h4 className="font-medium text-foreground mb-1">
											{label}
										</h4>
										<p className="text-sm text-muted-foreground">{desc}</p>
									</button>
								))}
							</div>
						</div>
					)}

					{/* Step 2: Personal Information */}
					{currentStep === 2 && (
						<div className="space-y-6">
							<h3 className="text-lg font-medium text-foreground">
								Personal Information
							</h3>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										First Name *
									</label>
									<input
										type="text"
										value={formData.firstName}
										onChange={(e) =>
											setFormData({ ...formData, firstName: e.target.value })
										}
										className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
											errors.firstName ? 'border-red-500' : 'border-border'
										}`}
										placeholder="Enter first name"
									/>
									{errors.firstName && (
										<p className="text-destructive text-sm mt-1">
											{errors.firstName}
										</p>
									)}
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Middle Name
									</label>
									<input
										type="text"
										value={formData.middleName}
										onChange={(e) =>
											setFormData({ ...formData, middleName: e.target.value })
										}
										className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
										placeholder="Enter middle name"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Last Name *
									</label>
									<input
										type="text"
										value={formData.lastName}
										onChange={(e) =>
											setFormData({ ...formData, lastName: e.target.value })
										}
										className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
											errors.lastName ? 'border-red-500' : 'border-border'
										}`}
										placeholder="Enter last name"
									/>
									{errors.lastName && (
										<p className="text-destructive text-sm mt-1">
											{errors.lastName}
										</p>
									)}
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Gender *
									</label>
									<select
										value={formData.gender}
										onChange={(e) =>
											setFormData({ ...formData, gender: e.target.value })
										}
										className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
											errors.gender ? 'border-red-500' : 'border-border'
										}`}
									>
										<option value="">Select gender</option>
										<option value="Male">Male</option>
										<option value="Female">Female</option>
										<option value="Other">Other</option>
									</select>
									{errors.gender && (
										<p className="text-destructive text-sm mt-1">
											{errors.gender}
										</p>
									)}
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Date of Birth *
									</label>
									<input
										type="date"
										value={formData.dateOfBirth}
										onChange={(e) =>
											setFormData({ ...formData, dateOfBirth: e.target.value })
										}
										className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
											errors.dateOfBirth ? 'border-red-500' : 'border-border'
										}`}
									/>
									{errors.dateOfBirth && (
										<p className="text-destructive text-sm mt-1">
											{errors.dateOfBirth}
										</p>
									)}
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Phone Number *
									</label>
									<input
										type="tel"
										value={formData.phone}
										onChange={(e) =>
											setFormData({ ...formData, phone: e.target.value })
										}
										className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
											errors.phone ? 'border-red-500' : 'border-border'
										}`}
										placeholder="Enter phone number"
									/>
									{errors.phone && (
										<p className="text-destructive text-sm mt-1">
											{errors.phone}
										</p>
									)}
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Email
									</label>
									<input
										type="email"
										value={formData.email}
										onChange={(e) =>
											setFormData({ ...formData, email: e.target.value })
										}
										className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
											errors.email ? 'border-red-500' : 'border-border'
										}`}
										placeholder="Enter email address"
									/>
									{errors.email && (
										<p className="text-destructive text-sm mt-1">
											{errors.email}
										</p>
									)}
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Nickname
									</label>
									<input
										type="text"
										value={formData.nickName}
										onChange={(e) =>
											setFormData({ ...formData, nickName: e.target.value })
										}
										className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
										placeholder="Enter nickname (optional)"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Address *
									</label>
									<textarea
										value={formData.address}
										onChange={(e) =>
											setFormData({ ...formData, address: e.target.value })
										}
										className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
											errors.address ? 'border-red-500' : 'border-border'
										}`}
										rows="3"
										placeholder="Enter full address"
									/>
									{errors.address && (
										<p className="text-destructive text-sm mt-1">
											{errors.address}
										</p>
									)}
								</div>

								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Bio
									</label>
									<textarea
										value={formData.bio}
										onChange={(e) =>
											setFormData({ ...formData, bio: e.target.value })
										}
										className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
										rows="3"
										placeholder="Enter a brief bio (optional)"
									/>
								</div>
							</div>
						</div>
					)}

					{/* Step 3: Role-specific Information */}
					{currentStep === 3 && (
						<div className="space-y-6">
							<h3 className="text-lg font-medium text-foreground">
								{userType === 'student' && 'Student Information'}
								{userType === 'teacher' && 'Teaching Information'}
								{userType === 'administrator' && 'Administrative Information'}
							</h3>

							{/* Student specific fields */}
							{userType === 'student' && (
								<>
									<div>
										<label className="block text-sm font-medium text-foreground mb-2">
											Class Assignment *
										</label>
										<select
											value={formData.classId}
											onChange={(e) =>
												setFormData({ ...formData, classId: e.target.value })
											}
											className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
												errors.classId ? 'border-red-500' : 'border-border'
											}`}
										>
											<option value="">Select a class</option>
											{classIds.map((cls) => (
												<option key={cls.id} value={cls.id}>
													{cls.name} ({cls.level})
												</option>
											))}
										</select>
										{errors.classId && (
											<p className="text-destructive text-sm mt-1">
												{errors.classId}
											</p>
										)}
									</div>

									<div className="border-t pt-6">
										<h4 className="text-md font-medium text-foreground mb-4">
											Guardian Information
										</h4>

										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<div>
												<label className="block text-sm font-medium text-foreground mb-2">
													Guardian First Name *
												</label>
												<input
													type="text"
													value={formData.guardian.firstName}
													onChange={(e) =>
														setFormData({
															...formData,
															guardian: {
																...formData.guardian,
																firstName: e.target.value,
															},
														})
													}
													className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
														errors.guardianFirstName
															? 'border-red-500'
															: 'border-border'
													}`}
													placeholder="Guardian first name"
												/>
												{errors.guardianFirstName && (
													<p className="text-destructive text-sm mt-1">
														{errors.guardianFirstName}
													</p>
												)}
											</div>

											<div>
												<label className="block text-sm font-medium text-foreground mb-2">
													Guardian Middle Name
												</label>
												<input
													type="text"
													value={formData.guardian.middleName}
													onChange={(e) =>
														setFormData({
															...formData,
															guardian: {
																...formData.guardian,
																middleName: e.target.value,
															},
														})
													}
													className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
													placeholder="Guardian middle name"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-foreground mb-2">
													Guardian Last Name *
												</label>
												<input
													type="text"
													value={formData.guardian.lastName}
													onChange={(e) =>
														setFormData({
															...formData,
															guardian: {
																...formData.guardian,
																lastName: e.target.value,
															},
														})
													}
													className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
														errors.guardianLastName
															? 'border-red-500'
															: 'border-border'
													}`}
													placeholder="Guardian last name"
												/>
												{errors.guardianLastName && (
													<p className="text-destructive text-sm mt-1">
														{errors.guardianLastName}
													</p>
												)}
											</div>
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
											<div>
												<label className="block text-sm font-medium text-foreground mb-2">
													Guardian Phone *
												</label>
												<input
													type="tel"
													value={formData.guardian.phone}
													onChange={(e) =>
														setFormData({
															...formData,
															guardian: {
																...formData.guardian,
																phone: e.target.value,
															},
														})
													}
													className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
														errors.guardianPhone
															? 'border-red-500'
															: 'border-border'
													}`}
													placeholder="Guardian phone number"
												/>
												{errors.guardianPhone && (
													<p className="text-destructive text-sm mt-1">
														{errors.guardianPhone}
													</p>
												)}
											</div>

											<div>
												<label className="block text-sm font-medium text-foreground mb-2">
													Guardian Email
												</label>
												<input
													type="email"
													value={formData.guardian.email}
													onChange={(e) =>
														setFormData({
															...formData,
															guardian: {
																...formData.guardian,
																email: e.target.value,
															},
														})
													}
													className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
													placeholder="Guardian email address"
												/>
											</div>
										</div>

										<div className="mt-4">
											<label className="block text-sm font-medium text-foreground mb-2">
												Guardian Address *
											</label>
											<textarea
												value={formData.guardian.address}
												onChange={(e) =>
													setFormData({
														...formData,
														guardian: {
															...formData.guardian,
															address: e.target.value,
														},
													})
												}
												className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
													errors.guardianAddress
														? 'border-red-500'
														: 'border-border'
												}`}
												rows="3"
												placeholder="Guardian full address"
											/>
											{errors.guardianAddress && (
												<p className="text-destructive text-sm mt-1">
													{errors.guardianAddress}
												</p>
											)}
										</div>
									</div>
								</>
							)}

							{/* Teacher specific fields */}
							{userType === 'teacher' && (
								<>
									{/* Self Contained Class Selection */}
									<div className="border border-border rounded-lg p-4 bg-background">
										<h4 className="font-medium text-foreground mb-3">
											Self-Contained Class Teacher
										</h4>
										<p className="text-sm text-muted-foreground mb-4">
											Self-contained teachers teach all subjects to one class
											and are automatically sponsors of that class.
										</p>

										<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
											{getSelfContainedClasses().map((cls) => (
												<label
													key={cls.id}
													className="flex items-center p-2 border border-border rounded hover:bg-muted cursor-pointer"
												>
													<input
														type="radio"
														name="selfContainedClass"
														checked={formData.sponsorClass === cls.id}
														onChange={(e) => {
															if (e.target.checked) {
																handleSelfContainedSelection(cls.id, true);
															}
														}}
														className="mr-2 accent-primary"
													/>
													<span className="text-sm text-foreground">
														{cls.name}
													</span>
												</label>
											))}
										</div>

										{formData.sponsorClass && (
											<button
												type="button"
												onClick={() =>
													handleSelfContainedSelection(null, false)
												}
												className="mt-3 text-sm text-muted-foreground hover:text-foreground underline"
											>
												Clear self-contained selection
											</button>
										)}
									</div>

									{/* Subject Level Teaching */}
									{!formData.sponsorClass && (
										<div>
											<label className="block text-sm font-medium text-foreground mb-3">
												Subject & Level Teaching *
											</label>
											<p className="text-sm text-muted-foreground mb-4">
												Select subjects and education levels you will teach.
											</p>

											<div className="space-y-4 max-h-96 overflow-y-auto border border-border rounded-lg p-4 bg-background">
												{classLevels
													.filter((level) => level !== 'Self Contained')
													.map((level) => (
														<div
															key={level}
															className="border-b border-border pb-4 last:border-b-0"
														>
															<h5 className="font-medium text-foreground mb-3">
																{level}
															</h5>
															<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
																{subjectsByLevel[level]?.map((subject) => (
																	<label
																		key={`${subject}-${level}`}
																		className="flex items-center text-sm"
																	>
																		<input
																			type="checkbox"
																			checked={formData.subjects.some(
																				(s) =>
																					s.subject === subject &&
																					s.level === level
																			)}
																			onChange={(e) =>
																				handleSubjectChange(
																					subject,
																					level,
																					e.target.checked
																				)
																			}
																			className="mr-2 accent-primary"
																		/>
																		<span className="text-foreground">
																			{subject}
																		</span>
																	</label>
																))}
															</div>
														</div>
													))}
											</div>
											{errors.subjects && (
												<p className="text-destructive text-sm mt-1">
													{errors.subjects}
												</p>
											)}
										</div>
									)}

									{/* Class Sponsorship for non-self-contained */}
									{!formData.sponsorClass && (
										<div>
											<label className="block text-sm font-medium text-foreground mb-2">
												Class Sponsorship (Optional)
											</label>
											<select
												value={formData.sponsorClass || ''}
												onChange={(e) =>
													setFormData({
														...formData,
														sponsorClass: e.target.value || null,
														isSponsor: !!e.target.value,
													})
												}
												className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
											>
												<option value="">No class sponsorship</option>
												{classIds
													.filter((cls) => cls.level !== 'Self Contained')
													.map((cls) => (
														<option key={cls.id} value={cls.id}>
															{cls.name} ({cls.level})
														</option>
													))}
											</select>
										</div>
									)}

									{/* Display selected subjects summary */}
									{formData.subjects.length > 0 && (
										<div className="bg-muted border border-border rounded-lg p-4">
											<h5 className="font-medium text-foreground mb-2">
												Teaching Summary
											</h5>
											<div className="space-y-2">
												{formData.sponsorClass && (
													<p className="text-sm text-foreground">
														<span className="font-medium">
															Self-Contained Class:
														</span>{' '}
														{
															classIds.find(
																(c) => c.id === formData.sponsorClass
															)?.name
														}
													</p>
												)}
												<p className="text-sm text-foreground">
													<span className="font-medium">Total Subjects:</span>{' '}
													{formData.subjects.length}
												</p>
												{formData.isSponsor && (
													<p className="text-sm text-foreground">
														<span className="font-medium">Class Sponsor:</span>{' '}
														Yes
													</p>
												)}
											</div>
										</div>
									)}
								</>
							)}

							{/* Administrator specific fields */}
							{userType === 'administrator' && (
								<>
									<div>
										<label className="block text-sm font-medium text-foreground mb-2">
											Position *
										</label>
										<select
											value={formData.position}
											onChange={(e) =>
												setFormData({ ...formData, position: e.target.value })
											}
											className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
												errors.position ? 'border-red-500' : 'border-border'
											}`}
										>
											<option value="">Select position</option>
											{adminPositions.map((position) => (
												<option key={position} value={position}>
													{position}
												</option>
											))}
										</select>
										{errors.position && (
											<p className="text-destructive text-sm mt-1">
												{errors.position}
											</p>
										)}
									</div>

									<div>
										<label className="block text-sm font-medium text-foreground mb-3">
											System Permissions *
										</label>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-border rounded-lg p-4 bg-background">
											{adminPermissions.map((permission) => (
												<label key={permission} className="flex items-center">
													<input
														type="checkbox"
														checked={formData.permissions.includes(permission)}
														onChange={(e) =>
															handlePermissionChange(
																permission,
																e.target.checked
															)
														}
														className="mr-3 accent-primary"
													/>
													<span className="text-sm text-foreground capitalize">
														{permission.replace(/_/g, ' ')}
													</span>
												</label>
											))}
										</div>
										{errors.permissions && (
											<p className="text-destructive text-sm mt-1">
												{errors.permissions}
											</p>
										)}
									</div>
								</>
							)}
						</div>
					)}

					{/* Step 4: Account Credentials */}
					{currentStep === 4 && (
						<div className="space-y-6">
							<h3 className="text-lg font-medium text-foreground">
								Account Credentials
							</h3>

							<div>
								<label className="block text-sm font-medium text-foreground mb-2">
									Username *
								</label>
								<div className="flex gap-2">
									<input
										type="text"
										value={formData.username}
										onChange={(e) =>
											setFormData({ ...formData, username: e.target.value })
										}
										className={`flex-1 p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
											errors.username ? 'border-red-500' : 'border-border'
										}`}
										placeholder="Enter username"
									/>
									<button
										type="button"
										onClick={() =>
											setFormData({ ...formData, username: generateUsername() })
										}
										className="px-4 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-2"
									>
										<RefreshCw className="w-4 h-4" />
										Generate
									</button>
								</div>
								{errors.username && (
									<p className="text-destructive text-sm mt-1">
										{errors.username}
									</p>
								)}
							</div>

							<div>
								<label className="block text-sm font-medium text-foreground mb-2">
									Password *
								</label>
								<div className="flex gap-2">
									<div className="flex-1 relative">
										<input
											type={showPassword ? 'text' : 'password'}
											value={formData.password}
											onChange={(e) =>
												setFormData({ ...formData, password: e.target.value })
											}
											className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-10 ${
												errors.password ? 'border-red-500' : 'border-border'
											}`}
											placeholder="Enter password"
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
										>
											{showPassword ? (
												<EyeOff className="w-5 h-5" />
											) : (
												<Eye className="w-5 h-5" />
											)}
										</button>
									</div>
									<button
										type="button"
										onClick={() =>
											setFormData({ ...formData, password: generatePassword() })
										}
										className="px-4 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-2"
									>
										<RefreshCw className="w-4 h-4" />
										Generate
									</button>
								</div>
								{errors.password && (
									<p className="text-destructive text-sm mt-1">
										{errors.password}
									</p>
								)}
								<p className="text-sm text-muted-foreground mt-1">
									User will be required to change password on first login
								</p>
							</div>

							{/* Summary Section */}
							<div className="border-t pt-6">
								<h4 className="text-md font-medium text-foreground mb-4">
									Account Summary
								</h4>
								<div className="bg-muted rounded-lg p-4 space-y-3">
									<div className="flex justify-between">
										<span className="text-sm text-muted-foreground">
											User Type:
										</span>
										<span className="text-sm font-medium text-foreground capitalize">
											{userType}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-muted-foreground">
											Full Name:
										</span>
										<span className="text-sm font-medium text-foreground">
											{formData.firstName} {formData.middleName}{' '}
											{formData.lastName}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-muted-foreground">
											Gender:
										</span>
										<span className="text-sm font-medium text-foreground">
											{formData.gender}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-muted-foreground">
											Username:
										</span>
										<span className="text-sm font-medium text-foreground">
											{formData.username}
										</span>
									</div>
									{userType === 'student' && formData.classId && (
										<div className="flex justify-between">
											<span className="text-sm text-muted-foreground">
												Class:
											</span>
											<span className="text-sm font-medium text-foreground">
												{classIds.find((c) => c.id === formData.classId)?.name}
											</span>
										</div>
									)}
									{userType === 'teacher' && (
										<>
											{formData.sponsorClass && (
												<div className="flex justify-between">
													<span className="text-sm text-muted-foreground">
														Teaching Type:
													</span>
													<span className="text-sm font-medium text-foreground">
														Self-Contained
													</span>
												</div>
											)}
											<div className="flex justify-between">
												<span className="text-sm text-muted-foreground">
													Subjects:
												</span>
												<span className="text-sm font-medium text-foreground">
													{formData.subjects.length} subject(s) assigned
												</span>
											</div>
											{formData.isSponsor && (
												<div className="flex justify-between">
													<span className="text-sm text-muted-foreground">
														Class Sponsor:
													</span>
													<span className="text-sm font-medium text-foreground">
														{classIds.find(
															(c) => c.id === formData.sponsorClass
														)?.name || 'Yes'}
													</span>
												</div>
											)}
										</>
									)}
									{userType === 'administrator' && formData.position && (
										<>
											<div className="flex justify-between">
												<span className="text-sm text-muted-foreground">
													Position:
												</span>
												<span className="text-sm font-medium text-foreground">
													{formData.position}
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-sm text-muted-foreground">
													Permissions:
												</span>
												<span className="text-sm font-medium text-foreground">
													{formData.permissions.length} permission(s) granted
												</span>
											</div>
										</>
									)}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="px-8 py-6 border-t border-border bg-muted flex justify-between">
					<button
						onClick={currentStep === 1 ? onBack || (() => {}) : handlePrevious}
						className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
						disabled={isValidating}
					>
						<ChevronLeft className="w-4 h-4" />
						{currentStep === 1 ? 'Back' : 'Previous'}
					</button>

					{currentStep < getTotalSteps() ? (
						<button
							onClick={handleNext}
							disabled={isValidating || (currentStep === 1 && !userType)}
							className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isValidating ? 'Validating...' : 'Next'}
							<ChevronRight className="w-4 h-4" />
						</button>
					) : (
						<button
							onClick={handleSubmit}
							disabled={isValidating}
							className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isValidating ? 'Creating...' : 'Create User'}
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default DashboardUserForm;
