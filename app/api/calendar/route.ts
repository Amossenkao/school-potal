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
		console.warn('Failed to parse cached calendar JSON.', error);
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
		const academicYear =
			new URL(request.url).searchParams.get('academicYear') ||
			getAcademicYear(schoolProfile);

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
		const models = await getTenantModels();
		const events = await models.SchoolEvent.find({
			eventType: 'academic_calendar',
			academicYear,
		})
			.sort({ startDate: 1 })
			.lean();

		await redis.set(cacheKey, JSON.stringify(events), {
			ex: CACHE_TTL_SECONDS,
		});

		return NextResponse.json({
			success: true,
			source: 'database',
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
		const academicYear = payload.academicYear || getAcademicYear(schoolProfile);

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
		const academicYear = updated?.academicYear || getAcademicYear(schoolProfile);
		const cacheKey = `school_events:${schoolProfile?.dbName}:academic:${academicYear}`;
		await redis.del(cacheKey);

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
		const academicYear = deleted?.academicYear || getAcademicYear(schoolProfile);
		const cacheKey = `school_events:${schoolProfile?.dbName}:academic:${academicYear}`;
		await redis.del(cacheKey);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Failed to delete academic calendar event:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to delete calendar event.' },
			{ status: 500 }
		);
	}
}
