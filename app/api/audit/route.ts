import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import { validateComponentAccess } from '@/utils/componentsMap';
import type { Administrator, FeatureKey } from '@/types';

const PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/**
 * Read-only window onto the financial audit trail.
 *
 * There is deliberately no POST, PATCH or DELETE here: the only writer is
 * `recordAuditEvent` (utils/auditTrail.ts), called from inside the financial
 * routes themselves. Append-only is enforced by the absence of a route.
 */
export async function GET(req: NextRequest) {
	try {
		const sessionUser = await authorizeUser(req, [
			'administrator',
			'system_admin',
		]);
		if (!sessionUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		// Honour the same feature gate as the page, so switching `audit` off in
		// featureConfig closes the API too, not just the nav item.
		const schoolProfile = await getSchoolProfile();
		if (!schoolProfile) {
			return NextResponse.json(
				{ success: false, message: 'School profile not found.' },
				{ status: 500 },
			);
		}

		const admin = sessionUser as unknown as Administrator;
		const allowed = validateComponentAccess(
			schoolProfile as any,
			sessionUser.role,
			'financial-audit',
			sessionUser.role === 'administrator'
				? (admin.permissions as FeatureKey[])
				: undefined,
			sessionUser.role === 'administrator' ? admin.isTeacher : undefined,
		);
		if (!allowed) {
			return NextResponse.json(
				{ success: false, message: 'The audit trail is not enabled for you.' },
				{ status: 403 },
			);
		}

		const { searchParams } = new URL(req.url);
		const category = searchParams.get('category');
		const action = searchParams.get('action');
		const studentId = searchParams.get('studentId');
		const actorId = searchParams.get('actorId');
		const academicYear = searchParams.get('academicYear');
		const from = searchParams.get('from');
		const to = searchParams.get('to');
		const search = (searchParams.get('search') || '').trim();
		const limit = Math.min(
			Number(searchParams.get('limit')) || PAGE_SIZE,
			MAX_PAGE_SIZE,
		);
		// Cursor is the `eventAt` of the last row already shown.
		const before = searchParams.get('before');

		const filter: Record<string, unknown> = {};
		if (category) filter.category = category;
		if (action) filter.action = action;

		// `actions` narrows to a set — the "modified only" view asks for edits
		// and voids together, which a single `action` cannot express.
		const actions = (searchParams.get('actions') || '')
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean);
		if (actions.length > 0) filter.action = { $in: actions };
		if (studentId) filter['target.studentId'] = studentId;
		if (actorId) filter['actor.id'] = actorId;
		if (academicYear) filter.academicYear = academicYear;

		const eventAt: Record<string, string> = {};
		if (from) eventAt.$gte = from;
		if (to) eventAt.$lte = `${to}T23:59:59.999Z`;
		if (before) eventAt.$lt = before;
		if (Object.keys(eventAt).length > 0) filter.eventAt = eventAt;

		if (search) {
			const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const pattern = new RegExp(safe, 'i');
			const clauses: Record<string, unknown>[] = [
				{ summary: pattern },
				{ 'actor.name': pattern },
				{ 'target.label': pattern },
				{ 'target.receiptNumber': pattern },
				{ 'target.studentName': pattern },
				{ 'target.className': pattern },
				{ 'target.studentId': pattern },
			];

			// Entries written before names were recorded carry only the student ID,
			// so a search for a name would miss them. The client resolves the term
			// against its cached roster and passes the matching IDs here, which is
			// what makes name search work over the whole history.
			const resolvedIds = (searchParams.get('studentIds') || '')
				.split(',')
				.map((value) => value.trim())
				.filter(Boolean)
				.slice(0, 50);
			if (resolvedIds.length > 0) {
				clauses.push({ 'target.studentId': { $in: resolvedIds } });
			}

			filter.$or = clauses;
		}

		const models = await getTenantModels();
		const AuditEvent = models?.AuditEvent;
		if (!AuditEvent) {
			return NextResponse.json({
				success: true,
				data: { events: [], nextCursor: null, total: 0 },
			});
		}

		// One extra row tells us whether another page exists.
		const rows = await AuditEvent.find(filter)
			.sort({ eventAt: -1, _id: -1 })
			.limit(limit + 1)
			.lean();

		const hasMore = rows.length > limit;
		const page = hasMore ? rows.slice(0, limit) : rows;

		const events = page.map((event: any) => ({
			id: String(event._id),
			category: event.category,
			action: event.action,
			summary: event.summary,
			actor: event.actor,
			target: event.target,
			before: event.before ?? null,
			after: event.after ?? null,
			amount: event.amount ?? null,
			academicYear: event.academicYear || '',
			context: { ip: event.context?.ip || '' },
			eventAt: event.eventAt,
		}));

		const total = await AuditEvent.countDocuments(filter);

		return NextResponse.json({
			success: true,
			data: {
				events,
				nextCursor: hasMore ? page[page.length - 1].eventAt : null,
				total,
			},
		});
	} catch (error) {
		console.error('GET audit error:', error);
		const message =
			error instanceof Error ? error.message : 'Failed to load the audit trail.';
		return NextResponse.json({ success: false, message }, { status: 500 });
	}
}
