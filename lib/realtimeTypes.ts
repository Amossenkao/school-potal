import type { User } from '@/types';

export type SyncDomain =
	| 'school'
	| 'users'
	| 'calendar'
	| 'schedules'
	| 'grades'
	| 'gradeRequests'
	| 'user'
	| 'attendance'

export type RealtimeSource = 'system' | 'admin' | 'teacher' | 'student';

export type RealtimeScope = {
	classIds?: string[];
	roles?: string[];
	userIds?: string[];
};

export type RealtimeEvent = {
	type: string;
	tennatId: string;
	payload: Record<string, unknown>;
	timestamp: string;
	source: RealtimeSource;
};

export type AuthorizedRealtimeUser = Pick<User, 'id' | 'role'> &
	Record<string, any>;

const trim = (value: unknown) => String(value || '').trim();

const sanitizeChannelSegment = (value: string) =>
	trim(value).replace(/[^A-Za-z0-9:_\-*.]/g, '_');

const toUniqueStrings = (values?: string[]) => {
	if (!Array.isArray(values)) return [];
	return Array.from(
		new Set(values.map((value) => trim(value)).filter(Boolean)),
	);
};

const normalizeTenantCandidate = (value: unknown) => {
	const raw = trim(value);
	if (!raw) return '';
	return raw;
};

export const resolveTenantSyncKey = (options: {
	schoolProfile?: any;
	tenantId?: string | null;
	host?: string | null;
}) => {
	const candidates = [
		options.schoolProfile?.dbName,
		options.schoolProfile?.host,
		options.tenantId,
		options.host,
	];
	for (const candidate of candidates) {
		const resolved = normalizeTenantCandidate(candidate);
		if (resolved) return resolved;
	}
	return '';
};

export const getSchoolRealtimeChannel = (tenantId: string) =>
	`school:${sanitizeChannelSegment(tenantId)}`;

export const getClassRealtimeChannel = (tenantId: string, classId: string) =>
	`class:${sanitizeChannelSegment(tenantId)}:${sanitizeChannelSegment(classId)}`;

export const getUserRealtimeChannel = (tenantId: string, userId: string) =>
	`user:${sanitizeChannelSegment(tenantId)}:${sanitizeChannelSegment(userId)}`;

const extractTeacherClassIds = (user: AuthorizedRealtimeUser) => {
	const subjects = Array.isArray(user.subjects) ? user.subjects : [];
	const subjectClassIds = subjects.flatMap((subject: any) =>
		Array.isArray(subject?.classes)
			? subject.classes.map((entry: any) => String(entry?.classId || ''))
			: [],
	);
	const sponsorClass = trim(user.sponsorClass);
	return toUniqueStrings([...subjectClassIds, sponsorClass]);
};

const extractStudentClassIds = (user: AuthorizedRealtimeUser) => {
	const academicYears = Array.isArray(user.academicYears)
		? user.academicYears
		: [];
	const academicYearClassIds = academicYears.map((entry: any) =>
		String(entry?.classId || ''),
	);
	return toUniqueStrings([String(user.classId || ''), ...academicYearClassIds]);
};

export const getAuthorizedRealtimeChannels = (options: {
	tenantId: string;
	user?: AuthorizedRealtimeUser | null;
	role?: string | null;
	publicOnly?: boolean;
}) => {
	const tenantId = sanitizeChannelSegment(options.tenantId);
	if (!tenantId) return [] as string[];

	const channels = new Set<string>();
	channels.add(getSchoolRealtimeChannel(tenantId));

	if (options.publicOnly) return Array.from(channels);

	const role = trim(options.role || options.user?.role).toLowerCase();
	const userId = trim(options.user?.id);

	if (userId) {
		channels.add(getUserRealtimeChannel(tenantId, userId));
	}

	if (
		role === 'administrator' ||
		role === 'system_admin' ||
		role === 'super_admin'
	) {
		// school:tenantId (already added) receives all broadcast events.
		// user:tenantId:ownId (already added) receives targeted security events.
		// Wildcard channel subscriptions don't work for message delivery in Ably —
		// wildcards are capability-only. Everything admins need arrives on the
		// school channel once resolvePublishChannels fans out correctly.
		return Array.from(channels);
	}

	const classIds =
		role === 'teacher'
			? extractTeacherClassIds(options.user || {})
			: role === 'student'
				? extractStudentClassIds(options.user || {})
				: [];

	classIds.forEach((classId) => {
		channels.add(getClassRealtimeChannel(tenantId, classId));
	});

	return Array.from(channels);
};

export const getAuthorizedRealtimeCapabilities = (options: {
	tenantId: string;
	user?: AuthorizedRealtimeUser | null;
	role?: string | null;
	publicOnly?: boolean;
}) => {
	const tenantId = sanitizeChannelSegment(options.tenantId);
	const role = trim(options.role || options.user?.role).toLowerCase();

	// Admins and system admins get wildcard capability grants so their token
	// is valid on any channel. They only subscribe to specific channels
	// (school + own user channel) but the wildcard capability means Ably
	// will accept the token if we ever need to add channels without re-minting.
	if (
		!options.publicOnly &&
		tenantId &&
		(role === 'administrator' ||
			role === 'system_admin' ||
			role === 'super_admin')
	) {
		return {
			[`school:${tenantId}`]: ['subscribe'],
			[`class:${tenantId}:*`]: ['subscribe'],
			[`user:${tenantId}:*`]: ['subscribe'],
		};
	}

	const channels = getAuthorizedRealtimeChannels(options);
	return channels.reduce<Record<string, string[]>>((capabilities, channel) => {
		capabilities[channel] = ['subscribe'];
		return capabilities;
	}, {});
};

const LEGACY_REASON_TO_EVENT_TYPE: Record<string, string> = {
	'user-created': 'USER_CREATED',
	'user-updated': 'USER_UPDATED',
	'profile-updated': 'USER_UPDATED',
	'password-changed': 'USER_UPDATED',
	'password-reset': 'USER_UPDATED',
	'user-password-reset': 'USER_UPDATED',
	'account-deactivated': 'USER_DISABLED',
	'password-changed-session-revocation': 'USER_DISABLED',
	'user-deleted': 'USER_DISABLED',
	'student-promoted': 'USER_UPDATED',
	'student-demoted': 'USER_UPDATED',
	'teacher-academic-year-added': 'USER_UPDATED',
	'administrator-academic-year-added': 'USER_UPDATED',
	'bulk-user-action': 'USER_UPDATED',
	'user-notification': 'USER_UPDATED',
	'notifications-markasread': 'USER_UPDATED',
	'notifications-markallasread': 'USER_UPDATED',
	'notifications-dismiss': 'USER_UPDATED',
	'notifications-delete': 'USER_UPDATED',
	'calendar-created': 'EVENT_CREATED',
	'calendar-updated': 'EVENT_UPDATED',
	'calendar-deleted': 'EVENT_DELETED',
	'schedule-created': 'CLASS_UPDATED',
	'schedule-updated': 'CLASS_UPDATED',
	'schedule-deleted': 'CLASS_UPDATED',
	'grade-requests-created': 'GRADE_CHANGE_REQUESTED',
	'grade-change-request-notification': 'GRADE_CHANGE_REQUESTED',
	'grade-request-status-notification': 'GRADE_CHANGE_REQUESTED',
	'grade-request-updated': 'GRADE_CHANGE_REQUESTED',
	'grade-request-withdrawn': 'GRADE_CHANGE_REQUESTED',
	'grades-submitted': 'GRADE_CREATED',
	'grades-updated': 'GRADE_UPDATED',
	'grades-updated-directly': 'GRADE_UPDATED',
	'grades-approved-via-request': 'GRADE_UPDATED',
	'grades-status-updated': 'GRADE_UPDATED',
	'grade-submission-notification': 'GRADE_UPDATED',
	'grade-status-notification': 'GRADE_UPDATED',
	'school-settings-updated': 'ANNOUNCEMENT_CREATED',
	update: 'USER_UPDATED',
};

export const resolveRealtimeEventType = (params: {
	domain?: SyncDomain;
	reason?: string;
	eventType?: string;
}) => {
	if (params.eventType) return params.eventType;
	const reason = trim(params.reason).toLowerCase();
	if (reason && LEGACY_REASON_TO_EVENT_TYPE[reason]) {
		return LEGACY_REASON_TO_EVENT_TYPE[reason];
	}
	const domain = trim(params.domain);
	switch (domain) {
		case 'calendar':
			return 'EVENT_UPDATED';
		case 'schedules':
			return 'CLASS_UPDATED';
		case 'grades':
			return 'GRADE_UPDATED';
		case 'gradeRequests':
			return 'GRADE_CHANGE_REQUESTED';
		case 'school':
			return 'ANNOUNCEMENT_CREATED';
		case 'user':
		case 'users':
			return 'USER_UPDATED';
		default:
			return 'ANNOUNCEMENT_CREATED';
	}
};

export const resolveRealtimeSource = (source?: string): RealtimeSource => {
	const normalized = trim(source).toLowerCase();
	if (
		normalized === 'admin' ||
		normalized === 'teacher' ||
		normalized === 'student'
	) {
		return normalized;
	}
	return 'system';
};

export const buildRealtimeEvent = (params: {
	type?: string;
	domain?: SyncDomain;
	tenantId: string;
	payload?: Record<string, unknown>;
	source?: string;
	reason?: string;
	academicYear?: string | null;
	actorId?: string | null;
	scope?: RealtimeScope;
	targetUserIds?: string[];
}) => {
	const timestamp = new Date().toISOString();
	const payload: Record<string, unknown> = {
		...(params.payload || {}),
	};
	if (trim(params.reason)) payload.reason = trim(params.reason);
	if (trim(params.academicYear))
		payload.academicYear = trim(params.academicYear);
	if (trim(params.actorId)) payload.actorId = trim(params.actorId);
	if (params.scope) payload.scope = params.scope;
	const uniqueTargets = toUniqueStrings(params.targetUserIds);
	if (uniqueTargets.length > 0) payload.targetUserIds = uniqueTargets;
	return {
		type: trim(params.type) || resolveRealtimeEventType(params),
		tenantId: trim(params.tenantId),
		payload,
		timestamp,
		source: resolveRealtimeSource(params.source),
	} satisfies RealtimeEvent;
};

export const resolvePublishChannels = (event: RealtimeEvent) => {
	const tenantId = sanitizeChannelSegment(event.tenantId);
	const payload = event.payload || {};
	const channels = new Set<string>();

	const addSchool = () => {
		if (tenantId) channels.add(getSchoolRealtimeChannel(tenantId));
	};
	const addClassIds = (classIds?: string[]) => {
		toUniqueStrings(classIds).forEach((classId) => {
			if (tenantId && classId) {
				channels.add(getClassRealtimeChannel(tenantId, classId));
			}
		});
	};
	const addUserIds = (userIds?: string[]) => {
		toUniqueStrings(userIds).forEach((userId) => {
			if (tenantId && userId) {
				channels.add(getUserRealtimeChannel(tenantId, userId));
			}
		});
	};

	// Extract common routing fields from payload
	const scope = payload.scope as RealtimeScope | undefined;
	const targetUserIds = payload.targetUserIds as string[] | undefined;
	const actorId = String(payload.actorId || '').trim();

	const classIds =
		(scope?.classIds as string[] | undefined) ||
		(payload.classIds as string[] | undefined) ||
		(payload.classId ? [String(payload.classId)] : undefined) ||
		(payload.classIdToUpdate ? [String(payload.classIdToUpdate)] : undefined);

	// Extract class channels the affected user belongs to so that peers
	// (teachers, classmates, admins) who share those classes receive the event.
	// This is the key fan-out that makes profile updates visible to everyone
	// who has access to that user, not just the user themselves.
	const addPayloadUserClassChannels = () => {
		const payloadUser = payload.user as Record<string, any> | undefined;
		if (!payloadUser) return;

		const directClassId = String(payloadUser.classId || '').trim();
		if (directClassId) addClassIds([directClassId]);

		const yearClassIds = Array.isArray(payloadUser.academicYears)
			? payloadUser.academicYears
					.map((ay: any) => String(ay?.classId || '').trim())
					.filter(Boolean)
			: [];
		if (yearClassIds.length > 0) addClassIds(yearClassIds);

		const subjectClassIds = Array.isArray(payloadUser.subjects)
			? payloadUser.subjects.flatMap((s: any) =>
					Array.isArray(s?.classes)
						? s.classes
								.map((c: any) => String(c?.classId || '').trim())
								.filter(Boolean)
						: [],
				)
			: [];
		if (subjectClassIds.length > 0) addClassIds(subjectClassIds);
	};

	switch (event.type) {
		case 'ANNOUNCEMENT_CREATED':
		case 'EVENT_CREATED':
		case 'EVENT_UPDATED':
		case 'EVENT_DELETED':
			// School-wide broadcast — school channel is sufficient.
			addSchool();
			break;

		case 'USER_CREATED':
		case 'USER_UPDATED':
		case 'USER_DISABLED':
			// Publish to:
			// 1. school channel — reaches admins and system_admins
			// 2. the affected user's own channel — reaches that user directly
			// 3. the affected user's class channels — reaches teachers and classmates
			//    who have access to this user but don't subscribe to their user channel
			addSchool();
			addUserIds(
				targetUserIds ||
					(payload.userId ? [String(payload.userId)] : undefined),
			);
			addClassIds(classIds);
			addPayloadUserClassChannels();
			break;

		case 'STUDENT_ADDED':
		case 'STUDENT_REMOVED':
		case 'CLASS_UPDATED':
			addSchool();
			addClassIds(classIds);
			break;

		case 'GRADE_CREATED':
		case 'GRADE_UPDATED':
		case 'GRADE_CHANGE_REQUESTED':
			// Publish to:
			// 1. school channel — reaches admins and system_admins
			// 2. class channels — reaches the teacher and students in that class
			// 3. targeted user channels — reaches the specific student or teacher
			// 4. actor channel — acknowledges the submission back to the submitter
			addSchool();
			addClassIds(classIds);
			addUserIds(
				targetUserIds ||
					(payload.userId ? [String(payload.userId)] : undefined),
			);
			if (actorId) addUserIds([actorId]);
			break;

		default:
			addSchool();
			addClassIds(classIds);
			addUserIds(
				targetUserIds ||
					(payload.userId ? [String(payload.userId)] : undefined),
			);
			break;
	}

	if (channels.size === 0) {
		addSchool();
	}

	return Array.from(channels);
};
