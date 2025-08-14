// src/components/modals/ViewUserModal.jsx
import React from 'react';
import { Modal } from '@/components/ui/modal';
import { classIds } from '@/types';

const ViewUserModal = ({ isOpen, onClose, viewingUser }) => {
	if (!viewingUser) {
		return null;
	}

	const getFullName = (user) => {
		const names = [user.firstName, user.middleName, user.lastName].filter(
			Boolean
		);
		return names.join(' ');
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
				<div>
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-lg font-semibold text-foreground">
							User Profile
						</h2>
					</div>
					{viewingUser.avatar && (
						<div className="m-6 ">
							<img
								src={viewingUser.avatar}
								width={100}
								className="rounded-full"
							/>
						</div>
					)}
					<div className="space-y-6">
						<div>
							<h3 className="text-md font-medium text-foreground mb-3">
								Basic Information
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-muted-foreground">
										Full Name
									</label>
									<p className="text-sm text-foreground">
										{getFullName(viewingUser)}
									</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-muted-foreground">
										Username
									</label>
									<p className="text-sm text-foreground">
										{viewingUser.username}
									</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-muted-foreground">
										Gender
									</label>
									<p className="text-sm text-foreground">
										{viewingUser.gender}
									</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-muted-foreground">
										Date of Birth
									</label>
									<p className="text-sm text-foreground">
										{viewingUser.dateOfBirth
											? new Date(viewingUser.dateOfBirth).toLocaleDateString()
											: 'N/A'}
									</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-muted-foreground">
										Phone
									</label>
									<p className="text-sm text-foreground">
										{viewingUser.phone || 'N/A'}
									</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-muted-foreground">
										Email
									</label>
									<p className="text-sm text-foreground">
										{viewingUser.email || 'N/A'}
									</p>
								</div>
							</div>
							<div className="mt-4">
								<label className="block text-sm font-medium text-muted-foreground">
									Address
								</label>
								<p className="text-sm text-foreground">
									{viewingUser.address || 'N/A'}
								</p>
							</div>
							{viewingUser.bio && (
								<div className="mt-4">
									<label className="block text-sm font-medium text-muted-foreground">
										Bio
									</label>
									<p className="text-sm text-foreground">{viewingUser.bio}</p>
								</div>
							)}
						</div>

						<div className="border-t pt-4">
							<h3 className="text-md font-medium text-foreground mb-3">
								Role Information
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-muted-foreground">
										Role
									</label>
									<p className="text-sm text-foreground capitalize">
										{viewingUser.role}
									</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-muted-foreground">
										Status
									</label>
									<p className="text-sm text-foreground">
										{viewingUser.status ||
											(viewingUser.isActive !== false ? 'Active' : 'Inactive')}
									</p>
								</div>
							</div>
							{viewingUser.role === 'student' && (
								<div className="mt-4 space-y-4">
									<div>
										<label className="block text-sm font-medium text-muted-foreground">
											Class
										</label>
										<p className="text-sm text-foreground">
											{viewingUser.classId
												? getClassDisplayName(viewingUser.classId)
												: 'N/A'}
										</p>
									</div>
									{viewingUser.guardian && (
										<div>
											<h4 className="text-sm font-medium text-foreground mb-2">
												Guardian Information
											</h4>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
												<div>
													<span className="text-muted-foreground">Name:</span>
													<span className="ml-2 text-foreground">
														{[
															viewingUser.guardian.firstName,
															viewingUser.guardian.middleName,
															viewingUser.guardian.lastName,
														]
															.filter(Boolean)
															.join(' ')}
													</span>
												</div>
												<div>
													<span className="text-muted-foreground">Phone:</span>
													<span className="ml-2 text-foreground">
														{viewingUser.guardian.phone || 'N/A'}
													</span>
												</div>
												<div>
													<span className="text-muted-foreground">Email:</span>
													<span className="ml-2 text-foreground">
														{viewingUser.guardian.email || 'N/A'}
													</span>
												</div>
												<div className="md:col-span-2">
													<span className="text-muted-foreground">
														Address:
													</span>
													<span className="ml-2 text-foreground">
														{viewingUser.guardian.address || 'N/A'}
													</span>
												</div>
											</div>
										</div>
									)}
								</div>
							)}
							{viewingUser.role === 'teacher' && (
								<div className="mt-4 space-y-4">
									{viewingUser.subjects && viewingUser.subjects.length > 0 && (
										<div>
											<label className="block text-sm font-medium text-muted-foreground mb-2">
												Subjects & Levels
											</label>
											<div className="space-y-1">
												{viewingUser.subjects.map((subject, index) => (
													<p key={index} className="text-sm text-foreground">
														{subject.subject} - {subject.level}
													</p>
												))}
											</div>
										</div>
									)}
									{viewingUser.isSponsor && (
										<div>
											<label className="block text-sm font-medium text-muted-foreground">
												Class Sponsor
											</label>
											<p className="text-sm text-foreground">
												{viewingUser.sponsorClass
													? getClassDisplayName(viewingUser.sponsorClass)
													: 'Yes'}
											</p>
										</div>
									)}
								</div>
							)}
							{viewingUser.role === 'administrator' && (
								<div className="mt-4 space-y-4">
									<div>
										<label className="block text-sm font-medium text-muted-foreground">
											Position
										</label>
										<p className="text-sm text-foreground">
											{viewingUser.position || 'N/A'}
										</p>
									</div>
									{viewingUser.permissions &&
										viewingUser.permissions.length > 0 && (
											<div>
												<label className="block text-sm font-medium text-muted-foreground mb-2">
													Permissions
												</label>
												<div className="flex flex-wrap gap-1">
													{viewingUser.permissions.map((permission, index) => (
														<span
															key={index}
															className="px-2 py-1 bg-muted text-xs rounded"
														>
															{permission.replace(/_/g, ' ')}
														</span>
													))}
												</div>
											</div>
										)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</Modal>
	);
};

export default ViewUserModal;
