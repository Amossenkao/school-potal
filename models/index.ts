import { getTenantConnection } from '@/lib/mongoose';
import { Connection, Document } from 'mongoose';

import UserSchema from './user/User';
import StudentSchema from './user/Student';
import TeacherSchema from './user/Teacher';
import AdministratorSchema from './user/Administrator';
import SystemAdminSchema from './user/SystemAdmin';
import UserSyncStateSchema from './user/UserSyncState';
import GradeSchema from './grade/Grade';
import GradeChangeRequestSchema from './grade/GradeChangeRequest';
import ReportShareSchema from './reports/ReportShare';
import SchoolEventSchema from '@/models/events/SchoolEvent';

import type {
	User,
	Student,
	Teacher,
	Administrator,
	SystemAdmin,
} from '@/types';

// --- Model Cache ---
// Store models per tenant to avoid recompilation
const modelCache = new Map<Connection, any>();

export const getTenantModels = async (host?: string | null) => {
	const connection = await getTenantConnection(host);
	if (!connection) {
		throw new Error('Could not establish DB connection for tenant');
	}

	// --- Check if models are already compiled for this connection ---
	if (modelCache.has(connection)) {
		return modelCache.get(connection);
	}

	// --- If not cached, compile them once ---
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

	const SystemAdminModel =
		User.discriminators?.system_admin ||
		User.discriminator<SystemAdmin & Document>(
			'system_admin',
			SystemAdminSchema
		);

	const GradeModel = connection.model<Document>('Grade', GradeSchema);
	const GradeChangeRequestModal = connection.model<Document>(
		'GradeChangeRequest',
		GradeChangeRequestSchema
	);
	const ReportShareModel = connection.model<Document>(
		'ReportShare',
		ReportShareSchema
	);
	const SchoolEventModel = connection.model<Document>(
		'SchoolEvent',
		SchoolEventSchema
	);
	const UserSyncStateModel = connection.model<Document>(
		'UserSyncState',
		UserSyncStateSchema
	);
	const models = {
		User,
		Student: StudentModel,
		Teacher: TeacherModel,
		Administrator: AdministratorModel,
		SystemAdmin: SystemAdminModel,
		Grade: GradeModel,
		GradeChangeRequest: GradeChangeRequestModal,
		ReportShare: ReportShareModel,
		SchoolEvent: SchoolEventModel,
		UserSyncState: UserSyncStateModel,
	};

	// --- Store the compiled models in the cache ---
	modelCache.set(connection, models);

	return models;
};

// Convenience getters remain the same
export const getUserModel = async (host?: string | null) =>
	(await getTenantModels(host)).User;
export const getStudentModel = async (host?: string | null) =>
	(await getTenantModels(host)).Student;
export const getTeacherModel = async (host?: string | null) =>
	(await getTenantModels(host)).Teacher;
export const getAdministratorModel = async (host?: string | null) =>
	(await getTenantModels(host)).Administrator;
export const getSystemAdminModel = async (host?: string | null) =>
	(await getTenantModels(host)).SystemAdmin;
export const getGradeModel = async (host?: string | null) =>
	(await getTenantModels(host)).Grade;
