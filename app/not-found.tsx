import AppNotFoundClient from '@/components/pages/AppNotFoundClient';
import SchoolMeshLandingPage from '@/components/pages/SchoolMeshLandingPage';
import { getSchoolProfile } from '@/lib/mongoose';

export default async function NotFound() {
	const schoolProfile = await getSchoolProfile();

	if (!schoolProfile) {
		return <SchoolMeshLandingPage />;
	}

	return <AppNotFoundClient />;
}
