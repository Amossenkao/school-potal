import React, { useState } from 'react';

const DeactivateUserModal = ({
	isOpen,
	onClose,
	user,
	onSuccess,
	setFeedback,
}) => {
	const [isLoading, setIsLoading] = useState(false);

	const handleConfirm = async () => {
		setIsLoading(true);
		try {
			const res = await fetch(`/api/users/${user._id}/status`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !user.isActive }),
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.message || 'Failed to update status.');
			}
			onSuccess(data.data);
			onClose();
		} catch (err) {
			setFeedback({ type: 'error', message: err.message });
		} finally {
			setIsLoading(false);
		}
	};

	if (!isOpen) return null;

	const actionText = user.isActive ? 'Deactivate' : 'Activate';

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full space-y-4 text-center">
				<h4 className="text-xl font-semibold text-foreground">
					{actionText} User
				</h4>
				<p className="text-sm text-muted-foreground">
					Are you sure you want to {actionText.toLowerCase()} the account for{' '}
					<span className="font-bold">
						{user.firstName} {user.lastName}
					</span>
					?
				</p>
				<div className="flex justify-center gap-4 mt-4">
					<button
						onClick={onClose}
						className="px-6 py-2 bg-muted text-muted-foreground rounded-lg"
					>
						Cancel
					</button>
					<button
						onClick={handleConfirm}
						disabled={isLoading}
						className={`px-6 py-2 text-white rounded-lg ${
							user.isActive ? 'bg-red-600' : 'bg-green-600'
						}`}
					>
						{isLoading ? 'Processing...' : `Confirm ${actionText}`}
					</button>
				</div>
			</div>
		</div>
	);
};

export default DeactivateUserModal;
