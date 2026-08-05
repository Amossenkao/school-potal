import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import { normalizeUser } from '@/lib/bootstrap';
import { publishSyncEventSafe, resolveTenantSyncKey } from '@/lib/realtimeSync';
import { bumpUsersVersion, extractAcademicYears } from '@/utils/userSync';
import { auditActorFrom, recordAuditEvent } from '@/utils/auditTrail';

const studentLabel = (student: any) =>
	`${student?.firstName || ''} ${student?.lastName || ''}`.trim() ||
	String(student?.studentId || '');

/**
 * Emits one audit event per financial attribute that actually changed.
 * Scholarship keys are stored as either the scholarship id or its name, so the
 * diff is done on raw string sets rather than resolved definitions.
 */
async function recordScholarshipAudit(
	req: NextRequest,
	sessionUser: any,
	before: any,
	after: any,
	input: {
		wardTeacherId?: unknown;
		scholarships?: unknown;
		requestId?: string;
	},
) {
	const actor = auditActorFrom(sessionUser);
	const target = {
		type: 'student',
		id: String(after?.studentId || ''),
		label: studentLabel(after),
		studentId: String(after?.studentId || ''),
	};

	if (input.scholarships !== undefined) {
		const previous: string[] = Array.isArray(before?.scholarships)
			? before.scholarships.map(String)
			: [];
		const next: string[] = Array.isArray(after?.scholarships)
			? after.scholarships.map(String)
			: [];
		const added = next.filter((key) => !previous.includes(key));
		const removed = previous.filter((key) => !next.includes(key));

		for (const key of added) {
			await recordAuditEvent(req, {
				category: 'scholarship',
				action: 'scholarship.assigned',
				summary: `Awarded "${key}" to ${target.label} (${target.studentId})`,
				actor,
				target,
				before: { scholarships: previous },
				after: { scholarships: next },
				requestId: input.requestId,
			});
		}
		for (const key of removed) {
			await recordAuditEvent(req, {
				category: 'scholarship',
				action: 'scholarship.removed',
				summary: `Removed "${key}" from ${target.label} (${target.studentId})`,
				actor,
				target,
				before: { scholarships: previous },
				after: { scholarships: next },
				requestId: input.requestId,
			});
		}
	}

	if (
		input.wardTeacherId !== undefined &&
		String(before?.wardTeacherId || '') !== String(after?.wardTeacherId || '')
	) {
		await recordAuditEvent(req, {
			category: 'scholarship',
			action: 'ward.changed',
			summary: `Ward teacher for ${target.label} changed from "${before?.wardTeacherId || 'none'}" to "${after?.wardTeacherId || 'none'}"`,
			actor,
			target,
			before: { wardTeacherId: before?.wardTeacherId || '' },
			after: { wardTeacherId: after?.wardTeacherId || '' },
			requestId: input.requestId,
		});
	}
}

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

		// Pre-image for the audit trail: `{new: true}` below returns only the
		// post-image, so the previous award list has to be read first.
		const before = await models.Student.findOne({ studentId })
			.select('studentId firstName lastName className scholarships wardTeacherId')
			.lean();

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

		await recordScholarshipAudit(req, sessionUser, before, updated, {
			wardTeacherId,
			scholarships,
			// Lets a bulk action (one request per student) be grouped in the UI.
			requestId: req.headers.get('x-action-id') || undefined,
		});

		// Invalidate cached rosters so the change reaches other clients (and
		// this one after a reload). Bump the users version fingerprint and
		// publish a realtime USER_UPDATED event carrying the updated student.
		const schoolProfile = await getSchoolProfile().catch(() => null);
		const affectedYears = extractAcademicYears(updated, schoolProfile);
		try {
			await bumpUsersVersion(affectedYears, {
				affectedUserIds: [String(updated.studentId || '')],
			});
		} catch (error) {
			console.warn('Failed to bump users version after student update:', error);
		}
		try {
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
