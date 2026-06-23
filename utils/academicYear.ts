export const normalizeAcademicYear = (value?: string | null) => {
	if (!value) return '';
	return String(value)
		.trim()
		.replace(/[–—]/g, '-')
		.replace(/\s+/g, '')
		.replace(/\//g, '-');
};

export const getAcademicYearCandidates = (value?: string | null) => {
	const raw = String(value || '').trim();
	if (!raw) return [] as string[];
	const normalized = normalizeAcademicYear(raw);
	const slash = normalized ? normalized.replace(/-/g, '/') : '';
	return Array.from(
		new Set([raw, normalized, slash].filter((candidate): candidate is string => Boolean(candidate))),
	);
};

export const areAcademicYearsEqual = (
	left?: string | null,
	right?: string | null,
) => {
	const normalizedLeft = normalizeAcademicYear(left);
	const normalizedRight = normalizeAcademicYear(right);
	return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
};

export const getScopedAcademicYearValue = <T,>(
	map: Record<string, T> | undefined | null,
	academicYear?: string | null,
) => {
	if (!map || typeof map !== 'object') {
		return { key: null as string | null, value: undefined as T | undefined };
	}

	const candidates = getAcademicYearCandidates(academicYear);
	for (const key of candidates) {
		if (Object.prototype.hasOwnProperty.call(map, key)) {
			return { key, value: map[key] };
		}
	}

	const normalizedTarget = normalizeAcademicYear(academicYear);
	if (normalizedTarget) {
		const matchedKey = Object.keys(map).find(
			(key) => normalizeAcademicYear(key) === normalizedTarget,
		);
		if (matchedKey) {
			return { key: matchedKey, value: map[matchedKey] };
		}
	}

	return { key: null as string | null, value: undefined as T | undefined };
};
