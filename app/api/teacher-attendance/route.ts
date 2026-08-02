import { NextRequest, NextResponse } from 'next/server';
import { Document } from 'mongoose';
import { getTenantModels } from '@/models';
import { authorizeUser } from '@/proxy';
import { normalizeHost } from '@/utils/host';
import { getSchoolProfile } from '@/lib/mongoose';
import type { Teacher } from '@/types';
import { publishSyncEventSafe, resolveTenantSyncKey } from '@/lib/realtimeSync';
import { appendChange, appendChangeIdempotent, findChangeByIdempotencyKey } from '@/lib/syncEngine';
import { readIdempotencyKey } from '@/utils/idempotency';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toUTCDate(value: Date | string): Date {
	const d = new Date(value);
	return new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
	);
}

function getDayOfWeek(date: Date): string {
	return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}

// ---------------------------------------------------------------------------
// GET /api/teacher-attendance
// ---------------------------------------------------------------------------
// Query params:
//   academicYear  (required)
//   teacherId     (optional – for admin; teachers are scoped to self)
//   date          (optional ISO string – filter to a single day)
//   dateFrom      (optional ISO string – start of range)
//   dateTo        (optional ISO string – end of range)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, [
			'system_admin',
			'teacher',
			'administrator',
		]);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const host = request.headers.get('host');
		if (!host) {
			return NextResponse.json(
				{ success: false, message: 'Host header is missing.' },
				{ status: 400 },
			);
		}
		const cleanHost = normalizeHost(host);
		if (!cleanHost) {
			return NextResponse.json(
				{ success: false, message: 'Unable to resolve tenant host.' },
				{ status: 400 },
			);
		}

		const { searchParams } = new URL(request.url);
		const academicYear = searchParams.get('academicYear');
		const teacherIdParam = searchParams.get('teacherId');
		const dateParam = searchParams.get('date');
		const dateFrom = searchParams.get('dateFrom');
		const dateTo = searchParams.get('dateTo');

		if (!academicYear) {
			return NextResponse.json(
				{ success: false, message: 'academicYear query param is required.' },
				{ status: 400 },
			);
		}

		const { TeacherAttendance, Teacher } = await getTenantModels();

		const query: Record<string, any> = { academicYear };

		// Scope by teacher
		if (currentUser.role === 'teacher') {
			query.teacherId = currentUser.id;
		} else if (teacherIdParam) {
			query.teacherId = teacherIdParam;
		}

		// Date filtering
		if (dateParam) {
			const start = toUTCDate(dateParam);
			const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
			query.date = { $gte: start, $lt: end };
		} else if (dateFrom || dateTo) {
			const rangeFilter: Record<string, any> = {};
			if (dateFrom) rangeFilter.$gte = toUTCDate(dateFrom);
			if (dateTo) {
				const end = new Date(toUTCDate(dateTo).getTime() + 24 * 60 * 60 * 1000);
				rangeFilter.$lt = end;
			}
			query.date = rangeFilter;
		}

		const records = await TeacherAttendance.find(query)
			.sort({ date: -1, teacherId: 1 })
			.lean();

		return NextResponse.json({ success: true, data: records });
	} catch (error) {
		console.error('GET /api/teacher-attendance error:', error);
		return NextResponse.json(
			{
				success: false,
				message: 'Failed to fetch teacher attendance records.',
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 },
		);
	}
}

// ---------------------------------------------------------------------------
// POST /api/teacher-attendance — record or update teacher attendance
// ---------------------------------------------------------------------------
// Body:
//   academicYear   string (required)
//   records        Array<{ teacherId: string, status: 'present' | 'absent' }> (required)
//   date           string (ISO – required)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, [
			'system_admin',
			'administrator',
		]);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		if (currentUser.role === 'administrator') {
			const { Administrator } = await getTenantModels();
			const admin = await Administrator.findById(currentUser.id)
				.select('canRecordTeacherAttendance')
				.lean();
			if (!admin?.canRecordTeacherAttendance) {
				return NextResponse.json(
					{
						success: false,
						message: 'You do not have permission to record teacher attendance.',
					},
					{ status: 403 },
				);
			}
		}

		const host = request.headers.get('host');
		if (!host) {
			return NextResponse.json(
				{ success: false, message: 'Host header is missing.' },
				{ status: 400 },
			);
		}
		const cleanHost = normalizeHost(host);
		if (!cleanHost) {
			return NextResponse.json(
				{ success: false, message: 'Unable to resolve tenant host.' },
				{ status: 400 },
			);
		}

		const body = await request.json();
		const { academicYear, records, date: dateStr } = body;

		if (!academicYear || !dateStr || !Array.isArray(records) || records.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message: 'academicYear, date, and a non-empty records array are required.',
				},
				{ status: 400 },
			);
		}

		const recordDate = toUTCDate(dateStr);

		// Reject weekends (0 = Sunday, 6 = Saturday)
		const dayOfWeek = recordDate.getUTCDay();
		if (dayOfWeek === 0 || dayOfWeek === 6) {
			return NextResponse.json(
				{
					success: false,
					message: 'Attendance cannot be recorded on weekends.',
				},
				{ status: 400 },
			);
		}

		const { TeacherAttendance } = await getTenantModels();

		const endOfDay = new Date(recordDate.getTime() + 24 * 60 * 60 * 1000);

		const idempotencyKey = readIdempotencyKey(request);
		if (idempotencyKey) {
			const replay = await findChangeByIdempotencyKey({
				domain: 'teacher_attendance',
				academicYear,
				idempotencyKey,
			});
			if (replay) {
				return NextResponse.json(
					{
						success: true,
						data: replay.document ?? [],
						seq: replay.seq,
						replayed: true,
					},
					{ status: 200 },
				);
			}
		}

		const bulkOps = records.map(
			(rec: { teacherId: string; status: 'present' | 'late' | 'absent' }) => ({
				updateOne: {
					filter: {
						academicYear,
						teacherId: rec.teacherId,
						date: { $gte: recordDate, $lt: endOfDay },
					},
					update: {
						$set: {
							academicYear,
							teacherId: rec.teacherId,
							date: recordDate,
							status: rec.status,
							recordedBy: currentUser.id,
						},
					},
					upsert: true,
				},
			}),
		);

		const result = await TeacherAttendance.bulkWrite(bulkOps);

		const affectedTeacherIds = [
			...new Set(
				records.map(
					(rec: { teacherId: string; status: 'present' | 'late' | 'absent' }) =>
						rec.teacherId,
				),
			),
		];

		const payloadRecords = records.map(
			(rec: { teacherId: string; status: 'present' | 'late' | 'absent' }) => ({
				academicYear,
				teacherId: rec.teacherId,
				date: recordDate,
				status: rec.status,
				recordedBy: currentUser.id,
			}),
		);

		const logged = await appendChangeIdempotent({
			domain: 'teacher_attendance',
			academicYear,
			op: 'update',
			documentId: `${academicYear}:${dateStr}`,
			documentType: 'TeacherAttendance',
			document: payloadRecords,
			actorId: currentUser.id,
			idempotencyKey,
		});

		const schoolProfile = await getSchoolProfile();
		const tenantId = resolveTenantSyncKey({
			schoolProfile,
			tenantId: currentUser.tenantId,
			host: cleanHost,
		});

		await publishSyncEventSafe({
			tenantId,
			domain: 'teacher_attendance',
			academicYear,
			actorId: currentUser.id,
			reason: 'teacher-attendance-saved',
			seq: logged.seq,
			targetUserIds: affectedTeacherIds,
			payload: {
				academicYear,
				teacherAttendance: payloadRecords,
			},
		});

		return NextResponse.json(
			{
				success: true,
				data: {
					matchedCount: result.matchedCount,
					modifiedCount: result.modifiedCount,
					upsertedCount: result.upsertedCount,
				},
				seq: logged.seq,
				replayed: logged.replayed,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error('POST /api/teacher-attendance error:', error);
		return NextResponse.json(
			{
				success: false,
				message: 'Failed to record teacher attendance.',
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 },
		);
	}
}

// ---------------------------------------------------------------------------
// DELETE /api/teacher-attendance — system_admin only
// ---------------------------------------------------------------------------
// Body or query params:
//   academicYear  string (required)
//   teacherId     string (optional – omit to delete all for that date)
//   date          string (optional – omit to delete all for the teacher/year)
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, [
			'system_admin',
			'administrator',
		]);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		if (currentUser.role === 'administrator') {
			const { Administrator } = await getTenantModels();
			const admin = await Administrator.findById(currentUser.id)
				.select('canRecordTeacherAttendance')
				.lean();
			if (!admin?.canRecordTeacherAttendance) {
				return NextResponse.json(
					{
						success: false,
						message: 'You do not have permission to delete teacher attendance records.',
					},
					{ status: 403 },
				);
			}
		}

		const host = request.headers.get('host');
		if (!host) {
			return NextResponse.json(
				{ success: false, message: 'Host header is missing.' },
				{ status: 400 },
			);
		}
		const cleanHost = normalizeHost(host);
		if (!cleanHost) {
			return NextResponse.json(
				{ success: false, message: 'Unable to resolve tenant host.' },
				{ status: 400 },
			);
		}

		let academicYear: string | null = null;
		let teacherId: string | null = null;
		let dateStr: string | null = null;

		const contentType = request.headers.get('content-type') ?? '';
		if (contentType.includes('application/json')) {
			const body = await request.json();
			academicYear = body.academicYear ?? null;
			teacherId = body.teacherId ?? null;
			dateStr = body.date ?? null;
		} else {
			const { searchParams } = new URL(request.url);
			academicYear = searchParams.get('academicYear');
			teacherId = searchParams.get('teacherId');
			dateStr = searchParams.get('date');
		}

		if (!academicYear) {
			return NextResponse.json(
				{ success: false, message: 'academicYear is required.' },
				{ status: 400 },
			);
		}

		const { TeacherAttendance } = await getTenantModels();

		const filter: Record<string, any> = { academicYear };
		if (teacherId) filter.teacherId = teacherId;
		if (dateStr) {
			const start = toUTCDate(dateStr);
			const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
			filter.date = { $gte: start, $lt: end };
		}

		const affectedRecords = await TeacherAttendance.find(filter)
			.select('teacherId')
			.lean();
		const affectedTeacherIds = [
			...new Set(affectedRecords.map((r: any) => String(r.teacherId))),
		] as string[];

		const result = await TeacherAttendance.deleteMany(filter);

		await appendChange({
			domain: 'teacher_attendance',
			academicYear,
			op: 'delete',
			documentId: `${academicYear}:${teacherId ?? 'all'}:${dateStr ?? 'all'}`,
			documentType: 'TeacherAttendance',
			document: {
				academicYear,
				teacherId,
				date: dateStr,
			},
			actorId: currentUser.id,
		});

		const schoolProfile = await getSchoolProfile();
		const tenantId = resolveTenantSyncKey({
			schoolProfile,
			tenantId: currentUser.tenantId,
			host: cleanHost,
		});

		await publishSyncEventSafe({
			tenantId,
			domain: 'teacher_attendance',
			academicYear,
			actorId: currentUser.id,
			reason: 'teacher-attendance-saved',
			targetUserIds: affectedTeacherIds,
			payload: {
				academicYear,
				teacherAttendance: [],
			},
		});

		return NextResponse.json({
			success: true,
			message: `${result.deletedCount} teacher attendance record(s) deleted.`,
			deletedCount: result.deletedCount,
		});
	} catch (error) {
		console.error('DELETE /api/teacher-attendance error:', error);
		return NextResponse.json(
			{
				success: false,
				message: 'Failed to delete teacher attendance records.',
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 },
		);
	}
}
