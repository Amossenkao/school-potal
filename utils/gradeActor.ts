import type { NextRequest } from 'next/server';
import { authorizeUser, AuthenticatedUser } from '@/proxy';

export function isTeacherActor(user: any): boolean {
	return (
		user?.role === 'teacher' ||
		(user?.role === 'administrator' && !!user?.isTeacher)
	);
}

/**
 * Authorizes a request against a role list while allowing administrators
 * with `isTeacher: true` to act as teachers for grading operations.
 */
export async function authorizeGradeActor(
	request: NextRequest,
	requiredRoles: string[],
): Promise<AuthenticatedUser | false> {
	const user = await authorizeUser(request);
	if (!user) return false;
	if (requiredRoles.includes(user.role)) return user;
	if (requiredRoles.includes('teacher') && isTeacherActor(user)) return user;
	return false;
}

/**
 * Resolves the assignment record used for grade-submission checks.
 * Teachers use their Teacher document; isTeacher administrators use the
 * `classes` array stored on their User record (same shape as `subjects`).
 */
export async function resolveGradeTeacherRecord(
	models: any,
	user: any,
): Promise<any> {
	if (user?.role === 'administrator' && user.isTeacher) {
		return {
			_id: user.id,
			role: user.role,
			username: user.username,
			subjects: Array.isArray(user.classes) ? user.classes : [],
			academicYears: user.academicYears || [],
		};
	}
	return models.Teacher.findById(user.id).select('subjects').lean();
}
