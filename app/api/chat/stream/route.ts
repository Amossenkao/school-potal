import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/proxy';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import type { AIChatMessage } from '@/types';
import {
	MAX_CHAT_HISTORY,
	MAX_EVENTS,
	MAX_SCHEDULES,
	buildPrompt,
	buildUserContext,
	getAcademicYear,
	getClassMetaById,
	getTeacherClassIds,
	getTeacherSubjectNames,
} from '../utils';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash-lite';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(req: NextRequest) {
	if (!API_KEY) {
		return new Response('GEMINI_API_KEY environment variable not set', {
			status: 500,
		});
	}

	const { searchParams } = new URL(req.url);
	const prompt = searchParams.get('prompt');
	if (!prompt) {
		return new Response('Prompt is required', { status: 400 });
	}

	try {
		const user = await authenticateRequest(req);
		if (!user) {
			return new Response('Unauthorized', { status: 401 });
		}

		const models = await getTenantModels();
		const userRecord = await models.User.findById(user.id).lean();
		if (!userRecord) {
			return new Response('User not found', { status: 404 });
		}

		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const academicYear = getAcademicYear(schoolProfile);

		let recentGrades: any[] = [];
		let classSchedules: any[] = [];
		let testSchedules: any[] = [];
		let calendarEvents: any[] = [];

		calendarEvents = await models.SchoolEvent.find({
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

		const chatHistory = Array.isArray(userRecord.chats)
			? userRecord.chats.slice(-MAX_CHAT_HISTORY)
			: [];
		const contextBlock = buildUserContext(
			userRecord,
			schoolProfile,
			recentGrades,
			calendarEvents,
			classSchedules,
			testSchedules,
		);

		const finalPrompt = buildPrompt(contextBlock, chatHistory, prompt);
		const payload = {
			contents: [{ parts: [{ text: finalPrompt }] }],
		};

		const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			return new Response('Failed to fetch response from Gemini API.', {
				status: response.status,
			});
		}

		const data = await response.json();
		const text =
			data.candidates?.[0]?.content?.parts?.[0]?.text ||
			'Sorry, I could not generate a response.';

		const now = new Date();
		const newMessages: AIChatMessage[] = [
			{ sender: 'user', content: prompt, timestamp: now },
			{ sender: 'assistant', content: text, timestamp: now },
		];
		await models.User.findByIdAndUpdate(user.id, {
			$push: {
				chats: {
					$each: newMessages,
					$slice: -MAX_CHAT_HISTORY,
				},
			},
		});

		const encoder = new TextEncoder();
		const words = text.split(/(\s+)/);
		const stream = new ReadableStream({
			start(controller) {
				(async () => {
					for (const word of words) {
						if (!word) continue;
						const payload = JSON.stringify({ delta: word });
						controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
						await sleep(20);
					}
					controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
					controller.close();
				})().catch((error) => {
					console.error('Streaming error:', error);
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify({ error: true })}\n\n`),
					);
					controller.close();
				});
			},
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
			},
		});
	} catch (error) {
		console.error('Error in chat stream:', error);
		return new Response('An internal server error occurred.', { status: 500 });
	}
}
