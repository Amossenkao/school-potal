import { appendChange, getDomainSeq } from '@/lib/syncEngine';

export const extractAcademicYears = (
	user: any,
	schoolProfile?: { identity?: { currentAcademicYear?: string | null } } | null,
): string[] => {
	const years = new Set<string>();
	const addYear = (year?: string | null) => {
		if (year) years.add(year);
	};

	if (Array.isArray(user?.academicYears)) {
		user.academicYears.forEach((ay: any) => addYear(ay?.year));
	}

	if (Array.isArray(user?.subjects)) {
		user.subjects.forEach((subject: any) => addYear(subject?.year));
	}

	if (years.size === 0) {
		addYear(schoolProfile?.identity?.currentAcademicYear);
	}

	return Array.from(years);
};

export const getUsersVersion = async (academicYear: string): Promise<number> => {
	if (!academicYear) return 0;
	// Phase 3: UserSyncState is gone; the users-domain version is the
	// ChangeLog seq (tail of the event log).
	return getDomainSeq('users', academicYear);
};

export const bumpUsersVersion = async (
	academicYears: string[],
	options: { affectedUserIds?: string[] } = {},
): Promise<Record<string, number>> => {
	if (!academicYears || academicYears.length === 0) return {};
	const uniqueYears = Array.from(new Set(academicYears)).filter(Boolean);
	const affectedUserIds = Array.isArray(options.affectedUserIds)
		? options.affectedUserIds
		: [];
	const seqByYear: Record<string, number> = {};
	await Promise.all(
		uniqueYears.map(async (year) => {
			try {
				const seq = await appendChange({
					domain: 'users',
					academicYear: year,
					op: 'update',
					documentId: affectedUserIds[0] || `users:${year}`,
					documentType: 'User',
					document: affectedUserIds.length > 0 ? { ids: affectedUserIds } : null,
				});
				seqByYear[year] = seq;
			} catch (error) {
				console.warn(`Failed to log users change for ${year}.`, error);
			}
		}),
	);
	return seqByYear;
};
