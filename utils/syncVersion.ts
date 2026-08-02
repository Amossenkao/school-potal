export const toHash = (value: unknown): string => {
	try {
		const raw = JSON.stringify(value) || '';
		let hash = 0;
		for (let i = 0; i < raw.length; i += 1) {
			hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
		}
		return String(hash);
	} catch {
		return '0';
	}
};

export const toSchoolVersion = (schoolProfile: any): string => {
	if (!schoolProfile) return '0';
	const updatedAt = schoolProfile?.updatedAt
		? new Date(schoolProfile.updatedAt).getTime()
		: 0;
	const id = schoolProfile?._id?.toString?.() || '';
	if (updatedAt || id) return `${updatedAt}:${id}`;
	return toHash(schoolProfile);
};
