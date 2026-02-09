'use client';
import React, { useState } from 'react';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../ui/modal';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import useAuth from '@/store/useAuth';
import Spinner from '../ui/spinner';
import Switch from '@/components/form/switch/Switch';
import { Pencil } from 'lucide-react';

const InfoField = ({ label, value }: any) => (
	<div>
		<p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
			{label}
		</p>
		<p className="text-sm font-medium text-gray-800 dark:text-white/90">
			{value || 'N/A'}
		</p>
	</div>
);

export default function UserInfoCard() {
	const { isOpen, openModal, closeModal } = useModal();
	const { user, setUser } = useAuth();

	// State for form data
	const [formData, setFormData] = useState({
		email: '',
		phone: '',
		bio: '',
		nickName: '',
		shareContactWithClassmates: false,
	});
	const [initialFormData, setInitialFormData] = useState({
		email: '',
		phone: '',
		bio: '',
		nickName: '',
		shareContactWithClassmates: false,
	});
	const [editableFields, setEditableFields] = useState({
		email: true,
		phone: true,
		bio: true,
		nickName: true,
	});
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<any>({});

	if (!user) {
		return <Spinner />;
	}

	// Initialize form data when modal opens
	const handleOpenModal = () => {
		const nextData = {
			email: user?.email || '',
			phone: user?.phone || '',
			bio: user?.bio || '',
			nickName: user?.nickName || '',
			shareContactWithClassmates: Boolean(user?.shareContactWithClassmates),
		};
		setFormData(nextData);
		setInitialFormData(nextData);
		setEditableFields({
			email: !nextData.email,
			phone: !nextData.phone,
			bio: !nextData.bio,
			nickName: !nextData.nickName,
		});
		setErrors({});
		openModal();
	};

	// Handle form input changes
	const handleInputChange = (field: string, value: string | boolean) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
		// Clear error for this field when user starts typing
		if (errors[field as keyof typeof errors]) {
			setErrors((prev) => ({
				...prev,
				[field]: undefined,
			}));
		}
	};

	// Validate form data (only changed fields)
	const validateForm = (payload: Record<string, any>) => {
		const newErrors: any = {};

		// Email validation (only if provided)
		if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
			newErrors.email = 'Please enter a valid email address';
		}

		// Phone validation (optional but must be valid if provided)
		if (payload.phone && !/^\+?[\d\s-()]+$/.test(payload.phone)) {
			newErrors.phone = 'Please enter a valid phone number';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Implement the save functionality here
	const handleSave = async () => {
		const updatePayload: Record<string, any> = {};
		(Object.keys(formData) as Array<keyof typeof formData>).forEach((key) => {
			if (formData[key] !== initialFormData[key]) {
				updatePayload[key] = formData[key];
			}
		});

		if (Object.keys(updatePayload).length === 0) {
			closeModal();
			return;
		}

		if (!validateForm(updatePayload)) {
			return;
		}

		setIsLoading(true);
		try {
			// API call to update user profile (no ID needed for self-update)
			const response = await fetch(`/api/users`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(updatePayload),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Failed to update profile');
			}

			// Update user in the auth store with data from API response
			if (result.data && result.data.user) {
				setUser(result.data.user);
			}

			console.log('Profile updated successfully!');
			closeModal();
		} catch (error) {
			console.error('Error updating profile:', error);
			// Set error state to show user-friendly error message
			setErrors({
				general:
					error instanceof Error
						? error.message
						: 'Failed to update profile. Please try again.',
			});
		} finally {
			setIsLoading(false);
		}
	};

	const enableField = (field: keyof typeof editableFields) => {
		setEditableFields((prev) => ({ ...prev, [field]: true }));
	};

	return (
		<div
			className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6"
			data-theme="luxury"
		>
			<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
				<div className="w-full">
					<h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
						User Information
					</h4>

					{/* Personal Information */}
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
						<InfoField label="First Name" value={user.firstName} />
						<InfoField label="Last Name" value={user.lastName} />
						<InfoField label="Email address" value={user.email} />
						<InfoField label="Phone" value={user.phone} />
						<div className="lg:col-span-2">
							<InfoField label="Bio" value={user.bio} />
						</div>
					</div>

					{/* Role-Specific Information */}
					<div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
						{user.role === 'student' && (
							<>
								<h5 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-4">
									Academic Details
								</h5>
								<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
									<InfoField label="Student ID" value={user.studentId} />
									<InfoField label="Session" value={user.session} />
									<InfoField label="Class Level" value={user.classLevel} />
									<InfoField label="Class Name" value={user.className} />
								</div>
							</>
						)}

						{user.role === 'teacher' && (
							<>
								<h5 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-4">
									Teaching Details
								</h5>
								<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
									<InfoField label="Username" value={user.username} />
									<InfoField
										label="Sponsor Class"
										value={user.sponsorClass?.name || 'None'}
									/>
									<div className="lg:col-span-2">
										<p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
											Subjects
										</p>
										<div className="flex flex-wrap gap-2">
											{user.subjects?.map((s: any, i: number) => (
												<span
													key={i}
													className="text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-2.5 py-1 rounded-full"
												>
													{s.subject} ({s.level}, {s.session})
												</span>
											))}
										</div>
									</div>
								</div>
							</>
						)}

						{user.role === 'administrator' && (
							<>
								<h5 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-4">
									Administrative Details
								</h5>
								<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
									<InfoField label="Admin ID" value={user.adminId} />
									<InfoField label="Position" value={user.position} />
								</div>
							</>
						)}
					</div>
				</div>

				<button
					onClick={handleOpenModal}
					className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto flex-shrink-0"
				>
					<svg
						className="fill-current"
						width="18"
						height="18"
						viewBox="0 0 18 18"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							fillRule="evenodd"
							clipRule="evenodd"
							d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
							fill=""
						/>
					</svg>
					Edit
				</button>
			</div>

			<Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
				<div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
					<div className="px-2 pr-14">
						<h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
							Edit Personal Information
						</h4>
						<p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
							Update your details to keep your profile up-to-date.
						</p>
					</div>
					<form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
						<div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
							{/* Display general error if any */}
							{errors.general && (
								<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
									<p className="text-sm text-red-600">{errors.general}</p>
								</div>
							)}

							<div className="mt-7">
								<h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
									Personal Information
								</h5>
								<div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
									<div className="col-span-2 lg:col-span-1">
										<Label>First Name</Label>
										<Input
											type="text"
											value={user?.firstName || ''}
											readOnly
											disabled
											placeholder={user?.firstName || 'Not provided'}
											className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400"
										/>
										<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
											This field cannot be modified
										</p>
									</div>
									<div className="col-span-2 lg:col-span-1">
										<Label>Middle Name</Label>
										<Input
											type="text"
											value={user?.middleName || ''}
											readOnly
											disabled
											placeholder={user?.middleName || 'Not provided'}
											className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400"
										/>
										<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
											This field cannot be modified
										</p>
									</div>
									<div className="col-span-2 lg:col-span-1">
										<Label>Last Name</Label>
										<Input
											type="text"
											value={user?.lastName || ''}
											readOnly
											disabled
											placeholder={user?.lastName || 'Not provided'}
											className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400"
										/>
										<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
											This field cannot be modified
										</p>
									</div>
									<div className="col-span-2 lg:col-span-1">
										<div className="flex items-center justify-between">
											<Label>Email Address</Label>
											{initialFormData.email && !editableFields.email && (
												<button
													type="button"
													onClick={() => enableField('email')}
													className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
													aria-label="Edit email"
												>
													<Pencil className="h-4 w-4" />
												</button>
											)}
										</div>
										<Input
											type="email"
											value={formData.email}
											onChange={(e) =>
												handleInputChange('email', e.target.value)
											}
											readOnly={!editableFields.email}
											className={`${!editableFields.email ? 'bg-gray-50 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300' : ''} ${
												errors.email ? 'border-red-500' : ''
											}`}
										/>
										{errors.email && (
											<p className="mt-1 text-xs text-red-500">
												{errors.email}
											</p>
										)}
									</div>
									<div className="col-span-2 lg:col-span-1">
										<div className="flex items-center justify-between">
											<Label>Phone</Label>
											{initialFormData.phone && !editableFields.phone && (
												<button
													type="button"
													onClick={() => enableField('phone')}
													className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
													aria-label="Edit phone"
												>
													<Pencil className="h-4 w-4" />
												</button>
											)}
										</div>
										<Input
											type="tel"
											value={formData.phone}
											onChange={(e) =>
												handleInputChange('phone', e.target.value)
											}
											readOnly={!editableFields.phone}
											className={`${!editableFields.phone ? 'bg-gray-50 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300' : ''} ${
												errors.phone ? 'border-red-500' : ''
											}`}
										/>
										{errors.phone && (
											<p className="mt-1 text-xs text-red-500">
												{errors.phone}
											</p>
										)}
									</div>
									<div className="col-span-2 lg:col-span-1">
										<div className="flex items-center justify-between">
											<Label>Nickname</Label>
											{initialFormData.nickName &&
												!editableFields.nickName && (
													<button
														type="button"
														onClick={() => enableField('nickName')}
														className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
														aria-label="Edit nickname"
													>
														<Pencil className="h-4 w-4" />
													</button>
												)}
										</div>
										<Input
											type="text"
											value={formData.nickName}
											onChange={(e) =>
												handleInputChange('nickName', e.target.value)
											}
											readOnly={!editableFields.nickName}
											className={
												!editableFields.nickName
													? 'bg-gray-50 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300'
													: ''
											}
										/>
									</div>
									{user?.role === 'student' && (
										<div className="col-span-2 flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-3">
											<div>
												<p className="text-sm font-medium text-gray-800 dark:text-white/90">
													Share phone with classmates
												</p>
												<p className="text-xs text-gray-500 dark:text-gray-400">
													Allow classmates to see your phone number in the
													community list.
												</p>
											</div>
											<Switch
												checked={formData.shareContactWithClassmates}
												onChange={(checked) =>
													handleInputChange(
														'shareContactWithClassmates',
														checked,
													)
												}
											/>
										</div>
									)}
									<div className="col-span-2">
										<div className="flex items-center justify-between">
											<Label>Bio</Label>
											{initialFormData.bio && !editableFields.bio && (
												<button
													type="button"
													onClick={() => enableField('bio')}
													className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
													aria-label="Edit bio"
												>
													<Pencil className="h-4 w-4" />
												</button>
											)}
										</div>
										<Input
											type="text"
											value={formData.bio}
											onChange={(e) => handleInputChange('bio', e.target.value)}
											readOnly={!editableFields.bio}
											className={
												!editableFields.bio
													? 'bg-gray-50 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300'
													: ''
											}
										/>
									</div>
								</div>
							</div>
						</div>
						<div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
							<Button
								size="sm"
								variant="outline"
								onClick={closeModal}
								disabled={isLoading}
							>
								Close
							</Button>
							<Button size="sm" onClick={handleSave} disabled={isLoading}>
								{isLoading ? 'Saving...' : 'Save Changes'}
							</Button>
						</div>
					</form>
				</div>
			</Modal>
		</div>
	);
}
