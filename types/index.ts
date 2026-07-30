
export type UserRole =
	| 'student'
	| 'teacher'
	| 'administrator'
	| 'system_admin'
	| 'superadmin';


export type FeatureKey =
	// Core
	| 'user_management'
	| 'ai_chat'
	| 'apps'
	| 'student_attendance'
	| 'teacher_attendance'
	// Academic
	| 'grade_management'
	| 'academic_reports'
	| 'calendar_events'
	| 'class_management'
	// Financial
	| 'fee_payment'
	| 'financial_reports'
	| 'record_payments'
	| 'online_payment'
	// Communication & Support
	| 'support_system'
	| 'community'
	// Documents
	| 'academic_documents'

	// System
	| 'school_settings'

	// Default (always-accessible core pages)
	| 'default_features';

export const FEATURE_KEYS: FeatureKey[] = [
	// Core Features
	'user_management',
	'ai_chat',
	'apps',
	'student_attendance',
	'teacher_attendance',

	// Academic Features
	'grade_management',
	'academic_reports',
	'calendar_events',
	'class_management',

	// Financial Features
	'fee_payment',
	'financial_reports',
	'record_payments',
	'online_payment',

	// Communication & Support
	'support_system',
	'community',

	// Documents
	'academic_documents',

	// System Features
	'school_settings',

	// Default Features (always accessible)
	'default_features',
];
export interface ClassSchedule {
	day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
	startTime: string;
	endTime: string;
	subject: string;
}

export interface Attendance {
	academicYear: string;
	classId: string;
	date: Date,
	presentStudentIds: string[];
	absentStudentIds: string[];
	recordedBy?: string;
}

export interface TeacherAttendance {
	academicYear: string;
	teacherId: string;
	date: Date;
	status: 'present' | 'late' | 'absent';
	recordedBy?: string;
}

export interface PaymentRecords {
	id: string;
	receiptNumber: string;
	studentId: string;
	classId: string;
	paidBy: string;
	feeType: string;
	category: string;
	paymentAmount: number;
	currency: string;
	paymentAcademicYear: string;
	paymentDate: string;
	paymentTime: string;
}

export interface Class {
	academicYear: string;
	classId: string;
	className: string;
	classLevel: string;
	sponsorName?: string;
	schedule: ClassSchedule[];
	studentIds: string[];
	stats: {
		totalStudents: number;
		activeStudents: number;
		inactiveStudents: number;
		droppedStudents: number;
		totalMales: number;
		totalFemales: number;
		academicRankings: {
			period: string;
			rankings: { studentId: string; rank: number }[];
		}[];
	};
}

export interface User {
	id: string;
	username: string;
	role: UserRole;
	firstName: string;
	middleName?: string;
	lastName: string;
	fullName: string;
	password: string;
	nickName?: string;
	gender: string;
	dateOfBirth: string;
	isActive: boolean;
	defaultPassword?: string;
	mustChangePassword: boolean;
	passwordChangedAt?: Date | null;
	phone: string;
	email?: string;
	address: string;
	bio?: string;
	avatar?: string;
	profilePictureUrl?: string;
	chats: AIChatMessage[];
	chatSessions?: AIChatSession[];
	notifications: Notification[];
}

export interface Student extends User {
	role: 'student';
	studentId: string;
	enrollmentYear: string;
	enrollmentSemester: string;
	enrollmentStatus: 'enrolled' | 'graduated' | 'transferred' | 'dropped';
	classId: string;
	className: string;
	shareContactWithClassmates: boolean;
	isLateRegistration?: boolean;
	academicYears: { year: string; classId: string; className?: string }[];
	canRecordAttendance?: string;
	guardian: {
		firstName: string;
		middleName?: string;
		lastName: string;
		email?: string;
		phone: string;
		address: string;
	};
	studentType?: 'old' | 'new';
	wardTeacherId?: string;
	scholarships?: string[];

}

export interface Teacher extends User {
	role: 'teacher';
	subjects: {
		year: string;
		classes: { classId: string; subjects: string[] }[];
	}[];
	sponsorClass: string | null;
}

export interface Administrator extends User {
	role: 'administrator';
	position: string;
	permissions: FeatureKey[];
	canRecordStudentAttendance: boolean;
	canRecordTeacherAttendance: boolean;
	isTeacher: boolean;
	classes: {
		year: string;
		classes: { classId: string; subjects: string[] }[];
	}[];
	academicYears: { year: string; position: string }[];
}

export interface SystemAdmin extends User {
	role: 'system_admin';
	username: string;
}

export interface SuperAdmin extends User {
	role: 'superadmin';
}

export interface AIChatMessage {
	sender: 'user' | 'assistant';
	content: string;
	timestamp: Date;
}

export interface AIChatSession {
	id: string;
	title: string;
	createdAt: Date;
	messages: AIChatMessage[];
}

export interface Notification {
	title: string;
	message: string;
	details?: string | Record<string, any>;
	timestamp: Date;
	read: boolean;
	dismissed: boolean;
	type: 'Grades' | 'Security' | 'Profile' | 'Others';
}
