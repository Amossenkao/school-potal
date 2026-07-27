// app/dashboard/[page]/page.tsx
import {
	generateDynamicComponentsMap,
	validateComponentAccess,
} from '@/utils/componentsMap';
import { getCurrentUser } from '@/lib/auth';
import { PageLoading } from '@/components/loading';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSchoolProfile } from '@/lib/mongoose';
import { resolveTenantThemeColor } from '@/lib/tenantTheme';
import { User, Administrator, UserRole } from '@/types';
import { SchoolProfile } from '@/types/schoolProfile';

interface PageProps {
	params: {
		page: string;
	};
}

// Validation function for administrators using per-user permissions
function validateAdministratorAccess(
	schoolProfile: SchoolProfile,
	user: User,
	routeKey: string,
): boolean {
	// For system_admin, use standard validation
	if (user.role === 'system_admin') {
		return validateComponentAccess(schoolProfile, 'system_admin', routeKey);
	}

	// For administrators, use their individual permissions
	if (user.role === 'administrator') {
		const adminUser = user as Administrator;
		return validateComponentAccess(
			schoolProfile,
			'administrator',
			routeKey,
			adminUser.permissions,
		);
	}

	// For other roles, use standard validation
	return validateComponentAccess(schoolProfile, user.role, routeKey);
}

export default async function DynamicDashboardPage({ params }: PageProps) {
	try {
		// Read cookies in Server Component
		const cookieStore = await cookies();

		// Get specific cookies
		const sessionToken = cookieStore.get('sessionId')?.value;
		const userPreferences = cookieStore.get('user-preferences')?.value;
		const theme = cookieStore.get('theme')?.value || 'light';

		// Get current user and school profile
		const user: User = await getCurrentUser();
		if (!user) {
			redirect('/login');
		}

		// Get school profile
		let schoolProfile = await getSchoolProfile();
		if (!schoolProfile) {
			return (
				<PageLoading
					variant="not-found"
					fullScreen={false}
					message="School profile not found"
				/>
			);
		}

		// Convert the Mongoose document to a plain object
		const plainSchoolProfile: SchoolProfile = JSON.parse(
			JSON.stringify(schoolProfile),
		);

		const { page } = await params;

		// Validate access with flexible administrator support
		const hasAccess = validateAdministratorAccess(
			plainSchoolProfile,
			user,
			page,
		);

		if (!hasAccess) {
			let errorMessage = `Access denied. `;

			if (user.role === 'administrator') {
				errorMessage += `You do not have permission to access "${page}". Contact the system administrator to update your permissions.`;
			} else {
				errorMessage += `Your role "${user.role}" does not have permission to access "${page}".`;
			}

			return (
				<PageLoading
					variant="dashboard-not-found"
					fullScreen={false}
					message={errorMessage}
				/>
			);
		}

		// Generate dynamic components map with administrator permissions support
		const adminPermissions =
			user.role === 'administrator'
				? (user as Administrator).permissions
				: undefined;
		const componentsMap = generateDynamicComponentsMap(
			plainSchoolProfile,
			user.role,
			adminPermissions,
		);

		// Try to find the component in role-specific items first, then shared items
		const entry =
			componentsMap[user.role]?.items[page] ||
			componentsMap.shared?.items[page];

		if (!entry) {
			return (
				<PageLoading
					variant="dashboard-not-found"
					fullScreen={false}
					message={`Page "${page}" not found or not available for your access level`}
				/>
			);
		}

		// Get the component
		const Component = entry.component;

		if (!Component) {
			console.error(`Component not found for page: ${page}`);
			return (
				<PageLoading
					variant="dashboard-not-found"
					fullScreen={false}
					message="Component not available"
				/>
			);
		}

		// Generate page title from page slug
		const pageTitle = page
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');

		// User context with administrator permissions info
		const userContext = {
			...user,
			adminPermissions:
				user.role === 'administrator' ? (user as Administrator).permissions : [],
		};

		return (
			<>
				<Component
					user={userContext}
					schoolProfile={plainSchoolProfile}
					theme={theme}
					userPreferences={userPreferences}
					sessionToken={sessionToken}
				/>
			</>
		);
	} catch (error) {
		const digest =
			error && typeof error === 'object' && 'digest' in error
				? String((error as any).digest || '')
				: '';
		if (digest.startsWith('NEXT_REDIRECT')) {
			throw error;
		}
		console.error('Error in DynamicDashboardPage:', error);

		return (
			<PageLoading
				variant="not-found"
				fullScreen={false}
				message="An error occurred while loading the page"
			/>
		);
	}
}

// Generate metadata for the page with flexible administrator support
export async function generateMetadata({ params }: PageProps) {
	try {
		const cookieStore = await cookies();
		const theme = cookieStore.get('theme')?.value || 'light';

		const user = await getCurrentUser();
		const schoolProfile = user ? await getSchoolProfile() : null;

		const { page } = await params;
		const pageTitle = page
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');

		return {
			title: pageTitle,
			description: `${pageTitle} page for ${
			schoolProfile?.identity?.name || 'SchoolMesh'
		}${
			user?.role === 'administrator'
				? ` - ${(user as Administrator).position} access`
				: ''
		}`,
		...(theme === 'dark' && {
			themeColor: resolveTenantThemeColor(schoolProfile?.branding?.themeName),
		}),
		};
	} catch (error) {
		return {
			title: 'School Management System',
			description: 'School management system dashboard',
		};
	}
}
