import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { listChanges, getDomainSeq } from '@/lib/syncEngine';

const MAX_DELTA_LIMIT = 2000;

const SUPPORTED_DELTA_DOMAINS = new Set([
	'grades',
	'attendance',
	'teacher_attendance',
	'calendar',
	'schedules',
	'gradeRequests',
	'users',
]);

export async function GET(req: NextRequest) {
	try {
		const currentUser = await authorizeUser(req);
		if (!currentUser) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const domain = searchParams.get('domain');
		const academicYear = (searchParams.get('academicYear') || '').trim();
		const sinceSeqRaw = parseInt(searchParams.get('sinceSeq') || '0', 10);
		const limit = Math.min(
			parseInt(searchParams.get('limit') || '500', 10) || 500,
			MAX_DELTA_LIMIT,
		);

		if (!domain || !SUPPORTED_DELTA_DOMAINS.has(domain)) {
			return NextResponse.json(
				{ message: 'domain must be one of: grades, attendance, teacher_attendance, calendar, schedules, gradeRequests, users' },
				{ status: 400 },
			);
		}
		if (!academicYear) {
			return NextResponse.json(
				{ message: 'academicYear is required' },
				{ status: 400 },
			);
		}
		const sinceSeq = Number.isFinite(sinceSeqRaw) ? Math.max(0, sinceSeqRaw) : 0;

		const { changes, hasMore } = await listChanges({
			domain,
			academicYear,
			sinceSeq,
			limit,
		});
		const currentSeq = await getDomainSeq(domain, academicYear);

		return NextResponse.json({
			success: true,
			domain,
			academicYear,
			sinceSeq,
			currentSeq,
			hasMore,
			changes,
		});
	} catch (error) {
		console.error('GET /api/sync/delta error:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 },
		);
	}
}
