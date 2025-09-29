'use client';
import {
	Bell,
	CheckCircle,
	Info,
	ShieldCheck,
	User,
	X,
	MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import useAuth from '@/store/useAuth';
import { Notification } from '@/types';

const NotificationDropdown = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const dropdown = useRef<HTMLLIElement>(null);
	const { user, checkAuthStatus } = useAuth();

	const activeNotifications =
		user?.notifications
			?.filter((n: Notification) => !n.dismissed)
			.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			) || [];

	const unreadCount = activeNotifications.filter((n) => !n.read).length;

	useEffect(() => {
		const clickHandler = (event: MouseEvent) => {
			if (!dropdown.current?.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('click', clickHandler);
		return () => document.removeEventListener('click', clickHandler);
	}, []);

	const handleAction = async (
		action: 'markAsRead' | 'dismiss' | 'markAllAsRead',
		notificationId?: string
	) => {
		setIsLoading(true);
		try {
			const response = await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, notificationId, tab: 'all' }),
			});

			if (response.ok) {
				await checkAuthStatus();
			} else {
				console.error('Failed to perform notification action');
			}
		} catch (error) {
			console.error('Error in notification action:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const getIcon = (type: Notification['type']) => {
		switch (type) {
			case 'Grades':
				return <CheckCircle className="w-5 h-5 text-green-500" />;
			case 'Security':
				return <ShieldCheck className="w-5 h-5 text-red-500" />;
			case 'Profile':
				return <User className="w-5 h-5 text-blue-500" />;
			case 'Others':
				return <MessageSquare className="w-5 h-5 text-slate-500" />;
			default:
				return <Info className="w-5 h-5 text-gray-500" />;
		}
	};

	return (
		<li className="relative" ref={dropdown}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-stroke bg-gray-100 hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
			>
				{unreadCount > 0 && (
					<span className="absolute -top-0.5 right-0 z-1 h-2 w-2 rounded-full bg-meta-1">
						<span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
					</span>
				)}
				<Bell className="w-5 h-5" />
			</button>

			<div
				className={`absolute right-0 mt-2.5 flex h-90 w-75 flex-col rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark sm:w-80 ${
					isOpen ? 'block' : 'hidden'
				}`}
			>
				<div className="px-4.5 py-3 flex justify-between items-center">
					<h5 className="text-sm font-medium text-bodydark2">Notifications</h5>
					{unreadCount > 0 && (
						<button
							onClick={() => handleAction('markAllAsRead')}
							disabled={isLoading}
							className="text-xs text-primary hover:underline disabled:opacity-50"
						>
							Mark All as Read
						</button>
					)}
				</div>

				<ul className="flex h-auto flex-col overflow-y-auto">
					{activeNotifications.length > 0 ? (
						activeNotifications.map((notification: Notification) => (
							<li
								key={notification._id}
								className={`flex items-center gap-2 border-t border-stroke px-4.5 py-3 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4 ${
									!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
								}`}
							>
								{!notification.read && (
									<button
										title="Mark as read"
										onClick={(e) => {
											e.stopPropagation();
											handleAction('markAsRead', notification._id);
										}}
										className="flex-shrink-0 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-800/50"
									>
										<CheckCircle className="w-4 h-4 text-green-500" />
									</button>
								)}
								<Link
									href="/dashboard/notifications"
									className="flex-grow flex items-center gap-3"
									onClick={() => setIsOpen(false)}
								>
									<div className="h-10 w-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-meta-4">
										{getIcon(notification.type)}
									</div>
									<div className="flex-1">
										<h6 className="text-sm font-medium text-black dark:text-white">
											{notification.title}
										</h6>
										<p className="text-xs text-bodydark2">
											{new Date(notification.timestamp).toLocaleDateString()}
										</p>
									</div>
								</Link>
								<button
									title="Dismiss notification"
									onClick={(e) => {
										e.stopPropagation();
										handleAction('dismiss', notification._id);
									}}
									className="flex-shrink-0 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-800/50"
								>
									<X className="w-4 h-4 text-red-500" />
								</button>
							</li>
						))
					) : (
						<li className="flex items-center justify-center p-4">
							<p className="text-sm text-bodydark2">No new notifications</p>
						</li>
					)}
				</ul>
			</div>
		</li>
	);
};

export default NotificationDropdown;
