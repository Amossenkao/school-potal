// app/api/attendance/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Document } from 'mongoose';
import { getTenantModels } from '@/models';
import { authorizeUser } from '@/proxy';
import { normalizeHost } from '@/utils/host';
import { publishSyncEventSafe, resolveTenantSyncKey } from '@/lib/realtimeSync';
import { getSchoolProfile } from '@/lib/mongoose';
import type { Student, Teacher } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns today's date as a UTC midnight Date (strips time component).
 */
function todayUTC(): Date {
	const now = new Date();
	return new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
	);
}

/**
 * Normalises any date-like value to a UTC midnight Date for comparison.
 */
function toUTCDate(value: Date | string): Date {
	const d = new Date(value);
	return new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
	);
}

/**
 * Returns true when `candidate` falls on the same calendar day as `reference`
 * (both compared in UTC).
 */
function isSameDay(candidate: Date | string, reference: Date): boolean {
	const c = toUTCDate(candidate);
	return c.getTime() === reference.getTime();
}

// ---------------------------------------------------------------------------
// GET /api/attendance
// ---------------------------------------------------------------------------
// Query params:
//   academicYear (required)
//   classId      (optional – system_admin only; for other roles it is derived)
//   date         (optional ISO string – filter to a single day)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, [
			'system_admin',
			'teacher',
			'student',
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
		const classIdParam = searchParams.get('classId');
		const dateParam = searchParams.get('date');

		if (!academicYear) {
			return NextResponse.json(
				{ success: false, message: 'academicYear query param is required.' },
				{ status: 400 },
			);
		}

		const { Attendance, Student, Teacher } = await getTenantModels();

		// Build the base query
		const query: Record<string, any> = { academicYear };

		if (dateParam) {
			const start = toUTCDate(dateParam);
			const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
			query.date = { $gte: start, $lt: end };
		}

		// ── system_admin ──────────────────────────────────────────────────────
		if (currentUser.role === 'system_admin') {
			if (classIdParam) query.classId = classIdParam;

			const records = await Attendance.find(query)
				.sort({ date: -1, classId: 1 })
				.lean();

			return NextResponse.json({ success: true, data: records });
		}

		// ── teacher ───────────────────────────────────────────────────────────
		if (currentUser.role === 'teacher') {
			const teacher = (await Teacher.findById(currentUser.id)
				.select('subjects')
				.lean()) as (Teacher & Document) | null;

			if (!teacher) {
				return NextResponse.json(
					{ success: false, message: 'Teacher profile not found.' },
					{ status: 404 },
				);
			}

			// Gather the classIds this teacher is assigned to for the given year
			const yearEntry = teacher.subjects?.find((s) => s.year === academicYear);
			if (!yearEntry || yearEntry.classes.length === 0) {
				return NextResponse.json({
					success: true,
					data: [],
					message:
						'No classes found for this teacher in the given academic year.',
				});
			}

			const allowedClassIds = yearEntry.classes.map((c) => c.classId);

			// Honour optional classId filter but only within allowed classes
			if (classIdParam) {
				if (!allowedClassIds.includes(classIdParam)) {
					return NextResponse.json(
						{
							success: false,
							message:
								'You are not authorised to view attendance for this class.',
						},
						{ status: 403 },
					);
				}
				query.classId = classIdParam;
			} else {
				query.classId = { $in: allowedClassIds };
			}

			const records = await Attendance.find(query)
				.sort({ date: -1, classId: 1 })
				.lean();

			return NextResponse.json({ success: true, data: records });
		}

		// ── student ───────────────────────────────────────────────────────────
		if (currentUser.role === 'student') {
			const student = (await Student.findById(currentUser.id)
				.select('classId academicYears')
				.lean()) as (Student & Document) | null;

			if (!student) {
				return NextResponse.json(
					{ success: false, message: 'Student profile not found.' },
					{ status: 404 },
				);
			}

			// Resolve the student's classId for the requested academic year
			const yearEntry = student.academicYears?.find(
				(ay) => ay.year === academicYear,
			);
			const studentClassId = yearEntry?.classId ?? student.classId;

			if (!studentClassId) {
				return NextResponse.json(
					{
						success: false,
						message:
							'No class found for this student in the given academic year.',
					},
					{ status: 404 },
				);
			}

			query.classId = studentClassId;

			const records = await Attendance.find(query).sort({ date: -1 }).lean();

			return NextResponse.json({ success: true, data: records });
		}

		// Fallback – role not permitted (should not be reached due to authorizeUser)
		return NextResponse.json(
			{ success: false, message: 'Forbidden.' },
			{ status: 403 },
		);
	} catch (error) {
		console.error('GET /api/attendance error:', error);
		return NextResponse.json(
			{
				success: false,
				message: 'Failed to fetch attendance records.',
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 },
		);
	}
}

// ---------------------------------------------------------------------------
// POST /api/attendance  — create or overwrite an attendance record
// ---------------------------------------------------------------------------
// Body:
//   academicYear        string   (required)
//   classId             string   (required for system_admin / teacher;
//                                 derived from profile for student)
//   date                string   (ISO – required; must be today for teacher/student)
//   presentStudentIds   string[]
//   absentStudentIds    string[]
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, [
			'system_admin',
			'teacher',
			'student',
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

		const body = await request.json();
		const {
			academicYear,
			classId: bodyClassId,
			date: dateStr,
			presentStudentIds = [],
			absentStudentIds = [],
		} = body;

		// ── Basic validation ──────────────────────────────────────────────────
		if (!academicYear || !dateStr || !bodyClassId) {
			return NextResponse.json(
				{ success: false, message: 'academicYear, classId and date are required.' },
				{ status: 400 },
			);
		}

		const recordDate = toUTCDate(dateStr);
		const today = todayUTC();

		const { Attendance, Student, Teacher } = await getTenantModels();

		// ── Resolve tenant for sync events ────────────────────────────────────

		const schoolProfile = await getSchoolProfile();

		if (!schoolProfile) {
			return NextResponse.json({
				success: false, message: "School Profile not found"
			}, {status: 400})
		}
		const tenantId = resolveTenantSyncKey({
			schoolProfile,
			tenantId: currentUser.tenantId,
			host: cleanHost,
		});

		// ── system_admin ──────────────────────────────────────────────────────
		if (currentUser.role === 'system_admin') {

			const record = await upsertAttendance({
				Attendance,
				academicYear,
				classId: bodyClassId,
				date: recordDate,
				presentStudentIds,
				absentStudentIds,
				recordedBy: currentUser.id,
			});

			await publishSyncEventSafe({
				tenantId,
				domain: 'attendance',
				academicYear,
				actorId: currentUser.id,
				reason: 'attendance-recorded',
			});

			return NextResponse.json(
				{ success: true, data: record },
				{ status: 200 },
			);
		}

		// ── teacher ───────────────────────────────────────────────────────────
		if (currentUser.role === 'teacher') {
			// Teachers may only record attendance for today
			if (recordDate.getTime() !== today.getTime()) {
				return NextResponse.json(
					{
						success: false,
						message: 'Teachers can only record attendance for today.',
					},
					{ status: 403 },
				);
			}

			const teacher = (await Teacher.findById(currentUser.id)
				.select('subjects')
				.lean()) as (Teacher & Document) | null;

			if (!teacher) {
				return NextResponse.json(
					{ success: false, message: 'Teacher profile not found.' },
					{ status: 404 },
				);
			}

			const yearEntry = teacher.subjects?.find((s) => s.year === academicYear);
			const allowedClassIds = yearEntry?.classes.map((c) => c.classId) ?? [];

			if (!allowedClassIds.includes(bodyClassId)) {
				return NextResponse.json(
					{
						success: false,
						message:
							'You are not authorised to record attendance for this class.',
					},
					{ status: 403 },
				);
			}

			const record = await upsertAttendance({
				Attendance,
				academicYear,
				classId: bodyClassId,
				date: recordDate,
				presentStudentIds,
				absentStudentIds,
				recordedBy: currentUser.id,
			});

			await publishSyncEventSafe({
				tenantId,
				domain: 'attendance',
				academicYear,
				actorId: currentUser.id,
				reason: 'attendance-recorded',
			});

			return NextResponse.json(
				{ success: true, data: record },
				{ status: 200 },
			);
		}

		// ── student ───────────────────────────────────────────────────────────
		if (currentUser.role === 'student') {
			const student = (await Student.findById(currentUser.id)
				.select('classId academicYears daysToRecordAttendance')
				.lean()) as (Student & Document) | null;

			if (!student) {
				return NextResponse.json(
					{ success: false, message: 'Student profile not found.' },
					{ status: 404 },
				);
			}

			// Check permission: today must be in daysToRecordAttendance

			if (!student.canRecordAttendance) {
				return NextResponse.json(
					{
						success: false,
						message: 'You are not permitted to record attendance today.',
					},
					{ status: 403 },
				);
			}

			// Students can only record attendance for today
			if (recordDate.getTime() !== today.getTime()) {
				return NextResponse.json(
					{
						success: false,
						message: 'You can only record attendance for today.',
					},
					{ status: 403 },
				);
			}

			// Derive classId from student profile for the given academic year
			const yearEntry = student.academicYears?.find(
				(ay) => ay.year === academicYear,
			);
			const studentClassId = yearEntry?.classId ?? student.classId;

			if (!studentClassId) {
				return NextResponse.json(
					{
						success: false,
						message:
							'No class found for your profile in the given academic year.',
					},
					{ status: 404 },
				);
			}

			const record = await upsertAttendance({
				Attendance,
				academicYear,
				classId: studentClassId,
				date: recordDate,
				presentStudentIds,
				absentStudentIds,
				recordedBy: currentUser.id,
			});

			await publishSyncEventSafe({
				tenantId,
				domain: 'attendance',
				academicYear,
				actorId: currentUser.id,
				reason: 'attendance-recorded',
			});

			return NextResponse.json(
				{ success: true, data: record },
				{ status: 200 },
			);
		}

		return NextResponse.json(
			{ success: false, message: 'Forbidden.' },
			{ status: 403 },
		);
	} catch (error) {
		console.error('POST /api/attendance error:', error);
		return NextResponse.json(
			{
				success: false,
				message: 'Failed to record attendance.',
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 },
		);
	}
}

// ---------------------------------------------------------------------------
// PATCH /api/attendance  — partial update of an existing attendance record
// ---------------------------------------------------------------------------
// Body:
//   academicYear        string   (required)
//   classId             string   (required for system_admin / teacher)
//   date                string   (ISO – required; must be today for teacher/student)
//   presentStudentIds   string[] (optional – merged with / replaces existing)
//   absentStudentIds    string[] (optional)
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, [
			'system_admin',
			'teacher',
			'student',
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

		const body = await request.json();
		const {
			academicYear,
			classId: bodyClassId,
			date: dateStr,
			presentStudentIds,
			absentStudentIds,
		} = body;

		if (!academicYear || !dateStr || !bodyClassId) {
			return NextResponse.json(
				{ success: false, message: 'academicYear, classId and date are required.' },
				{ status: 400 },
			);
		}

		const recordDate = toUTCDate(dateStr);
		const today = todayUTC();

		const { Attendance, Student, Teacher } = await getTenantModels();

		// ── Resolve tenant for sync events ────────────────────────────────────

		const schoolProfile = await getSchoolProfile()

		const tenantId = resolveTenantSyncKey({
			schoolProfile,
			tenantId: currentUser.tenantId,
			host: cleanHost,
		});

		// ── system_admin ──────────────────────────────────────────────────────
		if (currentUser.role === 'system_admin') {

			const record = await patchAttendance({
				Attendance,
				academicYear,
				classId: bodyClassId,
				date: recordDate,
				presentStudentIds,
				absentStudentIds,
				recordedBy: currentUser.id,
			});

			if (!record) {
				return NextResponse.json(
					{ success: false, message: 'Attendance record not found.' },
					{ status: 404 },
				);
			}

			await publishSyncEventSafe({
				tenantId,
				domain: 'attendance',
				academicYear,
				actorId: currentUser.id,
				reason: 'attendance-updated',
			});

			return NextResponse.json({ success: true, data: record });
		}

		// ── teacher ───────────────────────────────────────────────────────────
		if (currentUser.role === 'teacher') {
			if (recordDate.getTime() !== today.getTime()) {
				return NextResponse.json(
					{
						success: false,
						message: 'Teachers can only update attendance for today.',
					},
					{ status: 403 },
				);
			}

			if (!bodyClassId) {
				return NextResponse.json(
					{ success: false, message: 'classId is required.' },
					{ status: 400 },
				);
			}

			const teacher = (await Teacher.findById(currentUser.id)
				.select('subjects')
				.lean()) as (Teacher & Document) | null;

			if (!teacher) {
				return NextResponse.json(
					{ success: false, message: 'Teacher profile not found.' },
					{ status: 404 },
				);
			}

			const yearEntry = teacher.subjects?.find((s) => s.year === academicYear);
			const allowedClassIds = yearEntry?.classes.map((c) => c.classId) ?? [];

			if (!allowedClassIds.includes(bodyClassId)) {
				return NextResponse.json(
					{
						success: false,
						message:
							'You are not authorised to update attendance for this class.',
					},
					{ status: 403 },
				);
			}

			const record = await patchAttendance({
				Attendance,
				academicYear,
				classId: bodyClassId,
				date: recordDate,
				presentStudentIds,
				absentStudentIds,
				recordedBy: currentUser.id,
			});

			if (!record) {
				return NextResponse.json(
					{ success: false, message: 'Attendance record not found.' },
					{ status: 404 },
				);
			}

			await publishSyncEventSafe({
				tenantId,
				domain: 'attendance',
				academicYear,
				actorId: currentUser.id,
				reason: 'attendance-updated',
			});

			return NextResponse.json({ success: true, data: record });
		}

		// ── student ───────────────────────────────────────────────────────────
		if (currentUser.role === 'student') {
			const student = (await Student.findById(currentUser.id)
				.select('classId academicYears daysToRecordAttendance')
				.lean()) as (Student & Document) | null;

			if (!student) {
				return NextResponse.json(
					{ success: false, message: 'Student profile not found.' },
					{ status: 404 },
				);
			}


			if (!student.canRecordAttendance) {
				return NextResponse.json(
					{
						success: false,
						message: 'You are not permitted to update attendance today.',
					},
					{ status: 403 },
				);
			}

			if (recordDate.getTime() !== today.getTime()) {
				return NextResponse.json(
					{
						success: false,
						message: 'You can only update attendance for today.',
					},
					{ status: 403 },
				);
			}

			const yearEntry = student.academicYears?.find(
				(ay) => ay.year === academicYear,
			);
			const studentClassId = yearEntry?.classId ?? student.classId;

			if (!studentClassId) {
				return NextResponse.json(
					{
						success: false,
						message:
							'No class found for your profile in the given academic year.',
					},
					{ status: 404 },
				);
			}

			const record = await patchAttendance({
				Attendance,
				academicYear,
				classId: studentClassId,
				date: recordDate,
				presentStudentIds,
				absentStudentIds,
				recordedBy: currentUser.id,
			});

			if (!record) {
				return NextResponse.json(
					{ success: false, message: 'Attendance record not found.' },
					{ status: 404 },
				);
			}

			await publishSyncEventSafe({
				tenantId,
				domain: 'attendance',
				academicYear,
				actorId: currentUser.id,
				reason: 'attendance-updated',
			});

			return NextResponse.json({ success: true, data: record });
		}

		return NextResponse.json(
			{ success: false, message: 'Forbidden.' },
			{ status: 403 },
		);
	} catch (error) {
		console.error('PATCH /api/attendance error:', error);
		return NextResponse.json(
			{
				success: false,
				message: 'Failed to update attendance.',
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 },
		);
	}
}

// ---------------------------------------------------------------------------
// DELETE /api/attendance  — system_admin only
// ---------------------------------------------------------------------------
// Body or query params:
//   academicYear  string  (required)
//   classId       string  (required)
//   date          string  (optional – if omitted, deletes ALL records for
//                          the class in that academic year)
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, ['system_admin']);
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

		// Accept params from query string or JSON body
		let academicYear: string | null = null;
		let classId: string | null = null;
		let dateStr: string | null = null;

		const contentType = request.headers.get('content-type') ?? '';
		if (contentType.includes('application/json')) {
			const body = await request.json();
			academicYear = body.academicYear ?? null;
			classId = body.classId ?? null;
			dateStr = body.date ?? null;
		} else {
			const { searchParams } = new URL(request.url);
			academicYear = searchParams.get('academicYear');
			classId = searchParams.get('classId');
			dateStr = searchParams.get('date');
		}

		if (!academicYear || !classId) {
			return NextResponse.json(
				{
					success: false,
					message: 'academicYear and classId are required.',
				},
				{ status: 400 },
			);
		}

		const { Attendance } = await getTenantModels();

		const filter: Record<string, any> = { academicYear, classId };
		if (dateStr) {
			const start = toUTCDate(dateStr);
			const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
			filter.date = { $gte: start, $lt: end };
		}

		const result = await Attendance.deleteMany(filter);

		// ── Sync event ────────────────────────────────────────────────────────

		const schoolProfile = await getSchoolProfile();

		const tenantId = resolveTenantSyncKey({
			schoolProfile,
			tenantId: currentUser.tenantId,
			host: cleanHost,
		});

		await publishSyncEventSafe({
			tenantId,
			domain: 'attendance',
			academicYear,
			actorId: currentUser.id,
			reason: 'attendance-deleted',
		});

		return NextResponse.json({
			success: true,
			message: `${result.deletedCount} attendance record(s) deleted.`,
			deletedCount: result.deletedCount,
		});
	} catch (error) {
		console.error('DELETE /api/attendance error:', error);
		return NextResponse.json(
			{
				success: false,
				message: 'Failed to delete attendance records.',
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 },
		);
	}
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface AttendancePayload {
	Attendance: any;
	academicYear: string;
	classId: string;
	date: Date;
	presentStudentIds: string[];
	absentStudentIds: string[];
	recordedBy: string;
}

/**
 * Upserts (creates or fully replaces) an attendance record for a given
 * academicYear + classId + date combination.
 */
async function upsertAttendance({
	Attendance,
	academicYear,
	classId,
	date,
	presentStudentIds,
	absentStudentIds,
	recordedBy,
}: AttendancePayload) {
	const endOfDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);

	return Attendance.findOneAndUpdate(
		{
			academicYear,
			classId,
			date: { $gte: date, $lt: endOfDay },
		},
		{
			$set: {
				academicYear,
				classId,
				date,
				presentStudentIds,
				absentStudentIds,
				recordedBy,
			},
		},
		{ upsert: true, new: true },
	).lean();
}

/**
 * Partially updates an existing attendance record.
 * Only the fields explicitly provided in the payload are changed.
 * Returns null if the record does not exist.
 */
async function patchAttendance({
	Attendance,
	academicYear,
	classId,
	date,
	presentStudentIds,
	absentStudentIds,
	recordedBy,
}: Omit<AttendancePayload, 'presentStudentIds' | 'absentStudentIds'> & {
	presentStudentIds?: string[];
	absentStudentIds?: string[];
}) {
	const endOfDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);

	const patch: Record<string, any> = { recordedBy };
	if (presentStudentIds !== undefined)
		patch.presentStudentIds = presentStudentIds;
	if (absentStudentIds !== undefined) patch.absentStudentIds = absentStudentIds;

	return Attendance.findOneAndUpdate(
		{
			academicYear,
			classId,
			date: { $gte: date, $lt: endOfDay },
		},
		{ $set: patch },
		{ new: true },
	).lean();
}
