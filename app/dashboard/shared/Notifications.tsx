'use client';
import React, { useState, useMemo } from 'react';
import useAuth from '@/store/useAuth';
import {
	User,
	Lock,
	GraduationCap,
	Clock,
	Search,
	Bell,
	X,
} from 'lucide-react';

import { Notification } from '@/types';
const EventLogComponent = () => {
	const { user, setUser } = useAuth();
	const [activeTab, setActiveTab] = useState('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [timeFilter, setTimeFilter] = useState('7days');
	const [selectedEvent, setSelectedEvent] = useState<Notification | null>(null);
	const [visibleCount, setVisibleCount] = useState(5);

	const events: Notification[] = useMemo(
		() =>
			user?.notifications?.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			) || [],
		[user]
	);

	const tabs = [
		{ id: 'all', label: 'All Events', icon: Clock, count: events.length },
		{
			id: 'Login',
			label: 'Login',
			icon: User,
			count: events.filter((e) => e.type === 'Login').length,
		},
		{
			id: 'Grades',
			label: 'Grades',
			icon: GraduationCap,
			count: events.filter((e) => e.type === 'Grades').length,
		},
		{
			id: 'Security',
			label: 'Security',
			icon: Lock,
			count: events.filter((e) => e.type === 'Security').length,
		},
		{
			id: 'Profile',
			label: 'Profile',
			icon: User,
			count: events.filter((e) => e.type === 'Profile').length,
		},
	];

	const getTypeIcon = (type: string) => {
		switch (type) {
			case 'Login':
				return User;
			case 'Grades':
				return GraduationCap;
			case 'Security':
				return Lock;
			case 'Profile':
				return User;
			default:
				return Clock;
		}
	};

	const formatTimestamp = (timestamp: any) => {
		const date = new Date(timestamp) as any;
		const now = new Date() as any;
		const diffInMinutes = Math.floor((now - date) / (1000 * 60));
		const diffInHours = Math.floor(diffInMinutes / 60);

		if (diffInMinutes < 1) return 'Just now';
		if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
		if (diffInHours < 24) return `${diffInHours} hours ago`;
		return (
			date.toLocaleDateString() +
			' at ' +
			date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		);
	};

	const filteredEvents = events
		.filter((event) => activeTab === 'all' || event.type === activeTab)
		.filter(
			(event) =>
				searchTerm === '' ||
				event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
				event.message.toLowerCase().includes(searchTerm.toLowerCase())
		);

	const handleMarkAsRead = async (notificationId: string) => {
		if (!user) return;

		const originalNotifications = user.notifications;
		const updatedNotifications = originalNotifications.map((n) =>
			n._id === notificationId ? { ...n, read: true } : n
		);
		setUser({ ...user, notifications: updatedNotifications });
		if (selectedEvent?.id === notificationId) {
			setSelectedEvent((prev) => (prev ? { ...prev, read: true } : null));
		}

		try {
			const response = await fetch(
				`/api/notifications/${notificationId}?id=${notificationId}`,
				{
					method: 'PATCH',
				}
			);
			if (!response.ok) {
				throw new Error('Failed to mark as read');
			}
		} catch (error) {
			console.error('Error marking notification as read:', error);
			setUser({ ...user, notifications: originalNotifications });
			if (selectedEvent?._id === notificationId) {
				setSelectedEvent((prev) => (prev ? { ...prev, read: false } : null));
			}
		}
	};

	const handleMarkAllAsRead = async () => {
		if (!user) return;

		const originalNotifications = user.notifications;
		const updatedNotifications = originalNotifications.map((notification) => {
			if (activeTab === 'all' || notification.type === activeTab) {
				return { ...notification, read: true };
			}
			return notification;
		});
		setUser({ ...user, notifications: updatedNotifications });

		try {
			const response = await fetch('/api/notifications/read-all', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tab: activeTab }),
			});

			if (!response.ok) {
				throw new Error('Failed to mark all as read');
			}
		} catch (error) {
			console.error('Error marking all notifications as read:', error);
			setUser({ ...user, notifications: originalNotifications });
		}
	};

	const handleEventClick = (event: Notification) => {
		setSelectedEvent(event);
		if (!event.read) {
			handleMarkAsRead(event._id);
		}
	};

	const EventModal = ({
		event,
		onClose,
	}: {
		event: Notification | null;
		onClose: () => void;
	}) => {
		if (!event) return null;
		const Icon = getTypeIcon(event.type);
		return (
			<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
				<div className="bg-card rounded-lg shadow-xl w-full max-w-lg">
					<div className="p-4 border-b flex justify-between items-center">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							<Icon className="w-5 h-5" />
							{event.title}
						</h3>
						<button onClick={onClose} className="text-muted-foreground">
							<X className="w-5 h-5" />
						</button>
					</div>
					<div className="p-6 space-y-4">
						<p>
							<strong>Description:</strong> {event.message}
						</p>
						<p>
							<strong>Details:</strong>{' '}
							{event.details || 'No additional details.'}
						</p>
						<p className="text-sm text-muted-foreground">
							{formatTimestamp(event.timestamp)}
						</p>
					</div>
					<div className="p-4 border-t text-right">
						<button
							onClick={onClose}
							className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="w-full p-4 sm:p-6 bg-background min-h-screen">
			<div className="bg-card rounded-lg shadow-sm border border-border">
				{/* Header */}
				<div className="border-b border-border p-4 sm:p-6">
					<div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
						<div>
							<h1 className="text-xl sm:text-2xl font-bold text-foreground">
								Notifications
							</h1>
							<p className="text-muted-foreground mt-1 text-sm sm:text-base">
								Monitor and track all system activities
							</p>
						</div>
						<div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
								<input
									type="text"
									placeholder="Search events..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full sm:w-auto pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground"
								/>
							</div>
							<select
								value={timeFilter}
								onChange={(e) => setTimeFilter(e.target.value)}
								className="px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
							>
								<option value="1day">Last 24 hours</option>
								<option value="7days">Last 7 days</option>
								<option value="30days">Last 30 days</option>
								<option value="all">All time</option>
							</select>
							<button
								onClick={handleMarkAllAsRead}
								className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
							>
								Mark All as Read
							</button>
						</div>
					</div>
				</div>

				{/* Tabs */}
				<div className="border-b border-border overflow-x-auto">
					<nav
						className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 min-w-max"
						aria-label="Tabs"
					>
						{tabs.map((tab) => {
							const Icon = tab.icon;
							const isActive = activeTab === tab.id;
							return (
								<button
									key={tab.id}
									onClick={() => {
										setActiveTab(tab.id);
										setVisibleCount(5);
									}}
									className={`${
										isActive
											? 'border-primary text-primary'
											: 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
									} whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors`}
								>
									<Icon className="w-4 h-4" />
									<span className="hidden sm:inline">{tab.label}</span>
									<span className="sm:hidden">{tab.label.split(' ')[0]}</span>
									<span
										className={`${
											isActive
												? 'bg-primary/10 text-primary'
												: 'bg-muted text-muted-foreground'
										} rounded-full px-2 sm:px-2.5 py-0.5 text-xs font-medium transition-colors`}
									>
										{tab.count}
									</span>
								</button>
							);
						})}
					</nav>
				</div>

				{/* Events List */}
				<div className="divide-y divide-border">
					{filteredEvents.length === 0 ? (
						<div className="p-8 sm:p-12 text-center">
							<Bell className="mx-auto h-12 w-12 text-muted-foreground" />
							<h3 className="mt-2 text-sm font-medium text-foreground">
								No notifications found
							</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								{searchTerm
									? 'Try adjusting your search terms.'
									: 'No notifications match the current filter.'}
							</p>
						</div>
					) : (
						filteredEvents.slice(0, visibleCount).map((event) => {
							const Icon = getTypeIcon(event.type);
							return (
								<div
									key={event._id}
									className={`p-4 sm:p-6 hover:bg-muted/50 transition-colors duration-150 cursor-pointer relative ${
										!event.read ? 'bg-primary/5' : ''
									}`}
									onClick={() => handleEventClick(event)}
								>
									{!event.read && (
										<div className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary"></div>
									)}
									<div className="flex items-start space-x-3 sm:space-x-4">
										<div className="flex-shrink-0">
											<div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center">
												<Icon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
												<p className="text-sm font-medium text-foreground">
													{event.title}
												</p>
												<p className="text-xs sm:text-sm text-muted-foreground">
													{formatTimestamp(event.timestamp)}
												</p>
											</div>
											<p className="mt-1 text-sm text-muted-foreground">
												{event.message}
											</p>
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>

				{/* Footer */}
				{filteredEvents.length > visibleCount && (
					<div className="border-t border-border px-4 sm:px-6 py-3 text-center">
						<button
							onClick={() => setVisibleCount((prev) => prev + 5)}
							className="text-primary hover:text-primary/80 font-medium transition-colors"
						>
							Load more notifications
						</button>
					</div>
				)}
			</div>
			<EventModal
				event={selectedEvent}
				onClose={() => setSelectedEvent(null)}
			/>
		</div>
	);
};

export default EventLogComponent;
