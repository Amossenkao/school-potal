import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/session';

export async function GET(request: NextRequest) {
	try {
		const sessionCookie = request.cookies.get('sessionId');

		if (!sessionCookie) {
			console.error('No session cookie found');
			return NextResponse.json(
				{ user: null, message: 'No session cookie found' },
				{ status: 401 }
			);
		}

		const sessionId = sessionCookie.value;
		const session = await getSession(sessionId);

		if (!sessionId || sessionId.length < 10) {
			console.error('Invalid session format:', sessionId);
			return NextResponse.json(
				{ user: null, message: 'Invalid session format' },
				{ status: 401 }
			);
		}

		if (!session || !session.userId) {
			console.error('Session expired or invalid:', session);
			const response = NextResponse.json(
				{ user: null, message: 'Session expired or invalid' },
				{ status: 401 }
			);

			// Clear the session cookie
			response.cookies.set('sessionId', '', {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				expires: new Date(0),
				path: '/',
			});

			return response;
		}

		return NextResponse.json({
			user: session || null,
			message: 'Session valid',
		});
	} catch (error) {
		console.error('Session validation error:', error);
		return NextResponse.json(
			{
				user: null,
				message: 'Internal server error',
			},
			{ status: 500 }
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
