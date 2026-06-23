'use client';

import DashboardHome from '@/components/DashboardHome';
import type { User } from '@/types';
import type { SchoolProfile } from '@/types/schoolProfile';

type DashboardHomePageProps = {
	user: User;
	schoolProfile: SchoolProfile;
	theme?: string;
	userPreferences?: string;
	sessionToken?: string;
};

export default function DashboardHomePage({
	user,
	schoolProfile,
}: DashboardHomePageProps) {
	return (
		<div className="dashboard-page px-4 sm:px-6 lg:px-8">
			<DashboardHome user={user} schoolProfile={schoolProfile} />
		</div>
	);
}
