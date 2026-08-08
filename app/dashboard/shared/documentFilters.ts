import type { FilterConfig } from '@/app/dashboard/shared/components/SharedFilter';
import { buildStudentFullName, normalizeStudentId } from '@/app/dashboard/digital-id/verification';
import { getStudentClassIdForAcademicYear } from '@/utils/academicYearAccess';
import { getScopedAcademicYearValue } from '@/utils/academicYear';

// ─── Filter shape ───────────────────────────────────────────────────────────

export interface DocumentFilters {
	academicYear: string;
	selectedStudents: string[];
	session: string;
	classLevel: string;
	className: string;
	includePrincipalSignature: boolean;
	principalSignatureValue: string;
}

export const DEFAULT_DOCUMENT_FILTERS: DocumentFilters = {
	academicYear: '',
	selectedStudents: [],
	session: '',
	classLevel: '',
	className: '',
	includePrincipalSignature: false,
	principalSignatureValue: '',
};

// Shared by all academic-document pages (Digital ID, Attestation, Diploma, …)
// so every page presents the exact same filter rail.
export const documentFilterConfig: FilterConfig<DocumentFilters> = {
	gradeLevelField: 'classLevel',
	studentViewTitle: 'My Documents',
	nonStudentViewTitle: 'Document Generation',
	viewButtonText: 'View Document',
	applyButtonText: 'Generate Documents',
	passStudentsToSubmit: true,
	filterSessionsByUser: true,
	showStudentReset: true,
	showNonStudentReset: true,
	buildStudentName: (student) => buildStudentFullName(student),
	normalizeStudentId,
};

// ─── Shared student mapping / resolution ───────────────────────────────────

export const mapDocumentStudent = (student: any, className = '') => ({
	...student,
	className: className || student?.className || '',
	studentId: normalizeStudentId(student?.studentId, student?.id, student?._id),
	fullName: buildStudentFullName(student),
});

export interface ResolveStudentsParams {
	filters: DocumentFilters;
	isStudent: boolean;
	user: any;
	school: any;
	usersByAcademicYear: Record<string, any>;
	setUsersForYear: (
		academicYear: string,
		payload: { students?: any[] },
		options?: { merge?: boolean },
	) => void;
}

export const resolveDocumentStudents = async ({
	filters,
	isStudent,
	user,
	school,
	usersByAcademicYear,
	setUsersForYear,
}: ResolveStudentsParams): Promise<any[]> => {
	if (isStudent && user) {
		return [
			mapDocumentStudent(
				{
					...user,
					className: filters.className || user.classId || '',
				},
				filters.className,
			),
		];
	}

	const scoped = getScopedAcademicYearValue<any>(
		usersByAcademicYear,
		filters.academicYear,
	);
	const cachedStudents =
		(scoped.value?.students || []).filter(
			(student: any) =>
				getStudentClassIdForAcademicYear(student, filters.academicYear, {
					allowCurrentClassFallback: true,
					schoolProfile: school,
				}) === filters.className,
		) || [];

	let records: any[];
	if (cachedStudents.length > 0) {
		records = cachedStudents.map((student: any) =>
			mapDocumentStudent(student, filters.className),
		);
	} else {
		const response = await fetch(
			`/api/users?classId=${filters.className}&role=student&academicYear=${filters.academicYear}&limit=50000`,
		);
		if (!response.ok) throw new Error('Failed to fetch students');
		const result = await response.json();
		if (!result.success || !Array.isArray(result.data)) {
			throw new Error('Invalid student data format');
		}
		setUsersForYear(
			filters.academicYear,
			{ students: result.data },
			{ merge: true },
		);
		records = result.data.map((student: any) =>
			mapDocumentStudent(student, filters.className),
		);
	}

	const selectedIds = new Set(
		(filters.selectedStudents || [])
			.map((id) => normalizeStudentId(id))
			.filter(Boolean),
	);
	if (selectedIds.size > 0) {
		records = records.filter((student) =>
			selectedIds.has(student.studentId),
		);
	}

	return records;
};
