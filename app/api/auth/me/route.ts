import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/session';
import { getSchoolProfile } from '@/lib/mongoose';
import { getTenantModels } from '@/models';
import {
	buildBootstrapPayload,
	getDomainVersions,
} from '@/app/api/auth/bootstrap';
import { resolveAcademicYearAccessContext } from '@/utils/academicYearAccess';
import { syncDebugError, syncDebugLog, syncDebugWarn } from '@/lib/syncDebug';

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

export async function GET(request: NextRequest) {
	const requestId = crypto.randomUUID();
	const startedAt = Date.now();
	const { searchParams } = new URL(request.url);
	const syncTrigger = String(searchParams.get('sync_trigger') || '').trim() || 'none';

	const logResponse = (
		stage: string,
		status: number,
		data?: Record<string, unknown>,
	) => {
		syncDebugLog('auth-me', stage, {
			requestId,
			status,
			syncTrigger,
			durationMs: Date.now() - startedAt,
			...data,
		});
	};

	try {
		syncDebugLog('auth-me', 'Incoming auth sync request.', {
			requestId,
			syncTrigger,
			host: request.headers.get('host') || null,
			hasSessionCookie: Boolean(request.cookies.get('sessionId')?.value),
			query: {
				v_users: searchParams.get('v_users') || searchParams.get('usersVersion'),
				v_grades: searchParams.get('v_grades'),
				v_calendar: searchParams.get('v_calendar'),
				v_schedules: searchParams.get('v_schedules'),
				v_grade_requests: searchParams.get('v_grade_requests'),
				v_school: searchParams.get('v_school'),
				v_user: searchParams.get('v_user'),
				academicYear: searchParams.get('academicYear'),
			},
		});

		const sessionCookie = request.cookies.get('sessionId');
		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const schoolVersion = toSchoolVersion(schoolProfile);

		if (!sessionCookie) {
			logResponse('No active session cookie.', 401);
			return NextResponse.json(
				{
					user: null,
					school: schoolProfile || null,
					message: 'No active session',
				},
				{ status: 401 },
			);
		}

		const sessionId = sessionCookie.value;
		if (!sessionId || sessionId.length < 10) {
			logResponse('Invalid session id format.', 401);
			return NextResponse.json(
				{
					user: null,
					school: schoolProfile || null,
					message: 'Invalid session format',
				},
				{ status: 401 },
			);
		}

		const session = await getSession(sessionId);
		if (!session || !session.id) {
			logResponse('Session missing in cache.', 401);
			const response = NextResponse.json(
				{
					user: null,
					school: schoolProfile || null,
					message: 'Session expired or invalid',
				},
				{ status: 401 },
			);

			response.cookies.set('sessionId', '', {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				expires: new Date(0),
				path: '/',
			});

			return response;
		}

		if (schoolProfile?.isActive === false) {
			logResponse('School inactive.', 403);
			return NextResponse.json(
				{
					user: null,
					school: schoolProfile || null,
					message: 'School is inactive',
				},
				{ status: 403 },
			);
		}

		const models = await getTenantModels();
		const freshUser = await models.User.findById(session.id).lean();
		if (!freshUser || freshUser.isActive === false) {
			logResponse('User inactive or missing.', 403, {
				sessionUserId: String(session.id || ''),
			});
			const response = NextResponse.json(
				{
					user: null,
					school: schoolProfile || null,
					message: 'Account is deactivated',
				},
				{ status: 403 },
			);
			response.cookies.set('sessionId', '', {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				expires: new Date(0),
				path: '/',
			});
			return response;
		}
		const resolvedUserId = freshUser?._id?.toString?.() || session.id;
		const userPayload = {
			...freshUser,
			id: resolvedUserId,
			_id: resolvedUserId,
		};

		const clientUsersVersion =
			searchParams.get('v_users') || searchParams.get('usersVersion');
		const clientGradesVersion = searchParams.get('v_grades');
		const clientCalendarVersion = searchParams.get('v_calendar');
		const clientSchedulesVersion = searchParams.get('v_schedules');
		const clientGradeRequestsVersion = searchParams.get('v_grade_requests');
		const clientSchoolVersion = searchParams.get('v_school');
		const clientUserVersion = searchParams.get('v_user');
		const requestedAcademicYear = searchParams.get('academicYear');

		const resolvedSessionUser = {
			...session,
			...userPayload,
			id: resolvedUserId,
		};
		const yearAccess = resolveAcademicYearAccessContext({
			user: resolvedSessionUser,
			schoolProfile,
			requestedAcademicYear,
		});
		if (yearAccess.requestedAcademicYear && !yearAccess.hasAccess) {
			logResponse('Requested academic year denied.', 403, {
				userId: resolvedUserId,
				requestedAcademicYear: yearAccess.requestedAcademicYear,
			});
			return NextResponse.json(
				{
					message: 'You do not have access to this academic year.',
					defaultAcademicYear: yearAccess.defaultAcademicYear,
					allowedAcademicYears: yearAccess.allowedAcademicYears,
				},
				{ status: 403 },
			);
		}

		const academicYear = yearAccess.academicYear;
		const versions = await getDomainVersions(resolvedSessionUser, academicYear);
		const userVersion = toHash(userPayload);

		const include = {
			school: clientSchoolVersion !== schoolVersion,
			users:
				typeof clientUsersVersion === 'string'
					? clientUsersVersion !== versions.users
					: true,
			calendar: clientCalendarVersion !== versions.calendar,
			schedules: clientSchedulesVersion !== versions.schedules,
			grades: clientGradesVersion !== versions.grades,
			gradeRequests: clientGradeRequestsVersion !== versions.gradeRequests,
		};
		const includeUser = clientUserVersion !== userVersion;
		syncDebugLog('auth-me', 'Computed include flags.', {
			requestId,
			syncTrigger,
			userId: resolvedUserId,
			academicYear,
			include,
			includeUser,
			clientVersions: {
				school: clientSchoolVersion,
				users: clientUsersVersion,
				calendar: clientCalendarVersion,
				schedules: clientSchedulesVersion,
				grades: clientGradesVersion,
				gradeRequests: clientGradeRequestsVersion,
				user: clientUserVersion,
			},
			serverVersions: {
				school: schoolVersion,
				users: versions.users,
				calendar: versions.calendar,
				schedules: versions.schedules,
				grades: versions.grades,
				gradeRequests: versions.gradeRequests,
				user: userVersion,
			},
		});

		let bootstrapPayload: any = null;
		try {
			bootstrapPayload = await buildBootstrapPayload(resolvedSessionUser, {
				include,
				academicYear,
				usersVersion: versions.users,
				schoolProfile,
			});
		} catch (error) {
			console.warn('Failed to build bootstrap payload:', error);
			syncDebugWarn('auth-me', 'Bootstrap payload build failed; returning minimal payload.', {
				requestId,
				error: error instanceof Error ? error.message : String(error),
				userId: resolvedUserId,
				academicYear,
			});
		}
		logResponse('Auth sync success.', 200, {
			userId: resolvedUserId,
			academicYear,
			include,
			includeUser,
			hasBootstrapPayload: Boolean(bootstrapPayload),
		});

		return NextResponse.json({
			message: 'Session valid',
			...(includeUser ? { user: userPayload } : {}),
			...(bootstrapPayload || {}),
			...(!bootstrapPayload
				? {
						academicYear,
						defaultAcademicYear: yearAccess.defaultAcademicYear,
						allowedAcademicYears: yearAccess.allowedAcademicYears,
					}
				: {}),
			versions: {
				user: userVersion,
				school: schoolVersion,
				users: versions.users,
				calendar: versions.calendar,
				schedules: versions.schedules,
				grades: versions.grades,
				gradeRequests: versions.gradeRequests,
			},
		});
	} catch (error) {
		console.error('Session validation error:', error);
		syncDebugError('auth-me', 'Unhandled auth sync error.', {
			requestId,
			syncTrigger,
			error: error instanceof Error ? error.message : String(error),
			durationMs: Date.now() - startedAt,
		});
		return NextResponse.json(
			{
				message: 'Internal server error',
			},
			{ status: 500 },
		);
	}
}

export async function POST() {
	return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
	return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
	return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
}
