import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getTenantModels } from '@/models';
import { authorizeUser } from '@/middleware';
import { getSchoolProfile } from '@/lib/mongoose';
import {
	getSession,
	createSession,
	destroySession,
	updateAllUserSessions,
	destroyAllUserSessions,
} from '@/utils/session';
import { sendOTP, verifyOTP } from '@/utils/otp';

// --- Helper Functions ---

function validateEmail(email: string): boolean {
	return /\S+@\S+\.\S+/.test(email);
}

function validatePhone(phone: string): boolean {
	return /^\+?[\d\s\-\(\)]{10,}$/.test(phone);
}

function getAcademicYear(): string {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();
	return currentMonth >= 7
		? `${currentYear}-${currentYear + 1}`
		: `${currentYear - 1}-${currentYear}`;
}

function getCurrentSemester(): string {
	const now = new Date();
	const currentMonth = now.getMonth();
	// July-December = First Semester, January-June = Second Semester
	return currentMonth >= 6 ? 'First Semester' : 'Second Semester';
}

function buildUserResponse(user: any) {
	const baseUser = {
		userId: user._id?.toString() ?? user.userId,
		username: user.username,
		firstName: user.firstName,
		middleName: user.middleName,
		lastName: user.lastName,
		role: user.role,
		nickName: user.nickName,
		gender: user.gender,
		dateOfBirth: user.dateOfBirth,
		address: user.address,
		phone: user.phone,
		email: user.email,
		bio: user.bio,
		avatar: user.avatar,
		isActive: user.isActive,
		mustChangePassword: user.mustChangePassword,
		passwordChangedAt: user.passwordChangedAt || null,
		chats: user.chats || [],
		notifications: user.notifications || [],
	};

	switch (user.role) {
		case 'student':
			return {
				...baseUser,
				studentId: user.studentId,
				enrollmentYear: user.enrollmentYear,
				enrollmentSemester: user.enrollmentSemester,
				enrollmentStatus: user.enrollmentStatus,
				classId: user.classId,
				className: user.className,
				classLevel: user.classLevel,
				session: user.session,
				academicYears: user.academicYears || [],
				guardian: user.guardian,
				financialProfile: user.financialProfile || {
					outstandingBalances: [],
					paymentRecords: [],
				},
			};
		case 'teacher':
			return {
				...baseUser,
				teacherId: user.teacherId,
				subjects: user.subjects || [],
				sponsorClass: user.sponsorClass,
			};
		case 'administrator':
			return {
				...baseUser,
				adminId: user.adminId,
				position: user.position,
			};
		case 'system_admin':
			return {
				...baseUser,
				sysId: user.sysId,
			};
		default:
			return baseUser;
	}
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
	errors: ValidationError[]
) {
	if (userData.position) {
		const positionExists = await models.User.findOne({
			...baseQuery,
			role: 'administrator',
			position: userData.position,
		}).lean();
		if (positionExists) {
			errors.push({
				field: 'position',
				type: 'DUPLICATE_ENTRY',
				message: `The position "${userData.position}" is already held by ${positionExists.fullName}.`,
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
		teacher: 'teacherId',
		administrator: 'adminId',
		system_admin: 'sysId',
	};
	const prefix = prefixes[role];
	const idField = idFieldMap[role];
	const academicYear = getAcademicYear();
	const year = academicYear.split('-')[0];

	const lastUser = await models.User.findOne({
		role,
		[idField]: { $regex: `^${prefix}${year}` },
	})
		.sort({ [idField]: -1 })
		.lean();

	let nextNumber = 1;
	if (lastUser && lastUser[idField]) {
		const lastId = lastUser[idField];
		const sequenceStr = lastId.substring(prefix.length + year.length);
		if (sequenceStr) {
			nextNumber = parseInt(sequenceStr, 10) + 1;
		}
	}
	const sequenceNumber = String(nextNumber).padStart(3, '0');
	return `${prefix}${year}${sequenceNumber}`;
}

function generateCredentials(roleBasedId: string) {
	return { username: roleBasedId, defaultPassword: roleBasedId };
}

async function buildUserData(
	models: any,
	userData: any,
	currentUser: any
): Promise<any> {
	const roleBasedId = await generateIdByRole(models, userData.role);
	const credentials = generateCredentials(roleBasedId);
	const academicYear = getAcademicYear();
	const currentSemester = getCurrentSemester();

	const commonData = {
		firstName: userData.firstName.trim(),
		middleName: userData.middleName?.trim(),
		lastName: userData.lastName.trim(),
		fullName: `${userData.firstName.trim()} ${
			userData.middleName ? userData.middleName.trim() + ' ' : ''
		}${userData.lastName.trim()}`,
		gender: userData.gender,
		username: credentials.username,
		password: await hashPassword(credentials.defaultPassword),
		defaultPassword: credentials.defaultPassword,
		dateOfBirth: new Date(userData.dateOfBirth),
		phone: userData.phone?.trim(),
		email: userData.email?.trim().toLowerCase(),
		address: userData.address.trim(),
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
				enrollmentSemester: currentSemester,
				enrollmentStatus: 'enrolled',
				classId: userData.classId,
				classLevel: userData.classLevel,
				className: userData.className,
				session: userData.session,
				academicYears: [
					{
						year: academicYear,
						classIds: [userData.classId],
					},
				],
				guardian: {
					firstName: userData.guardian?.firstName?.trim(),
					middleName: userData.guardian?.middleName?.trim(),
					lastName: userData.guardian?.lastName?.trim(),
					email: userData.guardian?.email?.trim().toLowerCase(),
					phone: userData.guardian?.phone?.trim(),
					address: userData.guardian?.address?.trim(),
				},
				financialProfile: {
					outstandingBalances: [],
					paymentReceipts: [],
				},
			};
		case 'teacher':
			return {
				...commonData,
				teacherId: roleBasedId,
				subjects: (userData.subjects || []).map((subject: any) => ({
					academicYear: academicYear,
					subject: subject.subject,
					level: subject.level,
					session: subject.session,
				})),
				sponsorClass: userData.sponsorClass || null,
			};
		case 'administrator':
			return {
				...commonData,
				adminId: roleBasedId,
				position: userData.position,
			};
		case 'system_admin':
			return { ...commonData, sysId: roleBasedId };
		default:
			throw new Error('Invalid user role');
	}
}

// --- Student Promotion/Demotion Functions ---

interface ClassInfo {
	classId: string;
	name: string;
	level: string;
	session: string;
	fees: { feeType: string; category: string; requiredAmount: number }[];
}

function flattenClassStructure(classLevels: any): ClassInfo[] {
	const allClasses: ClassInfo[] = [];

	if (!classLevels) return allClasses;

	// Iterate through sessions (e.g., "Morning", "Afternoon")
	for (const sessionName in classLevels) {
		const session = classLevels[sessionName];

		// Iterate through levels (e.g., "Kindergarten", "Elementary")
		for (const levelName in session) {
			const level = session[levelName];

			// Get classes from this level
			if (level.classes && Array.isArray(level.classes)) {
				level.classes.forEach((classObj: any) => {
					allClasses.push({
						classId: classObj.classId,
						name: classObj.name,
						level: levelName,
						session: sessionName,
						fees: classObj.fees || [],
					});
				});
			}
		}
	}

	return allClasses;
}

async function getNextClass(
	currentClassId: string,
	schoolProfile: any
): Promise<ClassInfo | null> {
	const allClasses = flattenClassStructure(schoolProfile.classLevels);

	const currentClassIndex = allClasses.findIndex(
		(c) => c.classId === currentClassId
	);

	if (currentClassIndex === -1) {
		throw new Error('Current class not found in school profile');
	}

	if (currentClassIndex === allClasses.length - 1) {
		return null; // Student is in the highest class
	}

	return allClasses[currentClassIndex + 1];
}

async function getPreviousClass(
	currentClassId: string,
	schoolProfile: any
): Promise<ClassInfo | null> {
	const allClasses = flattenClassStructure(schoolProfile.classLevels);

	const currentClassIndex = allClasses.findIndex(
		(c) => c.classId === currentClassId
	);

	if (currentClassIndex === -1) {
		throw new Error('Current class not found in school profile');
	}

	if (currentClassIndex === 0) {
		return null; // Student is in the lowest class
	}

	return allClasses[currentClassIndex - 1];
}

async function promoteStudent(
	student: any,
	promotionType: 'yearly' | 'semester',
	models: any
) {
	const schoolProfile = await getSchoolProfile();
	const currentAcademicYear = getAcademicYear();
	const nextClass = await getNextClass(student.classId, schoolProfile);

	if (!nextClass) {
		throw new Error(
			'Student is already in the highest class and cannot be promoted'
		);
	}

	const updateData: any = {
		classId: nextClass.classId,
		className: nextClass.name,
		classLevel: nextClass.level,
		session: nextClass.session,
		updatedAt: new Date(),
	};

	if (promotionType === 'yearly') {
		// Calculate next academic year
		const [startYear] = currentAcademicYear.split('-').map(Number);
		const nextAcademicYear = `${startYear + 1}-${startYear + 2}`;

		// Add new academic year to academicYears array
		const academicYearExists = student.academicYears.some(
			(ay: any) => ay.year === nextAcademicYear
		);

		if (academicYearExists) {
			// Update existing academic year
			updateData['academicYears'] = student.academicYears.map((ay: any) =>
				ay.year === nextAcademicYear
					? {
							...ay,
							classIds: [...new Set([...ay.classIds, nextClass.classId])],
					  }
					: ay
			);
		} else {
			// Add new academic year
			updateData['$push'] = {
				academicYears: {
					year: nextAcademicYear,
					classIds: [nextClass.classId],
				},
			};
		}
	} else if (promotionType === 'semester') {
		// Add new classId to current academic year
		const currentAcademicYearData = student.academicYears.find(
			(ay: any) => ay.year === currentAcademicYear
		);

		if (currentAcademicYearData) {
			updateData['academicYears'] = student.academicYears.map((ay: any) =>
				ay.year === currentAcademicYear
					? {
							...ay,
							classIds: [...new Set([...ay.classIds, nextClass.classId])],
					  }
					: ay
			);
		} else {
			// If current academic year doesn't exist, add it
			updateData['$push'] = {
				academicYears: {
					year: currentAcademicYear,
					classIds: [student.classId, nextClass.classId],
				},
			};
		}
	}

	const updatedStudent = await models.Student.findByIdAndUpdate(
		student._id,
		updateData['$push']
			? { $set: updateData, $push: updateData['$push'] }
			: { $set: updateData },
		{ new: true, runValidators: true }
	).select('-password -defaultPassword');

	return {
		student: updatedStudent,
		promotionDetails: {
			type: promotionType,
			fromClass: {
				classId: student.classId,
				className: student.className,
				classLevel: student.classLevel,
				session: student.session,
			},
			toClass: {
				classId: nextClass.classId,
				className: nextClass.name,
				classLevel: nextClass.level,
				session: nextClass.session,
			},
			academicYear:
				promotionType === 'yearly'
					? `${currentAcademicYear.split('-')[0] + 1}-${
							currentAcademicYear.split('-')[1] + 1
					  }`
					: currentAcademicYear,
		},
	};
}

async function demoteStudent(
	student: any,
	demotionType: 'yearly' | 'semester',
	models: any
) {
	const schoolProfile = await getSchoolProfile();
	const currentAcademicYear = getAcademicYear();
	const previousClass = await getPreviousClass(student.classId, schoolProfile);

	if (!previousClass) {
		throw new Error(
			'Student is already in the lowest class and cannot be demoted'
		);
	}

	const updateData: any = {
		classId: previousClass.classId,
		className: previousClass.name,
		classLevel: previousClass.level,
		session: previousClass.session,
		updatedAt: new Date(),
	};

	if (demotionType === 'yearly') {
		// Calculate previous academic year
		const [startYear] = currentAcademicYear.split('-').map(Number);
		const previousAcademicYear = `${startYear - 1}-${startYear}`;

		// Add previous academic year to academicYears array
		const academicYearExists = student.academicYears.some(
			(ay: any) => ay.year === previousAcademicYear
		);

		if (academicYearExists) {
			updateData['academicYears'] = student.academicYears.map((ay: any) =>
				ay.year === previousAcademicYear
					? {
							...ay,
							classIds: [...new Set([...ay.classIds, previousClass.classId])],
					  }
					: ay
			);
		} else {
			updateData['$push'] = {
				academicYears: {
					year: previousAcademicYear,
					classIds: [previousClass.classId],
				},
			};
		}
	} else if (demotionType === 'semester') {
		// Add previous classId to current academic year
		const currentAcademicYearData = student.academicYears.find(
			(ay: any) => ay.year === currentAcademicYear
		);

		if (currentAcademicYearData) {
			updateData['academicYears'] = student.academicYears.map((ay: any) =>
				ay.year === currentAcademicYear
					? {
							...ay,
							classIds: [...new Set([...ay.classIds, previousClass.classId])],
					  }
					: ay
			);
		} else {
			updateData['$push'] = {
				academicYears: {
					year: currentAcademicYear,
					classIds: [student.classId, previousClass.classId],
				},
			};
		}
	}

	const updatedStudent = await models.Student.findByIdAndUpdate(
		student._id,
		updateData['$push']
			? { $set: updateData, $push: updateData['$push'] }
			: { $set: updateData },
		{ new: true, runValidators: true }
	).select('-password -defaultPassword');

	return {
		student: updatedStudent,
		demotionDetails: {
			type: demotionType,
			fromClass: {
				classId: student.classId,
				className: student.className,
				classLevel: student.classLevel,
				session: student.session,
			},
			toClass: {
				classId: previousClass.classId,
				className: previousClass.name,
				classLevel: previousClass.level,
				session: previousClass.session,
			},
			academicYear:
				demotionType === 'yearly'
					? `${currentAcademicYear.split('-')[0] - 1}-${
							currentAcademicYear.split('-')[1] - 1
					  }`
					: currentAcademicYear,
		},
	};
}

// --- CRUD HANDLERS ---

// GET: List users (with filter), or fetch single user
export async function GET(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request);
		const host = request.headers.get('host');

		const models = await getTenantModels();
		const { searchParams } = new URL(request.url);

		const role = searchParams.get('role');
		const classId = searchParams.get('classId');
		const targetId = searchParams.get('id');
		const limit = parseInt(searchParams.get('limit') || '50000', 10);

		let responseData;

		if (['student'].includes(currentUser.role)) {
			responseData = await models.User.findById(currentUser.id).select(
				'-password -defaultPassword'
			);
			return NextResponse.json({
				success: true,
				message: 'User Fetch Successful',
				data: responseData,
			});
		}

		const filters: Record<string, any> = {};
		if (role) filters.role = role;
		if (classId) filters.classId = classId;
		if (targetId) filters._id = targetId;

		if (['teacher', 'system_admin'].includes(currentUser.role)) {
			responseData = await models.User.find(filters)
				.limit(limit)
				.select('-password -defaultPassword');
		} else if (currentUser.role === 'administrator') {
			const finalQuery = { ...filters, role: { $ne: 'system_admin' } };
			if (filters.role === 'system_admin') delete finalQuery.role;
			responseData = await models.User.find(finalQuery)
				.limit(limit)
				.select('-password -defaultPassword');
		}

		return NextResponse.json({
			success: true,
			message: 'User Fetch Successful',
			data: responseData,
		});
	} catch (err) {
		console.error('Error in GET /users:', err);
		if (err instanceof Error && err.message.includes('session')) {
			return NextResponse.json(
				{ success: false, message: 'Authentication required' },
				{ status: 401 }
			);
		}
		return NextResponse.json(
			{ success: false, message: 'An error occurred' },
			{ status: 500 }
		);
	}
}

// --- Conflict Types ---

interface ConflictDetails {
	type: 'subject' | 'sponsorship' | 'self_contained_conflict';
	conflictingTeacher: {
		id: string;
		name: string;
		teacherId: string;
	};
	assignment?: {
		academicYear: string;
		subject: string;
		level: string;
		session: string;
	};
	sponsorClass?: string;
}

interface ValidationErrorWithConflicts extends ValidationError {
	conflicts?: ConflictDetails[];
	requiresConfirmation?: boolean;
}

// Enhanced teacher validation with conflict reporting
async function validateTeacherData(
	userData: any,
	models: any,
	baseQuery: any,
	errors: ValidationErrorWithConflicts[],
	currentUserId?: string
): Promise<void> {
	const conflicts: ConflictDetails[] = [];
	const academicYear = getAcademicYear();
	const isSelfContainedAssignment =
		userData.subjects?.some((s: any) => s.level === 'Self Contained') ||
		userData.sponsorClass;

	if (isSelfContainedAssignment && userData.sponsorClass) {
		const session = userData.subjects.find(
			(s: any) => s.level === 'Self Contained'
		)?.session;
		if (session) {
			const existingSponsor = await models.Teacher.findOne({
				...baseQuery,
				role: 'teacher',
				'subjects.session': session,
				'subjects.academicYear': academicYear,
				sponsorClass: { $ne: null },
			}).lean();

			if (existingSponsor) {
				const conflict: ConflictDetails = {
					type: 'self_contained_conflict',
					conflictingTeacher: {
						id: existingSponsor._id.toString(),
						name:
							existingSponsor.fullName ||
							`${existingSponsor.firstName} ${existingSponsor.lastName}`,
						teacherId: existingSponsor.teacherId,
					},
					sponsorClass: existingSponsor.sponsorClass,
				};
				errors.push({
					field: 'sponsorClass',
					type: 'DUPLICATE_ENTRY',
					message: `A teacher can only be a sponsor for one Self Contained class per session. ${conflict.conflictingTeacher.name} is already a sponsor in this session.`,
					requiresConfirmation: true,
					conflicts: [conflict],
				});
			}
		}
	}

	// Validate class sponsorship (sponsorClass)
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
					teacherId: sponsorExists.teacherId,
				},
				sponsorClass: userData.sponsorClass,
			};
			errors.push({
				field: 'sponsorClass',
				type: 'DUPLICATE_ENTRY',
				message: `${conflict.conflictingTeacher.name} (${conflict.conflictingTeacher.teacherId}) is already the sponsor for class "${userData.sponsorClass}".`,
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
		for (const assignment of userData.subjects) {
			if (assignment.subject && assignment.level && assignment.session) {
				const assignmentAcademicYear = assignment.academicYear || academicYear;

				const assignmentExists = await models.Teacher.findOne({
					...baseQuery,
					role: 'teacher',
					subjects: {
						$elemMatch: {
							academicYear: assignmentAcademicYear,
							subject: assignment.subject,
							level: assignment.level,
							session: assignment.session,
						},
					},
				}).lean();

				if (assignmentExists) {
					const conflict: ConflictDetails = {
						type: 'subject',
						conflictingTeacher: {
							id: assignmentExists._id.toString(),
							name:
								assignmentExists.fullName ||
								`${assignmentExists.firstName} ${assignmentExists.lastName}`,
							teacherId: assignmentExists.teacherId,
						},
						assignment: {
							academicYear: assignmentAcademicYear,
							subject: assignment.subject,
							level: assignment.level,
							session: assignment.session,
						},
					};

					errors.push({
						field: 'subjects',
						type: 'DUPLICATE_ENTRY',
						message: `Subject "${assignment.subject}" at ${assignment.level} level (${assignment.session} session, ${assignmentAcademicYear}) is already assigned to ${conflict.conflictingTeacher.name} (${conflict.conflictingTeacher.teacherId}).`,
						details: {
							existingUserId: assignmentExists._id.toString(),
							existingUserName: assignmentExists.fullName,
						},
						conflicts: [conflict],
						requiresConfirmation: true,
					});
				}
			}
		}
	}
}

// Enhanced validation function that uses the new teacher validation
async function validateUserData(
	userData: any,
	models: any,
	isUpdate: boolean = false,
	userId: string | null = null,
	forceAssignments: boolean = false
): Promise<ValidationErrorWithConflicts[]> {
	const errors: ValidationErrorWithConflicts[] = [];
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

	if (!forceAssignments) {
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
	}

	const role =
		userData.role ||
		(isUpdate && userId
			? (await models.User.findById(userId).select('role').lean())?.role
			: null);

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
	return errors;
}

// --- FORCE REASSIGNMENT ---
async function handleForceReassignmentEnhanced(
	userData: any,
	models: any,
	newUserId: string | null,
	conflicts: ConflictDetails[]
) {
	const sponsorshipConflicts = conflicts.filter(
		(c) => c.type === 'sponsorship'
	);
	for (const conflict of sponsorshipConflicts) {
		await models.Teacher.updateOne(
			{ _id: conflict.conflictingTeacher.id },
			{
				$unset: { sponsorClass: 1 },
				$set: { updatedAt: new Date() },
			}
		);
	}

	const subjectConflicts = conflicts.filter((c) => c.type === 'subject');
	for (const conflict of subjectConflicts) {
		if (conflict.assignment) {
			const matchCriteria = {
				academicYear: conflict.assignment.academicYear,
				subject: conflict.assignment.subject,
				level: conflict.assignment.level,
				session: conflict.assignment.session,
			};
			await models.Teacher.updateOne(
				{ _id: conflict.conflictingTeacher.id },
				{
					$pull: { subjects: matchCriteria },
					$set: { updatedAt: new Date() },
				}
			);
		}
	}

	const selfContainedConflicts = conflicts.filter(
		(c) => c.type === 'self_contained_conflict'
	);
	for (const conflict of selfContainedConflicts) {
		const session = conflict.assignment?.session;
		const academicYear = conflict.assignment?.academicYear;
		if (session && academicYear) {
			await models.Teacher.updateOne(
				{ _id: conflict.conflictingTeacher.id },
				{
					$pull: {
						subjects: {
							session: session,
							academicYear: academicYear,
						},
					},
					$unset: { sponsorClass: 1 },
					$set: { updatedAt: new Date() },
				}
			);
		}
	}
}

// --- POST Handler ---
export async function POST(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, ['system_admin']);
		const host = request.headers.get('host');

		const models = await getTenantModels(host);
		const {
			forceAssignments = false,
			confirmReassignments = false,
			...userData
		} = await request.json();

		const validationErrors = await validateUserData(
			userData,
			models,
			false,
			null,
			forceAssignments
		);

		const conflictErrors = validationErrors.filter(
			(error) => error.requiresConfirmation
		);

		if (conflictErrors.length > 0 && !confirmReassignments) {
			const allConflicts = conflictErrors.reduce((acc, error) => {
				if (error.conflicts) acc.push(...error.conflicts);
				return acc;
			}, [] as ConflictDetails[]);

			return NextResponse.json(
				{
					success: false,
					message: 'Assignment conflicts detected',
					requiresConfirmation: true,
					errors: validationErrors,
					conflicts: allConflicts,
					conflictSummary: {
						sponsorshipConflicts: allConflicts.filter(
							(c) => c.type === 'sponsorship'
						).length,
						subjectConflicts: allConflicts.filter((c) => c.type === 'subject')
							.length,
					},
				},
				{ status: 409 }
			);
		}

		let conflictsToHandle: ConflictDetails[] = [];
		if (confirmReassignments && conflictErrors.length > 0) {
			conflictsToHandle = conflictErrors.reduce((acc, error) => {
				if (error.conflicts) acc.push(...error.conflicts);
				return acc;
			}, [] as ConflictDetails[]);
		}

		const nonConflictErrors = validationErrors.filter(
			(error) => !error.requiresConfirmation
		);
		if (nonConflictErrors.length > 0) {
			return NextResponse.json(
				{
					success: false,
					message: 'Validation failed',
					errors: nonConflictErrors,
				},
				{ status: 400 }
			);
		}

		if (confirmReassignments && conflictsToHandle.length > 0) {
			await handleForceReassignmentEnhanced(
				userData,
				models,
				null,
				conflictsToHandle
			);
		}

		const finalUserData = await buildUserData(models, userData, currentUser);
		const newUser = await models.User.create(finalUserData);
		const userResponse = newUser.toObject();

		delete userResponse?.password;
		const responseData = {
			...userResponse,
			generatedCredentials: {
				username: finalUserData.username,
				defaultPassword: finalUserData.username,
				note: 'User must change password on first login',
			},
		};
		delete responseData.defaultPassword;

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
								details: conflictsToHandle,
						  }
						: null,
			},
			{ status: 201 }
		);
	} catch (error: any) {
		console.error('API Error in POST /users:', error);
		if (error instanceof Error && error.message.includes('session')) {
			return NextResponse.json(
				{ success: false, message: 'Authentication required' },
				{ status: 401 }
			);
		}
		if (error.code === 11000) {
			return NextResponse.json(
				{
					success: false,
					message: `A user with the provided details already exists.`,
				},
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

// --- PUT Handler ---
export async function PUT(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request);

		const models = await getTenantModels();
		const { searchParams } = new URL(request.url);
		const targetUserId = searchParams.get('id');
		const resetPassword = searchParams.get('resetPassword') === 'true';
		const action = searchParams.get('action');
		const promotionType = searchParams.get('type') as 'yearly' | 'semester';

		const actualTargetUserId = targetUserId || currentUser.userId;

		// Handle promotion/demotion
		if (action === 'promote' || action === 'demote') {
			if (currentUser.role !== 'system_admin') {
				return NextResponse.json(
					{
						success: false,
						message:
							'Unauthorized: Only system administrators can promote or demote students',
					},
					{ status: 403 }
				);
			}

			if (!targetUserId) {
				return NextResponse.json(
					{
						success: false,
						message: 'Student ID is required for promotion/demotion',
					},
					{ status: 400 }
				);
			}

			if (!promotionType || !['yearly', 'semester'].includes(promotionType)) {
				return NextResponse.json(
					{
						success: false,
						message: 'Valid promotion type is required (yearly or semester)',
					},
					{ status: 400 }
				);
			}

			const student = await models.Student.findById(targetUserId);
			if (!student) {
				return NextResponse.json(
					{ success: false, message: 'Student not found' },
					{ status: 404 }
				);
			}

			if (student.role !== 'student') {
				return NextResponse.json(
					{ success: false, message: 'User is not a student' },
					{ status: 400 }
				);
			}

			try {
				let result;
				if (action === 'promote') {
					result = await promoteStudent(student, promotionType, models);

					// Add notification
					await models.Student.updateOne(
						{ _id: targetUserId },
						{
							$push: {
								notifications: {
									title: 'Promotion',
									message: `You have been promoted to ${result.promotionDetails.toClass.className}`,
									details: `Promotion Type: ${
										promotionType === 'yearly'
											? 'Yearly Promotion'
											: 'Semester Promotion (Double Promotion)'
									}`,
									timestamp: new Date(),
									read: false,
									dismissed: false,
									type: 'Profile',
								},
							},
						}
					);
				} else {
					result = await demoteStudent(student, promotionType, models);

					// Add notification
					await models.Student.updateOne(
						{ _id: targetUserId },
						{
							$push: {
								notifications: {
									title: 'Class Change',
									message: `You have been moved to ${result.demotionDetails.toClass.className}`,
									details: `Change Type: ${
										promotionType === 'yearly'
											? 'Yearly Change'
											: 'Semester Change'
									}`,
									timestamp: new Date(),
									read: false,
									dismissed: false,
									type: 'Profile',
								},
							},
						}
					);
				}

				await updateAllUserSessions(
					targetUserId,
					buildUserResponse(result.student.toObject())
				);

				return NextResponse.json({
					success: true,
					message: `Student ${action}d successfully`,
					data: result,
				});
			} catch (error: any) {
				return NextResponse.json(
					{ success: false, message: error.message },
					{ status: 400 }
				);
			}
		}

		const targetUser = await models.User.findById(actualTargetUserId);
		if (!targetUser) {
			return NextResponse.json(
				{ success: false, message: 'User not found' },
				{ status: 404 }
			);
		}

		// Handle password reset for system_admin
		if (resetPassword) {
			if (currentUser.role !== 'system_admin') {
				return NextResponse.json(
					{
						success: false,
						message:
							'Unauthorized: Only system administrators can reset passwords',
					},
					{ status: 403 }
				);
			}

			if (currentUser.userId === actualTargetUserId) {
				return NextResponse.json(
					{
						success: false,
						message:
							'System administrators cannot reset their own password using this endpoint',
					},
					{ status: 400 }
				);
			}

			let defaultPassword: string;
			switch (targetUser.role) {
				case 'student':
					defaultPassword = targetUser.studentId;
					break;
				case 'teacher':
					defaultPassword = targetUser.teacherId;
					break;
				case 'administrator':
					defaultPassword = targetUser.adminId;
					break;
				case 'system_admin':
					defaultPassword = targetUser.sysId;
					break;
				default:
					defaultPassword = targetUser.username;
			}

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
					overwrite: false,
					upsert: false,
				}
			).select('-password -defaultPassword');

			if (!updatedUser) {
				return NextResponse.json(
					{
						success: false,
						message: 'Password reset failed: User not found after update.',
					},
					{ status: 404 }
				);
			}

			await destroyAllUserSessions(actualTargetUserId);

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

		// Regular update logic
		const {
			forceAssignments = false,
			confirmReassignments = false,
			...updateUserData
		} = await request.json();

		const isSystemAdmin = currentUser.role === 'system_admin';
		const isSelfUpdate = currentUser.userId === actualTargetUserId;

		let allowedFields: string[] = [];
		if (isSystemAdmin) {
			if (isSelfUpdate) {
				allowedFields = [
					'firstName',
					'middleName',
					'lastName',
					'email',
					'phone',
					'address',
					'bio',
					'oldPassword',
					'newPassword',
					'avatar',
				];
			} else {
				const baseFields = [
					'firstName',
					'middleName',
					'lastName',
					'email',
					'phone',
					'address',
					'isActive',
				];
				switch (targetUser.role) {
					case 'student':
						allowedFields = [
							...baseFields,
							'classId',
							'className',
							'classLevel',
							'session',
							'guardian',
							'enrollmentStatus',
							'financialProfile',
						];
						break;
					case 'teacher':
						allowedFields = [...baseFields, 'subjects', 'sponsorClass'];
						break;
					case 'administrator':
						allowedFields = [...baseFields, 'position'];
						break;
					default:
						allowedFields = baseFields;
				}
			}
		} else if (isSelfUpdate) {
			allowedFields = [
				'email',
				'phone',
				'bio',
				'address',
				'oldPassword',
				'newPassword',
				'avatar',
			];
		} else {
			return NextResponse.json(
				{
					success: false,
					message: 'Unauthorized: You can only update your own profile',
				},
				{ status: 403 }
			);
		}

		const filteredUserData: any = {};
		allowedFields.forEach((field) => {
			if (updateUserData.hasOwnProperty(field)) {
				filteredUserData[field] = updateUserData[field];
			}
		});

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

		if (Object.keys(filteredUserData).length === 0) {
			return NextResponse.json({
				success: true,
				message: 'No updatable fields were provided.',
			});
		}

		const validationErrors = await validateUserData(
			filteredUserData,
			models,
			true,
			actualTargetUserId,
			forceAssignments
		);

		const conflictErrors = validationErrors.filter(
			(error) => error.requiresConfirmation
		);

		if (conflictErrors.length > 0 && !confirmReassignments) {
			const allConflicts = conflictErrors.reduce((acc, error) => {
				if (error.conflicts) acc.push(...error.conflicts);
				return acc;
			}, [] as ConflictDetails[]);

			return NextResponse.json(
				{
					success: false,
					message: 'Assignment conflicts detected',
					requiresConfirmation: true,
					errors: validationErrors,
					conflicts: allConflicts,
					conflictSummary: {
						sponsorshipConflicts: allConflicts.filter(
							(c) => c.type === 'sponsorship'
						).length,
						subjectConflicts: allConflicts.filter((c) => c.type === 'subject')
							.length,
					},
				},
				{ status: 409 }
			);
		}

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
				conflictsToHandle
			);
		}

		const nonConflictErrors = validationErrors.filter(
			(error) => !error.requiresConfirmation
		);
		if (nonConflictErrors.length > 0) {
			return NextResponse.json(
				{
					success: false,
					message: 'Validation failed',
					errors: nonConflictErrors,
				},
				{ status: 400 }
			);
		}

		const updateData: any = {
			...filteredUserData,
			updatedBy: currentUser.userId,
			updatedAt: new Date(),
		};

		if (isSelfUpdate && updateData.newPassword) {
			if (!updateData.oldPassword)
				return NextResponse.json(
					{ success: false, message: 'Old password is required' },
					{ status: 400 }
				);
			const isPasswordValid = await bcrypt.compare(
				updateData.oldPassword,
				targetUser.password
			);
			if (!isPasswordValid)
				return NextResponse.json(
					{ success: false, message: 'Incorrect old password' },
					{ status: 401 }
				);
			if (
				targetUser.mustChangePassword &&
				updateData.newPassword === targetUser.username
			) {
				return NextResponse.json(
					{
						success: false,
						message: 'New password cannot be the same as the default password.',
					},
					{ status: 400 }
				);
			}
			updateData.password = await hashPassword(updateData.newPassword);
			updateData.mustChangePassword = false;
			updateData.passwordChangedAt = new Date();
			updateData.defaultPassword = null;
			delete updateData.oldPassword;
			delete updateData.newPassword;
		}

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
				overwrite: false,
				upsert: false,
			}
		).select('-password -defaultPassword');

		if (!updatedUser) {
			return NextResponse.json(
				{
					success: false,
					message: 'Update failed: User not found after update.',
				},
				{ status: 404 }
			);
		}

		await updateAllUserSessions(
			actualTargetUserId,
			buildUserResponse(updatedUser.toObject())
		);

		return NextResponse.json({
			success: true,
			message: 'User updated successfully',
			data: { user: updatedUser },
			reassignments:
				conflictsToHandle.length > 0
					? {
							performed: true,
							count: conflictsToHandle.length,
							details: conflictsToHandle,
					  }
					: null,
		});
	} catch (error: any) {
		console.error('Error in PUT /users:', error);
		if (error instanceof Error && error.message.includes('session')) {
			return NextResponse.json(
				{ success: false, message: 'Authentication required' },
				{ status: 401 }
			);
		}
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

// DELETE: Delete user by ID (admin only)
export async function DELETE(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, ['system_admin']);
		if (!currentUser) {
			NextResponse.json(
				{
					success: false,
					message: 'Unauthorized',
				},
				{ status: 400 }
			);
		}

		const models = await getTenantModels();
		const body = await request.json();
		const { targetUserId, adminPassword } = body;

		if (!targetUserId) {
			return NextResponse.json(
				{ success: false, message: 'User ID is required' },
				{ status: 400 }
			);
		} else if (!adminPassword) {
			return NextResponse.json(
				{
					success: false,
					message: 'Admin password is required',
				},
				{ status: 400 }
			);
		}

		const adminUser = await models.SystemAdmin.findById(currentUser.userId);
		const isPasswordValid = await bcrypt.compare(
			adminPassword,
			adminUser.password
		);

		if (!isPasswordValid) {
			return NextResponse.json(
				{
					success: false,
					message: 'Invalid Admin Password',
				},
				{ status: 401 }
			);
		}

		const targetUser = await models.User.findById(targetUserId);
		if (!targetUser) {
			return NextResponse.json(
				{ success: false, message: 'User not found' },
				{ status: 404 }
			);
		}
		await destroyAllUserSessions(targetUserId);
		await models.User.deleteOne({ _id: targetUserId });
		return NextResponse.json({
			success: true,
			message: 'User and all active sessions deleted successfully',
			data: { userId: targetUserId },
		});
	} catch (error: any) {
		console.error('Error in DELETE /users:', error);
		if (error instanceof Error && error.message.includes('session')) {
			return NextResponse.json(
				{ success: false, message: 'Authentication required' },
				{ status: 401 }
			);
		}
		if (error instanceof Error && error.message.includes('Unauthorized')) {
			return NextResponse.json(
				{ success: false, message: error.message },
				{ status: 403 }
			);
		}
		return NextResponse.json(
			{ success: false, message: 'Failed to delete user' },
			{ status: 500 }
		);
	}
}
