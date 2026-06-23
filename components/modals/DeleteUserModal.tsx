// modals/DeleteUserModal.tsx
import React, { useState } from 'react';
import { X, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';

const DeleteUserModal = ({
	isOpen,
	onClose,
	deletingUser,
	onDeleteSuccess,
	setFeedback,
}) => {
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const handleDeleteSubmit = async (e: any) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');
		try {
			const res = await fetch(`/api/users`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					adminPassword: password,
					targetUserId: deletingUser._id,
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(
					data.message || 'Incorrect password or failed to delete user.'
				);
			}
			onDeleteSuccess(deletingUser._id);
			handleClose();
			setFeedback({ type: 'success', message: 'User deleted successfully.' });
		} catch (err: any) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		setPassword('');
		setError('');
		setShowPassword(false);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border">
				<div className="flex justify-between items-center p-4 border-b border-border">
					<h4 className="text-lg font-semibold text-foreground">
						Confirm Deletion
					</h4>
					<button
						onClick={handleClose}
						className="p-2 rounded-full hover:bg-muted transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="p-6">
					<div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-start gap-3 mb-4">
						<AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
						<div>
							<p className="font-semibold">This action cannot be undone!</p>
							<p className="text-sm">
								You are about to permanently delete{' '}
								<span className="font-bold">
									{deletingUser.firstName} {deletingUser.lastName}
								</span>{' '}
								({deletingUser.role}).
							</p>
						</div>
					</div>

					{error && (
						<p className="text-sm text-red-600 bg-red-50 p-2 rounded-md mb-4">
							{error}
						</p>
					)}

					<form onSubmit={handleDeleteSubmit}>
						<label
							htmlFor="admin-password"
							className="block text-sm font-medium text-foreground mb-2"
						>
							Admin Password
						</label>
						<div className="relative">
							<input
								id="admin-password"
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full p-2 pr-10 border border-border rounded-lg bg-background"
								placeholder="Enter your admin password"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground"
							>
								{showPassword ? (
									<EyeOff className="h-5 w-5" />
								) : (
									<Eye className="h-5 w-5" />
								)}
							</button>
						</div>
						<div className="flex justify-end gap-3 mt-6">
							<button
								type="button"
								onClick={handleClose}
								className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isLoading || !password}
								className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 flex items-center"
							>
								{isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
								{isLoading ? 'Deleting...' : 'Confirm Delete'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default DeleteUserModal;
