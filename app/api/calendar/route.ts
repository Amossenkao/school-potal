import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import { redis } from '@/lib/redis';
import { publishSyncEventSafe, resolveTenantSyncKey } from '@/lib/realtimeSync';
import {
	getAcademicYearFilterValue,
	getCurrentAcademicYearFromSchoolProfile,
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
		console.warn('Failed to parse cached calendar JSON.', error);
		return null;
	}
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
		const requestedAcademicYear = searchParams.get('academicYear');
		const models = await getTenantModels();
		const accessUser =
			currentUser.role === 'student'
				? await models.Student.findById(currentUser.id)
						.select('role classId academicYears studentId username')
						.lean()
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
				{ success: false, message: 'Profile not found' },
				{ status: 404 }
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

		const cacheKey = `school_events:${schoolProfile?.dbName}:academic:${academicYear}`;
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
		const events = await models.SchoolEvent.find({
			eventType: 'academic_calendar',
			academicYear: getAcademicYearFilterValue(academicYear),
		})
			.sort({ startDate: 1 })
			.lean();

		await redis.set(cacheKey, JSON.stringify(events), {
			ex: CACHE_TTL_SECONDS,
		});

		return NextResponse.json({
			success: true,
			source: 'database',
			academicYear,
			defaultAcademicYear: yearAccess.defaultAcademicYear,
			allowedAcademicYears: yearAccess.allowedAcademicYears,
			data: events,
		});
	} catch (error) {
		console.error('Failed to fetch academic calendar events:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to fetch calendar events.' },
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

		if (!payload.title || !payload.startDate) {
			return NextResponse.json(
				{ success: false, message: 'Title and startDate are required.' },
				{ status: 400 }
			);
		}

		const models = await getTenantModels();
		const event = await models.SchoolEvent.create({
			eventType: 'academic_calendar',
			title: payload.title,
			startDate: payload.startDate,
			endDate: payload.endDate || payload.startDate,
			description: payload.description || '',
			location: payload.location || '',
			colorTag: payload.colorTag || 'Primary',
			academicYear,
			createdBy: currentUser.id,
			updatedBy: currentUser.id,
		});

		const cacheKey = `school_events:${schoolProfile?.dbName}:academic:${academicYear}`;
		await redis.del(cacheKey);
		await publishSyncEventSafe({
			tenantId: resolveTenantSyncKey({
				schoolProfile,
				host: request.headers.get('host'),
			}),
			domain: 'calendar',
			academicYear: String(academicYear || ''),
			actorId: currentUser.id,
			reason: 'calendar-created',
		});

		return NextResponse.json({
			success: true,
			data: event,
		});
	} catch (error) {
		console.error('Failed to create academic calendar event:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to create calendar event.' },
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
				{ success: false, message: 'Event ID is required.' },
				{ status: 400 }
			);
		}

		const models = await getTenantModels();
		const updated = await models.SchoolEvent.findByIdAndUpdate(
			payload.id,
			{
				title: payload.title,
				startDate: payload.startDate,
				endDate: payload.endDate,
				description: payload.description,
				location: payload.location,
				colorTag: payload.colorTag,
				updatedBy: currentUser.id,
			},
			{ new: true }
		);

		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const academicYear =
			updated?.academicYear ||
			getCurrentAcademicYearFromSchoolProfile(schoolProfile);
		const cacheKey = `school_events:${schoolProfile?.dbName}:academic:${academicYear}`;
		await redis.del(cacheKey);
		await publishSyncEventSafe({
			tenantId: resolveTenantSyncKey({
				schoolProfile,
				host: request.headers.get('host'),
			}),
			domain: 'calendar',
			academicYear: String(academicYear || ''),
			actorId: currentUser.id,
			reason: 'calendar-updated',
		});

		return NextResponse.json({ success: true, data: updated });
	} catch (error) {
		console.error('Failed to update academic calendar event:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to update calendar event.' },
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
				{ success: false, message: 'Event ID is required.' },
				{ status: 400 }
			);
		}

		const models = await getTenantModels();
		const deleted = await models.SchoolEvent.findByIdAndDelete(payload.id);

		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const academicYear =
			deleted?.academicYear ||
			getCurrentAcademicYearFromSchoolProfile(schoolProfile);
		const cacheKey = `school_events:${schoolProfile?.dbName}:academic:${academicYear}`;
		await redis.del(cacheKey);
		await publishSyncEventSafe({
			tenantId: resolveTenantSyncKey({
				schoolProfile,
				host: request.headers.get('host'),
			}),
			domain: 'calendar',
			academicYear: String(academicYear || ''),
			actorId: currentUser.id,
			reason: 'calendar-deleted',
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Failed to delete academic calendar event:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to delete calendar event.' },
			{ status: 500 }
		);
	}
}
