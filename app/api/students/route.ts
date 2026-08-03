import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import { normalizeUser } from '@/lib/bootstrap';
import { publishSyncEventSafe, resolveTenantSyncKey } from '@/lib/realtimeSync';
import { bumpUsersVersion, extractAcademicYears } from '@/utils/userSync';

export async function GET(req: NextRequest) {
	try {
		const sessionUser = await authorizeUser(req, 'administrator');
		if (!sessionUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const { searchParams } = new URL(req.url);
		const classId = searchParams.get('classId');
		const search = searchParams.get('search') || '';

		const models = await getTenantModels();

		const filter: Record<string, unknown> = {};

		if (classId) {
			filter.classId = classId;
		}

		if (search) {
			const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const studentIds = await models.User.find(
				{
					role: 'student',
					$or: [
						{ firstName: { $regex: escaped, $options: 'i' } },
						{ lastName: { $regex: escaped, $options: 'i' } },
						{ username: { $regex: escaped, $options: 'i' } },
					],
				},
				{ username: 1, _id: 0 },
			).lean();

			const matchingIds = studentIds.map((u: any) => u.username);
			filter.studentId = { $in: matchingIds };
		}

		const students = await models.Student.find(filter).lean();

		const mapped = await Promise.all(
			students.map(async (s: any) => {
				const user = await models.User.findOne(
					{ username: s.studentId, role: 'student' },
					{ firstName: 1, lastName: 1, username: 1, _id: 0 },
				).lean();

				return {
					id: s._id.toString(),
					studentId: s.studentId,
					firstName: user?.firstName || '',
					lastName: user?.lastName || '',
					classId: s.classId,
					className: s.className,
					wardTeacherId: s.wardTeacherId || '',
					scholarships: s.scholarships || [],
				};
			}),
		);

		return NextResponse.json({ success: true, data: mapped });
	} catch (error) {
		console.error('GET students error:', error);
		const message = error instanceof Error ? error.message : 'Failed to fetch students.';
		return NextResponse.json({ success: false, message }, { status: 500 });
	}
}

export async function PATCH(req: NextRequest) {
	try {
		const sessionUser = await authorizeUser(req, 'administrator');
		if (!sessionUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const payload = await req.json();
		const { studentId, wardTeacherId, scholarships } = payload;

		if (!studentId) {
			return NextResponse.json(
				{ success: false, message: 'studentId is required.' },
				{ status: 400 },
			);
		}

		const models = await getTenantModels();

		const updateData: Record<string, unknown> = {};
		if (wardTeacherId !== undefined) updateData.wardTeacherId = wardTeacherId;
		if (scholarships !== undefined) updateData.scholarships = scholarships;

		if (Object.keys(updateData).length === 0) {
			return NextResponse.json(
				{ success: false, message: 'No fields to update.' },
				{ status: 400 },
			);
		}

		const updated = await models.Student.findOneAndUpdate(
			{ studentId },
			{ $set: updateData },
			{ new: true },
		).lean();

		if (!updated) {
			return NextResponse.json(
				{ success: false, message: 'Student not found.' },
				{ status: 404 },
			);
		}

		// Invalidate cached rosters so the change reaches other clients (and
		// this one after a reload). Bump the users version fingerprint and
		// publish a realtime USER_UPDATED event carrying the updated student.
		const affectedYears = extractAcademicYears(updated);
		try {
			await bumpUsersVersion(affectedYears, {
				affectedUserIds: [String(updated.studentId || '')],
			});
		} catch (error) {
			console.warn('Failed to bump users version after student update:', error);
		}
		try {
			const schoolProfile = await getSchoolProfile().catch(() => null);
			const tenantId = resolveTenantSyncKey({
				schoolProfile: schoolProfile || undefined,
			});
			if (tenantId) {
				const normalizedUser = normalizeUser(updated);
				const affectedUserId = String(
					normalizedUser.id || updated.studentId || '',
				);
				await publishSyncEventSafe({
					tenantId,
					domain: 'users',
					reason: 'user-updated',
					academicYear: affectedYears[0] || null,
					actorId: sessionUser?.id || null,
					payload: {
						userId: affectedUserId,
						user: normalizedUser,
						targetUserIds: [affectedUserId],
					},
				});
			}
		} catch (error) {
			console.warn('Failed to publish student update realtime event:', error);
		}

		return NextResponse.json({
			success: true,
			message: 'Student updated successfully.',
			data: {
				studentId: updated.studentId,
				wardTeacherId: updated.wardTeacherId || '',
				scholarships: updated.scholarships || [],
			},
		});
	} catch (error) {
		console.error('PATCH students error:', error);
		const message = error instanceof Error ? error.message : 'Failed to update student.';
		return NextResponse.json({ success: false, message }, { status: 500 });
	}
}
