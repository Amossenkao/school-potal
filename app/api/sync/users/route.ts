import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getTenantModels } from '@/models';
import { getUsersVersion } from '@/utils/userSync';

export async function GET(req: NextRequest) {
	try {
		const currentUser = await authorizeUser(req);
		if (!currentUser) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const academicYear = (searchParams.get('academicYear') || '').trim();
		const sinceVersion = Math.max(
			0,
			parseInt(searchParams.get('sinceVersion') || '0', 10) || 0,
		);

		if (!academicYear) {
			return NextResponse.json(
				{ message: 'academicYear is required' },
				{ status: 400 },
			);
		}

		const version = await getUsersVersion(academicYear);
		const models = await getTenantModels();

		const changes = await models.ChangeLog.find({
			domain: 'users',
			academicYear,
			seq: { $gt: sinceVersion },
		})
			.select({ seq: 1, document: 1 })
			.sort({ seq: 1 })
			.lean();

		const affectedUserIds: string[] = [];
		for (const change of changes) {
			const ids = change.document?.ids;
			if (!Array.isArray(ids)) continue;
			for (const id of ids) {
				const value = String(id || '').trim();
				if (value && !affectedUserIds.includes(value)) {
					affectedUserIds.push(value);
				}
			}
		}

		return NextResponse.json({
			success: true,
			academicYear,
			version,
			sinceVersion,
			hasChanges: version > sinceVersion,
			affectedUserIds,
		});
	} catch (error) {
		console.error('GET /api/sync/users error:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 },
		);
	}
}
