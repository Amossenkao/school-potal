'use client';
import React, { useMemo, useRef, useState } from 'react';
import useAuth from '@/store/useAuth';
import {
	CheckCircle,
	Info,
	X,
	Archive,
	Trash2,
	Loader2,
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
	details?: string | Record<string, any>;
}

interface GradeDetails {
	teacherName?: string;
	className?: string;
	period?: string;
	subject?: string;
	studentsGraded?: number;
	passes?: number;
	fails?: number;
	academicYear?: string;
	submissionId?: string;
	requestCount?: number;
	requestStatus?: string;
	studentName?: string;
	originalGrade?: number;
	requestedGrade?: number;
	reasonForChange?: string;
	adminRejectionReason?: string;
}

const parseGradeDetails = (notification: Notification): GradeDetails | null => {
	if (notification.type !== 'Grades' || !notification.details) return null;
	const raw = notification.details;
	let parsed: any = raw;
	if (typeof raw === 'string') {
		try {
			parsed = JSON.parse(raw);
		} catch {
			return null;
		}
	}
	if (!parsed || typeof parsed !== 'object') return null;
	return {
		teacherName: parsed.teacherName,
		className: parsed.className || parsed.classId,
		period: parsed.period,
		subject: parsed.subject,
		studentsGraded:
			typeof parsed.studentsGraded === 'number'
				? parsed.studentsGraded
				: undefined,
		passes: typeof parsed.passes === 'number' ? parsed.passes : undefined,
		fails: typeof parsed.fails === 'number' ? parsed.fails : undefined,
		academicYear: parsed.academicYear,
		submissionId: parsed.submissionId,
		requestCount:
			typeof parsed.requestCount === 'number' ? parsed.requestCount : undefined,
		requestStatus: parsed.requestStatus,
		studentName: parsed.studentName,
		originalGrade:
			typeof parsed.originalGrade === 'number' ? parsed.originalGrade : undefined,
		requestedGrade:
			typeof parsed.requestedGrade === 'number'
				? parsed.requestedGrade
				: undefined,
		reasonForChange: parsed.reasonForChange,
		adminRejectionReason: parsed.adminRejectionReason,
	};
};

const GradeDetailCard = ({ details }: { details: GradeDetails }) => {
	const gradeChangeSummary =
		typeof details.originalGrade === 'number' &&
		typeof details.requestedGrade === 'number'
			? `${details.originalGrade} -> ${details.requestedGrade}`
			: undefined;

	const items = [
		{ label: 'Teacher', value: details.teacherName },
		{ label: 'Class', value: details.className },
		{ label: 'Period', value: details.period },
		{ label: 'Subject', value: details.subject },
		{ label: 'Academic Year', value: details.academicYear },
		{
			label: 'Students Graded',
			value:
				typeof details.studentsGraded === 'number'
					? String(details.studentsGraded)
					: undefined,
		},
		{
			label: 'Pass / Fail',
			value:
				typeof details.passes === 'number' && typeof details.fails === 'number'
					? `${details.passes} / ${details.fails}`
					: undefined,
		},
		{
			label: 'Requests',
			value:
				typeof details.requestCount === 'number'
					? String(details.requestCount)
					: undefined,
		},
		{ label: 'Status', value: details.requestStatus },
		{ label: 'Student', value: details.studentName },
		{ label: 'Grade Change', value: gradeChangeSummary },
	].filter((item) => item.value !== undefined && item.value !== '');

	if (items.length === 0 && !details.reasonForChange && !details.adminRejectionReason) {
		return null;
	}

	return (
		<div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-foreground">
			<div className="grid grid-cols-2 gap-3">
				{items.map((item) => (
					<div key={item.label}>
						<p className="text-xs uppercase tracking-wide text-muted-foreground">
							{item.label}
						</p>
						<p className="font-semibold">{item.value}</p>
					</div>
				))}
			</div>
			{details.reasonForChange && (
				<div className="mt-3">
					<p className="text-xs uppercase tracking-wide text-muted-foreground">
						Reason
					</p>
					<p className="font-semibold">{details.reasonForChange}</p>
				</div>
			)}
			{details.adminRejectionReason && (
				<div className="mt-3">
					<p className="text-xs uppercase tracking-wide text-muted-foreground">
						Admin Reason
					</p>
					<p className="font-semibold">{details.adminRejectionReason}</p>
				</div>
			)}
		</div>
	);
};

const NotificationModal = ({
	notification,
	onClose,
}: {
	notification: Notification;
	onClose: () => void;
}) => {
	const gradeDetails = parseGradeDetails(notification);
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
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
			onClick={onClose}
		>
			<div
				className="bg-background rounded-2xl shadow-2xl p-8 w-full max-w-lg border animate-in fade-in zoom-in duration-300"
				onClick={(e) => e.stopPropagation()}
			>
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
					{gradeDetails && <GradeDetailCard details={gradeDetails} />}
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
	isReadPending = false,
	isDeletePending = false,
}: {
	notification: Notification;
	onMarkAsRead: (id: string) => void;
	onDelete: (id: string) => void;
	onView: (notification: Notification) => void;
	isReadPending?: boolean;
	isDeletePending?: boolean;
}) => {
	const gradeDetails = parseGradeDetails(notification);
	const gradeSummary = gradeDetails
		? [gradeDetails.subject, gradeDetails.className, gradeDetails.period]
				.filter(Boolean)
				.join(' • ')
		: '';
	const getIcon = (type: NotificationType) => {
		switch (type) {
			case 'Grades':
				return <Star className="w-5 h-5 text-emerald-500" />;
			case 'Security':
				return <ShieldCheck className="w-5 h-5 text-red-500" />;
			case 'Profile':
				return <User className="w-5 h-5 text-blue-500" />;
			case 'Others':
				return <MessageSquare className="w-5 h-5 text-muted-foreground" />;
			default:
				return <Info className="w-5 h-5 text-muted-foreground" />;
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
			className={`group relative overflow-hidden rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer ${
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
			<div className="p-3 sm:p-4">
				<div className="flex items-start gap-3">
					<div className="flex-shrink-0 p-2 rounded-lg bg-background shadow-sm">
						{getIcon(notification.type)}
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-start justify-between gap-2">
							<h4 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
								{notification.title}
							</h4>
							<div className="flex items-center space-x-1.5 text-xs text-muted-foreground shrink-0">
								<Clock className="w-3.5 h-3.5" />
								<span className="hidden sm:block">
									{format(parseISO(notification.timestamp), 'MMM d, h:mm a')}
								</span>
								<span className="sm:hidden">
									{format(parseISO(notification.timestamp), 'MMM d')}
								</span>
							</div>
						</div>
						<div className="mt-1 flex items-center gap-2">
							<span className="inline-flex items-center px-2 py-0.5 bg-muted text-muted-foreground rounded-md text-[11px] font-medium">
								{notification.type}
							</span>
							{!notification.read && (
								<span className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[11px] font-medium">
									Unread
								</span>
							)}
						</div>
						{gradeSummary ? (
							<p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 line-clamp-1">
								{gradeSummary}
							</p>
						) : (
							<p className="mt-1 text-sm text-muted-foreground line-clamp-1">
								{notification.message}
							</p>
						)}
					</div>
					<div className="flex items-center gap-1 shrink-0">
						{!notification.read && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onMarkAsRead(notification._id);
								}}
								disabled={isReadPending}
								className="p-2 rounded-md bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 transition-colors disabled:opacity-60"
								title="Mark as read"
								aria-label="Mark as read"
							>
								{isReadPending ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<CheckCircle className="w-4 h-4" />
								)}
							</button>
						)}
						{isDeletable && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onDelete(notification._id);
								}}
								disabled={isDeletePending}
								className="p-2 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors disabled:opacity-60"
								title="Delete notification"
								aria-label="Delete notification"
							>
								{isDeletePending ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<Trash2 className="w-4 h-4" />
								)}
							</button>
						)}
					</div>
				</div>
			</div>
			{!notification.read && (
				<div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary shadow-sm" />
			)}
		</div>
	);
};

const Notifications: React.FC = () => {
	const { user, setUser } = useAuth();
	const [activeTab, setActiveTab] = useState<NotificationType | 'All'>('All');
	const [selectedNotification, setSelectedNotification] =
		useState<Notification | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [pendingReadIds, setPendingReadIds] = useState<Set<string>>(new Set());
	const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(
		new Set(),
	);
	const [searchQuery, setSearchQuery] = useState('');
	const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>(
		'left'
	);
	const touchStartX = useRef<number | null>(null);
	const touchStartY = useRef<number | null>(null);
	const toNotificationId = (value: unknown) => String(value || '').trim();

	const handleNotificationAction = async (
		action: 'markAsRead' | 'delete' | 'markAllAsRead',
		payload: { notificationId?: string; tab?: string }
	) => {
		if (!user) return;
		const previousUser = user;
		const normalizedId = toNotificationId(payload.notificationId);
		let affectedIds: string[] = [];
		if (action === 'markAsRead' && normalizedId) {
			affectedIds = [normalizedId];
			setPendingReadIds((prev) => new Set(prev).add(normalizedId));
			setUser({
				...user,
				notifications: (user.notifications || []).map((n) =>
					toNotificationId(n._id) === normalizedId ? { ...n, read: true } : n,
				),
			});
		}
		if (action === 'delete' && normalizedId) {
			affectedIds = [normalizedId];
			setPendingDeleteIds((prev) => new Set(prev).add(normalizedId));
			setUser({
				...user,
				notifications: (user.notifications || []).filter(
					(n) => toNotificationId(n._id) !== normalizedId,
				),
			});
		}
		if (action === 'markAllAsRead') {
			const tabFilter = payload?.tab || 'All';
			affectedIds = (user.notifications || [])
				.filter((n) => !n.read && (tabFilter === 'All' || n.type === tabFilter))
				.map((n) => toNotificationId(n._id))
				.filter(Boolean);
			setIsLoading(true);
			setPendingReadIds((prev) => {
				const next = new Set(prev);
				affectedIds.forEach((id) => next.add(id));
				return next;
			});
			const affectedSet = new Set(affectedIds);
			setUser({
				...user,
				notifications: (user.notifications || []).map((n) =>
					affectedSet.has(toNotificationId(n._id)) ? { ...n, read: true } : n,
				),
			});
		}
		try {
			const response = await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, ...payload }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.message || `Failed to perform action: ${action}`
				);
			}
		} catch (error) {
			console.error(`Failed to perform action: ${action}`, error);
			setUser(previousUser);
		} finally {
			if (affectedIds.length > 0) {
				if (action === 'delete') {
					setPendingDeleteIds((prev) => {
						const next = new Set(prev);
						affectedIds.forEach((id) => next.delete(id));
						return next;
					});
				} else {
					setPendingReadIds((prev) => {
						const next = new Set(prev);
						affectedIds.forEach((id) => next.delete(id));
						return next;
					});
				}
			}
			if (action === 'markAllAsRead') {
				setIsLoading(false);
			}
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
				const normalizedId = toNotificationId(n._id);
				if (pendingDeleteIds.has(normalizedId)) return false;
				const matchesTab = activeTab === 'All' || n.type === activeTab;
				const detailsText =
					typeof n.details === 'string'
						? n.details
						: n.details
							? JSON.stringify(n.details)
							: '';
				const matchesSearch =
					searchQuery.trim() === '' ||
					n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
					detailsText.toLowerCase().includes(searchQuery.toLowerCase());
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
			setTransitionDirection(direction > 0 ? 'left' : 'right');
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
			className="min-h-screen bg-background text-foreground"
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

				<div className="flex flex-col gap-6">
					<div className="rounded-3xl border border-foreground/5 bg-white/90 p-6 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] backdrop-blur transition-all duration-300 dark:border-white/5 dark:bg-slate-900/80">
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
									disabled={isLoading}
									className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
								>
									{isLoading ? (
										<>
											<Loader2 className="w-4 h-4 animate-spin" />
											Working...
										</>
									) : (
										'Mark All as Read'
									)}
								</button>
							)}
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
								onClick={() => {
									const direction = index > activeIndex ? 'left' : 'right';
									setTransitionDirection(direction);
									setActiveTab(tab);
								}}
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

				<div
					key={activeTab}
					className={`mt-8 space-y-3 animate-in fade-in duration-300 ${
						transitionDirection === 'left'
							? 'slide-in-from-right-2'
							: 'slide-in-from-left-2'
					}`}
				>
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
								isReadPending={pendingReadIds.has(
									toNotificationId(notification._id),
								)}
								isDeletePending={pendingDeleteIds.has(
									toNotificationId(notification._id),
								)}
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
