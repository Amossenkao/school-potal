import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getTenantModels } from '@/models';
import { authorizeUser } from '@/middleware';
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

function getAcademicYear(): number {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();
	return currentMonth >= 7 ? currentYear : currentYear - 1;
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
		photo: user.photo,
		avatar: user.avatar,
		isActive: user.isActive,
		mustChangePassword: user.mustChangePassword,
		passwordChangedAt: user.passwordChangedAt || null,
	};

	switch (user.role) {
		case 'student':
			return {
				...baseUser,
				studentId: user.studentId,
				classId: user.classId,
				className: user.className,
				classLevel: user.classLevel,
				session: user.session,
				guardian: user.guardian,
			};
		case 'teacher':
			return {
				...baseUser,
				teacherId: user.teacherId,
				subjects: user.subjects,
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
	const prefixes: { [key: string]: string } = {
		student: 'STU',
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
	const year = getAcademicYear();
	const lastUser = await models.User.findOne({
		role,
		[idField]: { $regex: `^${prefix}${year}` },
	})
		.sort({ [idField]: -1 })
		.lean();
	let nextNumber = 1;
	if (lastUser && lastUser[idField]) {
		const lastId = lastUser[idField];
		const sequenceStr = lastId.substring(
			prefix.length + year.toString().length
		);
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
	};

	switch (userData.role) {
		case 'student':
			return {
				...commonData,
				studentId: roleBasedId,
				classId: userData.classId,
				classLevel: userData.classLevel,
				className: userData.className,
				session: userData.session,
				guardian: {
					firstName: userData.guardian?.firstName?.trim(),
					lastName: userData.guardian?.lastName?.trim(),
					email: userData.guardian?.email?.trim().toLowerCase(),
					phone: userData.guardian?.phone?.trim(),
					address: userData.guardian?.address?.trim(),
				},
			};
		case 'teacher':
			return {
				...commonData,
				teacherId: roleBasedId,
				subjects: userData.subjects || [],
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
	const isSelfContainedAssignment =
		userData.subjects?.some((s) => s.level === 'Self Contained') ||
		userData.sponsorClass;

	if (isSelfContainedAssignment && userData.sponsorClass) {
		const session = userData.subjects.find(
			(s) => s.level === 'Self Contained'
		)?.session;
		if (session) {
			const existingSponsor = await models.Teacher.findOne({
				...baseQuery,
				role: 'teacher',
				'subjects.session': session,
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
				const assignmentExists = await models.Teacher.findOne({
					...baseQuery,
					role: 'teacher',
					subjects: {
						$elemMatch: {
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
							subject: assignment.subject,
							level: assignment.level,
							session: assignment.session,
						},
					};

					errors.push({
						field: 'subjects',
						type: 'DUPLICATE_ENTRY',
						message: `Subject "${assignment.subject}" at ${assignment.level} level (${assignment.session} session) is already assigned to ${conflict.conflictingTeacher.name} (${conflict.conflictingTeacher.teacherId}).`,
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
// This function will REMOVE the sponsorship/subject from the old teacher before assigning to the new one
async function handleForceReassignmentEnhanced(
	userData: any,
	models: any,
	newUserId: string | null,
	conflicts: ConflictDetails[]
) {
	// Remove sponsorship from old teacher(s)
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

	// Remove subject assignments from old teacher(s)
	const subjectConflicts = conflicts.filter((c) => c.type === 'subject');
	for (const conflict of subjectConflicts) {
		if (conflict.assignment) {
			const matchCriteria = {
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
	// Handle self-contained conflicts
	const selfContainedConflicts = conflicts.filter(
		(c) => c.type === 'self_contained_conflict'
	);
	for (const conflict of selfContainedConflicts) {
		// Remove all subjects and sponsorship for the session from the conflicting teacher
		const session = conflict.assignment?.session;
		if (session) {
			await models.Teacher.updateOne(
				{ _id: conflict.conflictingTeacher.id },
				{
					$pull: { subjects: { session: session } },
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

		// --- Fix: Remove from previous teacher(s) before assigning to new one
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
		const action = searchParams.get('action'); // expecting 'promote' or 'demote'
		const promotionType = searchParams.get('type'); // expecting 'yearly' or 'semester'

		const actualTargetUserId = targetUserId || currentUser.userId;

		if (action === 'promote' || action === 'demote') {
			// Ensure only admins can perform this action
			if (currentUser.role !== 'system_admin') {
				return NextResponse.json(
					{ success: false, message: 'Unauthorized' },
					{ status: 403 }
				);
			}
			// ... promotion/demotion logic will go here
			return NextResponse.json({
				success: true,
				message: 'Promotion/demotion endpoint hit',
			});
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
			// Only system_admin can reset other users' passwords
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

			// System admin cannot reset their own password using this endpoint
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

			// Generate new default password based on user's role-based ID
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

			// Update password and set mustChangePassword flag
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

			// Destroy all user sessions to force re-login with new password
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

		// Regular update logic continues here...
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
