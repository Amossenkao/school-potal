export const VERIFICATION_TYPE = 'schoolmesh-digital-id';
export const VERIFICATION_VERSION = 1;

export interface VerificationPayload {
	t: string;
	v: number;
	school: string;
	schoolSlug: string;
	studentId: string;
	name: string;
	academicYear: string;
	issuedAt: string;
	sig: string;
}

export const normalizeStudentId = (...ids: Array<unknown>) => {
	const raw = ids.find(
		(id) =>
			typeof id === 'string' &&
			id.trim().length > 0 &&
			!/^[0-9a-f]{24}$/i.test(id.trim()),
	);
	return typeof raw === 'string' ? raw.trim() : '';
};

export const buildStudentFullName = (student: any) => {
	if (typeof student?.fullName === 'string' && student.fullName.trim()) {
		return student.fullName.trim();
	}
	return [student?.firstName, student?.middleName, student?.lastName]
		.filter(Boolean)
		.join(' ')
		.trim();
};

const toCanonicalAcademicYear = (value: string) => {
	const normalized = String(value || '').trim();
	if (normalized) return normalized;
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;
	return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

const fnv1aHash = (input: string) => {
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i += 1) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(16).padStart(8, '0');
};

const hashWithCrypto = async (input: string): Promise<string> => {
	try {
		if (typeof crypto !== 'undefined' && crypto?.subtle) {
			const data = new TextEncoder().encode(input);
			const digest = await crypto.subtle.digest('SHA-256', data);
			return Array.from(new Uint8Array(digest))
				.map((byte) => byte.toString(16).padStart(2, '0'))
				.join('');
		}
	} catch {
		// fall back to FNV-1a below
	}
	return fnv1aHash(input);
};

export const buildVerificationFingerprint = async (
	school: any,
	payload: Omit<VerificationPayload, 'sig'>,
): Promise<string> => {
	const salt = school?.system?.dbName || school?.system?.host || school?.identity?.initials || 'school';
	const canonical = [
		VERIFICATION_TYPE,
		VERIFICATION_VERSION,
		school?.identity?.name || '',
		school?.system?.host || '',
		salt,
		payload.studentId,
		payload.name,
		payload.academicYear,
	].join('|');
	return hashWithCrypto(canonical);
};

export const buildVerificationPayload = async (
	school: any,
	student: any,
	academicYear: string,
): Promise<VerificationPayload | null> => {
	if (!student) return null;
	const studentId = normalizeStudentId(student.studentId, student.id, student._id);
	if (!studentId) return null;

	const schoolSlug = String(
		school?.system?.host?.split('.')[0] ||
			school?.system?.dbName ||
			school?.identity?.initials ||
			'school',
	)
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-');

	const payload = {
		t: VERIFICATION_TYPE,
		v: VERIFICATION_VERSION,
		school: school?.identity?.name || '',
		schoolSlug,
		studentId,
		name: buildStudentFullName(student),
		academicYear: toCanonicalAcademicYear(academicYear),
		issuedAt: new Date().toISOString(),
	};

	const sig = await buildVerificationFingerprint(school, payload);
	return { ...payload, sig };
};
