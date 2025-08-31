// app/api/school/route.ts

import { getSchoolProfile } from '@/lib/mongoose';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
	console.log('Fetching school profile for host:');

	try {
		const profile = await getSchoolProfile();

		if (!profile) {
			return NextResponse.json(
				{ error: 'School profile not found' },
				{ status: 404 }
			);
		}

		// FIX: Convert the Mongoose document to a plain JavaScript object
		const plainProfile = JSON.parse(JSON.stringify(profile));

		return NextResponse.json(plainProfile);
	} catch (error) {
		console.error('API Error fetching school profile:', error);
		return NextResponse.json(
			{ error: 'Internal Server Error' },
			{ status: 500 }
		);
	}
}
