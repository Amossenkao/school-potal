'use client';

import { useSchoolStore } from '@/store/schoolStore';
import { PageLoading } from '@/components/loading';

interface SchoolProviderProps {
	children: React.ReactNode;
	skipSchoolCheck?: boolean;
}

export default function SchoolProvider({
	children,
	skipSchoolCheck = false,
}: SchoolProviderProps) {
	// 1. Subscribe to the school state from our global Zustand store.
	//    The data fetching is now initiated in the RootLayout.
	const { school } = useSchoolStore();

	// 2. If this part of the app doesn't need a school profile, render immediately.
	if (skipSchoolCheck) {
		return <>{children}</>;
	}

	// 3. While the school profile is being fetched (i.e., it's null in the store),
	//    show a loading component. This component acts as a gatekeeper.
	if (!school) {
		return <PageLoading variant="school" />;
	}

	// 4. Once the school profile is available in the global store, render the children.
	return <>{children}</>;
}
