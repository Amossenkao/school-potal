export const isStudentRole = (role?: string | null): boolean =>
	role === 'student' || role === 'parent';
