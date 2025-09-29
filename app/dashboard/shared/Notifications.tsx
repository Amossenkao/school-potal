'use client';
import React, { useState } from 'react';
import useAuth from '@/store/useAuth';
import {
	CheckCircle,
	Info,
	X,
	Archive,
	Trash2,
	Eye,
	ShieldCheck,
	User,
	Bell,
	Clock,
	Star,
	MessageSquare,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

type NotificationType = 'Grades' | 'Security' | 'Profile' | 'Others';

interface Notification {
	_id: string;
	title: string;
	message: string;
	timestamp: string;
	read: boolean;
	type: NotificationType;
}

const NotificationModal = ({
	notification,
	onClose,
}: {
	notification: Notification;
	onClose: () => void;
}) => {
	const getIcon = (type: NotificationType) => {
		switch (type) {
			case 'Grades':
				return <Star className="w-8 h-8 text-emerald-500" />;
			case 'Security':
				return <ShieldCheck className="w-8 h-8 text-red-500" />;
			case 'Profile':
				return <User className="w-8 h-8 text-blue-500" />;
			case 'Others':
				return <MessageSquare className="w-8 h-8 text-slate-500" />;
			default:
				return <Info className="w-8 h-8 text-gray-500" />;
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-300">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center space-x-4">
						{getIcon(notification.type)}
						<div>
							<h3 className="text-xl font-bold text-gray-900 dark:text-white">
								{notification.title}
							</h3>
							<span className="inline-block px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mt-2">
								{notification.type}
							</span>
						</div>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
					>
						<X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
					</button>
				</div>
				<div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
					<p className="text-gray-700 dark:text-gray-300 leading-relaxed">
						{notification.message}
					</p>
				</div>
				<div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
					<div className="flex items-center space-x-2">
						<Clock className="w-4 h-4" />
						<span>
							{format(parseISO(notification.timestamp), 'MMM d, yyyy h:mm a')}
						</span>
					</div>
					<div className="flex items-center space-x-2">
						{notification.read ? (
							<>
								<CheckCircle className="w-4 h-4 text-green-500" />
								<span className="text-green-600 dark:text-green-400">Read</span>
							</>
						) : (
							<>
								<Bell className="w-4 h-4 text-blue-500" />
								<span className="text-blue-600 dark:text-blue-400">Unread</span>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

const NotificationItem = ({
	notification,
	onMarkAsRead,
	onDelete,
	onView,
}: {
	notification: Notification;
	onMarkAsRead: (id: string) => void;
	onDelete: (id: string) => void;
	onView: (notification: Notification) => void;
}) => {
	const getIcon = (type: NotificationType) => {
		switch (type) {
			case 'Grades':
				return <Star className="w-6 h-6 text-emerald-500" />;
			case 'Security':
				return <ShieldCheck className="w-6 h-6 text-red-500" />;
			case 'Profile':
				return <User className="w-6 h-6 text-blue-500" />;
			case 'Others':
				return <MessageSquare className="w-6 h-6 text-slate-500" />;
			default:
				return <Info className="w-6 h-6 text-gray-500" />;
		}
	};

	const getTypeColors = (type: NotificationType) => {
		switch (type) {
			case 'Grades':
				return 'from-emerald-500 to-green-600';
			case 'Security':
				return 'from-red-500 to-pink-600';
			case 'Profile':
				return 'from-blue-500 to-indigo-600';
			case 'Others':
				return 'from-slate-500 to-gray-600';
			default:
				return 'from-gray-500 to-gray-600';
		}
	};

	const isDeletable = !['Grades', 'Security'].includes(notification.type);

	return (
		<div
			className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
				notification.read
					? 'bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
					: 'bg-gradient-to-r from-blue-50 via-white to-purple-50 dark:from-blue-900/20 dark:via-gray-900 dark:to-purple-900/20 border-blue-200 dark:border-blue-700 shadow-md'
			}`}
		>
			<div
				className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${getTypeColors(
					notification.type
				)}`}
			/>
			{!notification.read && (
				<div className="absolute top-4 right-4">
					<div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-lg" />
				</div>
			)}
			<div className="p-6">
				<div className="flex items-start space-x-4">
					<div className="flex-shrink-0 p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
						{getIcon(notification.type)}
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex justify-between items-start mb-2">
							<div>
								<h4 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
									{notification.title}
								</h4>
								<span className="inline-block px-2 py-1 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium mt-1">
									{notification.type}
								</span>
							</div>
							<div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
								<Clock className="w-4 h-4" />
								<span className="hidden sm:block">
									{format(
										parseISO(notification.timestamp),
										'MMM d, yyyy h:mm a'
									)}
								</span>
								<span className="sm:hidden">
									{format(parseISO(notification.timestamp), 'MMM d')}
								</span>
							</div>
						</div>
						<p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
							{notification.message}
						</p>
						<div className="flex items-center gap-3">
							<button
								onClick={() => onView(notification)}
								className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors"
							>
								<Eye className="w-4 h-4" />
								View Details
							</button>
							{!notification.read && (
								<button
									onClick={() => onMarkAsRead(notification._id)}
									className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-800/40 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium transition-colors"
								>
									<CheckCircle className="w-4 h-4" />
									Mark Read
								</button>
							)}
							{isDeletable && (
								<button
									onClick={() => onDelete(notification._id)}
									className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/40 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors"
								>
									<Trash2 className="w-4 h-4" />
									Delete
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

const Notifications: React.FC = () => {
	const { user, checkAuthStatus } = useAuth();
	const [activeTab, setActiveTab] = useState<NotificationType | 'All'>('All');
	const [selectedNotification, setSelectedNotification] =
		useState<Notification | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleNotificationAction = async (
		action: 'markAsRead' | 'delete' | 'markAllAsRead',
		payload: { notificationId?: string; tab?: string }
	) => {
		setIsLoading(true);
		try {
			const response = await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, ...payload }),
			});

			if (response.ok) {
				await checkAuthStatus();
			} else {
				const errorData = await response.json();
				throw new Error(
					errorData.message || `Failed to perform action: ${action}`
				);
			}
		} catch (error) {
			console.error(`Failed to perform action: ${action}`, error);
		} finally {
			setIsLoading(false);
		}
	};

	const tabs: (NotificationType | 'All')[] = [
		'All',
		'Grades',
		'Security',
		'Profile',
		'Others',
	];

	const filteredNotifications =
		user?.notifications
			?.filter((n) => activeTab === 'All' || n.type === activeTab)
			.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			) || [];

	const filteredUnreadCount = filteredNotifications.filter(
		(n) => !n.read
	).length;

	const getTabIcon = (tab: NotificationType | 'All') => {
		switch (tab) {
			case 'All':
				return <Bell className="w-4 h-4" />;
			case 'Grades':
				return <Star className="w-4 h-4" />;
			case 'Security':
				return <ShieldCheck className="w-4 h-4" />;
			case 'Profile':
				return <User className="w-4 h-4" />;
			case 'Others':
				return <MessageSquare className="w-4 h-4" />;
			default:
				return <Info className="w-4 h-4" />;
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900/20">
			<div className="container mx-auto px-4 py-8 max-w-6xl">
				{selectedNotification && (
					<NotificationModal
						notification={selectedNotification}
						onClose={() => setSelectedNotification(null)}
					/>
				)}

				<div className="text-center mb-12">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
						<Bell className="w-8 h-8 text-white" />
					</div>
					<h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
						Notifications Center
					</h1>
					<p className="text-lg text-gray-600 dark:text-gray-300">
						Stay updated with your latest activities and alerts
					</p>
				</div>

				<div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-6 mb-8">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div className="flex items-center space-x-6">
							<div className="text-center">
								<div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
									{filteredNotifications.length}
								</div>
								<div className="text-sm text-gray-500 dark:text-gray-400">
									Total
								</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-red-600 dark:text-red-400">
									{filteredUnreadCount}
								</div>
								<div className="text-sm text-gray-500 dark:text-gray-400">
									Unread
								</div>
							</div>
						</div>
						{filteredUnreadCount > 0 && (
							<button
								onClick={() =>
									handleNotificationAction('markAllAsRead', { tab: activeTab })
								}
								disabled={isLoading}
								className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
							>
								Mark All as Read
							</button>
						)}
					</div>
				</div>

				<div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg mb-8 overflow-hidden">
					<nav className="flex overflow-x-auto">
						{tabs.map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all duration-300 whitespace-nowrap border-b-2 ${
									activeTab === tab
										? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
										: 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
								}`}
							>
								{getTabIcon(tab)}
								{tab}
								{tab !== 'All' &&
									user?.notifications?.filter((n) => n.type === tab && !n.read)
										.length > 0 && (
										<span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
											{
												user.notifications.filter(
													(n) => n.type === tab && !n.read
												).length
											}
										</span>
									)}
							</button>
						))}
					</nav>
				</div>

				<div className="space-y-6">
					{filteredNotifications.length > 0 ? (
						filteredNotifications.map((notification) => (
							<NotificationItem
								key={notification._id}
								notification={notification}
								onMarkAsRead={(id) =>
									handleNotificationAction('markAsRead', { notificationId: id })
								}
								onDelete={(id) =>
									handleNotificationAction('delete', { notificationId: id })
								}
								onView={setSelectedNotification}
							/>
						))
					) : (
						<div className="text-center py-16">
							<div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
								<Archive className="w-12 h-12 text-gray-400 dark:text-gray-600" />
							</div>
							<h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
								All Clear!
							</h3>
							<p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
								{activeTab === 'All'
									? "You don't have any notifications at the moment."
									: `No ${activeTab.toLowerCase()} notifications to show.`}
							</p>
						</div>
					)}
				</div>

				{isLoading && (
					<div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-40">
						<div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl">
							<div className="flex items-center space-x-3">
								<div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
								<span className="text-gray-700 dark:text-gray-300 font-medium">
									Processing...
								</span>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default Notifications;
