import React, { useState } from 'react';
import { X, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const DeleteUserModal = ({
	isOpen,
	onClose,
	deletingUser,
	onDeleteSuccess,
	setFeedback,
}) => {
	const [step, setStep] = useState(1); // 1: password, 2: otp
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [otp, setOtp] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const handlePasswordSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');
		try {
			const res = await fetch(
				`/api/users/${deletingUser._id}/initiate-delete`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ adminPassword: password }),
				}
			);
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.message || 'Incorrect password.');
			}
			setStep(2);
		} catch (err) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleOtpSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');
		try {
			const res = await fetch(`/api/users/${deletingUser._id}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ otp }),
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.message || 'Invalid OTP.');
			}
			onDeleteSuccess(deletingUser._id);
			handleClose();
			setFeedback({ type: 'success', message: 'User deleted successfully.' });
		} catch (err) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		setStep(1);
		setPassword('');
		setOtp('');
		setError('');
		setShowPassword(false);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border transform transition-all duration-300 ease-in-out">
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

					{step === 1 && (
						<form onSubmit={handlePasswordSubmit}>
							<label
								htmlFor="admin-password"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Admin Password *
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
									className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-orange-300"
								>
									{isLoading ? 'Verifying...' : 'Send OTP'}
								</button>
							</div>
						</form>
					)}

					{step === 2 && (
						<form onSubmit={handleOtpSubmit}>
							<p className="text-sm text-muted-foreground mb-4">
								An OTP has been sent to your registered contact method. Please
								enter it below to confirm deletion.
							</p>
							<label
								htmlFor="otp"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Enter 6-digit OTP
							</label>
							<input
								id="otp"
								type="text"
								value={otp}
								onChange={(e) => setOtp(e.target.value)}
								className="w-full p-2 border border-border rounded-lg bg-background tracking-widest text-center"
								placeholder="_ _ _ _ _ _"
								maxLength={6}
							/>
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
									disabled={isLoading || otp.length !== 6}
									className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400"
								>
									{isLoading ? 'Deleting...' : 'Confirm Delete'}
								</button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
};

export default DeleteUserModal;
