// modals/EditUserModal.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';

// Helper function to find the differences between two objects
const getChangedFields = (originalUser, updatedFormData) => {
	const changes = {};
	Object.keys(updatedFormData).forEach((key) => {
		// Simple comparison for primitive values
		if (originalUser[key] !== updatedFormData[key]) {
			// Deep comparison for nested objects like 'subjects'
			if (
				JSON.stringify(originalUser[key]) !==
				JSON.stringify(updatedFormData[key])
			) {
				changes[key] = updatedFormData[key];
			}
		}
	});
	return changes;
};

const EditUserModal = ({ isOpen, onClose, user, onSave, setFeedback }) => {
	const [formData, setFormData] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [expandedAccordions, setExpandedAccordions] = useState({});

	const schoolProfile = useSchoolStore((state) => state.school);

	useEffect(() => {
		if (user) {
			setFormData(JSON.parse(JSON.stringify(user)));
			if (user.role === 'teacher' && user.subjects) {
				const initialAccordions = {};
				user.subjects.forEach((s) => {
					initialAccordions[s.session] = true;
				});
				setExpandedAccordions(initialAccordions);
			}
		}
	}, [user]);

	const getSessions = () =>
		schoolProfile?.classLevels ? Object.keys(schoolProfile.classLevels) : [];
	const getClassLevels = (session) =>
		schoolProfile?.classLevels?.[session]
			? Object.keys(schoolProfile.classLevels[session])
			: [];
	const getSubjectsBySessionAndLevel = (session, level) =>
		schoolProfile?.classLevels?.[session]?.[level]?.subjects || [];

	const getAllClassesWithLevelsForSession = (session) => {
		if (!schoolProfile?.classLevels?.[session]) return [];
		const allClasses = [];
		Object.entries(schoolProfile.classLevels[session]).forEach(
			([level, levelData]) => {
				levelData.classes?.forEach((cls) => {
					allClasses.push({ ...cls, level });
				});
			}
		);
		return allClasses;
	};

	const getAllClassesForSession = (session) => {
		if (!schoolProfile?.classLevels?.[session]) return [];
		return Object.values(schoolProfile.classLevels[session]).flatMap(
			(level) => level.classes || []
		);
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

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleStudentSessionChange = (e) => {
		const newSession = e.target.value;
		setFormData((prev) => ({
			...prev,
			session: newSession,
			classId: '', // Reset class when session changes
			className: '',
			classLevel: '',
		}));
	};

	const handleStudentClassChange = (e) => {
		const newClassId = e.target.value;
		if (!newClassId) {
			setFormData((prev) => ({
				...prev,
				classId: '',
				className: '',
				classLevel: '',
			}));
			return;
		}
		const allClasses = getAllClassesWithLevelsForSession(formData.session);
		const selectedClass = allClasses.find((c) => c.classId === newClassId);
		if (selectedClass) {
			setFormData((prev) => ({
				...prev,
				classId: selectedClass.classId,
				className: selectedClass.name,
				classLevel: selectedClass.level,
			}));
		}
	};

	const handleSubjectChange = (subject, level, session, checked) => {
		setFormData((prev) => {
			const existingSubjects = prev.subjects || [];
			let updatedSubjects;
			if (checked) {
				updatedSubjects = [...existingSubjects, { subject, level, session }];
			} else {
				updatedSubjects = existingSubjects.filter(
					(s) =>
						!(
							s.subject === subject &&
							s.level === level &&
							s.session === session
						)
				);
			}
			return { ...prev, subjects: updatedSubjects };
		});
	};

	const handleSponsorClassChange = (e) => {
		const { value } = e.target;
		setFormData((prev) => ({
			...prev,
			sponsorClass: value || null,
			isSponsor: !!value,
		}));
	};

	const handleSave = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		// **THIS IS THE FIX**: Only send the fields that have changed
		const changedData = getChangedFields(user, formData);

		if (Object.keys(changedData).length === 0) {
			setFeedback({ type: 'info', message: 'No changes were made.' });
			setIsLoading(false);
			onClose();
			return;
		}

		try {
			const res = await fetch(`/api/users?id=${user._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(changedData), // Send only the changed data
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.message || 'Failed to update user.');
			}
			onSave(data.data.user); // The backend now returns { data: { user: ... } }
		} catch (err) {
			const errorMessage = err.message || 'An unexpected error occurred.';
			setError(errorMessage);
			setFeedback({ type: 'error', message: errorMessage });
		} finally {
			setIsLoading(false);
		}
	};

	const toggleAccordion = (session) => {
		setExpandedAccordions((prev) => ({
			...prev,
			[session]: !prev[session],
		}));
	};

	if (!isOpen || !formData) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<form
				onSubmit={handleSave}
				className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border"
			>
				<div className="flex justify-between items-center p-4 sm:p-6 border-b border-border flex-shrink-0">
					<h4 className="text-xl md:text-2xl font-semibold text-foreground">
						Edit User Profile
					</h4>
					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-full hover:bg-muted transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="overflow-y-auto flex-grow p-4 sm:p-8 space-y-6">
					{error && (
						<p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
							{error}
						</p>
					)}
					{/* Personal Information */}
					<div>
						<h5 className="font-semibold mb-3 text-lg border-b pb-2">
							Personal Information
						</h5>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<InputField
								label="First Name"
								name="firstName"
								value={formData.firstName}
								onChange={handleInputChange}
							/>
							<InputField
								label="Last Name"
								name="lastName"
								value={formData.lastName}
								onChange={handleInputChange}
							/>
							<InputField
								label="Email Address"
								name="email"
								type="email"
								value={formData.email}
								onChange={handleInputChange}
							/>
							<InputField
								label="Phone Number"
								name="phone"
								value={formData.phone}
								onChange={handleInputChange}
							/>
						</div>
					</div>

					{/* Role-Specific Information */}
					{user.role === 'student' && (
						<div>
							<h5 className="font-semibold mb-3 text-lg border-b pb-2">
								Academic Information
							</h5>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-foreground mb-1">
										Session
									</label>
									<select
										name="session"
										value={formData.session || ''}
										onChange={handleStudentSessionChange}
										className="w-full p-2 border border-border rounded-lg bg-background"
									>
										<option value="">Select Session</option>
										{getSessions().map((session) => (
											<option key={session} value={session}>
												{session}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-foreground mb-1">
										Class
									</label>
									<select
										name="classId"
										value={formData.classId || ''}
										onChange={handleStudentClassChange}
										disabled={!formData.session}
										className="w-full p-2 border border-border rounded-lg bg-background disabled:bg-muted/50"
									>
										<option value="">Select Class</option>
										{formData.session &&
											getClassLevels(formData.session).map((level) => (
												<optgroup key={level} label={level}>
													{getAllClassesWithLevelsForSession(formData.session)
														.filter((cls) => cls.level === level)
														.map((cls) => (
															<option key={cls.classId} value={cls.classId}>
																{cls.name}
															</option>
														))}
												</optgroup>
											))}
									</select>
								</div>
							</div>
						</div>
					)}

					{user.role === 'administrator' && (
						<div>
							<h5 className="font-semibold mb-3 text-lg border-b pb-2">
								Administrative Information
							</h5>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-foreground mb-1">
										Position
									</label>
									<select
										name="position"
										value={formData.position}
										onChange={handleInputChange}
										className="w-full p-2 border border-border rounded-lg bg-background"
									>
										{adminPositions.map((pos) => (
											<option key={pos} value={pos}>
												{pos}
											</option>
										))}
									</select>
								</div>
							</div>
						</div>
					)}

					{user.role === 'teacher' && schoolProfile && (
						<div>
							<h5 className="font-semibold mb-3 text-lg border-b pb-2">
								Teaching Assignments
							</h5>
							<div className="space-y-4">
								{getSessions().map((session) => (
									<div
										key={session}
										className="border border-border rounded-lg"
									>
										<button
											type="button"
											onClick={() => toggleAccordion(session)}
											className="flex justify-between items-center w-full p-3 font-medium text-left bg-muted/50 hover:bg-muted/80"
										>
											<span>{session} Session</span>
											<ChevronDown
												className={`w-5 h-5 transition-transform ${
													expandedAccordions[session] ? 'rotate-180' : ''
												}`}
											/>
										</button>
										{expandedAccordions[session] && (
											<div className="p-4 space-y-4">
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">
														Class Sponsorship
													</label>
													<select
														value={formData.sponsorClass || ''}
														onChange={handleSponsorClassChange}
														className="w-full p-2 border border-border rounded-lg bg-background"
													>
														<option value="">No sponsorship</option>
														{getAllClassesForSession(session).map((cls) => (
															<option key={cls.classId} value={cls.classId}>
																{cls.name}
															</option>
														))}
													</select>
												</div>
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">
														Subjects Taught
													</label>
													<div className="space-y-3">
														{getClassLevels(session).map((level) => (
															<div key={level}>
																<h6 className="font-medium text-foreground mb-2">
																	{level}
																</h6>
																<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
																	{getSubjectsBySessionAndLevel(
																		session,
																		level
																	).map((subject) => (
																		<label
																			key={`${subject}-${level}`}
																			className="flex items-center text-sm"
																		>
																			<input
																				type="checkbox"
																				checked={(formData.subjects || []).some(
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
																			{subject}
																		</label>
																	))}
																</div>
															</div>
														))}
													</div>
												</div>
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				<div className="p-4 sm:p-6 bg-muted/50 border-t border-border text-right rounded-b-xl flex-shrink-0">
					<button
						type="button"
						onClick={onClose}
						className="px-6 py-2 rounded-lg hover:bg-muted/80 mr-2"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isLoading}
						className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-primary/50"
					>
						{isLoading ? 'Saving...' : 'Save Changes'}
					</button>
				</div>
			</form>
		</div>
	);
};

const InputField = ({ label, ...props }) => (
	<div>
		<label className="block text-sm font-medium text-foreground mb-1">
			{label}
		</label>
		<input
			{...props}
			className="w-full p-2 border border-border rounded-lg bg-background"
		/>
	</div>
);

export default EditUserModal;
