import SchoolMeshLandingPage from '@/components/pages/SchoolMeshLandingPage';
import { getSchoolProfile } from '@/lib/mongoose';
import LoginPage from "@/app/login/page";

export default async function HomePage() {
	const schoolProfile = await getSchoolProfile();

	if (!schoolProfile) {
		return <SchoolMeshLandingPage />;
	}

	return <LoginPage />;
}
