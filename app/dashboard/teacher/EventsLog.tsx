'use client';
import React, { useState } from 'react';
import {
	Calendar,
	User,
	Lock,
	GraduationCap,
	Clock,
	ChevronDown,
	Filter,
	Search,
} from 'lucide-react';

const EventLogComponent = () => {
	const [activeTab, setActiveTab] = useState('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [timeFilter, setTimeFilter] = useState('7days');

	// Sample event data
	const events = [
		{
			id: 1,
			type: 'login',
			title: 'User Login',
			description: 'Successfully logged into the system',
			timestamp: '2025-08-21T09:15:00Z',
			severity: 'info',
			details: 'IP: 192.168.1.100, Device: Chrome on Windows',
		},
		{
			id: 2,
			type: 'grades',
			title: 'Grade Updated',
			description: 'Updated grade for John Smith in Mathematics',
			timestamp: '2025-08-21T10:30:00Z',
			severity: 'success',
			details: 'Changed from B+ to A-, Assignment: Algebra Quiz #3',
		},
		{
			id: 3,
			type: 'password',
			title: 'Password Changed',
			description: 'Password successfully updated',
			timestamp: '2025-08-21T11:45:00Z',
			severity: 'warning',
			details: 'Password strength: Strong',
		},
		{
			id: 5,
			type: 'grades',
			title: 'Bulk Grade Import',
			description: 'Imported grades for 28 students',
			timestamp: '2025-08-21T14:10:00Z',
			severity: 'success',
			details: 'CSV import successful, Subject: Physics Lab Reports',
		},
		{
			id: 7,
			type: 'login',
			title: 'Failed Login Attempt',
			description: 'Invalid password attempt',
			timestamp: '2025-08-20T08:20:00Z',
			severity: 'error',
			details: 'IP: 203.45.67.89, Attempts: 3',
		},
		{
			id: 8,
			type: 'profile',
			title: 'Profile Updated',
			description: 'Contact information updated',
			timestamp: '2025-08-20T16:45:00Z',
			severity: 'info',
			details: 'Changed phone number and office hours',
		},
	];

	const tabs = [
		{ id: 'all', label: 'All Events', icon: Clock, count: events.length },
		{
			id: 'login',
			label: 'Login',
			icon: User,
			count: events.filter((e) => e.type === 'login').length,
		},
		{
			id: 'grades',
			label: 'Grades',
			icon: GraduationCap,
			count: events.filter((e) => e.type === 'grades').length,
		},
		{
			id: 'password',
			label: 'Security',
			icon: Lock,
			count: events.filter((e) => e.type === 'password').length,
		},
		{
			id: 'profile',
			label: 'Profile',
			icon: User,
			count: events.filter((e) => e.type === 'profile').length,
		},
	];

	const getSeverityColor = (severity: string) => {
		switch (severity) {
			case 'error':
				return 'bg-destructive/10 text-destructive border-destructive/20';
			case 'warning':
				return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-500';
			case 'success':
				return 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-500';
			default:
				return 'bg-primary/10 text-primary border-primary/20';
		}
	};

	const getTypeIcon = (type: string) => {
		switch (type) {
			case 'login':
				return User;
			case 'grades':
				return GraduationCap;
			case 'password':
				return Lock;
			case 'profile':
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
				event.description.toLowerCase().includes(searchTerm.toLowerCase())
		);

	return (
		<div className="w-full p-4 sm:p-6 bg-background min-h-screen">
			<div className="bg-card rounded-lg shadow-sm border border-border">
				{/* Header */}
				<div className="border-b border-border p-4 sm:p-6">
					<div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
						<div>
							<h1 className="text-xl sm:text-2xl font-bold text-foreground">
								Events Log
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
									onClick={() => setActiveTab(tab.id)}
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
							<Clock className="mx-auto h-12 w-12 text-muted-foreground" />
							<h3 className="mt-2 text-sm font-medium text-foreground">
								No events found
							</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								{searchTerm
									? 'Try adjusting your search terms.'
									: 'No events match the current filter.'}
							</p>
						</div>
					) : (
						filteredEvents.map((event) => {
							const Icon = getTypeIcon(event.type);
							return (
								<div
									key={event.id}
									className="p-4 sm:p-6 hover:bg-muted/50 transition-colors duration-150"
								>
									<div className="flex items-start space-x-3 sm:space-x-4">
										<div className="flex-shrink-0">
											<div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center">
												<Icon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
											</div>
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
												<div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
													<p className="text-sm font-medium text-foreground">
														{event.title}
													</p>
													<span
														className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(
															event.severity
														)} self-start`}
													>
														{event.severity}
													</span>
												</div>
												<p className="text-xs sm:text-sm text-muted-foreground">
													{formatTimestamp(event.timestamp)}
												</p>
											</div>
											<p className="mt-1 text-sm text-muted-foreground">
												{event.description}
											</p>
											<p className="mt-2 text-xs text-muted-foreground/80 break-words">
												{event.details}
											</p>
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>

				{/* Footer */}
				{filteredEvents.length > 0 && (
					<div className="border-t border-border px-4 sm:px-6 py-3">
						<div className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 text-sm text-muted-foreground">
							<p>
								Showing {filteredEvents.length} of {events.length} events
							</p>
							<button className="text-primary hover:text-primary/80 font-medium transition-colors self-start sm:self-auto">
								Load more events
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default EventLogComponent;
