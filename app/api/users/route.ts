import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getTenantModels } from '@/models';
import { authorizeUser } from '@/proxy';
import { getSchoolProfile, getTenantConnectionByDbName } from '@/lib/mongoose';
import { normalizeHost } from '@/utils/host';
import { getSchoolMeshModels } from '@/models/schoolmesh';
import {
	buildParentChildrenList,
	scopedParentSessionFields,
} from '@/lib/parentAccess';
import UserSchema from '@/models/user/User';
import SystemAdminSchema from '@/models/user/SystemAdmin';
import UserSyncStateSchema from '@/models/user/UserSyncState';
import {
	updateAllUserSessions,
	destroyAllUserSessions,
	updateUserSessionNotifications,
	getAllUserSessions,
} from '@/utils/session';
import { bumpUsersVersion, extractAcademicYears } from '@/utils/userSync';
import {
	publishSyncEventSafe,
	publishSyncEventsForAcademicYearsSafe,
	resolveTenantSyncKey,
} from '@/lib/realtimeSync';
import type {
	UserRole,
	User,
	Student,
	Teacher,
	Administrator,
	SystemAdmin,
	Parent,
	AIChatMessage,
	Notification,
} from '@/types';

// --- Helper Functions ---

async function addNotificationToUser(
	UserModel: any,
	userId: string,
	notification: Notification,
	options: {
		tenantId?: string;
		actorId?: string | null;
		reason?: string;
	} = {},
) {
	const updatedUser = await UserModel.findByIdAndUpdate(
		userId,
		{ $push: { notifications: notification } },
		{ new: true, select: 'notifications' },
	);
	if (updatedUser) {
		await updateUserSessionNotifications(userId, updatedUser.notifications);
		await publishSyncEventSafe({
			tenantId: options.tenantId || '',
			domain: 'user',
			actorId: options.actorId || userId,
			reason: options.reason || 'user-notification',
			targetUserIds: [userId],
		});
	}
}

function validateEmail(email: string): boolean {
	return /\S+@\S+\.\S+/.test(email);
}

function validatePhone(phone: string): boolean {
	return /^\+?[\d\s\-\(\)]{10,}$/.test(phone);
}

const PROFILE_FIELD_LABELS: Record<string, string> = {
	firstName: 'first name',
	middleName: 'middle name',
	lastName: 'last name',
	nickName: 'nickname',
	email: 'email',
	phone: 'phone number',
	bio: 'bio',
	address: 'address',
	avatar: 'profile photo',
	shareContactWithClassmates: 'phone sharing preference',
	classId: 'class assignment',
	className: 'class name',
	position: 'position',
	sponsorClass: 'sponsor class',
	subjects: 'teaching assignments',
	studentIds: 'linked children',
	financialProfile: 'financial profile',
	enrollmentStatus: 'enrollment status',
	isActive: 'account status',
	academicYears: 'academic year assignments',
};

const PROFILE_NOTIFICATION_EXCLUDED_FIELDS = new Set([
	'oldPassword',
	'newPassword',
	'password',
	'defaultPassword',
	'mustChangePassword',
	'passwordChangedAt',
	'updatedBy',
	'updatedAt',
	'notifications',
]);

function getActorDisplayName(actor: any): string {
	const fallback = actor?.fullName || actor?.username;
	return typeof fallback === 'string' && fallback.trim()
		? fallback.trim()
		: 'an administrator';
}

function formatFieldList(fields: string[]): string {
	if (fields.length === 0) return 'profile';
	if (fields.length === 1) return fields[0];
	if (fields.length === 2) return `${fields[0]} and ${fields[1]}`;
	return `${fields.slice(0, -1).join(', ')}, and ${fields[fields.length - 1]}`;
}

function valuesDiffer(previousValue: any, nextValue: any): boolean {
	return (
		JSON.stringify(previousValue ?? null) !== JSON.stringify(nextValue ?? null)
	);
}

function getAcademicYear(): string {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();
	return currentMonth >= 7
		? `${currentYear}-${currentYear + 1}`
		: `${currentYear - 1}-${currentYear}`;
}

function buildUserResponse(
	user: any,
): User | Student | Teacher | Administrator | SystemAdmin | Parent {
	const baseUser: User = {
		id: user._id?.toString(),
		username: user.username,
		firstName: user.firstName,
		middleName: user.middleName,
		fullName: user.fullName,
		lastName: user.lastName,
		role: user.role as UserRole,
		password: user.password,
		nickName: user.nickName,
		gender: user.gender,
		dateOfBirth: user.dateOfBirth,
		address: user.address,
		phone: user.phone,
		email: user.email,
		bio: user.bio,
		avatar: user.avatar,
		defaultPassword: user.defaultPassword,
		isActive: user.isActive,
		mustChangePassword: user.mustChangePassword,
		passwordChangedAt: user.passwordChangedAt || null,
		chats: (user.chats || []) as AIChatMessage[],
		notifications: (user.notifications || []) as Notification[],
	};

	switch (user.role) {
		case 'student':
			return {
				...baseUser,
				role: 'student',
				studentId: user.studentId,
				enrollmentYear: user.enrollmentYear,
				enrollmentSemester: user.enrollmentSemester,
				enrollmentStatus: user.enrollmentStatus,
				classId: user.classId,
				className: user.className,
				shareContactWithClassmates: user.shareContactWithClassmates ?? false,
				canRecordAttendance: user.canRecordAttendance ?? false,
				academicYears: user.academicYears || [],
				studentType: user.studentType ?? 'old',
		} as Student;

		case 'teacher':
			return {
				...baseUser,
				role: 'teacher',
				subjects: user.subjects || [],
				sponsorClass: user.sponsorClass,
			} as Teacher;

		case 'administrator':
			return {
				...baseUser,
				role: 'administrator',
				position: user.position,
				permissions: user.permissions || [],
				canRecordStudentAttendance: user.canRecordStudentAttendance || false,
				canRecordTeacherAttendance: user.canRecordTeacherAttendance || false,
				isTeacher: user.isTeacher ?? false,
				classes: user.classes || [],
				academicYears: user.academicYears || [],
			} as Administrator;

		case 'system_admin':
			return {
				...baseUser,
				role: 'system_admin',
				username: user.username,
			} as SystemAdmin;

		case 'parent':
			return {
				...baseUser,
				role: 'parent',
				studentIds: user.studentIds || [],
			} as Parent;

		default:
			return baseUser;
	}
}

function buildRealtimeUserPayload(user: any) {
	const realtimeUser = buildUserResponse(user) as unknown as Record<
		string,
		unknown
	>;
	delete realtimeUser.password;
	delete realtimeUser.defaultPassword;
	delete realtimeUser.notifications;
	delete realtimeUser.chats;
	return realtimeUser;
}

/**
 * Attaches `linkedParent` to student rows and hydrates `parentChildren`
 * (matching lib/parentAccess.ts ParentChild) onto parent rows, in a single pass.
 */
async function hydrateParentRelationships(models: any, rows: any[] | any) {
	const parents = await models.Parent.find({})
		.select('_id firstName middleName lastName fullName email phone studentIds')
		.lean();
	const parentByStudentId = new Map<string, any>();
	parents.forEach((p: any) => {
		(p.studentIds || []).forEach((sid: string) => {
			parentByStudentId.set(String(sid), p);
		});
	});

	const list = Array.isArray(rows) ? rows : [rows];
	const parentRows = list.filter((u: any) => u?.role === 'parent');
	const allStudentIds = Array.from(
		new Set(
			parentRows.flatMap((p: any) =>
				Array.isArray(p.studentIds) ? p.studentIds : [],
			),
		),
	);
	const students =
		allStudentIds.length > 0
			? await models.User.find({
					role: 'student',
					$or: [
						{ studentId: { $in: allStudentIds } },
						{ username: { $in: allStudentIds } },
					],
				})
					.select(
						'studentId username firstName middleName lastName fullName classId className classLevel academicYears isActive',
					)
					.lean()
			: [];
	const studentByKey = new Map<string, any>();
	(students || []).forEach((s: any) => {
		const key = s.studentId || s.username;
		if (key) studentByKey.set(String(key), s);
	});

	const mapped = list.map((user: any) => {
		if (user?.role !== 'student') {
			if (user?.role === 'parent') {
				return {
					...user,
					parentChildren: (Array.isArray(user.studentIds)
						? user.studentIds
						: []
					)
						.map((sid: string) => {
							const s = studentByKey.get(String(sid));
							if (!s) return null;
							return {
								id: s._id.toString(),
								studentId: s.studentId || s.username,
								username: s.username,
								firstName: s.firstName,
								middleName: s.middleName,
								lastName: s.lastName,
								fullName: s.fullName,
								classId: s.classId,
								className: s.className,
								classLevel: s.classLevel,
								academicYears: Array.isArray(s.academicYears)
									? s.academicYears
									: [],
								isActive: s.isActive ?? true,
							};
						})
						.filter(Boolean),
				};
			}
			return user;
		}
		const parent = parentByStudentId.get(String(user.studentId || ''));
		return {
			...user,
			linkedParent: parent
				? {
						id: parent._id.toString(),
						firstName: parent.firstName,
						middleName: parent.middleName,
						lastName: parent.lastName,
						fullName: parent.fullName,
						email: parent.email,
						phone: parent.phone,
					}
				: null,
		};
	});

	return Array.isArray(rows) ? mapped : mapped[0];
}

async function bumpUsersVersionForTenantConnection(
	connection: any,
	academicYears: string[],
) {
	const uniqueYears = Array.from(
		new Set((academicYears || []).map((year) => String(year || '').trim())),
	).filter(Boolean);
	if (uniqueYears.length === 0) return;

	const UserSyncState =
		connection.models.UserSyncState ||
		connection.model('UserSyncState', UserSyncStateSchema);
	await Promise.all(
		uniqueYears.map((year) =>
			UserSyncState.updateOne(
				{ academicYear: year },
				{
					$inc: { version: 1 },
					$set: { updatedAt: new Date() },
				},
				{ upsert: true },
			),
		),
	);
}

async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 12);
}

interface ValidationError {
	field: string;
	message: string;
	type: 'DUPLICATE_ENTRY' | 'FORMAT_INVALID' | 'REQUIRED_FIELD';
	details?: { existingUserId?: string; existingUserName?: string };
}

async function validateAdministratorData(
	userData: any,
	models: any,
	baseQuery: any,
	errors: ValidationError[],
) {
	if (userData.position) {
		const currentAcademicYear = getAcademicYear();

		// Check if position is already held in current academic year
		const positionExists = await models.User.findOne({
			...baseQuery,
			role: 'administrator',
			academicYears: {
				$elemMatch: {
					year: currentAcademicYear,
					position: userData.position,
				},
			},
		}).lean();

		if (positionExists) {
			errors.push({
				field: 'position',
				type: 'DUPLICATE_ENTRY',
				message: `The position "${userData.position}" is already held by ${positionExists.fullName} for academic year ${currentAcademicYear}.`,
				details: {
					existingUserId: positionExists._id.toString(),
					existingUserName: positionExists.fullName,
				},
			});
		}
	}
}

async function generateIdByRole(models: any, role: string): Promise<string> {
	const schoolProfile = await getSchoolProfile();
	const prefixes: { [key: string]: string } = {
		student: schoolProfile.studentIdPrefix || 'STU',
		teacher: 'TEA',
		administrator: 'ADM',
		system_admin: 'SYS',
	};
	const idFieldMap: { [key: string]: string } = {
		student: 'studentId',
		teacher: 'username',
		administrator: 'adminId',
		system_admin: 'sysId',
	};
	const prefix = prefixes[role];
	const idField = idFieldMap[role];
	const academicYear = schoolProfile.identity.currentAcademicYear || getAcademicYear();
	const year = academicYear.split('-')[0];

	const idPrefixRegex = `^${prefix}${year}`;
	let lastUser = await models.User.findOne({
		role,
		[idField]: { $regex: idPrefixRegex },
	})
		.sort({ [idField]: -1 })
		.collation({ locale: 'en', numericOrdering: true })
		.lean();

	// Fallback in case legacy records are missing the role-specific id field
	if (!lastUser) {
		lastUser = await models.User.findOne({
			role,
			username: { $regex: idPrefixRegex },
		})
			.sort({ username: -1 })
			.collation({ locale: 'en', numericOrdering: true })
			.lean();
	}

	let nextNumber = 1;
	if (lastUser && lastUser[idField]) {
		const lastId = lastUser[idField];
		const sequenceStr = lastId.substring(prefix.length + year.length);
		if (sequenceStr) {
			nextNumber = parseInt(sequenceStr, 10) + 1;
		}
	} else if (lastUser?.username) {
		const sequenceStr = lastUser.username.substring(
			prefix.length + year.length,
		);
		if (sequenceStr) {
			nextNumber = parseInt(sequenceStr, 10) + 1;
		}
	}

	for (let attempt = 0; attempt < 5; attempt++) {
		const sequenceNumber = String(nextNumber + attempt).padStart(3, '0');
		const candidate = `${prefix}${year}${sequenceNumber}`;
		const exists = await models.User.exists({ username: candidate });
		if (!exists) return candidate;
	}

	throw new Error('Unable to generate a unique username. Please retry.');
}

function generateCredentials(roleBasedId: string) {
	return { username: roleBasedId, defaultPassword: roleBasedId };
}

async function buildUserData(
	models: any,
	userData: any,
	currentUser: any,
): Promise<any> {
	const roleBasedId = await generateIdByRole(models, userData.role);
	const credentials = generateCredentials(roleBasedId);
	const academicYear = userData.enrollmentYear || getAcademicYear();
	const enrollmentSemester = userData.enrollmentSemester;

	const commonData = {
		firstName: userData.firstName.trim(),
		middleName: userData.middleName?.trim(),
		lastName: userData.lastName.trim(),
		fullName: userData.fullName?.trim(),
		nickName: userData.nickName?.trim(),
		gender: userData.gender,
		username: credentials.username,
		password: await hashPassword(credentials.defaultPassword),
		defaultPassword: credentials.defaultPassword,
		dateOfBirth: new Date(userData.dateOfBirth),
		phone: userData.phone?.trim(),
		email: userData.email?.trim().toLowerCase(),
		address: userData.address.trim(),
		bio: userData.bio?.trim(),
		avatar: userData.avatar,
		profilePictureUrl: userData.profilePictureUrl,
		isActive: true,
		mustChangePassword: true,
		role: userData.role,
		createdBy: currentUser.userId,
		createdAt: new Date(),
		chats: [],
		notifications: [],
	};

	switch (userData.role) {
		case 'student':
			return {
				...commonData,
				studentId: roleBasedId,
				enrollmentYear: academicYear,
				enrollmentSemester: enrollmentSemester,
				enrollmentStatus: 'enrolled',
				classId: userData.classId,
				className: userData.className,
				shareContactWithClassmates:
					userData.shareContactWithClassmates ?? false,
				canRecordAttendance: userData.canRecordAttendance ?? false,
				studentType: userData.studentType ?? 'old',
				academicYears: [
					{
						year: academicYear,
						classId: userData.classId,
						className: userData.className,
					},
				],
		};

		case 'teacher':
			return {
				...commonData,
				subjects: (userData.subjects || []).map((yearData: any) => ({
					year: yearData.year || academicYear,
					classes: yearData.classes || [],
				})),
				sponsorClass: userData.sponsorClass || null,
			};

		case 'administrator':
			return {
				...commonData,
				adminId: roleBasedId,
				position: userData.position,
				permissions: userData.permissions || [],
				canRecordStudentAttendance: userData.canRecordStudentAttendance || false,
				canRecordTeacherAttendance: userData.canRecordTeacherAttendance || false,
				isTeacher: userData.isTeacher || false,
				classes: userData.classes || [],
				academicYears: [
					{
						year: academicYear,
						position: userData.position,
					},
				],
			};

		case 'system_admin':
			return { ...commonData, sysId: roleBasedId };

		default:
			throw new Error('Invalid user role');
	}
}

// Link a parent to a student (assign existing or create new parent account).
// Returns the parent doc or null when no parent payload was provided.
async function attachOrCreateParent(
	models: any,
	parent: any,
	studentId: string,
	currentUser: any,
): Promise<any | null> {
	if (!parent) return null;

	if (parent.mode === 'assign' && parent.parentId) {
		const existing = await models.Parent.findById(parent.parentId).lean();
		if (!existing) {
			throw new Error('Selected parent account was not found.');
		}
		await models.Parent.updateOne(
			{ _id: parent.parentId },
			{
				$addToSet: { studentIds: studentId },
				$set: { updatedAt: new Date() },
			},
		);
		return existing;
	}

	if (parent.mode === 'create') {
		const email = parent.email?.toString().toLowerCase().trim() || '';
		const phone = parent.phone?.toString().trim() || '';
		const username = email || phone;
		if (!username) {
			throw new Error(
				'Parent needs an email or phone number to create an account.',
			);
		}
		const firstName = parent.firstName?.toString().trim() || '';
		const middleName = parent.middleName?.toString().trim() || '';
		const lastName = parent.lastName?.toString().trim() || '';
		const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
		const defaultPassword = username;
		const hashedPassword = await hashPassword(defaultPassword);

		const created = await models.Parent.create({
			role: 'parent',
			firstName,
			middleName,
			lastName,
			fullName,
			username,
			password: hashedPassword,
			defaultPassword,
			mustChangePassword: true,
			isActive: true,
			gender: parent.gender || 'Other',
			dateOfBirth: parent.dateOfBirth || '2000-01-01',
			...(email ? { email } : {}),
			...(phone ? { phone } : {}),
			address: parent.address?.toString().trim() || '',
			studentIds: [studentId],
			createdBy: currentUser.userId,
			createdAt: new Date(),
			chats: [],
			notifications: [],
		});
		return created;
	}

	return null;
}

// --- Student Promotion/Demotion Functions ---

interface ClassInfo {
	classId: string;
	name: string;
	session: string;
	level: string;
}

function flattenClassStructure(classLevels: any): ClassInfo[] {
	const allClasses: ClassInfo[] = [];

	if (!classLevels) return allClasses;

	// Iterate through sessions (e.g., "Morning", "Afternoon")
	for (const sessionName in classLevels) {
		const session = classLevels[sessionName];

		// Get the level order from the keys in the session object
		// This preserves the order as defined in the school profile
		const levelOrder = Object.keys(session);

		// Process levels in the order they appear in the profile
		for (const levelName of levelOrder) {
			const level = session[levelName];

			// Get classes from this level
			if (level.classes && Array.isArray(level.classes)) {
				level.classes.forEach((classObj: any) => {
					allClasses.push({
						classId: classObj.classId,
						name: classObj.name,
						session: sessionName,
						level: levelName,
					});
				});
			}
		}
	}

	return allClasses;
}

function normalizeClassName(name?: string): string {
	if (!name) return '';
	return name.replace(/\s*-?\s*[A-D]$/i, '').trim();
}

function getAcademicYearStart(year?: string): number | null {
	if (!year) return null;
	const start = Number.parseInt(year.split('-')[0], 10);
	return Number.isFinite(start) ? start : null;
}

function getLatestAcademicYearFromValues(
	years: Array<string | null | undefined>,
): string | null {
	let latestYear: string | null = null;
	let latestStart: number | null = null;

	for (const year of years) {
		if (!year) continue;
		const start = getAcademicYearStart(year);
		if (start === null) continue;
		if (latestStart === null || start > latestStart) {
			latestStart = start;
			latestYear = year;
		}
	}

	return latestYear;
}

function getClassMetaById(classLevels: any, classId: string) {
	if (!classLevels || !classId) return null;
	for (const [sessionName, session] of Object.entries(classLevels)) {
		if (!session || typeof session !== 'object') continue;
		const levelOrder = Object.keys(session);
		for (const levelName of levelOrder) {
			const level: any = (session as any)[levelName];
			if (level?.classes && Array.isArray(level.classes)) {
				const found = level.classes.find((c: any) => c.classId === classId);
				if (found) {
					return {
						classId: found.classId,
						name: found.name,
						session: sessionName,
						level: levelName,
						baseName: normalizeClassName(found.name),
					};
				}
			}
		}
	}
	return null;
}

function getOrderedClassesForSession(classLevels: any, sessionName: string) {
	if (!classLevels?.[sessionName]) return [];
	const ordered: any[] = [];
	const session: any = classLevels[sessionName];
	const levelOrder = Object.keys(session);
	for (const levelName of levelOrder) {
		const level = session[levelName];
		if (level?.classes && Array.isArray(level.classes)) {
			level.classes.forEach((cls: any) => {
				ordered.push({
					classId: cls.classId,
					name: cls.name,
					session: sessionName,
					level: levelName,
					baseName: normalizeClassName(cls.name),
				});
			});
		}
	}
	return ordered;
}

function isAtHighestClass(classLevels: any, classId: string) {
	const currentMeta = getClassMetaById(classLevels, classId);
	if (!currentMeta) return false;
	const ordered = getOrderedClassesForSession(classLevels, currentMeta.session);
	const currentIndex = ordered.findIndex(
		(cls) => cls.classId === currentMeta.classId,
	);
	if (currentIndex === -1) return false;
	const hasHigherBaseClass = ordered
		.slice(currentIndex + 1)
		.some((cls) => cls.baseName !== currentMeta.baseName);
	return !hasHigherBaseClass;
}

async function promoteStudent(
	student: any,
	promotionType: 'yearlyPromotion' | 'doublePromotion',
	promotedToClassId: string,
	promotedToClassName: string,
	newAcademicYear: string | null,
	models: any,
) {
	const schoolProfile = await getSchoolProfile();
	const currentAcademicYear =
		schoolProfile.identity.currentAcademicYear || getAcademicYear();

	// Validate if double promotion is allowed
	if (promotionType === 'doublePromotion') {
		const allowDoublePromotion =
			schoolProfile.academicConfig?.gradingSettings?.givesDoublePromotion;
		if (!allowDoublePromotion) {
			throw new Error(
				'Double promotion is not allowed according to school settings. Please contact the school administrator.',
			);
		}
	}

	const updateData: any = {
		classId: promotedToClassId,
		className: promotedToClassName,
		updatedAt: new Date(),
	};

	if (promotionType === 'yearlyPromotion') {
		// Student completed the academic year and moves to next class for new academic year
		if (!newAcademicYear) {
			throw new Error('New academic year is required for yearly promotion');
		}

		// Check if the new academic year already exists in academicYears
		const academicYearExists = student.academicYears.some(
			(ay: any) => ay.year === newAcademicYear,
		);

		if (academicYearExists) {
			// Update existing academic year's classId
			updateData['academicYears'] = student.academicYears.map((ay: any) =>
				ay.year === newAcademicYear
					? {
							...ay,
							classId: promotedToClassId,
							className: promotedToClassName,
						}
					: ay,
			);
		} else {
			// Add new academic year with the new class
			updateData['$push'] = {
				academicYears: {
					year: newAcademicYear,
					classId: promotedToClassId,
					className: promotedToClassName,
				},
			};
		}

		// Grades remain in the current academic year - no grade updates needed
		// The new academic year will have new grades created
	} else if (promotionType === 'doublePromotion') {
		// Student moves to next class within the same academic year
		// Update the classId for the current academic year
		const currentAcademicYearData = student.academicYears.find(
			(ay: any) => ay.year === currentAcademicYear,
		);

		if (currentAcademicYearData) {
			// Update the classId for the current academic year
			updateData['academicYears'] = student.academicYears.map((ay: any) =>
				ay.year === currentAcademicYear
					? {
							...ay,
							classId: promotedToClassId,
							className: promotedToClassName,
						}
					: ay,
			);
		} else {
			// If current academic year doesn't exist, add it
			updateData['$push'] = {
				academicYears: {
					year: currentAcademicYear,
					classId: promotedToClassId,
					className: promotedToClassName,
				},
			};
		}

		// Update all grades for the current academic year to the new class
		await models.Grade.updateMany(
			{
				studentId: student.studentId,
				academicYear: currentAcademicYear,
			},
			{
				$set: {
					classId: promotedToClassId,
					updatedAt: new Date(),
				},
			},
		);
	}

	const updatedStudent = await models.Student.findByIdAndUpdate(
		student._id,
		updateData['$push']
			? { $set: updateData, $push: updateData['$push'] }
			: { $set: updateData },
		{ new: true, runValidators: true },
	).select('-password -defaultPassword');

	return {
		student: updatedStudent,
		promotionDetails: {
			type: promotionType,
			fromClass: {
				classId: student.classId,
				className: student.className,
			},
			toClass: {
				classId: promotedToClassId,
				className: promotedToClassName,
			},
			academicYear:
				promotionType === 'yearlyPromotion'
					? newAcademicYear
					: currentAcademicYear,
			gradesUpdated: promotionType === 'doublePromotion',
		},
	};
}

async function demoteStudent(
	student: any,
	demotionType: 'yearlyDemotion' | 'semesterDemotion',
	demotedToClassId: string,
	demotedToClassName: string,
	previousAcademicYear: string | null,
	models: any,
) {
	const schoolProfile = await getSchoolProfile();
	const currentAcademicYear =
		schoolProfile.identity.currentAcademicYear || getAcademicYear();

	// Validate if semester demotion is allowed
	if (demotionType === 'semesterDemotion') {
		throw new Error(
			'Semester demotion is not allowed according to school settings. Please contact the school administrator.',
		);
	}

	const updateData: any = {
		classId: demotedToClassId,
		className: demotedToClassName,
		updatedAt: new Date(),
	};

	if (demotionType === 'yearlyDemotion') {
		// Student needs to repeat previous academic year in a lower class
		if (!previousAcademicYear) {
			throw new Error('Previous academic year is required for yearly demotion');
		}

		// Check if the previous academic year exists
		const academicYearExists = student.academicYears.some(
			(ay: any) => ay.year === previousAcademicYear,
		);

		if (academicYearExists) {
			updateData['academicYears'] = student.academicYears.map((ay: any) =>
				ay.year === previousAcademicYear
					? {
							...ay,
							classId: demotedToClassId,
							className: demotedToClassName,
						}
					: ay,
			);
		} else {
			updateData['$push'] = {
				academicYears: {
					year: previousAcademicYear,
					classId: demotedToClassId,
					className: demotedToClassName,
				},
			};
		}

		// Grades remain in the current academic year - no grade updates needed
		// The student will have to retake the previous year
	} else if (demotionType === 'semesterDemotion') {
		// Student moves to lower class within the same academic year
		// Update classId for current academic year
		const currentAcademicYearData = student.academicYears.find(
			(ay: any) => ay.year === currentAcademicYear,
		);

		if (currentAcademicYearData) {
			updateData['academicYears'] = student.academicYears.map((ay: any) =>
				ay.year === currentAcademicYear
					? {
							...ay,
							classId: demotedToClassId,
							className: demotedToClassName,
						}
					: ay,
			);
		} else {
			updateData['$push'] = {
				academicYears: {
					year: currentAcademicYear,
					classId: demotedToClassId,
					className: demotedToClassName,
				},
			};
		}

		// Update all grades for the current academic year to the lower class
		await models.Grade.updateMany(
			{
				studentId: student.studentId,
				academicYear: currentAcademicYear,
			},
			{
				$set: {
					classId: demotedToClassId,
					updatedAt: new Date(),
				},
			},
		);
	}

	const updatedStudent = await models.Student.findByIdAndUpdate(
		student._id,
		updateData['$push']
			? { $set: updateData, $push: updateData['$push'] }
			: { $set: updateData },
		{ new: true, runValidators: true },
	).select('-password -defaultPassword');

	return {
		student: updatedStudent,
		demotionDetails: {
			type: demotionType,
			fromClass: {
				classId: student.classId,
				className: student.className,
			},
			toClass: {
				classId: demotedToClassId,
				className: demotedToClassName,
			},
			academicYear:
				demotionType === 'yearlyDemotion'
					? previousAcademicYear
					: currentAcademicYear,
			gradesUpdated: demotionType === 'semesterDemotion',
		},
	};
}

interface ConflictDetails {
	type: 'subject' | 'sponsorship';
	conflictingTeacher: {
		id: string;
		name: string;
		teacherUsername: string;
	};
	assignment?: {
		year: string;
		classId: string;
		subjects: string[];
	};
	sponsorClass?: string;
}

interface ValidationErrorWithConflicts extends ValidationError {
	conflicts?: ConflictDetails[];
	requiresConfirmation?: boolean;
}

// Enhanced teacher validation with conflict reporting
// Enhanced teacher validation with conflict reporting
async function validateTeacherData(
	userData: any,
	models: any,
	baseQuery: any,
	errors: ValidationErrorWithConflicts[],
	currentUserId?: string,
): Promise<void> {
	const currentAcademicYear = getAcademicYear();

	// Validate class sponsorship
	if (userData.sponsorClass) {
		const sponsorExists = await models.Teacher.findOne({
			...baseQuery,
			role: 'teacher',
			sponsorClass: userData.sponsorClass,
		}).lean();

		if (sponsorExists) {
			const conflict: ConflictDetails = {
				type: 'sponsorship',
				conflictingTeacher: {
					id: sponsorExists._id.toString(),
					name:
						sponsorExists.fullName ||
						`${sponsorExists.firstName} ${sponsorExists.lastName}`,
					teacherUsername: sponsorExists.username,
				},
				sponsorClass: userData.sponsorClass,
			};
			errors.push({
				field: 'sponsorClass',
				type: 'DUPLICATE_ENTRY',
				message: `${conflict.conflictingTeacher.name} (${conflict.conflictingTeacher.teacherUsername}) is already the sponsor for class "${userData.sponsorClass}".`,
				details: {
					existingUserId: sponsorExists._id.toString(),
					existingUserName: sponsorExists.fullName,
				},
				conflicts: [conflict],
				requiresConfirmation: true,
			});
		}
	}

	// Validate subject assignments
	if (userData.subjects && Array.isArray(userData.subjects)) {
		for (const yearData of userData.subjects) {
			const year = yearData.year || currentAcademicYear;

			if (yearData.classes && Array.isArray(yearData.classes)) {
				for (const classData of yearData.classes) {
					const requestedSubjects = Array.isArray(classData.subjects)
						? Array.from(
								new Set(
									classData.subjects
										.map((subject: any) => String(subject || '').trim())
										.filter(Boolean),
								),
							)
						: [];
					if (requestedSubjects.length === 0) continue;

					// Check if another teacher has overlapping subject assignment for this class/year.
					const assignmentExists = await models.Teacher.find({
						...baseQuery,
						role: 'teacher',
						subjects: {
							$elemMatch: {
								year: year,
								classes: {
									$elemMatch: {
										classId: classData.classId,
										subjects: { $in: requestedSubjects },
									},
								},
							},
						},
					})
						.select('firstName lastName fullName username subjects')
						.lean();

					for (const conflictingAssignment of assignmentExists) {
						const yearEntry = Array.isArray(conflictingAssignment?.subjects)
							? conflictingAssignment.subjects.find(
									(entry: any) => entry?.year === year,
								)
							: null;
						const classEntry = Array.isArray(yearEntry?.classes)
							? yearEntry.classes.find(
									(entry: any) => entry?.classId === classData.classId,
								)
							: null;
						const conflictingSubjects = Array.isArray(classEntry?.subjects)
							? Array.from(
									new Set(
										classEntry.subjects
											.map((subject: any) => String(subject || '').trim())
											.filter((subject: string) =>
												requestedSubjects.includes(subject),
											),
									),
								)
							: [];
						if (conflictingSubjects.length === 0) continue;

						const conflict: ConflictDetails = {
							type: 'subject',
							conflictingTeacher: {
								id: conflictingAssignment._id.toString(),
								name:
									conflictingAssignment.fullName ||
									`${conflictingAssignment.firstName} ${conflictingAssignment.lastName}`,
								teacherUsername: conflictingAssignment.username,
							},
							assignment: {
								year: year,
								classId: classData.classId,
								subjects: conflictingSubjects as string[],
							},
						};

						errors.push({
							field: 'subjects',
							type: 'DUPLICATE_ENTRY',
							message: `Class "${classData.classId}" for academic year ${year} already has ${conflictingSubjects.join(', ')} assigned to ${conflict.conflictingTeacher.name} (${conflict.conflictingTeacher.teacherUsername}).`,
							details: {
								existingUserId: conflictingAssignment._id.toString(),
								existingUserName: conflictingAssignment.fullName,
							},
							conflicts: [conflict],
							requiresConfirmation: true,
						});
					}
				}
			}
		}
	}
}

// Enhanced validation function
async function validateUserData(
	userData: any,
	models: any,
	isUpdate: boolean = false,
	userId: string | null = null,
	forceAssignments: boolean = false,
): Promise<ValidationErrorWithConflicts[]> {
	const errors: ValidationErrorWithConflicts[] = [];
	if (userData.email !== undefined) {
		const normalizedEmail = userData.email?.toString().trim();
		if (!normalizedEmail) {
			delete userData.email;
		} else {
			userData.email = normalizedEmail;
		}
	}
	if (userData.phone !== undefined) {
		const normalizedPhone = userData.phone?.toString().trim();
		if (!normalizedPhone) {
			delete userData.phone;
		} else {
			userData.phone = normalizedPhone;
		}
	}
	if (userData.parent?.mode === 'create') {
		if (userData.parent.email !== undefined) {
			const normalizedParentEmail = userData.parent.email
				?.toString()
				.trim();
			if (!normalizedParentEmail) {
				delete userData.parent.email;
			} else {
				userData.parent.email = normalizedParentEmail;
			}
		}
		if (userData.parent.phone !== undefined) {
			const normalizedParentPhone = userData.parent.phone?.toString().trim();
			if (!normalizedParentPhone) {
				delete userData.parent.phone;
			} else {
				userData.parent.phone = normalizedParentPhone;
			}
		}
	}
	const requiredFields = [
		'firstName',
		'lastName',
		'dateOfBirth',
		'phone',
		'address',
		'role',
		'gender',
	];

	if (!isUpdate) {
		for (const field of requiredFields) {
			if (!userData[field] || userData[field].toString().trim() === '') {
				errors.push({
					field,
					message: `${field} is required`,
					type: 'REQUIRED_FIELD',
				});
			}
		}
	}

	if (
		userData.gender &&
		!['male', 'female'].includes(userData.gender.toLowerCase())
	) {
		errors.push({
			field: 'gender',
			message: 'Gender must be "male" or "female"',
			type: 'FORMAT_INVALID',
		});
	}
	if (userData.email && !validateEmail(userData.email)) {
		errors.push({
			field: 'email',
			message: 'Invalid email format',
			type: 'FORMAT_INVALID',
		});
	}
	if (userData.phone && !validatePhone(userData.phone)) {
		errors.push({
			field: 'phone',
			message: 'Invalid phone number format',
			type: 'FORMAT_INVALID',
		});
	}

	const baseQuery = { isActive: true, ...(userId && { _id: { $ne: userId } }) };

	// Email and phone validation - always run (not affected by forceAssignments)
	if (userData.email) {
		const emailExists = await models.User.findOne({
			...baseQuery,
			email: userData.email.toLowerCase(),
		}).lean();
		if (emailExists) {
			errors.push({
				field: 'email',
				type: 'DUPLICATE_ENTRY',
				message: 'Email address is already in use.',
				details: {
					existingUserId: emailExists._id.toString(),
					existingUserName: emailExists.fullName,
				},
			});
		}
	}
	if (userData.phone) {
		const phoneExists = await models.User.findOne({
			...baseQuery,
			phone: userData.phone,
		}).lean();
		if (phoneExists) {
			errors.push({
				field: 'phone',
				type: 'DUPLICATE_ENTRY',
				message: 'Phone number is already in use.',
				details: {
					existingUserId: phoneExists._id.toString(),
					existingUserName: phoneExists.fullName,
				},
			});
		}
	}

	const role =
		userData.role ||
		(isUpdate && userId
			? (await models.User.findById(userId).select('role').lean())?.role
			: null);

	// Role-specific validation - skip if forceAssignments is true
	if (role && !forceAssignments) {
		switch (role) {
			case 'administrator':
				await validateAdministratorData(userData, models, baseQuery, errors);
				break;
			case 'teacher':
				await validateTeacherData(userData, models, baseQuery, errors, userId);
				break;
		}
	}

	// Validate linked parent (student create/edit)
	if (role === 'student' && userData.parent) {
		const parent = userData.parent;
		if (parent.mode === 'assign') {
			if (!parent.parentId) {
				errors.push({
					field: 'parent',
					message: 'Select a parent to assign',
					type: 'REQUIRED_FIELD',
				});
			} else {
				const existingParent = await models.Parent.findById(parent.parentId).lean();
				if (!existingParent) {
					errors.push({
						field: 'parent',
						message: 'Selected parent account was not found',
						type: 'FORMAT_INVALID',
					});
				}
			}
		} else if (parent.mode === 'create') {
			if (!parent.firstName?.toString().trim() || !parent.lastName?.toString().trim()) {
				errors.push({
					field: 'parent',
					message: 'Parent first and last name are required',
					type: 'REQUIRED_FIELD',
				});
			}
			const parentEmail = parent.email?.toString().toLowerCase().trim();
			const parentPhone = parent.phone?.toString().trim();
			if (!parentEmail && !parentPhone) {
				errors.push({
					field: 'parent',
					message:
						'Parent needs an email or phone number to create an account',
					type: 'REQUIRED_FIELD',
				});
			}
			if (parentEmail && !validateEmail(parentEmail)) {
				errors.push({
					field: 'parent.email',
					message: 'Invalid parent email format',
					type: 'FORMAT_INVALID',
				});
			}
			if (parentEmail) {
				const existingUser = await models.User.findOne({
					email: parentEmail,
				}).lean();
				if (existingUser) {
					errors.push({
						field: 'parent.email',
						type: 'DUPLICATE_ENTRY',
						message:
							'A user already exists with this email. Search and assign them instead.',
						details: {
							existingUserId: existingUser._id.toString(),
							existingUserName: existingUser.fullName,
						},
					});
				}
			}
			if (parentPhone) {
				const existingUser = await models.User.findOne({
					phone: parentPhone,
				}).lean();
				if (existingUser) {
					errors.push({
						field: 'parent.phone',
						type: 'DUPLICATE_ENTRY',
						message:
							'A user already exists with this phone number. Search and assign them instead.',
						details: {
							existingUserId: existingUser._id.toString(),
							existingUserName: existingUser.fullName,
						},
					});
				}
			}
		}
	}

	return errors;
}

// --- FORCE REASSIGNMENT ---
async function handleForceReassignmentEnhanced(
	userData: any,
	models: any,
	newUserId: string | null,
	conflicts: ConflictDetails[],
	newTeacherUsername?: string | null,
) {
	// Handle sponsorship conflicts
	const sponsorshipConflicts = conflicts.filter(
		(c) => c.type === 'sponsorship',
	);
	for (const conflict of sponsorshipConflicts) {
		await models.Teacher.updateOne(
			{ _id: conflict.conflictingTeacher.id },
			{
				$unset: { sponsorClass: 1 },
				$set: { updatedAt: new Date() },
			},
		);
	}

	// Handle subject assignment conflicts
	const subjectConflicts = conflicts.filter((c) => c.type === 'subject');
	const gradeUpdatePromises: Promise<any>[] = [];
	for (const conflict of subjectConflicts) {
		if (conflict.assignment) {
			// Remove only the reassigned subjects for the specific class/year
			const conflictingTeacher = await models.Teacher.findById(
				conflict.conflictingTeacher.id,
			).lean();

			if (conflictingTeacher && conflictingTeacher.subjects) {
				const updatedSubjects = conflictingTeacher.subjects.map(
					(yearData: any) => {
						if (yearData.year !== conflict.assignment!.year) {
							return yearData;
						}

						const updatedClasses = (yearData.classes || [])
							.map((classData: any) => {
								if (classData.classId !== conflict.assignment!.classId) {
									return classData;
								}

								const subjectsToRemove = conflict.assignment!.subjects || [];
								if (subjectsToRemove.length === 0) {
									return null;
								}

								const remainingSubjects = (classData.subjects || []).filter(
									(subject: string) => !subjectsToRemove.includes(subject),
								);

								if (remainingSubjects.length === 0) {
									return null;
								}

								return {
									...classData,
									subjects: remainingSubjects,
								};
							})
							.filter(Boolean);

						return {
							year: yearData.year,
							classes: updatedClasses,
						};
					},
				);

				await models.Teacher.updateOne(
					{ _id: conflict.conflictingTeacher.id },
					{
						$set: {
							subjects: updatedSubjects,
							updatedAt: new Date(),
						},
					},
				);

				if (newTeacherUsername) {
					gradeUpdatePromises.push(
						models.Grade.updateMany(
							{
								academicYear: conflict.assignment!.year,
								classId: conflict.assignment!.classId,
								subject: { $in: conflict.assignment!.subjects || [] },
								teacherUsername: conflict.conflictingTeacher.teacherUsername,
							},
							{
								$set: {
									teacherUsername: newTeacherUsername,
									updatedAt: new Date(),
								},
							},
						),
					);
				}
			}
		}
	}

	if (gradeUpdatePromises.length > 0) {
		await Promise.all(gradeUpdatePromises);
	}
}

function generateSysId(): string {
	const year = new Date().getFullYear();
	const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
	return `SYS${year}${seq}`;
}

async function generateUniqueUsername(UserModel: any, maxAttempts = 10): Promise<string> {
	for (let i = 0; i < maxAttempts; i++) {
		const candidate = generateSysId();
		const exists = await UserModel.findOne({ username: candidate }).lean().exec();
		if (!exists) return candidate;
	}
	throw new Error('Failed to generate a unique username after multiple attempts');
}

export async function GET(request: NextRequest) {
	try {
		let currentUser: any = await authorizeUser(request);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const { searchParams } = new URL(request.url);
		const hostParam = searchParams.get('host');

		// --- Superadmin: list system_admins in a specific school's tenant DB ---
		if (currentUser.role === 'superadmin' && hostParam) {
			const cleanHost = normalizeHost(hostParam);
			const { SchoolProfile } = await getSchoolMeshModels();
			const school = await SchoolProfile.findOne({ 'system.host': cleanHost }).select('system.dbName system.host identity.currentAcademicYear').lean().exec();
			if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

			const connection = await getTenantConnectionByDbName((school as any).system?.dbName);
			if (!connection) return NextResponse.json({ students: 0, teachers: 0, administrators: 0, systemAdmins: 0, total: 0 });


			if (!connection) return NextResponse.json({ users: [], admins: [] });

			const User = (connection.models.User || connection.model('User', UserSchema)) as any;
			if (!User.discriminators?.system_admin) {
				User.discriminator('system_admin', SystemAdminSchema);
			}

			const roleFilter = searchParams.get('role');
			const query: any = {};
			if (roleFilter === 'system_admin') {
				const admins = await User.discriminators.system_admin
					.find({ role: 'system_admin' })
					.select('firstName lastName fullName username phone email isActive createdAt')
					.sort({ createdAt: -1 })
					.lean()
					.exec();
				return NextResponse.json({ users: admins || [], admins: admins || [] });
			}

			const users = await User.find(query)
				.select('firstName lastName fullName username role phone email isActive createdAt')
				.sort({ createdAt: -1 })
				.lean()
				.exec();
			return NextResponse.json({ users: users || [] });
		}

		const models = await getTenantModels();
		const role = searchParams.get('role') as UserRole | null;
		const classId = searchParams.get('classId');
		const targetId = searchParams.get('id');
		const schoolProfile = await getSchoolProfile();
		const currentAcademicYear =
			schoolProfile?.identity.currentAcademicYear || getAcademicYear();
		const academicYear =
			searchParams.get('academicYear') || currentAcademicYear;
		const limit = parseInt(searchParams.get('limit') || '50000', 10);
		const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
		const includeCounts =
			searchParams.get('includeCounts') === 'true' ||
			searchParams.get('includeCounts') === '1';
		const includeParents =
			searchParams.get('includeParents') === 'true' ||
			searchParams.get('includeParents') === '1';
		const searchQuery = searchParams.get('q')?.trim() || '';
		const skip = (page - 1) * limit;

		let responseData: any;

		// ========================================================================
		// REQUIRE ACADEMIC YEAR PARAMETER FOR ALL REQUESTS
		// ========================================================================
		if (!academicYear) {
			return NextResponse.json(
				{
					success: false,
					message: 'Academic year parameter is required',
				},
				{ status: 400 },
			);
		}

		// ========================================================================
		// HELPER FUNCTION: Format Student Data with Class Information
		// ========================================================================
		const formatStudentData = (
			student: any,
			queryYear: string,
			isCurrentYear: boolean,
		) => {
			const baseData = {
				id: student._id.toString(),
				studentId: student.studentId,
				firstName: student.firstName,
				lastName: student.lastName,
				fullName: student.fullName,
				email: student.email,
				isLateRegistration: student.isLateRegistration,
				phone:
					student.shareContactWithClassmates === true
						? student.phone
						: undefined,
				shareContactWithClassmates: student.shareContactWithClassmates ?? false,
				avatar: student.avatar || student.profilePictureUrl,
				bio: student.bio,
				nickName: student.nickName,
				gender: student.gender,
				role: 'student',
			};

			if (isCurrentYear) {
				// For current year, return only current class
				return {
					...baseData,
					className: student.className,
					classId: student.classId,
				};
			} else {
				// For past years, return both historical and current class
				const yearData = student.academicYears?.find(
					(ay: any) => ay.year === queryYear,
				);

				return {
					...baseData,
					// Historical class from the queried year
					historicalClass: {
						className: yearData?.className,
						classId: yearData?.classId,
						academicYear: queryYear,
					},
					// Current class
					currentClass: {
						className: student.className,
						classId: student.classId,
					},
				};
			}
		};

		const applyStudentPhonePrivacy = (
			user: any,
			queryYear: string,
			options: {
				includeUsername?: boolean;
				restrictPhone?: boolean;
			} = {},
		) => {
			if (!user || user.role !== 'student') return user;
			const includeUsername = options.includeUsername === true;
			const restrictPhone = options.restrictPhone !== false;
			const isCurrentYear = queryYear === currentAcademicYear;
			const formatted = formatStudentData(user, queryYear, isCurrentYear);
			const merged = {
				...user,
				...formatted,
			};
			if (!isCurrentYear) {
				const historicalClass = (formatted as any)?.historicalClass;
				const historicalClassId = String(historicalClass?.classId || '').trim();
				if (historicalClassId) {
					merged.classId = historicalClassId;
					if (historicalClass?.className) {
						merged.className = historicalClass.className;
					}
				}
			}
			if (!restrictPhone) {
				merged.phone = user.phone;
			}
			if (includeUsername) {
				merged.username = user.username || user.studentId;
			}
			return merged;
		};

		const buildStudentAcademicYearClassFilter = (
			year: string,
			classScope?: string | string[],
		) => {
			const elemMatch: Record<string, any> = { year };
			if (Array.isArray(classScope) && classScope.length > 0) {
				elemMatch.classId = { $in: classScope };
			} else if (typeof classScope === 'string' && classScope.trim()) {
				elemMatch.classId = classScope.trim();
			}
			return { academicYears: { $elemMatch: elemMatch } };
		};

		// ========================================================================
		// HELPER FUNCTION: Validate Academic Year Access
		// ========================================================================
		const validateAcademicYearAccess = async (
			userId: string,
			userRole: UserRole,
			year: string,
		): Promise<boolean> => {
			if (userRole === 'student') {
				const student = await models.Student.findById(userId)
					.select('academicYears')
					.lean();
				if (!student) return false;
				return (
					student.academicYears?.some((ay: any) => ay.year === year) || false
				);
			}

			if (userRole === 'teacher') {
				const teacher = await models.Teacher.findById(userId)
					.select('subjects')
					.lean();
				if (!teacher) return false;
				return teacher.subjects?.some((s: any) => s.year === year) || false;
			}

			if (userRole === 'administrator') {
				const admin = await models.Administrator.findById(userId)
					.select('academicYears')
					.lean();
				if (!admin) return false;
				return (
					admin.academicYears?.some((ay: any) => ay.year === year) || false
				);
			}

			// System admins have access to all years
			if (userRole === 'system_admin') {
				return true;
			}

			return false;
		};

		// ========================================================================
		// PARENT ROLE - Delegate to the selected child's student context so the
		// parent can fetch classmates/teachers exactly like their child would.
		// ========================================================================
		if (currentUser.role === 'parent') {
			const parent = await models.Parent.findById(currentUser.id)
				.select('studentIds')
				.lean();
			const studentIds = Array.isArray(parent?.studentIds)
				? parent.studentIds
				: [];
			const selectedStudentId =
				searchParams.get('studentId') ||
				currentUser.studentId ||
				studentIds[0];
			if (
				!parent ||
				!selectedStudentId ||
				!studentIds.includes(selectedStudentId)
			) {
				return NextResponse.json(
					{
						success: false,
						message:
							'You can only access users linked to your children.',
					},
					{ status: 403 },
				);
			}
			const child = await models.Student.findOne({
				username: selectedStudentId,
				role: 'student',
			})
				.select('_id')
				.lean();
			if (!child) {
				return NextResponse.json(
					{ success: false, message: 'Linked child not found.' },
					{ status: 404 },
				);
			}
			currentUser = {
				...currentUser,
				id: String(child._id),
				role: 'student',
			} as any;
		}

		// Validate current user has access to the requested academic year
		const hasAccess = await validateAcademicYearAccess(
			currentUser.id,
			currentUser.role,
			academicYear,
		);

		if (!hasAccess) {
			return NextResponse.json(
				{
					success: false,
					message: 'You do not have access to this academic year',
				},
				{ status: 403 },
			);
		}

		// ========================================================================
		// 1. STUDENT ROLE - Can fetch classmates, their teachers, and administrators
		//    from academic years they attended
		// ========================================================================
		if (currentUser.role === 'student') {
			const studentData = await models.Student.findById(currentUser.id).lean();

			if (!studentData) {
				return NextResponse.json(
					{ success: false, message: 'Student profile not found' },
					{ status: 404 },
				);
			}

			// Get the class ID for the requested academic year
			// This ensures we fetch classmates from the class they were in THAT year
			const yearData = studentData.academicYears?.find(
				(ay: any) => ay.year === academicYear,
			);

			if (!yearData) {
				return NextResponse.json(
					{
						success: false,
						message: 'You were not enrolled in this academic year',
					},
					{ status: 403 },
				);
			}

			// Use the classId from the specific academic year
			// e.g., if student was in "Morning-GradeNine" in 2022-2023,
			// fetch all students who were also in "Morning-GradeNine" that year
			const myClassId = yearData.classId;

			// If requesting their own profile, return full data
			if (targetId === currentUser.id) {
				responseData = await models.User.findById(currentUser.id).select(
					'-password -defaultPassword',
				);
				return NextResponse.json({
					success: true,
					message: 'User Fetch Successful',
					data: responseData,
				});
			}

			// --- FETCH ONLY TEACHERS ---
			if (role === 'teacher') {
				const teachers = await models.User.find({
					role: 'teacher',
					subjects: {
						$elemMatch: {
							year: academicYear,
							'classes.classId': myClassId,
						},
					},
				})
					.select('-password -defaultPassword')
					.lean();

				// Filter subjects to only show what they teach in this student's class
				const filteredTeachers = teachers.map((t: any) => {
					const yearDataTeacher = t.subjects?.find(
						(s: any) => s.year === academicYear,
					);
					const classData = yearDataTeacher?.classes?.find(
						(c: any) => c.classId === myClassId,
					);

					return {
						id: t._id.toString(),
						firstName: t.firstName,
						lastName: t.lastName,
						fullName: t.fullName,
						email: t.email,
						phone: t.phone,
						avatar: t.avatar || t.profilePictureUrl,
						bio: t.bio,
						nickName: t.nickName,
						gender: t.gender,
						subjects: classData?.subjects || [],
						role: 'teacher',
					};
				});

				return NextResponse.json({
					success: true,
					message: 'User Fetch Successful',
					data: filteredTeachers,
				});
			}

			// --- FETCH ONLY CLASSMATES ---
			if (role === 'student') {
				// Fetch students who were in the SAME class during the SAME academic year
				// For example: if querying 2022-2023 when student was in "Morning-GradeNine",
				// return all students who were also in "Morning-GradeNine" in 2022-2023
				const classmates = await models.User.find({
					role: 'student',
					_id: { $ne: currentUser.id },
					academicYears: {
						$elemMatch: {
							year: academicYear,
							classId: myClassId,
						},
					},
				})
					.limit(limit)
					.select('-password -defaultPassword')
					.lean();

				const isCurrentYear = academicYear === currentAcademicYear;
				const filteredClassmates = classmates.map((s: any) =>
					formatStudentData(s, academicYear, isCurrentYear),
				);

				return NextResponse.json({
					success: true,
					message: 'User Fetch Successful',
					data: filteredClassmates,
				});
			}

			// --- FETCH ONLY ADMINISTRATORS ---
			if (role === 'administrator') {
				const administrators = await models.User.find({
					role: 'administrator',
					'academicYears.year': academicYear,
				})
					.select('-password -defaultPassword')
					.lean();

				const filteredAdministrators = administrators.map((a: any) => ({
					id: a._id.toString(),
					firstName: a.firstName,
					lastName: a.lastName,
					fullName: a.fullName,
					email: a.email,
					phone: a.phone,
					avatar: a.avatar || a.profilePictureUrl,
					bio: a.bio,
					nickName: a.nickName,
					gender: a.gender,
					position: a.position,
					isTeacher: a.isTeacher || false,
					role: 'administrator',
				}));

				return NextResponse.json({
					success: true,
					message: 'User Fetch Successful',
					data: filteredAdministrators,
				});
			}

			// --- FETCH SPECIFIC USER BY ID ---
			if (targetId) {
				// Build filter to ensure student can only access allowed users
				const userFilters: any = {
					_id: targetId,
					$or: [
						// Classmates from the same class in the same academic year
						{
							role: 'student',
							academicYears: {
								$elemMatch: {
									year: academicYear,
									classId: myClassId,
								},
							},
						},
						// Teachers teaching their class in this academic year
						{
							role: 'teacher',
							subjects: {
								$elemMatch: {
									year: academicYear,
									'classes.classId': myClassId,
								},
							},
						},
						// Administrators who were at the school in this academic year
						{
							role: 'administrator',
							'academicYears.year': academicYear,
						},
					],
				};

				const user = await models.User.findOne(userFilters)
					.select('-password -defaultPassword')
					.lean();

				if (!user) {
					return NextResponse.json({
						success: true,
						message: 'User not found or access denied.',
						data: null,
					});
				}

				// Apply privacy filtering
				let filteredUser: any;

				if (user.role === 'student') {
					const isCurrentYear = academicYear === currentAcademicYear;
					filteredUser = formatStudentData(user, academicYear, isCurrentYear);
				} else if (user.role === 'teacher') {
					const yearDataTeacher = user.subjects?.find(
						(s: any) => s.year === academicYear,
					);
					const classData = yearDataTeacher?.classes?.find(
						(c: any) => c.classId === myClassId,
					);

					filteredUser = {
						id: user._id.toString(),
						firstName: user.firstName,
						lastName: user.lastName,
						fullName: user.fullName,
						email: user.email,
						phone: user.phone,
						avatar: user.avatar || user.profilePictureUrl,
						bio: user.bio,
						nickName: user.nickName,
						gender: user.gender,
						subjects: classData?.subjects || [],
						role: 'teacher',
					};
				} else if (user.role === 'administrator') {
					filteredUser = {
						id: user._id.toString(),
						firstName: user.firstName,
						lastName: user.lastName,
						email: user.email,
						phone: user.phone,
						avatar: user.avatar || user.profilePictureUrl,
						bio: user.bio,
						nickName: user.nickName,
						gender: user.gender,
						position: user.position,
						role: 'administrator',
					};
				}

				return NextResponse.json({
					success: true,
					message: 'User Fetch Successful',
					data: filteredUser,
				});
			}

			// --- FETCH ALL (CLASSMATES, TEACHERS, ADMINS) ---
			// Fetch students who were in the same class during the same academic year
			const classmates = await models.User.find({
				role: 'student',
				_id: { $ne: currentUser.id },
				academicYears: {
					$elemMatch: {
						year: academicYear,
						classId: myClassId,
					},
				},
			})
				.limit(limit)
				.select('-password -defaultPassword')
				.lean();

			const teachers = await models.User.find({
				role: 'teacher',
				subjects: {
					$elemMatch: {
						year: academicYear,
						'classes.classId': myClassId,
					},
				},
			})
				.select('-password -defaultPassword')
				.lean();

			const administrators = await models.User.find({
				role: 'administrator',
				'academicYears.year': academicYear,
			})
				.select('-password -defaultPassword')
				.lean();

			// Apply privacy filters
			const isCurrentYear = academicYear === currentAcademicYear;
			const filteredData = {
				students: classmates.map((s: any) =>
					formatStudentData(s, academicYear, isCurrentYear),
				),
				teachers: teachers.map((t: any) => {
					// Only show subjects the teacher teaches in this student's class
					const yearDataTeacher = t.subjects?.find(
						(s: any) => s.year === academicYear,
					);
					const classData = yearDataTeacher?.classes?.find(
						(c: any) => c.classId === myClassId,
					);

					return {
						id: t._id.toString(),
						firstName: t.firstName,
						lastName: t.lastName,
						fullName: t.fullName,
						email: t.email,
						phone: t.phone,
						avatar: t.avatar || t.profilePictureUrl,
						bio: t.bio,
						nickName: t.nickName,
						gender: t.gender,
						subjects: classData?.subjects || [],
						role: 'teacher',
					};
				}),
				administrators: administrators.map((a: any) => ({
					id: a._id.toString(),
					firstName: a.firstName,
					lastName: a.lastName,
					fullName: a.fullName,
					email: a.email,
					phone: a.phone,
					avatar: a.avatar || a.profilePictureUrl,
					bio: a.bio,
					nickName: a.nickName,
					gender: a.gender,
					position: a.position,
					role: 'administrator',
				})),
			};

			return NextResponse.json({
				success: true,
				message: 'User Fetch Successful',
				data: filteredData,
			});
		}

		// ========================================================================
		// 2. TEACHER ROLE - Can fetch students they teach, other teachers, and administrators
		//    from academic years they taught
		// ========================================================================
		if (currentUser.role === 'teacher') {
			const teacherData = await models.Teacher.findById(currentUser.id).lean();

			if (!teacherData) {
				return NextResponse.json(
					{ success: false, message: 'Teacher profile not found' },
					{ status: 404 },
				);
			}

			// Get teacher's assignment for the requested academic year
			const yearAssignment = teacherData.subjects.find(
				(assignment: any) => assignment.year === academicYear,
			);

			if (!yearAssignment) {
				return NextResponse.json(
					{
						success: false,
						message: 'You were not assigned to this academic year',
					},
					{ status: 403 },
				);
			}

			// Get all class IDs the teacher taught in this academic year
			const teacherClassIds = yearAssignment.classes.map((c: any) => c.classId);

			// --- FETCH ONLY STUDENTS ---
			if (role === 'student') {
				// Build filters for students the teacher can access
				const filters: Record<string, any> = {
					role: 'student',
				};

				// If specific student ID requested
				if (targetId) {
					filters._id = targetId;
				}

				// If specific class requested
				if (classId) {
					// Verify teacher taught this class in the requested year
					if (!teacherClassIds.includes(classId)) {
						return NextResponse.json({
							success: true,
							message: 'No access to students in this class for this year.',
							data: [],
						});
					}
					Object.assign(
						filters,
						buildStudentAcademicYearClassFilter(academicYear, classId),
					);
				} else {
					// Otherwise, only show students from classes the teacher taught
					Object.assign(
						filters,
						buildStudentAcademicYearClassFilter(academicYear, teacherClassIds),
					);
				}

				const students = await models.User.find(filters)
					.limit(limit)
					.select('-password -defaultPassword')
					.lean();

				const isCurrentYear = academicYear === currentAcademicYear;
				responseData = students.map((s: any) =>
					formatStudentData(s, academicYear, isCurrentYear),
				);

				return NextResponse.json({
					success: true,
					message: 'User Fetch Successful',
					data: responseData,
				});
			}

			// --- FETCH ONLY TEACHERS ---
			if (role === 'teacher') {
				const filters: Record<string, any> = {
					role: 'teacher',
					_id: { $ne: currentUser.id }, // Exclude self
					'subjects.year': academicYear,
				};

				if (targetId) {
					filters._id = targetId;
				}

				const teachers = await models.User.find(filters)
					.limit(limit)
					.select('-password -defaultPassword')
					.lean();

				return NextResponse.json({
					success: true,
					message: 'User Fetch Successful',
					data: teachers,
				});
			}

			// --- FETCH ONLY ADMINISTRATORS ---
			if (role === 'administrator') {
				const filters: Record<string, any> = {
					role: 'administrator',
					'academicYears.year': academicYear,
				};

				if (targetId) {
					filters._id = targetId;
				}

				const administrators = await models.User.find(filters)
					.limit(limit)
					.select('-password -defaultPassword')
					.lean();

				return NextResponse.json({
					success: true,
					message: 'User Fetch Successful',
					data: administrators,
				});
			}

			// --- FETCH SPECIFIC USER BY ID ---
			if (targetId) {
				// Teachers can access: their students, other teachers, and administrators
				// from the requested academic year
				const userFilters: any = {
					_id: targetId,
					$or: [
						// Students from classes they taught in this year
						{
							role: 'student',
							...buildStudentAcademicYearClassFilter(
								academicYear,
								teacherClassIds,
							),
						},
						// Other teachers who taught in this year
						{
							role: 'teacher',
							'subjects.year': academicYear,
						},
						// Administrators who were at the school in this year
						{
							role: 'administrator',
							'academicYears.year': academicYear,
						},
					],
				};

				const user = await models.User.findOne(userFilters)
					.select('-password -defaultPassword')
					.lean();

				if (!user) {
					return NextResponse.json({
						success: true,
						message: 'User not found or access denied.',
						data: null,
					});
				}

				// Format student data based on year
				if (user.role === 'student') {
					const isCurrentYear = academicYear === currentAcademicYear;
					responseData = formatStudentData(user, academicYear, isCurrentYear);
				} else {
					responseData = user;
				}

				return NextResponse.json({
					success: true,
					message: 'User Fetch Successful',
					data: responseData,
				});
			}

			// --- FETCH ALL (STUDENTS, TEACHERS, ADMINS) ---
			const students = await models.User.find({
				role: 'student',
				...buildStudentAcademicYearClassFilter(academicYear, teacherClassIds),
			})
				.limit(limit)
				.select('-password -defaultPassword')
				.lean();

			const teachers = await models.User.find({
				role: 'teacher',
				_id: { $ne: currentUser.id },
				'subjects.year': academicYear,
			})
				.select('-password -defaultPassword')
				.lean();

			const administrators = await models.User.find({
				role: 'administrator',
				'academicYears.year': academicYear,
			})
				.select('-password -defaultPassword')
				.lean();

			const isCurrentYear = academicYear === currentAcademicYear;
			const allData = {
				students: students.map((s: any) =>
					formatStudentData(s, academicYear, isCurrentYear),
				),
				teachers: teachers,
				administrators: administrators,
			};

			return NextResponse.json({
				success: true,
				message: 'User Fetch Successful',
				data: allData,
			});
		}

		// ========================================================================
		// 3. ADMINISTRATOR ROLE - Can fetch all users except system_admins
		//    from academic years they worked
		// ========================================================================
		if (currentUser.role === 'administrator') {
			const adminData = await models.Administrator.findById(
				currentUser.id,
			).lean();

			if (!adminData) {
				return NextResponse.json(
					{ success: false, message: 'Administrator profile not found' },
					{ status: 404 },
				);
			}

			// Verify administrator worked during the requested academic year
			const yearData = adminData.academicYears?.find(
				(ay: any) => ay.year === academicYear,
			);

			if (!yearData) {
				return NextResponse.json(
					{
						success: false,
						message: 'You were not assigned to this academic year',
					},
					{ status: 403 },
				);
			}

			const filters: Record<string, any> = {
				role: { $ne: 'system_admin' }, // Exclude system_admins
			};

			// Apply role filter if provided (but never allow system_admin)
			if (role) {
				if (role === 'system_admin') {
					return NextResponse.json({
						success: true,
						message: 'Access denied to system admin records.',
						data: [],
					});
				}
				filters.role = role;
			}

			// Apply target ID filter if provided
			if (targetId) {
				filters._id = targetId;
			}

			// Text search across name/username/email/phone fields
			if (searchQuery) {
				const escapedSearch = searchQuery.replace(
					/[.*+?^${}()|[\]\\]/g,
					(ch) => `\\${ch}`,
				);
				filters.$or = [
					...((filters.$or as any[]) || []),
					{ firstName: { $regex: escapedSearch, $options: 'i' } },
					{ middleName: { $regex: escapedSearch, $options: 'i' } },
					{ lastName: { $regex: escapedSearch, $options: 'i' } },
					{ fullName: { $regex: escapedSearch, $options: 'i' } },
					{ username: { $regex: escapedSearch, $options: 'i' } },
					{ email: { $regex: escapedSearch, $options: 'i' } },
					{ phone: { $regex: escapedSearch, $options: 'i' } },
				];
			}

			// Filter by academic year based on role
			if (role) {
				if (role === 'teacher') {
					if (classId) {
						filters.subjects = {
							$elemMatch: {
								year: academicYear,
								'classes.classId': classId,
							},
						};
					} else {
						filters['subjects.year'] = academicYear;
					}
				} else if (role === 'student') {
					Object.assign(
						filters,
						buildStudentAcademicYearClassFilter(
							academicYear,
							classId || undefined,
						),
					);
				} else if (role === 'parent') {
					// Parents are not scoped by academic year
				} else {
					filters['academicYears.year'] = academicYear;
				}
			} else {
				if (classId) {
					filters.$or = [
						...((filters.$or as any[]) || []),
						{
							role: 'student',
							...buildStudentAcademicYearClassFilter(academicYear, classId),
						},
						{
							role: 'teacher',
							subjects: {
								$elemMatch: {
									year: academicYear,
									'classes.classId': classId,
								},
							},
						},
					];
				} else {
					filters.$or = [
						...((filters.$or as any[]) || []),
						// Students and administrators
						{
							role: { $in: ['student', 'administrator'] },
							'academicYears.year': academicYear,
						},
						// Teachers
						{
							role: 'teacher',
							'subjects.year': academicYear,
						},
						// Parents (not scoped by academic year)
						{ role: 'parent' },
					];
				}
			}

			responseData = await models.User.find(filters)
				.sort({ _id: 1 })
				.skip(skip)
				.limit(limit)
				.select('-password -defaultPassword')
				.lean();

			responseData = Array.isArray(responseData)
				? responseData.map((u: any) =>
						applyStudentPhonePrivacy(u, academicYear, {
							includeUsername: true,
							restrictPhone: false,
						}),
					)
				: applyStudentPhonePrivacy(responseData, academicYear, {
						includeUsername: true,
						restrictPhone: false,
					});

			// Attach linked parent accounts to student rows + hydrate parent children
			if (includeParents) {
				responseData = await hydrateParentRelationships(
					models,
					responseData,
				);
			}

			let meta;
			if (includeCounts) {
				const [total, counts] = await Promise.all([
					models.User.countDocuments(filters),
					models.User.aggregate([
						{ $match: filters },
						{ $group: { _id: '$role', count: { $sum: 1 } } },
					]),
				]);
				const roleCounts: Record<string, number> = {};
				counts.forEach((entry: any) => {
					if (entry?._id) roleCounts[entry._id] = entry.count;
				});
				meta = { total, counts: roleCounts, page, limit };
			}

			return NextResponse.json({
				success: true,
				message: 'User Fetch Successful',
				data: responseData,
				...(meta ? { meta } : {}),
			});
		}

		// ========================================================================
		// 4. SYSTEM_ADMIN ROLE - Can fetch all users from any academic year
		//    but exclude other system_admins from results
		// ========================================================================
		if (currentUser.role === 'system_admin') {
			const filters: Record<string, any> = {
				role: { $ne: 'system_admin' }, // Exclude other system_admins
			};

			// Apply role filter if provided (but never allow system_admin)
			if (role) {
				if (role === 'system_admin') {
					return NextResponse.json({
						success: true,
						message: 'Access denied to system admin records.',
						data: [],
					});
				}
				filters.role = role;
			}

			// Apply target ID filter if provided
			if (targetId) {
				filters._id = targetId;
			}

			// Text search across name/username/email/phone fields
			if (searchQuery) {
				const escapedSearch = searchQuery.replace(
					/[.*+?^${}()|[\]\\]/g,
					(ch) => `\\${ch}`,
				);
				filters.$or = [
					...((filters.$or as any[]) || []),
					{ firstName: { $regex: escapedSearch, $options: 'i' } },
					{ middleName: { $regex: escapedSearch, $options: 'i' } },
					{ lastName: { $regex: escapedSearch, $options: 'i' } },
					{ fullName: { $regex: escapedSearch, $options: 'i' } },
					{ username: { $regex: escapedSearch, $options: 'i' } },
					{ email: { $regex: escapedSearch, $options: 'i' } },
					{ phone: { $regex: escapedSearch, $options: 'i' } },
				];
			}

			// Filter by academic year based on role
			if (role) {
				if (role === 'teacher') {
					if (classId) {
						filters.subjects = {
							$elemMatch: {
								year: academicYear,
								'classes.classId': classId,
							},
						};
					} else {
						filters['subjects.year'] = academicYear;
					}
				} else if (role === 'student') {
					Object.assign(
						filters,
						buildStudentAcademicYearClassFilter(
							academicYear,
							classId || undefined,
						),
					);
				} else if (role === 'parent') {
					// Parents are not scoped by academic year
				} else {
					filters['academicYears.year'] = academicYear;
				}
			} else {
				if (classId) {
					filters.$or = [
						...((filters.$or as any[]) || []),
						{
							role: 'student',
							...buildStudentAcademicYearClassFilter(academicYear, classId),
						},
						{
							role: 'teacher',
							subjects: {
								$elemMatch: {
									year: academicYear,
									'classes.classId': classId,
								},
							},
						},
					];
				} else {
					filters.$or = [
						...((filters.$or as any[]) || []),
						// Students and administrators
						{
							role: { $in: ['student', 'administrator'] },
							'academicYears.year': academicYear,
						},
						// Teachers
						{
							role: 'teacher',
							'subjects.year': academicYear,
						},
						// Parents (not scoped by academic year)
						{ role: 'parent' },
					];
				}
			}

			responseData = await models.User.find(filters)
				.sort({ _id: 1 })
				.skip(skip)
				.limit(limit)
				.select('-password -defaultPassword')
				.lean();

			responseData = Array.isArray(responseData)
				? responseData.map((u: any) =>
						applyStudentPhonePrivacy(u, academicYear, {
							includeUsername: true,
							restrictPhone: false,
						}),
					)
				: applyStudentPhonePrivacy(responseData, academicYear, {
						includeUsername: true,
						restrictPhone: false,
					});

			// Attach linked parent accounts to student rows + hydrate parent children
			if (includeParents) {
				responseData = await hydrateParentRelationships(
					models,
					responseData,
				);
			}

			let meta;
			if (includeCounts) {
				const [total, counts] = await Promise.all([
					models.User.countDocuments(filters),
					models.User.aggregate([
						{ $match: filters },
						{ $group: { _id: '$role', count: { $sum: 1 } } },
					]),
				]);
				const roleCounts: Record<string, number> = {};
				counts.forEach((entry: any) => {
					if (entry?._id) roleCounts[entry._id] = entry.count;
				});
				meta = { total, counts: roleCounts, page, limit };
			}

			return NextResponse.json({
				success: true,
				message: 'User Fetch Successful',
				data: responseData,
				...(meta ? { meta } : {}),
			});
		}

		// ========================================================================
		// FALLBACK - Unknown role
		// ========================================================================
		return NextResponse.json(
			{ success: false, message: 'Invalid user role' },
			{ status: 403 },
		);
	} catch (err) {
		console.error('Error in GET /users:', err);

		return NextResponse.json(
			{ success: false, message: 'An error occurred' },
			{ status: 500 },
		);
	}
}

interface ConflictDetails {
	type: 'subject' | 'sponsorship' | 'self_contained_conflict';
	conflictingTeacher: {
		id: string;
		name: string;
		teacherUsername: string;
	};
	assignment?: {
		year: string;
		classId: string;
		subjects: string[];
	};
	sponsorClass?: string;
}

interface ValidationErrorWithConflicts extends ValidationError {
	conflicts?: ConflictDetails[];
	requiresConfirmation?: boolean;
}

// --- POST Handler ---
export async function POST(request: NextRequest) {
	try {
		// Only system admins can create new users
		const currentUser = await authorizeUser(request, ['system_admin', 'superadmin']);

		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		// --- Superadmin: create system_admin in a specific school ---
		if (currentUser.role === 'superadmin') {
			const { searchParams } = new URL(request.url);
			const hostParam = searchParams.get('host');
			if (!hostParam) {
				return NextResponse.json(
					{ success: false, message: 'host query parameter is required for superadmin' },
					{ status: 400 },
				);
			}

			const cleanHost = normalizeHost(hostParam);
			const { SchoolProfile } = await getSchoolMeshModels();
			const school = await SchoolProfile.findOne({ 'system.host': cleanHost })
				.select('system.dbName system.host identity.currentAcademicYear')
				.lean()
				.exec();			if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

			const connection = await getTenantConnectionByDbName(
				(school as any).system?.dbName,
			);
			if (!connection) return NextResponse.json({ error: 'Could not connect to school database' }, { status: 500 });

			const User = (connection.models.User || connection.model('User', UserSchema)) as any;
			if (!User.discriminators?.system_admin) {
				User.discriminator('system_admin', SystemAdminSchema);
			}

			const body = await request.json();
			const { firstName, middleName, lastName, phone, email, gender, dateOfBirth, address } = body;

			if (!firstName || !lastName || !phone) {
				return NextResponse.json({ error: 'firstName, lastName, and phone are required' }, { status: 400 });
			}

			const username = await generateUniqueUsername(User.discriminators.system_admin);
			const defaultPassword = username;
			const hashedPassword = await bcrypt.hash(defaultPassword, 12);
			const fullName = middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;

			const admin = await User.discriminators.system_admin.create({
				role: 'system_admin',
				firstName,
				middleName: middleName || '',
				lastName,
				fullName,
				username,
				password: hashedPassword,
				defaultPassword,
				mustChangePassword: true,
				phone,
				...(email ? { email } : {}),
				gender: gender || 'Other',
				dateOfBirth: dateOfBirth || '2000-01-01',
				address: address || '',
				isActive: true,
				createdAt: new Date(),
			});

			const tenantId = resolveTenantSyncKey({
				schoolProfile: school,
				host: cleanHost,
			});
			const activeAcademicYear = String((school as any).currentAcademicYear || getAcademicYear());
			const realtimeUser = buildRealtimeUserPayload(admin.toObject());
			await bumpUsersVersionForTenantConnection(connection, [activeAcademicYear]);
			await publishSyncEventSafe({
				tenantId,
				domain: 'users',
				academicYear: activeAcademicYear,
				actorId: currentUser.id,
				reason: 'user-created',
				payload: {
					userId: String(realtimeUser.id || admin._id),
					user: realtimeUser,
					targetUserIds: [String(realtimeUser.id || admin._id)],
				},
			});

			return NextResponse.json({
				user: {
					_id: admin._id,
					firstName: admin.firstName,
					lastName: admin.lastName,
					fullName: admin.fullName,
					username: admin.username,
					phone: admin.phone,
					email: admin.email,
					isActive: admin.isActive,
					generatedCredentials: {
						username,
						defaultPassword,
						note: 'User must change password on first login',
					},
				},
			}, { status: 201 });
		}

		const host = request.headers.get('host');
		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const tenantId = resolveTenantSyncKey({
			schoolProfile,
			tenantId: currentUser.tenantId,
			host,
		});

		const models = await getTenantModels(host);
		const {
			forceAssignments = false,
			confirmReassignments = false,
			...userData
		} = await request.json();

		// Validate user data
		const validationErrors = await validateUserData(
			userData,
			models,
			false,
			null,
			forceAssignments,
		);

		// Separate conflict errors from other errors
		const conflictErrors = validationErrors.filter(
			(error) => error.requiresConfirmation,
		);

		// If there are conflicts and user hasn't confirmed reassignments, return conflicts
		if (conflictErrors.length > 0 && !confirmReassignments) {
			const allConflicts = conflictErrors.reduce((acc, error) => {
				if (error.conflicts) acc.push(...error.conflicts);
				return acc;
			}, [] as ConflictDetails[]);

			return NextResponse.json(
				{
					success: false,
					message: 'Assignment conflicts detected. Please confirm to reassign.',
					requiresConfirmation: true,
					errors: validationErrors,
					conflicts: allConflicts,
					conflictSummary: {
						sponsorshipConflicts: allConflicts.filter(
							(c) => c.type === 'sponsorship',
						).length,
						subjectConflicts: allConflicts.filter((c) => c.type === 'subject')
							.length,
						totalConflicts: allConflicts.length,
					},
				},
				{ status: 409 },
			);
		}

		// Collect conflicts to handle if user confirmed reassignments
		let conflictsToHandle: ConflictDetails[] = [];
		if (confirmReassignments && conflictErrors.length > 0) {
			conflictsToHandle = conflictErrors.reduce((acc, error) => {
				if (error.conflicts) acc.push(...error.conflicts);
				return acc;
			}, [] as ConflictDetails[]);
		}

		// Check for non-conflict errors (these cannot be bypassed)
		const nonConflictErrors = validationErrors.filter(
			(error) => !error.requiresConfirmation,
		);
		if (nonConflictErrors.length > 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Validation failed. Please correct the errors and try again.',
					errors: nonConflictErrors,
				},
				{ status: 400 },
			);
		}

		// Handle force reassignments if confirmed
		if (confirmReassignments && conflictsToHandle.length > 0) {
			await handleForceReassignmentEnhanced(
				userData,
				models,
				null,
				conflictsToHandle,
				userData.username,
			);
		}

		// Build and create the new user (retry on duplicate username)
		let finalUserData: any = null;
		let newUser: any = null;
		for (let attempt = 0; attempt < 3; attempt++) {
			finalUserData = await buildUserData(models, userData, currentUser);
			try {
				newUser = await models.User.create(finalUserData);
				break;
			} catch (error: any) {
				if (
					error?.code === 11000 &&
					(error?.keyPattern?.username || error?.keyValue?.username)
				) {
					if (attempt === 2) {
						throw error;
					}
					continue;
				}
				throw error;
			}
		}
		// Link or create the parent for this student (replaces the legacy embedded guardian)
		let linkedParent: any = null;
		if (userData.role === 'student') {
			try {
				linkedParent = await attachOrCreateParent(
					models,
					userData.parent,
					newUser.studentId,
					currentUser,
				);
			} catch (parentError: any) {
				// Roll back the student if parent linking fails (keeps creation atomic)
				await models.Student.deleteOne({ _id: newUser._id }).catch(() => {});
				throw parentError;
			}
		}
		const userResponse = newUser.toObject();

		// Remove sensitive data
		delete userResponse?.password;
		const responseData = {
			...userResponse,
			generatedCredentials: {
				username: finalUserData.username,
				defaultPassword:
					finalUserData.defaultPassword || finalUserData.username,
				note: 'User must change password on first login',
			},
		};
		delete responseData.defaultPassword;

		const createdUserYears = extractAcademicYears(newUser);
		const realtimeUser = buildRealtimeUserPayload(newUser.toObject());
		await bumpUsersVersion(createdUserYears);
		await publishSyncEventsForAcademicYearsSafe({
			tenantId,
			domain: 'users',
			academicYears: createdUserYears,
			payload: {
				user: realtimeUser,
				userId: String(realtimeUser.id || ''),
				targetUserIds: [String(realtimeUser.id || '')],
			},
			actorId: currentUser.id,
			reason: 'user-created',
		});

		return NextResponse.json(
			{
				success: true,
				message: `${
					userData.role.charAt(0).toUpperCase() + userData.role.slice(1)
				} created successfully.`,
				data: { user: responseData },
				reassignments:
					conflictsToHandle.length > 0
						? {
								performed: true,
								count: conflictsToHandle.length,
								details: conflictsToHandle.map((conflict) => ({
									type: conflict.type,
									previousTeacher: conflict.conflictingTeacher,
									reassignedFrom:
										conflict.type === 'sponsorship'
											? conflict.sponsorClass
											: conflict.assignment,
								})),
							}
						: null,
			},
			{ status: 201 },
		);
	} catch (error: any) {
		console.error('API Error in POST /users:', error);

		if (error instanceof Error && error.message.includes('session')) {
			return NextResponse.json(
				{ success: false, message: 'Authentication required' },
				{ status: 401 },
			);
		}

		if (error instanceof Error && error.message.includes('Unauthorized')) {
			return NextResponse.json(
				{ success: false, message: error.message },
				{ status: 403 },
			);
		}

		if (error.code === 11000) {
			const field = Object.keys(error.keyPattern || {})[0];
			return NextResponse.json(
				{
					success: false,
					message: `A user with this ${field || 'information'} already exists.`,
				},
				{ status: 400 },
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: error.message || 'Internal server error',
			},
			{ status: 500 },
		);
	}
}

// --- PUT Handler ---
export async function PUT(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request);

		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const { searchParams } = new URL(request.url);

		// --- Superadmin: update system_admin in a specific school ---
		if (currentUser.role === 'superadmin') {
			const hostParam = searchParams.get('host');
			const targetUserId = searchParams.get('id');
			if (!hostParam) {
				return NextResponse.json(
					{ success: false, message: 'host query parameter is required for superadmin' },
					{ status: 400 },
				);
			}
			if (!targetUserId) {
				return NextResponse.json(
					{ success: false, message: 'id query parameter is required' },
					{ status: 400 },
				);
			}

			const cleanHost = normalizeHost(hostParam);
			const { SchoolProfile } = await getSchoolMeshModels();
			const school = await SchoolProfile.findOne({ 'system.host': cleanHost })
				.select('system.dbName system.host identity.currentAcademicYear')
				.lean()
				.exec();			if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

			const connection = await getTenantConnectionByDbName(
				(school as any).system?.dbName,
			);
			if (!connection) return NextResponse.json({ error: 'Could not connect to school database' }, { status: 500 });

			const User = (connection.models.User || connection.model('User', UserSchema)) as any;
			if (!User.discriminators?.system_admin) {
				User.discriminator('system_admin', SystemAdminSchema);
			}

			const body = await request.json();
			const existing = await User.discriminators.system_admin.findById(targetUserId).lean().exec();
			if (!existing) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

			const allowedFields = ['firstName', 'middleName', 'lastName', 'phone', 'email', 'gender', 'dateOfBirth', 'address', 'isActive'];
			const requiredProfileFields = new Set(['gender', 'dateOfBirth', 'address']);
			const updateData: any = {};
			for (const field of allowedFields) {
				if (body[field] === undefined) continue;
				if (
					requiredProfileFields.has(field) &&
					typeof body[field] === 'string' &&
					body[field].trim() === ''
				) {
					continue;
				}
				updateData[field] = body[field];
			}
			if (body.action === 'toggle_active' && body.isActive === undefined) {
				updateData.isActive = existing.isActive === false;
			}
			if (body.firstName !== undefined || body.middleName !== undefined || body.lastName !== undefined) {
				const fn = body.firstName !== undefined ? body.firstName : existing.firstName;
				const mn = body.middleName !== undefined ? body.middleName : existing.middleName;
				const ln = body.lastName !== undefined ? body.lastName : existing.lastName;
				updateData.fullName = mn ? `${fn} ${mn} ${ln}` : `${fn} ${ln}`;
			}

			const admin = await User.discriminators.system_admin.findByIdAndUpdate(
				targetUserId,
				{ $set: updateData },
				{ new: true, runValidators: true },
			).lean();

			if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

			const tenantId = resolveTenantSyncKey({
				schoolProfile: school,
				host: cleanHost,
			});
			const activeAcademicYear = String((school as any).currentAcademicYear || getAcademicYear());
			const realtimeUser = buildRealtimeUserPayload(admin);
			const deactivatedNow = existing.isActive !== false && admin.isActive === false;
			await bumpUsersVersionForTenantConnection(connection, [activeAcademicYear]);
			if (deactivatedNow) {
				await destroyAllUserSessions(targetUserId, undefined, {
					tenantId: cleanHost,
				});
			} else {
				await updateAllUserSessions(targetUserId, buildUserResponse(admin), {
					tenantId: cleanHost,
				});
			}
			await publishSyncEventSafe({
				tenantId,
				domain: 'users',
				academicYear: activeAcademicYear,
				actorId: currentUser.id,
				reason: deactivatedNow ? 'account-deactivated' : 'user-updated',
				payload: {
					userId: String(realtimeUser.id || admin._id),
					user: realtimeUser,
					targetUserIds: [String(realtimeUser.id || admin._id)],
				},
			});

			return NextResponse.json({ user: admin });
		}

		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const tenantId = resolveTenantSyncKey({
			schoolProfile,
			tenantId: currentUser.tenantId,
			host: request.headers.get('host'),
		});

		const models = await getTenantModels();
		const targetUserId = searchParams.get('id');
		const resetPassword = searchParams.get('resetPassword') === 'true';
		const action = searchParams.get('action');
		const promotionType = searchParams.get('type') as
			| 'yearlyPromotion'
			| 'doublePromotion'
			| 'yearlyDemotion'
			| 'semesterDemotion';

		const actualTargetUserId = targetUserId || currentUser.id;
		const currentSessionId = request.cookies.get('sessionId')?.value || '';

		// --- Handle Promotion ---
		if (action === 'promote') {
			if (currentUser.role !== 'system_admin') {
				return NextResponse.json(
					{
						success: false,
						message:
							'Unauthorized: Only system administrators can promote students',
					},
					{ status: 403 },
				);
			}

			if (!targetUserId) {
				return NextResponse.json(
					{
						success: false,
						message: 'Student ID is required for promotion',
					},
					{ status: 400 },
				);
			}

			if (
				!promotionType ||
				!['yearlyPromotion', 'doublePromotion'].includes(promotionType)
			) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Valid promotion type is required (yearlyPromotion or doublePromotion)',
					},
					{ status: 400 },
				);
			}

			const student = await models.Student.findById(targetUserId);
			if (!student) {
				return NextResponse.json(
					{ success: false, message: 'Student not found' },
					{ status: 404 },
				);
			}

			if (student.role !== 'student') {
				return NextResponse.json(
					{ success: false, message: 'User is not a student' },
					{ status: 400 },
				);
			}

			// Get promotion details from request body
			const { promotedToClassId, promotedToClassName, newAcademicYear } =
				await request.json();

			if (!promotedToClassId || !promotedToClassName) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Promoted class information is required (promotedToClassId, promotedToClassName)',
					},
					{ status: 400 },
				);
			}

			if (promotionType === 'yearlyPromotion' && !newAcademicYear) {
				return NextResponse.json(
					{
						success: false,
						message: 'New academic year is required for yearly promotion',
					},
					{ status: 400 },
				);
			}

			const schoolProfile = await getSchoolProfile();
			if (promotionType === 'yearlyPromotion') {
				const studentLatestAcademicYear =
					getLatestAcademicYearFromValues(
						(student.academicYears || []).map((ay: any) => ay?.year),
					) ||
					student.enrollmentYear ||
					schoolProfile?.identity.currentAcademicYear ||
					getAcademicYear();
				const latestStart = getAcademicYearStart(studentLatestAcademicYear);
				const newStart = getAcademicYearStart(newAcademicYear);
				if (
					latestStart === null ||
					newStart === null ||
					newStart <= latestStart
				) {
					return NextResponse.json(
						{
							success: false,
							message:
								"Yearly promotions must use an academic year later than the student's latest academic year.",
						},
						{ status: 400 },
					);
				}
			}
			const classLevels = schoolProfile?.classLevels;
			const currentMeta = getClassMetaById(classLevels, student.classId);
			const targetMeta = getClassMetaById(classLevels, promotedToClassId);

			if (currentMeta && isAtHighestClass(classLevels, currentMeta.classId)) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Cannot promote this student because they are already in the highest possible class.',
					},
					{ status: 400 },
				);
			}

			if (currentMeta && targetMeta) {
				if (currentMeta.baseName === targetMeta.baseName) {
					return NextResponse.json(
						{
							success: false,
							message:
								'Cannot promote to a different section of the same class. Use class change instead.',
						},
						{ status: 400 },
					);
				}
				if (currentMeta.session !== targetMeta.session) {
					return NextResponse.json(
						{
							success: false,
							message: 'Promotion must remain within the same session.',
						},
						{ status: 400 },
					);
				}
				const ordered = getOrderedClassesForSession(
					classLevels,
					currentMeta.session,
				);
				const currentIndex = ordered.findIndex(
					(cls) => cls.classId === currentMeta.classId,
				);
				const targetIndex = ordered.findIndex(
					(cls) => cls.classId === targetMeta.classId,
				);
				if (
					currentIndex !== -1 &&
					targetIndex !== -1 &&
					targetIndex <= currentIndex
				) {
					return NextResponse.json(
						{
							success: false,
							message:
								'Promotion target must be a higher class than the current class.',
						},
						{ status: 400 },
					);
				}
			}

			try {
				const result = await promoteStudent(
					student,
					promotionType,
					promotedToClassId,
					promotedToClassName,
					newAcademicYear || null,
					models,
				);

				// Add notification
				await models.Student.updateOne(
					{ _id: targetUserId },
					{
						$push: {
							notifications: {
								title: 'Promotion',
								message: `You have been promoted to ${result.promotionDetails.toClass.className}`,
								details: `Promotion Type: ${
									promotionType === 'yearlyPromotion'
										? 'Yearly Promotion'
										: 'Double Promotion'
								}`,
								timestamp: new Date(),
								read: false,
								dismissed: false,
								type: 'Profile',
							},
						},
					},
				);

				await updateAllUserSessions(
					targetUserId,
					buildUserResponse(result.student.toObject()),
				);

				const promotionYears = extractAcademicYears(result.student);
				await bumpUsersVersion(promotionYears);
				await publishSyncEventsForAcademicYearsSafe({
					tenantId,
					domain: 'users',
					academicYears: promotionYears,
					actorId: currentUser.id,
					reason: 'student-promoted',
				});

				return NextResponse.json({
					success: true,
					message: `Student promoted successfully`,
					data: result,
				});
			} catch (error: any) {
				return NextResponse.json(
					{ success: false, message: error.message },
					{ status: 400 },
				);
			}
		}

		// --- Handle Demotion ---
		if (action === 'demote') {
			if (currentUser.role !== 'system_admin') {
				return NextResponse.json(
					{
						success: false,
						message:
							'Unauthorized: Only system administrators can demote students',
					},
					{ status: 403 },
				);
			}

			if (!targetUserId) {
				return NextResponse.json(
					{
						success: false,
						message: 'Student ID is required for demotion',
					},
					{ status: 400 },
				);
			}

			if (
				!promotionType ||
				!['yearlyDemotion', 'semesterDemotion'].includes(promotionType)
			) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Valid demotion type is required (yearlyDemotion or semesterDemotion)',
					},
					{ status: 400 },
				);
			}

			const student = await models.Student.findById(targetUserId);
			if (!student) {
				return NextResponse.json(
					{ success: false, message: 'Student not found' },
					{ status: 404 },
				);
			}

			if (student.role !== 'student') {
				return NextResponse.json(
					{ success: false, message: 'User is not a student' },
					{ status: 400 },
				);
			}

			// Get demotion details from request body
			const { demotedToClassId, demotedToClassName, previousAcademicYear } =
				await request.json();

			if (!demotedToClassId || !demotedToClassName) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Demoted class information is required (demotedToClassId, demotedToClassName)',
					},
					{ status: 400 },
				);
			}

			if (promotionType === 'yearlyDemotion' && !previousAcademicYear) {
				return NextResponse.json(
					{
						success: false,
						message: 'Previous academic year is required for yearly demotion',
					},
					{ status: 400 },
				);
			}

			const schoolProfile = await getSchoolProfile();
			const classLevels = schoolProfile?.classLevels;
			const currentMeta = getClassMetaById(classLevels, student.classId);
			const targetMeta = getClassMetaById(classLevels, demotedToClassId);

			if (currentMeta && targetMeta) {
				if (currentMeta.baseName === targetMeta.baseName) {
					return NextResponse.json(
						{
							success: false,
							message:
								'Cannot demote to a different section of the same class. Use class change instead.',
						},
						{ status: 400 },
					);
				}
				if (currentMeta.session !== targetMeta.session) {
					return NextResponse.json(
						{
							success: false,
							message: 'Demotion must remain within the same session.',
						},
						{ status: 400 },
					);
				}
				const ordered = getOrderedClassesForSession(
					classLevels,
					currentMeta.session,
				);
				const currentIndex = ordered.findIndex(
					(cls) => cls.classId === currentMeta.classId,
				);
				const targetIndex = ordered.findIndex(
					(cls) => cls.classId === targetMeta.classId,
				);
				if (
					currentIndex !== -1 &&
					targetIndex !== -1 &&
					targetIndex >= currentIndex
				) {
					return NextResponse.json(
						{
							success: false,
							message:
								'Demotion target must be a lower class than the current class.',
						},
						{ status: 400 },
					);
				}
			}

			try {
				const result = await demoteStudent(
					student,
					promotionType,
					demotedToClassId,
					demotedToClassName,
					previousAcademicYear || null,
					models,
				);

				// Add notification
				await models.Student.updateOne(
					{ _id: targetUserId },
					{
						$push: {
							notifications: {
								title: 'Class Change',
								message: `You have been moved to ${result.demotionDetails.toClass.className}`,
								details: `Change Type: ${
									promotionType === 'yearlyDemotion'
										? 'Yearly Demotion'
										: 'Semester Demotion'
								}`,
								timestamp: new Date(),
								read: false,
								dismissed: false,
								type: 'Profile',
							},
						},
					},
				);

				await updateAllUserSessions(
					targetUserId,
					buildUserResponse(result.student.toObject()),
				);

				const demotionYears = extractAcademicYears(result.student);
				await bumpUsersVersion(demotionYears);
				await publishSyncEventsForAcademicYearsSafe({
					tenantId,
					domain: 'users',
					academicYears: demotionYears,
					actorId: currentUser.id,
					reason: 'student-demoted',
				});

				return NextResponse.json({
					success: true,
					message: `Student class changed successfully`,
					data: result,
				});
			} catch (error: any) {
				return NextResponse.json(
					{ success: false, message: error.message },
					{ status: 400 },
				);
			}
		}

		// --- Handle Academic Year Carry-over (Teacher/Administrator) ---
		if (action === 'addAcademicYear') {
			if (currentUser.role !== 'system_admin') {
				return NextResponse.json(
					{
						success: false,
						message:
							'Unauthorized: Only system administrators can add academic year assignments',
					},
					{ status: 403 },
				);
			}

			if (!targetUserId) {
				return NextResponse.json(
					{
						success: false,
						message: 'User ID is required',
					},
					{ status: 400 },
				);
			}

			const targetRoleUser = await models.User.findById(targetUserId);
			if (!targetRoleUser) {
				return NextResponse.json(
					{ success: false, message: 'User not found' },
					{ status: 404 },
				);
			}

			if (
				targetRoleUser.role !== 'teacher' &&
				targetRoleUser.role !== 'administrator'
			) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Academic year carry-over is only supported for teachers and administrators.',
					},
					{ status: 400 },
				);
			}

			const carryOverPayload = await request.json();
			const {
				newAcademicYear,
				classes,
				sponsorClass,
				position,
				confirmReassignments = false,
			} = carryOverPayload || {};
			if (!newAcademicYear || typeof newAcademicYear !== 'string') {
				return NextResponse.json(
					{
						success: false,
						message: 'New academic year is required.',
					},
					{ status: 400 },
				);
			}

			const newStart = getAcademicYearStart(newAcademicYear);
			if (newStart === null) {
				return NextResponse.json(
					{
						success: false,
						message: 'Invalid academic year format.',
					},
					{ status: 400 },
				);
			}

			const schoolProfile = await getSchoolProfile();
			const normalizeSubjectList = (values: unknown[]) =>
				Array.from(
					new Set(
						(Array.isArray(values) ? values : [])
							.map((value) =>
								typeof value === 'string'
									? value.trim()
									: typeof (value as any)?.subject === 'string'
										? (value as any).subject.trim()
										: typeof (value as any)?.name === 'string'
											? (value as any).name.trim()
											: '',
							)
							.filter(Boolean),
					),
				);
			const normalizeTeacherClasses = (entries: unknown[]) => {
				const classMap = new Map<
					string,
					{ classId: string; className?: string; subjects: Set<string> }
				>();
				(Array.isArray(entries) ? entries : []).forEach((entry: any) => {
					const classId = String(entry?.classId || '').trim();
					if (!classId) return;
					const className =
						typeof entry?.className === 'string' && entry.className.trim()
							? entry.className.trim()
							: undefined;
					if (!classMap.has(classId)) {
						classMap.set(classId, {
							classId,
							...(className ? { className } : {}),
							subjects: new Set<string>(),
						});
					}
					const target = classMap.get(classId)!;
					if (!target.className && className) target.className = className;
					normalizeSubjectList(entry?.subjects || []).forEach((subject) =>
						target.subjects.add(subject),
					);
				});
				return Array.from(classMap.values())
					.map((entry) => ({
						classId: entry.classId,
						...(entry.className ? { className: entry.className } : {}),
						subjects: Array.from(entry.subjects),
					}))
					.filter((entry) => entry.subjects.length > 0)
					.sort((a, b) => a.classId.localeCompare(b.classId));
			};
			const hasPayloadProp = (key: string) =>
				Object.prototype.hasOwnProperty.call(carryOverPayload || {}, key);
			const buildConflictSummary = (conflicts: ConflictDetails[]) => ({
				sponsorshipConflicts: conflicts.filter((c) => c.type === 'sponsorship')
					.length,
				subjectConflicts: conflicts.filter((c) => c.type === 'subject').length,
				totalConflicts: conflicts.length,
			});

			if (targetRoleUser.role === 'teacher') {
				const existingSubjects = Array.isArray(targetRoleUser.subjects)
					? targetRoleUser.subjects
					: [];
				const latestAcademicYear =
					getLatestAcademicYearFromValues(
						existingSubjects.map((entry: any) => entry?.year),
					) ||
					schoolProfile?.identity.currentAcademicYear ||
					getAcademicYear();
				const latestStart = getAcademicYearStart(latestAcademicYear);

				if (latestStart === null || newStart <= latestStart) {
					return NextResponse.json(
						{
							success: false,
							message:
								"New academic year must be later than the teacher's latest academic year.",
						},
						{ status: 400 },
					);
				}

				const alreadyAssigned = existingSubjects.some(
					(entry: any) => entry?.year === newAcademicYear,
				);
				if (alreadyAssigned) {
					return NextResponse.json(
						{
							success: false,
							message: 'Teacher is already assigned to that academic year.',
						},
						{ status: 400 },
					);
				}

				const latestYearEntry = existingSubjects
					.filter((entry: any) => entry?.year)
					.sort(
						(a: any, b: any) =>
							(getAcademicYearStart(b.year) ?? -1) -
							(getAcademicYearStart(a.year) ?? -1),
					)[0];
				const clonedClasses = normalizeTeacherClasses(
					latestYearEntry?.classes || [],
				);
				const requestedClasses = normalizeTeacherClasses(classes || []);
				const classesForNewYear = hasPayloadProp('classes')
					? requestedClasses
					: clonedClasses;

				if (
					!Array.isArray(classesForNewYear) ||
					classesForNewYear.length === 0
				) {
					return NextResponse.json(
						{
							success: false,
							message:
								'At least one class/subject assignment is required for teacher carry-over.',
						},
						{ status: 400 },
					);
				}

				const sponsorClassForNewYear = hasPayloadProp('sponsorClass')
					? typeof sponsorClass === 'string' && sponsorClass.trim()
						? sponsorClass.trim()
						: null
					: targetRoleUser.sponsorClass || null;

				const teacherCarryOverData = {
					role: 'teacher',
					sponsorClass: sponsorClassForNewYear,
					subjects: [
						{
							year: newAcademicYear,
							classes: classesForNewYear,
						},
					],
				};
				const carryOverValidationErrors: ValidationErrorWithConflicts[] = [];
				await validateTeacherData(
					teacherCarryOverData,
					models,
					{ isActive: true, _id: { $ne: targetUserId } },
					carryOverValidationErrors,
					targetUserId,
				);

				const conflictErrors = carryOverValidationErrors.filter(
					(error) => error.requiresConfirmation,
				);
				if (conflictErrors.length > 0 && !confirmReassignments) {
					const allConflicts = conflictErrors.reduce((acc, error) => {
						if (error.conflicts) acc.push(...error.conflicts);
						return acc;
					}, [] as ConflictDetails[]);

					return NextResponse.json(
						{
							success: false,
							message:
								'Assignment conflicts detected. Please confirm to reassign.',
							requiresConfirmation: true,
							errors: carryOverValidationErrors,
							conflicts: allConflicts,
							conflictSummary: buildConflictSummary(allConflicts),
						},
						{ status: 409 },
					);
				}

				const nonConflictErrors = carryOverValidationErrors.filter(
					(error) => !error.requiresConfirmation,
				);
				if (nonConflictErrors.length > 0) {
					return NextResponse.json(
						{
							success: false,
							message:
								'Validation failed. Please correct the errors and try again.',
							errors: nonConflictErrors,
						},
						{ status: 400 },
					);
				}

				let conflictsToHandle: ConflictDetails[] = [];
				if (confirmReassignments && conflictErrors.length > 0) {
					conflictsToHandle = conflictErrors.reduce((acc, error) => {
						if (error.conflicts) acc.push(...error.conflicts);
						return acc;
					}, [] as ConflictDetails[]);

					await handleForceReassignmentEnhanced(
						teacherCarryOverData,
						models,
						targetUserId,
						conflictsToHandle,
						targetUser.username,
					);
				}

				const updatedTeacher = await models.Teacher.findByIdAndUpdate(
					targetUserId,
					{
						$push: {
							subjects: {
								year: newAcademicYear,
								classes: classesForNewYear,
							},
						},
						$set: {
							sponsorClass: sponsorClassForNewYear,
							updatedBy: currentUser.userId,
							updatedAt: new Date(),
						},
					},
					{ new: true, runValidators: true },
				).select('-password -defaultPassword');

				if (!updatedTeacher) {
					return NextResponse.json(
						{ success: false, message: 'User not found after update' },
						{ status: 404 },
					);
				}

				await updateAllUserSessions(
					targetUserId,
					buildUserResponse(updatedTeacher.toObject()),
				);

				const teacherCarryoverYears = extractAcademicYears(updatedTeacher);
				await bumpUsersVersion(teacherCarryoverYears);
				await publishSyncEventsForAcademicYearsSafe({
					tenantId,
					domain: 'users',
					academicYears: teacherCarryoverYears,
					actorId: currentUser.id,
					reason: 'teacher-academic-year-added',
				});

				return NextResponse.json({
					success: true,
					message: 'Teacher carried over to new academic year successfully.',
					data: { user: updatedTeacher },
					reassignments:
						conflictsToHandle.length > 0
							? {
									performed: true,
									count: conflictsToHandle.length,
									details: conflictsToHandle.map((conflict) => ({
										type: conflict.type,
										previousTeacher: conflict.conflictingTeacher,
										reassignedFrom:
											conflict.type === 'sponsorship'
												? conflict.sponsorClass
												: conflict.assignment,
									})),
								}
							: null,
				});
			}

			const existingAcademicYears = Array.isArray(targetRoleUser.academicYears)
				? targetRoleUser.academicYears
				: [];
			const latestAcademicYear =
				getLatestAcademicYearFromValues(
					existingAcademicYears.map((entry: any) => entry?.year),
				) ||
			schoolProfile?.identity.currentAcademicYear ||
			getAcademicYear();
		const latestStart = getAcademicYearStart(latestAcademicYear);

		if (latestStart === null || newStart <= latestStart) {
			return NextResponse.json(
				{
					success: false,
					message:
							"New academic year must be later than the administrator's latest academic year.",
					},
					{ status: 400 },
				);
			}

			const alreadyAssigned = existingAcademicYears.some(
				(entry: any) => entry?.year === newAcademicYear,
			);
			if (alreadyAssigned) {
				return NextResponse.json(
					{
						success: false,
						message: 'Administrator is already assigned to that academic year.',
					},
					{ status: 400 },
				);
			}

			const latestYearEntry = existingAcademicYears
				.filter((entry: any) => entry?.year)
				.sort(
					(a: any, b: any) =>
						(getAcademicYearStart(b.year) ?? -1) -
						(getAcademicYearStart(a.year) ?? -1),
				)[0];
			const positionForNewYear =
				typeof position === 'string' && position.trim()
					? position.trim()
					: latestYearEntry?.position || targetRoleUser.position || null;
			const existingClasses = Array.isArray(targetRoleUser.classes)
				? targetRoleUser.classes
				: [];
			const latestClassEntry = existingClasses
				.filter((entry: any) => entry?.year)
				.sort(
					(a: any, b: any) =>
						(getAcademicYearStart(b.year) ?? -1) -
						(getAcademicYearStart(a.year) ?? -1),
				)[0];
			const clonedClasses = normalizeTeacherClasses(
				latestClassEntry?.classes || [],
			);
			const requestedClasses = normalizeTeacherClasses(classes || []);
			const classesForNewYear = hasPayloadProp('classes')
				? requestedClasses
				: clonedClasses;
			if (positionForNewYear) {
				const positionConflict = await models.User.findOne({
					_id: { $ne: targetUserId },
					isActive: true,
					role: 'administrator',
					academicYears: {
						$elemMatch: {
							year: newAcademicYear,
							position: positionForNewYear,
						},
					},
				})
					.select('firstName middleName lastName fullName username')
					.lean();

				if (positionConflict) {
					const conflictName =
						positionConflict.fullName ||
						[
							positionConflict.firstName,
							positionConflict.middleName,
							positionConflict.lastName,
						]
							.filter(
								(part: unknown) => typeof part === 'string' && part.trim(),
							)
							.join(' ') ||
						'another administrator';
					return NextResponse.json(
						{
							success: false,
							message: `Position "${positionForNewYear}" is already held by ${conflictName} (${positionConflict.username}) for academic year ${newAcademicYear}.`,
						},
						{ status: 409 },
					);
				}
			}

			const adminPushFields: any = {
				academicYears: {
					year: newAcademicYear,
					position: positionForNewYear,
				},
			};
			if (classesForNewYear.length > 0) {
				adminPushFields.classes = {
					year: newAcademicYear,
					classes: classesForNewYear,
				};
			}

			const updatedAdministrator = await models.Administrator.findByIdAndUpdate(
				targetUserId,
				{
					$push: adminPushFields,
					$set: {
						...(positionForNewYear ? { position: positionForNewYear } : {}),
						updatedBy: currentUser.userId,
						updatedAt: new Date(),
					},
				},
				{ new: true, runValidators: true },
			).select('-password -defaultPassword');

			if (!updatedAdministrator) {
				return NextResponse.json(
					{ success: false, message: 'User not found after update' },
					{ status: 404 },
				);
			}

			await updateAllUserSessions(
				targetUserId,
				buildUserResponse(updatedAdministrator.toObject()),
			);

			const adminCarryoverYears = extractAcademicYears(updatedAdministrator);
			await bumpUsersVersion(adminCarryoverYears);
			await publishSyncEventsForAcademicYearsSafe({
				tenantId,
				domain: 'users',
				academicYears: adminCarryoverYears,
				actorId: currentUser.id,
				reason: 'administrator-academic-year-added',
			});

			return NextResponse.json({
				success: true,
				message:
					'Administrator carried over to new academic year successfully.',
				data: { user: updatedAdministrator },
			});
		}

		// --- Find target user ---
		const targetUser = await models.User.findById(actualTargetUserId);
		if (!targetUser) {
			return NextResponse.json(
				{ success: false, message: 'User not found' },
				{ status: 404 },
			);
		}

		// --- Handle Password Reset ---
		if (resetPassword) {
			if (currentUser.role !== 'system_admin') {
				return NextResponse.json(
					{
						success: false,
						message:
							'Unauthorized: Only system administrators can reset passwords',
					},
					{ status: 403 },
				);
			}

			if (currentUser.userId === actualTargetUserId) {
				return NextResponse.json(
					{
						success: false,
						message:
							'System administrators cannot reset their own password using this endpoint',
					},
					{ status: 400 },
				);
			}

			let defaultPassword: string;
			defaultPassword = targetUser.username;

			if (!defaultPassword) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Password reset failed: user is missing a default credential.',
					},
					{ status: 400 },
				);
			}

			defaultPassword = String(defaultPassword);

			const hashedPassword = await hashPassword(defaultPassword);

			const updateData = {
				password: hashedPassword,
				defaultPassword: defaultPassword,
				mustChangePassword: true,
				updatedBy: currentUser.userId,
				updatedAt: new Date(),
			};

			let ModelToUpdate = models.User;
			switch (targetUser.role) {
				case 'student':
					ModelToUpdate = models.Student;
					break;
				case 'teacher':
					ModelToUpdate = models.Teacher;
					break;
				case 'administrator':
					ModelToUpdate = models.Administrator;
					break;
				case 'system_admin':
					ModelToUpdate = models.SystemAdmin;
					break;
			}

			const updatedUser = await ModelToUpdate.findByIdAndUpdate(
				actualTargetUserId,
				{ $set: updateData },
				{
					new: true,
					runValidators: true,
				},
			).select('-password -defaultPassword');

			if (!updatedUser) {
				return NextResponse.json(
					{
						success: false,
						message: 'Password reset failed: User not found after update.',
					},
					{ status: 404 },
				);
			}

			await destroyAllUserSessions(actualTargetUserId);
			const actorName = getActorDisplayName(currentUser);

			await addNotificationToUser(
				models.User,
				actualTargetUserId,
				{
					title: 'Password Reset',
					message: `Your password was reset by ${actorName}. Please change it after logging in.`,
					timestamp: new Date(),
					read: false,
					dismissed: false,
					type: 'Security',
				} as Notification,
				{
					tenantId,
					actorId: currentUser.id,
					reason: 'password-reset',
				},
			);

			const resetYears = extractAcademicYears(updatedUser);
			await bumpUsersVersion(resetYears);
			await publishSyncEventsForAcademicYearsSafe({
				tenantId,
				domain: 'users',
				academicYears: resetYears,
				actorId: currentUser.id,
				reason: 'user-password-reset',
			});

			return NextResponse.json({
				success: true,
				message:
					'Password reset successfully. User must log in with new credentials.',
				data: {
					user: updatedUser,
					newCredentials: {
						username: targetUser.username,
						defaultPassword: defaultPassword,
						note: 'User must change password on next login',
					},
				},
			});
		}

		// --- Regular Update Logic ---
		const {
			forceAssignments = false,
			confirmReassignments = false,
			...updateUserData
		} = await request.json();

		const isSystemAdmin = currentUser.role === 'system_admin';

		const isSelfUpdate = currentUser.id === actualTargetUserId;

		// Define allowed fields based on role and permissions
		let allowedFields: string[] = [];
		if (isSystemAdmin) {
			if (isSelfUpdate) {
				// System admin updating themselves
				allowedFields = [
					'firstName',
					'middleName',
					'lastName',
					'nickName',
					'email',
					'phone',
					'address',
					'bio',
					'oldPassword',
					'newPassword',
					'avatar',
				];
			} else {
				// System admin updating other users
				const baseFields = [
					'firstName',
					'middleName',
					'lastName',
					'email',
					'phone',
					'address',
					'isActive',
					'academicYears',
				];
				switch (targetUser.role) {
					case 'student':
						allowedFields = [
							...baseFields,
							'classId',
							'className',
							'parent',
							'enrollmentStatus',
							'financialProfile',
							"isLatestAcademicYear",
							"isLateRegistration",
							"canRecordAttendance",
							"studentType"
						];
						break;
					case 'teacher':
						allowedFields = [...baseFields, 'subjects', 'sponsorClass'];
						break;
					case 'administrator':
						allowedFields = [...baseFields, 'position', 'permissions', 'canRecordStudentAttendance', 'canRecordTeacherAttendance', 'isTeacher', 'classes'];
						break;
					case 'parent':
						allowedFields = [...baseFields, 'studentIds'];
						break;
					default:
						allowedFields = baseFields;
				}
			}
		} else if (isSelfUpdate) {
			// Non-admin users updating themselves
			allowedFields = [
				'email',
				'nickName',
				'phone',
				'bio',
				'address',
				'oldPassword',
				'newPassword',
				'avatar',
			];
			if (currentUser.role === 'student') {
				allowedFields.push('shareContactWithClassmates');
			}
		} else {
			return NextResponse.json(
				{
					success: false,
					message: 'Unauthorized: You can only update your own profile',
				},
				{ status: 403 },
			);
		}

		// Filter user data to only allowed fields
		const filteredUserData: any = {};
		allowedFields.forEach((field) => {
			if (updateUserData.hasOwnProperty(field)) {
				filteredUserData[field] = updateUserData[field];
			}
		});

		// Handle null sponsorClass
		if (
			targetUser.role === 'teacher' &&
			filteredUserData.hasOwnProperty('sponsorClass')
		) {
			if (
				!filteredUserData.sponsorClass ||
				filteredUserData.sponsorClass.trim() === ''
			) {
				filteredUserData.sponsorClass = null;
			}
		}

		// Extract parent linking payload (handled separately, not persisted to the student)
		const parentUpdate = filteredUserData.parent;
		delete filteredUserData.parent;

		// Validate the parent payload (assign-exists, create names/contact/duplicates)
		if (targetUser.role === 'student' && parentUpdate) {
			const parentValidationErrors = await validateUserData(
				{ role: 'student', parent: parentUpdate },
				models,
				true,
				actualTargetUserId,
				forceAssignments,
			);
			const parentNonConflictErrors = parentValidationErrors.filter(
				(error) => !error.requiresConfirmation,
			);
			if (parentNonConflictErrors.length > 0) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Validation failed. Please correct the parent account and try again.',
						errors: parentNonConflictErrors,
					},
					{ status: 400 },
				);
			}
		}

		if (Object.keys(filteredUserData).length === 0 && !parentUpdate) {
			return NextResponse.json({
				success: true,
				message: 'No updatable fields were provided.',
			});
		}

		// Validate user data
		const validationErrors = await validateUserData(
			filteredUserData,
			models,
			true,
			actualTargetUserId,
			forceAssignments,
		);

		// Separate conflict errors
		const conflictErrors = validationErrors.filter(
			(error) => error.requiresConfirmation,
		);

		// If there are conflicts and user hasn't confirmed, return conflicts
		if (conflictErrors.length > 0 && !confirmReassignments) {
			const allConflicts = conflictErrors.reduce((acc, error) => {
				if (error.conflicts) acc.push(...error.conflicts);
				return acc;
			}, [] as ConflictDetails[]);

			return NextResponse.json(
				{
					success: false,
					message: 'Assignment conflicts detected. Please confirm to reassign.',
					requiresConfirmation: true,
					errors: validationErrors,
					conflicts: allConflicts,
					conflictSummary: {
						sponsorshipConflicts: allConflicts.filter(
							(c) => c.type === 'sponsorship',
						).length,
						subjectConflicts: allConflicts.filter((c) => c.type === 'subject')
							.length,
						totalConflicts: allConflicts.length,
					},
				},
				{ status: 409 },
			);
		}

		// Collect conflicts to handle
		let conflictsToHandle: ConflictDetails[] = [];
		if (confirmReassignments && conflictErrors.length > 0) {
			conflictsToHandle = conflictErrors.reduce((acc, error) => {
				if (error.conflicts) acc.push(...error.conflicts);
				return acc;
			}, [] as ConflictDetails[]);

			const roleData = { role: targetUser.role, ...filteredUserData };
			await handleForceReassignmentEnhanced(
				roleData,
				models,
				actualTargetUserId,
				conflictsToHandle,
				targetUser.username,
			);
		}

		// Check for non-conflict errors
		const nonConflictErrors = validationErrors.filter(
			(error) => !error.requiresConfirmation,
		);
		if (nonConflictErrors.length > 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Validation failed. Please correct the errors and try again.',
					errors: nonConflictErrors,
				},
				{ status: 400 },
			);
		}

		// Build update data
		const updateData: any = {
			...filteredUserData,
			updatedBy: currentUser.userId,
			updatedAt: new Date(),
		};

		// Recompute fullName whenever any name part is being updated
		const nameFields = ['firstName', 'middleName', 'lastName'] as const;
		const isNameUpdate = nameFields.some((f) =>
			Object.prototype.hasOwnProperty.call(filteredUserData, f),
		);
		if (isNameUpdate) {
			const firstName = String(
				filteredUserData.firstName ?? targetUser.firstName ?? '',
			).trim();
			const middleName = String(
				filteredUserData.middleName ?? targetUser.middleName ?? '',
			).trim();
			const lastName = String(
				filteredUserData.lastName ?? targetUser.lastName ?? '',
			).trim();
			updateData.fullName = [firstName, middleName, lastName]
				.filter(Boolean)
				.join(' ');

			// Keep studentName in sync across all grade records for this student
			if (targetUser.role === 'student' && targetUser.studentId) {
				await models.Grade.updateMany(
					{ studentId: targetUser.studentId },
					{ $set: { studentName: updateData.fullName, updatedAt: new Date() } },
				);
			}
		}

		const changedProfileFields = Array.from(
			new Set(
				Object.keys(filteredUserData)
					.filter((field) => !PROFILE_NOTIFICATION_EXCLUDED_FIELDS.has(field))
					.filter((field) =>
						valuesDiffer((targetUser as any)[field], filteredUserData[field]),
					)
					.map((field) => PROFILE_FIELD_LABELS[field] || field),
			),
		);

		// Handle student class change (update academicYears + grades)
		let studentClassChangeOldClassIds: string[] = [];
		if (
			targetUser.role === 'student' &&
			filteredUserData.classId &&
			filteredUserData.classId !== targetUser.classId
		) {
			// Capture old class before update for real-time access revocation
			if (targetUser.classId) {
				studentClassChangeOldClassIds = [targetUser.classId];
			}

			const schoolProfile = await getSchoolProfile();
			const currentAcademicYear =
				schoolProfile.identity.currentAcademicYear || getAcademicYear();
			if (!Array.isArray(targetUser.academicYears)) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Current academic year is missing for this student. Cannot change class.',
					},
					{ status: 400 },
				);
			}
			const hasCurrentYear = targetUser.academicYears.some(
				(ay: any) => ay.year === currentAcademicYear,
			);
			if (!hasCurrentYear) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Current academic year is missing for this student. Cannot change class.',
					},
					{ status: 400 },
				);
			}
			let resolvedClassName = filteredUserData.className;
			if (!resolvedClassName) {
				const classMeta = getClassMetaById(
					schoolProfile.academicConfig.classLevels,
					filteredUserData.classId,
				);
				if (classMeta?.name) {
					updateData.className = classMeta.name;
					resolvedClassName = classMeta.name;
				}
			}

			await models.Student.updateOne(
				{
					_id: actualTargetUserId,
					'academicYears.year': currentAcademicYear,
				},
				{
					$set: {
						'academicYears.$.classId': filteredUserData.classId,
						...(resolvedClassName
							? { 'academicYears.$.className': resolvedClassName }
							: {}),
					},
				},
			);

			// Update classId AND recompute submissionId for each grade individually
			// (submissionId encodes the classId, so it must change when the class changes)
			const affectedGrades = await models.Grade.find({
				studentId: targetUser.studentId,
				academicYear: currentAcademicYear,
			}).lean();

			if (affectedGrades.length > 0) {
				const newClassId = String(filteredUserData.classId).trim();
				const buildSubmissionId = (
					yr: string,
					clsId: string,
					period: string,
					subject: string,
				) =>
					`${yr}-${clsId}-${period}-${subject}`
						.replaceAll(/[\/\s+]/gi, '')
						.toLowerCase();

				const gradeBulkOps = affectedGrades.map((g: any) => ({
					updateOne: {
						filter: { _id: g._id },
						update: {
							$set: {
								classId: newClassId,
								submissionId: buildSubmissionId(
									String(g.academicYear || ''),
									newClassId,
									String(g.period || ''),
									String(g.subject || ''),
								),
								updatedAt: new Date(),
							},
						},
					},
				}));
				if (gradeBulkOps.length > 0) {
					await models.Grade.bulkWrite(gradeBulkOps, { ordered: false });
				}
			}
		}

		// Track teacher class assignment changes for real-time access updates
		let teacherClassChangeRemovedClassIds: string[] = [];
		let teacherClassChangeAddedClassIds: string[] = [];
		const teacherGradeBackfillPromises: Promise<any>[] = [];
		if (
			targetUser.role === 'teacher' &&
			filteredUserData.hasOwnProperty('subjects')
		) {
			const extractClassIdsFromSubjects = (subjects: any[]): string[] => {
				if (!Array.isArray(subjects)) return [];
				return Array.from(
					new Set(
						subjects.flatMap((s: any) =>
							Array.isArray(s?.classes)
								? s.classes
										.map((c: any) => String(c?.classId || '').trim())
										.filter(Boolean)
								: [],
						),
					),
				);
			};
			const oldClassIds = extractClassIdsFromSubjects(targetUser.subjects || []);
			const newClassIds = extractClassIdsFromSubjects(
				filteredUserData.subjects || [],
			);
			teacherClassChangeRemovedClassIds = oldClassIds.filter(
				(id) => !newClassIds.includes(id),
			);
			teacherClassChangeAddedClassIds = newClassIds.filter(
				(id) => !oldClassIds.includes(id),
			);

			// Backfill teacherUsername on existing grades for newly assigned
			// class/subject pairs. Compare old vs new subjects per academic year.
			type YearClassSubjectMap = Map<string, Map<string, Set<string>>>;
			const buildYearClassSubjectMap = (subjects: any[]): YearClassSubjectMap => {
				const map: YearClassSubjectMap = new Map();
				if (!Array.isArray(subjects)) return map;
				for (const yearEntry of subjects) {
					const year = String(yearEntry?.year || '').trim();
					if (!year) continue;
					if (!map.has(year)) map.set(year, new Map());
					const classMap = map.get(year)!;
					for (const cls of yearEntry?.classes || []) {
						const classId = String(cls?.classId || '').trim();
						if (!classId) continue;
						if (!classMap.has(classId)) classMap.set(classId, new Set());
						const subSet = classMap.get(classId)!;
						for (const subj of cls?.subjects || []) {
							const s = String(subj || '').trim();
							if (s) subSet.add(s);
						}
					}
				}
				return map;
			};

			const oldMap = buildYearClassSubjectMap(targetUser.subjects || []);
			const newMap = buildYearClassSubjectMap(filteredUserData.subjects || []);

			for (const [year, newClassMap] of newMap.entries()) {
				const oldClassMap = oldMap.get(year);
				for (const [classId, newSubjects] of newClassMap.entries()) {
					const oldSubjects = oldClassMap?.get(classId) ?? new Set<string>();
					// Find subjects that are newly assigned (not in old set)
					const addedSubjects = Array.from(newSubjects).filter(
						(s) => !oldSubjects.has(s),
					);
					if (addedSubjects.length === 0) continue;
					// Update teacherUsername on existing grades for this class/subject/year
					teacherGradeBackfillPromises.push(
						models.Grade.updateMany(
							{
								academicYear: year,
								classId,
								subject: { $in: addedSubjects },
							},
							{
								$set: {
									teacherUsername: targetUser.username,
									updatedAt: new Date(),
								},
							},
						),
					);
				}
			}
		}

		// Handle password change for self-update
		const isSelfPasswordChange = isSelfUpdate && updateData.newPassword;
		if (isSelfPasswordChange) {
			if (!updateData.oldPassword) {
				return NextResponse.json(
					{ success: false, message: 'Old password is required' },
					{ status: 400 },
				);
			}

			const isPasswordValid = await bcrypt.compare(
				updateData.oldPassword,
				targetUser.password,
			);
			if (!isPasswordValid) {
				return NextResponse.json(
					{ success: false, message: 'Incorrect old password' },
					{ status: 401 },
				);
			}

			if (
				targetUser.mustChangePassword &&
				updateData.newPassword === targetUser.username
			) {
				return NextResponse.json(
					{
						success: false,
						message: 'New password cannot be the same as the default password.',
					},
					{ status: 400 },
				);
			}

			updateData.password = await hashPassword(updateData.newPassword);
			updateData.mustChangePassword = false;
			updateData.passwordChangedAt = new Date();
			updateData.defaultPassword = null;
			delete updateData.oldPassword;
			delete updateData.newPassword;
		}

		// Select appropriate model
		let ModelToUpdate = models.User;
		switch (targetUser.role) {
			case 'student':
				ModelToUpdate = models.Student;
				break;
			case 'teacher':
				ModelToUpdate = models.Teacher;
				break;
			case 'administrator':
				ModelToUpdate = models.Administrator;
				break;
			case 'system_admin':
				ModelToUpdate = models.SystemAdmin;
				break;
			case 'parent':
				ModelToUpdate = models.Parent;
				break;
		}

		// Update user
		const updatedUser = await ModelToUpdate.findByIdAndUpdate(
			actualTargetUserId,
			{ $set: updateData },
			{
				new: true,
				runValidators: true,
			},
		).select('-password -defaultPassword');

		if (!updatedUser) {
			return NextResponse.json(
				{
					success: false,
					message: 'Update failed: User not found after update.',
				},
				{ status: 404 },
			);
		}

		// Apply parent link/unlink/create for students
		let parentChangeApplied = false;
		let affectedParentId: string | null = null;
		if (targetUser.role === 'student' && parentUpdate) {
			const studentId = targetUser.studentId || targetUser.username;
			if (parentUpdate.mode === 'assign' && parentUpdate.parentId) {
				const existingParent = await models.Parent.findById(
					parentUpdate.parentId,
				).lean();
				if (!existingParent) {
					return NextResponse.json(
						{
							success: false,
							message: 'Selected parent account was not found.',
						},
						{ status: 400 },
					);
				}
				await models.Parent.updateOne(
					{ _id: parentUpdate.parentId },
					{
						$addToSet: { studentIds: studentId },
						$set: { updatedAt: new Date() },
					},
				);
				parentChangeApplied = true;
				affectedParentId = String(parentUpdate.parentId);
			} else if (parentUpdate.mode === 'unlink' && parentUpdate.parentId) {
				await models.Parent.updateOne(
					{ _id: parentUpdate.parentId },
					{
						$pull: { studentIds: studentId },
						$set: { updatedAt: new Date() },
					},
				);
				parentChangeApplied = true;
				affectedParentId = String(parentUpdate.parentId);
			} else if (parentUpdate.mode === 'create') {
				const createdParent = await attachOrCreateParent(
					models,
					{ mode: 'create', ...parentUpdate },
					studentId,
					currentUser,
				);
				parentChangeApplied = true;
				affectedParentId = createdParent?._id
					? String(createdParent._id)
					: null;
			}
		}

		// Refresh the affected parent's sessions + notify via Ably so their UI
		// reflects the new child list immediately.
		if (parentChangeApplied && affectedParentId) {
			try {
				const affectedParent = await models.Parent.findById(
					affectedParentId,
				).lean();
				if (affectedParent) {
					const refreshedChildren = await buildParentChildrenList(
						models,
						affectedParent,
					);
					const existingSessions = await getAllUserSessions(
						affectedParentId,
					);
					const currentSelectedId = String(
						existingSessions[0]?.studentId || '',
					).trim();
					const sessionPatch: any = {
						parentChildren: refreshedChildren,
					};
					if (
						currentSelectedId &&
						!refreshedChildren.some(
							(c) =>
								c.studentId === currentSelectedId ||
								c.username === currentSelectedId,
						)
					) {
						Object.assign(
							sessionPatch,
							scopedParentSessionFields(refreshedChildren[0] || null),
						);
					}
					await updateAllUserSessions(affectedParentId, sessionPatch);
					await publishSyncEventSafe({
						tenantId,
						domain: 'users',
						actorId: currentUser.id,
						reason: 'parent-children-updated',
						targetUserIds: [affectedParentId],
						payload: {
							userId: affectedParentId,
							parentChildren: refreshedChildren,
						},
					});
				}
			} catch (parentRefreshError) {
				console.warn(
					'Failed to refresh parent sessions after student parent change:',
					parentRefreshError,
				);
			}
		}

		const wasActive = targetUser.isActive !== false;
		const deactivatedNow = wasActive && filteredUserData.isActive === false;

		// Await teacher grade backfill (teacherUsername on newly assigned class/subject pairs)
		if (teacherGradeBackfillPromises.length > 0) {
			await Promise.allSettled(teacherGradeBackfillPromises);
		}

		if (deactivatedNow) {
			await destroyAllUserSessions(actualTargetUserId);
			await publishSyncEventSafe({
				tenantId,
				domain: 'user',
				actorId: currentUser.id,
				reason: 'account-deactivated',
				targetUserIds: [String(actualTargetUserId)],
			});
		}
		const revokeOtherSessionsNow = Boolean(
			isSelfPasswordChange && !deactivatedNow && isSelfUpdate,
		);
		if (revokeOtherSessionsNow) {
			await destroyAllUserSessions(
				actualTargetUserId,
				currentSessionId || undefined,
			);
			await publishSyncEventSafe({
				tenantId,
				domain: 'user',
				actorId: currentUser.id,
				reason: 'password-changed-session-revocation',
				targetUserIds: [String(actualTargetUserId)],
			});
		}

		// Update sessions
		if (!deactivatedNow) {
			await updateAllUserSessions(
				actualTargetUserId,
				buildUserResponse(updatedUser.toObject()),
			);
		}

		// Refresh parent sessions with the latest child list when studentIds changed
		if (targetUser.role === 'parent' && filteredUserData.studentIds !== undefined) {
			const refreshedChildren = await buildParentChildrenList(
				models,
				updatedUser.toObject(),
			);
			await updateAllUserSessions(actualTargetUserId, {
				parentChildren: refreshedChildren,
			});
		}

		const profileUpdated = changedProfileFields.length > 0;

		if (profileUpdated) {
			const updatedBySelf = currentUser.id === actualTargetUserId;
			const actorName = getActorDisplayName(currentUser);
			const fieldList = formatFieldList(changedProfileFields);
			const message = updatedBySelf
				? `You updated your ${fieldList}.`
				: `Your ${fieldList} ${
						changedProfileFields.length === 1 ? 'was' : 'were'
					} updated by ${actorName}.`;

			await addNotificationToUser(
				models.User,
				actualTargetUserId,
				{
					title: 'Profile Updated',
					message,
					timestamp: new Date(),
					read: false,
					dismissed: false,
					type: 'Profile',
				} as Notification,
				{
					tenantId,
					actorId: currentUser.id,
					reason: 'profile-updated',
				},
			);
		}

		if (isSelfPasswordChange) {
			await addNotificationToUser(
				models.User,
				actualTargetUserId,
				{
					title: 'Password Changed',
					message: 'You changed your password.',
					timestamp: new Date(),
					read: false,
					dismissed: false,
					type: 'Security',
				} as Notification,
				{
					tenantId,
					actorId: currentUser.id,
					reason: 'password-changed',
				},
			);
		}

		const updatedUserYears = extractAcademicYears(updatedUser);
		const realtimeUser = buildRealtimeUserPayload(
			updatedUser.toObject() as any,
		);

		// Build class transition metadata for real-time access revocation/granting
		const classTransitionPayload: Record<string, any> = {
			user: realtimeUser,
			userId: String(realtimeUser.id || ''),
			targetUserIds: [String(realtimeUser.id || '')],
		};
		if (studentClassChangeOldClassIds.length > 0) {
			classTransitionPayload.oldClassIds = studentClassChangeOldClassIds;
			classTransitionPayload.newClassIds = filteredUserData.classId
				? [filteredUserData.classId]
				: [];
		}
		if (teacherClassChangeRemovedClassIds.length > 0) {
			classTransitionPayload.oldClassIds = [
				...(Array.isArray(classTransitionPayload.oldClassIds)
					? classTransitionPayload.oldClassIds
					: []),
				...teacherClassChangeRemovedClassIds,
			];
		}
		if (teacherClassChangeAddedClassIds.length > 0) {
			classTransitionPayload.newClassIds = [
				...(Array.isArray(classTransitionPayload.newClassIds)
					? classTransitionPayload.newClassIds
					: []),
				...teacherClassChangeAddedClassIds,
			];
		}

		const eventReason =
			studentClassChangeOldClassIds.length > 0
				? 'student-class-changed'
				: teacherClassChangeRemovedClassIds.length > 0 ||
						teacherClassChangeAddedClassIds.length > 0
					? 'teacher-class-reassigned'
					: 'user-updated';

		await bumpUsersVersion(updatedUserYears);
		await publishSyncEventsForAcademicYearsSafe({
			tenantId,
			domain: 'users',
			academicYears: updatedUserYears,
			payload: classTransitionPayload,
			actorId: currentUser.id,
			reason: eventReason,
		});

		const refreshedUser =
			profileUpdated || isSelfPasswordChange
				? await models.User.findById(actualTargetUserId)
						.select('-password -defaultPassword')
						.lean()
				: null;
		const responseUser = buildUserResponse(
			refreshedUser || updatedUser.toObject(),
		);

		return NextResponse.json({
			success: true,
			message: 'User updated successfully',
			data: { user: responseUser },
			reassignments:
				conflictsToHandle.length > 0
					? {
							performed: true,
							count: conflictsToHandle.length,
							details: conflictsToHandle.map((conflict) => ({
								type: conflict.type,
								previousTeacher: conflict.conflictingTeacher,
								reassignedFrom:
									conflict.type === 'sponsorship'
										? conflict.sponsorClass
										: conflict.assignment,
							})),
						}
					: null,
		});
	} catch (error: any) {
		console.error('Error in PUT /users:', error);
		if (error instanceof Error && error.message.includes('session')) {
			return NextResponse.json(
				{ success: false, message: 'Authentication required' },
				{ status: 401 },
			);
		}
		return NextResponse.json(
			{ success: false, message: error.message || 'Internal server error' },
			{ status: 500 },
		);
	}
}

// DELETE: Delete user by ID (admin only)
export async function DELETE(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, ['system_admin', 'superadmin']);
		if (!currentUser) {
			return NextResponse.json(
				{
					success: false,
					message: 'Unauthorized',
				},
				{ status: 401 },
			);
		}

		const { searchParams } = new URL(request.url);

		// --- Superadmin: delete system_admin in a specific school ---
		if (currentUser.role === 'superadmin') {
			const hostParam = searchParams.get('host');
			const targetUserId = searchParams.get('id');
			if (!hostParam) {
				return NextResponse.json(
					{ success: false, message: 'host query parameter is required for superadmin' },
					{ status: 400 },
				);
			}
			if (!targetUserId) {
				return NextResponse.json(
					{ success: false, message: 'id query parameter is required' },
					{ status: 400 },
				);
			}

			const cleanHost = normalizeHost(hostParam);
			const { SchoolProfile } = await getSchoolMeshModels();
			const school = await SchoolProfile.findOne({ 'system.host': cleanHost }).select('system.dbName system.host identity.currentAcademicYear').lean().exec();
			if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

			const connection = await getTenantConnectionByDbName(
				(school as any).system?.dbName,
			);
			if (!connection) return NextResponse.json({ error: 'Could not connect to school database' }, { status: 500 });

			const User = (connection.models.User || connection.model('User', UserSchema)) as any;
			if (!User.discriminators?.system_admin) {
				User.discriminator('system_admin', SystemAdminSchema);
			}

			const admin = await User.discriminators.system_admin.findByIdAndDelete(targetUserId).lean();
			if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

			await destroyAllUserSessions(targetUserId, undefined, {
				tenantId: cleanHost,
			});

			const tenantId = resolveTenantSyncKey({
				schoolProfile: school,
				host: cleanHost,
			});
			const activeAcademicYear = String((school as any).currentAcademicYear || getAcademicYear());
			const realtimeUser = buildRealtimeUserPayload(admin);
			await bumpUsersVersionForTenantConnection(connection, [activeAcademicYear]);
			await publishSyncEventSafe({
				tenantId,
				domain: 'users',
				academicYear: activeAcademicYear,
				actorId: currentUser.id,
				reason: 'user-deleted',
				payload: {
					userId: targetUserId,
					user: realtimeUser,
					targetUserIds: [targetUserId],
				},
			});

			return NextResponse.json({ success: true });
		}

		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const tenantId = resolveTenantSyncKey({
			schoolProfile,
			tenantId: currentUser.tenantId,
			host: request.headers.get('host'),
		});

		const models = await getTenantModels();
		const body = await request.json();
		const { targetUserId, adminPassword } = body;

		// Validate required fields
		if (!targetUserId) {
			return NextResponse.json(
				{ success: false, message: 'User ID is required' },
				{ status: 400 },
			);
		}

		if (!adminPassword) {
			return NextResponse.json(
				{
					success: false,
					message: 'Admin password is required for user deletion',
				},
				{ status: 400 },
			);
		}

		// Verify admin password(Mid-Year)
		const adminUser = await models.SystemAdmin.findById(currentUser.id);
		if (!adminUser) {
			return NextResponse.json(
				{
					success: false,
					message: 'Admin user not found',
				},
				{ status: 404 },
			);
		}

		const isPasswordValid = await bcrypt.compare(
			adminPassword,
			adminUser.password,
		);

		if (!isPasswordValid) {
			return NextResponse.json(
				{
					success: false,
					message: 'Invalid admin password',
				},
				{ status: 401 },
			);
		}
		// Find the target user
		const targetUser = await models.User.findById(targetUserId);
		if (!targetUser) {
			return NextResponse.json(
				{ success: false, message: 'User not found' },
				{ status: 404 },
			);
		}

		if (targetUser.role == 'system_admin') {
			return NextResponse.json(
				{
					success: false,
					message: 'You are not authorized to delete a system admin',
				},
				{ status: 401 },
			);
		}

		// Store user info for response
		const deletedUserInfo = {
			userId: targetUserId,
			username: targetUser.username,
			fullName:
				targetUser.fullName || `${targetUser.firstName} ${targetUser.lastName}`,
			role: targetUser.role,
		};

		// Perform cascade deletions based on user role
		const cascadeResults: any = {};

		switch (targetUser.role) {
			case 'student':
				// Delete student's grades
				const deletedGrades = await models.Grade.deleteMany({
					studentId: targetUser.studentId,
				});
				cascadeResults.gradesDeleted = deletedGrades.deletedCount || 0;

				// Unlink the student from any parent accounts
				await models.Parent.updateMany(
					{ studentIds: targetUser.studentId },
					{ $pull: { studentIds: targetUser.studentId } },
				);

				// Delete student's payment records (if they exist as separate documents)
				// This depends on your data structure - adjust as needed
				break;

			case 'teacher':
				// Unassign teacher from any sponsored classes
				if (targetUser.sponsorClass) {
					cascadeResults.sponsorClassUnassigned = targetUser.sponsorClass;
				}

				// Note: Grades created by this teacher remain but should ideally track who created them
				// You might want to add logic here depending on your business rules
				break;

			case 'administrator':
				// Clear position for this administrator
				if (targetUser.position) {
					cascadeResults.positionCleared = targetUser.position;
				}
				break;
			default:
				break;
		}

		// Destroy all user sessions
		await destroyAllUserSessions(targetUserId);
		cascadeResults.sessionsDestroyed = true;

		// Delete the user
		await models.User.deleteOne({ _id: targetUserId });

		const deletedUserYears = extractAcademicYears(targetUser);
		await bumpUsersVersion(deletedUserYears);
		await publishSyncEventsForAcademicYearsSafe({
			tenantId,
			domain: 'users',
			academicYears: deletedUserYears,
			payload: {
				user: deletedUserInfo,
				userId: targetUserId,
				targetUserIds: [targetUserId],
			},
			actorId: currentUser.id,
			reason: 'user-deleted',
		});

		return NextResponse.json({
			success: true,
			message: `User "${deletedUserInfo.fullName}" and all associated data deleted successfully`,
			data: {
				deletedUser: deletedUserInfo,
				cascadeResults: cascadeResults,
			},
		});
	} catch (error: any) {
		console.error('Error in DELETE /users:', error);

		if (error instanceof Error && error.message.includes('session')) {
			return NextResponse.json(
				{ success: false, message: 'Authentication required' },
				{ status: 401 },
			);
		}

		if (error instanceof Error && error.message.includes('Unauthorized')) {
			return NextResponse.json(
				{ success: false, message: error.message },
				{ status: 403 },
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: error.message || 'Failed to delete user',
			},
			{ status: 500 },
		);
	}
}
