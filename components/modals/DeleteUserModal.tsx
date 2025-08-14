// src/components/modals/DeleteUserModal.jsx
import React, { useState } from 'react';
import { AlertTriangle, Eye, EyeOff, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

const DeleteUserModal = ({
	isOpen,
	onClose,
	deletingUser,
	onDeleteSuccess,
	setFeedback,
}) => {
	const [adminPassword, setAdminPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [otp, setOtp] = useState('');
	const [showOtpField, setShowOtpField] = useState(false);
	const [otpSessionId, setOtpSessionId] = useState('');
	const [isProcessing, setIsProcessing] = useState(false);
	const [modalFeedback, setModalFeedback] = useState({
		type: '',
		message: '',
	});

	if (!deletingUser) {
		return null;
	}

	const getFullName = (user) => {
		const names = [user.firstName, user.middleName, user.lastName].filter(
			Boolean
		);
		return names.join(' ');
	};

	const requestOtp = async () => {
		if (!adminPassword.trim()) {
			setModalFeedback({
				type: 'error',
				message: 'Please enter your admin password',
			});
			return;
		}

		setIsProcessing(true);
		setModalFeedback({ type: '', message: '' });

		try {
			const res = await fetch('/api/users', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					adminPassword,
					targetUserId: deletingUser._id,
					action: 'request_delete_otp',
				}),
			});

			const result = await res.json();
			if (res.ok && result.success && result.sessionId) {
				setOtpSessionId(result.sessionId);
				setShowOtpField(true);
				setModalFeedback({
					type: 'success',
					message: result.message || 'OTP sent to your registered email/phone',
				});
			} else {
				setModalFeedback({
					type: 'error',
					message: result.message || 'Failed to send OTP',
				});
			}
		} catch (error) {
			setModalFeedback({
				type: 'error',
				message: 'Network error: Unable to request OTP',
			});
		} finally {
			setIsProcessing(false);
		}
	};

	const confirmDelete = async () => {
		if (!otp.trim()) {
			setModalFeedback({ type: 'error', message: 'Please enter the OTP' });
			return;
		}
		if (!otpSessionId) {
			setModalFeedback({
				type: 'error',
				message: 'OTP session is missing. Please request OTP again.',
			});
			return;
		}

		setIsProcessing(true);
		setModalFeedback({ type: '', message: '' });

		try {
			const res = await fetch('/api/users', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					sessionId: otpSessionId,
					otp,
					targetUserId: deletingUser._id,
					action: 'confirm_delete',
				}),
			});

			const result = await res.json();
			if (res.ok && result.success) {
				onDeleteSuccess(deletingUser._id);
				onClose();
				setFeedback({
					type: 'success',
					message: result.message || 'User deleted successfully',
				});
			} else {
				setModalFeedback({
					type: 'error',
					message: result.message || 'Failed to delete user',
				});
			}
		} catch (error) {
			setModalFeedback({
				type: 'error',
				message: 'Network error: Unable to delete user',
			});
		} finally {
			setIsProcessing(false);
		}
	};

	const resetModalState = () => {
		setAdminPassword('');
		setOtp('');
		setShowOtpField(false);
		setOtpSessionId('');
		setModalFeedback({ type: '', message: '' });
		setIsProcessing(false);
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={resetModalState}>
			<div className="bg-card rounded-lg border border-border p-6 w-full max-w-md">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-red-100 rounded-full">
							<AlertTriangle className="h-5 w-5 text-red-600" />
						</div>
						<h2 className="text-lg font-semibold text-foreground">
							Confirm Deletion
						</h2>
					</div>
					<button
						onClick={resetModalState}
						className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
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
					<div className="bg-red-50 border border-red-200 rounded-lg p-4">
						<p className="text-sm text-red-800 font-medium mb-2">
							⚠️ This action cannot be undone!
						</p>
						<p className="text-sm text-red-700">
							You are about to permanently delete{' '}
							<strong>{getFullName(deletingUser)}</strong> ({deletingUser.role}
							).
						</p>
						{deletingUser.role === 'student' && (
							<p className="text-sm text-red-700 mt-2">
								All academic records, grades, and attendance data will be
								permanently deleted.
							</p>
						)}
					</div>
					{!showOtpField ? (
						<div>
							<label className="block text-sm font-medium text-foreground mb-2">
								Admin Password *
							</label>
							<div className="relative">
								<input
									type={showPassword ? 'text' : 'password'}
									value={adminPassword}
									onChange={(e) => setAdminPassword(e.target.value)}
									placeholder="Enter your admin password"
									className="w-full p-2 pr-10 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>
					) : (
						<div>
							<label className="block text-sm font-medium text-foreground mb-2">
								One-Time Password *
							</label>
							<input
								type="text"
								value={otp}
								onChange={(e) => setOtp(e.target.value)}
								placeholder="Enter the OTP sent to your email/phone"
								className="w-full p-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
								maxLength={6}
							/>
							<p className="text-xs text-muted-foreground mt-1">
								Check your email or phone for the verification code
							</p>
						</div>
					)}
				</div>
				<div className="flex gap-3 mt-6">
					<button
						onClick={resetModalState}
						className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
						disabled={isProcessing}
					>
						Cancel
					</button>
					{!showOtpField ? (
						<button
							onClick={requestOtp}
							className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
							disabled={!adminPassword || isProcessing}
						>
							{isProcessing ? 'Sending...' : 'Send OTP'}
						</button>
					) : (
						<button
							onClick={confirmDelete}
							className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
							disabled={!otp || isProcessing}
						>
							{isProcessing ? 'Deleting...' : 'Delete User'}
						</button>
					)}
				</div>
			</div>
		</Modal>
	);
};

export default DeleteUserModal;
