import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import { redis } from '@/lib/redis';
import { publishSyncEventSafe, resolveTenantSyncKey } from '@/lib/realtimeSync';
import { appendChange, appendChangeIdempotent, findChangeByIdempotencyKey } from '@/lib/syncEngine';
import { readIdempotencyKey } from '@/utils/idempotency';
import {
	getAcademicYearFilterValue,
	getCurrentAcademicYearFromSchoolProfile,
	getStudentClassIdForAcademicYear,
	getTeacherClassIdsForAcademicYear,
	resolveAcademicYearAccessContext,
} from '@/utils/academicYearAccess';

const CACHE_TTL_SECONDS = 60 * 5;

const parseCachedJson = (cached: unknown) => {
	if (!cached) return null;
	if (typeof cached !== 'string') return cached;
	try {
		const trimmed = cached.trim();
		if (!trimmed) return null;
		return JSON.parse(trimmed);
	} catch (error) {
		console.warn('Failed to parse cached schedules JSON.', error);
		return null;
	}
};

const scheduleTypeMap: Record<string, string> = {
	class: 'class_schedule',
	test: 'test_schedule',
};

const timeToMinutes = (time: string) => {
	if (!time) return 0;
	const [hours, minutes] = time.split(':').map((value) => parseInt(value, 10));
	return hours * 60 + minutes;
};

const timesOverlap = (startA: string, endA: string, startB: string, endB: string) => {
	const aStart = timeToMinutes(startA);
	const aEnd = timeToMinutes(endA);
	const bStart = timeToMinutes(startB);
	const bEnd = timeToMinutes(endB);
	return aStart < bEnd && bStart < aEnd;
};

/**
 * A test schedule is published as a group: one title and one academic period
 * covering many class/subject/day rows. Rows stay separate documents so each
 * can be edited or removed on its own, and `groupId` is what makes them read
 * as a single schedule.
 */
const TEST_ROW_FIELDS = [
	'classId',
	'className',
	'subject',
	'startDate',
	'startTime',
	'endTime',
	'venue',
] as const;

const buildTestRow = (
	row: any,
	shared: {
		title: string;
		period: string;
		groupId: string;
		level: string;
		session: string;
		academicYear: string;
		actorId: string;
	},
) => ({
	eventType: 'test_schedule',
	title: shared.title,
	period: shared.period,
	groupId: shared.groupId,
	startDate: row.startDate || '',
	endDate: row.endDate || row.startDate || '',
	startTime: row.startTime || '',
	endTime: row.endTime || '',
	dayOfWeek: '',
	classId: row.classId || '',
	className: row.className || '',
	subject: row.subject || '',
	isRecess: false,
	venue: row.venue || '',
	location: row.location || '',
	description: row.description || '',
	academicYear: shared.academicYear,
	level: shared.level,
	session: shared.session,
	createdBy: shared.actorId,
	updatedBy: shared.actorId,
});

/** Every row of a test schedule needs a subject, a date and a time window. */
const validateTestRows = (rows: any[]): string | null => {
	if (!Array.isArray(rows) || rows.length === 0) {
		return 'A test schedule needs at least one entry.';
	}
	for (const row of rows) {
		if (!row?.subject) return 'Every entry needs a subject.';
		if (!row?.startDate) return 'Every entry needs a date.';
		if (!row?.startTime || !row?.endTime) {
			return 'Every entry needs a start and end time.';
		}
	}
	return null;
};

/**
 * Clears the GET cache for a schedule scope.
 *
 * GET keys carry a class-scope suffix (`…:<session>:<level>:<classScope>`),
 * which the un-suffixed deletes this route used to issue never matched — so an
 * edit could sit invisible behind a stale entry for the full TTL. There is no
 * pattern delete available here, so the keys a reader will actually hit are
 * cleared explicitly. Narrower role-scoped variants (one student's own class)
 * still age out on the five-minute TTL.
 */
async function invalidateScheduleCache(
	dbName: string,
	eventType: string,
	academicYear: string,
	session?: string,
	level?: string,
	classIds: string[] = [],
) {
	const base = `school_events:${dbName}:${eventType}:${academicYear}`;
	const scopes = new Set(['all', ...classIds.filter(Boolean)]);
	const keys = new Set<string>();
	for (const s of new Set([session || 'all', 'all'])) {
		for (const l of new Set([level || 'all', 'all'])) {
			keys.add(`${base}:${s}:${l}`);
			for (const scope of scopes) keys.add(`${base}:${s}:${l}:${scope}`);
		}
	}
	await Promise.all(Array.from(keys).map((key) => redis.del(key)));
}

const getClassMetaById = (classLevels: any, classId: string) => {
	if (!classLevels || !classId) return null;
	for (const [sessionName, session] of Object.entries(classLevels)) {
		for (const [levelName, levelData] of Object.entries(session as any)) {
			const classes = (levelData as any).classes || [];
			const found = classes.find((klass: any) => klass.classId === classId);
			if (found) {
				return {
					session: sessionName,
					level: levelName,
					classId: found.classId,
					className: found.name,
				};
			}
		}
	}
	return null;
};

export async function GET(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const { searchParams } = new URL(request.url);
		const type = searchParams.get('type') || 'class';
		const eventType = scheduleTypeMap[type];

		if (!eventType) {
			return NextResponse.json(
				{ success: false, message: 'Invalid schedule type.' },
				{ status: 400 }
			);
		}

		let classId = searchParams.get('classId') || '';
		let level = searchParams.get('level') || '';
		let session = searchParams.get('session') || '';
		const requestedAcademicYear = searchParams.get('academicYear');

		const models = await getTenantModels();
		const requestedStudentId = searchParams.get('studentId');
		const parentContext =
			currentUser.role === 'parent'
				? await models.Parent.findById(currentUser.id)
						.select('role studentIds')
						.lean()
				: null;
		const accessUser =
			currentUser.role === 'student'
				? await models.Student.findById(currentUser.id)
						.select('role classId academicYears studentId username')
						.lean()
				: currentUser.role === 'parent'
					? await (async () => {
							if (!parentContext) return null;
							const studentIds = Array.isArray(
								parentContext.studentIds,
							)
								? parentContext.studentIds
								: [];
							const selectedStudentId =
								requestedStudentId ||
								currentUser.studentId ||
								studentIds[0];
							if (
								!selectedStudentId ||
								!studentIds.includes(selectedStudentId)
							) {
								return { __invalidParentChild: true };
							}
							return models.Student.findOne({
								username: selectedStudentId,
								role: 'student',
							})
								.select(
									'role classId academicYears studentId username',
								)
								.lean();
						})()
					: currentUser.role === 'teacher'
						? await models.Teacher.findById(currentUser.id)
								.select('role subjects username')
								.lean()
						: currentUser.role === 'administrator'
							? await models.Administrator.findById(currentUser.id)
									.select('role academicYears username')
									.lean()
							: currentUser;
		if (!accessUser) {
			return NextResponse.json(
				{ success: false, message: 'Profile not found.' },
				{ status: 404 }
			);
		}
		if ((accessUser as any)?.__invalidParentChild) {
			return NextResponse.json(
				{
					success: false,
					message:
						'You can only access schedules for your linked children.',
				},
				{ status: 403 }
			);
		}

		const yearAccess = resolveAcademicYearAccessContext({
			user: accessUser,
			schoolProfile,
			requestedAcademicYear,
		});
		if (yearAccess.requestedAcademicYear && !yearAccess.hasAccess) {
			return NextResponse.json(
				{
					success: false,
					message: 'You do not have access to this academic year.',
					defaultAcademicYear: yearAccess.defaultAcademicYear,
					allowedAcademicYears: yearAccess.allowedAcademicYears,
				},
				{ status: 403 }
			);
		}

		const academicYear = yearAccess.academicYear;
		let classScope: string[] = [];

		if (currentUser.role === 'student' || currentUser.role === 'parent') {
			const studentClassId = getStudentClassIdForAcademicYear(
				accessUser,
				academicYear,
				{
					allowCurrentClassFallback: true,
					schoolProfile,
				}
			);
			if (!studentClassId) {
				return NextResponse.json(
					{
						success: false,
						message: 'No class assigned for the requested academic year.',
					},
					{ status: 403 }
				);
			}
			if (classId && classId !== studentClassId) {
				return NextResponse.json(
					{
						success: false,
						message: 'You can only access schedules for your assigned class.',
					},
					{ status: 403 }
				);
			}
			classId = studentClassId;
			classScope = [studentClassId];
			const meta = getClassMetaById(schoolProfile?.classLevels, classId);
			level = meta?.level || level;
			session = meta?.session || session;
		}

		if (currentUser.role === 'teacher') {
			const assignedClassIds = getTeacherClassIdsForAcademicYear(
				accessUser,
				academicYear,
				{ schoolProfile }
			);
			if (assignedClassIds.length === 0) {
				return NextResponse.json({
					success: true,
					source: 'database',
					academicYear,
					defaultAcademicYear: yearAccess.defaultAcademicYear,
					allowedAcademicYears: yearAccess.allowedAcademicYears,
					data: [],
				});
			}
			if (classId && !assignedClassIds.includes(classId)) {
				return NextResponse.json(
					{
						success: false,
						message: 'You are not assigned to this class for this academic year.',
					},
					{ status: 403 }
				);
			}
			classScope = classId ? [classId] : assignedClassIds;
		}

		if (level === 'Self Contained') {
			return NextResponse.json({
				success: true,
				source: 'database',
				academicYear,
				defaultAcademicYear: yearAccess.defaultAcademicYear,
				allowedAcademicYears: yearAccess.allowedAcademicYears,
				data: [],
			});
		}

		const classScopeKey =
			classScope.length > 0 ? classScope.slice().sort().join(',') : classId || 'all';
		const cacheKey = `school_events:${schoolProfile?.dbName}:${eventType}:${academicYear}:${
			session || 'all'
		}:${level || 'all'}:${classScopeKey}`;
		const cached = await redis.get(cacheKey);
		if (cached) {
			const parsed = parseCachedJson(cached);
			if (parsed) {
				return NextResponse.json({
					success: true,
					source: 'cache',
					data: parsed,
				});
			}
			await redis.del(cacheKey);
		}
		const query: Record<string, any> = {
			eventType,
			academicYear: getAcademicYearFilterValue(academicYear),
		};
		if (level) query.level = level;
		if (session) query.session = session;
		if (classScope.length > 0) {
			query.classId = classScope.length === 1 ? classScope[0] : { $in: classScope };
		}
		query.level = query.level
			? query.level
			: { $ne: 'Self Contained' };

		const schedules = await models.SchoolEvent.find(query)
			.sort({ startDate: 1 })
			.lean();

		await redis.set(cacheKey, JSON.stringify(schedules), {
			ex: CACHE_TTL_SECONDS,
		});

		return NextResponse.json({
			success: true,
			source: 'database',
			academicYear,
			defaultAcademicYear: yearAccess.defaultAcademicYear,
			allowedAcademicYears: yearAccess.allowedAcademicYears,
			data: schedules,
		});
	} catch (error) {
		console.error('Failed to fetch schedules:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to fetch schedules.' },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, 'system_admin');
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const payload = await request.json();
		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const academicYear =
			payload.academicYear ||
			getCurrentAcademicYearFromSchoolProfile(schoolProfile);
		const eventType = scheduleTypeMap[payload.type];

		if (!eventType) {
			return NextResponse.json(
				{ success: false, message: 'Invalid schedule type.' },
				{ status: 400 }
			);
		}

		// ── Whole test schedule in one request ──────────────────────────────
		// A test schedule is authored as a unit: one title, one period, many
		// class/subject/day rows. Creating it row by row from the client would
		// leave a half-published schedule behind if one request failed.
		if (eventType === 'test_schedule' && Array.isArray(payload.items)) {
			if (!payload.level || !payload.session) {
				return NextResponse.json(
					{ success: false, message: 'level and session are required.' },
					{ status: 400 }
				);
			}
			if (payload.level === 'Self Contained') {
				return NextResponse.json(
					{ success: false, message: 'Self Contained schedules are disabled.' },
					{ status: 400 }
				);
			}
			if (!payload.title) {
				return NextResponse.json(
					{ success: false, message: 'A test schedule needs a title.' },
					{ status: 400 }
				);
			}
			if (!payload.period) {
				return NextResponse.json(
					{
						success: false,
						message: 'A test schedule must be tied to an academic period.',
					},
					{ status: 400 }
				);
			}
			const invalid = validateTestRows(payload.items);
			if (invalid) {
				return NextResponse.json(
					{ success: false, message: invalid },
					{ status: 400 }
				);
			}

			const models = await getTenantModels();
			const groupId = payload.groupId || crypto.randomUUID();
			const shared = {
				title: payload.title,
				period: payload.period,
				groupId,
				level: payload.level,
				session: payload.session,
				academicYear: String(academicYear || ''),
				actorId: currentUser.id,
			};

			const created = await models.SchoolEvent.insertMany(
				payload.items.map((row: any) => buildTestRow(row, shared))
			);

			await invalidateScheduleCache(
				schoolProfile?.dbName,
				eventType,
				String(academicYear || ''),
				payload.session,
				payload.level,
				created.map((row: any) => String(row.classId || ''))
			);

			let lastSeq: any = null;
			for (const row of created) {
				const logged = await appendChange({
					domain: 'schedules',
					academicYear: String(academicYear || ''),
					op: 'create',
					documentId: String(row._id),
					documentType: 'SchoolEvent',
					document: typeof row.toObject === 'function' ? row.toObject() : row,
					actorId: currentUser.id,
				});
				lastSeq = logged;
			}
			await publishSyncEventSafe({
				tenantId: resolveTenantSyncKey({
					schoolProfile,
					host: request.headers.get('host'),
				}),
				domain: 'schedules',
				academicYear: String(academicYear || ''),
				actorId: currentUser.id,
				reason: 'schedule-created',
				seq: lastSeq,
				scope: {
					classIds: created
						.map((row: any) => String(row.classId || ''))
						.filter(Boolean),
				},
			});

			return NextResponse.json({
				success: true,
				data: created,
				groupId,
				seq: lastSeq,
			});
		}

		if (!payload.level || !payload.session || !payload.subject) {
			return NextResponse.json(
				{
					success: false,
					message: 'level, session, and subject are required.',
				},
				{ status: 400 }
			);
		}
		if (payload.level === 'Self Contained') {
			return NextResponse.json(
				{ success: false, message: 'Self Contained schedules are disabled.' },
				{ status: 400 }
			);
		}

		if (eventType === 'class_schedule') {
			if (!payload.dayOfWeek || !payload.startTime || !payload.endTime) {
				return NextResponse.json(
					{
						success: false,
						message: 'dayOfWeek, startTime, and endTime are required.',
					},
					{ status: 400 }
				);
			}
		}

		if (eventType === 'test_schedule') {
			if (!payload.startDate || !payload.startTime || !payload.endTime) {
				return NextResponse.json(
					{
						success: false,
						message: 'startDate, startTime, and endTime are required.',
					},
					{ status: 400 }
				);
			}
		}

		const models = await getTenantModels();

		const idempotencyKey = readIdempotencyKey(request);
		if (idempotencyKey) {
			const replay = await findChangeByIdempotencyKey({
				domain: 'schedules',
				academicYear: String(academicYear || ''),
				idempotencyKey,
			});
			if (replay) {
				return NextResponse.json({
					success: true,
					data: replay.document,
					seq: replay.seq,
					replayed: true,
				});
			}
		}

		const basePayload = {
			eventType,
			title: payload.title || payload.subject,
			startDate: payload.startDate || '',
			endDate: payload.endDate || payload.startDate || '',
			startTime: payload.startTime,
			endTime: payload.endTime,
			dayOfWeek: payload.dayOfWeek,
			classId: payload.classId || '',
			className: payload.className || '',
			subject: payload.subject,
			isRecess: payload.isRecess || false,
			period: payload.period || '',
			groupId: payload.groupId || '',
			venue: payload.venue || '',
			location: payload.location || '',
			description: payload.description || '',
			academicYear,
			level: payload.level,
			session: payload.session,
			createdBy: currentUser.id,
			updatedBy: currentUser.id,
		};
		if (eventType === 'class_schedule') {
			const conflictQuery: Record<string, any> = {
				eventType: 'class_schedule',
				academicYear: getAcademicYearFilterValue(academicYear),
				level: payload.level,
				session: payload.session,
				dayOfWeek: payload.dayOfWeek,
			};

			const existingInSlot = await models.SchoolEvent.find(conflictQuery).lean();
			const classConflict = existingInSlot.some((item: any) => {
				const sameClass =
					payload.classId && item.classId
						? item.classId === payload.classId
						: !payload.classId || !item.classId;
				if (!sameClass) return false;
				return timesOverlap(
					payload.startTime,
					payload.endTime,
					item.startTime,
					item.endTime
				);
			});

			if (classConflict) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Schedule conflict: this level already has a class at that time.',
					},
					{ status: 409 }
				);
			}

		}
		const event = await models.SchoolEvent.create(basePayload);

		await invalidateScheduleCache(
			schoolProfile?.dbName,
			eventType,
			String(academicYear || ''),
			payload.session,
			payload.level,
			[String(payload.classId || '')]
		);
		const logged = await appendChangeIdempotent({
			domain: 'schedules',
			academicYear: String(academicYear || ''),
			op: 'create',
			documentId: String(event._id),
			documentType: 'SchoolEvent',
			document:
				typeof event.toObject === 'function' ? event.toObject() : event,
			actorId: currentUser.id,
			idempotencyKey,
		});
		await publishSyncEventSafe({
			tenantId: resolveTenantSyncKey({
				schoolProfile,
				host: request.headers.get('host'),
			}),
			domain: 'schedules',
			academicYear: String(academicYear || ''),
			actorId: currentUser.id,
			reason: 'schedule-created',
			seq: logged.seq,
			scope: {
				classIds: payload.classId ? [String(payload.classId)] : [],
			},
		});

		return NextResponse.json({
			success: true,
			data: event,
			seq: logged.seq,
			replayed: logged.replayed,
		});
	} catch (error) {
		console.error('Failed to create schedule:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to create schedule.' },
			{ status: 500 }
		);
	}
}

	export async function PATCH(request: NextRequest) {
		try {
			const currentUser = await authorizeUser(request, 'system_admin');
			if (!currentUser) {
				return NextResponse.json(
					{ success: false, message: 'Unauthorized' },
					{ status: 401 }
				);
			}

			const payload = await request.json();

			// ── Whole test schedule ─────────────────────────────────────────
			// Rows carry no identity of their own to the author — they edit the
			// schedule, and the diff against what is stored decides which rows
			// are updated, added or dropped.
			if (payload.type === 'test' && payload.groupId && Array.isArray(payload.items)) {
				const invalidRows = validateTestRows(payload.items);
				if (invalidRows) {
					return NextResponse.json(
						{ success: false, message: invalidRows },
						{ status: 400 }
					);
				}
				if (!payload.title || !payload.period) {
					return NextResponse.json(
						{
							success: false,
							message: 'A test schedule needs a title and an academic period.',
						},
						{ status: 400 }
					);
				}

				const groupModels = await getTenantModels();
				const groupProfileRaw = await getSchoolProfile();
				const groupProfile =
					typeof groupProfileRaw === 'string'
						? JSON.parse(groupProfileRaw)
						: groupProfileRaw;

				const existing = await groupModels.SchoolEvent.find({
					eventType: 'test_schedule',
					groupId: payload.groupId,
				}).lean();

				const groupYear =
					payload.academicYear ||
					existing[0]?.academicYear ||
					getCurrentAcademicYearFromSchoolProfile(groupProfile);
				const shared = {
					title: payload.title,
					period: payload.period,
					groupId: payload.groupId,
					level: payload.level || existing[0]?.level || '',
					session: payload.session || existing[0]?.session || '',
					academicYear: String(groupYear || ''),
					actorId: currentUser.id,
				};

				const submittedIds = new Set(
					payload.items.map((row: any) => String(row.id || '')).filter(Boolean)
				);
				const removed = existing.filter(
					(row: any) => !submittedIds.has(String(row._id))
				);

				const saved: any[] = [];
				for (const row of payload.items) {
					const body = buildTestRow(row, shared);
					if (row.id) {
						// `createdBy` is withheld on update so the original author survives.
						const { createdBy: _authored, ...updatable } = body;
						const updated = await groupModels.SchoolEvent.findByIdAndUpdate(
							row.id,
							updatable,
							{ new: true }
						);
						if (updated) saved.push(updated);
					} else {
						const createdRow = await groupModels.SchoolEvent.create(body);
						saved.push(createdRow);
					}
				}
				for (const row of removed) {
					await groupModels.SchoolEvent.findByIdAndDelete(row._id);
				}

				await invalidateScheduleCache(
					groupProfile?.dbName,
					'test_schedule',
					String(groupYear || ''),
					shared.session,
					shared.level,
					[
						...saved.map((row: any) => String(row.classId || '')),
						...removed.map((row: any) => String(row.classId || '')),
					]
				);

				let groupSeq: any = null;
				for (const row of saved) {
					groupSeq = await appendChange({
						domain: 'schedules',
						academicYear: String(groupYear || ''),
						op: 'update',
						documentId: String(row._id),
						documentType: 'SchoolEvent',
						document:
							typeof row.toObject === 'function' ? row.toObject() : row,
						actorId: currentUser.id,
					});
				}
				for (const row of removed) {
					groupSeq = await appendChange({
						domain: 'schedules',
						academicYear: String(groupYear || ''),
						op: 'delete',
						documentId: String(row._id),
						documentType: 'SchoolEvent',
						document: { id: String(row._id) },
						actorId: currentUser.id,
					});
				}
				await publishSyncEventSafe({
					tenantId: resolveTenantSyncKey({
						schoolProfile: groupProfile,
						host: request.headers.get('host'),
					}),
					domain: 'schedules',
					academicYear: String(groupYear || ''),
					actorId: currentUser.id,
					reason: 'schedule-updated',
					seq: groupSeq,
					scope: {
						classIds: saved
							.map((row: any) => String(row.classId || ''))
							.filter(Boolean),
					},
				});

				return NextResponse.json({
					success: true,
					data: saved,
					removed: removed.map((row: any) => String(row._id)),
					seq: groupSeq,
				});
			}

			if (!payload.id) {
				return NextResponse.json(
					{ success: false, message: 'Schedule ID is required.' },
					{ status: 400 }
				);
			}

			const models = await getTenantModels();
			const schoolProfileRaw = await getSchoolProfile();
			const schoolProfile =
				typeof schoolProfileRaw === 'string'
					? JSON.parse(schoolProfileRaw)
					: schoolProfileRaw;
			if (payload.level === 'Self Contained') {
				return NextResponse.json(
					{ success: false, message: 'Self Contained schedules are disabled.' },
					{ status: 400 }
				);
			}

		if (payload.level === 'Self Contained') {
			return NextResponse.json(
				{ success: false, message: 'Self Contained schedules are disabled.' },
				{ status: 400 }
			);
		}

		if (payload.type === 'class') {
			const conflictAcademicYear =
				payload.academicYear ||
				getCurrentAcademicYearFromSchoolProfile(schoolProfile);
			const conflictQuery: Record<string, any> = {
				eventType: 'class_schedule',
				academicYear: getAcademicYearFilterValue(conflictAcademicYear),
				level: payload.level,
				session: payload.session,
				dayOfWeek: payload.dayOfWeek,
				_id: { $ne: payload.id },
			};

			const existingInSlot = await models.SchoolEvent.find(conflictQuery).lean();
			const classConflict = existingInSlot.some((item: any) => {
				const sameClass =
					payload.classId && item.classId
						? item.classId === payload.classId
						: !payload.classId || !item.classId;
				if (!sameClass) return false;
				return timesOverlap(
					payload.startTime,
					payload.endTime,
					item.startTime,
					item.endTime
				);
			});

			if (classConflict) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Schedule conflict: this level already has a class at that time.',
					},
					{ status: 409 }
				);
			}

		}

		const updated = await models.SchoolEvent.findByIdAndUpdate(
			payload.id,
			{
				title: payload.title,
				startDate: payload.startDate,
				endDate: payload.endDate,
				startTime: payload.startTime,
				endTime: payload.endTime,
				dayOfWeek: payload.dayOfWeek,
				classId: payload.classId || '',
				className: payload.className || '',
				subject: payload.subject,
				isRecess: payload.isRecess,
				venue: payload.venue,
				location: payload.location,
				description: payload.description,
				level: payload.level,
				session: payload.session,
				updatedBy: currentUser.id,
				...(payload.period !== undefined ? { period: payload.period } : {}),
			},
			{ new: true }
		);

		const academicYear =
			updated?.academicYear ||
			getCurrentAcademicYearFromSchoolProfile(schoolProfile);
		const eventType = updated?.eventType || scheduleTypeMap[payload.type] || '';
		const level = updated?.level || payload.level || 'all';
		const session = updated?.session || payload.session || 'all';

		await invalidateScheduleCache(
			schoolProfile?.dbName,
			eventType,
			String(academicYear || ''),
			session,
			level,
			[String(updated?.classId || payload.classId || '')]
		);
		const logged = await appendChange({
			domain: 'schedules',
			academicYear: String(academicYear || ''),
			op: 'update',
			documentId: String(payload.id),
			documentType: 'SchoolEvent',
			document:
				updated && typeof updated.toObject === 'function'
					? updated.toObject()
					: updated,
			actorId: currentUser.id,
		});
		await publishSyncEventSafe({
			tenantId: resolveTenantSyncKey({
				schoolProfile,
				host: request.headers.get('host'),
			}),
			domain: 'schedules',
			academicYear: String(academicYear || ''),
			actorId: currentUser.id,
			reason: 'schedule-updated',
			seq: logged,
			scope: {
				classIds: (updated?.classId || payload.classId)
					? [String(updated?.classId || payload.classId)]
					: [],
			},
		});

		return NextResponse.json({
			success: true,
			data: updated,
			seq: logged,
		});
	} catch (error) {
		console.error('Failed to update schedule:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to update schedule.' },
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, 'system_admin');
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const payload = await request.json();

		// ── Whole test schedule ─────────────────────────────────────────────
		if (!payload.id && payload.groupId) {
			const groupModels = await getTenantModels();
			const groupProfileRaw = await getSchoolProfile();
			const groupProfile =
				typeof groupProfileRaw === 'string'
					? JSON.parse(groupProfileRaw)
					: groupProfileRaw;

			const rows = await groupModels.SchoolEvent.find({
				eventType: 'test_schedule',
				groupId: payload.groupId,
			}).lean();

			if (rows.length === 0) {
				return NextResponse.json({ success: true, deletedCount: 0 });
			}

			await groupModels.SchoolEvent.deleteMany({
				eventType: 'test_schedule',
				groupId: payload.groupId,
			});

			const groupYear = rows[0]?.academicYear || '';
			await invalidateScheduleCache(
				groupProfile?.dbName,
				'test_schedule',
				String(groupYear),
				rows[0]?.session,
				rows[0]?.level,
				rows.map((row: any) => String(row.classId || ''))
			);

			let groupSeq: any = null;
			for (const row of rows) {
				groupSeq = await appendChange({
					domain: 'schedules',
					academicYear: String(groupYear),
					op: 'delete',
					documentId: String(row._id),
					documentType: 'SchoolEvent',
					document: { id: String(row._id) },
					actorId: currentUser.id,
				});
			}
			await publishSyncEventSafe({
				tenantId: resolveTenantSyncKey({
					schoolProfile: groupProfile,
					host: request.headers.get('host'),
				}),
				domain: 'schedules',
				academicYear: String(groupYear),
				actorId: currentUser.id,
				reason: 'schedule-deleted',
				seq: groupSeq,
				scope: {
					classIds: rows
						.map((row: any) => String(row.classId || ''))
						.filter(Boolean),
				},
			});

			return NextResponse.json({
				success: true,
				deletedCount: rows.length,
				seq: groupSeq,
			});
		}

		if (!payload.id) {
			return NextResponse.json(
				{ success: false, message: 'Schedule ID is required.' },
				{ status: 400 }
			);
		}

		const models = await getTenantModels();
		const deleted = await models.SchoolEvent.findByIdAndDelete(payload.id);
		const deletedCount = deleted ? 1 : 0;

		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const academicYear =
			deleted?.academicYear ||
			getCurrentAcademicYearFromSchoolProfile(schoolProfile);
		const eventType = deleted?.eventType || scheduleTypeMap[payload.type] || '';
		const level = deleted?.level || payload.level || 'all';
		const session = deleted?.session || payload.session || 'all';

		await invalidateScheduleCache(
			schoolProfile?.dbName,
			eventType,
			String(academicYear || ''),
			session,
			level,
			[String(deleted?.classId || payload.classId || '')]
		);
		const logged = await appendChange({
			domain: 'schedules',
			academicYear: String(academicYear || ''),
			op: 'delete',
			documentId: String(payload.id),
			documentType: 'SchoolEvent',
			document: { id: String(payload.id) },
			actorId: currentUser.id,
		});
		await publishSyncEventSafe({
			tenantId: resolveTenantSyncKey({
				schoolProfile,
				host: request.headers.get('host'),
			}),
			domain: 'schedules',
			academicYear: String(academicYear || ''),
			actorId: currentUser.id,
			reason: 'schedule-deleted',
			seq: logged,
			scope: {
				classIds: (deleted?.classId || payload.classId)
					? [String(deleted?.classId || payload.classId)]
					: [],
			},
		});

		return NextResponse.json({ success: true, deletedCount, seq: logged });
	} catch (error) {
		console.error('Failed to delete schedule:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to delete schedule.' },
			{ status: 500 }
		);
	}
}
