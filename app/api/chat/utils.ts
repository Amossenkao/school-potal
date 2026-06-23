import type { AIChatMessage } from '@/types';

export const MAX_CHAT_HISTORY = 20;
export const MAX_EVENTS = 5;
export const MAX_SCHEDULES = 10;

export const getAcademicYear = (schoolProfile: any) => {
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

export const formatChatHistory = (history: AIChatMessage[]) =>
	history
		.map(
			(msg) =>
				`${msg.sender === 'assistant' ? 'Assistant' : 'User'}: ${msg.content}`,
		)
		.join('\n');

export const getTeacherSubjectNames = (subjects: any[]) => {
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

export const getTeacherClassIds = (subjects: any[]) => {
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

export const getClassMetaById = (classLevels: any, classId: string) => {
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

export const buildUserContext = (
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
					.map(
						(grade) =>
							`${grade.subject}: ${grade.grade} (${grade.period || grade.academicYear})`,
					)
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

export const buildPrompt = (
	contextBlock: string,
	history: AIChatMessage[],
	prompt: string,
) => `
You are a friendly and encouraging AI study assistant.
Please provide clear and concise answers to help the user understand the topic better.
Guidelines:
- Use simple language and avoid jargon.
- Be direct and get straight to the point.
- Avoid filler, greetings, and unnecessary wrap-up.
- Only add context if it improves the answer.
- Be positive and supportive in your tone.
- Respect privacy and avoid sharing sensitive details.

${contextBlock}

Conversation so far:
${formatChatHistory(history)}

User question: "${prompt}"
`;
