'use client';

import React, { memo, useRef, useEffect, useState } from 'react';
import { Menu, X, LogOut, ChevronDown, Sun, Moon, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import useAuth from '@/store/useAuth';
import { useNetworkStore } from '@/store/networkStore';

type Props = {
	isMobileOpen: boolean;
	onToggleSidebar: () => void;
	onToggleMobileSidebar: () => void;
};

const ChangePasswordModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
	const [oldPassword, setOldPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showOld, setShowOld] = useState(false);
	const [showNew, setShowNew] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const setUser = useAuth((state) => state.setUser);
	const isOnline = useNetworkStore((state) => state.isOnline);

	const resetFormState = () => {
		setOldPassword('');
		setNewPassword('');
		setConfirmPassword('');
		setError('');
		setSuccess('');
		setIsLoading(false);
		setShowOld(false);
		setShowNew(false);
	};

	const handleClose = () => {
		resetFormState();
		onClose();
	};

	useEffect(() => {
		if (!isOpen) resetFormState();
	}, [isOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		if (!isOnline) {
			setError('You are offline. Please connect to the internet and try again.');
			return;
		}
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
			const response = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ oldPassword, newPassword }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to change password.');
			}

			if (data?.user) {
				setUser(data.user);
			}

			setSuccess('Password updated successfully!');
			window.setTimeout(() => handleClose(), 2000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to change password.');
		} finally {
			setIsLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
			onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
		>
			<div className="w-full max-w-md rounded-2xl bg-card border border-gray-200 dark:border-gray-800 shadow-xl p-6">
				<div className="flex items-center gap-3 mb-5">
					<div className="h-10 w-10 rounded-xl bg-[#465fff]/10 flex items-center justify-center">
						<KeyRound className="h-5 w-5 text-[#465fff]" />
					</div>
					<div>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h3>
						<p className="text-xs text-gray-500">Update your account password</p>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Password</label>
						<div className="relative">
							<input
								type={showOld ? 'text' : 'password'}
								value={oldPassword}
								onChange={(e) => { setOldPassword(e.target.value); setError(''); }}
								required
								placeholder="Enter current password"
								className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 outline-none transition dark:border-gray-700 dark:bg-muted dark:text-white placeholder:text-gray-400 focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10 disabled:opacity-50"
							/>
							<button type="button" onClick={() => setShowOld((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
								{showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
					</div>

					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Password</label>
						<div className="relative">
							<input
								type={showNew ? 'text' : 'password'}
								value={newPassword}
								onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
								required
								placeholder="Enter new password"
								className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 outline-none transition dark:border-gray-700 dark:bg-muted dark:text-white placeholder:text-gray-400 focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10 disabled:opacity-50"
							/>
							<button type="button" onClick={() => setShowNew((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
								{showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
					</div>

					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
						<input
							type="password"
							value={confirmPassword}
							onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
							required
							placeholder="Confirm new password"
							className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition dark:border-gray-700 dark:bg-muted dark:text-white placeholder:text-gray-400 focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10 disabled:opacity-50"
						/>
					</div>

					{error && (
						<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
							{error}
						</div>
					)}
					{success && (
						<div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
							{success}
						</div>
					)}

					<div className="flex items-center gap-3 mt-2 justify-end">
						<button
							type="button"
							onClick={handleClose}
							disabled={isLoading}
							className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-muted transition-colors disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isLoading || !oldPassword || !newPassword || !confirmPassword}
							className="px-4 py-2 rounded-xl bg-[#111827] text-sm font-semibold text-white hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
							{isLoading ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

const SuperAdminHeader = memo(function SuperAdminHeader({ isMobileOpen, onToggleSidebar, onToggleMobileSidebar }: Props) {
	const router = useRouter();
	const headerRef = useRef<HTMLElement>(null);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [passwordModalOpen, setPasswordModalOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const { theme, toggleTheme } = useTheme();
	const user = useAuth((state) => state.user);
	const logout = useAuth((state) => state.logout);

	useEffect(() => {
		const headerEl = headerRef.current;
		if (!headerEl) return;
		const updateHeaderHeight = () => {
			const height = headerEl.getBoundingClientRect().height;
			document.documentElement.style.setProperty('--app-header-height', `${height}px`);
		};
		updateHeaderHeight();
		let resizeObserver: ResizeObserver | null = null;
		if (typeof ResizeObserver !== 'undefined') {
			resizeObserver = new ResizeObserver(updateHeaderHeight);
			resizeObserver.observe(headerEl);
		}
		window.addEventListener('resize', updateHeaderHeight);
		return () => {
			window.removeEventListener('resize', updateHeaderHeight);
			if (resizeObserver) resizeObserver.disconnect();
		};
	}, []);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setDropdownOpen(false);
			}
		};
		if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [dropdownOpen]);

	const handleToggle = () => {
		if (window.innerWidth >= 1024) onToggleSidebar();
		else onToggleMobileSidebar();
	};

	const handleLogout = async () => {
		setDropdownOpen(false);
		await logout();
		router.replace('/login');
	};

	const handleChangePassword = () => {
		setDropdownOpen(false);
		setPasswordModalOpen(true);
	};

	const displayName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Admin';
	const displayEmail = user?.email || '';
	const initials = [user?.firstName, user?.lastName]
		.filter(Boolean)
		.map((n: string) => n.charAt(0))
		.join('')
		.toUpperCase()
		.slice(0, 2) || 'SA';
	const avatarUrl = user?.avatar || user?.profilePictureUrl || null;

	return (
		<>
			<header
				ref={headerRef}
				className="fixed inset-x-0 top-0 lg:sticky lg:top-0 flex w-full bg-card border-gray-200 z-50 dark:border-gray-800 lg:border-b"
			>
				<div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
					<div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
						<button
							className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg z-40 dark:border-gray-800 lg:flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
							onClick={handleToggle}
							aria-label="Toggle Sidebar"
						>
							{isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
						</button>
						<div className="lg:hidden">
							<p className="text-sm font-semibold text-gray-800 dark:text-white">SchoolMesh Admin</p>
						</div>
						<div className="ml-auto flex items-center gap-3">
							{/* Profile dropdown */}
							<div className="relative" ref={dropdownRef}>
								<button
									onClick={() => setDropdownOpen(!dropdownOpen)}
									className="flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3 hover:bg-gray-100 transition-colors dark:hover:bg-gray-800"
								>
									{avatarUrl ? (
										<img
											src={avatarUrl}
											alt={displayName}
											className="h-8 w-8 rounded-full object-cover"
										/>
									) : (
										<div className="h-8 w-8 rounded-full bg-[#465fff] flex items-center justify-center text-xs font-bold text-white">
											{initials}
										</div>
									)}
									<div className="hidden sm:block text-left">
										<p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">{displayName}</p>
										<p className="text-[11px] text-gray-500 leading-tight">Platform Admin</p>
									</div>
									<ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
								</button>

								{dropdownOpen && (
									<div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-200 bg-card py-1.5 shadow-lg dark:border-gray-800 z-[60]">
										<div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
											<p className="text-sm font-semibold text-gray-900 dark:text-white">{displayName}</p>
											{displayEmail && (
												<p className="text-xs text-gray-500 truncate">{displayEmail}</p>
											)}
										</div>
										<div className="py-1.5">
											<button
												onClick={toggleTheme}
												className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-800"
											>
												{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
												{theme === 'dark' ? 'Light mode' : 'Dark mode'}
											</button>
											<button
												onClick={handleChangePassword}
												className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-800"
											>
												<KeyRound className="h-4 w-4" />
												Change password
											</button>
											<button
												onClick={handleLogout}
												className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-900/10"
											>
												<LogOut className="h-4 w-4" />
												Sign out
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</header>

			<ChangePasswordModal
				isOpen={passwordModalOpen}
				onClose={() => setPasswordModalOpen(false)}
			/>
		</>
	);
});

export default SuperAdminHeader;
