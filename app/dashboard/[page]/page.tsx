// app/dashboard/[page]/page.tsx
import {
	generateDynamicComponentsMap,
	validateComponentAccess,
} from '@/utils/componentsMap';
import { getCurrentUser } from '@/lib/auth';
import { getSchoolProfile } from '@/lib/school';
import { PageLoading } from '@/components/loading';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { SchoolProfile } from '@/types/schoolProfile';

interface PageProps {
	params: {
		page: string;
	};
}

export default async function DynamicDashboardPage({ params }: PageProps) {
	try {
		// Read cookies in Server Component
		const cookieStore = await cookies();

		// Example: Get specific cookies
		const sessionToken = await cookieStore.get('sessionId')?.value;
		const userPreferences = await cookieStore.get('user-preferences')?.value;
		const theme = (await cookieStore.get('theme')?.value) || 'light';

		// Get current user and school profile
		const user: any = await getCurrentUser();
		if (!user) {
			redirect('/login');
		}

		// Get school profile (updated to match your implementation)
		const schoolProfile: SchoolProfile = await getSchoolProfile();
		if (!schoolProfile) {
			return (
				<PageLoading
					variant="not-found"
					fullScreen={false}
					message="School profile not found"
				/>
			);
		}

		const { page } = await params;

		// Validate component access before rendering
		const hasAccess = validateComponentAccess(schoolProfile, user.role, page);
		if (!hasAccess) {
			return (
				<PageLoading
					variant="access-denied"
					fullScreen={false}
					message="You don't have permission to access this page"
				/>
			);
		}

		// Generate dynamic components map
		const componentsMap = generateDynamicComponentsMap(
			schoolProfile,
			user.role
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
					message={`Page "${page}" not found or not available for your role`}
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

		return (
			<>
				<title>
					{pageTitle} - {schoolProfile.shortName}
				</title>
				<Component
					user={user}
					schoolProfile={schoolProfile}
					theme={theme}
					userPreferences={userPreferences}
					sessionToken={sessionToken}
				/>
			</>
		);
	} catch (error) {
		console.error('Error in DynamicDashboardPage:', error);

		return (
			<PageLoading
				variant="error"
				fullScreen={false}
				message="An error occurred while loading the page"
			/>
		);
	}
}

// Generate metadata for the page
export async function generateMetadata({ params }: PageProps) {
	try {
		// You can also read cookies in generateMetadata
		const cookieStore = cookies();
		const theme = cookieStore.get('theme')?.value || 'light';

		const user = await getCurrentUser();
		const schoolProfile = user ? await getSchoolProfile() : null;

		const { page } = await params;
		const pageTitle = page
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');

		return {
			title: `${pageTitle} - ${
				schoolProfile?.shortName || 'School Management System'
			}`,
			description: `${pageTitle} page for ${
				schoolProfile?.name || 'school management'
			}`,
			// You could use theme for conditional metadata
			...(theme === 'dark' && {
				themeColor: '#000000',
			}),
		};
	} catch (error) {
		return {
			title: 'School Management System',
			description: 'School management system dashboard',
		};
	}
}
