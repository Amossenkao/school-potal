import { getTenantModels } from '@/models';
import { appendChange } from '@/lib/syncEngine';

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
	const models = await getTenantModels();
	const state = await models.UserSyncState.findOne({ academicYear }).lean();
	return state?.version ?? 0;
};

export const bumpUsersVersion = async (
	academicYears: string[],
	options: { affectedUserIds?: string[] } = {},
) => {
	if (!academicYears || academicYears.length === 0) return;
	const models = await getTenantModels();
	const uniqueYears = Array.from(new Set(academicYears)).filter(Boolean);
	await Promise.all(
		uniqueYears.map((year) =>
			models.UserSyncState.updateOne(
				{ academicYear: year },
				{
					$inc: { version: 1 },
					$set: { updatedAt: new Date() },
				},
				{ upsert: true },
			),
		),
	);
	const affectedUserIds = Array.isArray(options.affectedUserIds)
		? options.affectedUserIds
		: [];
	await Promise.all(
		uniqueYears.map(async (year) => {
			try {
				await appendChange({
					domain: 'users',
					academicYear: year,
					op: 'update',
					documentId: affectedUserIds[0] || `users:${year}`,
					documentType: 'User',
					document: affectedUserIds.length > 0 ? { ids: affectedUserIds } : null,
				});
			} catch (error) {
				console.warn(`Failed to log users change for ${year}.`, error);
			}
		}),
	);
};
