'use client';

import { useSchoolStore } from '@/store/schoolStore';
import DashboardHome from '@/components/DashboardHome';
import useAuth from '@/store/useAuth';
import { useHasSchool } from '@/context/HasSchoolContext';
import SuperAdminDashboardPage from '@/app/superadmin/page';

export default function DashboardPage() {
	const hasSchool = useHasSchool();
	const { school } = useSchoolStore();
	const { user } = useAuth();

	if (!hasSchool) {
		return <SuperAdminDashboardPage />;
	}

	return (
		<div className="dashboard-page px-4 sm:px-6 lg:px-8">
			<DashboardHome user={user} schoolProfile={school} />
		</div>
	);
}
