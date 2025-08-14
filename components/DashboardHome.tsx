// components/DashboardHome.tsx
'use client';
import { componentsMap } from '@/utils/componentsMap';
import Link from 'next/link';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

interface DashboardHomeProps {
	user: any;
}

export default function DashboardHome({ user }: DashboardHomeProps) {
	const roleItems = componentsMap[user.role]?.items || {};
	const sharedItems = componentsMap.shared?.items || {};

	// Get quick access items (first few items from each category)
	const getQuickAccessItems = () => {
		const items: any = [];

		// Add role-specific items
		Object.entries(roleItems)
			.slice(0, 6)
			.forEach(([slug, item]) => {
				items.push({
					title: item.title,
					icon: item.icon,
					href: `/dashboard/${slug}`,
					category: item.category || 'General',
					description: getItemDescription(item.title),
				});
			});

		// Add some shared items
		Object.entries(sharedItems)
			.slice(0, 3)
			.forEach(([slug, item]) => {
				if (slug !== 'profile') {
					// Skip profile as it's always in sidebar
					items.push({
						title: item.title,
						icon: item.icon,
						href: `/dashboard/${slug}`,
						category: item.category || 'Shared',
						description: getItemDescription(item.title),
					});
				}
			});

		return items;
	};

	const quickAccessItems = getQuickAccessItems();

	// Group items by category for better organization
	const itemsByCategory = quickAccessItems.reduce((acc, item) => {
		if (!acc[item.category]) {
			acc[item.category] = [];
		}
		acc[item.category].push(item);
		return acc;
	}, {} as Record<string, typeof quickAccessItems>);

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

			{/* Quick Stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Features
						</CardTitle>
						<div className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{Object.keys(roleItems).length + Object.keys(sharedItems).length}
						</div>
						<p className="text-xs text-muted-foreground">Available to you</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Role Features</CardTitle>
						<div className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{Object.keys(roleItems).length}
						</div>
						<p className="text-xs text-muted-foreground">Role-specific</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Shared Features
						</CardTitle>
						<div className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{Object.keys(sharedItems).length}
						</div>
						<p className="text-xs text-muted-foreground">Available to all</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Categories</CardTitle>
						<div className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{Object.keys(itemsByCategory).length}
						</div>
						<p className="text-xs text-muted-foreground">Feature groups</p>
					</CardContent>
				</Card>
			</div>

			{/* Quick Access by Category */}
			{Object.entries(itemsByCategory).map(([categoryName, categoryItems]) => (
				<div key={categoryName} className="mb-8">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
						{categoryName}
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{categoryItems.map((item, index) => (
							<Link key={index} href={item.href}>
								<Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer h-full">
									<CardHeader>
										<div className="flex items-center space-x-3">
											<div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
												<item.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
											</div>
											<div className="flex-1 min-w-0">
												<CardTitle className="text-lg truncate">
													{item.title}
												</CardTitle>
												<CardDescription className="text-sm">
													{item.description}
												</CardDescription>
											</div>
										</div>
									</CardHeader>
								</Card>
							</Link>
						))}
					</div>
				</div>
			))}

			{/* Help Section */}
			<Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
				<CardHeader>
					<CardTitle className="text-blue-900 dark:text-blue-100">
						Need Help?
					</CardTitle>
					<CardDescription className="text-blue-700 dark:text-blue-300">
						Use the sidebar to navigate through all available features, or
						contact support if you need assistance.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex space-x-4">
						<Link
							href="/dashboard/messages"
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
						>
							Contact Support
						</Link>
						<Link
							href="/dashboard/profile"
							className="px-4 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
						>
							View Profile
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// Helper function to get item descriptions
function getItemDescription(title: string): string {
	const descriptions = {
		'Add Users': 'Create new user accounts',
		'Manage Users': 'Edit and manage existing users',
		'View Grades': 'Review student grades and performance',
		'Approve or Reject Grades': 'Approve submitted grades',
		'View Lesson Plans': 'Review teacher lesson plans',
		'View Scheme of Work': 'Check curriculum planning',
		'Classes Overview': 'View all class information',
		'Manage Classes': 'Create and edit class details',
		'Periodic Reports': 'Generate term/semester reports',
		'Yearly Reports': 'Annual academic reports',
		'Master Grade Sheets': 'Complete grade records',
		'Add Event to Calendar': 'Schedule new events',
		'Add a Resource': 'Upload learning materials',
		'Manage Resources': 'Organize learning resources',
		'View or Submit Grades': 'Grade management for teachers',
		'Submit Lesson Plan': 'Upload your lesson plans',
		'Submit Scheme of Work': 'Submit curriculum planning',
		'Manage Lesson Plans': 'Edit your lesson plans',
		'Request Salary Advance': 'Apply for salary advance',
		'Sign for Salary': 'Confirm salary receipt',
		'Pay Fees': 'Make fee payments online',
		'Payment History': 'View payment records',
		'View Periodic Grades': 'Check term grades',
		'View Yearly Grades': 'Annual grade reports',
		'Academic Calendar': 'View school calendar',
		'View Resources': 'Access learning materials',
		Messages: 'Send and receive messages',
		Profile: 'Manage your profile',
		'School Settings': 'Configure school settings',
		Support: 'Get technical support',
	};

	return descriptions[title] || 'Access this feature';
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
