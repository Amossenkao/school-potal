'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import ConflictModal from '@/components/modals/ConflictModal';
import { AnimatePresence, motion } from 'framer-motion';
import {
	buildSchoolAcademicYearRange,
	getCurrentAcademicYearLabel,
} from '@/utils/academicYearOptions';
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
	Loader2,
	CheckCircle2,
	BookOpen,
} from 'lucide-react';

const DashboardUserForm = ({ onUserCreated, onBack }: any) => {
	const [currentStep, setCurrentStep] = useState(1);
	const [userType, setUserType] = useState('');
	const [errors, setErrors] = useState<any>({});
	const [isValidating, setIsValidating] = useState(false);
	const [createdUserInfo, setCreatedUserInfo] = useState<any>(null);
	const [showErrorModal, setShowErrorModal] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [conflictState, setConflictState] = useState(null);
	const [showConflictModal, setShowConflictModal] = useState(false);
	const [pendingUserData, setPendingUserData] = useState(null);

	const school = useSchoolStore((state) => state.school);
	const defaultEnrollmentSemester = '1st Semester';
	const currentAcademicYear = String(
		school?.currentAcademicYear || getCurrentAcademicYearLabel(),
	).trim();
	const enrollmentYearOptions = useMemo(() => {
		const years = buildSchoolAcademicYearRange(school || undefined);
		if (years.length > 0) {
			return years;
		}
		return currentAcademicYear ? [currentAcademicYear] : [];
	}, [school, currentAcademicYear]);
	const defaultEnrollmentYear = useMemo(() => {
		if (enrollmentYearOptions.includes(currentAcademicYear)) {
			return currentAcademicYear;
		}
		return enrollmentYearOptions[0] || currentAcademicYear || '';
	}, [enrollmentYearOptions, currentAcademicYear]);

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
		avatar: '',
		student: {
			session: '',
			classId: '',
			enrollmentYear: defaultEnrollmentYear,
			enrollmentSemester: defaultEnrollmentSemester,
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
			subjects: [] as Array<{
				subject: string;
				level: string;
				session: string;
			}>,
			isSponsor: false,
			sponsorClass: null as string | null,
		},
		administrator: {
			position: '',
		},
	});

	const [expandedAccordions, setExpandedAccordions] = useState<any>({
		guardian: true,
		class: false,
		teacherSessions: {},
	});

	// Track active teacher session tab
	const [activeTeacherSession, setActiveTeacherSession] = useState<string>('');

	useEffect(() => {
		if (!defaultEnrollmentYear) return;
		setFormData((prev) => {
			const selectedYear = String(prev.student.enrollmentYear || '').trim();
			const isSelectedYearValid = enrollmentYearOptions.includes(selectedYear);
			const nextEnrollmentYear = isSelectedYearValid
				? selectedYear
				: defaultEnrollmentYear;
			const nextEnrollmentSemester =
				String(prev.student.enrollmentSemester || '').trim() ||
				defaultEnrollmentSemester;

			if (
				nextEnrollmentYear === prev.student.enrollmentYear &&
				nextEnrollmentSemester === prev.student.enrollmentSemester
			) {
				return prev;
			}

			return {
				...prev,
				student: {
					...prev.student,
					enrollmentYear: nextEnrollmentYear,
					enrollmentSemester: nextEnrollmentSemester,
				},
			};
		});
	}, [defaultEnrollmentYear, enrollmentYearOptions, defaultEnrollmentSemester]);

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

	const isLevelSelfContained = (session, level) => {
		if (!school?.classLevels?.[session]?.[level]) return false;
		return !!school.classLevels[session][level].isSelfContained;
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
		return school.classLevels[session][level].subjects.map(
			(subject) => subject.name,
		);
	};

	const getLevelVisualStyle = (level = '') => {
		const normalized = String(level).trim().toLowerCase();

		if (
			normalized.includes('elementary') ||
			normalized.includes('primary') ||
			normalized.includes('nursery')
		) {
			return {
				section: 'border-sky-200/70 bg-sky-50/40',
				badge: 'border-sky-300 bg-sky-100 text-sky-800',
			};
		}

		if (
			normalized.includes('junior') ||
			normalized.includes('middle') ||
			normalized.includes('jhs')
		) {
			return {
				section: 'border-emerald-200/70 bg-emerald-50/40',
				badge: 'border-emerald-300 bg-emerald-100 text-emerald-800',
			};
		}

		if (normalized.includes('senior') || normalized.includes('shs')) {
			return {
				section: 'border-amber-200/70 bg-amber-50/40',
				badge: 'border-amber-300 bg-amber-100 text-amber-900',
			};
		}

		return {
			section: 'border-border/70 bg-muted/20',
			badge: 'border-border/80 bg-muted text-foreground',
		};
	};

	const adminPositions = useMemo(() => {
		const fromProfile = Array.isArray(school?.administrativePositions)
			? school.administrativePositions
					.map((item) => ({
						key: String(item?.id || '').trim(),
						name: String(item?.name || '').trim(),
					}))
					.filter((item) => item.key && item.name)
			: [];

		if (fromProfile.length > 0) return fromProfile;

		const fallbackKeys = school?.roleFeatureAccess?.administrator
			? Object.keys(school.roleFeatureAccess.administrator)
			: [];
		return fallbackKeys.map((key) => ({
			key,
			name: key
				.replace(/_/g, ' ')
				.replace(/\b\w/g, (char) => char.toUpperCase()),
		}));
	}, [school]);

	const selectedAdminPosition = useMemo(() => {
		return (
			adminPositions.find(
				(item) => item.key === formData.administrator.position,
			) || null
		);
	}, [adminPositions, formData.administrator.position]);

	const existingUsers = [
		{ email: 'john@school.edu' },
		{ email: 'jane@school.edu' },
	];

	const getSelfContainedClasses = (session) => {
		if (!session) return [];
		const levels = getClassLevels(session);
		const selfContainedClasses = [];
		levels.forEach((level) => {
			if (isLevelSelfContained(session, level)) {
				const classes = getClassesBySessionAndLevel(session, level);
				classes.forEach((cls) => {
					selfContainedClasses.push({
						...cls,
						level: level,
					});
				});
			}
		});
		return selfContainedClasses;
	};

	// Updated to support multiple self-contained class selection
	const handleSelfContainedSelection = (classId, session, level, checked) => {
		// Get subjects for this self-contained class
		const classSubjects = getSubjectsBySessionAndLevel(session, level);

		// Build new subjects: keep everything not from this specific class's self-contained subjects
		const subjectsWithoutThisClass = formData.teacher.subjects.filter(
			(s) =>
				!(
					s.session === session &&
					s.level === level &&
					isLevelSelfContained(session, s.level)
				),
		);

		let updatedSubjects;
		let updatedSponsorClass = formData.teacher.sponsorClass;
		let updatedIsSponsor = formData.teacher.isSponsor;

		if (checked) {
			// Add subjects for this self-contained class
			const newSubjects = classSubjects.map((subjectName) => ({
				subject: subjectName,
				level: level,
				session: session,
			}));
			updatedSubjects = [...subjectsWithoutThisClass, ...newSubjects];
			// If no sponsor class yet, assign this one
			if (!updatedSponsorClass) {
				updatedSponsorClass = classId;
				updatedIsSponsor = true;
			}
		} else {
			updatedSubjects = subjectsWithoutThisClass;
			// If this was the sponsor class, clear it
			if (formData.teacher.sponsorClass === classId) {
				updatedSponsorClass = null;
				updatedIsSponsor = false;
			}
		}

		setFormData({
			...formData,
			teacher: {
				...formData.teacher,
				subjects: updatedSubjects,
				isSponsor: updatedIsSponsor,
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
						newErrors['guardianFirstName'] = 'Guardian first name is required';
					if (!formData.student.guardian.lastName.trim())
						newErrors['guardianLastName'] = 'Guardian last name is required';
					if (!formData.student.guardian.phone.trim())
						newErrors['guardianPhone'] = 'Guardian phone is required';
					if (!formData.student.guardian.address.trim())
						newErrors['guardianAddress'] = 'Guardian address is required';
					if (!formData.student.session) {
						newErrors['session'] = 'Session selection is required';
					} else if (!formData.student.classId) {
						newErrors['classId'] = 'Class selection is required';
					}
					if (!formData.student.enrollmentYear)
						newErrors['enrollmentYear'] = 'Enrollment year is required';
					if (!formData.student.enrollmentSemester)
						newErrors['enrollmentSemester'] = 'Enrollment semester is required';
				} else if (userType === 'teacher') {
					if (formData.teacher.subjects.length === 0) {
						newErrors['subjects'] = 'At least one subject must be selected';
					} else if (buildTeacherSubjectsPayload().length === 0) {
						newErrors['subjects'] =
							'Selected subjects did not map to any classes.';
					}
				} else if (userType === 'administrator') {
					if (!formData.administrator.position)
						newErrors['position'] = 'Position is required';
				}
				break;
			case 4:
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
		const subjectIdentifier = { subject, level, session };

		const selfContainedSubjectsInSession = updatedSubjects.filter(
			(s) => s.session === session && isLevelSelfContained(session, s.level),
		);

		if (selfContainedSubjectsInSession.length > 0) {
			updatedSubjects = updatedSubjects.filter(
				(s) => s.session !== session || !isLevelSelfContained(session, s.level),
			);
		}

		if (checked) {
			updatedSubjects.push(subjectIdentifier);
		} else {
			updatedSubjects = updatedSubjects.filter(
				(s) =>
					!(
						s.subject === subject &&
						s.level === level &&
						s.session === session
					),
			);
		}

		setFormData({
			...formData,
			teacher: {
				...formData.teacher,
				subjects: updatedSubjects,
				sponsorClass:
					selfContainedSubjectsInSession.length > 0
						? null
						: formData.teacher.sponsorClass,
				isSponsor:
					selfContainedSubjectsInSession.length > 0
						? false
						: formData.teacher.isSponsor,
			},
		});
	};

	const buildTeacherSubjectsPayload = () => {
		const academicYear = currentAcademicYear;
		const classMap = new Map();

		const selections = formData.teacher.subjects || [];
		const selfContainedSelections = selections.filter((s) =>
			isLevelSelfContained(s.session, s.level),
		);
		const regularSelections = selections.filter(
			(s) => !isLevelSelfContained(s.session, s.level),
		);

		regularSelections.forEach((selection) => {
			const classes = getClassesBySessionAndLevel(
				selection.session,
				selection.level,
			);
			classes.forEach((cls) => {
				if (!classMap.has(cls.classId)) {
					classMap.set(cls.classId, new Set());
				}
				classMap.get(cls.classId).add(selection.subject);
			});
		});

		if (selfContainedSelections.length > 0 && formData.teacher.sponsorClass) {
			if (!classMap.has(formData.teacher.sponsorClass)) {
				classMap.set(formData.teacher.sponsorClass, new Set());
			}
			selfContainedSelections.forEach((selection) => {
				classMap.get(formData.teacher.sponsorClass).add(selection.subject);
			});
		}

		const classes = Array.from(classMap.entries()).map(
			([classId, subjectsSet]: [string, any]) => ({
				classId,
				subjects: Array.from(subjectsSet),
			}),
		);

		return classes.length > 0 ? [{ year: academicYear, classes }] : [];
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

	const proceedWithUserCreation = async (userData, force = false) => {
		setIsValidating(true);

		const body = { ...userData };
		if (force) {
			body.confirmReassignments = true;
		}

		try {
			const res = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			const result = await res.json();

			if (res.ok && result.success) {
				setCreatedUserInfo(result.data.user);
				if (onUserCreated) onUserCreated(result.data.user);
				setCurrentStep(5);
			} else if (res.status === 409 && result.requiresConfirmation) {
				setConflictState(result);
				setPendingUserData(userData);
				setShowConflictModal(true);
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

	const handleConfirmReassignment = async () => {
		if (pendingUserData) {
			await proceedWithUserCreation(pendingUserData, true);
		}
		setShowConflictModal(false);
	};

	const handleSubmit = async () => {
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
			avatar: formData.avatar || undefined,
		};

		let userData;
		switch (userType) {
			case 'student':
				const selectedClass = getAllClassesForSession(
					formData.student.session,
				).find((c) => c.classId === formData.student.classId);
				userData = {
					...baseUser,
					session: formData.student.session,
					classId: formData.student.classId,
					className: selectedClass?.name,
					classLevel: selectedClass?.level,
					enrollmentYear: formData.student.enrollmentYear,
					enrollmentSemester: formData.student.enrollmentSemester,
					guardian: formData.student.guardian,
				};
				break;
			case 'teacher':
				userData = {
					...baseUser,
					subjects: buildTeacherSubjectsPayload(),
					sponsorClass: formData.teacher.sponsorClass,
				};
				break;
			case 'administrator':
				userData = {
					...baseUser,
					position: formData.administrator.position,
				};
				break;
			default:
				userData = baseUser;
		}

		await proceedWithUserCreation(userData);
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
			avatar: '',
			student: {
				session: '',
				classId: '',
				enrollmentYear: defaultEnrollmentYear,
				enrollmentSemester: defaultEnrollmentSemester,
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
			},
		});
		setErrors({});
		setCreatedUserInfo(null);
		setActiveTeacherSession('');
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

	// Helper: get count of subjects assigned in a given session
	const getSessionSubjectCount = (session: string) =>
		formData.teacher.subjects.filter((s) => s.session === session).length;

	// Helper: check if a self-contained class is selected
	const isSelfContainedClassSelected = (
		classId: string,
		session: string,
		level: string,
	) =>
		formData.teacher.subjects.some(
			(s) =>
				s.session === session &&
				s.level === level &&
				isLevelSelfContained(session, s.level),
		) &&
		formData.teacher.subjects.some(
			(s) => s.session === session && s.level === level,
		);

	return (
		<div className="w-full max-w-6xl mr-auto px-4 sm:px-6 lg:px-6">
			<ConflictModal
				isOpen={showConflictModal}
				onClose={() => setShowConflictModal(false)}
				conflictState={conflictState}
				onConfirm={handleConfirmReassignment}
				isLoading={isValidating}
				userName={`${formData.firstName} ${formData.lastName}`}
				schoolProfile={school}
			/>

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
					<div className="bg-card rounded-lg border border-border p-4 sm:p-6">
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
											className={`w-6 sm:w-12 h-1 mx-1 sm:mx-2 transition-colors ${
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
										rows={3}
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
										rows={3}
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
										<AnimatePresence>
											{expandedAccordions.guardian && (
												<motion.div
													initial={{ opacity: 0, height: 0 }}
													animate={{ opacity: 1, height: 'auto' }}
													exit={{ opacity: 0, height: 0 }}
													className="p-4 space-y-4"
												>
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
															rows={3}
															placeholder="Guardian full address"
														/>
														{errors.guardianAddress && (
															<p className="text-destructive text-sm mt-1">
																{errors.guardianAddress}
															</p>
														)}
													</div>
												</motion.div>
											)}
										</AnimatePresence>
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
										<AnimatePresence>
											{expandedAccordions.class && (
												<motion.div
													initial={{ opacity: 0, height: 0 }}
													animate={{ opacity: 1, height: 'auto' }}
													exit={{ opacity: 0, height: 0 }}
													className="p-4 space-y-4"
												>
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<label className="block text-sm font-medium text-foreground mb-2">
																Enrollment Year *
															</label>
															<select
																value={formData.student.enrollmentYear}
																onChange={(e) =>
																	setFormData({
																		...formData,
																		student: {
																			...formData.student,
																			enrollmentYear: e.target.value,
																		},
																	})
																}
																className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
																	errors.enrollmentYear
																		? 'border-red-500'
																		: 'border-border'
																}`}
															>
																{enrollmentYearOptions.map((year) => (
																	<option key={year} value={year}>
																		{year}
																	</option>
																))}
															</select>
															{errors.enrollmentYear && (
																<p className="text-destructive text-sm mt-1">
																	{errors.enrollmentYear}
																</p>
															)}
														</div>
														<div>
															<label className="block text-sm font-medium text-foreground mb-2">
																Enrollment Semester *
															</label>
															<select
																value={formData.student.enrollmentSemester}
																onChange={(e) =>
																	setFormData({
																		...formData,
																		student: {
																			...formData.student,
																			enrollmentSemester: e.target.value,
																		},
																	})
																}
																className={`w-full p-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
																	errors.enrollmentSemester
																		? 'border-red-500'
																		: 'border-border'
																}`}
															>
																<option value="">Select semester</option>
																<option value="1st Semester">
																	1st Semester
																</option>
																<option value="2nd Semester">
																	2nd Semester
																</option>
															</select>
															{errors.enrollmentSemester && (
																<p className="text-destructive text-sm mt-1">
																	{errors.enrollmentSemester}
																</p>
															)}
														</div>
													</div>
													<div>
														<label className="block text-sm font-medium text-foreground mb-2">
															Session *
														</label>
														<div className="grid grid-cols-3 gap-4">
															{getSessions().map((session) => {
																const isSelected =
																	formData.student.session === session;

																return (
																	<label
																		key={session}
																		className={`relative flex items-center justify-center rounded-2xl border p-4 cursor-pointer transition-all duration-300 
          ${
						isSelected
							? 'border-primary bg-primary/10 shadow-md'
							: 'border-muted hover:border-primary/50'
					}
        `}
																	>
																		<input
																			type="radio"
																			name="session"
																			value={session}
																			checked={isSelected}
																			onChange={(e) =>
																				handleSessionSelection(e.target.value)
																			}
																			className="absolute opacity-0"
																		/>

																		<motion.div
																			className="flex items-center justify-center gap-2"
																			initial={{ scale: 0.95 }}
																			animate={{
																				scale: isSelected ? 1.05 : 1,
																			}}
																			transition={{
																				duration: 0.2,
																			}}
																		>
																			{isSelected && (
																				<CheckCircle2 className="w-5 h-5 text-primary transition-opacity duration-300" />
																			)}
																			<span className="text-foreground font-medium">
																				{session}
																			</span>
																		</motion.div>
																	</label>
																);
															})}
														</div>
														{errors.session && (
															<p className="text-destructive text-sm mt-1">
																{errors.session}
															</p>
														)}
													</div>
													{formData.student.session && (
														<div className="space-y-6">
															<label className="block text-sm font-semibold text-foreground tracking-wide">
																Select Class
															</label>

															{getClassLevels(formData.student.session).map(
																(level, levelIndex) => {
																	const levelStyle = getLevelVisualStyle(level);
																	return (
																		<div
																			key={level}
																			className={`space-y-3 rounded-xl border p-3 ${levelStyle.section}`}
																		>
																			<motion.h4
																				initial={{ opacity: 0, y: -5 }}
																				animate={{ opacity: 1, y: 0 }}
																				transition={{
																					duration: 0.3,
																					delay: levelIndex * 0.1,
																				}}
																				className="mb-1"
																			>
																				<span
																					className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${levelStyle.badge}`}
																				>
																					{level}
																				</span>
																			</motion.h4>

																			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
																				{getClassesBySessionAndLevel(
																					formData.student.session,
																					level,
																				).map((cls, idx) => {
																					const isSelected =
																						formData.student.classId ===
																						cls.classId;
																					return (
																						<motion.label
																							key={cls.classId}
																							className={`relative flex items-center justify-center rounded-xl border p-4 cursor-pointer transition-all duration-300
                    ${
											isSelected
												? 'border-primary bg-primary/10 shadow-md'
												: 'border-muted hover:border-primary/50 hover:bg-accent/10'
										}
                  `}
																							initial={{
																								opacity: 0,
																								scale: 0.95,
																							}}
																							animate={{ opacity: 1, scale: 1 }}
																							transition={{
																								duration: 0.3,
																								delay: idx * 0.05,
																							}}
																						>
																							<input
																								type="radio"
																								name="studentClass"
																								value={cls.classId}
																								checked={isSelected}
																								onChange={(e) =>
																									setFormData({
																										...formData,
																										student: {
																											...formData.student,
																											classId: e.target.value,
																										},
																									})
																								}
																								className="absolute opacity-0"
																							/>

																							<div className="flex items-center gap-2">
																								{isSelected && (
																									<CheckCircle2 className="w-5 h-5 text-primary transition-opacity duration-300" />
																								)}
																								<span className="text-sm font-medium text-foreground">
																									{cls.name}
																								</span>
																							</div>
																						</motion.label>
																					);
																				})}
																			</div>
																		</div>
																	);
																},
															)}

															{errors.classId && (
																<motion.p
																	initial={{ opacity: 0 }}
																	animate={{ opacity: 1 }}
																	className="text-destructive text-sm mt-2"
																>
																	{errors.classId}
																</motion.p>
															)}
														</div>
													)}
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								</>
							)}

							{/* ─────────────────────────────────────────────
							    TEACHER STEP 3 — REDESIGNED LAYOUT
							    ───────────────────────────────────────────── */}
							{userType === 'teacher' && (
								<div className="flex flex-col gap-6">
									{/* Top instruction bar */}
									<p className="text-sm text-muted-foreground">
										Select the sessions, levels, and subjects this teacher will
										cover. Self-contained classes assign all configured subjects
										at once.
									</p>

									{/* Two-column layout: session tab rail (left) + content panel (right) */}
									<div className="flex gap-4 min-h-[520px]">
										{/* ── Session Tab Rail ── */}
										<div className="flex flex-col gap-1 w-44 shrink-0">
											<p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
												Sessions
											</p>
											{getSessions().map((session) => {
												const count = getSessionSubjectCount(session);
												const isActive = activeTeacherSession === session;
												return (
													<button
														key={session}
														type="button"
														onClick={() => setActiveTeacherSession(session)}
														className={`relative flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-all duration-200 ${
															isActive
																? 'bg-primary text-primary-foreground shadow-sm'
																: 'text-foreground hover:bg-muted'
														}`}
													>
														<span className="flex items-center gap-2 truncate">
															<BookOpen className="w-3.5 h-3.5 shrink-0" />
															{session}
														</span>
														{count > 0 && (
															<span
																className={`shrink-0 text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none ${
																	isActive
																		? 'bg-primary-foreground/20 text-primary-foreground'
																		: 'bg-primary/10 text-primary'
																}`}
															>
																{count}
															</span>
														)}
													</button>
												);
											})}

											{/* Divider + Teaching Summary in sidebar */}
											{formData.teacher.subjects.length > 0 && (
												<div className="mt-4 pt-4 border-t border-border space-y-2">
													<p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">
														Summary
													</p>
													<div className="rounded-lg bg-muted/60 border border-border px-3 py-2.5 space-y-1.5 text-xs text-foreground">
														<div className="flex justify-between gap-1">
															<span className="text-muted-foreground">
																Subjects
															</span>
															<span className="font-semibold">
																{formData.teacher.subjects.length}
															</span>
														</div>
														<div className="flex justify-between gap-1">
															<span className="text-muted-foreground">
																Sessions
															</span>
															<span className="font-semibold">
																{
																	Array.from(
																		new Set(
																			formData.teacher.subjects.map(
																				(s) => s.session,
																			),
																		),
																	).length
																}
															</span>
														</div>
														{formData.teacher.isSponsor &&
															formData.teacher.sponsorClass && (
																<div className="pt-1 border-t border-border/50">
																	<span className="text-muted-foreground block">
																		Sponsor
																	</span>
																	<span className="font-semibold text-primary break-words">
																		{getAllClassesForSession(
																			formData.teacher.subjects[0]?.session,
																		).find(
																			(c) =>
																				c.classId ===
																				formData.teacher.sponsorClass,
																		)?.name ?? '—'}
																	</span>
																</div>
															)}
													</div>
												</div>
											)}
										</div>

										{/* ── Content Panel ── */}
										<div className="flex-1 min-w-0">
											{!activeTeacherSession ? (
												/* Empty state */
												<div className="h-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-center p-10 gap-3">
													<BookOpen className="w-10 h-10 text-muted-foreground/40" />
													<p className="text-sm font-medium text-muted-foreground">
														Select a session to begin
													</p>
													<p className="text-xs text-muted-foreground/70">
														Choose a session from the left to assign subjects
														and classes.
													</p>
												</div>
											) : (
												<motion.div
													key={activeTeacherSession}
													initial={{ opacity: 0, x: 8 }}
													animate={{ opacity: 1, x: 0 }}
													transition={{ duration: 0.2 }}
													className="space-y-5"
												>
													{/* ── Self-Contained Classes ── */}
													{getSelfContainedClasses(activeTeacherSession)
														.length > 0 && (
														<div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
															<div className="flex items-start justify-between gap-2">
																<div>
																	<p className="text-sm font-semibold text-foreground">
																		Self-Contained Classes
																	</p>
																	<p className="text-xs text-muted-foreground mt-0.5">
																		Selecting a class assigns all its configured
																		subjects automatically. Multiple classes can
																		be selected.
																	</p>
																</div>
															</div>
															<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
																{getSelfContainedClasses(
																	activeTeacherSession,
																).map((cls: any) => {
																	const isChecked =
																		formData.teacher.subjects.some(
																			(s) =>
																				s.session === activeTeacherSession &&
																				s.level === cls.level &&
																				isLevelSelfContained(
																					activeTeacherSession,
																					s.level,
																				),
																		);
																	return (
																		<motion.label
																			key={cls.classId}
																			whileHover={{ scale: 1.02 }}
																			whileTap={{ scale: 0.98 }}
																			className={`relative flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-all duration-200 ${
																				isChecked
																					? 'border-primary bg-primary/10 shadow-sm'
																					: 'border-border hover:border-primary/50 hover:bg-accent/10'
																			}`}
																		>
																			<input
																				type="checkbox"
																				checked={isChecked}
																				onChange={(e) =>
																					handleSelfContainedSelection(
																						cls.classId,
																						activeTeacherSession,
																						cls.level,
																						e.target.checked,
																					)
																				}
																				className="absolute opacity-0"
																			/>
																			<div
																				className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
																					isChecked
																						? 'bg-primary border-primary'
																						: 'border-border bg-background'
																				}`}
																			>
																				{isChecked && (
																					<svg
																						className="w-2.5 h-2.5 text-primary-foreground"
																						fill="none"
																						viewBox="0 0 10 8"
																					>
																						<path
																							d="M1 4l3 3 5-6"
																							stroke="currentColor"
																							strokeWidth="1.5"
																							strokeLinecap="round"
																							strokeLinejoin="round"
																						/>
																					</svg>
																				)}
																			</div>
																			<div className="min-w-0">
																				<span className="text-sm font-medium text-foreground block truncate">
																					{cls.name}
																				</span>
																				<span className="text-xs text-muted-foreground truncate block">
																					{cls.level}
																				</span>
																			</div>
																		</motion.label>
																	);
																})}
															</div>
														</div>
													)}

													{/* ── Subject Assignment by Level ── */}
													{(() => {
														const regularLevels = getClassLevels(
															activeTeacherSession,
														).filter(
															(level) =>
																!isLevelSelfContained(
																	activeTeacherSession,
																	level,
																),
														);
														if (regularLevels.length === 0) return null;
														return (
															<div className="space-y-3">
																<div>
																	<p className="text-sm font-semibold text-foreground">
																		Subjects by Level
																	</p>
																	<p className="text-xs text-muted-foreground mt-0.5">
																		Check each subject this teacher will deliver
																		across all classes in that level.
																	</p>
																</div>
																<div className="space-y-3 max-h-72 overflow-y-auto pr-1">
																	{regularLevels.map((level) => {
																		const levelStyle =
																			getLevelVisualStyle(level);
																		const subjects =
																			getSubjectsBySessionAndLevel(
																				activeTeacherSession,
																				level,
																			);
																		const checkedCount = subjects.filter(
																			(subject) =>
																				formData.teacher.subjects.some(
																					(s) =>
																						s.subject === subject &&
																						s.level === level &&
																						s.session === activeTeacherSession,
																				),
																		).length;

																		return (
																			<div
																				key={level}
																				className={`rounded-lg border p-3 ${levelStyle.section}`}
																			>
																				<div className="flex items-center gap-2 mb-2.5">
																					<span
																						className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${levelStyle.badge}`}
																					>
																						{level}
																					</span>
																					{checkedCount > 0 && (
																						<span className="text-xs text-muted-foreground">
																							{checkedCount}/{subjects.length}{' '}
																							selected
																						</span>
																					)}
																				</div>
																				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
																					{subjects.map(
																						(subject, subjectIndex) => {
																							const isChecked =
																								formData.teacher.subjects.some(
																									(s) =>
																										s.subject === subject &&
																										s.level === level &&
																										s.session ===
																											activeTeacherSession,
																								);
																							return (
																								<motion.label
																									key={`subject-${subject}-${level}-${activeTeacherSession}-${subjectIndex}`}
																									whileHover={{ scale: 1.02 }}
																									whileTap={{ scale: 0.98 }}
																									className={`relative flex items-center gap-2 rounded-md border px-2.5 py-2 cursor-pointer transition-all text-xs ${
																										isChecked
																											? 'border-primary bg-primary/10 shadow-sm'
																											: 'border-border bg-background hover:border-primary/40 hover:bg-accent/5'
																									}`}
																								>
																									<input
																										type="checkbox"
																										checked={isChecked}
																										onChange={(e) =>
																											handleSubjectChange(
																												subject,
																												level,
																												activeTeacherSession,
																												e.target.checked,
																											)
																										}
																										className="absolute opacity-0"
																									/>
																									<div
																										className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
																											isChecked
																												? 'bg-primary border-primary'
																												: 'border-border bg-background'
																										}`}
																									>
																										{isChecked && (
																											<svg
																												className="w-2 h-2 text-primary-foreground"
																												fill="none"
																												viewBox="0 0 10 8"
																											>
																												<path
																													d="M1 4l3 3 5-6"
																													stroke="currentColor"
																													strokeWidth="1.5"
																													strokeLinecap="round"
																													strokeLinejoin="round"
																												/>
																											</svg>
																										)}
																									</div>
																									<span className="text-foreground leading-snug">
																										{subject}
																									</span>
																								</motion.label>
																							);
																						},
																					)}
																				</div>
																			</div>
																		);
																	})}
																</div>
															</div>
														);
													})()}

													{/* ── Class Sponsorship ── */}
													<div className="rounded-xl border border-border bg-background p-4 space-y-2">
														<div>
															<p className="text-sm font-semibold text-foreground">
																Class Sponsorship
																<span className="ml-1 text-xs font-normal text-muted-foreground">
																	(optional)
																</span>
															</p>
															<p className="text-xs text-muted-foreground mt-0.5">
																Designate this teacher as the homeroom sponsor
																for one class in this session.
															</p>
														</div>
														<select
															value={
																formData.teacher.sponsorClass &&
																getAllClassesForSession(
																	activeTeacherSession,
																).find(
																	(cls) =>
																		cls.classId ===
																		formData.teacher.sponsorClass,
																)
																	? formData.teacher.sponsorClass
																	: ''
															}
															onChange={(e) => {
																const hasSelfContained =
																	formData.teacher.subjects.some(
																		(s) =>
																			s.session === activeTeacherSession &&
																			isLevelSelfContained(
																				activeTeacherSession,
																				s.level,
																			),
																	);
																if (hasSelfContained) {
																	const otherSubjects =
																		formData.teacher.subjects.filter(
																			(s) => s.session !== activeTeacherSession,
																		);
																	setFormData({
																		...formData,
																		teacher: {
																			...formData.teacher,
																			subjects: otherSubjects,
																			sponsorClass: e.target.value || null,
																			isSponsor: !!e.target.value,
																		},
																	});
																} else {
																	setFormData({
																		...formData,
																		teacher: {
																			...formData.teacher,
																			sponsorClass: e.target.value || null,
																			isSponsor: !!e.target.value,
																		},
																	});
																}
															}}
															className="w-full p-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
														>
															<option value="">No class sponsorship</option>
															{getAllClassesForSession(activeTeacherSession)
																.filter(
																	(cls) =>
																		!isLevelSelfContained(
																			activeTeacherSession,
																			cls.level,
																		),
																)
																.map((cls) => (
																	<option key={cls.classId} value={cls.classId}>
																		{cls.name} ({cls.level})
																	</option>
																))}
														</select>
													</div>
												</motion.div>
											)}
										</div>
									</div>

									{/* Validation error */}
									{errors.subjects && (
										<motion.p
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											className="text-destructive text-sm"
										>
											{errors.subjects}
										</motion.p>
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
												<option key={position.key} value={position.key}>
													{position.name} ({position.key})
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
										<div className="p-3 text-sm text-muted-foreground bg-muted/50 rounded-lg border border-border">
											Administrator permissions are managed in system settings.
										</div>
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
													Enrollment:
												</span>
												<span className="text-sm font-medium text-foreground">
													{formData.student.enrollmentYear} (
													{formData.student.enrollmentSemester})
												</span>
											</div>
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
															formData.student.session,
														).find(
															(c) => c.classId === formData.student.classId,
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
																	formData.teacher.subjects[0]?.session,
																).find(
																	(c) =>
																		c.classId === formData.teacher.sponsorClass,
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
														{selectedAdminPosition
															? `${selectedAdminPosition.name} (${selectedAdminPosition.key})`
															: formData.administrator.position}
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
								{isValidating && (
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
								)}
								{isValidating ? 'Validating...' : 'Next'}
								<ChevronRight className="w-4 h-4" />
							</button>
						) : (
							<button
								onClick={handleNext}
								disabled={isValidating}
								className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isValidating && (
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
								)}
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
