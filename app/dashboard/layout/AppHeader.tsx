'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ThemeToggleButton } from '@/components/common/ThemeToggleButton';
import Logo from '@/components/Logo';
import { useSidebar } from '@/context/SidebarContext';
import useAuth from '@/store/useAuth';
import { KeyRound, LogOut, User, X } from 'lucide-react';
import Link from 'next/link';
import Spinner from '@/components/ui/spinner';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

// --- Custom Hook for Modal State ---
const useModal = () => {
	const [isOpen, setIsOpen] = useState(false);
	const openModal = () => setIsOpen(true);
	const closeModal = () => setIsOpen(false);
	return { isOpen, openModal, closeModal };
};

// --- Reset Password Modal Component ---
const ResetPasswordModal = ({ isOpen, onClose }) => {
	const [oldPassword, setOldPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		if (newPassword !== confirmPassword) {
			setError("New passwords don't match.");
			return;
		}
		if (newPassword.length < 6) {
			setError('Password must be at least 6 characters long.');
			return;
		}

		setIsLoading(true);
		try {
			// Replace with your actual API endpoint for changing password
			const response = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ oldPassword, newPassword }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to reset password.');
			}

			setSuccess('Password updated successfully!');
			setTimeout(() => {
				onClose();
				setSuccess('');
			}, 2000);
		} catch (err) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] m-4">
			<div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-2xl bg-white p-6 dark:bg-gray-900 lg:p-8">
				<h4 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
					Reset Password
				</h4>
				<p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
					Enter your old and new password to update your credentials.
				</p>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<Label>
						Old Password
						<Input
							type="password"
							value={oldPassword}
							onChange={(e) => setOldPassword(e.target.value)}
							required
						/>
					</Label>
					<Label>
						New Password
						<Input
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							required
						/>
					</Label>
					<Label>
						Confirm New Password
						<Input
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
						/>
					</Label>

					{error && <p className="text-sm text-red-500">{error}</p>}
					{success && <p className="text-sm text-green-500">{success}</p>}

					<div className="flex items-center gap-3 mt-4 justify-end">
						<Button size="sm" variant="outline" type="button" onClick={onClose}>
							Cancel
						</Button>
						<Button size="sm" type="submit" disabled={isLoading}>
							{isLoading ? 'Saving...' : 'Save Changes'}
						</Button>
					</div>
				</form>
			</div>
		</Modal>
	);
};

// --- User Dropdown Component ---
const UserDropdown = () => {
	const { user, logout } = useAuth();
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const {
		isOpen: isPasswordModalOpen,
		openModal: openPasswordModal,
		closeModal: closePasswordModal,
	} = useModal();

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	if (!user) {
		return <Spinner />;
	}

	return (
		<>
			<div className="relative" ref={dropdownRef}>
				<button
					onClick={() => setIsOpen(!isOpen)}
					className="flex items-center gap-3 rounded-full p-1 pr-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
				>
					<img
						src={
							user.avatar ||
							`https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}`
						}
						alt="User Avatar"
						className="w-9 h-9 rounded-full object-cover"
					/>
					<div className="text-left hidden sm:block">
						<p className="text-sm font-semibold text-gray-800 dark:text-white/90">
							{user.firstName} {user.lastName}
						</p>
						<p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
							{user.role.replace('_', ' ')}
						</p>
					</div>
				</button>

				{isOpen && (
					<div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
						<div className="py-2">
							<Link
								href="/dashboard/profile"
								className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
								onClick={() => setIsOpen(false)}
							>
								<User className="h-4 w-4" />
								My Profile
							</Link>
							<button
								onClick={() => {
									openPasswordModal();
									setIsOpen(false);
								}}
								className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
							>
								<KeyRound className="h-4 w-4" />
								Reset Password
							</button>
							<div className="border-t border-gray-200 dark:border-gray-700 my-1" />
							<button
								onClick={logout}
								className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
							>
								<LogOut className="h-4 w-4" />
								Logout
							</button>
						</div>
					</div>
				)}
			</div>
			<ResetPasswordModal
				isOpen={isPasswordModalOpen}
				onClose={closePasswordModal}
			/>
		</>
	);
};

// --- Main AppHeader Component ---
const AppHeader: React.FC = () => {
	const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
	const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
	const inputRef = useRef<HTMLInputElement>(null);

	const handleToggle = () => {
		if (window.innerWidth >= 1024) {
			toggleSidebar();
		} else {
			toggleMobileSidebar();
		}
	};

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
				event.preventDefault();
				inputRef.current?.focus();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, []);

	return (
		<header className="sticky top-0 flex w-full bg-white border-gray-200 z-40 dark:border-gray-800 dark:bg-gray-900 lg:border-b">
			<div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
				<div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
					<button
						className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg z-40 dark:border-gray-800 lg:flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
						onClick={handleToggle}
						aria-label="Toggle Sidebar"
					>
						{isMobileOpen ? (
							<X className="h-6 w-6" />
						) : (
							<svg
								width="16"
								height="12"
								viewBox="0 0 16 12"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									fillRule="evenodd"
									clipRule="evenodd"
									d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
									fill="currentColor"
								/>
							</svg>
						)}
					</button>

					<div className="lg:hidden">
						<Logo />
					</div>

					<button
						onClick={() => setApplicationMenuOpen(!isApplicationMenuOpen)}
						className="flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg z-40 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
					>
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fillRule="evenodd"
								clipRule="evenodd"
								d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.0051V11.9951Z"
								fill="currentColor"
							/>
						</svg>
					</button>
				</div>
				<div
					className={`${
						isApplicationMenuOpen ? 'flex' : 'hidden'
					} items-center justify-between w-full gap-4 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none`}
				>
					<div className="flex items-center gap-2 2xsm:gap-3">
						<ThemeToggleButton />
					</div>
					<UserDropdown />
				</div>
			</div>
		</header>
	);
};

export default AppHeader;
