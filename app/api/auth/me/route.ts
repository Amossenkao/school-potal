import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/session';
import { getSchoolProfile } from '@/lib/mongoose';
import { getTenantModels } from '@/models';
import { buildParentChildrenList } from '@/lib/parentAccess';
import { getSchoolMeshModels } from '@/models/schoolmesh';
import { buildBootstrapPayload, buildSuperAdminBootstrapPayload, getDomainVersions } from '@/lib/bootstrap';
import {
	getParentAcademicYearsEntries,
	resolveAcademicYearAccessContext,
} from '@/utils/academicYearAccess';
import { syncDebugError, syncDebugLog, syncDebugWarn } from '@/lib/syncDebug';
import { toHash, toSchoolVersion } from '@/utils/syncVersion';
import { getSyncCursorsForYear } from '@/lib/syncEngine';

// ─── Helpers ────────────────────────────────────────────────────────────────

const CLIENT_SESSION_PRESENT_COOKIE = 'session-present';

// Client-reported catch-up seq param names (next-gen sync only). Domains the
// client can recover via /api/sync/delta; users/school stay legacy-versioned.
const SYNC_DOMAIN_PARAM_KEYS: Array<[string, string]> = [
	['grades', 'since_grades'],
	['attendance', 'since_attendance'],
	['teacher_attendance', 'since_teacher_attendance'],
	['calendar', 'since_calendar'],
	['schedules', 'since_schedules'],
	['gradeRequests', 'since_grade_requests'],
];

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
		// Next-gen domains (grades, calendar, schedules, gradeRequests,
		// attendance, teacherAttendance) negotiate via since_<domain> ChangeLog
		// seqs instead of legacy version fingerprints; users, payments, school
		// and user stay legacy-versioned.
		const clientUsersVersion =
			searchParams.get('v_users') || searchParams.get('usersVersion');
		const clientPaymentsVersion = searchParams.get('v_payments');
		const clientSchoolVersion = searchParams.get('v_school');
		const clientUserVersion = searchParams.get('v_user');
		const requestedAcademicYear = searchParams.get('academicYear');

		// Next-gen sync: client-reported ChangeLog seq per domain (since_<domain>).
		const sinceSeqByDomain: Record<string, number> = {};
		SYNC_DOMAIN_PARAM_KEYS.forEach(([domain, key]) => {
			const value = searchParams.get(key);
			if (value && /^\d+$/.test(value)) {
				sinceSeqByDomain[domain] = Number(value);
			}
		});

		syncDebugLog('auth-me', 'Incoming auth sync request.', {
			requestId,
			syncTrigger,
			host: request.headers.get('host') || null,
			hasSessionCookie: Boolean(request.cookies.get('sessionId')?.value),
			query: {
				v_users: clientUsersVersion,
				v_payments: clientPaymentsVersion,
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

		// ── Superadmin session (schoolmesh DB) ──────────────────────────────
		if (session.role === 'superadmin') {
			const { SuperAdmin } = await getSchoolMeshModels();
			const freshUser = await SuperAdmin.findById(session.id).lean();
			if (!freshUser || freshUser.isActive === false) {
				logResponse('Superadmin inactive or missing.', 403, {
					sessionUserId: String(session.id || ''),
				});
				const response = NextResponse.json(
					{ user: null, message: 'Account is deactivated' },
					{ status: 403 },
				);
				clearSessionCookies(response);
				return response;
			}

			const resolvedUserId = freshUser?._id?.toString?.() || session.id;
			const userPayload = { ...freshUser, id: resolvedUserId, _id: resolvedUserId };

			const userVersion = toHash(userPayload);
			const clientUserVersion = searchParams.get('v_user');
			const includeUser = clientUserVersion !== userVersion;

			let bootstrapPayload: any = null;
			try {
				bootstrapPayload = await buildSuperAdminBootstrapPayload(userPayload);
			} catch (error) {
				console.warn('Failed to build superadmin bootstrap payload:', error);
				bootstrapPayload = {
					versions: { user: userVersion },
				};
			}

			logResponse('Auth sync success (superadmin).', 200, {
				userId: resolvedUserId,
				includeUser,
				hasBootstrapPayload: Boolean(bootstrapPayload),
			});

			return NextResponse.json({
				message: 'Session valid',
				...(includeUser ? { user: userPayload } : {}),
				...bootstrapPayload,
				versions: {
					user: userVersion,
					school: schoolVersion,
					...(bootstrapPayload?.versions || {}),
				},
			});
		}

		// ── School active check ──────────────────────────────────────────────
		if (schoolProfile?.system?.isActive === false) {
			logResponse('School inactive.', 200);
			const models = await getTenantModels();
			const freshUser = await models.User.findById(session.id).lean();
			if (!freshUser || freshUser.isActive === false) {
				const response = NextResponse.json(
					{ user: null, school: schoolProfile || null, message: 'Account is deactivated' },
					{ status: 403 },
				);
				clearSessionCookies(response);
				return response;
			}
			const resolvedUserId = freshUser?._id?.toString?.() || session.id;
			const userPayload = { ...freshUser, id: resolvedUserId, _id: resolvedUserId };
			return NextResponse.json({
				user: userPayload,
				school: schoolProfile || null,
				message: 'School is inactive',
			});
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
		const baseUserPayload = {
			...freshUser,
			id: resolvedUserId,
			_id: resolvedUserId,
		};
		// Prefer the DB-resolved child list (source of truth) so a just-assigned
		// student survives the forced /api/auth/me refresh even if the session
		// write lags or was skipped. Fall back to the session copy only if the DB
		// resolution fails.
		let resolvedParentChildren: any[] | undefined;
		if (freshUser?.role === 'parent') {
			try {
				resolvedParentChildren = await buildParentChildrenList(
					models,
					freshUser,
				);
			} catch (dbChildrenError) {
				console.warn(
					'Failed to resolve parent children from DB in /api/auth/me:',
					dbChildrenError,
				);
			}
		}
		const userPayload =
			freshUser?.role === 'parent'
				? (() => {
						// Keep a child selected at all times while the parent has
						// children: preserve the current session selection when it is
						// still valid, otherwise fall back to the first available
						// child. A session may carry studentId: null (e.g. a parent
						// who had no children at login, later assigned a student), and
						// without this the child switcher would show no selection.
						const parentChildren =
							resolvedParentChildren ??
							(Array.isArray(session.parentChildren)
								? session.parentChildren
								: []);
						const sessionSelectedId = String(
							session.studentId || '',
						).trim();
						const selectedChild =
							parentChildren.find(
								(c: any) =>
									String(c.studentId || '').trim() === sessionSelectedId ||
									String(c.username || '').trim() === sessionSelectedId,
							) ||
							parentChildren[0] ||
							null;
						return {
							...baseUserPayload,
							studentId:
								selectedChild?.studentId || selectedChild?.username || null,
							classId: selectedChild?.classId ?? null,
							className: selectedChild?.className ?? null,
							classLevel: selectedChild?.classLevel ?? null,
							academicYears: getParentAcademicYearsEntries(parentChildren),
							parentChildren,
							studentType:
								selectedChild?.studentType ||
								(freshUser as any).studentType ||
								'old',
						};
					})()
				: baseUserPayload;
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

		// ── Phase 5: seq-cursor negotiation ──────────────────────────────────
		const syncCursors = academicYear
			? await getSyncCursorsForYear(academicYear)
			: undefined;

		// ── Compute server-side versions for all domains ─────────────────────
		const versions = await getDomainVersions(
			resolvedSessionUser,
			academicYear,
			undefined,
			schoolProfile,
		);
		const userVersion = toHash(userPayload);

		// ── Diff client vs server versions to decide what to include ─────────
		// Next-gen domains are negotiated purely on ChangeLog seqs: when the
		// engine is on and the client reports it is caught up on a domain
		// (since_<domain> >= the server's current seq), skip re-sending that
		// payload. The legacy version-fingerprint diff is retired for those
		// domains because realtime bumps the client's version stamps, which
		// would otherwise force a re-download of data the client already has.
		const seqCatchUp = (syncKey: string): boolean => {
			if (!syncCursors) return true;
			const serverSeq = syncCursors[syncKey];
			const sinceSeq = sinceSeqByDomain[syncKey];
			return !(
				typeof serverSeq === 'number' &&
				typeof sinceSeq === 'number' &&
				sinceSeq >= serverSeq
			);
		};

		const include = {
			school: clientSchoolVersion !== schoolVersion,
			users:
				typeof clientUsersVersion === 'string'
					? clientUsersVersion !== versions.users
					: true,
			calendar: seqCatchUp('calendar'),
			schedules: seqCatchUp('schedules'),
			grades: seqCatchUp('grades'),
			gradeRequests: seqCatchUp('gradeRequests'),
			attendance: seqCatchUp('attendance'),
			teacherAttendance: seqCatchUp('teacher_attendance'),
			payments: clientPaymentsVersion !== versions.payments,
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
				payments: clientPaymentsVersion,
				user: clientUserVersion,
			},
			clientSeqs: sinceSeqByDomain,
			serverVersions: {
				school: schoolVersion,
				users: versions.users,
				calendar: versions.calendar,
				schedules: versions.schedules,
				grades: versions.grades,
				gradeRequests: versions.gradeRequests,
				attendance: versions.attendance,
				payments: versions.payments,
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
			...(syncCursors ? { syncCursors } : {}),
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
				payments: versions.payments,
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
