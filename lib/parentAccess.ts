export interface ParentChild {
	id: string;
	studentId: string;
	username: string;
	firstName?: string;
	middleName?: string;
	lastName?: string;
	fullName?: string;
	classId?: string;
	className?: string;
	classLevel?: string;
	academicYears: string[];
	studentType?: string;
	profilePictureUrl?: string;
	isActive?: boolean;
}

/**
 * Resolves a parent's `studentIds` (student usernames / studentId convention)
 * into hydrated child records used by the parent switcher and scoped data APIs.
 */
export const buildParentChildrenList = async (
	models: any,
	parent: any,
): Promise<ParentChild[]> => {
	const studentIds = Array.isArray(parent.studentIds) ? parent.studentIds : [];
	if (studentIds.length === 0) return [];
	try {
		const students = await models.User.find({
			role: 'student',
			$or: [
				{ studentId: { $in: studentIds } },
				{ username: { $in: studentIds } },
			],
		})
			.select(
				'studentId username firstName middleName lastName fullName classId className classLevel academicYears studentType profilePictureUrl isActive',
			)
			.lean();
		return (students || [])
			.map((s: any) => ({
				id: s._id.toString(),
				studentId: s.studentId || s.username,
				username: s.username,
				firstName: s.firstName,
				middleName: s.middleName,
				lastName: s.lastName,
				fullName: s.fullName,
				classId: s.classId,
				className: s.className,
				classLevel: s.classLevel,
				academicYears: Array.isArray(s.academicYears) ? s.academicYears : [],
				studentType: s.studentType || 'old',
				profilePictureUrl: s.profilePictureUrl || '',
				isActive: s.isActive ?? true,
			}))
			.sort((a: any, b: any) =>
				(a.fullName || '').localeCompare(b.fullName || ''),
			);
	} catch {
		return [];
	}
};

export const parentOwnsStudent = (parent: any, studentId: string): boolean => {
	const studentIds = Array.isArray(parent.studentIds) ? parent.studentIds : [];
	return studentIds.includes(studentId);
};

export const scopedParentSessionFields = (child: ParentChild | null) => ({
	studentId: child?.studentId || null,
	classId: child?.classId || null,
	className: child?.className || null,
	classLevel: child?.classLevel || null,
	academicYears: child?.academicYears || [],
	firstName: child?.firstName || null,
	middleName: child?.middleName || null,
	lastName: child?.lastName || null,
	fullName: child?.fullName || null,
	studentType: child?.studentType || null,
	profilePictureUrl: child?.profilePictureUrl || null,
});
