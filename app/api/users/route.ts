import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels, getUserModel } from '@/models';
import bcrypt from 'bcryptjs';
import { authorizeUser, getTenantFromRequest, UserRole } from '@/middleware';
import { getSession, createSession, destroySession } from '@/utils/session';
import { sendOTP, verifyOTP } from '@/utils/otp';

async function sendOtpToAdmin(adminUser: any, otp: string): Promise<void> {
	// This is a simple implementation that logs the OTP.
	// In production, you should send the OTP via email or SMS.
	const contact = adminUser.email || adminUser.phone || 'admin contact not set';
	console.log(`Sending OTP ${otp} to admin (${contact})`);
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
			rawLimit && !isNaN(parseInt(rawLimit)) ? parseInt(rawLimit) : 50;

		let responseData;

		// --- TEACHER / STUDENT: Only fetch their own account ---
		if (['student'].includes(currentUser.role)) {
			responseData = await models.User.findById(currentUser.id).select(
				'-password'
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
					.select('-password');
			} else {
				// Filtered search
				responseData = await models.User.find(filters)
					.limit(limit)
					.select('-password');
				console.log('RESPONSE: ', responseData);
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
				.select('-password');
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
		'username',
		'password',
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
	if (userData.password && userData.password.length < 8) {
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

async function generateIdByRole(models: any, role: string): Promise<string> {
	const prefixes = {
		student: 'STU',
		teacher: 'TEA',
		administrator: 'ADM',
		system_admin: 'SYS',
	};
	const year = new Date().getFullYear();
	const prefix = prefixes[role as keyof typeof prefixes];

	let idField = '';
	switch (role) {
		case 'student':
			idField = 'studentId';
			break;
		case 'teacher':
			idField = 'teacherId';
			break;
		case 'administrator':
			idField = 'adminId';
			break;
		case 'system_admin':
			idField = 'sysId';
			break;
	}

	// Keep trying until we find a unique ID
	let attempts = 0;
	const maxAttempts = 100;

	while (attempts < maxAttempts) {
		// Find the latest user for this role, ordered by the id descending
		const lastUser = await models.User.findOne({
			role,
			[idField]: { $regex: `^${prefix}${year}` },
		})
			.sort({ [idField]: -1 })
			.lean();

		let nextNumber = 1;
		if (lastUser && lastUser[idField]) {
			const lastId = lastUser[idField];
			const match = lastId.match(/\d+$/); // match trailing digits
			if (match) {
				nextNumber = parseInt(match[0], 10) + 1;
			}
		}

		// Add attempt number to avoid collisions in concurrent requests
		const candidateId = `${prefix}${year}${String(
			nextNumber + attempts
		).padStart(4, '0')}`;

		// Check if this ID already exists
		const existingUser = await models.User.findOne({
			[idField]: candidateId,
		});

		if (!existingUser) {
			return candidateId;
		}

		attempts++;
	}

	// If we've exhausted attempts, throw an error
	throw new Error(
		`Unable to generate unique ${idField} after ${maxAttempts} attempts`
	);
}

// Option 2: Counter-based approach (more efficient)
async function generateIdByRoleWithCounter(
	models: any,
	role: string
): Promise<string> {
	const prefixes = {
		student: 'STU',
		teacher: 'TEA',
		administrator: 'ADM',
		system_admin: 'SYS',
	};
	const year = new Date().getFullYear();
	const prefix = prefixes[role as keyof typeof prefixes];

	let idField = '';
	switch (role) {
		case 'student':
			idField = 'studentId';
			break;
		case 'teacher':
			idField = 'teacherId';
			break;
		case 'administrator':
			idField = 'adminId';
			break;
		case 'system_admin':
			idField = 'sysId';
			break;
	}

	// Use MongoDB's atomic findOneAndUpdate to get next sequence number
	const counterDoc = await models.Counter?.findOneAndUpdate(
		{ _id: `${role}_${year}` },
		{ $inc: { sequence: 1 } },
		{ upsert: true, new: true }
	);

	const sequenceNumber = counterDoc?.sequence || 1;
	return `${prefix}${year}${String(sequenceNumber).padStart(4, '0')}`;
}

async function buildUserData(
	models: any,
	userData: any,
	currentUser: any
): Promise<any> {
	const commonData = {
		firstName: userData.firstName.trim(),
		middleName: userData.middleName?.trim(),
		lastName: userData.lastName.trim(),
		fullName: `${userData.firstName.trim()} ${
			userData.middleName ? userData.middleName.trim() + ' ' : ''
		}${userData.lastName.trim()}`,
		gender: userData.gender,
		username: userData.username.toLowerCase().trim(),
		password: await hashPassword(userData.password),
		nickName: userData.nickName?.trim(),
		dateOfBirth: new Date(userData.dateOfBirth),
		phone: userData.phone?.trim(),
		email: userData.email?.trim().toLowerCase(),
		address: userData.address.trim(),
		bio: userData.bio?.trim(),
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
				studentId: await generateIdByRole(models, 'student'),
				classId: userData.classId,
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
				teacherId: await generateIdByRole(models, 'teacher'),
			};
		case 'administrator':
			return {
				...commonData,
				position: userData.position,
				adminId: await generateIdByRole(models, 'administrator'),
			};
		case 'system_admin':
			return {
				...commonData,
				sysId: await generateIdByRole(models, 'system_admin'),
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
 *     description: Only system_admin can create users.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created successfully
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

		// Only system_admin can create users (already enforced by authorizeUser)
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

		const usernameExists = await models.User.findOne({
			username: userData.username,
		});
		if (usernameExists) {
			return NextResponse.json(
				{ success: false, message: 'Username is already registered' },
				{ status: 400 }
			);
		}

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
		delete userResponse?.password;

		return NextResponse.json(
			{
				success: true,
				message: `${
					userData.role.charAt(0).toUpperCase() + userData.role.slice(1)
				} created successfully`,
				data: { user: userResponse },
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
 *     description: System admin can update any user. Users can only update their own profile.
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

		let allowedFields: string[] = [];
		let filteredUserData: any = {};

		if (isSystemAdmin) {
			allowedFields = Object.keys(userData);
			filteredUserData = { ...userData };
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

		if (isSystemAdmin) {
			if (
				filteredUserData.username &&
				filteredUserData.username !== targetUser.username
			) {
				const usernameExists = await models.User.findOne({
					username: filteredUserData.username,
					_id: { $ne: targetUserId },
				});
				if (usernameExists) {
					return NextResponse.json(
						{ success: false, message: 'Username is already taken' },
						{ status: 400 }
					);
				}
			}
			if (
				filteredUserData.email &&
				filteredUserData.email !== targetUser.email
			) {
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
		}

		const updateData: any = {
			...filteredUserData,
			updatedBy: currentUser.userId,
			updatedAt: new Date(),
		};

		if (filteredUserData.password) {
			updateData.password = await hashPassword(filteredUserData.password);
		}

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
		if (updateData.username)
			updateData.username = updateData.username.toLowerCase();

		const updatedUser = await models.User.findOneAndUpdate(
			{ _id: targetUserId },
			{ $set: updateData },
			{
				new: true,
				runValidators: true,
			}
		).select('-password');

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

		switch (action) {
			case 'verify_password':
				const isPasswordValid = bcrypt.compare();
				break;
			case 'verify_otp':
				break;
			default:
				break;
		}

		const models = await getTenantModels(tenant);

		// If sessionId and OTP are provided, verify OTP for deletion
		if (sessionId && otp) {
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
					{ success: false, message: 'Invalid session or missing target user' },
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
		}

		// If no sessionId/OTP, handle initial OTP request
		if (!adminPassword || !targetUserId) {
			return NextResponse.json(
				{ success: false, message: 'Missing adminPassword or targetUserId' },
				{ status: 400 }
			);
		}

		// Find the admin user from the session (must be system_admin)
		const currentUser = await authorizeUser(request, ['system_admin']);
		const adminUser = await models.User.findById(currentUser.userId);
		if (!adminUser) {
			return NextResponse.json(
				{ success: false, message: 'Admin user not found' },
				{ status: 401 }
			);
		}

		// Verify admin password
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
				userId: adminUser._id.toString(),
				tenantId: tenant,
				targetUserId,
				purpose: 'delete_user',
				email: adminUser.email,
				phone: adminUser.phone,
			},
			60 * 5
		); // 5 minutes expiry

		// Use the sendOTP helper to generate and send OTP
		const otpResult = await sendOTP(
			newSessionId,
			request.headers.get('host') || ''
		);

		if (!otpResult.success) {
			await destroySession(newSessionId); // Clean up on failure
			return NextResponse.json(
				{ success: false, message: otpResult.message },
				{ status: otpResult.status }
			);
		}

		return NextResponse.json({
			success: true,
			message: 'OTP sent to your registered contact',
			sessionId: newSessionId,
			contact: otpResult.contact,
		});
	} catch (error) {
		console.error('Error in PATCH /users (OTP for deletion):', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to process request' },
			{ status: 500 }
		);
	}
}
