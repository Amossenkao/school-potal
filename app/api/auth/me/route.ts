import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/session';
import { getSchoolProfile } from '@/lib/mongoose';

export async function GET(request: NextRequest) {
	try {
		const sessionCookie = request.cookies.get('sessionId');
		const schoolProfile = await getSchoolProfile();

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
		return NextResponse.json({
			user: session,
			school: schoolProfile || null,
			message: 'Session valid',
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
