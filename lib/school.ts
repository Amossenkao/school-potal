import { cookies } from 'next/headers';
import profiles from '@/app/school-profiles';

export async function getSchoolProfile() {
	// get cookies
	const cookieStore = cookies();
	const schoolId =
		cookieStore.get('school-id')?.value || 'upstairs-christian-academy';

	return profiles[schoolId];
}
