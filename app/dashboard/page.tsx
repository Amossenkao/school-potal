'use client';

import { useSchoolStore } from '@/store/schoolStore';
import DashboardHome from '@/components/DashboardHome';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';

export default function DashboardPage() {
	// 1. Get the school profile from the global Zustand store.
	//    The data is fetched once in the RootLayout, and we just subscribe to it here.
	const { school } = useSchoolStore();

	// 2. Fetch the current user on the client-side using a custom hook.
	//    This replaces the server-side `getCurrentUser()` function.
	const { user, isLoading: isUserLoading, error: userError } = useAuth();

	// 3. Show a loading indicator while waiting for either the school or user data.
	if (!school || isUserLoading) {
		return <PageLoading />;
	}

	// 4. Handle any errors that might occur while fetching user data.
	if (userError || !user) {
		return (
			<div>Error loading your dashboard. Please try refreshing the page.</div>
		);
	}

	// 5. Once all data is ready, render the main dashboard component.
	return (
		<div className="dashboard-page">
			<DashboardHome user={user} schoolProfile={school} />
		</div>
	);
}
