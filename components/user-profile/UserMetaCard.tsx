'use client';
import React, { useState } from 'react';
import useAuth from '@/store/useAuth';
import { PageLoading } from '../loading';
import AvatarPicker from '@/components/avatarPicker';

export default function UserMetaCard() {
	const { user, setUser }: any = useAuth(); // Assuming setUser is available in your auth store
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState({ message: '', type: '' });

	const handleAvatarSave = async (newAvatarUrl: string) => {
		if (!user) return;
		setIsSaving(true);
		setFeedback({ message: '', type: '' });

		try {
			// API call to update the user's avatar
			const response = await fetch(`/api/users/${user._id}/avatar`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ avatar: newAvatarUrl }),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Failed to update avatar.');
			}

			// Update user state in Zustand store
			const updatedUser = { ...user, avatar: newAvatarUrl };
			setUser(updatedUser);

			setFeedback({ message: 'Avatar updated successfully!', type: 'success' });
		} catch (error) {
			setFeedback({ message: error.message, type: 'error' });
		} finally {
			setIsSaving(false);
			// Hide feedback message after 3 seconds
			setTimeout(() => setFeedback({ message: '', type: '' }), 3000);
		}
	};

	if (!user) {
		return <PageLoading />;
	}

	return (
		<>
			<div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
				<div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
					<div className="flex flex-col items-center w-full gap-6 xl:flex-row">
						<div className="flex-shrink-0">
							<AvatarPicker
								gender={user.gender.toLowerCase()}
								initialAvatarUrl={user.avatar}
								onAvatarSelect={handleAvatarSave}
							/>
						</div>
						<div className="order-3 text-center xl:text-left xl:order-2">
							<h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
								{user.firstName} {user.lastName}
							</h4>
							<div className="flex flex-col items-center gap-1 xl:flex-row xl:gap-3">
								<p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
									{user.role.replace('_', ' ')}
								</p>
								<div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									{user.address}
								</p>
							</div>
							{isSaving && (
								<p className="text-sm text-blue-500 mt-2">Saving...</p>
							)}
							{feedback.message && (
								<p
									className={`text-sm mt-2 ${
										feedback.type === 'success'
											? 'text-green-500'
											: 'text-red-500'
									}`}
								>
									{feedback.message}
								</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
