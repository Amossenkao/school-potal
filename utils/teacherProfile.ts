export function isTeacherRole(user: any): boolean {
	return (
		user?.role === 'teacher' ||
		(user?.role === 'administrator' && !!user?.isTeacher)
	);
}

/**
 * Returns a teacher-shaped profile for isTeacher administrators so that
 * grading components can read assignment data the same way as for teachers.
 * Teachers pass through unchanged; every other user is returned unchanged.
 */
export function toTeacherProfile(user: any): any {
	if (!user) return null;
	if (!isTeacherRole(user)) return user;
	return {
		...user,
		role: 'teacher',
		subjects:
			user.role === 'administrator'
				? Array.isArray(user.classes)
					? user.classes
					: []
				: user.subjects || [],
	};
}
