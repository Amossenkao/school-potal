import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/proxy';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import type { AIChatMessage } from '@/types';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash-lite';

const MAX_CHAT_HISTORY = 20;
const MAX_EVENTS = 5;
const MAX_SCHEDULES = 10;

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

const formatChatHistory = (history: AIChatMessage[]) =>
	history
		.map(
			(msg) =>
				`${msg.sender === 'assistant' ? 'Assistant' : 'User'}: ${msg.content}`,
		)
		.join('\n');

const getTeacherSubjectNames = (subjects: any[]) => {
	if (!Array.isArray(subjects)) return [];
	const names = new Set<string>();
	subjects.forEach((subjectEntry: any) => {
		if (Array.isArray(subjectEntry?.classes)) {
			subjectEntry.classes.forEach((klass: any) => {
				if (Array.isArray(klass?.subjects)) {
					klass.subjects.forEach((subject: any) => {
						if (typeof subject === 'string') {
							names.add(subject);
						} else if (subject?.name) {
							names.add(subject.name);
						}
					});
				}
			});
		}
	});
	return Array.from(names);
};

const getTeacherClassIds = (subjects: any[]) => {
	if (!Array.isArray(subjects)) return [];
	const ids = new Set<string>();
	subjects.forEach((subjectEntry: any) => {
		if (Array.isArray(subjectEntry?.classes)) {
			subjectEntry.classes.forEach((klass: any) => {
				if (klass?.classId) ids.add(klass.classId);
			});
		}
	});
	return Array.from(ids);
};

const getClassMetaById = (classLevels: any, classId: string) => {
	if (!classLevels || !classId) return null;
	for (const [sessionName, session] of Object.entries(classLevels)) {
		for (const [levelName, levelData] of Object.entries(session as any)) {
			const classes = (levelData as any).classes || [];
			const found = classes.find((klass: any) => klass.classId === classId);
			if (found) {
				return {
					session: sessionName,
					level: levelName,
					classId: found.classId,
					className: found.name,
				};
			}
		}
	}
	return null;
};

const formatScheduleItems = (items: any[]) =>
	items
		.map((item) => {
			const time =
				item.startTime && item.endTime
					? `${item.startTime}-${item.endTime}`
					: item.startDate
						? new Date(item.startDate).toLocaleDateString()
						: 'Time TBD';
			const label = item.subject || item.title || 'Scheduled item';
			const day = item.dayOfWeek || '';
			return `${label} (${time}${day ? `, ${day}` : ''})`;
		})
		.join('; ');

const formatEvents = (items: any[]) =>
	items
		.map((event) => {
			const start = event.startDate
				? new Date(event.startDate).toLocaleDateString()
				: 'Date TBD';
			return `${event.title} (${start})`;
		})
		.join('; ');

const buildUserContext = (
	userRecord: any,
	schoolProfile: any,
	recentGrades: any[],
	events: any[],
	classSchedules: any[],
	testSchedules: any[],
) => {
	const name = `${userRecord.firstName || ''} ${userRecord.lastName || ''}`.trim();
	const baseDetails = [
		`Name: ${name || 'Unknown'}`,
		`Role: ${userRecord.role || 'Unknown'}`,
		`Gender: ${userRecord.gender || 'Unknown'}`,
		`Date of Birth: ${userRecord.dateOfBirth || 'Unknown'}`,
		`Address: ${userRecord.address || 'Unknown'}`,
	];

	if (userRecord.role === 'student') {
		baseDetails.push(
			`Class: ${userRecord.className || 'Unknown'}`,
			`Class ID: ${userRecord.classId || 'Unknown'}`,
		);
	}
	if (userRecord.role === 'teacher') {
		const subjects = getTeacherSubjectNames(userRecord.subjects).join(', ');
		baseDetails.push(`Subjects: ${subjects || 'Unknown'}`);
	}

	const schoolDetails = [
		`School: ${schoolProfile?.name || schoolProfile?.shortName || 'Unknown'}`,
		`Academic Year: ${schoolProfile?.currentAcademicYear || 'Unknown'}`,
	];

	const gradeDetails =
		recentGrades.length > 0
			? recentGrades
					.map((grade) => `${grade.subject}: ${grade.grade} (${grade.period || grade.academicYear})`)
					.join('; ')
			: 'No recent grades available.';

	const calendarDetails =
		events.length > 0 ? formatEvents(events) : 'No upcoming events found.';
	const classScheduleDetails =
		classSchedules.length > 0
			? formatScheduleItems(classSchedules)
			: 'No class schedules found.';
	const testScheduleDetails =
		testSchedules.length > 0
			? formatScheduleItems(testSchedules)
			: 'No test schedules found.';

	return `User Profile:\n${baseDetails.join('\n')}\n\nSchool Info:\n${schoolDetails.join(
		'\n',
	)}\n\nRecent Grades:\n${gradeDetails}\n\nUpcoming Events:\n${calendarDetails}\n\nClass Schedules:\n${classScheduleDetails}\n\nTest Schedules:\n${testScheduleDetails}`;
};

export async function GET(req: NextRequest) {
	try {
		const user = await authenticateRequest(req);
		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const models = await getTenantModels();
		const userRecord = await models.User.findById(user.id)
			.select('chats')
			.lean();

		const chats = Array.isArray(userRecord?.chats)
			? userRecord.chats.slice(-MAX_CHAT_HISTORY)
			: [];

		return NextResponse.json({
			messages: chats.map((msg: any) => ({
				sender: msg.sender,
				content: msg.content,
				timestamp: msg.timestamp,
			})),
		});
	} catch (error) {
		console.error('Error fetching chat history:', error);
		return NextResponse.json(
			{ error: 'An internal server error occurred.' },
			{ status: 500 }
		);
	}
}

export async function POST(req: NextRequest) {
	if (!API_KEY) {
		return NextResponse.json(
			{ error: 'GEMINI_API_KEY environment variable not set' },
			{ status: 500 }
		);
	}

	try {
		const { prompt } = await req.json();

		if (!prompt) {
			return NextResponse.json(
				{ error: 'Prompt is required' },
				{ status: 400 }
			);
		}

		const user = await authenticateRequest(req);

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const models = await getTenantModels();
		const userRecord = await models.User.findById(user.id).lean();
		if (!userRecord) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
				const orFilters: Record<string, any>[] = [{ classId: userRecord.classId }];
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

		// The Gemini REST API endpoint URL
		const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

		// The request payload, structured for the REST API
		const finalPrompt = `
You are a friendly and encouraging AI study assistant.
Please provide clear and concise answers to help the user understand the topic better.
Guidelines:
- Use simple language and avoid jargon.
- Encourage the user to ask follow-up questions if they need more help.
- Be positive and supportive in your tone.
- Respect privacy and avoid sharing sensitive details.

${contextBlock}

Conversation so far:
${formatChatHistory(chatHistory)}

User question: "${prompt}"
`;

		const payload = {
			contents: [{ parts: [{ text: finalPrompt }] }],
			// Optional: add generationConfig and safetySettings here if needed
		};

		// Make the API call using fetch
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error('Gemini API Error:', errorData);
			return NextResponse.json(
				{ error: 'Failed to fetch response from Gemini API.' },
				{ status: response.status }
			);
		}

		const data = await response.json();

		// Safely extract the text from the response
		const text =
			data.candidates?.[0]?.content?.parts?.[0]?.text ||
			'Sorry, I could not generate a response.';
		console.log('Generated text:', text);

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

		// Send the complete text back to the frontend
		return NextResponse.json({ text });
	} catch (error) {
		console.error('Error in API route:', error);
		return NextResponse.json(
			{ error: 'An internal server error occurred.' },
			{ status: 500 }
		);
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const user = await authenticateRequest(req);
		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const models = await getTenantModels();
		await models.User.findByIdAndUpdate(user.id, { $set: { chats: [] } });

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error clearing chat history:', error);
		return NextResponse.json(
			{ error: 'An internal server error occurred.' },
			{ status: 500 }
		);
	}
}
