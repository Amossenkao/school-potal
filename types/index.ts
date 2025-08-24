import type { LucideIcon } from 'lucide-react';

export interface NavItem {
	name: string;
	href?: string;
	id?: string;
	roles?: string[];
	icon?: LucideIcon;
	excludeRoles?: string[];
	subItems?: {
		name: string;
		id?: string;
		href?: string;
		icon?: LucideIcon;
		roles?: string[];
		excludeRoles?: string[];
	}[];
}

export const classIds = [
	{ id: 'daycare', name: 'Daycare', level: 'Self Contained' },
	{ id: 'nursery', name: 'Nursery', level: 'Self Contained' },
	{ id: 'kOne', name: 'Kindergarten 1', level: 'Self Contained' },
	{ id: 'kTwo', name: 'Kindergarten 2', level: 'Self Contained' },
	{ id: 'one', name: 'Grade 1', level: 'Self Contained' },
	{ id: 'two', name: 'Grade 2', level: 'Self Contained' },
	{ id: 'three', name: 'Grade 3', level: 'Self Contained' },
	{ id: 'four', name: 'Grade 4', level: 'Elementary' },
	{ id: 'five', name: 'Grade 5', level: 'Elementary' },
	{ id: 'six', name: 'Grade 6', level: 'Elementary' },
	{ id: 'seven', name: 'Grade 7', level: 'Junior High' },
	{ id: 'eight', name: 'Grade 8', level: 'Junior High' },
	{ id: 'nine', name: 'Grade 9', level: 'Junior High' },
	{ id: 'tenOne', name: 'Grade 10-A', level: 'Senior High' },
	{ id: 'tenTwo', name: 'Grade 10-B', level: 'Senior High' },
	{ id: 'elevenOne', name: 'Grade 11-A', level: 'Senior High' },
	{ id: 'elevenTwo', name: 'Grade 11-B', level: 'Senior High' },
	{ id: 'twelveOne', name: 'Grade 12-A', level: 'Senior High' },
	{ id: 'twelveTwo', name: 'Grade 12-B', level: 'Senior High' },
];

export interface SchoolNavItem {
	name: string;
	href?: string;
	subItems?: { name: string; href: string }[];
}

export interface SchoolUiConfig {
	homepage?: boolean;
	logos: string[];
	navItems: SchoolNavItem;
	sections: {};

	features: {};
}

export interface SchoolInfo {
	name: string;
	shortName: string;
	domain: string;
	subDomain?: string;
	address: string;
	schoolType: string;

	uiConfig: SchoolUiConfig;
}

export type UserRole = 'student' | 'teacher' | 'administrator' | 'system_admin';

export interface School {
	id: string;
	name: string;
	shortName: string;
	heroText: string;
	homePage?: boolean;
	subdomain: string;
	logos: string[];
	navItems?: SchoolNavItem[];
	administrators: [];
}

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

interface ClassSubjects {
	[subject: string]: string;
}

export interface Class {
	classId: string;
	name: string;
	level: string;
	sponsorId: string;
	schedule: ClassSchedule[];
	subjects: ClassSubjects;
	studentIds: string[];
	teacherIds: string[];
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
	mustChangePassowrd: boolean;
	requiresOtp: boolean;
	phone: string;
	email?: string;
	address: string;
	bio?: string;
	photo?: string;
	avatar?: string;
	messages: Message[];
	lockedUntil?: Date;
}

interface UserNavItem {
	name: string;
	icon: LucideIcon;
	roles?: string[];
	excludeRoles?: string[];
	href?: string;
	disabled?: boolean;
	subItems?: {
		name: string;
		href: string;
		icon?: LucideIcon;
		roles?: string[];
		excludeRoles?: string[];
	}[];
}

export interface Student extends User {
	role: 'student';
	studentId: string;
	classId: string;
	classLevel: string;
	className: string;
	session?: string;
	requiresOtp: false;
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
	requiresOtp: false;
	subjects: TeacherSubject[];
	sponsorClass: string | null;
}

export interface Administrator extends User {
	role: 'administrator';
	adminId: string;
	position: string;
	requiresOtp: false;
}

export interface SystemAdmin extends User {
	role: 'system_admin';
	requiresOtp: true;
}

export interface GradeSubmission {
	id: string;
	teacherId: string;
	submissionDate: string;
	status: 'submitted' | 'approved' | 'rejected';
}

export interface Message {
	id: string;
	senderId: string;
	receiverId: string;
	content: string;
	timestamp: string;
	read: boolean;
}
