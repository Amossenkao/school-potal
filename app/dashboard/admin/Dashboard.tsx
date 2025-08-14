'use client';
import React, { useEffect, useState } from 'react';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Users,
	BookOpen,
	CalendarDays,
	CheckCircle,
	Clock,
	BarChart3,
	TrendingUp,
	Activity,
	PieChart,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageLoading } from '@/components/loading';

type User = {
	id: string;
	role: string;
	firstName: string;
	lastName: string;
	// ...other fields
};

type StatsData = {
	totalStudents: number;
	totalClasses: number;
	upcomingEvents: number;
	gradeReportsPercent: number;
};

type Task = {
	title: string;
	status: 'pending' | 'completed';
	dueDate: string;
	priority: 'high' | 'medium' | 'low';
};

type Notice = {
	title: string;
	content: string;
	date: string;
	type: 'info' | 'important' | 'warning';
};

export default function Dashboard() {
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState<StatsData | null>(null);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [notices, setNotices] = useState<Notice[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchDashboardData = async () => {
			setLoading(true);
			setError(null);
			try {
				// Fetch users (students)
				const studentsRes = await fetch('/api/users?role=student');
				const studentsData = await studentsRes.json();

				// Fetch classes
				const classesRes = await fetch('/api/classes');
				const classesData = await classesRes.json();

				// Fetch events (simulate)
				const eventsRes = await fetch('/api/events');
				const eventsData = await eventsRes.json();

				// Fetch grade reports (simulate)
				const gradesRes = await fetch('/api/grades/reports');
				const gradesData = await gradesRes.json();

				// Fetch tasks (simulate)
				const tasksRes = await fetch('/api/tasks');
				const tasksData = await tasksRes.json();

				// Fetch notices (simulate)
				const noticesRes = await fetch('/api/notices');
				const noticesData = await noticesRes.json();

				setStats({
					totalStudents: studentsData.data?.length ?? 0,
					totalClasses: classesData.data?.length ?? 0,
					upcomingEvents: eventsData.data?.length ?? 0,
					gradeReportsPercent: gradesData.data?.percent ?? 0,
				});
				setTasks(tasksData.data ?? []);
				setNotices(noticesData.data ?? []);
			} catch (err: any) {
				setError('Failed to load dashboard data.');
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<PageLoading
					message="Content Loading, Please wait..."
					fullScreen={false}
				/>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-[60vh] text-red-500">
				{error}
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">
						Last updated: {new Date().toLocaleString()}
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => window.location.reload()}
					>
						<RefreshIcon className="h-4 w-4 mr-2" />
						Refresh
					</Button>
				</div>
			</div>

			<div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
				<StatsCard
					title="Total Students"
					value={stats?.totalStudents?.toLocaleString() ?? '0'}
					description="+8% from last term"
					icon={<Users className="h-6 w-6" />}
					trend="up"
				/>
				<StatsCard
					title="Classes"
					value={stats?.totalClasses?.toLocaleString() ?? '0'}
					description="Across all grades"
					icon={<BookOpen className="h-6 w-6" />}
					trend="neutral"
				/>
				<StatsCard
					title="Upcoming Events"
					value={stats?.upcomingEvents?.toLocaleString() ?? '0'}
					description="Next 7 days"
					icon={<CalendarDays className="h-6 w-6" />}
					trend="neutral"
				/>
				<StatsCard
					title="Grade Reports"
					value={stats ? `${stats.gradeReportsPercent}%` : '0%'}
					description="Submitted for this term"
					icon={<CheckCircle className="h-6 w-6" />}
					trend="up"
				/>
			</div>

			<div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-xl font-semibold">
							Term Progress
						</CardTitle>
						<CardDescription>
							Current academic term is 65% complete
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="flex justify-between">
								<span className="text-sm font-medium">Term Progress</span>
								<span className="text-sm font-medium">65%</span>
							</div>
							<Progress value={65} />

							<div className="grid gap-4 grid-cols-2 pt-4">
								<div className="border rounded-lg p-3">
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-2">
											<div className="p-2 bg-blue-50 rounded-full">
												<Clock className="h-5 w-5 text-blue-500" />
											</div>
											<span className="font-medium">Days Left</span>
										</div>
										<span className="text-2xl font-semibold">24</span>
									</div>
								</div>
								<div className="border rounded-lg p-3">
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-2">
											<div className="p-2 bg-green-50 rounded-full">
												<CheckCircle className="h-5 w-5 text-green-500" />
											</div>
											<span className="font-medium">Completed</span>
										</div>
										<span className="text-2xl font-semibold">48</span>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-xl font-semibold">
							Tasks Overview
						</CardTitle>
						<CardDescription>Your pending tasks and approvals</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="space-y-3">
							{tasks.length === 0 && (
								<li className="text-muted-foreground text-sm">
									No tasks found.
								</li>
							)}
							{tasks.map((task, idx) => (
								<TaskItem
									key={idx}
									title={task.title}
									status={task.status}
									dueDate={task.dueDate}
									priority={task.priority}
								/>
							))}
						</ul>
						<div className="mt-4">
							<Button variant="outline" className="w-full">
								View All Tasks
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
				<Card className="col-span-1 lg:col-span-2">
					<CardHeader>
						<CardTitle className="text-xl font-semibold">
							Academic Performance
						</CardTitle>
						<CardDescription>
							Average grades by subject across all classes
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-80 flex items-center justify-center border-b pb-4">
							<BarChartPlaceholder />
						</div>
						<div className="flex justify-between items-center pt-4">
							<div className="flex items-center space-x-2">
								<div className="w-3 h-3 bg-blue-500 rounded-full"></div>
								<span className="text-sm text-muted-foreground">
									Current Term
								</span>
							</div>
							<div className="flex items-center space-x-2">
								<div className="w-3 h-3 bg-gray-300 rounded-full"></div>
								<span className="text-sm text-muted-foreground">
									Previous Term
								</span>
							</div>
							<Button variant="ghost" size="sm">
								<BarChart3 className="h-4 w-4 mr-2" />
								Detailed Report
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-xl font-semibold">
							Recent Notices
						</CardTitle>
						<CardDescription>School-wide announcements</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="space-y-3">
							{notices.length === 0 && (
								<li className="text-muted-foreground text-sm">
									No notices found.
								</li>
							)}
							{notices.map((notice, idx) => (
								<NoticeItem
									key={idx}
									title={notice.title}
									content={notice.content}
									date={notice.date}
									type={notice.type}
								/>
							))}
						</ul>
						<div className="mt-4">
							<Button variant="outline" className="w-full">
								View All Notices
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function StatsCard({
	title,
	value,
	description,
	icon,
	trend,
}: {
	title: string;
	value: string;
	description: string;
	icon: React.ReactNode;
	trend: 'up' | 'down' | 'neutral';
}) {
	return (
		<Card>
			<CardContent className="p-6">
				<div className="flex items-center justify-between">
					<div className="p-2 bg-primary/10 rounded-lg">{icon}</div>
					{trend === 'up' && <TrendingUp className="h-5 w-5 text-green-500" />}
					{trend === 'down' && (
						<TrendingUp className="h-5 w-5 text-red-500 rotate-180" />
					)}
					{trend === 'neutral' && (
						<Activity className="h-5 w-5 text-gray-400" />
					)}
				</div>
				<div className="mt-4">
					<h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
					<p className="text-2xl font-bold">{value}</p>
					<p className="text-sm text-muted-foreground mt-1">{description}</p>
				</div>
			</CardContent>
		</Card>
	);
}

function TaskItem({
	title,
	status,
	dueDate,
	priority,
}: {
	title: string;
	status: 'pending' | 'completed';
	dueDate: string;
	priority: 'high' | 'medium' | 'low';
}) {
	return (
		<li className="flex items-center justify-between p-3 border rounded-lg">
			<div className="flex items-center">
				{status === 'pending' ? (
					<div className="h-5 w-5 rounded-full border-2 border-gray-300 mr-3"></div>
				) : (
					<div className="h-5 w-5 rounded-full bg-green-500 text-white flex items-center justify-center mr-3">
						<CheckIcon className="h-3 w-3" />
					</div>
				)}
				<span
					className={`font-medium ${
						status === 'completed' ? 'text-muted-foreground line-through' : ''
					}`}
				>
					{title}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<Badge
					variant={
						priority === 'high'
							? 'destructive'
							: priority === 'medium'
							? 'outline'
							: 'secondary'
					}
					className="text-xs"
				>
					{priority}
				</Badge>
				<span className="text-xs text-muted-foreground">{dueDate}</span>
			</div>
		</li>
	);
}

function NoticeItem({
	title,
	content,
	date,
	type,
}: {
	title: string;
	content: string;
	date: string;
	type: 'info' | 'important' | 'warning';
}) {
	return (
		<li
			className="border-l-4 pl-3 pr-2 py-2 rounded-sm"
			style={{
				borderLeftColor:
					type === 'important'
						? 'rgb(79, 70, 229)'
						: type === 'warning'
						? 'rgb(245, 158, 11)'
						: 'rgb(59, 130, 246)',
			}}
		>
			<div className="flex justify-between items-start">
				<h4 className="font-medium text-sm">{title}</h4>
				<span className="text-xs text-muted-foreground">{date}</span>
			</div>
			<p className="text-xs text-muted-foreground mt-1">{content}</p>
		</li>
	);
}

// Placeholder components
function RefreshIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<path d="M21 2v6h-6"></path>
			<path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
			<path d="M3 22v-6h6"></path>
			<path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
		</svg>
	);
}

function CheckIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<polyline points="20 6 9 17 4 12"></polyline>
		</svg>
	);
}

function BarChartPlaceholder() {
	return (
		<div className="w-full h-full flex items-center justify-center">
			<div className="flex items-end h-64 space-x-2">
				{[40, 65, 75, 90, 60, 80, 70, 55, 45, 85, 50, 65].map((height, i) => (
					<div key={i} className="flex flex-col items-center">
						<div
							className="w-8 bg-blue-500 rounded-t-md"
							style={{ height: `${height}%`, opacity: i % 2 === 0 ? 0.7 : 1 }}
						></div>
						<div className="text-xs mt-1 text-muted-foreground">
							{
								[
									'Jan',
									'Feb',
									'Mar',
									'Apr',
									'May',
									'Jun',
									'Jul',
									'Aug',
									'Sep',
									'Oct',
									'Nov',
									'Dec',
								][i]
							}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
