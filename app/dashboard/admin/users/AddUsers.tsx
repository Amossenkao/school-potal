'use client';
import React, { useState } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	User,
	Users,
	Shield,
	ArrowLeft,
	CheckCircle,
	Copy,
	XCircle,
} from 'lucide-react';

const DashboardUserForm = ({ onUserCreated, onBack }: any) => {
	const [currentStep, setCurrentStep] = useState(1);
	const [userType, setUserType] = useState('');
	const [errors, setErrors] = useState({});
	const [isValidating, setIsValidating] = useState(false);
	const [createdUserInfo, setCreatedUserInfo] = useState(null);
	const [showErrorModal, setShowErrorModal] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const school = useSchoolStore((state) => state.school);

	const [formData, setFormData] = useState({
		firstName: '',
		middleName: '',
		lastName: '',
		gender: '',
		nickName: '',
		dateOfBirth: '',
		phone: '',
		email: '',
		address: '',
		bio: '',
		photo: '',
		student: {
			session: '',
			classId: '',
			guardian: {
				firstName: '',
				middleName: '',
				lastName: '',
				email: '',
				phone: '',
				address: '',
			},
		},
		teacher: {
			subjects: [],
			isSponsor: false,
			sponsorClass: null,
		},
		administrator: {
			position: '',
			permissions: [],
		},
	});

	const [expandedAccordions, setExpandedAccordions] = useState({
		guardian: true,
		class: false,
		teacherSessions: {},
	});

	const toggleAccordion = (name) => {
		setExpandedAccordions((prev) => ({
			...prev,
			[name]: !prev[name],
		}));
	};

	const getSessions = () => {
		if (!school?.classLevels) return [];
		return Object.keys(school.classLevels);
	};

	const getClassLevels = (session) => {
		if (!school?.classLevels?.[session]) return [];
		return Object.keys(school.classLevels[session]);
	};

	const getClassesBySessionAndLevel = (session, level) => {
		if (!school?.classLevels?.[session]?.[level]?.classes) return [];
		return school.classLevels[session][level].classes;
	};

	const getAllClassesForSession = (session: any) => {
		if (!school?.classLevels?.[session]) return [];
		const allClasses = [];
		Object.keys(school.classLevels[session]).forEach((level) => {
			const classes = school.classLevels[session][level].classes || [];
			classes.forEach((cls) => {
				allClasses.push({
					...cls,
					level: level,
					session: session,
				});
			});
		});
		return allClasses;
	};

	const getSubjectsBySessionAndLevel = (session, level) => {
		if (!school?.classLevels?.[session]?.[level]?.subjects) return [];
		return school.classLevels[session][level].subjects;
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

	const existingUsers = [
		{ email: 'john@school.edu' },
		{ email: 'jane@school.edu' },
	];

	const getSelfContainedClasses = (session) => {
		if (!session) return [];
		return getClassesBySessionAndLevel(session, 'Self Contained');
	};

	const handleSelfContainedSelection = (classId, session, checked) => {
		const updatedSubjects = checked
			? getSubjectsBySessionAndLevel(session, 'Self Contained').map(
					(subject) => ({
						subject,
						level: 'Self Contained',
						session: session,
					})
			  )
			: [];
		const updatedSponsorClass = checked ? classId : null;
		setFormData({
			...formData,
			teacher: {
				...formData.teacher,
				subjects: updatedSubjects,
				isSponsor: checked,
				sponsorClass: updatedSponsorClass,
			},
		});
	};

	const validateStep = async (step) => {
		setIsValidating(true);
		const newErrors = {};

		switch (step) {
			case 2:
				if (!formData.firstName.trim())
					newErrors['firstName'] = 'First name is required';
				if (!formData.lastName.trim())
					newErrors.lastName = 'Last name is required';
				if (!formData.gender) newErrors.gender = 'Gender is required';
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

			case 3:
				if (userType === 'student') {
					if (!formData.student.guardian.firstName.trim())
						newErrors.guardianFirstName = 'Guardian first name is required';
					if (!formData.student.guardian.lastName.trim())
						newErrors.guardianLastName = 'Guardian last name is required';
					if (!formData.student.guardian.phone.trim())
						newErrors.guardianPhone = 'Guardian phone is required';
					if (!formData.student.guardian.address.trim())
						newErrors.guardianAddress = 'Guardian address is required';
					if (!formData.student.session) {
						newErrors.session = 'Session selection is required';
					} else if (!formData.student.classId) {
						newErrors.classId = 'Class selection is required';
					}
				} else if (userType === 'teacher') {
					if (formData.teacher.subjects.length === 0) {
						newErrors.subjects = 'At least one subject must be selected';
					}
				} else if (userType === 'administrator') {
					if (!formData.administrator.position)
						newErrors.position = 'Position is required';
					if (formData.administrator.permissions.length === 0)
						newErrors.permissions = 'At least one permission must be selected';
				}
				break;
			case 4:
				// No validation for review step, just confirmation
				break;
		}

		setErrors(newErrors);
		setIsValidating(false);
		return Object.keys(newErrors).length === 0;
	};

	const handleNext = async () => {
		if (currentStep === 4) {
			await handleSubmit();
		} else if (await validateStep(currentStep)) {
			setCurrentStep(currentStep + 1);
		} else {
			setErrorMessage('Please correct the errors before proceeding.');
			setShowErrorModal(true);
		}
	};

	const handlePrevious = () => {
		setCurrentStep(currentStep - 1);
	};

	const handleSubjectChange = (subject, level, session, checked) => {
		let updatedSubjects = [...formData.teacher.subjects];
		if (checked) {
			updatedSubjects.push({ subject, level, session });
		} else {
			updatedSubjects = updatedSubjects.filter(
				(s) =>
					!(s.subject === subject && s.level === level && s.session === session)
			);
		}
		setFormData({
			...formData,
			teacher: { ...formData.teacher, subjects: updatedSubjects },
		});
	};

	const handlePermissionChange = (permission, checked) => {
		let updatedPermissions = [...formData.administrator.permissions];
		if (checked && !updatedPermissions.includes(permission)) {
			updatedPermissions.push(permission);
		} else if (!checked) {
			updatedPermissions = updatedPermissions.filter((p) => p !== permission);
		}
		setFormData({
			...formData,
			administrator: {
				...formData.administrator,
				permissions: updatedPermissions,
			},
		});
	};

	const handleSessionSelection = (session) => {
		setFormData({
			...formData,
			student: { ...formData.student, session: session, classId: '' },
		});
		setExpandedAccordions({
			guardian: expandedAccordions.guardian,
			class: true,
			teacherSessions: {},
		});
	};

	const handleSubmit = async () => {
		setIsValidating(true);
		const baseUser = {
			role: userType,
			firstName: formData.firstName,
			middleName: formData.middleName || undefined,
			lastName: formData.lastName,
			gender: formData.gender,
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
				const selectedClass = getAllClassesForSession(
					formData.student.session
				).find((c) => c.classId === formData.student.classId);
				userData = {
					...baseUser,
					session: formData.student.session,
					classId: formData.student.classId,
					className: selectedClass?.name,
					classLevel: selectedClass?.level,
					guardian: formData.student.guardian,
				};
				break;
			case 'teacher':
				userData = {
					...baseUser,
					subjects: formData.teacher.subjects,
					isSponsor: formData.teacher.isSponsor,
					sponsorClass: formData.teacher.sponsorClass,
				};
				break;
			case 'administrator':
				userData = {
					...baseUser,
					position: formData.administrator.position,
					permissions: formData.administrator.permissions,
				};
				break;
			default:
				userData = baseUser;
		}

		try {
			const res = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(userData),
			});
			const result = await res.json();

			if (result.success) {
				setCreatedUserInfo(result.data.user);
				if (onUserCreated) onUserCreated(result.data.user);
				setCurrentStep(5);
			} else {
				setErrorMessage(result.message || 'Failed to create user');
				setShowErrorModal(true);
			}
		} catch (err) {
			setErrorMessage('Network error: Unable to create user');
			setShowErrorModal(true);
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
			nickName: '',
			dateOfBirth: '',
			phone: '',
			email: '',
			address: '',
			bio: '',
			photo: '',
			student: {
				session: '',
				classId: '',
				guardian: {
					firstName: '',
					middleName: '',
					lastName: '',
					email: '',
					phone: '',
					address: '',
				},
			},
			teacher: {
				subjects: [],
				isSponsor: false,
				sponsorClass: null,
			},
			administrator: {
				position: '',
				permissions: [],
			},
		});
		setErrors({});
		setCreatedUserInfo(null);
		setExpandedAccordions({
			guardian: true,
			class: false,
			teacherSessions: {},
		});
	};

	const getTotalSteps = () => 4;

	const handleCopyCredentials = () => {
		if (createdUserInfo?.generatedCredentials) {
			const creds = `Username: ${createdUserInfo.generatedCredentials.username}\nPassword: ${createdUserInfo.generatedCredentials.defaultPassword}`;
			navigator.clipboard.writeText(creds).then(() => {
				alert('Credentials copied to clipboard!');
			});
		}
	};

	return (
		<div className="w-full max-w-6xl mx-auto">
			{/* Header */}
			{currentStep < 5 && (
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
								Create New User - {school?.name}
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
			)}

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
									{/* Guardian Information Accordion */}
									<div className="border border-border rounded-lg">
										<button
											type="button"
											onClick={() => toggleAccordion('guardian')}
											className="flex justify-between items-center w-full p-4 font-medium text-left text-foreground bg-muted hover:bg-muted/80"
										>
											<span>Guardian Information *</span>
											<ChevronDown
												className={`w-5 h-5 transition-transform ${
													expandedAccordions.guardian ? 'rotate-180' : ''
												}`}
											/>
										</button>
										{expandedAccordions.guardian && (
											<div className="p-4 space-y-4">
												<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
													<div>
														<label className="block text-sm font-medium text-foreground mb-2">
															Guardian First Name *
														</label>
														<input
															type="text"
															value={formData.student.guardian.firstName}
															onChange={(e) =>
																setFormData({
																	...formData,
																	student: {
																		...formData.student,
																		guardian: {
																			...formData.student.guardian,
																			firstName: e.target.value,
																		},
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
															value={formData.student.guardian.middleName}
															onChange={(e) =>
																setFormData({
																	...formData,
																	student: {
																		...formData.student,
																		guardian: {
																			...formData.student.guardian,
																			middleName: e.target.value,
																		},
																	},
																})
															}
															className="w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary border-border"
															placeholder="Guardian middle name"
														/>
													</div>
													<div>
														<label className="block text-sm font-medium text-foreground mb-2">
															Guardian Last Name *
														</label>
														<input
															type="text"
															value={formData.student.guardian.lastName}
															onChange={(e) =>
																setFormData({
																	...formData,
																	student: {
																		...formData.student,
																		guardian: {
																			...formData.student.guardian,
																			lastName: e.target.value,
																		},
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
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div>
														<label className="block text-sm font-medium text-foreground mb-2">
															Guardian Phone *
														</label>
														<input
															type="tel"
															value={formData.student.guardian.phone}
															onChange={(e) =>
																setFormData({
																	...formData,
																	student: {
																		...formData.student,
																		guardian: {
																			...formData.student.guardian,
																			phone: e.target.value,
																		},
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
															value={formData.student.guardian.email}
															onChange={(e) =>
																setFormData({
																	...formData,
																	student: {
																		...formData.student,
																		guardian: {
																			...formData.student.guardian,
																			email: e.target.value,
																		},
																	},
																})
															}
															className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
															placeholder="Guardian email address"
														/>
													</div>
												</div>
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">
														Guardian Address *
													</label>
													<textarea
														value={formData.student.guardian.address}
														onChange={(e) =>
															setFormData({
																...formData,
																student: {
																	...formData.student,
																	guardian: {
																		...formData.student.guardian,
																		address: e.target.value,
																	},
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
										)}
									</div>
									{/* Class Assignment Accordion */}
									<div className="border border-border rounded-lg">
										<button
											type="button"
											onClick={() => toggleAccordion('class')}
											className="flex justify-between items-center w-full p-4 font-medium text-left text-foreground bg-muted hover:bg-muted/80"
										>
											<span>Class Assignment *</span>
											<ChevronDown
												className={`w-5 h-5 transition-transform ${
													expandedAccordions.class ? 'rotate-180' : ''
												}`}
											/>
										</button>
										{expandedAccordions.class && (
											<div className="p-4 space-y-4">
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">
														Session *
													</label>
													<div className="flex gap-4">
														{getSessions().map((session) => (
															<label
																key={session}
																className="flex items-center"
															>
																<input
																	type="radio"
																	name="session"
																	value={session}
																	checked={formData.student.session === session}
																	onChange={(e) =>
																		handleSessionSelection(e.target.value)
																	}
																	className="mr-2 accent-primary"
																/>
																<span className="text-foreground">
																	{session}
																</span>
															</label>
														))}
													</div>
													{errors.session && (
														<p className="text-destructive text-sm mt-1">
															{errors.session}
														</p>
													)}
												</div>
												{formData.student.session && (
													<div>
														<label className="block text-sm font-medium text-foreground mb-2">
															Select Class
														</label>
														{getClassLevels(formData.student.session).map(
															(level) => (
																<div key={level} className="mb-4">
																	<h4 className="text-md font-medium text-foreground mb-2">
																		{level}
																	</h4>
																	<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
																		{getClassesBySessionAndLevel(
																			formData.student.session,
																			level
																		).map((cls) => (
																			<label
																				key={cls.classId}
																				className="flex items-center"
																			>
																				<input
																					type="radio"
																					name="studentClass"
																					value={cls.classId}
																					checked={
																						formData.student.classId ===
																						cls.classId
																					}
																					onChange={(e) =>
																						setFormData({
																							...formData,
																							student: {
																								...formData.student,
																								classId: e.target.value,
																							},
																						})
																					}
																					className="mr-2 accent-primary"
																				/>
																				<span className="text-sm text-foreground">
																					{cls.name}
																				</span>
																			</label>
																		))}
																	</div>
																</div>
															)
														)}
														{errors.classId && (
															<p className="text-destructive text-sm mt-1">
																{errors.classId}
															</p>
														)}
													</div>
												)}
											</div>
										)}
									</div>
								</>
							)}

							{/* Teacher specific fields */}
							{userType === 'teacher' && (
								<div className="space-y-4">
									<h4 className="text-lg font-medium text-foreground">
										Assign Subjects and Sponsorship
									</h4>
									{getSessions().map((session) => (
										<div
											key={session}
											className="border border-border rounded-lg"
										>
											<button
												type="button"
												onClick={() =>
													setExpandedAccordions((prev) => ({
														...prev,
														teacherSessions: {
															...prev.teacherSessions,
															[session]: !prev.teacherSessions[session],
														},
													}))
												}
												className="flex justify-between items-center w-full p-4 font-medium text-left text-foreground bg-muted hover:bg-muted/80"
											>
												<span>{session} Session</span>
												<ChevronDown
													className={`w-5 h-5 transition-transform ${
														expandedAccordions.teacherSessions[session]
															? 'rotate-180'
															: ''
													}`}
												/>
											</button>
											{expandedAccordions.teacherSessions[session] && (
												<div className="p-4 space-y-4">
													{/* Self Contained Class Selection */}
													{getSelfContainedClasses(session).length > 0 && (
														<div className="mb-4">
															<p className="text-sm text-muted-foreground mb-2">
																Self-Contained Class Teacher (
																<span className="italic">
																	teaches all subjects
																</span>
																)
															</p>
															<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
																{getSelfContainedClasses(session).map((cls) => (
																	<label
																		key={cls.classId}
																		className="flex items-center p-2 border border-border rounded hover:bg-muted cursor-pointer"
																	>
																		<input
																			type="radio"
																			name={`selfContainedClass-${session}`}
																			checked={
																				formData.teacher.isSponsor &&
																				formData.teacher.sponsorClass ===
																					cls.classId
																			}
																			onChange={(e) =>
																				handleSelfContainedSelection(
																					cls.classId,
																					session,
																					e.target.checked
																				)
																			}
																			className="mr-2 accent-primary"
																		/>
																		<span className="text-sm text-foreground">
																			{cls.name}
																		</span>
																	</label>
																))}
															</div>
														</div>
													)}

													{/* Subject Level Teaching */}
													<div className="space-y-4">
														<label className="block text-sm font-medium text-foreground">
															Subject & Level Teaching
														</label>
														<p className="text-sm text-muted-foreground mb-4">
															Select subjects and education levels you will
															teach in the {session} session.
														</p>
														<div className="space-y-4 max-h-96 overflow-y-auto border border-border rounded-lg p-4 bg-background">
															{getClassLevels(session)
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
																			{getSubjectsBySessionAndLevel(
																				session,
																				level
																			)?.map((subject) => (
																				<label
																					key={`${subject}-${level}-${session}`}
																					className="flex items-center text-sm"
																				>
																					<input
																						type="checkbox"
																						checked={formData.teacher.subjects.some(
																							(s) =>
																								s.subject === subject &&
																								s.level === level &&
																								s.session === session
																						)}
																						onChange={(e) =>
																							handleSubjectChange(
																								subject,
																								level,
																								session,
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
													</div>

													{/* Class Sponsorship for non-self-contained */}
													<div className="mt-4">
														<label className="block text-sm font-medium text-foreground mb-2">
															Class Sponsorship (Optional)
														</label>
														<select
															value={
																formData.teacher.sponsorClass &&
																getAllClassesForSession(session).find(
																	(cls) =>
																		cls.classId ===
																		formData.teacher.sponsorClass
																)
																	? formData.teacher.sponsorClass
																	: ''
															}
															onChange={(e) =>
																setFormData({
																	...formData,
																	teacher: {
																		...formData.teacher,
																		sponsorClass: e.target.value || null,
																		isSponsor: !!e.target.value,
																	},
																})
															}
															className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
														>
															<option value="">No class sponsorship</option>
															{getAllClassesForSession(session)
																.filter((cls) => cls.level !== 'Self Contained')
																.map((cls) => (
																	<option key={cls.classId} value={cls.classId}>
																		{cls.name} ({cls.level})
																	</option>
																))}
														</select>
													</div>
												</div>
											)}
										</div>
									))}
									{errors.subjects && (
										<p className="text-destructive text-sm mt-1">
											{errors.subjects}
										</p>
									)}

									{formData.teacher.subjects.length > 0 && (
										<div className="bg-muted border border-border rounded-lg p-4 mt-6">
											<h5 className="font-medium text-foreground mb-2">
												Teaching Summary
											</h5>
											<div className="space-y-2">
												<p className="text-sm text-foreground">
													<span className="font-medium">Total Subjects:</span>{' '}
													{formData.teacher.subjects.length}
												</p>
												<p className="text-sm text-foreground">
													<span className="font-medium">Sessions:</span>{' '}
													{Array.from(
														new Set(
															formData.teacher.subjects.map((s) => s.session)
														)
													).join(', ')}
												</p>
												{formData.teacher.isSponsor && (
													<p className="text-sm text-foreground">
														<span className="font-medium">Class Sponsor:</span>{' '}
														{
															getAllClassesForSession(
																formData.teacher.subjects[0]?.session
															).find(
																(c) =>
																	c.classId === formData.teacher.sponsorClass
															)?.name
														}
													</p>
												)}
											</div>
										</div>
									)}
								</div>
							)}

							{/* Administrator specific fields */}
							{userType === 'administrator' && (
								<>
									<div>
										<label className="block text-sm font-medium text-foreground mb-2">
											Position *
										</label>
										<select
											value={formData.administrator.position}
											onChange={(e) =>
												setFormData({
													...formData,
													administrator: {
														...formData.administrator,
														position: e.target.value,
													},
												})
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
														checked={formData.administrator.permissions.includes(
															permission
														)}
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

					{/* Step 4: Review & Submit */}
					{currentStep === 4 && (
						<div className="space-y-6">
							<h3 className="text-lg font-medium text-foreground">
								Review & Submit
							</h3>
							<p className="text-sm text-muted-foreground">
								Please review the information below. The username and a
								temporary password will be generated automatically upon
								creation.
							</p>

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
										<span className="text-sm font-medium text-foreground">{`${
											formData.firstName
										} ${formData.middleName || ''} ${formData.lastName}`}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-muted-foreground">
											Gender:
										</span>
										<span className="text-sm font-medium text-foreground">
											{formData.gender}
										</span>
									</div>
									{userType === 'student' && (
										<>
											<div className="flex justify-between">
												<span className="text-sm text-muted-foreground">
													Session:
												</span>
												<span className="text-sm font-medium text-foreground">
													{formData.student.session}
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-sm text-muted-foreground">
													Class:
												</span>
												<span className="text-sm font-medium text-foreground">
													{
														getAllClassesForSession(
															formData.student.session
														).find(
															(c) => c.classId === formData.student.classId
														)?.name
													}
												</span>
											</div>
											<div className="border-t pt-3">
												<h5 className="font-medium text-foreground mb-2">
													Guardian Info
												</h5>
												<div className="space-y-1 text-sm">
													<p>
														<span className="text-muted-foreground">Name:</span>{' '}
														<span className="font-medium text-foreground">{`${
															formData.student.guardian.firstName
														} ${formData.student.guardian.middleName || ''} ${
															formData.student.guardian.lastName
														}`}</span>
													</p>
													<p>
														<span className="text-muted-foreground">
															Phone:
														</span>{' '}
														<span className="font-medium text-foreground">
															{formData.student.guardian.phone}
														</span>
													</p>
													<p>
														<span className="text-muted-foreground">
															Email:
														</span>{' '}
														<span className="font-medium text-foreground">
															{formData.student.guardian.email || 'N/A'}
														</span>
													</p>
												</div>
											</div>
										</>
									)}
									{userType === 'teacher' &&
										formData.teacher.subjects.length > 0 && (
											<>
												<div className="flex justify-between">
													<span className="text-sm text-muted-foreground">
														Subjects:
													</span>
													<span className="text-sm font-medium text-foreground">
														{formData.teacher.subjects.length} selected
													</span>
												</div>
												{formData.teacher.isSponsor && (
													<div className="flex justify-between">
														<span className="text-sm text-muted-foreground">
															Class Sponsor:
														</span>
														<span className="text-sm font-medium text-foreground">
															{
																getAllClassesForSession(
																	formData.teacher.subjects[0]?.session
																).find(
																	(c) =>
																		c.classId === formData.teacher.sponsorClass
																)?.name
															}
														</span>
													</div>
												)}
											</>
										)}
									{userType === 'administrator' &&
										formData.administrator.position && (
											<>
												<div className="flex justify-between">
													<span className="text-sm text-muted-foreground">
														Position:
													</span>
													<span className="text-sm font-medium text-foreground">
														{formData.administrator.position}
													</span>
												</div>
												<div className="flex justify-between">
													<span className="text-sm text-muted-foreground">
														Permissions:
													</span>
													<span className="text-sm font-medium text-foreground">
														{formData.administrator.permissions.length} selected
													</span>
												</div>
											</>
										)}
								</div>
							</div>
						</div>
					)}

					{/* Step 5: Success Screen */}
					{currentStep === 5 && createdUserInfo && (
						<div className="text-center space-y-6 flex flex-col items-center">
							<CheckCircle className="w-16 h-16 text-green-500" />
							<h3 className="text-2xl font-semibold text-foreground">
								User Created Successfully!
							</h3>
							<p className="text-muted-foreground">
								The account for{' '}
								<span className="font-bold text-foreground">
									{createdUserInfo.fullName}
								</span>{' '}
								has been created at {school?.name}.
							</p>

							<div className="w-full max-w-md bg-muted p-6 rounded-lg border border-border text-left space-y-4">
								<h4 className="font-medium text-foreground border-b pb-2">
									Generated Credentials
								</h4>
								<div className="flex justify-between items-center">
									<span className="text-sm text-muted-foreground">
										Username:
									</span>
									<span className="text-sm font-mono font-bold text-foreground bg-background px-2 py-1 rounded">
										{createdUserInfo.generatedCredentials.username}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm text-muted-foreground">
										Temporary Password:
									</span>
									<span className="text-sm font-mono font-bold text-foreground bg-background px-2 py-1 rounded">
										{createdUserInfo.generatedCredentials.defaultPassword}
									</span>
								</div>
								<p className="text-xs text-center text-muted-foreground pt-2">
									{createdUserInfo.generatedCredentials.note}
								</p>
							</div>

							<div className="flex flex-col sm:flex-row gap-4 pt-4">
								<button
									onClick={handleCopyCredentials}
									className="px-6 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-2 justify-center"
								>
									<Copy className="w-4 h-4" />
									Copy Credentials
								</button>
								<button
									onClick={resetForm}
									className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
								>
									Create Another User
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				{currentStep < 5 && (
					<div className="px-8 py-6 border-t border-border bg-muted flex justify-between">
						<button
							onClick={
								currentStep === 1 ? onBack || (() => {}) : handlePrevious
							}
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
								onClick={handleNext}
								disabled={isValidating}
								className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isValidating ? 'Creating...' : 'Create User'}
							</button>
						)}
					</div>
				)}
			</div>

			{/* Error Modal */}
			{showErrorModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
					<div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full space-y-4 text-center">
						<div className="flex justify-center">
							<XCircle className="w-12 h-12 text-destructive" />
						</div>
						<h4 className="text-xl font-semibold text-foreground">Error</h4>
						<p className="text-sm text-muted-foreground">{errorMessage}</p>
						<button
							onClick={() => setShowErrorModal(false)}
							className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
						>
							OK
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default DashboardUserForm;
