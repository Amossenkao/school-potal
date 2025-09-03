// modals/EditUserModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';
import ConflictModal from './ConflictModal'; // Import the new modal
import { motion, AnimatePresence } from 'framer-motion';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

// Helper function to find the differences between two objects
const getChangedFields = (originalUser, updatedFormData) => {
	const changes = {};
	if (!originalUser || !updatedFormData) return changes;

	Object.keys(updatedFormData).forEach((key) => {
		if (key === 'isSponsor') return;
		if (
			JSON.stringify(originalUser[key]) !== JSON.stringify(updatedFormData[key])
		) {
			changes[key] = updatedFormData[key];
		}
	});

	return changes;
};

const EditUserModal = ({ isOpen, onClose, user, onSave, setFeedback }) => {
	const [formData, setFormData] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [validationErrors, setValidationErrors] = useState([]);
	const [conflictState, setConflictState] = useState(null);
	const [expandedAccordions, setExpandedAccordions] = useState({});
	const [promotionType, setPromotionType] = useState('yearly');

	const schoolProfile = useSchoolStore((state) => state.school);

	useEffect(() => {
		if (user) {
			const userData = JSON.parse(JSON.stringify(user));
			setFormData(userData);
			setValidationErrors([]);
			setConflictState(null);

			if (user.role === 'teacher' && user.subjects) {
				const initialAccordions = {};
				user.subjects.forEach((s) => {
					if (s.session) {
						initialAccordions[s.session] = true;
					}
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
	const getAllClassesForSession = (session) => {
		if (!schoolProfile?.classLevels?.[session]) return [];
		return Object.values(schoolProfile.classLevels[session]).flatMap(
			(level) => level.classes || []
		);
	};
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

	const handleStudentSessionChange = (newSession) => {
		setFormData((prev) => ({
			...prev,
			session: newSession,
			classId: '',
			className: '',
			classLevel: '',
		}));
	};

	const handleStudentClassChange = (newClassId) => {
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
			let existingSubjects = prev.subjects || [];
			// Clear self-contained selection for the session if a regular subject is selected
			const selfContainedInSession = existingSubjects.some(
				(s) => s.session === session && s.level === 'Self Contained'
			);

			if (selfContainedInSession) {
				existingSubjects = existingSubjects.filter(
					(s) => s.session !== session || s.level !== 'Self Contained'
				);
			}

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
			return {
				...prev,
				subjects: updatedSubjects,
				sponsorClass: selfContainedInSession ? null : prev.sponsorClass,
			};
		});
	};

	const handleSponsorClassChange = (value) => {
		setFormData((prev) => ({
			...prev,
			sponsorClass: value === '__none__' ? null : value,
		}));
	};

	const handleSave = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setValidationErrors([]);
		setConflictState(null);

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
				body: JSON.stringify({ ...changedData, forceAssignments: false }),
			});
			const data = await res.json();

			if (!res.ok) {
				if (res.status === 409 && data.requiresConfirmation) {
					setConflictState({
						conflicts: data.conflicts || [],
						conflictSummary: data.conflictSummary || {},
						errors: data.errors || [],
						changedData,
					});
				} else if (res.status === 400 && data.errors) {
					setValidationErrors(data.errors);
				} else {
					setValidationErrors([
						{ message: data.message || 'An unexpected error occurred.' },
					]);
				}
				setIsLoading(false);
				return;
			}

			if (data.reassignments?.performed) {
				setFeedback({
					type: 'success',
					message: `User updated successfully. ${data.reassignments.count} assignment(s) were reassigned.`,
				});
			} else {
				setFeedback({ type: 'success', message: 'User updated successfully.' });
			}
			onSave(data.data.user);
		} catch (err) {
			setValidationErrors([
				{ message: err.message || 'A network error occurred.' },
			]);
			setIsLoading(false);
		}
	};

	const handleConfirmReassignment = async () => {
		if (!conflictState?.changedData) return;
		setIsLoading(true);
		setValidationErrors([]);

		try {
			const res = await fetch(`/api/users?id=${user._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...conflictState.changedData,
					confirmReassignments: true,
				}),
			});
			const data = await res.json();

			if (!res.ok) {
				throw new Error(
					data.message || 'Failed to update user with reassignments.'
				);
			}

			if (data.reassignments?.performed) {
				setFeedback({
					type: 'success',
					message: `User updated successfully. ${data.reassignments.count} assignment(s) were reassigned from other teachers.`,
				});
			} else {
				setFeedback({ type: 'success', message: 'User updated successfully.' });
			}
			onSave(data.data.user);
		} catch (err) {
			setValidationErrors([{ message: err.message }]);
		} finally {
			setIsLoading(false);
			setConflictState(null);
		}
	};

	const toggleAccordion = (session) => {
		setExpandedAccordions((prev) => ({ ...prev, [session]: !prev[session] }));
	};

	const handlePromotion = () => {
		// Logic for promotion will go here
		console.log(`Promoting student with type: ${promotionType}`);
	};

	const handleDemotion = () => {
		// Logic for demotion will go here
		console.log(`Demoting student with type: ${promotionType}`);
	};

	if (!isOpen || !formData) return null;

	return (
		<>
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
				<div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border">
					<header className="flex justify-between items-center p-4 sm:p-6 border-b border-border flex-shrink-0">
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
					</header>

					<main className="overflow-y-auto flex-grow p-4 sm:p-8 space-y-6">
						{validationErrors.length > 0 && (
							<div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
								<p className="font-semibold flex items-center mb-2">
									<AlertTriangle className="h-4 w-4 mr-2" />
									Please fix the following issues:
								</p>
								<ul className="list-disc pl-5 space-y-1">
									{validationErrors.map((err, index) => (
										<li key={index}>{err.message}</li>
									))}
								</ul>
							</div>
						)}

						<section>
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
						</section>

						{user.role === 'student' && (
							<section>
								<h5 className="font-semibold mb-3 text-lg border-b pb-2">
									Academic Information
								</h5>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-foreground mb-1">
											Session
										</label>
										<Select
											value={formData.session || ''}
											onValueChange={handleStudentSessionChange}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select Session" />
											</SelectTrigger>
											<SelectContent>
												{getSessions().map((session) => (
													<SelectItem key={session} value={session}>
														{session}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div>
										<label className="block text-sm font-medium text-foreground mb-1">
											Class
										</label>
										<Select
											value={formData.classId || ''}
											onValueChange={handleStudentClassChange}
											disabled={!formData.session}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select Class" />
											</SelectTrigger>
											<SelectContent>
												{formData.session &&
													getClassLevels(formData.session).map((level) => (
														<React.Fragment key={level}>
															<div className="px-2 py-1.5 text-sm font-semibold">
																{level}
															</div>
															{getAllClassesWithLevelsForSession(
																formData.session
															)
																.filter((cls) => cls.level === level)
																.map((cls) => (
																	<SelectItem
																		key={cls.classId}
																		value={cls.classId}
																	>
																		{cls.name}
																	</SelectItem>
																))}
														</React.Fragment>
													))}
											</SelectContent>
										</Select>
									</div>
								</div>
							</section>
						)}

						{user.role === 'student' && (
							<section>
								<h5 className="font-semibold mb-3 text-lg border-b pb-2">
									Promotion & Demotion
								</h5>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-foreground mb-2">
											Action Type
										</label>
										<div className="flex items-center space-x-4">
											{[
												{ value: 'yearly', label: 'Yearly' },
												{ value: 'double', label: 'Semester (Double)' },
											].map((item) => {
												const isSelected = promotionType === item.value;
												return (
													<label
														key={item.value}
														className={`relative flex items-center justify-center rounded-2xl border p-4 cursor-pointer transition-all duration-300 w-full
                                ${
																	isSelected
																		? 'border-primary bg-primary/10 shadow-md'
																		: 'border-muted hover:border-primary/50'
																}
                              `}
													>
														<input
															type="radio"
															name="promotionType"
															value={item.value}
															checked={isSelected}
															onChange={(e) => setPromotionType(e.target.value)}
															className="absolute opacity-0"
														/>
														<motion.div
															className="flex items-center justify-center gap-2"
															initial={{ scale: 0.95 }}
															animate={{
																scale: isSelected ? 1.05 : 1,
															}}
															transition={{ duration: 0.2 }}
														>
															{isSelected && (
																<CheckCircle2 className="w-5 h-5 text-primary transition-opacity duration-300" />
															)}
															<span className="text-foreground font-medium">
																{item.label}
															</span>
														</motion.div>
													</label>
												);
											})}
										</div>
									</div>
								</div>
							</section>
						)}

						{user.role === 'administrator' && (
							<section>
								<h5 className="font-semibold mb-3 text-lg border-b pb-2">
									Administrative Information
								</h5>
								<div>
									<label className="block text-sm font-medium text-foreground mb-1">
										Position
									</label>
									<Select
										value={formData.position}
										onValueChange={(value) =>
											handleInputChange({
												target: { name: 'position', value },
											})
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select Position" />
										</SelectTrigger>
										<SelectContent>
											{adminPositions.map((pos) => (
												<SelectItem key={pos} value={pos}>
													{pos}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</section>
						)}

						{user.role === 'teacher' && schoolProfile && (
							<section>
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
												className="flex justify-between items-center w-full p-3 font-medium text-left bg-muted/50 hover:bg-muted/80 rounded-t-lg"
											>
												<span>{session} Session</span>
												<ChevronDown
													className={`w-5 h-5 transition-transform ${
														expandedAccordions[session] ? 'rotate-180' : ''
													}`}
												/>
											</button>
											<AnimatePresence>
												{expandedAccordions[session] && (
													<motion.div
														initial={{ opacity: 0, height: 0 }}
														animate={{ opacity: 1, height: 'auto' }}
														exit={{ opacity: 0, height: 0 }}
														className="p-4 space-y-4 border-t border-border"
													>
														<div>
															<label className="block text-sm font-medium text-foreground mb-2">
																Class Sponsorship
															</label>
															<Select
																value={formData.sponsorClass || '__none__'}
																onValueChange={handleSponsorClassChange}
															>
																<SelectTrigger>
																	<SelectValue placeholder="No sponsorship" />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="__none__">
																		No sponsorship
																	</SelectItem>
																	{getAllClassesForSession(session).map(
																		(cls) => (
																			<SelectItem
																				key={cls.classId}
																				value={cls.classId}
																			>
																				{cls.name}
																			</SelectItem>
																		)
																	)}
																</SelectContent>
															</Select>
															{formData.sponsorClass && (
																<p className="text-xs text-green-600 mt-1">
																	This teacher will be assigned as sponsor for
																	the selected class
																</p>
															)}
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
																			).map((subject) => {
																				const isChecked = (
																					formData.subjects || []
																				).some(
																					(s) =>
																						s.subject === subject &&
																						s.level === level &&
																						s.session === session
																				);
																				return (
																					<motion.label
																						key={`${subject}-${level}`}
																						whileHover={{
																							scale: 1.03,
																						}}
																						className={`relative flex items-center rounded-lg border p-2 cursor-pointer transition-all text-sm
                                        ${
																					isChecked
																						? 'border-primary bg-primary/10 shadow-sm'
																						: 'border-muted hover:border-primary/40 hover:bg-accent/5'
																				}`}
																					>
																						<input
																							type="checkbox"
																							checked={isChecked}
																							onChange={(e) =>
																								handleSubjectChange(
																									subject,
																									level,
																									session,
																									e.target.checked
																								)
																							}
																							className="absolute opacity-0"
																						/>
																						<span className="ml-1 text-foreground">
																							{subject}
																						</span>
																					</motion.label>
																				);
																			})}
																		</div>
																	</div>
																))}
															</div>
														</div>
													</motion.div>
												)}
											</AnimatePresence>
										</div>
									))}
								</div>
							</section>
						)}
					</main>

					<footer className="p-4 sm:p-6 bg-muted/50 border-t border-border rounded-b-xl flex-shrink-0 flex justify-between items-center">
						<div>
							{user.role === 'student' && (
								<div className="flex gap-2">
									<button
										type="button"
										onClick={handlePromotion}
										className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
									>
										Promote Student
									</button>
									<button
										type="button"
										onClick={handleDemotion}
										className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
									>
										Demote Student
									</button>
								</div>
							)}
						</div>
						<div className="text-right">
							<button
								type="button"
								onClick={onClose}
								className="px-6 py-2 rounded-lg hover:bg-muted/80 mr-2"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSave}
								disabled={isLoading || !!conflictState}
								className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed"
							>
								{isLoading ? 'Saving...' : 'Save Changes'}
							</button>
						</div>
					</footer>
				</div>
			</div>
			<ConflictModal
				isOpen={!!conflictState}
				onClose={() => setConflictState(null)}
				conflictState={conflictState}
				onConfirm={handleConfirmReassignment}
				isLoading={isLoading}
				userName={`${formData.firstName} ${formData.lastName}`}
			/>
		</>
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
