'use client';
import React, { useMemo, useRef, useState } from 'react';
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
	const touchStartX = useRef<number | null>(null);
	const touchStartY = useRef<number | null>(null);

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

	const activeIndex = useMemo(
		() => Math.max(0, tabs.findIndex((tab) => tab === activeTab)),
		[tabs, activeTab]
	);

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

	const moveTab = (direction: -1 | 1) => {
		if (!tabs.length) return;
		const nextIndex = Math.min(
			tabs.length - 1,
			Math.max(0, activeIndex + direction)
		);
		const nextTab = tabs[nextIndex];
		if (nextTab !== activeTab) {
			setActiveTab(nextTab);
		}
	};

	const handleTouchStart = (event: React.TouchEvent) => {
		const touch = event.touches[0];
		if (!touch) return;
		touchStartX.current = touch.clientX;
		touchStartY.current = touch.clientY;
	};

	const handleTouchEnd = (event: React.TouchEvent) => {
		const touch = event.changedTouches[0];
		if (
			!touch ||
			touchStartX.current === null ||
			touchStartY.current === null
		) {
			return;
		}
		const deltaX = touch.clientX - touchStartX.current;
		const deltaY = touch.clientY - touchStartY.current;
		touchStartX.current = null;
		touchStartY.current = null;

		if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) {
			return;
		}
		if (deltaX < 0) {
			moveTab(1);
		} else {
			moveTab(-1);
		}
	};

	return (
		<div
			className="min-h-screen bg-[#f8fafc] text-foreground dark:bg-slate-950"
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
		>
			<div className="relative overflow-hidden">
				<div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/20" />
				<div className="pointer-events-none absolute -top-16 right-[-80px] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-500/20" />
				<div className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl dark:bg-amber-500/20" />
			</div>
			<div className="container mx-auto px-4 py-10 max-w-6xl">
				{selectedNotification && (
					<NotificationModal
						notification={selectedNotification}
						onClose={() => setSelectedNotification(null)}
					/>
				)}

				<div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
					<div className="rounded-3xl border border-foreground/5 bg-white/90 p-6 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/5 dark:bg-slate-900/80">
						<div className="flex flex-wrap items-center justify-between gap-4">
							<div>
								<p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
									Notification Center
								</p>
								<h1 className="text-3xl font-semibold text-foreground">
									Stay ahead, stay calm.
								</h1>
								<p className="mt-2 text-sm text-muted-foreground">
									Swipe left or right to switch categories.
								</p>
							</div>
							<div className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-muted/60 px-4 py-3 dark:border-white/10 dark:bg-slate-900/70">
								<div>
									<p className="text-xs text-muted-foreground">Total</p>
									<p className="text-2xl font-semibold text-foreground">
										{filteredNotifications.length}
									</p>
								</div>
								<div className="h-10 w-px bg-foreground/10" />
								<div>
									<p className="text-xs text-muted-foreground">Unread</p>
									<p className="text-2xl font-semibold text-rose-500">
										{filteredUnreadCount}
									</p>
								</div>
							</div>
						</div>

						<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
								<input
									type="text"
									placeholder="Search notifications by keyword..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full rounded-2xl border border-foreground/10 bg-white/90 py-3 pl-11 pr-11 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-transparent transition-all dark:border-white/10 dark:bg-slate-900/80"
								/>
								{searchQuery && (
									<button
										onClick={() => setSearchQuery('')}
										className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-accent transition-colors"
									>
										<X className="w-4 h-4 text-muted-foreground" />
									</button>
								)}
							</div>
							{filteredUnreadCount > 0 && (
								<button
									onClick={() =>
										handleNotificationAction('markAllAsRead', {
											tab: activeTab,
										})
									}
									className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
								>
									Mark All as Read
								</button>
							)}
						</div>
					</div>

					<div className="rounded-3xl border border-foreground/5 bg-white/80 p-6 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] dark:border-white/5 dark:bg-slate-900/70">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-semibold">Tab overview</h2>
							<span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
								Smart cues
							</span>
						</div>
						<div className="mt-4 space-y-3">
							{tabs.map((tab) => (
								<button
									key={tab}
									onClick={() => setActiveTab(tab)}
									className={`group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
										activeTab === tab
											? 'border-emerald-500/60 bg-emerald-500/10 text-foreground shadow-[0_12px_30px_-20px_rgba(16,185,129,0.7)]'
											: 'border-foreground/10 bg-white hover:border-foreground/20 dark:border-white/10 dark:bg-slate-900/70 dark:hover:border-white/20'
									}`}
								>
									<div className="flex items-center gap-3">
										<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/70 text-foreground dark:bg-slate-800">
											{getTabIcon(tab)}
										</span>
										<div>
											<p className="text-sm font-semibold">{tab}</p>
											<p className="text-xs text-muted-foreground">
												{tab === 'All'
													? 'Everything in one place'
													: `Latest ${tab.toLowerCase()} updates`}
											</p>
										</div>
									</div>
									{tab !== 'All' &&
										user?.notifications?.filter(
											(n) => n.type === tab && !n.read
										).length > 0 && (
											<span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-semibold text-white">
												{
													user.notifications.filter(
														(n) => n.type === tab && !n.read
													).length
												}
											</span>
										)}
								</button>
							))}
						</div>
					</div>
				</div>

				<div className="mt-8 rounded-3xl border border-foreground/10 bg-white/90 p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)] dark:border-white/10 dark:bg-slate-900/80">
					<nav
						className="flex gap-2 overflow-x-auto pb-2"
					>
						{tabs.map((tab, index) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
									activeTab === tab
										? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700'
										: 'border-transparent bg-muted/60 text-muted-foreground hover:text-foreground'
								}`}
								aria-pressed={activeTab === tab}
							>
								{getTabIcon(tab)}
								{tab}
								{index === activeIndex && (
									<span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
								)}
							</button>
						))}
					</nav>
				</div>

				<div className="mt-8 space-y-6">
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
