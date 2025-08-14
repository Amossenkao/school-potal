// src/components/modals/EditUserModal.jsx
import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { classIds } from '@/types';

const EditUserModal = ({ user, isOpen, onClose, onSave, setFeedback }) => {
	const [formData, setFormData] = useState({
		firstName: user.firstName || '',
		middleName: user.middleName || '',
		lastName: user.lastName || '',
		username: user.username || '',
		gender: user.gender || '',
		dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
		phone: user.phone || '',
		email: user.email || '',
		address: user.address || '',
		bio: user.bio || '',
		nickName: user.nickName || '',
		classId: user.classId || '',
		guardian: {
			firstName: user.guardian?.firstName || '',
			middleName: user.guardian?.middleName || '',
			lastName: user.guardian?.lastName || '',
			email: user.guardian?.email || '',
			phone: user.guardian?.phone || '',
			address: user.guardian?.address || '',
		},
		subjects: user.subjects || [],
		isSponsor: user.isSponsor || false,
		sponsorClass: user.sponsorClass || null,
		position: user.position || '',
		permissions: user.permissions || [],
	});

	const [isProcessing, setIsProcessing] = useState(false);
	const [modalFeedback, setModalFeedback] = useState({ type: '', message: '' });

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

	const handleSave = async () => {
		setIsProcessing(true);
		setModalFeedback({ type: '', message: '' });

		try {
			const res = await fetch(`/api/users/?id=${user._id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});

			const result = await res.json();
			if (result.success) {
				onSave(result.data);
				setFeedback({
					type: 'success',
					message: 'User updated successfully',
				});
				onClose();
			} else {
				setModalFeedback({
					type: 'error',
					message: result.message || 'Failed to update user',
				});
			}
		} catch (error) {
			setModalFeedback({
				type: 'error',
				message: 'Network error: Unable to update user',
			});
		} finally {
			setIsProcessing(false);
		}
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

	const getClassDisplayName = (classId) => {
		const cls = classIds.find((c) => c.id === classId);
		return cls ? `${cls.name} (${cls.level})` : classId;
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			isFullscreen={true}
			showCloseButton={true}
		>
			<div className="fixed top-0 left-0 flex flex-col w-full h-screen p-6 overflow-x-hidden overflow-y-auto bg-card dark:bg-gray-900 lg:p-10">
				<div className="flex-1 overflow-y-auto">
					{modalFeedback?.message && (
						<div
							className={`mb-4 px-4 py-2 rounded text-sm ${
								modalFeedback.type === 'success'
									? 'bg-green-100 text-green-800 border border-green-200'
									: 'bg-red-100 text-red-800 border border-red-200'
							}`}
						>
							{modalFeedback.message}
						</div>
					)}
					<div className="space-y-6">
						{/* Basic Information Section */}
						<div>
							<h3 className="text-lg font-medium text-foreground mb-4">
								Basic Information
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{/* Name fields */}
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
										className="w-full p-2 bg-background border border-border rounded-lg"
									/>
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
										className="w-full p-2 bg-background border border-border rounded-lg"
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
										className="w-full p-2 bg-background border border-border rounded-lg"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
								{/* Username, Gender, DOB */}
								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Username *
									</label>
									<input
										type="text"
										value={formData.username}
										onChange={(e) =>
											setFormData({ ...formData, username: e.target.value })
										}
										className="w-full p-2 bg-background border border-border rounded-lg"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Gender *
									</label>
									<select
										value={formData.gender}
										onChange={(e) =>
											setFormData({ ...formData, gender: e.target.value })
										}
										className="w-full p-2 bg-background border border-border rounded-lg"
									>
										<option value="">Select gender</option>
										<option value="Male">Male</option>
										<option value="Female">Female</option>
										<option value="Other">Other</option>
									</select>
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
										className="w-full p-2 bg-background border border-border rounded-lg"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
								{/* Phone, Email */}
								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Phone *
									</label>
									<input
										type="tel"
										value={formData.phone}
										onChange={(e) =>
											setFormData({ ...formData, phone: e.target.value })
										}
										className="w-full p-2 bg-background border border-border rounded-lg"
									/>
								</div>
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
										className="w-full p-2 bg-background border border-border rounded-lg"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
								{/* Nickname, Address */}
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
										className="w-full p-2 bg-background border border-border rounded-lg"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-foreground mb-2">
										Address *
									</label>
									<textarea
										value={formData.address}
										onChange={(e) =>
											setFormData({ ...formData, address: e.target.value })
										}
										className="w-full p-2 bg-background border border-border rounded-lg"
										rows="3"
									/>
								</div>
							</div>

							<div className="mt-4">
								{/* Bio */}
								<label className="block text-sm font-medium text-foreground mb-2">
									Bio
								</label>
								<textarea
									value={formData.bio}
									onChange={(e) =>
										setFormData({ ...formData, bio: e.target.value })
									}
									className="w-full p-2 bg-background border border-border rounded-lg"
									rows="3"
								/>
							</div>
						</div>

						{/* Role-specific Information Section */}
						<div className="border-t pt-6">
							<h3 className="text-lg font-medium text-foreground mb-4">
								Role-specific Information
							</h3>
							{user.role === 'student' && (
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-foreground mb-2">
											Class Assignment *
										</label>
										<select
											value={formData.classId}
											onChange={(e) =>
												setFormData({ ...formData, classId: e.target.value })
											}
											className="w-full p-2 bg-background border border-border rounded-lg"
										>
											<option value="">Select a class</option>
											{classIds.map((cls) => (
												<option key={cls.id} value={cls.id}>
													{getClassDisplayName(cls.id)}
												</option>
											))}
										</select>
									</div>
									<div className="border-t pt-4">
										<h4 className="text-sm font-medium text-foreground mb-3">
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
													className="w-full p-2 bg-background border border-border rounded-lg"
												/>
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
													className="w-full p-2 bg-background border border-border rounded-lg"
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
													className="w-full p-2 bg-background border border-border rounded-lg"
												/>
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
													className="w-full p-2 bg-background border border-border rounded-lg"
												/>
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
													className="w-full p-2 bg-background border border-border rounded-lg"
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
												className="w-full p-2 bg-background border border-border rounded-lg"
												rows="3"
											/>
										</div>
									</div>
								</div>
							)}
							{user.role === 'teacher' && (
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-foreground mb-2">
											Subjects & Levels
										</label>
										<div className="text-sm text-muted-foreground mb-2">
											Current subjects:{' '}
											{formData.subjects
												.map((s) => `${s.subject} (${s.level})`)
												.join(', ')}
										</div>
										<p className="text-sm text-muted-foreground">
											Subject editing requires advanced configuration. Please
											contact system administrator to modify teaching
											assignments.
										</p>
									</div>
									{formData.isSponsor && (
										<div>
											<label className="block text-sm font-medium text-foreground mb-2">
												Class Sponsorship
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
												className="w-full p-2 bg-background border border-border rounded-lg"
											>
												<option value="">No class sponsorship</option>
												{classIds.map((cls) => (
													<option key={cls.id} value={cls.id}>
														{getClassDisplayName(cls.id)}
													</option>
												))}
											</select>
										</div>
									)}
								</div>
							)}
							{user.role === 'administrator' && (
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-foreground mb-2">
											Position *
										</label>
										<select
											value={formData.position}
											onChange={(e) =>
												setFormData({ ...formData, position: e.target.value })
											}
											className="w-full p-2 bg-background border border-border rounded-lg"
										>
											<option value="">Select position</option>
											{adminPositions.map((position) => (
												<option key={position} value={position}>
													{position}
												</option>
											))}
										</select>
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
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
				<div className="flex items-center justify-end gap-3 p-6 border-t border-border">
					<button
						onClick={onClose}
						className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
						disabled={isProcessing}
					>
						Cancel
					</button>
					<button
						onClick={handleSave}
						className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
						disabled={isProcessing}
					>
						{isProcessing ? (
							<>
								<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
								Saving...
							</>
						) : (
							<>
								<Save className="w-4 h-4" />
								Save Changes
							</>
						)}
					</button>
				</div>
			</div>
		</Modal>
	);
};

export default EditUserModal;
