import SchoolMeshLandingPage from '@/components/pages/SchoolMeshLandingPage';
import TenantSchoolHomepage from '@/components/pages/TenantSchoolHomepage';
import { getSchoolProfile } from '@/lib/mongoose';

export default async function HomePage() {
	const schoolProfile = await getSchoolProfile();

	if (!schoolProfile) {
		return <SchoolMeshLandingPage />;
	}

	return <TenantSchoolHomepage />;
}
