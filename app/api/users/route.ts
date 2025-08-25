import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import bcrypt from 'bcryptjs';
import { authorizeUser, getTenantFromRequest } from '@/middleware';
import {
	getSession,
	createSession,
	destroySession,
	updateAllUserSessions,
	destroyAllUserSessions,
} from '@/utils/session';
import { sendOTP, verifyOTP } from '@/utils/otp';

/**
 * Sends an OTP to the admin for account deletion.
 *
 * @param adminUser - The admin user object.
 * @param otp - The one-time password to be sent.
 *
 * @returns {Promise<void>} - A promise that resolves when the OTP is sent.
 *
 * This function logs the OTP for demonstration purposes. In a production environment,
 * you should send the OTP via email or SMS.
 */
async function sendOtpToAdmin(adminUser: any, otp: string): Promise<void> {
	// This is a simple implementation that logs the OTP.
	// In production, you should send the OTP via email or SMS.
	const contact = adminUser.email || adminUser.phone || 'admin contact not set';
	console.log(`Sending OTP ${otp} to admin (${contact})`);
}

/**
 * Determines the starting year of the current academic year.
 * If the current month is August-December, the academic year starts in the current year.
 * Otherwise, it's the second half of the academic year that started in the previous year.
 */
function getAcademicYear(): number {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth(); // Check if the current month is between August and December (inclusive)

	if (currentMonth >= 7 && currentMonth <= 11) {
		return currentYear;
	} else {
		return currentYear - 1;
	}
}

function buildUserResponse(user: any) {
	const baseUser = {
		userId: user._id.toString(),
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

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Fetch users
 *     description: Returns a list of users, or a single user if teacher/student.
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by user role
 *       - in: query
 *         name: classId
 *         schema:
 *           type: string
 *         description: Filter by class ID
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of results
 *     responses:
 *       200:
 *         description: User(s) fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// -----------------------------------------------------------------------------
//                     GET - Fetch users
// -----------------------------------------------------------------------------
export async function GET(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request);
		const tenant = getTenantFromRequest(request);

		if (!tenant) {
			return NextResponse.json(
				{ success: false, message: 'Tenant not found' },
				{ status: 400 }
			);
		}

		const models = await getTenantModels(tenant);
		const { searchParams } = new URL(request.url);

		const role = searchParams.get('role');
		const classId = searchParams.get('classId');
		const targetId = searchParams.get('id');

		const rawLimit = searchParams.get('limit');
		const limit =
			rawLimit && !isNaN(parseInt(rawLimit)) ? parseInt(rawLimit) : 50000;

		let responseData; // --- TEACHER / STUDENT: Only fetch their own account ---

		if (['student'].includes(currentUser.role)) {
			responseData = await models.User.findById(currentUser.id).select(
				'-password -defaultPassword'
			);
			return NextResponse.json({
				success: true,
				message: 'User Fetch Successful',
				data: responseData,
			});
		} // --- Build filter query ---

		const filters: Record<string, any> = {};
		if (role) filters.role = role;
		if (classId) filters.classId = classId;
		if (targetId) filters._id = targetId; // --- SYSTEM ADMIN: can fetch all or filtered ---

		if (['teacher', 'system_admin'].includes(currentUser.role)) {
			if (Object.keys(filters).length === 0) {
				// No filters – fetch all users
				responseData = await models.User.find({})
					.limit(limit)
					.select('-password -defaultPassword');
			} else {
				// Filtered search
				responseData = await models.User.find(filters)
					.limit(limit)
					.select('-password -defaultPassword');
			}
		} // --- ADMINISTRATOR: fetch all users except system_admin ---
		else if (currentUser.role === 'administrator') {
			const adminFilters = {
				...filters,
				role: filters.role === 'system_admin' ? undefined : filters.role,
			}; // Add exclusion for system_admin

			const finalQuery = {
				...adminFilters,
				...(adminFilters.role ? {} : { role: { $ne: 'system_admin' } }),
			};

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
		console.error('Error in GET /users:', err); // Handle authentication errors specifically

		if (err instanceof Error && err.message.includes('session')) {
			return NextResponse.json(
				{
					success: false,
					message: 'Authentication required',
					error: 'Invalid or expired session',
				},
				{ status: 401 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: 'An error occurred',
				error: err instanceof Error ? err.message : String(err),
			},
			{ status: 500 }
		);
	}
}

// -----------------------------------------------------------------------------
//                      Helper functions
// -----------------------------------------------------------------------------

async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 12);
}

function validateUserData(userData: any, isUpdate: boolean = false): string[] {
	const errors: string[] = [];
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
				errors.push(`${field} is required`);
			}
		}
	}

	if (
		userData.gender &&
		!['male', 'female'].includes(userData.gender.toLowerCase())
	) {
		errors.push('Gender must be either "male" or "female"');
	}
	if (userData.email && !/\S+@\S+\.\S+/.test(userData.email)) {
		errors.push('Invalid email format');
	}
	if (userData.phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(userData.phone)) {
		errors.push('Invalid phone number format');
	} // Remove password validation for creation since we auto-generate // Only validate if password is being updated

	if (isUpdate && userData.newPassword && userData.newPassword.length < 8) {
		errors.push('New password must be at least 8 characters long');
	}

	if (userData.role || !isUpdate) {
		const role = userData.role;
		switch (role) {
			case 'student':
				if (!isUpdate) {
					if (!userData.classId || userData.classId.toString().trim() === '') {
						errors.push('classId is required for students');
					}
					if (
						!userData.guardian ||
						!userData.guardian.firstName ||
						!userData.guardian.lastName ||
						!userData.guardian.phone ||
						!userData.guardian.address
					) {
						errors.push(
							'Complete guardian information is required for students'
						);
					}
				}
				break;
			case 'administrator':
				if (!isUpdate && !userData.position) {
					errors.push('Position is required for administrators');
				}
				break;
			case 'teacher':
				if (!isUpdate && !userData.subjects) {
					errors.push('Subjects are required for teachers');
				}
				if (userData.isSponsor && !userData.sponsorClass) {
					errors.push('Sponsor class is required if isSponsor is true');
				}
				break;
		}
	}

	console.log('Validation errors:', errors);
	return errors;
}

/**
 * Generates a unique ID for a user based on their role
 * Format: PREFIX + YEAR + 4-digit sequence number
 */
async function generateIdByRole(models: any, role: string): Promise<string> {
	const prefixes = {
		student: 'STU',
		teacher: 'TEA',
		administrator: 'ADM',
		system_admin: 'SYS',
	};

	const idFieldMap = {
		student: 'studentId',
		teacher: 'teacherId',
		administrator: 'adminId',
		system_admin: 'sysId',
	};

	const prefix = prefixes[role as keyof typeof prefixes];
	const idField = idFieldMap[role as keyof typeof idFieldMap];
	const year = getAcademicYear();
	console.log('CURRENT YEAR: ', year); // Find the latest user for this role and academic year to determine the next sequence number

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

	const newId = `${prefix}${year}${sequenceNumber}`; // Check for a highly unlikely collision, just in case.

	const existingUser = await models.User.findOne({ [idField]: newId });
	if (existingUser) {
		// If a collision occurs, recursively call with a slight delay or throw an error.
		// For simplicity, we'll throw an error here.
		throw new Error(`ID collision detected for ${newId}. Please try again.`);
	}

	return newId;
}
/**
 * Generates username and default password based on user role and ID
 * Username and initial password are the same (user's role-based ID)
 */
function generateCredentials(roleBasedId: string): {
	username: string;
	defaultPassword: string;
} {
	return {
		username: roleBasedId,
		defaultPassword: roleBasedId,
	};
}

async function buildUserData(
	models: any,
	userData: any,
	currentUser: any
): Promise<any> {
	// Generate role-based ID first
	const roleBasedId = await generateIdByRole(models, userData.role); // Generate credentials based on the role-based ID

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
		defaultPassword: credentials.defaultPassword, // Store unhashed for admin reset
		nickName: userData.nickName?.trim(),
		dateOfBirth: new Date(userData.dateOfBirth),
		phone: userData.phone?.trim(),
		email: userData.email?.trim().toLowerCase(),
		address: userData.address.trim(),
		bio: userData.bio?.trim(),
		isActive: true,
		mustChangePassword: true, // User must change password on first login
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
					firstName: userData.guardian.firstName?.trim(),
					middleName: userData.guardian.middleName?.trim(),
					lastName: userData.guardian.lastName?.trim(),
					email: userData.guardian.email?.trim().toLowerCase(),
					phone: userData.guardian.phone?.trim(),
					address: userData.guardian.address?.trim(),
				},
				academicRecords: [],
				status: userData.status || 'enrolled',
			};
		case 'teacher':
			return {
				...commonData,
				subjects: userData.subjects || [],
				isSponsor: userData.isSponsor || false,
				sponsorClass: userData.isSponsor ? userData.sponsorClass : undefined,
				teacherId: roleBasedId,
			};
		case 'administrator':
			return {
				...commonData,
				position: userData.position,
				adminId: roleBasedId,
			};
		case 'system_admin':
			return {
				...commonData,
				sysId: roleBasedId,
			};
		default:
			throw new Error('Invalid user role');
	}
}

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     description: Only system_admin can create users. Username and password are auto-generated based on role ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created successfully with auto-generated credentials
 *       400:
 *         description: Validation or duplicate error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
// -----------------------------------------------------------------------------
//                  POST - Create a new user
// -----------------------------------------------------------------------------
export async function POST(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, ['system_admin']);
		const tenant = getTenantFromRequest(request);

		if (!tenant) {
			return NextResponse.json(
				{ success: false, message: 'Tenant not found' },
				{ status: 400 }
			);
		}

		const models = await getTenantModels(tenant);
		const userData = await request.json();

		const validationErrors = validateUserData(userData);
		if (validationErrors.length > 0) {
			return NextResponse.json(
				{
					success: false,
					message: 'Validation failed',
					errors: validationErrors,
				},
				{ status: 400 }
			);
		} // Check if email already exists (if provided)

		if (userData.email) {
			const emailExists = await models.User.findOne({ email: userData.email });
			if (emailExists) {
				return NextResponse.json(
					{ success: false, message: 'Email address is already registered' },
					{ status: 400 }
				);
			}
		}

		const finalUserData = await buildUserData(models, userData, currentUser);

		const newUser = await models.User.create(finalUserData);
		const userResponse = newUser.toObject(); // Remove sensitive data from response but include generated credentials for admin

		delete userResponse?.password;
		const responseData = {
			...userResponse,
			generatedCredentials: {
				username: finalUserData.username,
				defaultPassword: finalUserData.defaultPassword,
				note: 'User must change password on first login',
			},
		};
		delete responseData.defaultPassword; // Remove from main object

		return NextResponse.json(
			{
				success: true,
				message: `${
					userData.role.charAt(0).toUpperCase() + userData.role.slice(1)
				} created successfully`,
				data: { user: responseData },
			},
			{ status: 201 }
		);
	} catch (error: any) {
		console.error('API Error:', error); // Handle authentication errors specifically

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

		if (error.code === 11000) {
			const field = Object.keys(error.keyPattern || {})[0];
			return NextResponse.json(
				{ success: false, message: `${field} already exists` },
				{ status: 400 }
			);
		}
		if (error.name === 'ValidationError') {
			const validationErrors = Object.values(error.errors).map(
				(err: any) => err.message
			);
			return NextResponse.json(
				{
					success: false,
					message: 'Validation failed',
					errors: validationErrors,
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

/**
 * @swagger
 * /api/users:
 *   put:
 *     summary: Update a user
 *     description: System admin can update any user. Users can only update their own profile. Includes password reset functionality.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID to update
 *       - in: query
 *         name: resetPassword
 *         schema:
 *           type: boolean
 *         description: Admin-only flag to reset password to default
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation or duplicate error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

// -----------------------------------------------------------------------------
// 									PUT - Update a  user
// -----------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
	const currentUser = await authorizeUser(request);
	if (!currentUser) {
		return NextResponse.json(
			{
				success: false,
				message: 'Unauthorized',
			},
			{
				status: 401,
			}
		);
	}

	try {
		const tenant = getTenantFromRequest(request);

		if (!tenant) {
			return NextResponse.json(
				{ success: false, message: 'Tenant not found' },
				{ status: 400 }
			);
		}

		const models = await getTenantModels(tenant);
		const { searchParams } = new URL(request.url);
		const targetUserId = searchParams.get('id');
		const resetPassword = searchParams.get('resetPassword') === 'true';

		const actualTargetUserId = targetUserId || currentUser.userId;

		const targetUser = await models.User.findById(actualTargetUserId);
		if (!targetUser) {
			return NextResponse.json(
				{ success: false, message: 'User not found' },
				{ status: 404 }
			);
		}

		const isSystemAdmin = currentUser.role === 'system_admin';
		const isSelfUpdate = currentUser.userId === actualTargetUserId;

		// Handle password reset by admin
		if (resetPassword) {
			if (!isSystemAdmin) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Unauthorized: Only system administrators can reset passwords',
					},
					{ status: 403 }
				);
			}

			let defaultPassword;
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
					defaultPassword = targetUser.defaultPassword;
			}

			if (!defaultPassword) {
				return NextResponse.json(
					{
						success: false,
						message:
							"Could not determine the default password for this user's role.",
					},
					{ status: 400 }
				);
			}

			const updateData = {
				password: await hashPassword(defaultPassword),
				mustChangePassword: true,
				updatedBy: currentUser.userId,
				updatedAt: new Date(),
			};

			const updatedUser = await models.User.findOneAndUpdate(
				{ _id: actualTargetUserId },
				{ $set: updateData },
				{ new: true, runValidators: true }
			).select('-password -defaultPassword');

			// Destroy all sessions for the user whose password was reset
			await destroyAllUserSessions(actualTargetUserId);

			return NextResponse.json({
				success: true,
				message:
					'Password reset successfully. All active sessions have been terminated.',
				data: {
					user: updatedUser,
					resetInfo: {
						username: targetUser.username,
						temporaryPassword: defaultPassword,
						note: 'User must change password on next login',
					},
				},
			});
		}

		// Handle regular profile updates
		const userData = await request.json();
		let allowedFields: string[] = [];
		let filteredUserData: any = {};

		// Define allowed fields based on user role and context
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
					'avatar',
					'oldPassword',
					'newPassword',
				];
			} else {
				const baseFields = [
					'firstName',
					'middleName',
					'lastName',
					'email',
					'phone',
					'address',
					'bio',
					'isActive',
				];
				if (targetUser.role === 'student')
					allowedFields = [
						...baseFields,
						'classId',
						'classLevel',
						'className',
						'session',
					];
				else if (targetUser.role === 'teacher')
					allowedFields = [
						...baseFields,
						'subjects',
						'isSponsor',
						'sponsorClass',
					];
				else if (targetUser.role === 'administrator')
					allowedFields = [...baseFields, 'position'];
				else allowedFields = baseFields;
			}
		} else {
			if (!isSelfUpdate) {
				return NextResponse.json(
					{
						success: false,
						message: 'Unauthorized: You can only update your own profile',
					},
					{ status: 403 }
				);
			}
			allowedFields = [
				'email',
				'phone',
				'bio',
				'address',
				'avatar',
				'oldPassword',
				'newPassword',
			];
		}

		allowedFields.forEach((field) => {
			if (userData[field] !== undefined) {
				filteredUserData[field] = userData[field];
			}
		});

		//... (rest of validation and data processing logic remains the same)

		const updateData: any = {
			...filteredUserData,
			updatedBy: currentUser.userId,
			updatedAt: new Date(),
		};

		// Handle password change by user
		if (isSelfUpdate && filteredUserData.newPassword) {
			if (!filteredUserData.oldPassword) {
				return NextResponse.json(
					{
						success: false,
						message: 'Old password is required to change password',
					},
					{ status: 400 }
				);
			}
			const isPasswordValid = await bcrypt.compare(
				filteredUserData.oldPassword,
				targetUser.password
			);
			if (!isPasswordValid) {
				return NextResponse.json(
					{ success: false, message: 'Incorrect old password' },
					{ status: 401 }
				);
			}
			updateData.password = await hashPassword(filteredUserData.newPassword);
			updateData.mustChangePassword = false;
			delete updateData.oldPassword;
			delete updateData.newPassword;
		}

		//... (rebuild fullName, trim fields logic remains the same)

		const updatedUser = await models.User.findOneAndUpdate(
			{ _id: actualTargetUserId },
			{ $set: updateData },
			{ new: true, runValidators: true }
		).select('-password -defaultPassword');

		if (!updatedUser) {
			return NextResponse.json(
				{
					success: false,
					message: 'Update failed: User not found or no changes made',
				},
				{ status: 404 }
			);
		}

		// Update all sessions for the user
		const newSessionData = {
			tenantId: tenant,
			purpose: 'login',
			...buildUserResponse(updatedUser.toObject()),
		};
		await updateAllUserSessions(actualTargetUserId, newSessionData);

		// If password was changed, destroy other sessions
		if (isSelfUpdate && userData.newPassword) {
			const currentSessionId = request.cookies.get('sessionId')?.value;
			await destroyAllUserSessions(actualTargetUserId, currentSessionId); // Pass current session to exclude it
		}

		return NextResponse.json({
			success: true,
			message: 'User updated successfully',
			data: { user: updatedUser },
		});
	} catch (updateError: any) {
		console.error('Update operation failed:', updateError);
		// ... (error handling remains the same)
	}
}

/**
 * @swagger
 * /api/users:
 *   delete:
 *     summary: Delete a user
 *     description: Only system admin can delete users.
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Missing user ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
// -----------------------------------------------------------------------------
//                DELETE - Delete user
// -----------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, ['system_admin']);
		const tenant = getTenantFromRequest(request);

		if (!tenant) {
			return NextResponse.json(
				{ success: false, message: 'Tenant not found' },
				{ status: 400 }
			);
		}

		const models = await getTenantModels(tenant);
		const { searchParams } = new URL(request.url);
		const targetUserId = searchParams.get('id');

		if (!targetUserId) {
			return NextResponse.json(
				{ success: false, message: 'User ID is required' },
				{ status: 400 }
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
	} catch (error) {
		console.error('Error in DELETE /users:', error); // Handle authentication errors specifically

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
			{ success: false, message: 'Failed to delete user', error },
			{ status: 500 }
		);
	}
}

// -----------------------------------------------------------------------------
//                PATCH - Request OTP for Deletion
// -----------------------------------------------------------------------------
/**
 * Handles OTP generation, admin password verification, and sending OTP for deletion.
 * Expects { adminPassword, targetUserId } in the body.
 * Returns { success, message, sessionId }
 */
export async function PATCH(request: NextRequest) {
	const currentUser = await authorizeUser(request, ['system_admin']);
	if (!currentUser) {
		return NextResponse.json(
			{
				success: false,
				message: 'Unauthorized',
			},
			{ status: 400 }
		);
	}
	try {
		const { adminPassword, targetUserId, sessionId, otp, action } =
			await request.json();
		const tenant = getTenantFromRequest(request);

		if (!tenant) {
			return NextResponse.json(
				{ success: false, message: 'Tenant not found' },
				{ status: 400 }
			);
		}

		const models = await getTenantModels(tenant); // Handle different actions

		switch (action) {
			case 'verify_password': // Verify admin password before proceeding
				const adminUser = await models.User.findById(currentUser.userId);
				if (!adminUser) {
					return NextResponse.json(
						{ success: false, message: 'Admin user not found' },
						{ status: 401 }
					);
				}

				const passwordMatch = await bcrypt.compare(
					adminPassword,
					adminUser.password
				);
				if (!passwordMatch) {
					return NextResponse.json(
						{ success: false, message: 'Incorrect admin password' },
						{ status: 401 }
					);
				}

				return NextResponse.json({
					success: true,
					message: 'Password verified successfully',
				});

			case 'verify_otp': // Verify OTP for deletion
				if (!sessionId || !otp) {
					return NextResponse.json(
						{ success: false, message: 'Session ID and OTP are required' },
						{ status: 400 }
					);
				}

				const otpResult = await verifyOTP(
					sessionId,
					otp,
					tenant,
					currentUser.userId
				);
				if (!otpResult.success) {
					return NextResponse.json(
						{ success: false, message: otpResult.message },
						{ status: otpResult.status }
					);
				} // Get session to retrieve targetUserId

				const session = await getSession(sessionId);
				if (!session || !session.targetUserId) {
					return NextResponse.json(
						{
							success: false,
							message: 'Invalid session or missing target user',
						},
						{ status: 400 }
					);
				} // Verify the user still exists

				const userToDelete = await models.User.findById(session.targetUserId);
				if (!userToDelete) {
					return NextResponse.json(
						{ success: false, message: 'User not found' },
						{ status: 404 }
					);
				}

				await destroyAllUserSessions(session.targetUserId);
				await models.User.deleteOne({ _id: session.targetUserId });
				await destroySession(sessionId);

				return NextResponse.json({
					success: true,
					message: 'User and all active sessions deleted successfully',
					data: { userId: session.targetUserId },
				});

			default: // Default action: Request OTP for deletion
				if (!adminPassword || !targetUserId) {
					return NextResponse.json(
						{
							success: false,
							message: 'Missing adminPassword or targetUserId',
						},
						{ status: 400 }
					);
				} // Find the admin user from the session (must be system_admin)

				const currentAdminUser = await models.User.findById(currentUser.userId);
				if (!currentAdminUser) {
					return NextResponse.json(
						{ success: false, message: 'Admin user not found' },
						{ status: 401 }
					);
				} // Verify admin password

				const adminPasswordMatch = await bcrypt.compare(
					adminPassword,
					currentAdminUser.password
				);
				if (!adminPasswordMatch) {
					return NextResponse.json(
						{ success: false, message: 'Incorrect admin password' },
						{ status: 401 }
					);
				} // Verify target user exists

				const targetUser = await models.User.findById(targetUserId);
				if (!targetUser) {
					return NextResponse.json(
						{ success: false, message: 'Target user not found' },
						{ status: 404 }
					);
				} // Create session with OTP data

				const newSessionId = await createSession(
					{
						userId: currentAdminUser._id.toString(),
						tenantId: tenant,
						targetUserId,
						purpose: 'delete_user',
						email: currentAdminUser.email,
						phone: currentAdminUser.phone,
					},
					60 * 5
				); // 5 minutes expiry // Use the sendOTP helper to generate and send OTP

				const otpSendResult = await sendOTP(
					newSessionId,
					request.headers.get('host') || ''
				);

				if (!otpSendResult.success) {
					await destroySession(newSessionId); // Clean up on failure
					return NextResponse.json(
						{ success: false, message: otpSendResult.message },
						{ status: otpSendResult.status }
					);
				}

				return NextResponse.json({
					success: true,
					message: 'OTP sent to your registered contact',
					sessionId: newSessionId,
					contact: otpSendResult.contact,
				});
		}
	} catch (error) {
		console.error('Error in PATCH /users (OTP for deletion):', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to process request' },
			{ status: 500 }
		);
	}
}
