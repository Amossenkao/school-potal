export interface FinancialChildView {
	isParent: boolean;
	name: string;
	studentId: string;
	className: string;
	classId: string;
	studentType: 'new' | 'old';
	avatar: string;
}

export const resolveChildView = (user: any): FinancialChildView => {
	const isParent = user?.role === 'parent';
	const parentChildren = Array.isArray(user?.parentChildren)
		? user.parentChildren
		: [];
	const selectedStudentId = String(user?.studentId || '');
	const child = isParent
		? parentChildren.find(
				(c: any) =>
					String(c.studentId || '') === selectedStudentId ||
					String(c.username || '') === selectedStudentId,
			) || null
		: null;

	const fallbackName = [user?.firstName, user?.lastName]
		.filter(Boolean)
		.join(' ')
		.trim();
	const name =
		child?.fullName ||
		[child?.firstName, child?.middleName, child?.lastName]
			.filter(Boolean)
			.join(' ') ||
		fallbackName ||
		'Student';

	const studentId =
		child?.studentId ||
		child?.username ||
		user?.studentId ||
		user?.id ||
		'';
	const className = child?.className || user?.className || '';
	const classId = child?.classId || user?.classId || '';
	const studentType: 'new' | 'old' =
		child?.studentType || user?.studentType || 'old';
	const avatar =
		child?.profilePictureUrl ||
		user?.profilePictureUrl ||
		user?.avatar ||
		user?.profilePhoto ||
		'';

	return { isParent, name, studentId, className, classId, studentType, avatar };
};
