import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import type { UserRole } from '@/types';

const MAX_BOOTSTRAP_USERS = 2000;

const getAcademicYear = (schoolProfile: any) => {
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
		phone: user.phone,
		email: user.email,
		address: user.address,
		bio: user.bio,
		avatar: user.avatar,
		profilePictureUrl: user.profilePictureUrl,
		notifications: user.notifications || [],
		chats: user.chats || [],
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

const groupUsersByRole = (users: any[]) => ({
	students: users.filter((u) => u.role === 'student'),
	teachers: users.filter((u) => u.role === 'teacher'),
	administrators: users.filter((u) => u.role === 'administrator'),
});

const fetchCalendarEvents = async (academicYear: string) => {
	const models = await getTenantModels();
	return models.SchoolEvent.find({
		eventType: 'academic_calendar',
		academicYear,
	})
		.sort({ startDate: 1 })
		.lean();
};

const fetchSchedules = async (
	currentUser: any,
	academicYear: string,
): Promise<{ classSchedules: any[]; testSchedules: any[] }> => {
	const models = await getTenantModels();
	const baseQuery = { academicYear };

	const getClassFilter = () => {
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

	const classFilter = getClassFilter();

	const [classSchedules, testSchedules] = await Promise.all([
		models.SchoolEvent.find({
			...baseQuery,
			eventType: 'class_schedule',
			...classFilter,
		})
			.sort({ dayOfWeek: 1, startTime: 1 })
			.lean(),
		models.SchoolEvent.find({
			...baseQuery,
			eventType: 'test_schedule',
			...classFilter,
		})
			.sort({ dayOfWeek: 1, startTime: 1 })
			.lean(),
	]);

	return { classSchedules, testSchedules };
};

const fetchUsersForRole = async (currentUser: any, academicYear: string) => {
	const models = await getTenantModels();

	if (currentUser.role === 'student') {
		const classId = getStudentClassIdForYear(currentUser, academicYear);
		const [students, teachers, administrators] = await Promise.all([
			models.Student.find({
				academicYears: { $elemMatch: { year: academicYear, classId } },
			})
				.lean(),
			models.Teacher.find({ 'subjects.year': academicYear }).lean(),
			models.Administrator.find({ 'academicYears.year': academicYear }).lean(),
		]);

		return {
			students: students.map(normalizeUser),
			teachers: teachers.map(normalizeUser),
			administrators: administrators.map(normalizeUser),
		};
	}

	if (currentUser.role === 'teacher') {
		const classIds = getTeacherClassIdsForYear(currentUser, academicYear);
		const studentQuery = classIds.length
			? {
					academicYears: {
						$elemMatch: { year: academicYear, classId: { $in: classIds } },
					},
			  }
			: { academicYears: { $elemMatch: { year: academicYear } } };
		const [students, teachers, administrators] = await Promise.all([
			models.Student.find(studentQuery).lean(),
			models.Teacher.find({ 'subjects.year': academicYear }).lean(),
			models.Administrator.find({ 'academicYears.year': academicYear }).lean(),
		]);

		return {
			students: students.map(normalizeUser),
			teachers: teachers.map(normalizeUser),
			administrators: administrators.map(normalizeUser),
		};
	}

	if (currentUser.role === 'administrator' || currentUser.role === 'system_admin') {
		const users = await models.User.find({
			$or: [
				{ role: 'student', 'academicYears.year': academicYear },
				{ role: 'teacher', 'subjects.year': academicYear },
				{ role: 'administrator', 'academicYears.year': academicYear },
			],
		})
			.sort({ _id: 1 })
			.limit(MAX_BOOTSTRAP_USERS)
			.lean();

		const normalized = users.map(normalizeUser);
		return groupUsersByRole(normalized);
	}

	return { students: [], teachers: [], administrators: [] };
};

export const buildBootstrapPayload = async (currentUser: any) => {
	const schoolProfileRaw = await getSchoolProfile();
	const schoolProfile =
		typeof schoolProfileRaw === 'string'
			? JSON.parse(schoolProfileRaw)
			: schoolProfileRaw;
	const academicYear = getAcademicYear(schoolProfile);

	const [users, calendarEvents, schedules] = await Promise.all([
		fetchUsersForRole(currentUser, academicYear),
		fetchCalendarEvents(academicYear),
		fetchSchedules(currentUser, academicYear),
	]);

	return {
		academicYear,
		users,
		calendarEvents,
		schedules,
	};
};
