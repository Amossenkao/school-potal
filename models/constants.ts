// Shared enums and constants for models

export const UserRoles = [
	'student',
	'teacher',
	'administrator',
	'system_admin',
	'parent',
] as const;

export const ClassLevels = [
	'Self Contained',
	'Kindergarten',
	'Elementary',
	'Junior High',
	'Senior High',
] as const;

export const GradeStatus = ['Pending', 'Approved', 'Rejected'];
