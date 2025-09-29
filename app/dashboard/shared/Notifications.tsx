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
} from 'lucide-react';

//
//

import { format, parseISO } from 'date-fns';
type NotificationType = 'Grades' | 'Security' | 'Profile';

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
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-lg">
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-lg font-semibold">{notification.title}</h3>
					<button onClick={onClose}>
						<X className="w-6 h-6" />
					</button>
				</div>
				<p className="text-sm text-muted-foreground mb-4">
					{notification.message}
				</p>
				<p className="text-xs text-muted-foreground text-right">
					{format(parseISO(notification.timestamp), 'MMM d, yyyy h:mm a')}
				</p>
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
				return (
					<CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
				);
			case 'Security':
				return (
					<ShieldCheck className="w-5 h-5 text-red-500 dark:text-red-400" />
				);
			case 'Profile':
				return <User className="w-5 h-5 text-blue-500 dark:text-blue-400" />;
			default:
				return <Info className="w-5 h-5 text-gray-500 dark:text-gray-400" />;
		}
	};

	const isDeletable = !['Grades', 'Security'].includes(notification.type);

	return (
		<div
			className={`relative p-4 border-l-4 rounded-r-lg transition-all duration-300 ease-in-out hover:shadow-lg ${
				notification.read
					? 'bg-card border-border'
					: 'bg-primary/5 border-primary'
			}`}
		>
			<div className="flex items-start space-x-4">
				<div className="flex-shrink-0">{getIcon(notification.type)}</div>
				<div className="flex-1 min-w-0">
					<div className="flex justify-between items-center">
						<p className="text-sm font-semibold text-foreground">
							{notification.title}
						</p>
						<p className="text-xs text-muted-foreground">
							{format(parseISO(notification.timestamp), 'MMM d, yyyy h:mm a')}
						</p>
					</div>
					<p className="text-sm text-muted-foreground mt-1 truncate">
						{notification.message}
					</p>
					<div className="flex items-center gap-4 mt-3">
						<button
							onClick={() => onView(notification)}
							className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
						>
							<Eye className="w-3 h-3" />
							View
						</button>
						{!notification.read && (
							<button
								onClick={() => onMarkAsRead(notification._id)}
								className="flex items-center gap-1 text-xs text-primary hover:underline"
							>
								<CheckCircle className="w-3 h-3" />
								Mark as Read
							</button>
						)}
						{isDeletable && (
							<button
								onClick={() => onDelete(notification._id)}
								className="flex items-center gap-1 text-xs text-red-500 hover:underline"
							>
								<Trash2 className="w-3 h-3" />
								Delete
							</button>
						)}
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

	const handleMarkAsRead = async (id: string) => {
		try {
			await fetch(`/api/notifications/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ read: true }),
			});
			await checkAuthStatus(); // Re-fetch user to update notifications
		} catch (error) {
			console.error('Failed to mark notification as read:', error);
		}
	};

	const handleDelete = async (id: string) => {
		try {
			await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
			await checkAuthStatus(); // Re-fetch user to update notifications
		} catch (error) {
			console.error('Failed to delete notification:', error);
		}
	};

	const handleMarkAllAsRead = async () => {
		try {
			await fetch('/api/notifications/read-all', { method: 'POST' });
			await checkAuthStatus();
		} catch (error) {
			console.error('Failed to mark all as read:', error);
		}
	};

	const filteredNotifications =
		user?.notifications
			?.filter((n) => activeTab === 'All' || n.type === activeTab)
			.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			) || [];

	const unreadCount = user?.notifications?.filter((n) => !n.read).length || 0;

	const tabs: (NotificationType | 'All')[] = [
		'All',
		'Grades',
		'Security',
		'Profile',
	];

	return (
		<div className="max-w-4xl mx-auto">
			{selectedNotification && (
				<NotificationModal
					notification={selectedNotification}
					onClose={() => setSelectedNotification(null)}
				/>
			)}
			<div className="bg-card border border-border rounded-lg shadow-sm p-6">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
					<div>
						<h2 className="text-2xl font-bold text-foreground">
							Notifications
						</h2>
						<p className="text-muted-foreground mt-1">
							You have {unreadCount} unread messages.
						</p>
					</div>
					{unreadCount > 0 && (
						<button
							onClick={handleMarkAllAsRead}
							className="mt-3 sm:mt-0 text-sm font-medium text-primary hover:underline"
						>
							Mark All as Read
						</button>
					)}
				</div>

				<div className="border-b border-border mb-6">
					<nav className="-mb-px flex space-x-6 overflow-x-auto">
						{tabs.map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
									activeTab === tab
										? 'border-primary text-primary'
										: 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
								}`}
							>
								{tab}
							</button>
						))}
					</nav>
				</div>

				<div className="space-y-4">
					{filteredNotifications.length > 0 ? (
						filteredNotifications.map((notification) => (
							<NotificationItem
								key={notification._id}
								notification={notification}
								onMarkAsRead={handleMarkAsRead}
								onDelete={handleDelete}
								onView={setSelectedNotification}
							/>
						))
					) : (
						<div className="text-center py-12">
							<div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
								<Archive className="w-8 h-8 text-muted-foreground" />
							</div>
							<h3 className="text-lg font-semibold text-foreground">
								No Notifications
							</h3>
							<p className="text-muted-foreground mt-1">
								You have no {activeTab !== 'All' ? activeTab : ''} notifications
								right now.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Notifications;
