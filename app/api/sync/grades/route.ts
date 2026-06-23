import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { authorizeUser } from '@/proxy';
import { Types } from 'mongoose';
import { getRoleGradesQuery } from "@/app/api/auth/bootstrap"

const MAX_GRADE_SYNC_LIMIT = 5000;

export async function GET(req: NextRequest) {
	try {
		const currentUser = await authorizeUser(req);
		if (!currentUser) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const academicYear = searchParams.get('academicYear');
		const limit = Math.min(
			parseInt(searchParams.get('limit') || '5000', 10),
			MAX_GRADE_SYNC_LIMIT,
		);
		const cursorRaw = searchParams.get('cursor');

		if (!academicYear) {
			return NextResponse.json(
				{ message: 'academicYear is required' },
				{ status: 400 },
			);
		}


		const roleQuery = getRoleGradesQuery(currentUser, academicYear);
		if (!roleQuery) {
			return new Response(
				JSON.stringify({ success: true, data: [], nextCursor: null }),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json',
					},
				},
			);
		}

		const query: any = { ...roleQuery };

		if (cursorRaw) {
			try {
				const { lastUpdated, _id } = JSON.parse(cursorRaw);
				const cursorObjectId = new Types.ObjectId(String(_id));
				const cursorDate = new Date(lastUpdated);
				query.$or = [
					{ lastUpdated: { $gt: cursorDate } },
					{ lastUpdated: cursorDate, _id: { $gt: cursorObjectId } },
				];
			} catch {
				return NextResponse.json(
					{ message: 'Invalid cursor format' },
					{ status: 400 },
				);
			}
		}

		const models = await getTenantModels();
		const grades = await models.Grade.find(query)
			.sort({ lastUpdated: 1, _id: 1 })
			.limit(limit)
			.lean();

		let nextCursor: string | null = null;
		if (grades.length === limit) {
			const last = grades[grades.length - 1];
			nextCursor = JSON.stringify({
				lastUpdated: last.lastUpdated,
				_id: last._id,
			});
		}

		const payload = JSON.stringify({
			success: true,
			data: grades,
			nextCursor,
		});

		return new Response(payload, {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': String(Buffer.byteLength(payload, 'utf8')),
			},
		});
	} catch (error: any) {
		console.error('Error in GET /api/sync/grades:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal Server Error' },
			{ status: 500 },
		);
	}
}
