'use client';

import CalendarAndSchedules from '@/app/dashboard/shared/CalendarAndSchedules';
import type { SchoolProfile } from '@/types/schoolProfile';

type SchedulesProps = {
	user?: {
		role?: string;
		firstName?: string;
		className?: string;
		classId?: string;
	};
	schoolProfile: SchoolProfile;
};

export default function Schedules({ user, schoolProfile }: SchedulesProps) {
	return (
		<CalendarAndSchedules
			user={user}
			schoolProfile={schoolProfile}
			mode="schedules"
			defaultTab="class-schedules"
		/>
	);
}
