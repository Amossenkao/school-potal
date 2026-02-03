export type UserRole =
	| 'student'
	| 'teacher'
	| 'administrator'
	| 'system_admin'
	| 'super_admin';

export interface ClassSchedule {
	day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
	startTime: string;
	endTime: string;
	subject: string;
}

export interface PaymentRecords {
	id: string;
	receiptNumber: string;
	paidBy: string;
	feeType: string;
	category: string;
	paymentAmount: number;
	paymentAcademicYear: string;
	paymentDate: string;
	paymentTime: string;
}

export interface StudentFinancialProfile {
	outstandingBalances: {
		academicYear: string;
		feeType: string;
		category: string;
		requiredAmount: number;
		remainingBalance: number;
	}[];
	paymentRecords: PaymentRecords[];
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
	academicYears: { year: string; classId: string; className?: string }[];
	guardian: {
		firstName: string;
		middleName?: string;
		lastName: string;
		email?: string;
		phone: string;
		address: string;
	};
	financialProfile: StudentFinancialProfile;
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
	academicYears: { year: string; position: string }[];
}

export interface SystemAdmin extends User {
	role: 'system_admin';
	username: string;
}

export interface AIChatMessage {
	sender: 'user' | 'assistant';
	content: string;
	timestamp: Date;
}

export interface Notification {
	title: string;
	message: string;
	details?: string;
	timestamp: Date;
	read: boolean;
	dismissed: boolean;
	type: 'Grades' | 'Security' | 'Profile' | 'Others';
}
