import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getSchoolMeshModels } from '@/models/schoolmesh';

export async function PATCH(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, 'superadmin');
		if (!currentUser) {
			return NextResponse.json(
				{ message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const body = await request.json();
		const { firstName, middleName, lastName, nickName, phone, email, address, bio, avatar, gender, dateOfBirth } = body;

		const { SuperAdmin } = await getSchoolMeshModels();

		const updateFields: Record<string, any> = {};
		if (firstName !== undefined) updateFields.firstName = firstName;
		if (middleName !== undefined) updateFields.middleName = middleName;
		if (lastName !== undefined) updateFields.lastName = lastName;
		if (nickName !== undefined) updateFields.nickName = nickName;
		if (phone !== undefined) updateFields.phone = phone;
		if (email !== undefined) updateFields.email = email;
		if (address !== undefined) updateFields.address = address;
		if (bio !== undefined) updateFields.bio = bio;
		if (avatar !== undefined) updateFields.avatar = avatar;
		if (gender !== undefined) updateFields.gender = gender;
		if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;

		if (firstName || lastName) {
			const fName = firstName || currentUser.firstName;
			const lName = lastName || currentUser.lastName;
			updateFields.fullName = middleName ? `${fName} ${middleName} ${lName}` : `${fName} ${lName}`;
		}

		const updatedUser = await SuperAdmin.findByIdAndUpdate(
			currentUser.id,
			{ $set: updateFields },
			{ new: true, runValidators: true },
		).lean();

		if (!updatedUser) {
			return NextResponse.json(
				{ message: 'User not found' },
				{ status: 404 },
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
			message: 'Profile updated successfully',
			user: userResponse,
		});
	} catch (error: any) {
		if (error?.code === 11000) {
			const keyPattern = error.keyPattern || {};
			if (keyPattern.phone) {
				return NextResponse.json(
					{ message: 'Phone number is already in use' },
					{ status: 409 },
				);
			}
			if (keyPattern.email) {
				return NextResponse.json(
					{ message: 'Email is already in use' },
					{ status: 409 },
				);
			}
			return NextResponse.json(
				{ message: 'Duplicate field value' },
				{ status: 409 },
			);
		}
		console.error('Profile update error:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 },
		);
	}
}