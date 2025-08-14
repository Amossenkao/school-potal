// src/components/modals/ResetPasswordModal.jsx
import React, { useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

const ResetPasswordModal = ({
	isOpen,
	onClose,
	resetPasswordUser,
	onResetSuccess,
}) => {
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [modalFeedback, setModalFeedback] = useState({
		type: '',
		message: '',
	});

	if (!resetPasswordUser) {
		return null;
	}

	const getFullName = (user) => {
		const names = [user.firstName, user.middleName, user.lastName].filter(
			Boolean
		);
		return names.join(' ');
	};

	const resetUserPassword = async () => {
		if (!newPassword.trim() || !confirmPassword.trim()) {
			setModalFeedback({
				type: 'error',
				message: 'Please fill in both password fields',
			});
			return;
		}
		if (newPassword !== confirmPassword) {
			setModalFeedback({ type: 'error', message: 'Passwords do not match' });
			return;
		}
		if (newPassword.length < 8) {
			setModalFeedback({
				type: 'error',
				message: 'Password must be at least 8 characters long',
			});
			return;
		}

		setIsProcessing(true);
		setModalFeedback({ type: '', message: '' });
		try {
			const res = await fetch(`/api/users/?id=${resetPasswordUser._id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					password: newPassword,
					action: 'reset_password',
				}),
			});

			const result = await res.json();
			if (result.success) {
				onResetSuccess();
				onClose();
			} else {
				setModalFeedback({
					type: 'error',
					message: result.message || 'Failed to reset password',
				});
			}
		} catch (error) {
			setModalFeedback({
				type: 'error',
				message: 'Network error: Unable to reset password',
			});
		} finally {
			setIsProcessing(false);
		}
	};

	const resetModalState = () => {
		setNewPassword('');
		setConfirmPassword('');
		setModalFeedback({ type: '', message: '' });
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={resetModalState}>
			<div className="bg-card rounded-lg border border-border p-6 w-full max-w-md">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-foreground">
						Reset Password
					</h2>
					<button
						onClick={resetModalState}
						className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<p className="text-sm text-muted-foreground mb-4">
					Reset password for <strong>{getFullName(resetPasswordUser)}</strong>
				</p>
				{modalFeedback.message && (
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
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							New Password
						</label>
						<div className="relative">
							<input
								type={showNewPassword ? 'text' : 'password'}
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="Enter new password"
								className="w-full p-2 pr-10 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
							/>
							<button
								type="button"
								onClick={() => setShowNewPassword(!showNewPassword)}
								className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								{showNewPassword ? (
									<EyeOff className="h-4 w-4" />
								) : (
									<Eye className="h-4 w-4" />
								)}
							</button>
						</div>
					</div>
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Confirm Password
						</label>
						<div className="relative">
							<input
								type={showConfirmPassword ? 'text' : 'password'}
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="Confirm new password"
								className="w-full p-2 pr-10 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
							/>
							<button
								type="button"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								{showConfirmPassword ? (
									<EyeOff className="h-4 w-4" />
								) : (
									<Eye className="h-4 w-4" />
								)}
							</button>
						</div>
					</div>
					<p className="text-xs text-muted-foreground">
						Password must be at least 8 characters long.
					</p>
				</div>
				<div className="flex gap-3 mt-6">
					<button
						onClick={resetModalState}
						className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
						disabled={isProcessing}
					>
						Cancel
					</button>
					<button
						onClick={resetUserPassword}
						className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
						disabled={isProcessing || !newPassword || !confirmPassword}
					>
						{isProcessing ? 'Resetting...' : 'Reset Password'}
					</button>
				</div>
			</div>
		</Modal>
	);
};

export default ResetPasswordModal;
