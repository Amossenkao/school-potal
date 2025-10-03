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
	Search,
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
				return <MessageSquare className="w-8 h-8 text-muted-foreground" />;
			default:
				return <Info className="w-8 h-8 text-muted-foreground" />;
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-lg border animate-in fade-in zoom-in duration-300">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center space-x-4">
						{getIcon(notification.type)}
						<div>
							<h3 className="text-xl font-bold text-foreground">
								{notification.title}
							</h3>
							<span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mt-2">
								{notification.type}
							</span>
						</div>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-accent rounded-full transition-colors"
					>
						<X className="w-6 h-6 text-muted-foreground" />
					</button>
				</div>
				<div className="bg-muted rounded-xl p-4 mb-6">
					<p className="text-foreground leading-relaxed">
						{notification.message}
					</p>
				</div>
				<div className="flex items-center justify-between text-sm text-muted-foreground">
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
				return <MessageSquare className="w-6 h-6 text-muted-foreground" />;
			default:
				return <Info className="w-6 h-6 text-muted-foreground" />;
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
				return 'from-muted-foreground to-muted-foreground/80';
			default:
				return 'from-muted-foreground to-muted-foreground/80';
		}
	};

	const isDeletable = !['Grades', 'Security'].includes(notification.type);

	const handleClick = (e: React.MouseEvent) => {
		const target = e.target as HTMLElement;
		if (!target.closest('button')) {
			onView(notification);
			if (!notification.read) {
				onMarkAsRead(notification._id);
			}
		}
	};

	return (
		<div
			onClick={handleClick}
			className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer ${
				notification.read
					? 'bg-card/50'
					: 'bg-primary/5 border-primary/20 shadow-md'
			}`}
		>
			<div
				className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${getTypeColors(
					notification.type
				)}`}
			/>
			{!notification.read && (
				<div className="absolute top-4 right-4">
					<div className="w-3 h-3 bg-primary rounded-full animate-pulse shadow-lg" />
				</div>
			)}
			<div className="p-6">
				<div className="flex items-start space-x-4">
					<div className="flex-shrink-0 p-2 rounded-xl bg-background shadow-sm">
						{getIcon(notification.type)}
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex justify-between items-start mb-2">
							<div>
								<h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
									{notification.title}
								</h4>
								<span className="inline-block px-2 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-medium mt-1">
									{notification.type}
								</span>
							</div>
							<div className="flex items-center space-x-2 text-sm text-muted-foreground">
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
						<p className="text-muted-foreground mb-4 line-clamp-2">
							{notification.message}
						</p>
						<div className="flex items-center gap-3">
							{!notification.read && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										onMarkAsRead(notification._id);
									}}
									className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium transition-colors"
								>
									<CheckCircle className="w-4 h-4" />
									Mark Read
								</button>
							)}
							{isDeletable && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										onDelete(notification._id);
									}}
									className="flex items-center gap-2 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg text-sm font-medium transition-colors"
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
	const [searchQuery, setSearchQuery] = useState('');

	const handleNotificationAction = async (
		action: 'markAsRead' | 'delete' | 'markAllAsRead',
		payload: { notificationId?: string; tab?: string }
	) => {
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
			?.filter((n) => {
				const matchesTab = activeTab === 'All' || n.type === activeTab;
				const matchesSearch =
					searchQuery.trim() === '' ||
					n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					n.message.toLowerCase().includes(searchQuery.toLowerCase());
				return matchesTab && matchesSearch;
			})
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
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8 max-w-6xl">
				{selectedNotification && (
					<NotificationModal
						notification={selectedNotification}
						onClose={() => setSelectedNotification(null)}
					/>
				)}

				<div className="bg-card border rounded-2xl shadow-lg p-6 mb-8">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
						<div className="flex items-center space-x-6">
							<div className="text-center">
								<div className="text-2xl font-bold text-primary">
									{filteredNotifications.length}
								</div>
								<div className="text-sm text-muted-foreground">Total</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-destructive">
									{filteredUnreadCount}
								</div>
								<div className="text-sm text-muted-foreground">Unread</div>
							</div>
						</div>
						{filteredUnreadCount > 0 && (
							<button
								onClick={() =>
									handleNotificationAction('markAllAsRead', { tab: activeTab })
								}
								className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
							>
								Mark All as Read
							</button>
						)}
					</div>

					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
						<input
							type="text"
							placeholder="Search notifications by keyword..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-11 pr-4 py-3 bg-background border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
						/>
						{searchQuery && (
							<button
								onClick={() => setSearchQuery('')}
								className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-accent rounded-full transition-colors"
							>
								<X className="w-4 h-4 text-muted-foreground" />
							</button>
						)}
					</div>
				</div>

				<div className="bg-card border rounded-2xl shadow-lg mb-8 overflow-hidden">
					<nav className="flex overflow-x-auto">
						{tabs.map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all duration-300 whitespace-nowrap border-b-2 ${
									activeTab === tab
										? 'border-primary text-primary bg-primary/10'
										: 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
								}`}
							>
								{getTabIcon(tab)}
								{tab}
								{tab !== 'All' &&
									user?.notifications?.filter((n) => n.type === tab && !n.read)
										.length > 0 && (
										<span className="ml-1 px-2 py-0.5 bg-destructive text-destructive-foreground text-xs rounded-full">
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
							<div className="inline-flex items-center justify-center w-24 h-24 bg-muted rounded-full mb-6">
								<Archive className="w-12 h-12 text-muted-foreground" />
							</div>
							<h3 className="text-2xl font-bold text-foreground mb-2">
								All Clear!
							</h3>
							<p className="text-muted-foreground max-w-md mx-auto">
								{activeTab === 'All'
									? "You don't have any notifications at the moment."
									: `No ${activeTab.toLowerCase()} notifications to show.`}
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Notifications;
