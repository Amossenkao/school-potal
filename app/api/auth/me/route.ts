import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/session';
import { getSchoolProfile } from '@/lib/mongoose';
import {
	buildBootstrapPayload,
	getAcademicYear,
	getDomainVersions,
} from '@/app/api/auth/bootstrap';

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
	try {
		const sessionCookie = request.cookies.get('sessionId');
		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const schoolVersion = toSchoolVersion(schoolProfile);

		if (!sessionCookie) {
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

		const { searchParams } = new URL(request.url);
		const clientUsersVersion =
			searchParams.get('v_users') || searchParams.get('usersVersion');
		const clientGradesVersion = searchParams.get('v_grades');
		const clientCalendarVersion = searchParams.get('v_calendar');
		const clientSchedulesVersion = searchParams.get('v_schedules');
		const clientGradeRequestsVersion = searchParams.get('v_grade_requests');
		const clientSchoolVersion = searchParams.get('v_school');
		const clientUserVersion = searchParams.get('v_user');

		const academicYear = getAcademicYear(schoolProfile);
		const versions = await getDomainVersions(session, academicYear);
		const userVersion = toHash(session);

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

		let bootstrapPayload: any = null;
		try {
			bootstrapPayload = await buildBootstrapPayload(session, {
				include,
				academicYear,
				usersVersion: versions.users,
				schoolProfile,
			});
		} catch (error) {
			console.warn('Failed to build bootstrap payload:', error);
		}

		return NextResponse.json({
			message: 'Session valid',
			...(includeUser ? { user: session } : {}),
			...(bootstrapPayload || {}),
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
