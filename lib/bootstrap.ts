import { getTenantModels } from '@/models';
import { getSchoolProfile, getTenantConnectionByDbName } from '@/lib/mongoose';
import { getSchoolMeshModels } from '@/models/schoolmesh';
import UserSchema from '@/models/user/User';
import type { UserRole } from '@/types';
import {
	getAcademicYearFilterValue,
	getCurrentAcademicYearFromSchoolProfile,
	getStudentClassIdForAcademicYear,
	getTeacherClassIdsForAcademicYear,
	getTeacherClassSubjectPairsForAcademicYear,
	resolveAcademicYearAccessContext,
} from '@/utils/academicYearAccess';
import { getUsersVersion as getUsersSyncVersion } from '@/utils/userSync';
import { toHash } from '@/utils/syncVersion';

const MAX_BOOTSTRAP_USERS = 5000;

type DomainVersions = {
	users: string;
	calendar: string;
	schedules: string;
	grades: string;
	gradeRequests: string;
	attendance: string;
	teacherAttendance: string;
	payments: string;
};

type BootstrapUsers = {
	students: any[];
	teachers: any[];
	administrators: any[];
	parents: any[];
};

const USER_BOOTSTRAP_SELECT = {
	_id: 1,
	username: 1,
	role: 1,
	firstName: 1,
	middleName: 1,
	lastName: 1,
	fullName: 1,
	nickName: 1,
	gender: 1,
	dateOfBirth: 1,
	isActive: 1,
	mustChangePassword: 1,
	passwordChangedAt: 1,
	phone: 1,
	email: 1,
	address: 1,
	bio: 1,
	avatar: 1,
	profilePictureUrl: 1,
	createdAt: 1,
	updatedAt: 1,
	studentId: 1,
	studentType: 1,
	enrollmentYear: 1,
	enrollmentSemester: 1,
	enrollmentStatus: 1,
	classId: 1,
	className: 1,
	shareContactWithClassmates: 1,
	isLateRegistration: 1,
	academicYears: 1,
	studentIds: 1,
	subjects: 1,
	sponsorClass: 1,
	position: 1,
	wardTeacherId: 1,
	scholarships: 1,
} as const;

export const getAcademicYear = (schoolProfile: any) => {
	return getCurrentAcademicYearFromSchoolProfile(schoolProfile);
};

export const normalizeUser = (user: any) => {
	const id = user?.id || user?._id?.toString();
	const isStudent = user?.role === 'student';
	const shareContact = user?.shareContactWithClassmates === true;
	const baseUser = {
		id,
		_id: id,
		username: user.username,
		role: user.role as UserRole,
		firstName: user.firstName,
		middleName: user.middleName,
		lastName: user.lastName,
		fullName: user.fullName,
		nickName: user.nickName,
		gender: user.gender,
		dateOfBirth: user.dateOfBirth,
		isActive: user.isActive,
		mustChangePassword: user.mustChangePassword,
		passwordChangedAt: user.passwordChangedAt,
		phone: isStudent ? (shareContact ? user.phone : undefined) : user.phone,
		email: user.email,
		address: user.address,
		bio: user.bio,
		avatar: user.avatar,
		profilePictureUrl: user.profilePictureUrl,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	};

	switch (user.role as UserRole) {
		case 'student':
			return {
				...baseUser,
				studentId: user.studentId || user.username,
				studentType: user.studentType ?? 'old',
				enrollmentYear: user.enrollmentYear,
				enrollmentSemester: user.enrollmentSemester,
				enrollmentStatus: user.enrollmentStatus,
				classId: user.classId,
				className: user.className,
				shareContactWithClassmates: user.shareContactWithClassmates ?? false,
				isLateRegistration: user.isLateRegistration ?? false,
				academicYears: user.academicYears || [],
				wardTeacherId: user.wardTeacherId || null,
				scholarships: user.scholarships || [],
			};
		case 'teacher':
			return {
				...baseUser,
				subjects: user.subjects || [],
				sponsorClass: user.sponsorClass || null,
			};
		case 'administrator':
			return {
				...baseUser,
				position: user.position,
				permissions: user.permissions || [],
				canRecordStudentAttendance: user.canRecordStudentAttendance ?? false,
				canRecordTeacherAttendance: user.canRecordTeacherAttendance ?? false,
				academicYears: user.academicYears || [],
			};
		case 'system_admin':
			return { ...baseUser, username: user.username };
		case 'parent':
			return { ...baseUser, studentIds: user.studentIds || [] };
		default:
			return baseUser;
	}
};

const getStudentClassIdForYear = (student: any, academicYear: string) => {
	return getStudentClassIdForAcademicYear(student, academicYear, {
		allowCurrentClassFallback: true,
	});
};

const getTeacherClassIdsForYear = (teacher: any, academicYear: string) => {
	return getTeacherClassIdsForAcademicYear(teacher, academicYear);
};

/**
 * Resolves every child's student identifier (studentId or username) for a
 * parent user. Falls back to the session's selected child when no hydrated
 * children or linked `studentIds` are present (legacy sessions).
 */
const getParentChildStudentIds = (currentUser: any): string[] => {
	const ids = new Set<string>();
	if (Array.isArray(currentUser.parentChildren)) {
		for (const child of currentUser.parentChildren) {
			const id = child?.studentId || child?.username;
			if (id) ids.add(String(id));
		}
	}
	if (Array.isArray(currentUser.studentIds)) {
		for (const sid of currentUser.studentIds) {
			if (sid) ids.add(String(sid));
		}
	}
	if (ids.size === 0) {
		const fallback = currentUser.studentId || currentUser.username;
		if (fallback) ids.add(String(fallback));
	}
	return Array.from(ids);
};

/**
 * Resolves every child's class id for the given academic year so parents
 * receive data scoped to all of their children, not just the first one.
 */
const getParentChildClassIds = (
	currentUser: any,
	academicYear: string,
): string[] => {
	const ids = new Set<string>();
	if (Array.isArray(currentUser.parentChildren)) {
		for (const child of currentUser.parentChildren) {
			const classId = getStudentClassIdForYear(child, academicYear);
			if (classId) ids.add(String(classId));
		}
	}
	if (ids.size === 0) {
		const classId = getStudentClassIdForYear(currentUser, academicYear);
		if (classId) ids.add(String(classId));
	}
	return Array.from(ids);
};

const getAcademicYearMatch = (academicYear: string) =>
	getAcademicYearFilterValue(academicYear);

const getRoleClassFilter = (currentUser: any, academicYear: string) => {
	if (currentUser.role === 'student') {
		const classId = getStudentClassIdForYear(currentUser, academicYear);
		return classId ? { classId } : {};
	}
	if (currentUser.role === 'parent') {
		const classIds = getParentChildClassIds(currentUser, academicYear);
		return classIds.length ? { classId: { $in: classIds } } : {};
	}
	if (currentUser.role === 'teacher') {
		const classIds = getTeacherClassIdsForYear(currentUser, academicYear);
		return classIds.length ? { classId: { $in: classIds } } : {};
	}
	return {};
};

export const getRoleGradesQuery = (currentUser: any, academicYear: string) => {
	const academicYearMatch = getAcademicYearMatch(academicYear);
	if (currentUser?.role === 'student') {
		const studentId = currentUser.studentId || currentUser.username;
		if (!studentId) return null;
		return { academicYear: academicYearMatch, studentId };
	}

	if (currentUser?.role === 'parent') {
		const studentIds = getParentChildStudentIds(currentUser);
		if (studentIds.length === 0) return null;
		return { academicYear: academicYearMatch, studentId: { $in: studentIds } };
	}

	if (currentUser?.role === 'teacher') {
		if (!currentUser.username) return null;
		const pairs = getTeacherClassSubjectPairsForAcademicYear(
			currentUser,
			academicYear,
		);
		if (pairs.length === 0) return null;

		const classSubjectConditions = pairs.map((p) => ({
			classId: p.classId,
			subject: p.subjects.length === 1 ? p.subjects[0] : { $in: p.subjects },
		}));

		return {
			academicYear: academicYearMatch,
			teacherUsername: currentUser.username,
			$or: classSubjectConditions,
		};
	}

	if (currentUser?.role === 'system_admin') {
		return { academicYear: academicYearMatch };
	}

	return null;
};

const getRoleGradeRequestsQuery = (currentUser: any, academicYear: string) => {
	const academicYearMatch = getAcademicYearMatch(academicYear);
	if (currentUser?.role === 'teacher') {
		if (!currentUser.username) return null;
		const pairs = getTeacherClassSubjectPairsForAcademicYear(
			currentUser,
			academicYear,
		);
		if (pairs.length === 0) return null;

		const classSubjectConditions = pairs.map((p) => ({
			classId: p.classId,
			subject: p.subjects.length === 1 ? p.subjects[0] : { $in: p.subjects },
		}));

		return {
			academicYear: academicYearMatch,
			teacherUsername: currentUser.username,
			$or: classSubjectConditions,
		};
	}
	if (currentUser?.role === 'system_admin') {
		return { academicYear: academicYearMatch };
	}

	return null;
};

/**
 * Builds the TeacherAttendance query for the requesting user.
 *
 * - teacher       → only their own records for the given academic year
 * - system_admin  → all records for the year
 * - administrator → all records for the year (admin panel access)
 * - everyone else → null (no access)
 */
const getRoleTeacherAttendanceQuery = (
	currentUser: any,
	academicYear: string,
) => {
	const academicYearMatch = getAcademicYearMatch(academicYear);

	if (currentUser?.role === 'teacher') {
		return { academicYear: academicYearMatch, teacherId: currentUser.id };
	}

	if (
		currentUser?.role === 'system_admin' ||
		currentUser?.role === 'administrator'
	) {
		return { academicYear: academicYearMatch };
	}

	return null;
};
/**
 * Builds the Attendance query for the requesting user.
 *
 * - student     → only their own class for the given academic year
 * - teacher     → only the classes listed in their subjects for the year
 * - system_admin → all records for the year
 * - everyone else → null (no access)
 */
export const getRoleAttendanceQuery = (
	currentUser: any,
	academicYear: string,
) => {
	const academicYearMatch = getAcademicYearMatch(academicYear);

	if (currentUser?.role === 'student') {
		const classId = getStudentClassIdForYear(currentUser, academicYear);
		if (!classId) return null;
		return { academicYear: academicYearMatch, classId };
	}

	if (currentUser?.role === 'parent') {
		const classIds = getParentChildClassIds(currentUser, academicYear);
		if (classIds.length === 0) return null;
		return { academicYear: academicYearMatch, classId: { $in: classIds } };
	}

	if (currentUser?.role === 'teacher') {
		const classIds = getTeacherClassIdsForYear(currentUser, academicYear);
		if (classIds.length === 0) return null;
		return {
			academicYear: academicYearMatch,
			classId: { $in: classIds },
		};
	}

	if (currentUser?.role === 'system_admin') {
		return { academicYear: academicYearMatch };
	}

	return null;
};

const getRoleUsersQuery = (currentUser: any, academicYear: string) => {
	const academicYearMatch = getAcademicYearMatch(academicYear);
	if (currentUser.role === 'student') {
		const classId = getStudentClassIdForYear(currentUser, academicYear);
		if (!classId) return null;
		return {
			$or: [
				{
					role: 'student',
					academicYears: { $elemMatch: { year: academicYearMatch, classId } },
				},
				{
					role: 'teacher',
					subjects: {
						$elemMatch: { year: academicYearMatch, 'classes.classId': classId },
					},
				},
				{ role: 'administrator', 'academicYears.year': academicYearMatch },
			],
		};
	}

	if (currentUser.role === 'parent') {
		const studentIds = getParentChildStudentIds(currentUser);
		if (studentIds.length === 0) return null;
		return {
			role: 'student',
			$or: [
				{ studentId: { $in: studentIds } },
				{ username: { $in: studentIds } },
			],
		};
	}

	if (currentUser.role === 'teacher') {
		const classIds = getTeacherClassIdsForYear(currentUser, academicYear);
		if (classIds.length === 0) return null;
		return {
			$or: [
				{
					role: 'student',
					academicYears: {
						$elemMatch: {
							year: academicYearMatch,
							classId: { $in: classIds },
						},
					},
				},
				{ role: 'teacher', 'subjects.year': academicYearMatch },
				{ role: 'administrator', 'academicYears.year': academicYearMatch },
			],
		};
	}

	if (
		currentUser.role === 'administrator' ||
		currentUser.role === 'system_admin'
	) {
		return {
			$or: [
				{ role: 'student', 'academicYears.year': academicYearMatch },
				{ role: 'teacher', 'subjects.year': academicYearMatch },
				{ role: 'administrator', 'academicYears.year': academicYearMatch },
				{ role: 'parent' },
			],
		};
	}

	return null;
};

const groupUsersByRole = (users: any[]) => ({
	students: users.filter((u) => u.role === 'student'),
	teachers: users.filter((u) => u.role === 'teacher'),
	administrators: users.filter((u) => u.role === 'administrator'),
	parents: users.filter((u) => u.role === 'parent'),
});

const getDocTimestamp = (doc: any) => {
	if (!doc) return 0;
	const candidates = [
		doc.updatedAt,
		doc.lastUpdated,
		doc.submittedAt,
		doc.timestamp,
		doc.createdAt,
	];
	for (const value of candidates) {
		if (!value) continue;
		const parsed = new Date(value).getTime();
		if (Number.isFinite(parsed) && parsed > 0) return parsed;
	}
	return 0;
};

const getLatestDocToken = (doc: any) => {
	if (!doc) return '0';
	const updatedAtValue = getDocTimestamp(doc);
	const idValue = doc?._id?.toString?.() || '';
	return `${updatedAtValue}:${idValue}`;
};

const getDocsStats = (docs: any[]) => {
	let latestTimestamp = 0;
	let latestId = '';
	for (const doc of docs) {
		const timestamp = getDocTimestamp(doc);
		const id = doc?._id?.toString?.() || doc?.id?.toString?.() || '';
		if (
			timestamp > latestTimestamp ||
			(timestamp === latestTimestamp && id > latestId)
		) {
			latestTimestamp = timestamp;
			latestId = id;
		}
	}
	return {
		count: docs.length,
		latestTimestamp,
		latestId,
	};
};

const getUsersVersionFromPayload = (users?: BootstrapUsers) => {
	if (!users) return '0:0';
	const allUsers = [
		...(Array.isArray(users.students) ? users.students : []),
		...(Array.isArray(users.teachers) ? users.teachers : []),
		...(Array.isArray(users.administrators) ? users.administrators : []),
		...(Array.isArray(users.parents) ? users.parents : []),
	];
	const { count, latestTimestamp, latestId } = getDocsStats(allUsers);
	return `${count}:${latestTimestamp}:${latestId}`;
};

export const getDomainVersionsFromBootstrapPayload = (payload: {
	users?: BootstrapUsers;
	usersVersion?: string;
	calendarEvents?: any[];
	schedules?: { classSchedules?: any[]; testSchedules?: any[] };
	grades?: any[];
	gradeRequests?: any[];
	attendance?: any[];
	teacherAttendance?: any[];
	payments?: any[];
}): DomainVersions => {
	const calendarEvents = Array.isArray(payload.calendarEvents)
		? payload.calendarEvents
		: [];
	const grades = Array.isArray(payload.grades) ? payload.grades : [];
	const gradeRequests = Array.isArray(payload.gradeRequests)
		? payload.gradeRequests
		: [];
	const classSchedules = Array.isArray(payload.schedules?.classSchedules)
		? payload.schedules?.classSchedules
		: [];
	const testSchedules = Array.isArray(payload.schedules?.testSchedules)
		? payload.schedules?.testSchedules
		: [];
	const attendance = Array.isArray(payload.attendance)
		? payload.attendance
		: [];
	const teacherAttendance = Array.isArray(payload.teacherAttendance)
		? payload.teacherAttendance
		: [];
	const payments = Array.isArray(payload.payments) ? payload.payments : [];

	const calendarStats = getDocsStats(calendarEvents);
	const gradesStats = getDocsStats(grades);
	const gradeRequestsStats = getDocsStats(gradeRequests);
	const classScheduleStats = getDocsStats(classSchedules);
	const testScheduleStats = getDocsStats(testSchedules);
	const attendanceStats = getDocsStats(attendance);
	const teacherAttendanceStats = getDocsStats(teacherAttendance);
	const paymentsStats = getDocsStats(payments);

	return {
		users:
			typeof payload.usersVersion === 'string'
				? payload.usersVersion
				: getUsersVersionFromPayload(payload.users),
		calendar: `${calendarStats.count}:${calendarStats.latestTimestamp}:${calendarStats.latestId}`,
		schedules: `c${classScheduleStats.count}:${classScheduleStats.latestTimestamp}:${classScheduleStats.latestId}|t${testScheduleStats.count}:${testScheduleStats.latestTimestamp}:${testScheduleStats.latestId}`,
		grades: `${gradesStats.count}:${gradesStats.latestTimestamp}:${gradesStats.latestId}`,
		gradeRequests: `${gradeRequestsStats.count}:${gradeRequestsStats.latestTimestamp}:${gradeRequestsStats.latestId}`,
		attendance: `${attendanceStats.count}:${attendanceStats.latestTimestamp}:${attendanceStats.latestId}`,
		teacherAttendance: `${teacherAttendanceStats.count}:${teacherAttendanceStats.latestTimestamp}:${teacherAttendanceStats.latestId}`,
		payments: `${paymentsStats.count}:${paymentsStats.latestTimestamp}:${paymentsStats.latestId}`,
	};
};

const fetchCalendarEvents = async (models: any, academicYear: string) => {
	const academicYearMatch = getAcademicYearMatch(academicYear);
	return models.SchoolEvent.find({
		eventType: 'academic_calendar',
		academicYear: academicYearMatch,
	})
		.sort({ startDate: 1 })
		.lean();
};

const fetchSchedules = async (
	models: any,
	currentUser: any,
	academicYear: string,
): Promise<{ classSchedules: any[]; testSchedules: any[] }> => {
	const classFilter = getRoleClassFilter(currentUser, academicYear);
	const academicYearMatch = getAcademicYearMatch(academicYear);
	const baseQuery = { academicYear: academicYearMatch, ...classFilter };

	const [classSchedules, testSchedules] = await Promise.all([
		models.SchoolEvent.find({
			...baseQuery,
			eventType: 'class_schedule',
		})
			.sort({ dayOfWeek: 1, startTime: 1 })
			.lean(),
		models.SchoolEvent.find({
			...baseQuery,
			eventType: 'test_schedule',
		})
			.sort({ dayOfWeek: 1, startTime: 1 })
			.lean(),
	]);

	return { classSchedules, testSchedules };
};

/**
 * Fetches attendance records scoped to the requesting user's role.
 * Sorted oldest-first so the client can append incrementally.
 */
const fetchAttendanceForRole = async (
	models: any,
	currentUser: any,
	academicYear: string,
): Promise<any[]> => {
	const { Attendance } = models;
	if (!Attendance) return [];

	const query = getRoleAttendanceQuery(currentUser, academicYear);
	if (!query) return [];

	return Attendance.find(query).sort({ date: 1, classId: 1 }).lean();
};

const fetchTeacherAttendanceForRole = async (
	models: any,
	currentUser: any,
	academicYear: string,
): Promise<any[]> => {
	const { TeacherAttendance } = models;
	if (!TeacherAttendance) return [];

	const query = getRoleTeacherAttendanceQuery(currentUser, academicYear);
	if (!query) return [];

	return TeacherAttendance.find(query).sort({ date: 1, teacherId: 1 }).lean();
};

// Features that grant an administrator access to school-wide payments.
// Mirrors the administrator branch of `hasFeatureAccess` in utils/componentsMap
// so the bootstrap payload is gated the same way the menu pages are.
const ADMIN_PAYMENT_FEATURES: string[] = ['financial_reports', 'record_payments'];

const adminCanViewAllPayments = (schoolProfile: any, currentUser: any): boolean => {
	if (currentUser?.role !== 'administrator') return false;
	const enabledFeatures = Array.isArray(
		schoolProfile?.featureConfig?.enabledFeatures,
	)
		? (schoolProfile.featureConfig.enabledFeatures as string[])
		: [];
	const adminPermissions = Array.isArray(currentUser?.permissions)
		? (currentUser.permissions as string[])
		: [];
	const hasFeature = (feature: string) => {
		if (!enabledFeatures.includes(feature)) return false;
		if (adminPermissions.includes(feature)) return true;
		if (currentUser?.isTeacher) {
			const teacherFeatures = Array.isArray(
				schoolProfile?.featureConfig?.roleFeatureAccess?.teacher,
			)
				? (schoolProfile.featureConfig.roleFeatureAccess.teacher as string[])
				: [];
			if (teacherFeatures.includes(feature)) return true;
		}
		return false;
	};
	return ADMIN_PAYMENT_FEATURES.some(hasFeature);
};

const getRolePaymentsQuery = (
	currentUser: any,
	adminCanViewPayments = false,
) => {
	if (currentUser?.role === 'student') {
		const studentId = currentUser.studentId || currentUser.username;
		if (!studentId) return null;
		return { studentId };
	}
	if (currentUser?.role === 'parent') {
		const studentIds = getParentChildStudentIds(currentUser);
		if (studentIds.length === 0) return null;
		return { studentId: { $in: studentIds } };
	}
	if (currentUser?.role === 'administrator') {
		return adminCanViewPayments ? {} : null;
	}
	return null;
};

const mapPaymentDocument = (p: any) => ({
	id: p?._id?.toString?.() || p?.id,
	receiptNumber: p.receiptNumber,
	studentId: p.studentId,
	classId: p.classId,
	paidBy: p.paidBy,
	feeType: p.feeType,
	category: p.category,
	installmentId: p.installmentId || undefined,
	paymentAmount: p.paymentAmount,
	currency: p.currency || 'LRD',
	paymentAcademicYear: p.paymentAcademicYear,
	paymentDate: p.paymentDate,
	paymentTime: p.paymentTime,
	paymentMethod: p.paymentMethod,
});

const fetchPaymentsForStudent = async (
	models: any,
	currentUser: any,
	schoolProfile?: any,
): Promise<any[]> => {
	const query = getRolePaymentsQuery(
		currentUser,
		adminCanViewAllPayments(schoolProfile, currentUser),
	);
	if (!query) return [];
	const { Payment } = models;
	if (!Payment) return [];
	const docs = await Payment.find(query).sort({ createdAt: -1 }).lean();
	return docs.map(mapPaymentDocument);
};

const BOOTSTRAP_GRADE_LIMIT = 10_000;
const ADMIN_BOOTSTRAP_GRADE_LIMIT = 10_000;

export type GradesCursor = {
	lastUpdated: string | null;
	_id: string;
	totalCount: number;
	fetchedCount: number;
	chunkSize: number;
};

const fetchGradesBootstrap = async (
	models: any,
	currentUser: any,
	academicYear: string,
): Promise<{ grades: any[]; gradesCursor: string | null }> => {
	const { Grade } = models;
	if (!Grade) return { grades: [], gradesCursor: null };

	const query = getRoleGradesQuery(currentUser, academicYear);
	if (!query) return { grades: [], gradesCursor: null };

	const isAdmin = currentUser?.role === 'system_admin';
	const limit = isAdmin ? ADMIN_BOOTSTRAP_GRADE_LIMIT : BOOTSTRAP_GRADE_LIMIT;

	const [rawGrades, totalCount] = await Promise.all([
		Grade.find(query).sort({ lastUpdated: 1, _id: 1 }).limit(limit).lean(),
		Grade.countDocuments(query),
	]);

	let grades = rawGrades;

	if (
		(currentUser?.role === 'student' || currentUser?.role === 'parent') &&
		rawGrades.length > 0
	) {
		try {
			const { attachRanksToGrades } = await import('@/utils/gradeRanks');
			const studentClassIds = Array.from(
				new Set(
					rawGrades
						.map((g: any) => String(g?.classId || '').trim())
						.filter(Boolean),
				),
			);
			if (studentClassIds.length > 0) {
				const academicYearMatch = getAcademicYearMatch(academicYear);
				const classGrades = await Grade.find({
					academicYear: academicYearMatch,
					classId: { $in: studentClassIds },
				}).lean();
				grades = attachRanksToGrades(rawGrades, classGrades);
			}
		} catch {
			grades = rawGrades;
		}
	}

	let gradesCursor: string | null = null;
	if (rawGrades.length === limit && totalCount > limit) {
		const last = rawGrades[rawGrades.length - 1];
		const cursor: GradesCursor = {
			lastUpdated: last.lastUpdated ?? null,
			_id: last._id.toString(),
			totalCount,
			fetchedCount: limit,
			chunkSize: isAdmin ? ADMIN_BOOTSTRAP_GRADE_LIMIT : BOOTSTRAP_GRADE_LIMIT,
		};
		gradesCursor = JSON.stringify(cursor);
	}

	return { grades, gradesCursor };
};

const fetchGradeRequestsForRole = async (
	models: any,
	currentUser: any,
	academicYear: string,
) => {
	const GradeChangeRequest = models.GradeChangeRequest;
	if (!GradeChangeRequest) return [];
	const query = getRoleGradeRequestsQuery(currentUser, academicYear);
	if (!query) return [];
	return GradeChangeRequest.find(query)
		.sort({ submittedAt: -1, _id: -1 })
		.lean();
};

const fetchUsersForRole = async (
	models: any,
	currentUser: any,
	academicYear: string,
) => {
	const academicYearMatch = getAcademicYearMatch(academicYear);
	if (currentUser.role === 'student') {
		const classId = getStudentClassIdForYear(currentUser, academicYear);
		if (!classId) {
			return { students: [], teachers: [], administrators: [], parents: [] };
		}
		const [students, teachers, administrators] = await Promise.all([
			models.Student.find({
				academicYears: { $elemMatch: { year: academicYearMatch, classId } },
			})
				.select(USER_BOOTSTRAP_SELECT)
				.lean(),
			models.Teacher.find({
				subjects: {
					$elemMatch: { year: academicYearMatch, 'classes.classId': classId },
				},
			})
				.select(USER_BOOTSTRAP_SELECT)
				.lean(),
			models.Administrator.find({ 'academicYears.year': academicYearMatch })
				.select(USER_BOOTSTRAP_SELECT)
				.lean(),
		]);

		return {
			students: students.map(normalizeUser),
			teachers: teachers.map(normalizeUser),
			administrators: administrators.map(normalizeUser),
			parents: [],
		};
	}

	if (currentUser.role === 'parent') {
		const studentIds = getParentChildStudentIds(currentUser);
		if (studentIds.length === 0) {
			return { students: [], teachers: [], administrators: [], parents: [] };
		}
		const students = await models.Student.find({
			$or: [
				{ studentId: { $in: studentIds } },
				{ username: { $in: studentIds } },
			],
		})
			.select(USER_BOOTSTRAP_SELECT)
			.lean();

		return {
			students: students.map(normalizeUser),
			teachers: [],
			administrators: [],
			parents: [],
		};
	}

	if (currentUser.role === 'teacher') {
		const classIds = getTeacherClassIdsForYear(currentUser, academicYear);
		if (classIds.length === 0) {
			return { students: [], teachers: [], administrators: [], parents: [] };
		}
		const studentQuery = {
			academicYears: {
				$elemMatch: { year: academicYearMatch, classId: { $in: classIds } },
			},
		};
		const [students, teachers, administrators] = await Promise.all([
			models.Student.find(studentQuery).select(USER_BOOTSTRAP_SELECT).lean(),
			models.Teacher.find({ 'subjects.year': academicYearMatch })
				.select(USER_BOOTSTRAP_SELECT)
				.lean(),
			models.Administrator.find({ 'academicYears.year': academicYearMatch })
				.select(USER_BOOTSTRAP_SELECT)
				.lean(),
		]);

		return {
			students: students.map(normalizeUser),
			teachers: teachers.map(normalizeUser),
			administrators: administrators.map(normalizeUser),
			parents: [],
		};
	}

	if (
		currentUser.role === 'administrator' ||
		currentUser.role === 'system_admin'
	) {
		const usersQuery = getRoleUsersQuery(currentUser, academicYear);
		if (!usersQuery) {
			return { students: [], teachers: [], administrators: [], parents: [] };
		}
		const users = await models.User.find(usersQuery)
			.select(USER_BOOTSTRAP_SELECT)
			.sort({ _id: 1 })
			.limit(MAX_BOOTSTRAP_USERS)
			.lean();

		const normalized = users.map(normalizeUser);
		return groupUsersByRole(normalized);
	}

	return { students: [], teachers: [], administrators: [], parents: [] };
};

export const getDomainVersions = async (
	currentUser: any,
	academicYear: string,
	usersVersion?: string,
	schoolProfile?: any,
): Promise<DomainVersions> => {
	const models = await getTenantModels();
	const academicYearMatch = getAcademicYearMatch(academicYear);
	const User = models.User;
	const Grade = models.Grade;
	const GradeChangeRequest = models.GradeChangeRequest;
	const Attendance = models.Attendance;
	const TeacherAttendance = models.TeacherAttendance;
	const Payment = models.Payment;
	const usersQuery = getRoleUsersQuery(currentUser, academicYear);
	const classFilter = getRoleClassFilter(currentUser, academicYear);
	const gradesQuery = getRoleGradesQuery(currentUser, academicYear);
	const gradeRequestsQuery = getRoleGradeRequestsQuery(
		currentUser,
		academicYear,
	);
	const attendanceQuery = getRoleAttendanceQuery(currentUser, academicYear);
	const teacherAttendanceQuery = getRoleTeacherAttendanceQuery(
		currentUser,
		academicYear,
	);
	const canQueryUsers = Boolean(User && usersQuery);
	const canQueryGrades = Boolean(Grade && gradesQuery);
	const canQueryGradeRequests = Boolean(
		GradeChangeRequest && gradeRequestsQuery,
	);
	const canQueryAttendance = Boolean(Attendance && attendanceQuery);
	const canQueryTeacherAttendance = Boolean(
		TeacherAttendance && teacherAttendanceQuery,
	);
	const paymentsQuery = getRolePaymentsQuery(
		currentUser,
		adminCanViewAllPayments(schoolProfile, currentUser),
	);
	const canQueryPayments = Boolean(Payment && paymentsQuery);

	const [
		usersSyncVersion,
		usersCount,
		usersLatest,
		calendarCount,
		calendarLatest,
		classScheduleCount,
		classScheduleLatest,
		testScheduleCount,
		testScheduleLatest,
		gradesCount,
		gradesLatest,
		gradeRequestsCount,
		gradeRequestsLatest,
		attendanceCount,
		attendanceLatest,
		teacherAttendanceCount,
		teacherAttendanceLatest,
		paymentsCount,
		paymentsLatest,
	] = await Promise.all([
		getUsersSyncVersion(academicYear).catch(() => 0),
		canQueryUsers ? User.countDocuments(usersQuery) : 0,
		canQueryUsers
			? User.findOne(usersQuery)
					.sort({ updatedAt: -1, _id: -1 })
					.select({ _id: 1, updatedAt: 1 })
					.lean()
			: null,
		models.SchoolEvent.countDocuments({
			eventType: 'academic_calendar',
			academicYear: academicYearMatch,
		}),
		models.SchoolEvent.findOne({
			eventType: 'academic_calendar',
			academicYear: academicYearMatch,
		})
			.sort({ updatedAt: -1, _id: -1 })
			.select({ _id: 1, updatedAt: 1 })
			.lean(),
		models.SchoolEvent.countDocuments({
			eventType: 'class_schedule',
			academicYear: academicYearMatch,
			...classFilter,
		}),
		models.SchoolEvent.findOne({
			eventType: 'class_schedule',
			academicYear: academicYearMatch,
			...classFilter,
		})
			.sort({ updatedAt: -1, _id: -1 })
			.select({ _id: 1, updatedAt: 1 })
			.lean(),
		models.SchoolEvent.countDocuments({
			eventType: 'test_schedule',
			academicYear: academicYearMatch,
			...classFilter,
		}),
		models.SchoolEvent.findOne({
			eventType: 'test_schedule',
			academicYear: academicYearMatch,
			...classFilter,
		})
			.sort({ updatedAt: -1, _id: -1 })
			.select({ _id: 1, updatedAt: 1 })
			.lean(),
		canQueryGrades ? Grade.countDocuments(gradesQuery) : 0,
		canQueryGrades
			? Grade.findOne(gradesQuery)
					.sort({ lastUpdated: -1, _id: -1 })
					.select({ _id: 1, lastUpdated: 1, updatedAt: 1 })
					.lean()
			: null,
		canQueryGradeRequests
			? GradeChangeRequest.countDocuments(gradeRequestsQuery)
			: 0,
		canQueryGradeRequests
			? GradeChangeRequest.findOne(gradeRequestsQuery)
					.sort({ lastUpdated: -1, submittedAt: -1, _id: -1 })
					.select({ _id: 1, lastUpdated: 1, submittedAt: 1, updatedAt: 1 })
					.lean()
			: null,
		canQueryAttendance ? Attendance.countDocuments(attendanceQuery) : 0,
		canQueryAttendance
			? Attendance.findOne(attendanceQuery)
					.sort({ date: -1, _id: -1 })
					.select({ _id: 1, date: 1, updatedAt: 1 })
					.lean()
			: null,
		canQueryTeacherAttendance
			? TeacherAttendance.countDocuments(teacherAttendanceQuery)
			: 0,
		canQueryTeacherAttendance
			? TeacherAttendance.findOne(teacherAttendanceQuery)
					.sort({ date: -1, _id: -1 })
					.select({ _id: 1, date: 1, updatedAt: 1 })
					.lean()
			: null,
		canQueryPayments ? Payment.countDocuments(paymentsQuery) : 0,
		canQueryPayments
			? Payment.findOne(paymentsQuery)
					.sort({ createdAt: -1, _id: -1 })
					.select({ _id: 1, createdAt: 1, updatedAt: 1 })
					.lean()
			: null,
	]);

	const calendar = `${calendarCount}:${getLatestDocToken(calendarLatest)}`;
	const schedules = `c${classScheduleCount}:${getLatestDocToken(classScheduleLatest)}|t${testScheduleCount}:${getLatestDocToken(testScheduleLatest)}`;
	const grades = `${gradesCount}:${getLatestDocToken(gradesLatest)}`;
	const gradeRequests = `${gradeRequestsCount}:${getLatestDocToken(gradeRequestsLatest)}`;
	const attendance = `${attendanceCount}:${getLatestDocToken(attendanceLatest)}`;
	const teacherAttendanceVersion = `${teacherAttendanceCount}:${getLatestDocToken(teacherAttendanceLatest)}`;
	const paymentsVersion = `${paymentsCount}:${getLatestDocToken(paymentsLatest)}`;
	const computedUsersVersion = `sync:${Number.isFinite(usersSyncVersion) ? usersSyncVersion : 0}|${usersCount}:${getLatestDocToken(usersLatest)}`;

	return {
		users:
			typeof usersVersion === 'string' ? usersVersion : computedUsersVersion,
		calendar,
		schedules,
		grades,
		gradeRequests,
		attendance,
		teacherAttendance: teacherAttendanceVersion,
		payments: paymentsVersion,
	};
};

export const buildBootstrapPayload = async (
	currentUser: any,
	options: {
		include?: {
			school?: boolean;
			users?: boolean;
			calendar?: boolean;
			schedules?: boolean;
			grades?: boolean;
			gradeRequests?: boolean;
			attendance?: boolean;
			teacherAttendance?: boolean;
			payments?: boolean;
		};
		academicYear?: string;
		usersVersion?: string;
		schoolProfile?: any;
	} = {},
) => {
	const schoolProfileRaw = options.schoolProfile ?? (await getSchoolProfile());
	const schoolProfile =
		typeof schoolProfileRaw === 'string'
			? JSON.parse(schoolProfileRaw)
			: schoolProfileRaw;
	const yearAccess = resolveAcademicYearAccessContext({
		user: currentUser,
		schoolProfile,
		requestedAcademicYear: options.academicYear,
	});
	if (yearAccess.requestedAcademicYear && !yearAccess.hasAccess) {
		throw new Error('Requested academic year is not accessible for this user.');
	}
	const academicYear =
		yearAccess.academicYear || getAcademicYear(schoolProfile);
	const include = {
		school: options.include?.school !== false,
		users: options.include?.users !== false,
		calendar: options.include?.calendar !== false,
		schedules: options.include?.schedules !== false,
		grades: options.include?.grades !== false,
		gradeRequests: options.include?.gradeRequests !== false,
		attendance: options.include?.attendance !== false,
		teacherAttendance: options.include?.teacherAttendance !== false,
		payments: options.include?.payments !== false,
	};
	const models = await getTenantModels();

	const [
		users,
		calendarEvents,
		schedules,
		gradesResult,
		gradeRequests,
		attendance,
		teacherAttendance,
		payments,
	] = await Promise.all([
		include.users
			? fetchUsersForRole(models, currentUser, academicYear)
			: Promise.resolve(undefined),
		include.calendar
			? fetchCalendarEvents(models, academicYear)
			: Promise.resolve(undefined),
		include.schedules
			? fetchSchedules(models, currentUser, academicYear)
			: Promise.resolve(undefined),
		include.grades
			? fetchGradesBootstrap(models, currentUser, academicYear)
			: Promise.resolve(undefined),
		include.gradeRequests
			? fetchGradeRequestsForRole(models, currentUser, academicYear)
			: Promise.resolve(undefined),
		include.attendance
			? fetchAttendanceForRole(models, currentUser, academicYear)
			: Promise.resolve(undefined),
		include.teacherAttendance
			? fetchTeacherAttendanceForRole(models, currentUser, academicYear)
			: Promise.resolve(undefined),
		include.payments
			? fetchPaymentsForStudent(models, currentUser, schoolProfile)
			: Promise.resolve(undefined),
	]);

	const resolvedUsersVersion =
		typeof options.usersVersion === 'string'
			? options.usersVersion
			: getUsersVersionFromPayload(users as BootstrapUsers);

	const grades = gradesResult?.grades;
	const gradesCursor = gradesResult?.gradesCursor ?? null;

	return {
		academicYear,
		defaultAcademicYear: yearAccess.defaultAcademicYear,
		allowedAcademicYears: yearAccess.allowedAcademicYears,
		...(include.school ? { school: schoolProfile } : {}),
		...(include.users ? { users, usersVersion: resolvedUsersVersion } : {}),
		...(include.calendar ? { calendarEvents } : {}),
		...(include.schedules ? { schedules } : {}),
		...(include.grades ? { grades, gradesCursor } : {}),
		...(include.gradeRequests ? { gradeRequests } : {}),
		...(include.attendance ? { attendance } : {}),
		...(include.teacherAttendance ? { teacherAttendance } : {}),
		...(include.payments && payments ? { payments } : {}),
	};
};

/**
 * Gets user counts for a specific tenant database.
 */
const getTenantUserCounts = async (dbName: string) => {
	try {
		const connection = await getTenantConnectionByDbName(dbName);
		if (!connection) {
			return { students: 0, teachers: 0, administrators: 0, systemAdmins: 0 };
		}

		let User = connection.models.User;
		if (!User) {
			User = connection.model('User', UserSchema);
		}

		const [students, teachers, administrators, systemAdmins] = await Promise.all([
			User.countDocuments({ role: 'student', isActive: true }).catch(() => 0),
			User.countDocuments({ role: 'teacher', isActive: true }).catch(() => 0),
			User.countDocuments({ role: 'administrator', isActive: true }).catch(() => 0),
			User.countDocuments({ role: 'system_admin', isActive: true }).catch(() => 0),
		]);

		return { students, teachers, administrators, systemAdmins };
	} catch {
		return { students: 0, teachers: 0, administrators: 0, systemAdmins: 0 };
	}
};

const getTenantSystemAdmins = async (dbName: string) => {
	try {
		const connection = await getTenantConnectionByDbName(dbName);
		if (!connection) return [];

		let User = connection.models.User;
		if (!User) {
			User = connection.model('User', UserSchema);
		}

		const admins = await User.find({ role: 'system_admin' })
			.select('firstName middleName lastName fullName username phone email isActive createdAt')
			.sort({ createdAt: -1 })
			.lean()
			.exec();

		return admins || [];
	} catch {
		return [];
	}
};

const flattenSchoolSummary = (school: any): any => {
	if (!school || typeof school !== 'object') return school;
	const flat: any = { ...school };
	if (school.system) {
		flat.host = school.system.host;
		flat.dbName = school.system.dbName;
		flat.isActive = school.system.isActive;
	}
	if (school.identity) {
		flat.name = school.identity.name;
		flat.shortName = school.identity.shortName;
		flat.initials = school.identity.initials;
		flat.slogan = school.identity.slogan;
		flat.studentIdPrefix = school.identity.studentIdPrefix;
		flat.yearFounded = school.identity.yearFounded;
		flat.firstAcademicYear = school.identity.firstAcademicYear;
		flat.currentAcademicYear = school.identity.currentAcademicYear;
	}
	if (school.branding) {
		flat.logoUrl = school.branding.logoUrl;
		flat.logoUrl2 = school.branding.logoUrl2;
		flat.themeName = school.branding.themeName;
		flat.reportCardThemes = school.branding.reportCardThemes;
	}
	if (school.contact) {
		flat.address = (school.contact.addresses || []).flatMap((a: any) => a.lines || []);
		flat.phones = school.contact.phones || [];
		flat.emails = school.contact.emails || [];
		flat.website = school.contact.website;
	}
	if (school.userConfig || school.academicConfig) {
		flat.settings = {
			studentSettings: school.userConfig?.studentSettings,
			teacherSettings: school.userConfig?.teacherSettings,
			administratorSettings: school.userConfig?.administratorSettings,
			gradingSettings: school.academicConfig?.gradingSettings,
		};
		flat.administrativePositions = school.userConfig?.administrativePositions || [];
		flat.sysAdmin = school.userConfig?.sysAdmin;
	}
	if (school.academicConfig) {
		flat.classLevels = school.academicConfig.classLevels || {};
	}
	if (school.featureConfig) {
		flat.enabledFeatures = school.featureConfig.enabledFeatures || [];
		flat.roleFeatureAccess = school.featureConfig.roleFeatureAccess;
	}
	if (school.financialConfig) {
		flat.feeSchedules = school.financialConfig.feeSchedules || [];
	}
	return flat;
};

/**
 * Builds the bootstrap payload for superadmin users.
 * Includes platform-wide stats: schools, users by role, per-school stats.
 */
export const buildSuperAdminBootstrapPayload = async (
	currentUser: any,
) => {
	const { SchoolProfile } = await getSchoolMeshModels();

	const schools = await SchoolProfile.find({})
		.select('system.host system.dbName identity.name identity.shortName identity.initials identity.slogan identity.studentIdPrefix identity.yearFounded identity.firstAcademicYear identity.currentAcademicYear system.isActive branding.themeName branding.logoUrl branding.logoUrl2 branding.reportCardThemes contact.addresses contact.phones contact.emails contact.website userConfig.administrativePositions userConfig.sysAdmin userConfig.studentSettings userConfig.teacherSettings userConfig.administratorSettings academicConfig.gradingSettings academicConfig.classLevels featureConfig.enabledFeatures featureConfig.roleFeatureAccess financialConfig.feeSchedules updatedAt')
		.lean()
		.exec();

	const flatSchools = schools.map(flattenSchoolSummary);
	const activeSchools = flatSchools.filter((s: any) => s.isActive);
	const inactiveSchools = flatSchools.filter((s: any) => !s.isActive);

	// Get user counts and system admins for each school
	const dbNames = [...new Set(flatSchools.map((s: any) => s.dbName).filter(Boolean))] as string[];
	const [countsEntries, systemAdminsEntries] = await Promise.all([
		Promise.all(
			dbNames.map(async (dbName) => [dbName, await getTenantUserCounts(dbName)] as const),
		),
		Promise.all(
			dbNames.map(async (dbName) => [dbName, await getTenantSystemAdmins(dbName)] as const),
		),
	]);
	const countsByDbName = new Map(countsEntries);
	const systemAdminsByDbName = new Map(systemAdminsEntries);

	let totalStudents = 0;
	let totalTeachers = 0;
	let totalAdministrators = 0;
	let totalSystemAdmins = 0;

	const perSchoolStats = flatSchools.map((school: any) => {
		const schoolCounts = countsByDbName.get(school.dbName) || { students: 0, teachers: 0, administrators: 0, systemAdmins: 0 };
		const schoolSystemAdmins = systemAdminsByDbName.get(school.dbName) || [];
		const totalUsersForSchool = schoolCounts.students + schoolCounts.teachers + schoolCounts.administrators + schoolCounts.systemAdmins;
		totalStudents += schoolCounts.students;
		totalTeachers += schoolCounts.teachers;
		totalAdministrators += schoolCounts.administrators;
		totalSystemAdmins += schoolCounts.systemAdmins;

		return {
			...school,
			stats: {
				...schoolCounts,
				total:
					schoolCounts.students +
					schoolCounts.teachers +
					schoolCounts.administrators +
					schoolCounts.systemAdmins,
			},
			users: schoolCounts,
			totalUsers: totalUsersForSchool,
			systemAdmins: schoolSystemAdmins,
		};
	});

	const totalUsers = totalStudents + totalTeachers + totalAdministrators + totalSystemAdmins;

	return {
		stats: {
			schools: {
				total: schools.length,
				active: activeSchools.length,
				inactive: inactiveSchools.length,
			},
			users: {
				total: totalUsers,
				students: totalStudents,
				teachers: totalTeachers,
				administrators: totalAdministrators,
				systemAdmins: totalSystemAdmins,
			},
			perSchool: perSchoolStats,
		},
		schools: perSchoolStats,
		versions: {
			user: toHash(currentUser),
		},
	};
};
