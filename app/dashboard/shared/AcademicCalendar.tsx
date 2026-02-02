'use client';

import CalendarAndSchedules from '@/app/dashboard/shared/CalendarAndSchedules';
import type { SchoolProfile } from '@/types/schoolProfile';

type AcademicCalendarProps = {
	user?: {
		role?: string;
		firstName?: string;
		className?: string;
		classId?: string;
	};
	schoolProfile: SchoolProfile;
};

export default function AcademicCalendar({
	user,
	schoolProfile,
}: AcademicCalendarProps) {
	return (
		<CalendarAndSchedules
			user={user}
			schoolProfile={schoolProfile}
			mode="calendar"
		/>
	);
}
