import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { authorizeUser } from '@/proxy';
import { getSchoolMeshModels } from '@/models/schoolmesh';
import {
	isIdentifierPassword,
	verifyLoginPassword,
	MIN_PASSWORD_LENGTH,
} from '@/utils/loginIdentity';

export async function POST(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, 'superadmin');
		if (!currentUser) {
			return NextResponse.json(
				{ message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const body = await request.json();
		const { oldPassword, newPassword } = body;

		if (!oldPassword || !newPassword) {
			return NextResponse.json(
				{ message: 'Current password and new password are required' },
				{ status: 400 },
			);
		}

		if (newPassword.length < MIN_PASSWORD_LENGTH) {
			return NextResponse.json(
				{
					message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
				},
				{ status: 400 },
			);
		}

		const { SuperAdmin } = await getSchoolMeshModels();
		const user = await SuperAdmin.findById(currentUser.id).lean();
		if (!user) {
			return NextResponse.json(
				{ message: 'User not found' },
				{ status: 404 },
			);
		}

		// Accepts the provisional username/phone credentials while
		// mustChangePassword is set, matching the login route.
		const isPasswordValid = await verifyLoginPassword(user, oldPassword);
		if (!isPasswordValid) {
			return NextResponse.json(
				{ message: 'Incorrect current password' },
				{ status: 401 },
			);
		}

		if (user.mustChangePassword && isIdentifierPassword(user, newPassword)) {
			return NextResponse.json(
				{ message: 'New password cannot be your username or your phone number' },
				{ status: 400 },
			);
		}

		const hashedPassword = await bcrypt.hash(newPassword, 12);
		const updatedUser = await SuperAdmin.findByIdAndUpdate(
			currentUser.id,
			{
				$set: {
					password: hashedPassword,
					mustChangePassword: false,
					passwordChangedAt: new Date(),
					defaultPassword: null,
				},
			},
			{ new: true, runValidators: true },
		).lean();

		if (!updatedUser) {
			return NextResponse.json(
				{ message: 'Failed to update password' },
				{ status: 500 },
			);
		}

		const userResponse = {
			id: updatedUser._id?.toString() || updatedUser.id,
			_id: updatedUser._id?.toString() || updatedUser.id,
			role: updatedUser.role,
			username: updatedUser.username,
			firstName: updatedUser.firstName,
			middleName: updatedUser.middleName,
			lastName: updatedUser.lastName,
			fullName: updatedUser.fullName,
			nickName: updatedUser.nickName,
			gender: updatedUser.gender,
			dateOfBirth: updatedUser.dateOfBirth,
			isActive: updatedUser.isActive,
			phone: updatedUser.phone,
			email: updatedUser.email,
			address: updatedUser.address,
			bio: updatedUser.bio,
			avatar: updatedUser.avatar,
			profilePictureUrl: updatedUser.profilePictureUrl,
			mustChangePassword: updatedUser.mustChangePassword,
			passwordChangedAt: updatedUser.passwordChangedAt,
			createdAt: updatedUser.createdAt,
			updatedAt: updatedUser.updatedAt,
		};

		return NextResponse.json({
			message: 'Password updated successfully',
			user: userResponse,
		});
	} catch (error) {
		console.error('Change password error:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 },
		);
	}
}
