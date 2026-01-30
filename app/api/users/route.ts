import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getTenantModels } from '@/models';
import { authorizeUser } from '@/proxy';
import { getSchoolProfile } from '@/lib/mongoose';
import {
	getSession,
	createSession,
	destroySession,
	updateAllUserSessions,
	destroyAllUserSessions,
} from '@/utils/session';
import { sendOTP, verifyOTP } from '@/utils/otp';
import type {
	UserRole,
	User,
	Student,
	Teacher,
	Administrator,
	SystemAdmin,
	StudentFinancialProfile,
	AIChatMessage,
	Notification,
} from '@/types';

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

function buildUserResponse(
	user: any,
): User | Student | Teacher | Administrator | SystemAdmin {
	const baseUser: User = {
		id: user._id?.toString(),
		username: user.username,
		firstName: user.firstName,
		middleName: user.middleName,
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
				academicYears: user.academicYears || [],
				guardian: user.guardian,
				financialProfile: user.financialProfile || {
					outstandingBalances: [],
					paymentRecords: [],
				},
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
				academicYears: user.academicYears || [],
			} as Administrator;

		case 'system_admin':
			return {
				...baseUser,
				role: 'system_admin',
				username: user.username,
			} as SystemAdmin;

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
	currentUser: any,
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
				className: userData.className,
				academicYears: [
					{
						year: academicYear,
						classId: userData.classId,
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
					paymentRecords: [],
				},
			};

		case 'teacher':
			return {
				...commonData,
				teacherId: roleBasedId,
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

async function getNextClass(
	currentClassId: string,
	schoolProfile: any,
): Promise<ClassInfo | null> {
	const allClasses = flattenClassStructure(schoolProfile.classLevels);

	const currentClassIndex = allClasses.findIndex(
		(c) => c.classId === currentClassId,
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
	schoolProfile: any,
): Promise<ClassInfo | null> {
	const allClasses = flattenClassStructure(schoolProfile.classLevels);

	const currentClassIndex = allClasses.findIndex(
		(c) => c.classId === currentClassId,
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
	promotionType: 'yearlyPromotion' | 'doublePromotion',
	promotedToClassId: string,
	promotedToClassName: string,
	newAcademicYear: string | null,
	models: any,
) {
	const schoolProfile = await getSchoolProfile();
	const currentAcademicYear = getAcademicYear();

	// Validate if double promotion is allowed
	if (promotionType === 'doublePromotion') {
		const allowDoublePromotion =
			schoolProfile.settings?.studentSettings?.allowDoublePromotion;
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
					? { year: ay.year, classId: promotedToClassId }
					: ay,
			);
		} else {
			// Add new academic year with the new class
			updateData['$push'] = {
				academicYears: {
					year: newAcademicYear,
					classId: promotedToClassId,
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
					? { year: ay.year, classId: promotedToClassId }
					: ay,
			);
		} else {
			// If current academic year doesn't exist, add it
			updateData['$push'] = {
				academicYears: {
					year: currentAcademicYear,
					classId: promotedToClassId,
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
	const currentAcademicYear = getAcademicYear();

	// Validate if semester demotion is allowed
	if (demotionType === 'semesterDemotion') {
		const allowSemesterDemotion =
			schoolProfile.settings?.studentSettings?.allowSemesterDemotion;
		if (!allowSemesterDemotion) {
			throw new Error(
				'Semester demotion is not allowed according to school settings. Please contact the school administrator.',
			);
		}
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
					? { year: ay.year, classId: demotedToClassId }
					: ay,
			);
		} else {
			updateData['$push'] = {
				academicYears: {
					year: previousAcademicYear,
					classId: demotedToClassId,
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
					? { year: ay.year, classId: demotedToClassId }
					: ay,
			);
		} else {
			updateData['$push'] = {
				academicYears: {
					year: currentAcademicYear,
					classId: demotedToClassId,
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
		teacherId: string;
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
		for (const yearData of userData.subjects) {
			const year = yearData.year || currentAcademicYear;

			if (yearData.classes && Array.isArray(yearData.classes)) {
				for (const classData of yearData.classes) {
					// Check if another teacher has this exact class assignment for this year
					const assignmentExists = await models.Teacher.findOne({
						...baseQuery,
						role: 'teacher',
						subjects: {
							$elemMatch: {
								year: year,
								classes: {
									$elemMatch: {
										classId: classData.classId,
									},
								},
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
								year: year,
								classId: classData.classId,
								subjects: classData.subjects || [],
							},
						};

						errors.push({
							field: 'subjects',
							type: 'DUPLICATE_ENTRY',
							message: `Class "${classData.classId}" for academic year ${year} is already assigned to ${conflict.conflictingTeacher.name} (${conflict.conflictingTeacher.teacherId}).`,
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

	return errors;
}

// --- FORCE REASSIGNMENT ---
async function handleForceReassignmentEnhanced(
	userData: any,
	models: any,
	newUserId: string | null,
	conflicts: ConflictDetails[],
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
	for (const conflict of subjectConflicts) {
		if (conflict.assignment) {
			// Remove the specific class assignment from the conflicting teacher
			// We need to pull the entire year entry and reconstruct it without this class
			const conflictingTeacher = await models.Teacher.findById(
				conflict.conflictingTeacher.id,
			).lean();

			if (conflictingTeacher && conflictingTeacher.subjects) {
				const updatedSubjects = conflictingTeacher.subjects
					.map((yearData: any) => {
						if (yearData.year === conflict.assignment!.year) {
							// Remove the conflicting class from this year's classes
							const filteredClasses = yearData.classes.filter(
								(classData: any) =>
									classData.classId !== conflict.assignment!.classId,
							);

							return {
								year: yearData.year,
								classes: filteredClasses,
							};
						}
						return yearData;
					})
					.filter((yearData: any) => yearData.classes.length > 0); // Remove empty year entries

				await models.Teacher.updateOne(
					{ _id: conflict.conflictingTeacher.id },
					{
						$set: {
							subjects: updatedSubjects,
							updatedAt: new Date(),
						},
					},
				);
			}
		}
	}
}

// GET: List users (with filter), or fetch single user
export async function GET(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request);
		const models = await getTenantModels();
		const { searchParams } = new URL(request.url);

		const role = searchParams.get('role') as UserRole | null;
		const classId = searchParams.get('classId');
		const targetId = searchParams.get('id');
		const academicYear = searchParams.get('academicYear');
		const limit = parseInt(searchParams.get('limit') || '50000', 10);
		const currentAcademicYear = getAcademicYear();

		let responseData: any;

		// 1. STUDENT ROLE - Can fetch classmates, their teachers, and administrators
		if (currentUser.role === 'student') {
			const studentData = await models.Student.findById(currentUser.id).lean();

			if (!studentData) {
				return NextResponse.json(
					{ success: false, message: 'Student profile not found' },
					{ status: 404 },
				);
			}

			const myClassId = studentData.classId;

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

			let filters: Record<string, any> = { isActive: true };

			// Determine what the student can see based on role filter
			if (role === 'student') {
				// Can see classmates in their class
				filters = {
					role: 'student',
					classId: myClassId,
					_id: { $ne: currentUser.id },
					isActive: true,
				};
			} else if (role === 'teacher') {
				// Can see teachers assigned to their class this year
				filters = {
					role: 'teacher',
					isActive: true,
					subjects: {
						$elemMatch: {
							year: academicYear || currentAcademicYear,
							'classes.classId': myClassId,
						},
					},
				};
			} else if (role === 'administrator') {
				// Can see all administrators
				filters = {
					role: 'administrator',
					isActive: true,
				};
			} else {
				// If no role specified, return classmates, teachers, and admins
				const classmates = await models.User.find({
					role: 'student',
					classId: myClassId,
					_id: { $ne: currentUser.id },
					isActive: true,
				})
					.limit(limit)
					.select('-password -defaultPassword')
					.lean();

				const teachers = await models.User.find({
					role: 'teacher',
					isActive: true,
					subjects: {
						$elemMatch: {
							year: academicYear || currentAcademicYear,
							'classes.classId': myClassId,
						},
					},
				})
					.select('-password -defaultPassword')
					.lean();

				const administrators = await models.User.find({
					role: 'administrator',
					isActive: true,
				})
					.select('-password -defaultPassword')
					.lean();

				// Apply privacy filters
				const filteredData = {
					students: classmates.map((s: any) => ({
						id: s._id.toString(),
						firstName: s.firstName,
						lastName: s.lastName,
						email: s.email,
						phone: s.shareContactWithClassmates ? s.phone : undefined,
						avatar: s.avatar || s.profilePictureUrl,
						bio: s.bio,
						nickName: s.nickName,
						gender: s.gender,
						className: s.className,
						role: 'student',
					})),
					teachers: teachers.map((t: any) => ({
						id: t._id.toString(),
						firstName: t.firstName,
						lastName: t.lastName,
						email: t.email,
						phone: t.phone,
						avatar: t.avatar || t.profilePictureUrl,
						bio: t.bio,
						nickName: t.nickName,
						gender: t.gender,
						subjects:
							t.subjects
								?.find(
									(s: any) => s.year === (academicYear || currentAcademicYear),
								)
								?.classes.flatMap((c: any) => c.subjects) || [],
						role: 'teacher',
					})),
					administrators: administrators.map((a: any) => ({
						id: a._id.toString(),
						firstName: a.firstName,
						lastName: a.lastName,
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

			// Apply specific ID filter if provided
			if (targetId) {
				filters._id = targetId;
			}

			const users = await models.User.find(filters)
				.limit(limit)
				.select('-password -defaultPassword')
				.lean();

			// Apply privacy filtering based on role
			const filteredUsers = users.map((user: any) => {
				if (user.role === 'student') {
					return {
						id: user._id.toString(),
						firstName: user.firstName,
						lastName: user.lastName,
						email: user.email,
						phone: user.shareContactWithClassmates ? user.phone : undefined,
						avatar: user.avatar || user.profilePictureUrl,
						bio: user.bio,
						nickName: user.nickName,
						gender: user.gender,
						className: user.className,
						role: 'student',
					};
				} else if (user.role === 'teacher') {
					return {
						id: user._id.toString(),
						firstName: user.firstName,
						lastName: user.lastName,
						email: user.email,
						phone: user.phone,
						avatar: user.avatar || user.profilePictureUrl,
						bio: user.bio,
						nickName: user.nickName,
						gender: user.gender,
						subjects:
							user.subjects
								?.find(
									(s: any) => s.year === (academicYear || currentAcademicYear),
								)
								?.classes.flatMap((c: any) => c.subjects) || [],
						role: 'teacher',
					};
				} else if (user.role === 'administrator') {
					return {
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
				return user;
			});

			return NextResponse.json({
				success: true,
				message: 'User Fetch Successful',
				data: filteredUsers,
			});
		}

		// 2. TEACHER ROLE - Can fetch students they teach
		if (currentUser.role === 'teacher') {
			const teacherData = await models.Teacher.findById(currentUser.id).lean();

			if (!teacherData) {
				return NextResponse.json(
					{ success: false, message: 'Teacher profile not found' },
					{ status: 404 },
				);
			}

			// Get all class IDs the teacher is assigned to (all years)
			const teacherClassIds = new Set<string>();
			const teacherYears = new Set<string>();

			teacherData.subjects.forEach((assignment: any) => {
				teacherYears.add(assignment.year);
				assignment.classes.forEach((c: any) => {
					teacherClassIds.add(c.classId);
				});
			});

			// If academicYear is specified, validate teacher has access to that year
			if (academicYear && !teacherYears.has(academicYear)) {
				return NextResponse.json({
					success: true,
					message: 'No records found for the specified academic year.',
					data: [],
				});
			}

			// Build filters for students the teacher can access
			const filters: Record<string, any> = {
				role: 'student',
				isActive: true,
			};

			// If specific student ID requested
			if (targetId) {
				filters._id = targetId;
			}

			// If specific class requested
			if (classId) {
				filters.classId = classId;
				// Verify teacher teaches this class
				if (!teacherClassIds.has(classId)) {
					return NextResponse.json({
						success: true,
						message: 'No access to students in this class.',
						data: [],
					});
				}
			} else {
				// Otherwise, only show students from classes the teacher teaches
				filters.classId = { $in: Array.from(teacherClassIds) };
			}

			// Filter by academic year if specified
			if (academicYear) {
				filters['academicYears.year'] = academicYear;
			}

			responseData = await models.User.find(filters)
				.limit(limit)
				.select('-password -defaultPassword')
				.lean();

			return NextResponse.json({
				success: true,
				message: 'User Fetch Successful',
				data: responseData,
			});
		}

		// 3. ADMINISTRATOR ROLE - Can fetch all users except system_admins
		if (currentUser.role === 'administrator') {
			const filters: Record<string, any> = { isActive: true };

			// Administrators cannot see system_admins unless specifically requested
			if (role === 'system_admin') {
				return NextResponse.json({
					success: true,
					message: 'Access denied to system admin records.',
					data: [],
				});
			}

			filters.role = { $ne: 'system_admin' };

			// Apply role filter if provided
			if (role) {
				filters.role = role;
			}

			// Apply class filter if provided
			if (classId) {
				filters.classId = classId;
			}

			// Apply target ID filter if provided
			if (targetId) {
				filters._id = targetId;
			}

			// Filter by academic year if provided
			if (academicYear) {
				filters.$or = [
					{ 'academicYears.year': academicYear }, // Students/Admins
					{ 'subjects.year': academicYear }, // Teachers
				];
			}

			responseData = await models.User.find(filters)
				.limit(limit)
				.select('-password -defaultPassword')
				.lean();

			return NextResponse.json({
				success: true,
				message: 'User Fetch Successful',
				data: responseData,
			});
		}

		// 4. SYSTEM_ADMIN ROLE - Can fetch all users including system_admins
		if (currentUser.role === 'system_admin') {
			const filters: Record<string, any> = { isActive: true };

			// Apply role filter if provided
			if (role) {
				filters.role = role;
			}

			// Apply class filter if provided
			if (classId) {
				filters.classId = classId;
			}

			// Apply target ID filter if provided
			if (targetId) {
				filters._id = targetId;
			}

			// Filter by academic year if provided
			if (academicYear) {
				filters.$or = [
					{ 'academicYears.year': academicYear }, // Students/Admins
					{ 'subjects.year': academicYear }, // Teachers
				];
			}

			responseData = await models.User.find(filters)
				.limit(limit)
				.select('-password -defaultPassword')
				.lean();

			return NextResponse.json({
				success: true,
				message: 'User Fetch Successful',
				data: responseData,
			});
		}

		// Fallback for unknown roles
		return NextResponse.json(
			{ success: false, message: 'Invalid user role' },
			{ status: 403 },
		);
	} catch (err) {
		console.error('Error in GET /users:', err);
		if (err instanceof Error && err.message.includes('session')) {
			return NextResponse.json(
				{ success: false, message: 'Authentication required' },
				{ status: 401 },
			);
		}
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

// --- POST Handler ---
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
			);
		}

		// Build and create the new user
		const finalUserData = await buildUserData(models, userData, currentUser);
		const newUser = await models.User.create(finalUserData);
		const userResponse = newUser.toObject();

		// Remove sensitive data
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

		const models = await getTenantModels();
		const { searchParams } = new URL(request.url);
		const targetUserId = searchParams.get('id');
		const resetPassword = searchParams.get('resetPassword') === 'true';
		const action = searchParams.get('action');
		const promotionType = searchParams.get('type') as
			| 'yearlyPromotion'
			| 'doublePromotion'
			| 'yearlyDemotion'
			| 'semesterDemotion';

		const actualTargetUserId = targetUserId || currentUser.userId;

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
										: 'Double Promotion (Mid-Year)'
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
		const isSelfUpdate = currentUser.userId === actualTargetUserId;

		// Define allowed fields based on role and permissions
		let allowedFields: string[] = [];
		if (isSystemAdmin) {
			if (isSelfUpdate) {
				// System admin updating themselves
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
				// System admin updating other users
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
			// Non-admin users updating themselves
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

		if (Object.keys(filteredUserData).length === 0) {
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

		// Handle password change for self-update
		if (isSelfUpdate && updateData.newPassword) {
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

		// Update sessions
		await updateAllUserSessions(
			actualTargetUserId,
			buildUserResponse(updatedUser.toObject()),
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
		const currentUser = await authorizeUser(request, ['system_admin']);
		if (!currentUser) {
			return NextResponse.json(
				{
					success: false,
					message: 'Unauthorized',
				},
				{ status: 401 },
			);
		}

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

		// Verify admin password
		const adminUser = await models.SystemAdmin.findById(currentUser.userId);
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

		// Prevent self-deletion
		if (targetUserId === currentUser.userId) {
			return NextResponse.json(
				{
					success: false,
					message: 'You cannot delete your own account',
				},
				{ status: 400 },
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

			case 'system_admin':
				// Additional checks for deleting system admins
				const systemAdminCount = await models.SystemAdmin.countDocuments({
					isActive: true,
				});

				if (systemAdminCount <= 1) {
					return NextResponse.json(
						{
							success: false,
							message: 'Cannot delete the last system administrator',
						},
						{ status: 400 },
					);
				}
				break;
		}

		// Destroy all user sessions
		await destroyAllUserSessions(targetUserId);
		cascadeResults.sessionsDestroyed = true;

		// Delete the user
		await models.User.deleteOne({ _id: targetUserId });

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
