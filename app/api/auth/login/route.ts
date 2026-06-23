import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { serialize } from 'cookie';
import { getUserModel } from '@/models';
import { createSession, destroySession } from '@/utils/session';
import { verifyOTP, sendOTP } from '@/utils/otp';
import { getSchoolProfile } from '@/lib/mongoose';
import { UserRole } from '@/types';
import {
	buildBootstrapPayload,
	getDomainVersionsFromBootstrapPayload,
} from '@/app/api/auth/bootstrap';
import { checkRateLimit, getRequestIp } from '@/utils/rateLimit';
import { resolveAcademicYearAccessContext } from '@/utils/academicYearAccess';
import { normalizeHost } from '@/utils/host';

const toHash = (value: unknown) => {
	try {
		const raw = JSON.stringify(value) || '';
		let hash = 0;
		for (let i = 0; i < raw.length; i += 1) {
			hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
		}
		return String(hash);
	} catch {
		return '0';
	}
};

const toSchoolVersion = (schoolProfile: any) => {
	if (!schoolProfile) return '0';
	const updatedAt = schoolProfile?.updatedAt
		? new Date(schoolProfile.updatedAt).getTime()
		: 0;
	const id = schoolProfile?._id?.toString?.() || '';
	if (updatedAt || id) return `${updatedAt}:${id}`;
	return toHash(schoolProfile);
};

const normalizeSchoolProfile = (schoolProfileRaw: any) =>
	typeof schoolProfileRaw === 'string'
		? JSON.parse(schoolProfileRaw)
		: schoolProfileRaw;

const buildLoginBootstrapPayload = async (
	currentUser: any,
	schoolProfileInput?: any,
) => {
	const schoolProfileRaw = schoolProfileInput ?? (await getSchoolProfile());
	const schoolProfile = normalizeSchoolProfile(schoolProfileRaw);
	const payload = await buildBootstrapPayload(currentUser, {
		include: {
			school: true,
			users: true,
			calendar: true,
			schedules: true,
			grades: true,
			gradeRequests: true,
		},
		schoolProfile,
	});
	const domainVersions = getDomainVersionsFromBootstrapPayload({
		users: payload?.users,
		usersVersion: payload?.usersVersion,
		calendarEvents: payload?.calendarEvents,
		schedules: payload?.schedules,
		grades: payload?.grades,
		gradeRequests: payload?.gradeRequests,
	});

	return {
		...(payload || {}),
		versions: {
			user: toHash(currentUser),
			school: toSchoolVersion(schoolProfile),
			...domainVersions,
		},
	};
};

export async function POST(request: NextRequest) {
	const host = normalizeHost(request.headers.get('host'));
	if (!host) {
		return NextResponse.json(
			{ message: 'Host header is required' },
			{ status: 400 },
		);
	}

	const body = await request.json();
	let { action, username, password, role, otp, sessionId, id, userId } = body;
	const resolvedUserId = id || userId;
	const ip = getRequestIp(request.headers);

	if (['student', 'teacher'].includes(role)) {
		username = username.toUpperCase();
	}

	const User = await getUserModel(host);
	let user: any = await (resolvedUserId
		? User.findById(resolvedUserId)
		: User.findOne({ username, role }));

	try {
		switch (action) {
			case 'login':
				{
					const loginIdentifier = String(username || '')
						.trim()
						.toLowerCase();
					const limiter = await checkRateLimit(
						`rl:login:${host}:${ip}:${loginIdentifier}`,
						10,
						60,
					);
					if (!limiter.allowed) {
						return NextResponse.json(
							{
								message: 'Too many login attempts. Please try again shortly.',
								retryAfter: limiter.retryAfter,
							},
							{ status: 429 },
						);
					}
				}
				return await handleLogin(user, password, host);
			case 'verify_otp':
				{
					const otpLimiter = await checkRateLimit(
						`rl:otp_verify:${host}:${ip}:${String(resolvedUserId || '')}`,
						8,
						300,
					);
					if (!otpLimiter.allowed) {
						return NextResponse.json(
							{
								success: false,
								message: 'Too many OTP verification attempts. Try again later.',
								retryAfter: otpLimiter.retryAfter,
							},
							{ status: 429 },
						);
					}
				}
				const verificationResult = await verifyOTP(
					sessionId,
					otp,
					host,
					resolvedUserId,
				);

				const verifiedUser = verificationResult.success
					? buildUserResponse(user)
					: null;
				let bootstrapPayload: any = null;
				if (verificationResult.success && verifiedUser) {
					try {
						bootstrapPayload = await buildLoginBootstrapPayload(verifiedUser);
					} catch (error) {
						console.warn('Failed to build bootstrap payload:', error);
						try {
							const schoolProfileRaw = await getSchoolProfile();
							const schoolProfile = normalizeSchoolProfile(schoolProfileRaw);
							const yearAccess = resolveAcademicYearAccessContext({
								user: verifiedUser,
								schoolProfile,
							});
							bootstrapPayload = {
								academicYear: yearAccess.academicYear,
								defaultAcademicYear: yearAccess.defaultAcademicYear,
								allowedAcademicYears: yearAccess.allowedAcademicYears,
								school: schoolProfile,
								versions: {
									user: toHash(verifiedUser),
									school: toSchoolVersion(schoolProfile),
								},
							};
						} catch (fallbackError) {
							console.warn(
								'Failed to build fallback login payload:',
								fallbackError,
							);
						}
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
				{
					const resendLimiter = await checkRateLimit(
						`rl:otp_resend:${host}:${ip}:${String(resolvedUserId || '')}`,
						5,
						300,
					);
					if (!resendLimiter.allowed) {
						return NextResponse.json(
							{
								success: false,
								message: 'Too many OTP resend requests. Try again later.',
								retryAfter: resendLimiter.retryAfter,
							},
							{ status: 429 },
						);
					}
				}
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
			{ message: 'Incorrect username or password' },
			{ status: 401 },
		);
	}

	let schoolProfile: any = null;
	try {
		schoolProfile = normalizeSchoolProfile(await getSchoolProfile());
	} catch (e) {
		console.error('Failed to fetch school profile:', e);
	}

	let loginAllowed = true;
	if (schoolProfile?.isActive === false) {
		return NextResponse.json(
			{ message: 'School access is currently disabled' },
			{ status: 403 },
		);
	}

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
		...userData,
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
			bootstrapPayload = await buildLoginBootstrapPayload(
				userData,
				schoolProfile,
			);
		} catch (error) {
			console.warn('Failed to build login bootstrap payload:', error);
			const yearAccess = resolveAcademicYearAccessContext({
				user: userData,
				schoolProfile,
			});
			bootstrapPayload = {
				academicYear: yearAccess.academicYear,
				defaultAcademicYear: yearAccess.defaultAcademicYear,
				allowedAcademicYears: yearAccess.allowedAcademicYears,
				school: schoolProfile,
				versions: {
					user: toHash(userData),
					school: toSchoolVersion(schoolProfile),
				},
			};
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

	if (user.username == 'UCA2026504') {
		console.log('User data for debugging:', {
			id: user._id.toString(),
			username: user.username,
			role: user.role,
			firstName: user.firstName,
			middleName: user.middleName,
			lastName: user.lastName,
			fullName: user.fullName,
			isLateRegistration: user.isLateRegistration,
		});
	}
		const baseUser = {
			id: user._id.toString(),
			username: user.username,
			role: user.role as UserRole,
			firstName: user.firstName,
			middleName: user.middleName,
			lastName: user.lastName,
			fullName: user.fullName,
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
			chatSessions: user.chatSessions || [],
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
				isLateRegistration: user.isLateRegistration ?? false,
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
