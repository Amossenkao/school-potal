'use client';

import { useSchoolStore } from '@/store/schoolStore';
import DashboardHome from '@/components/DashboardHome';
import useAuth from '@/store/useAuth';

export default function DashboardPage() {
	// 1. Get the school profile from the global Zustand store.
	//    The data is fetched once in the RootLayout, and we just subscribe to it here.
	const { school } = useSchoolStore();

	// 2. Fetch the current user on the client-side using a custom hook.
	//    This replaces the server-side `getCurrentUser()` function.
	const { user } = useAuth();

	// 5. Once all data is ready, render the main dashboard component.
	return (
		<div className="dashboard-page px-4 sm:px-6 lg:px-8">
			<DashboardHome user={user} schoolProfile={school} />
		</div>
	);
}
