// components/DashboardHome.tsx
'use client';
import type { SchoolProfile } from '@/types/schoolProfile';
import StudentPerformanceInsights from '@/components/dashboard/StudentPerformanceInsights';
import TeacherPerformanceInsights from '@/components/dashboard/TeacherPerformanceInsights';
import SystemAdminDashboard from '@/components/dashboard/SystemAdminDashboard';

interface DashboardHomeProps {
	user: any;
	schoolProfile: SchoolProfile; // Add school profile prop
}

export default function DashboardHome({
	user,
	schoolProfile,
}: DashboardHomeProps) {
	const role = user?.role || 'student';
	const isAdminRole = role === 'system_admin' || role === 'administrator';
	return (
		<div className="dashboard-home">
			{/* Welcome Section */}
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
					Welcome back, {user.firstName}!
				</h1>
				<p className="text-gray-600 dark:text-gray-400">
					Role:{' '}
					<span className="capitalize font-medium text-blue-600 dark:text-blue-400">
						{user.role.replace('_', ' ')}
					</span>
				</p>
				<p className="text-gray-600 dark:text-gray-400 mt-1">
					{getRoleDescription(user.role)}
				</p>
			</div>

			{/* Dashboard Insights */}
			<div className="mb-10">
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
			</div>
		</div>
	);
}

// Helper function to get role descriptions
function getRoleDescription(role: string): string {
	const descriptions = {
		system_admin:
			'You have full system access to manage users, settings, and all school operations.',
		teacher:
			'Manage your classes, submit grades and lesson plans, and access teaching resources.',
		student:
			'View your academic progress, pay fees, and access learning materials.',
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
