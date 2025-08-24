import { getTenantConnection } from '@/lib/mongoose';

import UserSchema from './user/User';
import StudentSchema from './user/Student';
import TeacherSchema from './user/Teacher';
import AdministratorSchema from './user/Administrator';
import SystemAdminSchema from './user/SystemAdmin';
import GradeSchema from './grade/Grade';

// import SchoolInfoSchema from './school/SchoolInfo';
// import SchoolSchema from './school/School';
// import ClassSchema from './school/Class';

// import MessageSchema from './message/Message';

import { Document } from 'mongoose';
import type {
	User,
	Student,
	Teacher,
	Administrator,
	SystemAdmin,
	// SchoolInfo,
	// School,
	// Class,
	// Message,
} from '@/types';

export const getTenantModels = async (host: string | null) => {
	const connection = await getTenantConnection(host);
	if (!connection)
		throw new Error('Could not establish DB connection for tenant');

	const User = connection.model<User & Document>('User', UserSchema);

	const StudentModel =
		User.discriminators?.student ||
		User.discriminator<Student & Document>('student', StudentSchema);

	const TeacherModel =
		User.discriminators?.teacher ||
		User.discriminator<Teacher & Document>('teacher', TeacherSchema);

	const AdministratorModel =
		User.discriminators?.administrator ||
		User.discriminator<Administrator & Document>(
			'administrator',
			AdministratorSchema
		);

	const GradeModel = connection.model<Document>('Grade', GradeSchema);

	const SystemAdminModel =
		User.discriminators?.system_admin ||
		User.discriminator<SystemAdmin & Document>(
			'system_admin',
			SystemAdminSchema
		);

	// const SchoolInfo = connection.model<SchoolInfo & Document>(
	// 	'SchoolInfo',
	// 	SchoolInfoSchema
	// );
	// const School = connection.model<School & Document>('School', SchoolSchema);
	// const Class = connection.model<Class & Document>('Class', ClassSchema);
	// const MessageModel = connection.model<Message & Document>(
	// 	'Message',
	// 	MessageSchema
	// );

	return {
		User,
		Student: StudentModel,
		Teacher: TeacherModel,
		Administrator: AdministratorModel,
		SystemAdmin: SystemAdminModel,
		// SchoolInfo,
		// School,
		// Class,
		// Message: MessageModel,
		Grade: GradeModel,
	};
};

// Convenience getters
export const getUserModel = async (host: string | null) =>
	(await getTenantModels(host)).User;
export const getStudentModel = async (host: string | null) =>
	(await getTenantModels(host)).Student;
export const getTeacherModel = async (host: string | null) =>
	(await getTenantModels(host)).Teacher;
export const getAdministratorModel = async (host: string | null) =>
	(await getTenantModels(host)).Administrator;
export const getSystemAdminModel = async (host: string | null) =>
	(await getTenantModels(host)).SystemAdmin;
export const getGradeModel = async (host: string | null) =>
	(await getTenantModels(host)).Grade;

// export const getSchoolInfoModel = async (host: string | null) =>
// 	(await getTenantModels(host)).SchoolInfo;
// export const getSchoolModel = async (host: string | null) =>
// 	(await getTenantModels(host)).School;
// export const getClassModel = async (host: string | null) =>
// 	(await getTenantModels(host)).Class;
// export const getMessageModel = async (host: string | null) =>
// 	(await getTenantModels(host)).Message;
