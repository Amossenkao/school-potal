import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { authorizeUser } from '@/proxy';

export async function GET(req: NextRequest) {
	try {
		const currentUser = await authorizeUser(req);
		if (!currentUser) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const academicYear = searchParams.get('academicYear');
		const limit = parseInt(searchParams.get('limit') || '10000', 10);
		const cursorRaw = searchParams.get('cursor');

		if (!academicYear) {
			return NextResponse.json(
				{ message: 'academicYear is required' },
				{ status: 400 },
			);
		}

		const models = await getTenantModels();
		const query: any = { academicYear };

		// Cursor is now a compound { lastUpdated, _id } JSON string.
		// A simple date comparison isn't enough — two records can share the same
		// lastUpdated timestamp, so we need the _id tie-breaker to avoid skipping
		// records or looping infinitely.
		if (cursorRaw) {
			try {
				const { lastUpdated, _id } = JSON.parse(cursorRaw);
				// Fetch records that come *after* the cursor position:
				//   - Any record with a strictly later lastUpdated, OR
				//   - A record with the exact same lastUpdated but a higher _id
				// This mirrors the compound sort and guarantees no gaps or duplicates.
				query.$or = [
					{ lastUpdated: { $gt: new Date(lastUpdated) } },
					{ lastUpdated: new Date(lastUpdated), _id: { $gt: _id } },
				];
			} catch {
				return NextResponse.json(
					{ message: 'Invalid cursor format' },
					{ status: 400 },
				);
			}
		}

		// Index hint: ensure this index exists in MongoDB for performance at scale:
		//   db.grades.createIndex({ academicYear: 1, lastUpdated: 1, _id: 1 })
		const grades = await models.Grade.find(query)
			.sort({ lastUpdated: 1, _id: 1 }) // compound sort — _id breaks timestamp ties
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

		return NextResponse.json({
			success: true,
			data: grades,
			nextCursor,
		});
	} catch (error: any) {
		console.error('Error in GET /api/sync/grades:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal Server Error' },
			{ status: 500 },
		);
	}
}
