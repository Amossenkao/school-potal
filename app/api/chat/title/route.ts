// /app/api/chat/title/route.ts
// Polled by the client after a new session's first stream to fetch the
// AI-generated title (set asynchronously in the background after the stream).

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/proxy';
import { getTenantModels } from '@/models';

export async function GET(req: NextRequest) {
	try {
		const user = await authenticateRequest(req);
		if (!user)
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const sessionId = req.nextUrl.searchParams.get('sessionId');
		if (!sessionId)
			return NextResponse.json(
				{ error: 'sessionId required' },
				{ status: 400 },
			);

		const models = await getTenantModels();
		const userRecord = await models.User.findById(user.id)
			.select('chatSessions')
			.lean();

		const session = (userRecord?.chatSessions ?? []).find(
			(s: any) => s.id === sessionId,
		);
		if (!session) return NextResponse.json({ title: 'New conversation' });

		return NextResponse.json({ title: session.title ?? 'New conversation' });
	} catch (err) {
		console.error('GET /api/chat/title:', err);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
