export type UserRole = 'student' | 'teacher' | 'administrator' | 'system_admin';

export interface ClassSchedule {
	day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
	startTime: string;
	endTime: string;
	subject: string;
}

interface ClassRanks {
	academicYear: string;
	period: string;
	ranks: string[];
}

interface ClassTeacher {
	teacherId: string;
	teacherName: string;
	subjectsTaught: string[];
}

export interface Class {
	classId: string;
	className: string;
	classLevel: string;
	sponsorId: string;
	sponsorName: string;
	schedule: ClassSchedule[];
	subjects: string[];
	studentIds: string[];
	teachers: ClassTeacher[];
	ranks: ClassRanks[];
}

export interface User {
	id: string;
	role: UserRole;
	firstName: string;
	middleName?: string;
	lastName: string;
	username: string;
	password: string;
	nickName?: string;
	gender: string;
	dateOfBirth: string;
	isActive: boolean;
	mustChangePassword: boolean;
	phone: string;
	email?: string;
	address: string;
	bio?: string;
	photo?: string;
	avatar?: string;
	messages: Message[];
	lockedUntil?: Date;
	notifications: Notification[];
}

export interface Student extends User {
	role: 'student';
	studentId: string;
	classId: string;
	classLevel: string;
	className: string;
	session?: string;
	guardian: {
		firstName: string;
		middleName?: string;
		lastName: string;
		email?: string;
		phone: string;
		address: string;
	};
}

export interface TeacherSubject {
	subject: string;
	level: string;
	session: string;
}

export interface Teacher extends User {
	role: 'teacher';
	teacherId: string;
	subjects: TeacherSubject[];
	sponsorClass: string | null;
}

export interface Administrator extends User {
	role: 'administrator';
	adminId: string;
	position: string;
}

export interface SystemAdmin extends User {
	role: 'system_admin';
	requiresOtp: true;
}

export interface Message {
	id: string;
	senderId: string;
	receiverId: string;
	content: string;
	timestamp: string;
	read: boolean;
}

export interface Notification {
	id: string;
	title: string;
	message: string;
	details?: string;
	timestamp: Date;
	read: boolean;
	dismissed: boolean;
	type: 'Login' | 'Grades' | 'Security' | 'Profile';
}
