// Shared enums and constants for models

export const UserRoles = [
	'student',
	'teacher',
	'administrator',
	'system_admin',
] as const;

export const ClassLevels = [
	'Self Contained',
	'Elementry',
	'Junior High',
	'Senior High',
] as const;

export const GradeStatus = ['Pending', 'Approved', 'Rejected'];
