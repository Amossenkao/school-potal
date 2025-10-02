export type UserRole = 'student' | 'teacher' | 'administrator' | 'system_admin';

export interface ClassSchedule {
	day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
	startTime: string;
	endTime: string;
	subject: string;
}

export interface PaymentReceipt {
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
		feeType: string;
		category: string;
		requiredAmount: number;
		remainingBalance: number;
	}[];
	paymentReceipts: PaymentReceipt[];
}

export interface Class {
	academicYear: string;
	classId: string;
	className: string;
	classLevel: string;
	session?: string;
	sponsorName?: string;
	schedule: ClassSchedule[];
	studentIds: string[];
}

export interface User {
	userId: string;
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
	passwordChangedAt?: Date | null;
	phone: string;
	email?: string;
	address: string;
	bio?: string;
	avatar?: string;
	chats: AIChatMessage[];
	notifications: Notification[];
}

export interface Student extends User {
	role: 'student';
	studentId: string;
	enrollmentYear: string;
	enrollmentSemester: string;
	enrollmentStatus: 'enrolled' | 'graduated' | 'transferred' | 'dropped';
	session: string;
	classId: string;
	classLevel: string;
	className: string;

	// This new structiure for and academicYears key is meant to handle
	// details for students who stay more than one year. it will hold all
	// the academic years that the studetn has stayed in the school and their classes in that year
	// if the student gets a double promotion after first semester, the classIds of both classes will
	// be added to the classIds array in the same academic year
	// that way, if the student fetches their periodid grades for any of the periods in the first
	// semester, it will show the previous class, which is appropiate it was where they got the grades
	// if the student fetches their yearly grades, it will combine all the grades for the previous and currnet class

	academicYears: { year: string; classIds: string[] }[];
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

export interface TeacherSubject {
	academicYear: string;
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
	sysId: string;
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
