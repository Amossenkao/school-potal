'use client';

import { useEffect, useState } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import { getCookie } from '@/utils/';
import { PageLoading } from '@/components/loading';
import profiles from '../app/school-profiles';

interface SchoolProviderProps {
	children: React.ReactNode;
	skipSchoolCheck?: boolean;
}

export default function SchoolProvider({
	children,
	skipSchoolCheck = false,
}: SchoolProviderProps) {
	const { school, setSchool } = useSchoolStore();
	const [isLoading, setIsLoading] = useState(!skipSchoolCheck);

	useEffect(() => {
		if (skipSchoolCheck) {
			setIsLoading(false);
			return;
		}

		// If school is already loaded, no need to load again
		if (school) {
			setIsLoading(false);
			return;
		}

		const loadSchool = async () => {
			try {
				const id = getCookie('school-id');
				const name = getCookie('school-name');

				if (id && name) {
					setSchool(profiles[id]);
					console.log('School set in store:', { id, name });
				} else {
					console.log('No school cookies found');
				}
			} catch (error) {
				console.error('Error loading school:', error);
			} finally {
				setIsLoading(false);
			}
		};

		loadSchool();
	}, [school, setSchool, skipSchoolCheck]);

	// Show loading while school data is being fetched
	if (isLoading || (!skipSchoolCheck && !school)) {
		return;
		<PageLoading variant="school" />;
	}

	return <>{children}</>;
}
