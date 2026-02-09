import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { serialize } from 'cookie';
import { getUserModel } from '@/models';
import { createSession, destroySession } from '@/utils/session';
import { verifyOTP, sendOTP } from '@/utils/otp';
import { getSchoolProfile } from '@/lib/mongoose';
import { UserRole } from '@/types';
import { buildBootstrapPayload } from '@/app/api/auth/bootstrap';

export async function POST(request: NextRequest) {
	const host = request.headers.get('host');
	if (!host) {
		return NextResponse.json(
			{ message: 'Host header is required' },
			{ status: 400 },
		);
	}

	const body = await request.json();
	const { action, username, password, role, otp, sessionId, id } = body; // Changed userId to id

	const User = await getUserModel(host);
	let user: any = await (id
		? User.findById(id)
		: User.findOne({ username, role }));

	try {
		switch (action) {
			case 'login':
				return await handleLogin(user, password, host);
			case 'verify_otp':
				const verificationResult = await verifyOTP(
					sessionId,
					otp,
					host,
					id, // Changed userId to id
				);

				const verifiedUser = verificationResult.success
					? buildUserResponse(user)
					: null;
				let bootstrapPayload: any = null;
				if (verificationResult.success && verifiedUser) {
					try {
						bootstrapPayload = await buildBootstrapPayload(verifiedUser);
					} catch (error) {
						console.warn('Failed to build bootstrap payload:', error);
					}
				}

				const response = NextResponse.json(
					{
						success: verificationResult.success,
						message: verificationResult.message,
						...(verificationResult.success && {
							user: verifiedUser,
							...bootstrapPayload,
						}),
						requiresOTP: !verificationResult.success,
					},
					{ status: verificationResult.status },
				);

				if (verificationResult.success) {
					const loginSessionId = await createSession({
						tenantId: host,
						purpose: 'login',
						...buildUserResponse(user),
					});

					setSessionCookie(response, loginSessionId);
				}
				return response;

			case 'resend_otp':
				const sendResult = await sendOTP(user._id.toString(), host);
				return NextResponse.json(
					{
						...sendResult.data,
						otpContact: user.phone || user.email,
					},
					{ status: sendResult.status },
				);
			default:
				return NextResponse.json(
					{ message: 'Invalid action' },
					{ status: 400 },
				);
		}
	} catch (error) {
		console.error('Authentication error:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 },
		);
	}
}

async function handleLogin(user: any, password: string, host: string) {
	if (!user || !password) {
		return NextResponse.json(
			{ message: 'Incorrect credentials' },
			{ status: 401 },
		);
	}

	let schoolProfile: any = null;
	try {
		schoolProfile = await getSchoolProfile();
	} catch (e) {
		console.error('Failed to fetch school profile:', e);
	}

	let loginAllowed = true;
	if (schoolProfile?.settings) {
		const role = user.role as UserRole;
		switch (role) {
			case 'student':
				loginAllowed =
					schoolProfile.settings.studentSettings?.loginAccess !== false;
				break;
			case 'teacher':
				loginAllowed =
					schoolProfile.settings.teacherSettings?.loginAccess !== false;
				break;
			case 'administrator':
				loginAllowed =
					schoolProfile.settings.administratorSettings?.loginAccess !== false;
				break;
			case 'system_admin':
				loginAllowed =
					schoolProfile.settings.systemAdminSettings?.loginAccess !== false;
				break;
		}
	}

	if (!loginAllowed) {
		return NextResponse.json(
			{ message: `Login disabled for ${user.role}s` },
			{ status: 403 },
		);
	}

	if (!user.isActive) {
		return NextResponse.json(
			{ message: 'Account is deactivated' },
			{ status: 403 },
		);
	}

	const isPasswordValid = await bcrypt.compare(password, user.password);
	if (!isPasswordValid) {
		return NextResponse.json(
			{ message: 'Incorrect credentials' },
			{ status: 401 },
		);
	}

	const userData = buildUserResponse(user);
	const sessionData = {
		tenantId: host,
		purpose: 'login',
		...userData, // buildUserResponse now provides 'id'
	};

	if (user.role === 'system_admins') {
		const sendResult = await sendOTP(user._id.toString(), host);
		return NextResponse.json(
			{
				...sendResult.data,
				message: 'OTP verification required',
				otpContact: user.phone || user.email,
			},
			{ status: sendResult.status },
		);
	} else {
		const sessionId = await createSession(sessionData);
		let bootstrapPayload: any = null;
		try {
			bootstrapPayload = await buildBootstrapPayload(userData);
		} catch (error) {
			console.warn('Failed to build bootstrap payload:', error);
		}
		const response = NextResponse.json(
			{ message: 'Login successful', user: userData, ...bootstrapPayload },
			{ status: 200 },
		);
		setSessionCookie(response, sessionId);
		return response;
	}
}

function setSessionCookie(response: NextResponse, sessionId: string) {
	response.cookies.set('sessionId', sessionId, {
		httpOnly: true,
		path: '/',
		maxAge: 60 * 60 * 24,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
	});
}

function buildUserResponse(user: any) {
	const baseUser = {
		id: user._id.toString(), // Ensuring 'id' is used
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
		defaultPassword: user.defaultPassword,
		notifications: user.notifications || [],
		chats: user.chats || [],
	};

	switch (user.role as UserRole) {
		case 'student':
			return {
				...baseUser,
				studentId: user.username,
				enrollmentYear: user.enrollmentYear,
				enrollmentSemester: user.enrollmentSemester,
				enrollmentStatus: user.enrollmentStatus,
				classId: user.classId,
				className: user.className,
				shareContactWithClassmates: user.shareContactWithClassmates ?? false,
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
}

export async function DELETE(request: NextRequest) {
	const sessionId = request.cookies.get('sessionId')?.value;
	if (sessionId) await destroySession(sessionId);
	const response = NextResponse.json({ message: 'Logged out successfully' });
	response.headers.set(
		'Set-Cookie',
		serialize('sessionId', '', { httpOnly: true, path: '/', maxAge: 0 }),
	);
	return response;
}
