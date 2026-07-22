'use client';

import React, { useEffect } from 'react';
import { Loader2, X } from 'lucide-react';

const ViewUserModal = ({
	isOpen,
	onClose,
	viewingUser,
	schoolProfile,
	isLoading,
}) => {
	useEffect(() => {
		if (!isOpen) return undefined;
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = originalOverflow;
		};
	}, [isOpen]);

	if (!isOpen || !viewingUser) return null;

	const getFullName = (user) => {
		return [user.firstName, user.middleName, user.lastName]
			.filter(Boolean)
			.join(' ');
	};

	const InfoField = ({ label, value }) => (
		<div>
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="text-md font-medium text-foreground">{value || 'N/A'}</p>
		</div>
	);

	const getClassNameFromId = (classId) => {
		if (!classId || !schoolProfile?.classLevels) return classId;
		for (const session of Object.values(schoolProfile.classLevels)) {
			if (!session || typeof session !== 'object') continue;
			for (const level of Object.values(session)) {
				if (!level?.classes || !Array.isArray(level.classes)) continue;
				const found = level.classes.find((cls) => cls.classId === classId);
				if (found) return found.name || classId;
			}
		}
		return classId;
	};

	const getYearsSpent = (user) => {
		if (user.role === 'student') {
			return user.academicYears?.length || 0;
		}
		if (user.role === 'teacher') {
			const years = new Set(
				(user.subjects || []).map((s) => s.year).filter(Boolean),
			);
			return years.size;
		}
		if (user.role === 'administrator') {
			return user.academicYears?.length || 0;
		}
		return 0;
	};

	const getTeacherCurrentYearData = (user) => {
		const years = (user.subjects || []).map((s) => s.year).filter(Boolean);
		if (years.length === 0) return null;
		const currentYear = years.sort((a, b) => b.localeCompare(a))[0];
		return (user.subjects || []).find((s) => s.year === currentYear) || null;
	};

	const getTeacherSubjects = (user) => {
		const toUniqueSubjectList = (items) => {
			const seen = new Set();
			const ordered = [];
			(items || []).forEach((item) => {
				let subjectName = '';
				if (typeof item === 'string') {
					subjectName = item.trim();
				} else if (item && typeof item === 'object') {
					subjectName = String(item.subject || item.name || '').trim();
				}
				if (!subjectName) return;
				const key = subjectName.toLowerCase();
				if (seen.has(key)) return;
				seen.add(key);
				ordered.push(subjectName);
			});
			return ordered;
		};

		if (Array.isArray(user.subjects)) {
			if (user.subjects.length === 0) return '';
			if (typeof user.subjects[0] === 'string') {
				return toUniqueSubjectList(user.subjects).join(', ');
			}
			const currentYear = getTeacherCurrentYearData(user);
			const subjects =
				currentYear?.classes?.flatMap((cls) => cls.subjects || []) || [];
			return toUniqueSubjectList(subjects).join(', ');
		}
		return '';
	};

	const getAcademicYearTimeline = (user) => {
		if (user.role !== 'student') return [];
		return (user.academicYears || [])
			.slice()
			.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
	};

	const getAdminTimeline = (user) => {
		if (user.role !== 'administrator') return [];
		return (user.academicYears || [])
			.slice()
			.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
	};

	const safeDate = (value) => {
		if (!value) return 'N/A';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
	};
	const showDetails = !isLoading;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border transform transition-all duration-300 ease-in-out">
				{/* Modal Header */}
				<div className="flex justify-between items-center p-4 sm:p-6 border-b border-border flex-shrink-0">
					<h4 className="text-xl md:text-2xl font-semibold text-foreground">
						User Profile
					</h4>
					<button
						onClick={onClose}
						className="p-2 rounded-full hover:bg-muted transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Modal Body with Scrolling */}
				<div className="overflow-y-auto flex-grow">
					<div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
						{/* Left Column: Avatar and Basic Info */}
						<div className="col-span-1 flex flex-col items-center text-center md:border-r md:pr-8">
							<img
								src={
									viewingUser.avatar ||
									`https://ui-avatars.com/api/?name=${getFullName(
										viewingUser
									)}&background=random`
								}
								alt={getFullName(viewingUser)}
								className="h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-primary/20 object-cover mb-4"
							/>
							<h3 className="text-lg md:text-xl font-bold text-foreground">
								{getFullName(viewingUser)}
							</h3>
							<p className="text-md text-muted-foreground capitalize">
								{viewingUser.role}
							</p>
						</div>

						{/* Right Column: Detailed Info */}
						<div className="col-span-1 md:col-span-2 space-y-6">
							{!showDetails && (
								<div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									<span>Loading profile details...</span>
								</div>
							)}

							{showDetails && (
								<>
									<div>
										<h5 className="font-semibold mb-3 text-lg border-b pb-2">
											Personal Information
										</h5>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<InfoField label="Email Address" value={viewingUser.email} />
											<InfoField label="Phone Number" value={viewingUser.phone} />
											<InfoField label="Gender" value={viewingUser.gender} />
											<InfoField
												label="Date of Birth"
												value={safeDate(viewingUser.dateOfBirth)}
											/>
											<div className="sm:col-span-2">
												<InfoField label="Address" value={viewingUser.address} />
											</div>
										</div>
									</div>

									{viewingUser.role === 'student' && (
										<>
											<div>
												<h5 className="font-semibold mb-3 text-lg border-b pb-2">
													Academic Information
												</h5>
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
													<InfoField
														label="Student ID"
														value={viewingUser.studentId}
													/>
													<InfoField
														label="Current Class"
														value={
															viewingUser.className ||
															getClassNameFromId(viewingUser.classId)
														}
													/>
												<InfoField
													label="Years with Institution"
													value={getYearsSpent(viewingUser)}
												/>
												<InfoField
													label="Student Type"
													value={
														viewingUser.isNewStudent
															? 'New Student'
															: 'Existing Student'
													}
												/>
											</div>
										</div>
											<div>
												<h5 className="font-semibold mb-3 text-lg border-b pb-2">
													Academic Year History
												</h5>
												<div className="space-y-3">
													{getAcademicYearTimeline(viewingUser).length === 0 && (
														<p className="text-sm text-muted-foreground">
															No academic history available.
														</p>
													)}
													{getAcademicYearTimeline(viewingUser).map(
														(entry, idx) => (
															<div
																key={`${entry.year}-${idx}`}
																className="flex items-start justify-between rounded-lg border border-border bg-muted/40 p-3"
															>
																<div>
																	<p className="text-sm font-medium text-foreground">
																		{entry.year || 'Unknown Year'}
																	</p>
																	<p className="text-xs text-muted-foreground">
																		Class:{' '}
																		{entry.className ||
																			getClassNameFromId(entry.classId) ||
																			'N/A'}
																	</p>
																</div>
															</div>
														),
													)}
												</div>
											</div>
											{viewingUser.guardian && (
												<div>
													<h5 className="font-semibold mb-3 text-lg border-b pb-2">
														Guardian Information
													</h5>
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
														<InfoField
															label="Guardian Name"
															value={
																viewingUser.guardian.firstName +
																' ' +
																(viewingUser.guardian.middleName || '') +
																' ' +
																viewingUser.guardian.lastName
															}
														/>
														<InfoField
															label="Guardian Phone"
															value={viewingUser.guardian.phone}
														/>
														<InfoField
															label="Guardian Email"
															value={viewingUser.guardian.email}
														/>
													</div>
												</div>
											)}
										</>
									)}

									{viewingUser.role === 'teacher' && (
										<div>
											<h5 className="font-semibold mb-3 text-lg border-b pb-2">
												Teaching Information
											</h5>
											<div className="space-y-4">
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
													<InfoField
														label="Username"
														value={viewingUser.username}
													/>
													<InfoField
														label="Sponsor Class"
														value={viewingUser.sponsorClass}
													/>
													<InfoField
														label="Subjects"
														value={getTeacherSubjects(viewingUser)}
													/>
													<InfoField
														label="Years with Institution"
														value={getYearsSpent(viewingUser)}
													/>
												</div>
												<div>
													<p className="text-sm text-muted-foreground">
														Current Subjects & Classes
													</p>
													{getTeacherCurrentYearData(viewingUser) ? (
														<div className="mt-2 space-y-2">
															{getTeacherCurrentYearData(viewingUser).classes?.map(
																(cls, idx) => (
																	<div
																		key={`${cls.classId}-${idx}`}
																		className="rounded-lg border border-border bg-muted/40 p-3"
																	>
																		<p className="text-sm font-medium text-foreground">
																			Class:{' '}
																			{cls.className ||
																				getClassNameFromId(cls.classId) ||
																				cls.classId}
																		</p>
																		<p className="text-xs text-muted-foreground">
																			Subjects:{' '}
																			{(cls.subjects || []).join(', ') || 'N/A'}
																		</p>
																	</div>
																),
															)}
														</div>
													) : (
														<p className="text-sm text-muted-foreground mt-1">
															No current assignments available.
														</p>
													)}
												</div>
											</div>
										</div>
									)}

									{viewingUser.role === 'administrator' && (
										<div>
											<h5 className="font-semibold mb-3 text-lg border-b pb-2">
												Administrative Information
											</h5>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
												<InfoField label="Admin ID" value={viewingUser.adminId} />
												<InfoField
													label="Position"
													value={viewingUser.position}
												/>
												<InfoField
													label="Years with Institution"
													value={getYearsSpent(viewingUser)}
												/>
											</div>
											<div className="mt-4">
												<p className="text-sm text-muted-foreground mb-2">
													Position Timeline
												</p>
												<div className="space-y-2">
													{getAdminTimeline(viewingUser).length === 0 && (
														<p className="text-sm text-muted-foreground">
															No administrative history available.
														</p>
													)}
													{getAdminTimeline(viewingUser).map((entry, idx) => (
														<div
															key={`${entry.year}-${idx}`}
															className="rounded-lg border border-border bg-muted/40 p-3"
														>
															<p className="text-sm font-medium text-foreground">
																{entry.year || 'Unknown Year'}
															</p>
															<p className="text-xs text-muted-foreground">
																Position: {entry.position || 'N/A'}
															</p>
														</div>
													))}
												</div>
											</div>
										</div>
									)}
								</>
							)}
						</div>
					</div>
				</div>

				{/* Modal Footer */}
				<div className="p-4 sm:p-6 bg-muted/50 border-t border-border text-right rounded-b-xl flex-shrink-0">
					<button
						onClick={onClose}
						className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
};

export default ViewUserModal;
