import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/session';
import { getSchoolProfile } from '@/lib/mongoose';
import { getTenantModels } from '@/models';
import { buildBootstrapPayload, getDomainVersions } from '@/lib/bootstrap';
import { resolveAcademicYearAccessContext } from '@/utils/academicYearAccess';
import { syncDebugError, syncDebugLog, syncDebugWarn } from '@/lib/syncDebug';

// ─── Helpers ────────────────────────────────────────────────────────────────

const CLIENT_SESSION_PRESENT_COOKIE = 'session-present';

const clearSessionCookies = (response: NextResponse) => {
	response.cookies.set('sessionId', '', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		expires: new Date(0),
		path: '/',
	});
	response.cookies.set(CLIENT_SESSION_PRESENT_COOKIE, '', {
		httpOnly: false,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		expires: new Date(0),
		path: '/',
	});
};

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

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
	const requestId = crypto.randomUUID();
	const startedAt = Date.now();
	const { searchParams } = new URL(request.url);
	const syncTrigger =
		String(searchParams.get('sync_trigger') || '').trim() || 'none';

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
		// ── Extract all client-side version tokens ──────────────────────────
		const clientUsersVersion =
			searchParams.get('v_users') || searchParams.get('usersVersion');
		const clientGradesVersion = searchParams.get('v_grades');
		const clientCalendarVersion = searchParams.get('v_calendar');
		const clientSchedulesVersion = searchParams.get('v_schedules');
		const clientGradeRequestsVersion = searchParams.get('v_grade_requests');
		const clientAttendanceVersion = searchParams.get('v_attendance');
		const clientSchoolVersion = searchParams.get('v_school');
		const clientUserVersion = searchParams.get('v_user');
		const requestedAcademicYear = searchParams.get('academicYear');

		syncDebugLog('auth-me', 'Incoming auth sync request.', {
			requestId,
			syncTrigger,
			host: request.headers.get('host') || null,
			hasSessionCookie: Boolean(request.cookies.get('sessionId')?.value),
			query: {
				v_users: clientUsersVersion,
				v_grades: clientGradesVersion,
				v_calendar: clientCalendarVersion,
				v_schedules: clientSchedulesVersion,
				v_grade_requests: clientGradeRequestsVersion,
				v_attendance: clientAttendanceVersion,
				v_school: clientSchoolVersion,
				v_user: clientUserVersion,
				academicYear: requestedAcademicYear,
			},
		});

		// ── School profile (needed even for unauthenticated responses) ───────
		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const schoolVersion = toSchoolVersion(schoolProfile);

		// ── Session validation ───────────────────────────────────────────────
		const sessionCookie = request.cookies.get('sessionId');
		if (!sessionCookie) {
			logResponse('No active session cookie.', 401);
			const response = NextResponse.json(
				{
					user: null,
					school: schoolProfile || null,
					message: 'No active session',
				},
				{ status: 401 },
			);
			clearSessionCookies(response);
			return response;
		}

		const sessionId = sessionCookie.value;
		if (!sessionId || sessionId.length < 10) {
			logResponse('Invalid session id format.', 401);
			const response = NextResponse.json(
				{
					user: null,
					school: schoolProfile || null,
					message: 'Invalid session format',
				},
				{ status: 401 },
			);
			clearSessionCookies(response);
			return response;
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
			clearSessionCookies(response);
			return response;
		}

		// ── School active check ──────────────────────────────────────────────
		if (schoolProfile?.isActive === false) {
			logResponse('School inactive.', 403);
			const response = NextResponse.json(
				{
					user: null,
					school: schoolProfile || null,
					message: 'School is inactive',
				},
				{ status: 403 },
			);
			clearSessionCookies(response);
			return response;
		}

		// ── User active check ────────────────────────────────────────────────
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
			clearSessionCookies(response);
			return response;
		}

		// ── Build resolved user identity ─────────────────────────────────────
		const resolvedUserId = freshUser?._id?.toString?.() || session.id;
		const userPayload = {
			...freshUser,
			id: resolvedUserId,
			_id: resolvedUserId,
		};
		const resolvedSessionUser = {
			...session,
			...userPayload,
			id: resolvedUserId,
		};

		// ── Academic year access ─────────────────────────────────────────────
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

		// ── Compute server-side versions for all domains ─────────────────────
		const versions = await getDomainVersions(resolvedSessionUser, academicYear);
		const userVersion = toHash(userPayload);

		// ── Diff client vs server versions to decide what to include ─────────
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
			attendance: clientAttendanceVersion !== versions.attendance,
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
				attendance: clientAttendanceVersion,
				user: clientUserVersion,
			},
			serverVersions: {
				school: schoolVersion,
				users: versions.users,
				calendar: versions.calendar,
				schedules: versions.schedules,
				grades: versions.grades,
				gradeRequests: versions.gradeRequests,
				attendance: versions.attendance,
				user: userVersion,
			},
		});

		// ── Build bootstrap payload ──────────────────────────────────────────
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
			syncDebugWarn(
				'auth-me',
				'Bootstrap payload build failed; returning minimal payload.',
				{
					requestId,
					error: error instanceof Error ? error.message : String(error),
					userId: resolvedUserId,
					academicYear,
				},
			);
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
				attendance: versions.attendance,
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
			{ message: 'Internal server error' },
			{ status: 500 },
		);
	}
}

// ─── Unsupported methods ─────────────────────────────────────────────────────

export async function POST() {
	return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
	return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
	return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
}
