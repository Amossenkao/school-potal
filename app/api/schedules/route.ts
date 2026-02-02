import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import { redis } from '@/lib/redis';

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

const getAcademicYear = (schoolProfile: any) => {
	const now = new Date();
	if (schoolProfile?.currentAcademicYear) {
		return schoolProfile.currentAcademicYear;
	}
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();
	return currentMonth >= 7
		? `${currentYear}-${currentYear + 1}`
		: `${currentYear - 1}-${currentYear}`;
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

		const academicYear =
			searchParams.get('academicYear') || getAcademicYear(schoolProfile);
		let classId = searchParams.get('classId') || '';
		let level = searchParams.get('level') || '';
		let session = searchParams.get('session') || '';

		const models = await getTenantModels();

		if (currentUser.role === 'student') {
			const student = await models.Student.findById(currentUser.id)
				.select('classId className')
				.lean();
			classId = student?.classId || classId;
			const meta = getClassMetaById(schoolProfile?.classLevels, classId);
			level = meta?.level || level;
			session = meta?.session || session;
		}
		if (level === 'Self Contained') {
			return NextResponse.json({
				success: true,
				source: 'database',
				data: [],
			});
		}

		const cacheKey = `school_events:${schoolProfile?.dbName}:${eventType}:${academicYear}:${
			session || 'all'
		}:${level || 'all'}`;
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
			academicYear,
		};
		if (level) query.level = level;
		if (session) query.session = session;
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
		const academicYear = payload.academicYear || getAcademicYear(schoolProfile);
		const eventType = scheduleTypeMap[payload.type];

		if (!eventType) {
			return NextResponse.json(
				{ success: false, message: 'Invalid schedule type.' },
				{ status: 400 }
			);
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
				academicYear,
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

		const cacheKey = `school_events:${schoolProfile?.dbName}:${eventType}:${academicYear}:${
			payload.session || 'all'
		}:${payload.level || 'all'}`;
		await redis.del(cacheKey);
		await redis.del(
			`school_events:${schoolProfile?.dbName}:${eventType}:${academicYear}:all:all`
		);

		return NextResponse.json({
			success: true,
			data: event,
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
			const conflictQuery: Record<string, any> = {
				eventType: 'class_schedule',
				academicYear: payload.academicYear || getAcademicYear(schoolProfile),
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
			},
			{ new: true }
		);

		const academicYear = updated?.academicYear || getAcademicYear(schoolProfile);
		const eventType = updated?.eventType || scheduleTypeMap[payload.type] || '';
		const level = updated?.level || payload.level || 'all';
		const session = updated?.session || payload.session || 'all';

		await redis.del(
			`school_events:${schoolProfile?.dbName}:${eventType}:${academicYear}:${
				session || 'all'
			}:${level || 'all'}`
		);
		await redis.del(
			`school_events:${schoolProfile?.dbName}:${eventType}:${academicYear}:all:all`
		);

		return NextResponse.json({
			success: true,
			data: updated,
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
		const academicYear = deleted?.academicYear || getAcademicYear(schoolProfile);
		const eventType = deleted?.eventType || scheduleTypeMap[payload.type] || '';
		const level = deleted?.level || payload.level || 'all';
		const session = deleted?.session || payload.session || 'all';

		await redis.del(
			`school_events:${schoolProfile?.dbName}:${eventType}:${academicYear}:${
				session || 'all'
			}:${level || 'all'}`
		);
		await redis.del(
			`school_events:${schoolProfile?.dbName}:${eventType}:${academicYear}:all:all`
		);

		return NextResponse.json({ success: true, deletedCount });
	} catch (error) {
		console.error('Failed to delete schedule:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to delete schedule.' },
			{ status: 500 }
		);
	}
}
