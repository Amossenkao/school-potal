// app/dashboard/[page]/page.tsx
import {
	generateDynamicComponentsMap,
	validateComponentAccess,
	isValidAdministratorPosition,
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

// Enhanced validation function for administrators with flexible positions
function validateAdministratorAccess(
	schoolProfile: SchoolProfile,
	user: User,
	routeKey: string
): boolean {
	// For system_admin, use standard validation
	if (user.role === 'system_admin') {
		return validateComponentAccess(schoolProfile, 'system_admin', routeKey);
	}

	// For administrators, validate position exists and check access
	if (user.role === 'administrator') {
		const adminUser = user as Administrator;

		// Check if the position is valid for this school
		if (
			!isValidAdministratorPosition(
				schoolProfile,
				adminUser.position
			)
		) {
			console.warn(
				`Invalid administrator position: ${adminUser.position} for this school`
			);
			return false;
		}

		// Use the validateComponentAccess function with admin position
		return validateComponentAccess(
			schoolProfile,
			'administrator',
			routeKey,
			adminUser.position
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
			JSON.stringify(schoolProfile)
		);

		const { page } = await params;

		// Validate access with flexible administrator support
		const hasAccess = validateAdministratorAccess(
			plainSchoolProfile,
			user,
			page
		);

		if (!hasAccess) {
			let errorMessage = `Access denied. `;

			if (user.role === 'administrator') {
				const adminUser = user as Administrator;
				const validPositions = Object.keys(
					plainSchoolProfile.roleFeatureAccess.administrator
				);

				if (
					!isValidAdministratorPosition(plainSchoolProfile, adminUser.position)
				) {
					errorMessage += `Your position "${
						adminUser.position
					}" is not recognized for this school. Valid positions are: ${validPositions.join(
						', '
					)}.`;
				} else {
					errorMessage += `Your position "${adminUser.position}" does not have permission to access "${page}".`;
				}
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

		// Generate dynamic components map with administrator position support
		const adminPosition =
			user.role === 'administrator'
				? (user as Administrator).position
				: undefined;
		const componentsMap = generateDynamicComponentsMap(
			plainSchoolProfile,
			user.role,
			adminPosition
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

		// Enhanced user context with administrator position info
		const userContext = {
			...user,
			adminPosition:
				user.role === 'administrator' ? (user as Administrator).position : null,
			availablePositions:
				user.role === 'administrator'
					? Object.keys(plainSchoolProfile.roleFeatureAccess.administrator)
					: [],
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
				schoolProfile?.name || 'school management'
			}${
				user?.role === 'administrator'
					? ` - ${(user as Administrator).position} access`
					: ''
			}`,
			...(theme === 'dark' && {
				themeColor: resolveTenantThemeColor(schoolProfile?.themeName),
			}),
		};
	} catch (error) {
		return {
			title: 'School Management System',
			description: 'School management system dashboard',
		};
	}
}
