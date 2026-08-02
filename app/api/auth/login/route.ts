import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserModel } from '@/models';
import { getSchoolMeshModels } from '@/models/schoolmesh';
import { createSession, destroySession } from '@/utils/session';
import { getSchoolProfile } from '@/lib/mongoose';
import { UserRole } from '@/types';
import {
	buildBootstrapPayload,
	buildSuperAdminBootstrapPayload,
	getDomainVersionsFromBootstrapPayload,
} from '@/lib/bootstrap';
import { checkRateLimit, getRequestIp } from '@/utils/rateLimit';
import { resolveAcademicYearAccessContext } from '@/utils/academicYearAccess';
import { normalizeHost } from '@/utils/host';
import { buildParentChildrenList } from '@/lib/parentAccess';
import { toHash, toSchoolVersion } from '@/utils/syncVersion';
import { getSyncCursorsForYear } from '@/lib/syncEngine';
import { isSyncEngineEnabled } from '@/lib/syncFeatureFlag';

const CLIENT_SESSION_PRESENT_COOKIE = 'session-present';

const normalizeSchoolProfile = (schoolProfileRaw: any) =>
	typeof schoolProfileRaw === 'string'
		? JSON.parse(schoolProfileRaw)
		: schoolProfileRaw;

const buildLoginBootstrapPayload = async (
	currentUser: any,
	schoolProfileInput?: any,
	academicYear?: string,
) => {
	const schoolProfileRaw = schoolProfileInput ?? (await getSchoolProfile());

	console.log(`RAW School Profile: ${schoolProfileRaw}`)
	const schoolProfile = normalizeSchoolProfile(schoolProfileRaw);
	const payload = await buildBootstrapPayload(currentUser, {
		include: {
			school: true,
			users: true,
			calendar: true,
			schedules: true,
			grades: true,
			gradeRequests: true,
			attendance: true,
			payments: true,
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
		attendance: payload?.attendance,
		payments: payload?.payments,
	});

	// Next-gen sync: report current ChangeLog seq per domain so the client can
	// seed its cursors without an extra /api/auth/me round trip.
	const syncCursors =
		isSyncEngineEnabled() && academicYear
			? await getSyncCursorsForYear(academicYear)
			: undefined;

	return {
		...(payload || {}),
		...(syncCursors ? { syncCursors } : {}),
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
	let { action, username, password, role, id, userId, position } = body;
	const resolvedUserId = id || userId;
	const ip = getRequestIp(request.headers);

	if (['student', 'teacher'].includes(role)) {
		username = username.toUpperCase();
	}

	// Look up superadmin from schoolmesh database
	let user: any = null;
	if (role === 'superadmin') {
		const { SuperAdmin } = await getSchoolMeshModels();
		user = resolvedUserId
			? await SuperAdmin.findById(resolvedUserId)
			: await SuperAdmin.findOne({ username, role: 'superadmin' });
	} else {
		const User = await getUserModel(host);
		const loginIdentifier = String(username || '').trim().toLowerCase();
		if (role === 'parent') {
			// Parents log in strictly by phone number
			user = resolvedUserId
				? await User.findById(resolvedUserId)
				: await User.findOne({
						role: 'parent',
						phone: loginIdentifier,
					});
		} else {
			user = resolvedUserId
				? await User.findById(resolvedUserId)
				: await User.findOne({ username, role });
		}
	}

	if (
		role === 'administrator' &&
		position &&
		user &&
		user.role === 'administrator' &&
		user.position &&
		user.position !== position
	) {
		return NextResponse.json(
			{
				message: 'Incorrect username or password',
			},
			{ status: 401 },
		);
	}

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

	// Handle superadmin login (schoolmesh database)
	if (user.role === 'superadmin') {
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

		const userData = buildSuperAdminUserResponse(user);
		const sessionData = {
			tenantId: 'schoolmesh',
			purpose: 'login',
			...userData,
		};

		const sessionId = await createSession(sessionData);
		let bootstrapPayload: any = null;
		try {
			bootstrapPayload = await buildSuperAdminBootstrapPayload(userData);
		} catch (error) {
			console.warn('Failed to build superadmin bootstrap payload:', error);
			bootstrapPayload = {
				versions: {
					user: toHash(userData),
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

	// Handle school user login (tenant database)
	let schoolProfile: any = null;
	try {
		schoolProfile = normalizeSchoolProfile(await getSchoolProfile());
	} catch (e) {
		console.error('Failed to fetch school profile:', e);
	}

	let loginAllowed = true;
	if (schoolProfile?.system?.isActive === false) {
		return NextResponse.json(
			{ message: 'School access is currently disabled' },
			{ status: 403 },
		);
	}

	if (schoolProfile?.userConfig) {
		const role = user.role as UserRole;
		switch (role) {
			case 'student':
				loginAllowed =
					schoolProfile.userConfig.studentSettings?.loginAccess !== false;
				break;
			case 'teacher':
				loginAllowed =
					schoolProfile.userConfig.teacherSettings?.loginAccess !== false;
				break;
			case 'administrator':
				loginAllowed =
					schoolProfile.userConfig.administratorSettings?.loginAccess !== false;
				break;
			case 'system_admin':
				loginAllowed =
					schoolProfile.userConfig.sysAdmin !== undefined;
				break;
			case 'parent':
				loginAllowed =
					schoolProfile.userConfig.parentSettings?.loginAccess !== false;
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

	if (user.role === 'parent') {
		const parentChildren = await buildParentChildrenList(
			{ User: await getUserModel(host) },
			user,
		);
		user.__parentChildren = parentChildren;
		const selectedChild = parentChildren[0] || null;
		user.__selectedChild = selectedChild;
	}

	const userData = await buildUserResponse(user, host);
	const sessionData = {
		tenantId: host,
		purpose: 'login',
		...userData,
	};

	const sessionId = await createSession(sessionData);
	let bootstrapPayload: any = null;
	try {
		const yearAccess = resolveAcademicYearAccessContext({
			user: userData,
			schoolProfile,
		});
		bootstrapPayload = await buildLoginBootstrapPayload(
			userData,
			schoolProfile,
			yearAccess.academicYear,
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

function setSessionCookie(response: NextResponse, sessionId: string) {
	response.cookies.set('sessionId', sessionId, {
		httpOnly: true,
		path: '/',
		maxAge: 60 * 60 * 24,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
	});
	response.cookies.set(CLIENT_SESSION_PRESENT_COOKIE, '1', {
		httpOnly: false,
		path: '/',
		maxAge: 60 * 60 * 24,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
	});
}

function buildUserResponse(user: any, host?: string) {

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
				studentType: user.studentType ?? 'old',
				enrollmentYear: user.enrollmentYear,
				enrollmentSemester: user.enrollmentSemester,
				enrollmentStatus: user.enrollmentStatus,
				classId: user.classId,
				className: user.className,
				shareContactWithClassmates: user.shareContactWithClassmates ?? false,
				isLateRegistration: user.isLateRegistration ?? false,
				academicYears: user.academicYears || [],
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
				permissions: user.permissions || [],
				canRecordStudentAttendance: user.canRecordStudentAttendance ?? false,
				canRecordTeacherAttendance: user.canRecordTeacherAttendance ?? false,
				isTeacher: user.isTeacher ?? false,
				classes: user.classes || [],
				academicYears: user.academicYears || [],
			};
		case 'system_admin':
			return { ...baseUser, username: user.username };
		case 'parent': {
				const selectedChild =
					user.__selectedChild || user.__parentChildren?.[0] || null;
				return {
					...baseUser,
					studentIds: user.studentIds || [],
					parentChildren: user.__parentChildren || [],
					studentId: selectedChild?.studentId || null,
					classId: selectedChild?.classId || null,
					className: selectedChild?.className || null,
					classLevel: selectedChild?.classLevel || null,
					academicYears: selectedChild?.academicYears || [],
					studentType: selectedChild?.studentType || 'old',
				};
			}
		default:
			return baseUser;
	}
}

function buildSuperAdminUserResponse(user: any) {
	return {
		id: user._id.toString(),
		username: user.username,
		role: 'superadmin' as UserRole,
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
		notifications: user.notifications || [],
		chats: user.chats || [],
		chatSessions: user.chatSessions || [],
	};
}

export async function DELETE(request: NextRequest) {
	const sessionId = request.cookies.get('sessionId')?.value;
	if (sessionId) await destroySession(sessionId);
	const response = NextResponse.json({ message: 'Logged out successfully' });
	response.cookies.set('sessionId', '', {
		httpOnly: true,
		path: '/',
		maxAge: 0,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
	});
	response.cookies.set(CLIENT_SESSION_PRESENT_COOKIE, '', {
		httpOnly: false,
		path: '/',
		maxAge: 0,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
	});
	return response;
}
