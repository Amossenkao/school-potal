import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/proxy';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import {
	MAX_CHAT_HISTORY,
	MAX_EVENTS,
	MAX_SCHEDULES,
	buildUserContext,
	getAcademicYear,
	getClassMetaById,
	getTeacherClassIds,
	getTeacherSubjectNames,
} from './utils';

// ─── Config ───────────────────────────────────────────────────────────────────
const OPENROUTER_KEYS = [
	process.env.OPENROUTER_API_KEY_1,
	process.env.OPENROUTER_API_KEY_2,
	process.env.OPENROUTER_API_KEY_3,
].filter(Boolean) as string[];

const MODEL = 'openrouter/free';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// ─── OpenRouter call with key rotation ───────────────────────────────────────
async function callOpenRouter(
	messages: { role: string; content: string }[],
	stream: boolean,
): Promise<Response> {
	let lastError: Response | null = null;

	for (const key of OPENROUTER_KEYS) {
		const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${key}`,
				'Content-Type': 'application/json',
				'HTTP-Referer': SITE_URL,
				'X-Title': 'School Study Assistant',
			},
			body: JSON.stringify({
				model: MODEL,
				messages,
				stream,
				max_tokens: 1024,
				temperature: 0.7,
			}),
		});

		// Rate limited — try next key
		if (res.status === 429) {
			lastError = res;
			continue;
		}

		return res;
	}

	// All keys exhausted
	return lastError!;
}

// ─── Non-streaming call (for title generation) ────────────────────────────────
function formatTitle(rawTitle: string): string {
	const title = rawTitle
		.replace(/^["'`]+|["'`]+$/g, '')
		.replace(/[_-]+/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
		.replace(/[.!?;:]+$/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	if (!title) return 'New conversation';

	const words = title.split(' ').slice(0, 6);
	return words
		.map((word) =>
			word.length <= 2
				? word.toUpperCase()
				: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
		)
		.join(' ');
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
	return new Promise((resolve) => {
		const timeout = setTimeout(() => resolve(null), ms);
		promise
			.then((value) => resolve(value))
			.catch(() => resolve(null))
			.finally(() => clearTimeout(timeout));
	});
}

async function generateTitle(userFirstMessage: string): Promise<string> {
	try {
		const res = await callOpenRouter(
			[
				{
					role: 'system',
					content:
						"You are a concise title generator. Given the user's first message in a chat, " +
						'reply with ONLY a short title (3-6 words, no quotes, no punctuation at the end). ' +
						'Make it descriptive and specific to the topic.',
				},
				{ role: 'user', content: userFirstMessage },
			],
			false,
		);
		if (!res.ok) return 'New conversation';
		const data = await res.json();
		return formatTitle(
			data?.choices?.[0]?.message?.content?.trim() || 'New conversation',
		);
	} catch {
		return 'New conversation';
	}
}

// ─── Build school context block ───────────────────────────────────────────────
async function buildContext(userRecord: any, models: any): Promise<string> {
	const schoolProfileRaw = await getSchoolProfile();
	const schoolProfile =
		typeof schoolProfileRaw === 'string'
			? JSON.parse(schoolProfileRaw)
			: schoolProfileRaw;
	const academicYear = getAcademicYear(schoolProfile);

	let recentGrades: any[] = [];
	let classSchedules: any[] = [];
	let testSchedules: any[] = [];

	const calendarEvents = await models.SchoolEvent.find({
		eventType: 'academic_calendar',
		academicYear,
	})
		.sort({ startDate: 1 })
		.limit(MAX_EVENTS)
		.lean();

	if (userRecord.role === 'student' && userRecord.studentId) {
		recentGrades = await models.Grade.find({
			studentId: userRecord.studentId,
			academicYear,
		})
			.sort({ lastUpdated: -1 })
			.limit(5)
			.lean();

		const classMeta = getClassMetaById(
			schoolProfile?.classLevels,
			userRecord.classId,
		);
		const scheduleQuery: Record<string, any> = {
			eventType: 'class_schedule',
			academicYear,
		};
		if (userRecord.classId) {
			const orFilters: Record<string, any>[] = [
				{ classId: userRecord.classId },
			];
			if (classMeta?.level && classMeta?.session) {
				orFilters.push({
					classId: { $in: [null, ''] },
					level: classMeta.level,
					session: classMeta.session,
				});
			}
			scheduleQuery.$or = orFilters;
		}
		classSchedules = await models.SchoolEvent.find(scheduleQuery)
			.sort({ startDate: 1 })
			.limit(MAX_SCHEDULES)
			.lean();

		const testQuery: Record<string, any> = {
			eventType: 'test_schedule',
			academicYear,
		};
		if (classMeta?.level) testQuery.level = classMeta.level;
		if (classMeta?.session) testQuery.session = classMeta.session;
		testSchedules = await models.SchoolEvent.find(testQuery)
			.sort({ startDate: 1 })
			.limit(MAX_SCHEDULES)
			.lean();
	}

	if (userRecord.role === 'teacher') {
		const subjectNames = getTeacherSubjectNames(userRecord.subjects);
		const classIds = getTeacherClassIds(userRecord.subjects);
		classSchedules = await models.SchoolEvent.find({
			eventType: 'class_schedule',
			academicYear,
			...(classIds.length > 0 ? { classId: { $in: classIds } } : {}),
			...(subjectNames.length > 0 ? { subject: { $in: subjectNames } } : {}),
		})
			.sort({ startDate: 1 })
			.limit(MAX_SCHEDULES)
			.lean();

		testSchedules = await models.SchoolEvent.find({
			eventType: 'test_schedule',
			academicYear,
			...(subjectNames.length > 0 ? { subject: { $in: subjectNames } } : {}),
		})
			.sort({ startDate: 1 })
			.limit(MAX_SCHEDULES)
			.lean();
	}

	if (userRecord.role !== 'student' && userRecord.role !== 'teacher') {
		classSchedules = await models.SchoolEvent.find({
			eventType: 'class_schedule',
			academicYear,
		})
			.sort({ startDate: 1 })
			.limit(MAX_SCHEDULES)
			.lean();
		testSchedules = await models.SchoolEvent.find({
			eventType: 'test_schedule',
			academicYear,
		})
			.sort({ startDate: 1 })
			.limit(MAX_SCHEDULES)
			.lean();
	}

	return buildUserContext(
		userRecord,
		schoolProfile,
		recentGrades,
		calendarEvents,
		classSchedules,
		testSchedules,
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat
//   ?sessionId=xxx  → messages for a specific session
//   (no params)     → list of all session stubs
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
	try {
		const user = await authenticateRequest(req);
		if (!user)
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const sessionId = req.nextUrl.searchParams.get('sessionId');
		const models = await getTenantModels();
		const userRecord = await models.User.findById(user.id)
			.select('chatSessions')
			.lean();
		const chatSessions: any[] = Array.isArray(userRecord?.chatSessions)
			? userRecord.chatSessions
			: [];

		if (sessionId) {
			// Return messages for one session
			const session = chatSessions.find((s: any) => s.id === sessionId);
			if (!session) return NextResponse.json({ messages: [] });
			return NextResponse.json({
				messages: (session.messages ?? [])
					.slice(-MAX_CHAT_HISTORY)
					.map((m: any) => ({
						sender: m.sender,
						content: m.content,
						timestamp: m.timestamp,
					})),
			});
		}

		// Return session stubs sorted newest-first
		const stubs = chatSessions
			.map((s: any) => ({
				id: s.id,
				title: s.title ?? 'New conversation',
				createdAt: s.createdAt,
				preview: s.messages?.[0]?.content?.slice(0, 80) ?? '',
			}))
			.sort(
				(a: any, b: any) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);

		return NextResponse.json({ sessions: stubs });
	} catch (err) {
		console.error('GET /api/chat:', err);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat
//   Body: { prompt: string; sessionId?: string }
//   Creates a new session if sessionId is omitted.
//   Streams SSE back. Sends a special title event after first message.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
	if (OPENROUTER_KEYS.length === 0) {
		return NextResponse.json(
			{ error: 'No OpenRouter API keys configured' },
			{ status: 500 },
		);
	}

	try {
		const body = await req.json();
		const { prompt, sessionId: incomingSessionId } = body;
		if (!prompt?.trim()) {
			return NextResponse.json(
				{ error: 'Prompt is required' },
				{ status: 400 },
			);
		}

		const user = await authenticateRequest(req);
		if (!user)
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const models = await getTenantModels();
		const userRecord = await models.User.findById(user.id).lean();
		if (!userRecord)
			return NextResponse.json({ error: 'User not found' }, { status: 404 });

		const chatSessions: any[] = Array.isArray((userRecord as any).chatSessions)
			? (userRecord as any).chatSessions
			: [];

		// Resolve or create session
		const isNewSession = !incomingSessionId;
		const sessionId =
			incomingSessionId ??
			`session_${Date.now()}_${Math.random().toString(36).slice(2)}`;

		let sessionMessages: any[] = [];
		if (!isNewSession) {
			const existing = chatSessions.find((s: any) => s.id === sessionId);
			sessionMessages = existing?.messages ?? [];
		}

		const contextBlock = await buildContext(userRecord, models);

		const historyMessages = sessionMessages
			.slice(-MAX_CHAT_HISTORY)
			.map((m: any) => ({
				role: m.sender === 'assistant' ? 'assistant' : 'user',
				content: m.content,
			}));

		const openRouterMessages = [
			{ role: 'system', content: contextBlock },
			...historyMessages,
			{ role: 'user', content: prompt },
		];

		const upstreamRes = await callOpenRouter(openRouterMessages, true);

		if (!upstreamRes.ok) {
			const errBody = await upstreamRes.json().catch(() => ({}));
			console.error('OpenRouter error (all keys exhausted):', errBody);
			if (upstreamRes.status === 429) {
				return NextResponse.json(
					{
						error:
							'The assistant is currently busy. Please try again in a moment.',
					},
					{ status: 429 },
				);
			}
			return NextResponse.json(
				{ error: 'AI service error' },
				{ status: upstreamRes.status },
			);
		}

		// ── Stream back to client ─────────────────────────────────────────────
		const encoder = new TextEncoder();
		let fullText = '';
		const isFirstMessage = sessionMessages.length === 0;
		const titlePromise = isFirstMessage ? generateTitle(prompt) : null;

		const stream = new ReadableStream({
			async start(controller) {
				const reader = upstreamRes.body?.getReader();
				const decoder = new TextDecoder();
				if (!reader) {
					controller.close();
					return;
				}

				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						for (const line of decoder
							.decode(value, { stream: true })
							.split('\n')) {
							if (!line.startsWith('data: ')) continue;
							const data = line.slice(6).trim();
							if (data === '[DONE]') continue;
							try {
								const parsed = JSON.parse(data);
								const delta = parsed?.choices?.[0]?.delta?.content;
								if (typeof delta === 'string') {
									fullText += delta;
									controller.enqueue(encoder.encode(`data: ${data}\n\n`));
								}
							} catch {
								/* malformed chunk */
							}
						}
					}
				} finally {
					// ── Persist to DB ─────────────────────────────────────────────
					if (fullText) {
						const now = new Date();
						const newMsgs = [
							{ sender: 'user', content: prompt, timestamp: now },
							{ sender: 'assistant', content: fullText, timestamp: now },
						];

						if (isNewSession) {
							// Create new session document
							await models.User.findByIdAndUpdate(user.id, {
								$push: {
									chatSessions: {
										id: sessionId,
										title: 'New conversation',
										createdAt: now,
										messages: newMsgs,
									},
								},
							});
						} else {
							// Append to existing session, capping history
							await models.User.findOneAndUpdate(
								{ _id: user.id, 'chatSessions.id': sessionId },
								{
									$push: {
										'chatSessions.$.messages': {
											$each: newMsgs,
											$slice: -MAX_CHAT_HISTORY,
										},
									},
								},
							);
						}

						if (titlePromise) {
							const title =
								(await withTimeout(titlePromise, 2500)) ?? 'New conversation';
							await models.User.findOneAndUpdate(
								{ _id: user.id, 'chatSessions.id': sessionId },
								{ $set: { 'chatSessions.$.title': title } },
							);
							controller.enqueue(
								encoder.encode(
									`data: ${JSON.stringify({ __title: title, sessionId })}\n\n`,
								),
							);
						}
					}

					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
				}
			},
		});

		const headers: Record<string, string> = {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		};
		if (isNewSession) headers['X-Session-Id'] = sessionId;

		return new Response(stream, { headers });
	} catch (err) {
		console.error('POST /api/chat:', err);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/chat?sessionId=xxx
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
	try {
		const user = await authenticateRequest(req);
		if (!user)
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const sessionId = req.nextUrl.searchParams.get('sessionId');
		if (!sessionId) {
			return NextResponse.json(
				{ error: 'sessionId is required' },
				{ status: 400 },
			);
		}

		const models = await getTenantModels();
		await models.User.findByIdAndUpdate(user.id, {
			$pull: { chatSessions: { id: sessionId } },
		});

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('DELETE /api/chat:', err);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/chat  — rename a session
//   Body: { sessionId: string; title: string }
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
	try {
		const user = await authenticateRequest(req);
		if (!user)
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const { sessionId, title } = await req.json();
		if (!sessionId || !title?.trim()) {
			return NextResponse.json(
				{ error: 'sessionId and title are required' },
				{ status: 400 },
			);
		}

		const models = await getTenantModels();
		await models.User.findOneAndUpdate(
			{ _id: user.id, 'chatSessions.id': sessionId },
			{ $set: { 'chatSessions.$.title': title.trim() } },
		);

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('PATCH /api/chat:', err);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
