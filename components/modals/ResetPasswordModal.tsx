// modals/ResetPasswordModal.tsx
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

const ResetPasswordModal = ({
	isOpen,
	onClose,
	resetPasswordUser,
	onResetSuccess,
}) => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const handleReset = async () => {
		setIsLoading(true);
		setError('');
		try {
			// Updated API endpoint to match the backend PUT method for resetting passwords
			const res = await fetch(
				`/api/users?id=${resetPasswordUser._id}&resetPassword=true`,
				{
					method: 'PUT',
				}
			);

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to reset password.');
			}
			const result = await res.json();
			onResetSuccess(result.data.resetInfo); // Pass the reset info up
			onClose();
		} catch (err) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full space-y-4 text-center">
				<h4 className="text-xl font-semibold text-foreground">
					Reset Password
				</h4>
				<p className="text-sm text-muted-foreground">
					Are you sure you want to reset the password for{' '}
					<span className="font-bold">
						{resetPasswordUser?.firstName} {resetPasswordUser?.lastName}
					</span>
					? This will revert it to the default password (
					{resetPasswordUser?.username}).
				</p>
				{error && <p className="text-sm text-red-500">{error}</p>}
				<div className="flex justify-center gap-4 mt-4">
					<button
						onClick={onClose}
						className="px-6 py-2 bg-muted text-muted-foreground rounded-lg"
					>
						Cancel
					</button>
					<button
						onClick={handleReset}
						disabled={isLoading}
						className="px-6 py-2 bg-primary text-primary-foreground rounded-lg flex items-center justify-center"
					>
						{isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
						{isLoading ? 'Resetting...' : 'Confirm'}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ResetPasswordModal;
