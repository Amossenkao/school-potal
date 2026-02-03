import { getTenantModels } from '@/models';

const getCurrentAcademicYear = () => {
	const currentDate = new Date();
	const currentYear = currentDate.getFullYear();
	const currentMonth = currentDate.getMonth() + 1;
	return currentMonth >= 8
		? `${currentYear}-${currentYear + 1}`
		: `${currentYear - 1}-${currentYear}`;
};

export const extractAcademicYears = (user: any): string[] => {
	const years = new Set<string>();
	const addYear = (year?: string) => {
		if (year) years.add(year);
	};

	if (Array.isArray(user?.academicYears)) {
		user.academicYears.forEach((ay: any) => addYear(ay?.year));
	}

	if (Array.isArray(user?.subjects)) {
		user.subjects.forEach((subject: any) => addYear(subject?.year));
	}

	if (years.size === 0) {
		addYear(getCurrentAcademicYear());
	}

	return Array.from(years);
};

export const getUsersVersion = async (academicYear: string): Promise<number> => {
	if (!academicYear) return 0;
	const models = await getTenantModels();
	const state = await models.UserSyncState.findOne({ academicYear }).lean();
	return state?.version ?? 0;
};

export const bumpUsersVersion = async (academicYears: string[]) => {
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
};
