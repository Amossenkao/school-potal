import DashboardHome from '@/components/DashboardHome';
import { getCurrentUser } from '@/lib/auth';
import { getSchoolProfile } from '@/lib/schoolStore';

export default async function DashboardPage() {
	const user = await getCurrentUser();
	const schoolProfile = await getSchoolProfile('upstairs');

	if (!user || !schoolProfile) {
		return <div>Loading...</div>;
	}

	if (!user || !schoolProfile) {
		return <div>Error loading dashboard data</div>;
	}

	return (
		<div className="dashboard-page">
			<DashboardHome user={user} schoolProfile={schoolProfile} />
		</div>
	);
}
