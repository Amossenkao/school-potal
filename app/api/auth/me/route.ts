import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/session';
import { getSchoolProfile } from '@/lib/mongoose';
import { buildBootstrapPayload, getAcademicYear } from '@/app/api/auth/bootstrap';
import { getUsersVersion } from '@/utils/userSync';

export async function GET(request: NextRequest) {
	try {
		const sessionCookie = request.cookies.get('sessionId');
		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const { searchParams } = new URL(request.url);
		const clientUsersVersionParam = searchParams.get('usersVersion');
		const clientUsersVersion = clientUsersVersionParam
			? Number(clientUsersVersionParam)
			: null;
		const academicYear = getAcademicYear(schoolProfile);
		const currentUsersVersion = await getUsersVersion(academicYear);
		const includeUsers = true;

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

		// Basic format check
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

		// Update: Checking for 'id' instead of 'userId' per your new types
		if (!session || !session.id) {
			const response = NextResponse.json(
				{
					user: null,
					school: schoolProfile || null,
					message: 'Session expired or invalid',
				},
				{ status: 401 },
			);

			// Clear the invalid session cookie
			response.cookies.set('sessionId', '', {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				expires: new Date(0),
				path: '/',
			});

			return response;
		}

		// Return the session data (which now uses 'id') and school profile
		let bootstrapPayload: any = null;
		try {
			bootstrapPayload = await buildBootstrapPayload(session, {
				includeUsers,
				academicYear,
				usersVersion: currentUsersVersion,
				schoolProfile,
			});
		} catch (error) {
			console.warn('Failed to build bootstrap payload:', error);
		}
		return NextResponse.json({
			user: session,
			message: 'Session valid',
			...(bootstrapPayload || {}),
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
