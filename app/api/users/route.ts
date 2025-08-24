import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import bcrypt from 'bcryptjs';
import { authorizeUser, getTenantFromRequest, UserRole } from '@/middleware';
import { getSession, createSession, destroySession } from '@/utils/session';
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
	const currentMonth = now.getMonth();

	// Check if the current month is between August and December (inclusive)
	if (currentMonth >= 7 && currentMonth <= 11) {
		return currentYear;
	} else {
		return currentYear - 1;
	}
}

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Fetch users
 *     description: Returns a list of users, or a single user if teacher/student.
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by user role
 *       - in: query
 *         name: classId
 *         schema:
 *           type: string
 *         description: Filter by class ID
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of results
 *     responses:
 *       200:
 *         description: User(s) fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// -----------------------------------------------------------------------------
//										 GET - Fetch users
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

		let responseData;

		// --- TEACHER / STUDENT: Only fetch their own account ---
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

		// --- Build filter query ---
		const filters: Record<string, any> = {};
		if (role) filters.role = role;
		if (classId) filters.classId = classId;
		if (targetId) filters._id = targetId;

		// --- SYSTEM ADMIN: can fetch all or filtered ---
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
		}

		// --- ADMINISTRATOR: fetch all users except system_admin ---
		else if (currentUser.role === 'administrator') {
			const adminFilters = {
				...filters,
				role: filters.role === 'system_admin' ? undefined : filters.role,
			};

			// Add exclusion for system_admin
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
		console.error('Error in GET /users:', err);

		// Handle authentication errors specifically
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
// 											Helper functions
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
	}

	// Remove password validation for creation since we auto-generate
	// Only validate if password is being updated
	if (isUpdate && userData.password && userData.password.length < 8) {
		errors.push('Password must be at least 8 characters long');
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
	console.log('CURRENT YEAR: ', year);

	// Find the latest user for this role and academic year to determine the next sequence number
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

	const newId = `${prefix}${year}${sequenceNumber}`;

	// Check for a highly unlikely collision, just in case.
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
	console.log(roleBasedId);
	return {
		username: roleBasedId, // Use the ID directly (it's already uppercase)
		defaultPassword: roleBasedId, // Password is the same, case-sensitive
	};
}

async function buildUserData(
	models: any,
	userData: any,
	currentUser: any
): Promise<any> {
	// Generate role-based ID first
	const roleBasedId = await generateIdByRole(models, userData.role);

	// Generate credentials based on the role-based ID
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
 *   post:
 *     summary: Create a new user
 *     description: Only system_admin can create users. Username and password are auto-generated based on role ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created successfully with auto-generated credentials
 *       400:
 *         description: Validation or duplicate error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
// -----------------------------------------------------------------------------
// 									POST - Create a new user
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
		}

		// Check if email already exists (if provided)
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
		const userResponse = newUser.toObject();

		// Remove sensitive data from response but include generated credentials for admin
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
		console.error('API Error:', error);

		// Handle authentication errors specifically
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
 *   put:
 *     summary: Update a user
 *     description: System admin can update any user. Users can only update their own profile. Includes password reset functionality.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID to update
 *       - in: query
 *         name: resetPassword
 *         schema:
 *           type: boolean
 *         description: Admin-only flag to reset password to default
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation or duplicate error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

// -----------------------------------------------------------------------------
// 									PUT - Update a  user
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
				status: 400,
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
		const userData = await request.json();
		const { searchParams } = new URL(request.url);
		const targetUserId = searchParams.get('id');
		const resetPassword = searchParams.get('resetPassword') === 'true';

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

		const isSystemAdmin = currentUser.role === 'system_admin';
		const isSelfUpdate = currentUser.userId === targetUserId;

		// Handle password reset (admin only)
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

			if (!targetUser.defaultPassword) {
				return NextResponse.json(
					{
						success: false,
						message: 'Default password not found for this user',
					},
					{ status: 400 }
				);
			}

			const updateData = {
				password: await hashPassword(targetUser.defaultPassword),
				mustChangePassword: true,
				updatedBy: currentUser.userId,
				updatedAt: new Date(),
			};

			const updatedUser = await models.User.findOneAndUpdate(
				{ _id: targetUserId },
				{ $set: updateData },
				{ new: true, runValidators: true }
			).select('-password -defaultPassword');

			return NextResponse.json({
				success: true,
				message:
					'Password reset to default successfully. User must change password on next login.',
				data: {
					user: updatedUser,
					resetInfo: {
						username: targetUser.username,
						temporaryPassword: targetUser.defaultPassword,
						note: 'User must change password on next login',
					},
				},
			});
		}

		let allowedFields: string[] = [];
		let filteredUserData: any = {};

		if (isSystemAdmin) {
			// System admin can update most fields except username and defaultPassword
			allowedFields = Object.keys(userData).filter(
				(field) => !['username', 'defaultPassword'].includes(field)
			);
			allowedFields.forEach((field) => {
				if (userData[field] !== undefined) {
					filteredUserData[field] = userData[field];
				}
			});
		} else if (isSelfUpdate) {
			allowedFields = ['bio', 'phone', 'password', 'email'];
			allowedFields.forEach((field) => {
				if (userData[field] !== undefined) {
					filteredUserData[field] = userData[field];
				}
			});
			if (Object.keys(filteredUserData).length === 0) {
				return NextResponse.json(
					{
						success: false,
						message:
							'You can only update your bio, phone number, email, and password',
					},
					{ status: 403 }
				);
			}
		} else {
			return NextResponse.json(
				{
					success: false,
					message: 'Unauthorized: You can only update your own profile',
				},
				{ status: 403 }
			);
		}

		if (!isSystemAdmin) {
			const unauthorizedFields = Object.keys(userData).filter(
				(field) => !allowedFields.includes(field)
			);
			if (unauthorizedFields.length > 0) {
				return NextResponse.json(
					{
						success: false,
						message: `Unauthorized fields: ${unauthorizedFields.join(
							', '
						)}. You can only update: ${allowedFields.join(', ')}`,
					},
					{ status: 403 }
				);
			}
		}

		const validationErrors = validateUserData(filteredUserData, true);
		if (validationErrors.length > 0) {
			return NextResponse.json(
				{
					success: false,
					message: 'Validation failed',
					errors: validationErrors,
				},
				{ status: 400 }
			);
		}

		if (
			filteredUserData.role &&
			filteredUserData.role !== targetUser.role &&
			!isSystemAdmin
		) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Unauthorized: Only system administrators can change user roles',
				},
				{ status: 403 }
			);
		}

		// Check for email conflicts (only if email is being updated)
		if (filteredUserData.email && filteredUserData.email !== targetUser.email) {
			const emailExists = await models.User.findOne({
				email: filteredUserData.email,
				_id: { $ne: targetUserId },
			});
			if (emailExists) {
				return NextResponse.json(
					{ success: false, message: 'Email address is already taken' },
					{ status: 400 }
				);
			}
		}

		const updateData: any = {
			...filteredUserData,
			updatedBy: currentUser.userId,
			updatedAt: new Date(),
		};

		// Handle password updates
		if (filteredUserData.password) {
			updateData.password = await hashPassword(filteredUserData.password);
			// If user is changing their own password, clear mustChangePassword flag
			if (isSelfUpdate) {
				updateData.mustChangePassword = false;
			}
		}

		// Trim string fields
		[
			'firstName',
			'middleName',
			'lastName',
			'nickName',
			'phone',
			'email',
			'address',
			'bio',
		].forEach((field) => {
			if (updateData[field]) {
				updateData[field] = updateData[field].trim();
			}
		});
		if (updateData.email) updateData.email = updateData.email.toLowerCase();

		const updatedUser = await models.User.findOneAndUpdate(
			{ _id: targetUserId },
			{ $set: updateData },
			{
				new: true,
				runValidators: true,
			}
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

		return NextResponse.json({
			success: true,
			message: 'User updated successfully',
			data: { user: updatedUser },
		});
	} catch (updateError: any) {
		console.error('Update operation failed:', updateError);

		// Handle authentication errors specifically
		if (
			updateError instanceof Error &&
			updateError.message.includes('session')
		) {
			return NextResponse.json(
				{ success: false, message: 'Authentication required' },
				{ status: 401 }
			);
		}

		if (updateError.code === 11000) {
			const field = Object.keys(updateError.keyPattern || {})[0];
			return NextResponse.json(
				{ success: false, message: `${field} already exists` },
				{ status: 400 }
			);
		}
		if (updateError.name === 'ValidationError') {
			const validationErrors = Object.values(updateError.errors).map(
				(err: any) => err.message
			);
			return NextResponse.json(
				{
					success: false,
					message: 'Validation failed during update',
					errors: validationErrors,
				},
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{ success: false, message: 'Failed to update user' },
			{ status: 500 }
		);
	}
}

/**
 * @swagger
 * /api/users:
 *   delete:
 *     summary: Delete a user
 *     description: Only system admin can delete users.
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Missing user ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
// -----------------------------------------------------------------------------
// 								DELETE - Delete user
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

		await models.User.deleteOne({ _id: targetUserId });

		return NextResponse.json({
			success: true,
			message: 'User deleted successfully',
			data: { userId: targetUserId },
		});
	} catch (error) {
		console.error('Error in DELETE /users:', error);

		// Handle authentication errors specifically
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
// 								PATCH - Request OTP for Deletion
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

		const models = await getTenantModels(tenant);

		// Handle different actions
		switch (action) {
			case 'verify_password':
				// Verify admin password before proceeding
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

			case 'verify_otp':
				// Verify OTP for deletion
				if (!sessionId || !otp) {
					return NextResponse.json(
						{ success: false, message: 'Session ID and OTP are required' },
						{ status: 400 }
					);
				}

				const otpResult = await verifyOTP(sessionId, otp, tenant);
				if (!otpResult.success) {
					return NextResponse.json(
						{ success: false, message: otpResult.message },
						{ status: otpResult.status }
					);
				}

				// Get session to retrieve targetUserId
				const session = await getSession(sessionId);
				if (!session || !session.targetUserId) {
					return NextResponse.json(
						{
							success: false,
							message: 'Invalid session or missing target user',
						},
						{ status: 400 }
					);
				}

				// Verify the user still exists
				const userToDelete = await models.User.findById(session.targetUserId);
				if (!userToDelete) {
					return NextResponse.json(
						{ success: false, message: 'User not found' },
						{ status: 404 }
					);
				}

				// Delete the user
				await models.User.deleteOne({ _id: session.targetUserId });

				// Clean up the session
				await destroySession(sessionId);

				return NextResponse.json({
					success: true,
					message: 'User deleted successfully',
					data: { userId: session.targetUserId },
				});

			default:
				// Default action: Request OTP for deletion
				if (!adminPassword || !targetUserId) {
					return NextResponse.json(
						{
							success: false,
							message: 'Missing adminPassword or targetUserId',
						},
						{ status: 400 }
					);
				}

				// Find the admin user from the session (must be system_admin)
				const currentAdminUser = await models.User.findById(currentUser.userId);
				if (!currentAdminUser) {
					return NextResponse.json(
						{ success: false, message: 'Admin user not found' },
						{ status: 401 }
					);
				}

				// Verify admin password
				const adminPasswordMatch = await bcrypt.compare(
					adminPassword,
					currentAdminUser.password
				);
				if (!adminPasswordMatch) {
					return NextResponse.json(
						{ success: false, message: 'Incorrect admin password' },
						{ status: 401 }
					);
				}

				// Verify target user exists
				const targetUser = await models.User.findById(targetUserId);
				if (!targetUser) {
					return NextResponse.json(
						{ success: false, message: 'Target user not found' },
						{ status: 404 }
					);
				}

				// Create session with OTP data
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
				); // 5 minutes expiry

				// Use the sendOTP helper to generate and send OTP
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
