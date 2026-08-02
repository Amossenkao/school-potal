import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { buildBootstrapPayload } from '@/lib/bootstrap';
import { getDomainSeq } from '@/lib/syncEngine';
import { checksum } from '@/lib/syncChecksum';

const DOMAIN_INCLUDE_KEYS: Record<string, string> = {
	users: 'users',
	calendar: 'calendarEvents',
	schedules: 'schedules',
	grades: 'grades',
	gradeRequests: 'gradeRequests',
	attendance: 'attendance',
	teacherAttendance: 'teacherAttendance',
};

const ALL_DOMAINS = Object.keys(DOMAIN_INCLUDE_KEYS);

export async function GET(req: NextRequest) {
	try {
		const currentUser = await authorizeUser(req);
		if (!currentUser) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const domain = searchParams.get('domain');
		const requestedAcademicYear =
			searchParams.get('academicYear')?.trim() || undefined;

		if (!domain || !(domain in DOMAIN_INCLUDE_KEYS)) {
			return NextResponse.json(
				{
					message: `domain must be one of: ${ALL_DOMAINS.join(', ')}`,
				},
				{ status: 400 },
			);
		}

		const include: any = {
			school: false,
			users: false,
			calendar: false,
			schedules: false,
			grades: false,
			gradeRequests: false,
			attendance: false,
			teacherAttendance: false,
			payments: false,
		};
		include[domain] = true;

		const payload: any = await buildBootstrapPayload(currentUser, {
			include,
			academicYear: requestedAcademicYear,
		});
		const resolvedAcademicYear = payload.academicYear;
		const currentSeq = await getDomainSeq(domain, resolvedAcademicYear);
		const data = payload[DOMAIN_INCLUDE_KEYS[domain]] ?? null;

		return NextResponse.json({
			success: true,
			domain,
			academicYear: resolvedAcademicYear,
			currentSeq,
			// Content checksum over the canonical payload so the client can
			// verify the snapshot wasn't truncated/corrupted in transit and
			// self-heal by re-pulling when it drifts (§6.5).
			checksum: data == null ? null : checksum(data),
			data,
		});
	} catch (error) {
		console.error('GET /api/sync/snapshot error:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 },
		);
	}
}
