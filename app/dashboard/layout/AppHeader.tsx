'use client';
import React, { memo, useState, useEffect, useRef, useMemo } from 'react';
import { ThemeToggleButton } from '@/components/common/ThemeToggleButton';
import Logo from '@/components/Logo';
import useAuth from '@/store/useAuth';
import {
	KeyRound,
	LogOut,
	User,
	X,
	Bell,
	CheckCheck,
	Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/ui/spinner';
import Input from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useNetworkStore } from '@/store/networkStore';
import { useOfflineNavigationStore } from '@/store/offlineNavigationStore';
import { PageLoading } from '@/components/loading';

// --- Types ---
interface Notification {
	_id: string; // Mongoose subdocuments have a unique _id
	title: string;
	message: string;
	timestamp: string; // Comes as a Date string from backend
	read: boolean;
	dismissed?: boolean;
	type: 'Login' | 'Grades' | 'Security' | 'Profile' | 'Others';
}

const shouldHandleClientNavigation = (event: React.MouseEvent) => {
	if (event.defaultPrevented) return false;
	if (event.button !== 0) return false;
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
		return false;
	}
	return true;
};

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
	const { isOnline } = useNetworkStore();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		if (!isOnline) {
			window.dispatchEvent(new CustomEvent('offline:fetch'));
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
			// Replace with your actual API endpoint for changing password
			const response = await fetch('/api/users', {
				method: 'PUT',
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
					Change Password
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

// --- Notifications Dropdown Component ---
const NotificationsDropdown = memo(function NotificationsDropdown() {
	const { user, setUser } = useAuth(); // Assumes setUser updates the auth store
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedNotification, setSelectedNotification] =
		useState<Notification | null>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const { setOfflinePath } = useOfflineNavigationStore();

	// Filter and sort notifications from the user object
	const notifications = useMemo(() => {
		if (!user?.notifications) return [];
		return user.notifications
			.filter((n) => !n.read && !n.dismissed)
			.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			);
	}, [user?.notifications]);

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

	const unreadCount = notifications.length;
	const displayCount = unreadCount > 10 ? '10+' : unreadCount.toString();

	const markAsReadAndDismiss = async (id: string) => {
		if (!user) return;
		// Optimistically update the UI
		const updatedUser = {
			...user,
			notifications: user.notifications.map((n) =>
				n._id === id ? { ...n, read: true, dismissed: true } : n
			),
		};
		setUser(updatedUser);

		try {
			await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'markAsReadAndDismiss',
					notificationId: id,
				}),
			});
		} catch (error) {
			console.error('Failed to mark notification as read:', error);
			// Revert on failure
			setUser(user);
		}
	};

	const markAllAsRead = async () => {
		if (!user) return;
		setIsLoading(true);
		const unreadIds = notifications.map((n) => n._id);
		// Optimistically update the UI
		const updatedUser = {
			...user,
			notifications: user.notifications.map((n) =>
				unreadIds.includes(n._id) ? { ...n, read: true } : n
			),
		};
		setUser(updatedUser);

		try {
			await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'markAllAsRead' }),
			});
		} catch (error) {
			console.error('Failed to mark all as read:', error);
			setUser(user); // Revert on failure
		} finally {
			setIsLoading(false);
		}
	};

	const deleteNotification = async (id: string) => {
		if (!user) return;
		const updatedUser = {
			...user,
			notifications: user.notifications.filter((n) => n._id !== id),
		};
		setUser(updatedUser);

		try {
			await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'delete', notificationId: id }),
			});
		} catch (error) {
			console.error('Failed to delete notification:', error);
			setUser(user);
		}
	};

	const getNotificationIcon = (type: Notification['type']) => {
		const iconClass = 'h-4 w-4';
		switch (type) {
			case 'Grades':
				return (
					<div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-1">
						<svg
							className={`${iconClass} text-blue-600 dark:text-blue-400`}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
				);
			case 'Security':
				return (
					<div className="bg-orange-100 dark:bg-orange-900/30 rounded-full p-1">
						<svg
							className={`${iconClass} text-orange-600 dark:text-orange-400`}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
							/>
						</svg>
					</div>
				);
			case 'Profile':
				return (
					<div className="bg-green-100 dark:bg-green-900/30 rounded-full p-1">
						<svg
							className={`${iconClass} text-green-600 dark:text-green-400`}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
					</div>
				);
			case 'Login':
				return (
					<div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-full p-1">
						<svg
							className={`${iconClass} text-yellow-600 dark:text-yellow-400`}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 7a3 3 0 013 3v6a3 3 0 01-3 3H9a3 3 0 01-3-3V10a3 3 0 013-3h6zM9 4h6a3 3 0 013 3v1"
							/>
						</svg>
					</div>
				);
			default:
				return (
					<div className="bg-gray-100 dark:bg-gray-700 rounded-full p-1">
						<Bell className={`${iconClass} text-gray-600 dark:text-gray-400`} />
					</div>
				);
		}
	};

	return (
		<div className="relative" ref={dropdownRef}>
			{selectedNotification && (
				<div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
					<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-800">
						<div className="flex items-start justify-between gap-4 mb-4">
							<div>
								<h3 className="text-lg font-semibold text-gray-800 dark:text-white">
									{selectedNotification.title}
								</h3>
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
									{new Date(selectedNotification.timestamp).toLocaleString()}
								</p>
							</div>
							<button
								onClick={() => setSelectedNotification(null)}
								className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
								aria-label="Close"
							>
								<X className="h-5 w-5 text-gray-500" />
							</button>
						</div>
						<div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 text-sm text-gray-700 dark:text-gray-200">
							{selectedNotification.message}
						</div>
					</div>
				</div>
			)}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="relative flex items-center justify-center w-10 h-10 text-gray-500 border border-gray-200 rounded-lg transition-colors hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
				aria-label="Notifications"
			>
				<Bell className="h-5 w-5" />
				{unreadCount > 0 && (
					<span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-xs font-semibold text-white bg-red-500 rounded-full px-1">
						{displayCount}
					</span>
				)}
			</button>

			{isOpen && (
				<div className="fixed left-1/2 top-[72px] w-[90vw] max-w-[240px] -translate-x-1/2 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-56 sm:max-w-[90vw] sm:translate-x-0 origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 min-h-[160px]">
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-semibold text-gray-800 dark:text-white">
								Notifications
							</h3>
							{unreadCount > 0 && (
								<button
									onClick={markAllAsRead}
									disabled={isLoading}
									className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
								>
									<CheckCheck className="h-4 w-4" />
									Mark all read
								</button>
							)}
						</div>
					</div>

					<div className="max-h-80 overflow-y-auto">
						{notifications.length === 0 ? (
							<div className="p-4 text-center text-gray-500 dark:text-gray-400">
								<Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
								<p>No new notifications</p>
							</div>
						) : (
							notifications.map((notification) => (
								<div
									key={notification.timestamp.toString()}
									className={`relative p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
										!notification.read
											? 'bg-blue-50/50 dark:bg-blue-900/10'
											: ''
									}`}
									role="button"
									tabIndex={0}
									onClick={() => {
										setSelectedNotification(notification);
										markAsReadAndDismiss(notification._id);
										setIsOpen(false);
									}}
								>
									<div className="flex items-start gap-3">
										<div className="flex-shrink-0 mt-1">
											{getNotificationIcon(notification.type)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<p className="text-sm font-medium text-gray-800 dark:text-white">
														{notification.title}
													</p>
													<p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
														{notification.message}
													</p>
													<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
														{new Date(notification.timestamp).toLocaleString()}
													</p>
												</div>
												<div className="flex items-center gap-1 ml-2">
													{!['Grades', 'Security'].includes(
														notification.type
													) && (
														<button
															onClick={(e) => {
																e.stopPropagation();
																deleteNotification(notification._id);
															}}
															className="p-1 text-gray-400 hover:text-red-500"
															title="Delete notification"
														>
															<Trash2 className="h-3 w-3" />
														</button>
													)}
												</div>
											</div>
										</div>
									</div>
									{!notification.read && (
										<div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
									)}
								</div>
							))
						)}
					</div>

					{notifications.length > 0 && (
						<div className="p-3 border-t border-gray-200 dark:border-gray-700">
							<Link
								href="/dashboard/notifications"
								className="block w-full text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
								onClick={(event) => {
									if (!shouldHandleClientNavigation(event)) return;
									event.preventDefault();
									const href = '/dashboard/notifications';
									setOfflinePath(href);
									if (typeof window !== 'undefined') {
										window.history.pushState(null, '', href);
									}
									setIsOpen(false);
								}}
							>
								View all notifications
							</Link>
						</div>
					)}
				</div>
			)}
		</div>
	);
});

// --- User Dropdown Component ---
const UserDropdown = memo(function UserDropdown() {
	const { user, logout } = useAuth();
	const [isOpen, setIsOpen] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const router = useRouter();
	const dropdownRef = useRef<HTMLDivElement>(null);
	const { setOfflinePath } = useOfflineNavigationStore();
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

	const handleLogout = async () => {
		setIsOpen(false);
		setIsLoggingOut(true);
		try {
			await logout();
			router.replace('/login');
		} catch (error) {
			console.error('Logout failed:', error);
			setIsLoggingOut(false);
		}
	};

	if (!user && isLoggingOut) {
		return <PageLoading variant="school" message="Signing out..." />;
	}

	if (!user) {
		return <Spinner />;
	}

	return (
		<>
			{isLoggingOut && (
				<PageLoading variant="school" message="Signing out..." />
			)}
			<div className="relative" ref={dropdownRef}>
				<button
					onClick={() => setIsOpen(!isOpen)}
					className="flex items-center gap-3 flex-row-reverse rounded-full p-1 pl-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
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
							{user.position || user.role.replace('_', ' ')}
						</p>
					</div>
				</button>

				{isOpen && (
					<div className="absolute right-0 mt-2 w-52 max-w-[90vw] origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
						<div className="py-2">
							<Link
								href="/dashboard/profile"
								className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
								onClick={(event) => {
									if (!shouldHandleClientNavigation(event)) return;
									event.preventDefault();
									const href = '/dashboard/profile';
									setOfflinePath(href);
									if (typeof window !== 'undefined') {
										window.history.pushState(null, '', href);
									}
									setIsOpen(false);
								}}
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
								Change Password
							</button>
							<div className="border-t border-gray-200 dark:border-gray-700 my-1" />
							<button
								onClick={handleLogout}
								disabled={isLoggingOut}
								className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
							>
								<LogOut className="h-4 w-4" />
								{isLoggingOut ? 'Signing out...' : 'Logout'}
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
});

// --- Main AppHeader Component ---
type AppHeaderProps = {
	isMobileOpen: boolean;
	onToggleSidebar: () => void;
	onToggleMobileSidebar: () => void;
};

const AppHeader: React.FC<AppHeaderProps> = ({
	isMobileOpen,
	onToggleSidebar,
	onToggleMobileSidebar,
}) => {
	const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const headerRef = useRef<HTMLElement>(null);

	const handleToggle = () => {
		if (window.innerWidth >= 1024) {
			onToggleSidebar();
		} else {
			onToggleMobileSidebar();
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

	useEffect(() => {
		const headerEl = headerRef.current;
		if (!headerEl) return;

		const updateHeaderHeight = () => {
			const height = headerEl.getBoundingClientRect().height;
			document.documentElement.style.setProperty(
				'--app-header-height',
				`${height}px`
			);
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
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
		};
	}, []);

	const headerPositionClasses = 'sticky top-0';

	return (
		<header
			ref={headerRef}
			className={`${headerPositionClasses} flex w-full bg-white border-gray-200 z-40 dark:border-gray-800 dark:bg-gray-900 lg:border-b`}
		>
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
						<Link href="/" aria-label="Go to homepage">
							<Logo />
						</Link>
					</div>

					<div className="ml-auto flex items-center gap-2 lg:hidden">
						<NotificationsDropdown />
						<ThemeToggleButton />
						<UserDropdown />
					</div>
				</div>
				<div
					className={`${
						isApplicationMenuOpen ? 'flex' : 'hidden'
					} items-center justify-between w-full gap-4 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none`}
				>
					<div className="hidden lg:flex items-center gap-3 2xsm:gap-4">
						<NotificationsDropdown />
						<ThemeToggleButton />
					</div>
					<div className="hidden lg:block">
						<UserDropdown />
					</div>
				</div>
			</div>
		</header>
	);
};

export default memo(AppHeader);
