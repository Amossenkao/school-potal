// components/DashboardHome.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
	Shield,
	BookOpen,
	GraduationCap,
	Briefcase,
	Users,
	CreditCard,
	Crown,
	Eye,
	BookMarked,
	User,
	Sparkles,
	CalendarDays,
	Sunrise,
	Sun,
	Sunset,
	Moon,
} from 'lucide-react';
import type { SchoolProfile } from '@/types/schoolProfile';
import StudentPerformanceInsights from '@/components/dashboard/StudentPerformanceInsights';
import TeacherPerformanceInsights from '@/components/dashboard/TeacherPerformanceInsights';
import SystemAdminDashboard from '@/components/dashboard/SystemAdminDashboard';

interface DashboardHomeProps {
	user: any;
	schoolProfile: SchoolProfile;
}

// Role configuration for dynamic icons, theme colors, and hero glow accents
const ROLE_CONFIG: Record<
	string,
	{ icon: any; color: string; bg: string; border: string; glow: string }
> = {
	system_admin: {
		icon: Shield,
		color: 'text-purple-700 dark:text-purple-400',
		bg: 'bg-purple-100 dark:bg-purple-900/30',
		border: 'border-purple-200 dark:border-purple-800/50',
		glow: 'from-purple-400/30 via-fuchsia-400/20 to-transparent',
	},
	administrator: {
		icon: Briefcase,
		color: 'text-indigo-700 dark:text-indigo-400',
		bg: 'bg-indigo-100 dark:bg-indigo-900/30',
		border: 'border-indigo-200 dark:border-indigo-800/50',
		glow: 'from-indigo-400/30 via-blue-400/20 to-transparent',
	},
	teacher: {
		icon: BookOpen,
		color: 'text-blue-700 dark:text-blue-400',
		bg: 'bg-blue-100 dark:bg-blue-900/30',
		border: 'border-blue-200 dark:border-blue-800/50',
		glow: 'from-blue-400/30 via-cyan-400/20 to-transparent',
	},
	student: {
		icon: GraduationCap,
		color: 'text-emerald-700 dark:text-emerald-400',
		bg: 'bg-emerald-100 dark:bg-emerald-900/30',
		border: 'border-emerald-200 dark:border-emerald-800/50',
		glow: 'from-emerald-400/30 via-teal-400/20 to-transparent',
	},
	registrar: {
		icon: Users,
		color: 'text-orange-700 dark:text-orange-400',
		bg: 'bg-orange-100 dark:bg-orange-900/30',
		border: 'border-orange-200 dark:border-orange-800/50',
		glow: 'from-orange-400/30 via-amber-400/20 to-transparent',
	},
	casher: {
		icon: CreditCard,
		color: 'text-teal-700 dark:text-teal-400',
		bg: 'bg-teal-100 dark:bg-teal-900/30',
		border: 'border-teal-200 dark:border-teal-800/50',
		glow: 'from-teal-400/30 via-emerald-400/20 to-transparent',
	},
	proprietor: {
		icon: Crown,
		color: 'text-amber-700 dark:text-amber-400',
		bg: 'bg-amber-100 dark:bg-amber-900/30',
		border: 'border-amber-200 dark:border-amber-800/50',
		glow: 'from-amber-400/30 via-yellow-400/20 to-transparent',
	},
	supervisor: {
		icon: Eye,
		color: 'text-cyan-700 dark:text-cyan-400',
		bg: 'bg-cyan-100 dark:bg-cyan-900/30',
		border: 'border-cyan-200 dark:border-cyan-800/50',
		glow: 'from-cyan-400/30 via-sky-400/20 to-transparent',
	},
	vpa: {
		icon: BookMarked,
		color: 'text-rose-700 dark:text-rose-400',
		bg: 'bg-rose-100 dark:bg-rose-900/30',
		border: 'border-rose-200 dark:border-rose-800/50',
		glow: 'from-rose-400/30 via-pink-400/20 to-transparent',
	},
	default: {
		icon: User,
		color: 'text-gray-700 dark:text-gray-400',
		bg: 'bg-gray-100 dark:bg-gray-800/50',
		border: 'border-gray-200 dark:border-gray-700',
		glow: 'from-gray-400/20 via-gray-400/10 to-transparent',
	},
};

// Segments of the day used by the "day timeline" signature element.
// Each segment encodes a real window of the school day, not decoration.
const DAY_SEGMENTS = [
	{ label: 'Dawn', icon: Sunrise, startHour: 5 },
	{ label: 'Midday', icon: Sun, startHour: 11 },
	{ label: 'Dusk', icon: Sunset, startHour: 16 },
	{ label: 'Night', icon: Moon, startHour: 20 },
];

export default function DashboardHome({
	user,
	schoolProfile,
}: DashboardHomeProps) {
	const [greeting, setGreeting] = useState('Welcome');
	const [now, setNow] = useState<Date | null>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
	const intervalRef = useRef<ReturnType<typeof setInterval>>();

	// Live, drift-free clock. Rather than polling on a fixed 60s (or even 1s)
	// interval from mount — which can visibly lag behind the real clock as
	// timers slip — we snap the very first tick to the next real second
	// boundary, then run a 1s interval from there. Every tick reads a fresh
	// Date, so the displayed time is always accurate to the second, never
	// "behind." Kept inside useEffect so the first server-rendered markup
	// never depends on the client's clock, avoiding hydration mismatches.
	useEffect(() => {
		const tick = () => {
			const current = new Date();
			setNow(current);
			const hour = current.getHours();
			if (hour < 12) setGreeting('Good morning');
			else if (hour < 18) setGreeting('Good afternoon');
			else setGreeting('Good evening');
		};

		tick();
		const msUntilNextSecond = 1000 - new Date().getMilliseconds();
		timeoutRef.current = setTimeout(() => {
			tick();
			intervalRef.current = setInterval(tick, 1000);
		}, msUntilNextSecond);

		return () => {
			clearTimeout(timeoutRef.current);
			clearInterval(intervalRef.current);
		};
	}, []);

	const role = user?.role || 'student';
	const isAdminRole = role === 'system_admin' || role === 'administrator';

	const config = ROLE_CONFIG[role] || ROLE_CONFIG.default;
	const RoleIcon = config.icon;

	// Framer Motion variants for staggered fade-in
	const containerVariants = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: { staggerChildren: 0.1 },
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		show: {
			opacity: 1,
			y: 0,
			transition: { type: 'spring', stiffness: 300, damping: 24 },
		},
	};

	const dateLabel = now
		? now.toLocaleDateString(undefined, {
				weekday: 'long',
				month: 'long',
				day: 'numeric',
			})
		: '';
	const hourMinuteLabel = now
		? now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
		: '';
	const secondsLabel = now
		? now.getSeconds().toString().padStart(2, '0')
		: '00';
	const periodLabel = now
		? now
				.toLocaleTimeString(undefined, { hour: 'numeric', hour12: true })
				.split(' ')[1]
		: '';

	// Percentage through the current day (00:00 -> 24:00), used to place the
	// live marker on the day timeline below.
	const dayProgressPct = useMemo(() => {
		if (!now) return 0;
		const secondsIntoDay =
			now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
		return (secondsIntoDay / 86400) * 100;
	}, [now]);

	const currentHour = now ? now.getHours() : 0;
	const activeSegmentIndex = DAY_SEGMENTS.reduce((acc, seg, idx) => {
		return currentHour >= seg.startHour ? idx : acc;
	}, 0);

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="show"
			className="dashboard-home space-y-8"
		>
			{/* Hero Section */}
			<motion.div
				variants={itemVariants}
				className="relative overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm"
			>
				{/* Animated gradient glow, unique per role */}
				<div
					className={`pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br ${config.glow} blur-3xl opacity-70 animate-pulse [animation-duration:6s]`}
				/>
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.02),_transparent_60%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.03),_transparent_60%)]" />

				{/* Subtle Background Icon Decoration */}
				<div className="absolute top-6 right-6 opacity-[0.05] dark:opacity-[0.04] pointer-events-none transition-transform duration-700 hover:scale-105">
					<RoleIcon size={220} />
				</div>

				<div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
					<div>
						<motion.div
							variants={itemVariants}
							className="flex flex-wrap items-center gap-3 mb-4"
						>
							<span
								className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${config.bg} ${config.color} ${config.border}`}
							>
								<RoleIcon size={14} strokeWidth={2.5} />
								{role.replace('_', ' ')}
							</span>
							{schoolProfile?.currentAcademicYear ? (
								<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
									<CalendarDays size={14} />
									{schoolProfile.currentAcademicYear}
								</span>
							) : null}
						</motion.div>

						<motion.h1
							variants={itemVariants}
							className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight flex items-center gap-2"
						>
							{greeting}, {user?.firstName || 'User'}!
							<Sparkles
								size={22}
								className={`${config.color} opacity-70`}
								strokeWidth={2}
							/>
						</motion.h1>

						<motion.p
							variants={itemVariants}
							className="text-gray-600 dark:text-gray-400 max-w-xl text-sm md:text-base leading-relaxed"
						>
							{getRoleDescription(role)}
						</motion.p>
					</div>

					{now ? (
						<motion.div
							variants={itemVariants}
							className="shrink-0 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40 px-5 py-4 text-right"
						>
							{/* Digital readout: hour:minute large, seconds tick as a
							    small live chip so the "live-ness" of the clock is
							    visible at a glance, not just implied. */}
							<div className="flex items-baseline justify-end gap-1.5">
								<p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
									{hourMinuteLabel.replace(/\s?[AP]M$/i, '')}
								</p>
								<span
									className={`inline-flex items-center justify-center min-w-[2ch] rounded-md px-1 py-0.5 text-xs font-bold tabular-nums ${config.bg} ${config.color}`}
								>
									{secondsLabel}
								</span>
								{periodLabel ? (
									<span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">
										{periodLabel}
									</span>
								) : null}
							</div>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
								{dateLabel}
							</p>
						</motion.div>
					) : null}
				</div>

				{/* Signature element: a live day timeline. Encodes where "now"
				    actually sits within the school day, rather than decorating
				    the hero with something generic. The marker moves in real
				    time as the seconds tick. */}
				{now ? (
					<motion.div variants={itemVariants} className="relative z-10 mt-8">
						<div className="relative h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-visible">
							<div
								className={`absolute inset-y-0 left-0 rounded-full ${config.color} bg-current opacity-20`}
								style={{ width: `${dayProgressPct}%` }}
							/>
							<div
								className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full ${config.color} bg-current ring-4 ring-white dark:ring-gray-900 animate-pulse [animation-duration:2s]`}
								style={{ left: `${dayProgressPct}%` }}
							/>
						</div>
						<div className="mt-2 flex justify-between">
							{DAY_SEGMENTS.map((segment, idx) => {
								const SegmentIcon = segment.icon;
								const isActive = idx === activeSegmentIndex;
								return (
									<div
										key={segment.label}
										className={`flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider transition-colors ${
											isActive
												? config.color
												: 'text-gray-400 dark:text-gray-600'
										}`}
									>
										<SegmentIcon size={12} />
										{segment.label}
									</div>
								);
							})}
						</div>
					</motion.div>
				) : null}
			</motion.div>

			{/* Dashboard Insights */}
			<motion.div variants={itemVariants} className="pb-10">
				{isAdminRole ? (
					<SystemAdminDashboard schoolProfile={schoolProfile} user={user} />
				) : role === 'teacher' ? (
					<TeacherPerformanceInsights
						schoolProfile={schoolProfile}
						user={user}
					/>
				) : (
					<StudentPerformanceInsights
						schoolProfile={schoolProfile}
						user={user}
					/>
				)}
			</motion.div>
		</motion.div>
	);
}

// Helper function to get role descriptions
function getRoleDescription(role: string): string {
	const descriptions: Record<string, string> = {
		system_admin:
			'You have full system access to manage users, settings, and all school operations.',
		teacher:
			'Submit grades, take attendance, view your masters',
		student:
			'View your academic progress, view your class and text schedules',
		administrator:
			'Handle administrative tasks and manage staff-related functions.',
		registrar:
			'Manage student admissions, records, and academic documentation.',
		casher:
			'Process payments, manage financial records, and handle fee collections.',
		proprietor:
			'Oversee all school operations with complete administrative access.',
		supervisor:
			'Monitor and guide school activities with supervisory permissions.',
		vpa: 'Manage and organize academic resources and materials.',
	};

	return descriptions[role] || 'Welcome to your personalized dashboard.';
}
