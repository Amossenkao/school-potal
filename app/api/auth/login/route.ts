import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { serialize } from 'cookie';
import { getUserModel } from '@/models';
import { createSession, destroySession } from '@/utils/session';
import { verifyOTP, sendOTP } from '@/utils/otp';

export async function POST(request: NextRequest) {
	const host = request.headers.get('host');
	if (!host) {
		return NextResponse.json(
			{ message: 'Host header is required' },
			{ status: 400 }
		);
	}

	const body = await request.json();
	const { action, username, password, role, otp, sessionId, userId } = body;

	const User = await getUserModel(host);
	let user: any = await (userId
		? User.findById(userId)
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
					userId
				);

				const response = NextResponse.json(
					{
						success: verificationResult.success,
						message: verificationResult.message,
						...(verificationResult.success && {
							user: buildUserResponse(user),
						}),
						requiresOTP: !verificationResult.success,
					},
					{ status: verificationResult.status }
				);

				if (verificationResult.success) {
					const loginSessoinId = await createSession({
						tennentId: host,
						purpose: 'login',
						...buildUserResponse(user),
					});

					setSessionCookie(response, loginSessoinId);
				}
				return response;

			case 'resend_otp':
				const sendResult = await sendOTP(user._id.toString(), role);
				return NextResponse.json(
					{
						...sendResult.data,
						otpContact: user.phone || user.email,
					},
					{ status: sendResult.status }
				);
			default:
				return NextResponse.json(
					{ message: 'Invalid action' },
					{ status: 400 }
				);
		}
	} catch (error) {
		console.error('Authentication error:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

async function handleLogin(user: any, password: string, host: string) {
	if (!user || !password) {
		return NextResponse.json(
			{ message: 'Incorrect username or password' },
			{ status: 401 }
		);
	}

	if (!user.isActive) {
		return NextResponse.json(
			{ message: 'Account is deactivated. Please contact administrator.' },
			{ status: 403 }
		);
	}

	if (user.lockedUntil && user.lockedUntil > new Date()) {
		return NextResponse.json(
			{ message: 'Account is temporarily locked. Please try again later.' },
			{ status: 423 }
		);
	}

	const isPasswordValid = await bcrypt.compare(password, user.password);
	if (!isPasswordValid) {
		return NextResponse.json(
			{ message: 'Incorrect username or password' },
			{ status: 401 }
		);
	}

	// Generate session and store session data using createSession
	const userData = buildUserResponse(user);
	const sessionData = {
		tenantId: host,
		purpose: 'login',
		...userData,
	};
	let response: NextResponse;
	let sessionId;

	// If the user is a system admin, they have to verify OTP
	if (user.role === 'system_admins') {
		const sendResult = await sendOTP(user._id.toString(), host);
		response = NextResponse.json(
			{
				...sendResult.data,
				message: 'OTP verification is required for admin login',
				otpContact: user.phone || user.email,
			},
			{ status: sendResult.status }
		);
	} else {
		sessionId = await createSession(sessionData);
		response = NextResponse.json(
			{
				message: 'Login successful',
				requiresOTP: false,
				user: userData,
			},
			{ status: 200 }
		);
		// Set session cookie
		setSessionCookie(response, sessionId);
	}
	return response;
}

function setSessionCookie(response: NextResponse, sessionId: string) {
	response.cookies.set('sessionId', sessionId, {
		httpOnly: true,
		path: '/',
		maxAge: 60 * 60 * 24, // 1 day
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
	});
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
		avatar: user.avatar,
		isActive: user.isActive,
		notifications: user.notifications,
		mustChangePassword: user.mustChangePassword,
		defaultPassword: user.defaultPassword,
		passwordChangedAt: user.passwordChangedAt,
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

export async function DELETE(request: NextRequest) {
	const sessionId = request.cookies.get('sessionId')?.value;

	if (sessionId) {
		try {
			await destroySession(sessionId);
		} catch (error) {
			console.error('Error deleting session:', error);
		}
	}

	const response = NextResponse.json({ message: 'Logged out successfully' });

	// Clear session cookie
	response.headers.set(
		'Set-Cookie',
		serialize('sessionId', '', {
			httpOnly: true,
			path: '/',
			maxAge: 0,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
		})
	);

	return response;
}
