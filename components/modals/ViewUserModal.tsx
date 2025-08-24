import React from 'react';
import { X } from 'lucide-react';

const ViewUserModal = ({ isOpen, onClose, viewingUser }) => {
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
							<span
								className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
									viewingUser.isActive
										? 'bg-green-100 text-green-800'
										: 'bg-red-100 text-red-800'
								}`}
							>
								{viewingUser.isActive ? 'Active' : 'Inactive'}
							</span>
						</div>

						{/* Right Column: Detailed Info */}
						<div className="col-span-1 md:col-span-2 space-y-6">
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
										value={new Date(
											viewingUser.dateOfBirth
										).toLocaleDateString()}
									/>
									<div className="sm:col-span-2">
										<InfoField label="Address" value={viewingUser.address} />
									</div>
								</div>
							</div>

							{viewingUser.role === 'student' && (
								<div>
									<h5 className="font-semibold mb-3 text-lg border-b pb-2">
										Academic Information
									</h5>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<InfoField
											label="Student ID"
											value={viewingUser.studentId}
										/>
										<InfoField label="Session" value={viewingUser.session} />
										<InfoField label="Class" value={viewingUser.className} />
										<InfoField
											label="Class Level"
											value={viewingUser.classLevel}
										/>
									</div>
								</div>
							)}

							{viewingUser.role === 'teacher' && (
								<div>
									<h5 className="font-semibold mb-3 text-lg border-b pb-2">
										Teaching Information
									</h5>
									<div className="space-y-4">
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<InfoField
												label="Teacher ID"
												value={viewingUser.teacherId}
											/>
											<InfoField
												label="Sponsor Class"
												value={viewingUser.sponsorClass}
											/>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">Subjects</p>
											<ul className="list-disc list-inside mt-1 text-md font-medium text-foreground">
												{viewingUser.subjects?.map((s, i) => (
													<li key={i}>
														{s.subject} ({s.level}, {s.session})
													</li>
												))}
											</ul>
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
										<InfoField label="Position" value={viewingUser.position} />
									</div>
								</div>
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
