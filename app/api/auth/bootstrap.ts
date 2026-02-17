import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import type { UserRole } from '@/types';
import { attachRanksToGrades } from '@/utils/gradeRanks';

const MAX_BOOTSTRAP_USERS = 5000;

type DomainVersions = {
	users: string;
	calendar: string;
	schedules: string;
	grades: string;
	gradeRequests: string;
};

type BootstrapUsers = {
	students: any[];
	teachers: any[];
	administrators: any[];
};

const USER_BOOTSTRAP_SELECT = {
	_id: 1,
	username: 1,
	role: 1,
	firstName: 1,
	middleName: 1,
	lastName: 1,
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
	enrollmentYear: 1,
	enrollmentSemester: 1,
	enrollmentStatus: 1,
	classId: 1,
	className: 1,
	shareContactWithClassmates: 1,
	academicYears: 1,
	guardian: 1,
	financialProfile: 1,
	subjects: 1,
	sponsorClass: 1,
	position: 1,
} as const;

export const getAcademicYear = (schoolProfile: any) => {
	const now = new Date();
	if (schoolProfile?.currentAcademicYear) {
		return schoolProfile.currentAcademicYear;
	}
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();
	return currentMonth >= 7
		? `${currentYear}-${currentYear + 1}`
		: `${currentYear - 1}-${currentYear}`;
};

const normalizeUser = (user: any) => {
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
				enrollmentYear: user.enrollmentYear,
				enrollmentSemester: user.enrollmentSemester,
				enrollmentStatus: user.enrollmentStatus,
				classId: user.classId,
				className: user.className,
				shareContactWithClassmates: user.shareContactWithClassmates ?? false,
				academicYears: user.academicYears || [],
				guardian: user.guardian,
				financialProfile: user.financialProfile,
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
				academicYears: user.academicYears || [],
			};
		case 'system_admin':
			return { ...baseUser, username: user.username };
		default:
			return baseUser;
	}
};

const getStudentClassIdForYear = (student: any, academicYear: string) => {
	const yearEntry = Array.isArray(student?.academicYears)
		? student.academicYears.find((ay: any) => ay.year === academicYear)
		: null;
	return yearEntry?.classId || student?.classId || '';
};

const getTeacherClassIdsForYear = (teacher: any, academicYear: string) => {
	if (!Array.isArray(teacher?.subjects)) return [];
	const yearData = teacher.subjects.find((s: any) => s.year === academicYear);
	if (!yearData?.classes) return [];
	return yearData.classes.map((c: any) => c.classId).filter(Boolean);
};

const getRoleClassFilter = (currentUser: any, academicYear: string) => {
	if (currentUser.role === 'student') {
		const classId = getStudentClassIdForYear(currentUser, academicYear);
		return classId ? { classId } : {};
	}
	if (currentUser.role === 'teacher') {
		const classIds = getTeacherClassIdsForYear(currentUser, academicYear);
		return classIds.length ? { classId: { $in: classIds } } : {};
	}
	return {};
};

const getRoleGradesQuery = (currentUser: any, academicYear: string) => {
	if (currentUser?.role === 'student') {
		const studentId = currentUser.studentId || currentUser.username;
		if (!studentId) return null;
		return { academicYear, studentId };
	}

	if (currentUser?.role === 'teacher') {
		const classIds = getTeacherClassIdsForYear(currentUser, academicYear);
		if (classIds.length === 0 || !currentUser.username) return null;
		return {
			academicYear,
			classId: { $in: classIds },
			teacherUsername: currentUser.username,
		};
	}

	if (currentUser?.role === 'system_admin') {
		return { academicYear };
	}

	return null;
};

const getRoleGradeRequestsQuery = (currentUser: any, academicYear: string) => {
	if (currentUser?.role === 'teacher') {
		if (!currentUser.username) return null;
		return { academicYear, teacherUsername: currentUser.username };
	}
	if (currentUser?.role === 'system_admin') {
		return { academicYear };
	}
	return null;
};

const getRoleUsersQuery = (currentUser: any, academicYear: string) => {
	if (currentUser.role === 'student') {
		const classId = getStudentClassIdForYear(currentUser, academicYear);
		if (!classId) return null;
		return {
			$or: [
				{ role: 'student', academicYears: { $elemMatch: { year: academicYear, classId } } },
				{
					role: 'teacher',
					subjects: {
						$elemMatch: { year: academicYear, 'classes.classId': classId },
					},
				},
				{ role: 'administrator', 'academicYears.year': academicYear },
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
						$elemMatch: { year: academicYear, classId: { $in: classIds } },
					},
				},
				{ role: 'teacher', 'subjects.year': academicYear },
				{ role: 'administrator', 'academicYears.year': academicYear },
			],
		};
	}

	if (currentUser.role === 'administrator' || currentUser.role === 'system_admin') {
		return {
			$or: [
				{ role: 'student', 'academicYears.year': academicYear },
				{ role: 'teacher', 'subjects.year': academicYear },
				{ role: 'administrator', 'academicYears.year': academicYear },
			],
		};
	}

	return null;
};

const groupUsersByRole = (users: any[]) => ({
	students: users.filter((u) => u.role === 'student'),
	teachers: users.filter((u) => u.role === 'teacher'),
	administrators: users.filter((u) => u.role === 'administrator'),
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

	const calendarStats = getDocsStats(calendarEvents);
	const gradesStats = getDocsStats(grades);
	const gradeRequestsStats = getDocsStats(gradeRequests);
	const classScheduleStats = getDocsStats(classSchedules);
	const testScheduleStats = getDocsStats(testSchedules);

	return {
		users:
			typeof payload.usersVersion === 'string'
				? payload.usersVersion
				: getUsersVersionFromPayload(payload.users),
		calendar: `${calendarStats.count}:${calendarStats.latestTimestamp}:${calendarStats.latestId}`,
		schedules: `c${classScheduleStats.count}:${classScheduleStats.latestTimestamp}:${classScheduleStats.latestId}|t${testScheduleStats.count}:${testScheduleStats.latestTimestamp}:${testScheduleStats.latestId}`,
		grades: `${gradesStats.count}:${gradesStats.latestTimestamp}:${gradesStats.latestId}`,
		gradeRequests: `${gradeRequestsStats.count}:${gradeRequestsStats.latestTimestamp}:${gradeRequestsStats.latestId}`,
	};
};

const fetchCalendarEvents = async (models: any, academicYear: string) => {
	return models.SchoolEvent.find({
		eventType: 'academic_calendar',
		academicYear,
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
	const baseQuery = { academicYear, ...classFilter };

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

const fetchGradesForRole = async (
	models: any,
	currentUser: any,
	academicYear: string,
) => {
	const { Grade } = models;
	if (!Grade) return [];

	const query = getRoleGradesQuery(currentUser, academicYear);
	if (!query) return [];
	const grades = await Grade.find(query).lean();

	if (currentUser?.role === 'teacher') {
		return grades;
	}

	if (currentUser?.role === 'student') {
		const classId = getStudentClassIdForYear(currentUser, academicYear);
		if (!classId) return grades;
		const classGrades = await Grade.find({ academicYear, classId }).lean();
		return attachRanksToGrades(grades, classGrades);
	}

	if (currentUser?.role === 'system_admin') {
		return attachRanksToGrades(grades, grades);
	}

	return grades;
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
	if (currentUser.role === 'student') {
		const classId = getStudentClassIdForYear(currentUser, academicYear);
		if (!classId) {
			return { students: [], teachers: [], administrators: [] };
		}
		const [students, teachers, administrators] = await Promise.all([
			models.Student.find({
				academicYears: { $elemMatch: { year: academicYear, classId } },
			})
				.select(USER_BOOTSTRAP_SELECT)
				.lean(),
			models.Teacher.find({
				subjects: {
					$elemMatch: { year: academicYear, 'classes.classId': classId },
				},
			})
				.select(USER_BOOTSTRAP_SELECT)
				.lean(),
			models.Administrator.find({ 'academicYears.year': academicYear })
				.select(USER_BOOTSTRAP_SELECT)
				.lean(),
		]);

		return {
			students: students.map(normalizeUser),
			teachers: teachers.map(normalizeUser),
			administrators: administrators.map(normalizeUser),
		};
	}

	if (currentUser.role === 'teacher') {
		const classIds = getTeacherClassIdsForYear(currentUser, academicYear);
		if (classIds.length === 0) {
			return { students: [], teachers: [], administrators: [] };
		}
		const studentQuery = {
			academicYears: {
				$elemMatch: { year: academicYear, classId: { $in: classIds } },
			},
		};
		const [students, teachers, administrators] = await Promise.all([
			models.Student.find(studentQuery).select(USER_BOOTSTRAP_SELECT).lean(),
			models.Teacher.find({ 'subjects.year': academicYear })
				.select(USER_BOOTSTRAP_SELECT)
				.lean(),
			models.Administrator.find({ 'academicYears.year': academicYear })
				.select(USER_BOOTSTRAP_SELECT)
				.lean(),
		]);

		return {
			students: students.map(normalizeUser),
			teachers: teachers.map(normalizeUser),
			administrators: administrators.map(normalizeUser),
		};
	}

	if (currentUser.role === 'administrator' || currentUser.role === 'system_admin') {
		const usersQuery = getRoleUsersQuery(currentUser, academicYear);
		if (!usersQuery) {
			return { students: [], teachers: [], administrators: [] };
		}
		const users = await models.User.find(usersQuery)
			.select(USER_BOOTSTRAP_SELECT)
			.sort({ _id: 1 })
			.limit(MAX_BOOTSTRAP_USERS)
			.lean();

		const normalized = users.map(normalizeUser);
		return groupUsersByRole(normalized);
	}

	return { students: [], teachers: [], administrators: [] };
};

export const getDomainVersions = async (
	currentUser: any,
	academicYear: string,
	usersVersion?: string,
): Promise<DomainVersions> => {
	const models = await getTenantModels();
	const User = models.User;
	const Grade = models.Grade;
	const GradeChangeRequest = models.GradeChangeRequest;
	const usersQuery = getRoleUsersQuery(currentUser, academicYear);
	const classFilter = getRoleClassFilter(currentUser, academicYear);
	const gradesQuery = getRoleGradesQuery(currentUser, academicYear);
	const gradeRequestsQuery = getRoleGradeRequestsQuery(currentUser, academicYear);
	const canQueryUsers = Boolean(User && usersQuery);
	const canQueryGrades = Boolean(Grade && gradesQuery);
	const canQueryGradeRequests = Boolean(GradeChangeRequest && gradeRequestsQuery);
	const [
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
	] = await Promise.all([
		canQueryUsers ? User.countDocuments(usersQuery) : 0,
		canQueryUsers
			? User.findOne(usersQuery)
					.sort({ updatedAt: -1, _id: -1 })
					.select({ _id: 1, updatedAt: 1 })
					.lean()
			: null,
		models.SchoolEvent.countDocuments({
			eventType: 'academic_calendar',
			academicYear,
		}),
		models.SchoolEvent.findOne({
			eventType: 'academic_calendar',
			academicYear,
		})
			.sort({ updatedAt: -1, _id: -1 })
			.select({ _id: 1, updatedAt: 1 })
			.lean(),
		models.SchoolEvent.countDocuments({
			eventType: 'class_schedule',
			academicYear,
			...classFilter,
		}),
		models.SchoolEvent.findOne({
			eventType: 'class_schedule',
			academicYear,
			...classFilter,
		})
			.sort({ updatedAt: -1, _id: -1 })
			.select({ _id: 1, updatedAt: 1 })
			.lean(),
		models.SchoolEvent.countDocuments({
			eventType: 'test_schedule',
			academicYear,
			...classFilter,
		}),
		models.SchoolEvent.findOne({
			eventType: 'test_schedule',
			academicYear,
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
	]);

	const calendar = `${calendarCount}:${getLatestDocToken(calendarLatest)}`;
	const schedules = `c${classScheduleCount}:${getLatestDocToken(classScheduleLatest)}|t${testScheduleCount}:${getLatestDocToken(testScheduleLatest)}`;
	const grades = `${gradesCount}:${getLatestDocToken(gradesLatest)}`;
	const gradeRequests = `${gradeRequestsCount}:${getLatestDocToken(gradeRequestsLatest)}`;
	const computedUsersVersion = `${usersCount}:${getLatestDocToken(usersLatest)}`;

	return {
		users:
			typeof usersVersion === 'string' ? usersVersion : computedUsersVersion,
		calendar,
		schedules,
		grades,
		gradeRequests,
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
	const academicYear = options.academicYear || getAcademicYear(schoolProfile);
	const include = {
		school: options.include?.school !== false,
		users: options.include?.users !== false,
		calendar: options.include?.calendar !== false,
		schedules: options.include?.schedules !== false,
		grades: options.include?.grades !== false,
		gradeRequests: options.include?.gradeRequests !== false,
	};
	const models = await getTenantModels();

	const [users, calendarEvents, schedules, grades, gradeRequests] =
		await Promise.all([
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
			? fetchGradesForRole(models, currentUser, academicYear)
			: Promise.resolve(undefined),
		include.gradeRequests
			? fetchGradeRequestsForRole(models, currentUser, academicYear)
			: Promise.resolve(undefined),
		]);
	const resolvedUsersVersion =
		typeof options.usersVersion === 'string'
			? options.usersVersion
			: getUsersVersionFromPayload(users as BootstrapUsers);

	return {
		academicYear,
		...(include.school ? { school: schoolProfile } : {}),
		...(include.users ? { users, usersVersion: resolvedUsersVersion } : {}),
		...(include.calendar ? { calendarEvents } : {}),
		...(include.schedules ? { schedules } : {}),
		...(include.grades ? { grades } : {}),
		...(include.gradeRequests ? { gradeRequests } : {}),
	};
};
