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
	| 'teacher_attendance'
	| 'monitoring'

export type RealtimeSource = 'system' | 'admin' | 'teacher' | 'student';

export type RealtimeScope = {
	classIds?: string[];
	roles?: string[];
	userIds?: string[];
};

export type RealtimeEvent = {
	type: string;
	tenantId: string;
	payload: Record<string, unknown>;
	timestamp: string;
	source: RealtimeSource;
	seq?: number;
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
		options.schoolProfile?.system?.dbName,
		options.schoolProfile?.system?.host,
		options.tenantId,
		options.host,
	];
	for (const candidate of candidates) {
		const resolved = normalizeTenantCandidate(candidate);
		if (resolved) return resolved;
	}
	return '';
};

/**
 * The one key Ably channels are named from — derived only from the stored
 * school profile, never from the request host or the session's tenantId.
 *
 * Those two carry the *host* (`proxy.ts` compares `session.tenantId` against
 * the request host), while channels are named from `system.dbName`. Wherever a
 * host slipped into a channel name the subscriber asked for `school:<host>`
 * while its token only granted `school:<dbName>`, and Ably answered 40160
 * "Channel denied". The hosts and dbNames only ever coincide by convention
 * (`dbName = host with . and - replaced by _`), and that convention is not
 * enforced — `ucaliberia.vercel.app` is stored as `uca`.
 *
 * Returns '' when the profile cannot supply a key. Callers must treat that as
 * "cannot do realtime yet" and stop, rather than substituting a host: a token
 * minted for the wrong key is worse than no token, because it fails only at
 * subscribe time and looks like an intermittent network fault.
 */
export const resolveCanonicalTenantKey = (options: { schoolProfile?: any }) => {
	const candidates = [
		options.schoolProfile?.system?.dbName,
		options.schoolProfile?.system?.host,
	];
	for (const candidate of candidates) {
		const resolved = normalizeTenantCandidate(candidate);
		if (resolved) return resolved;
	}
	return '';
};

export const PLATFORM_EVENTS_CHANNEL = 'platform:events';

export const getSuperadminRealtimeChannel = (superadminId: string) =>
	`superadmin:${sanitizeChannelSegment(superadminId)}`;

export const getSchoolRealtimeChannel = (tenantId: string) =>
	`school:${sanitizeChannelSegment(tenantId)}`;

export const getClassRealtimeChannel = (tenantId: string, classId: string) =>
	`class:${sanitizeChannelSegment(tenantId)}:${sanitizeChannelSegment(classId)}`;

export const getUserRealtimeChannel = (tenantId: string, userId: string) =>
	`user:${sanitizeChannelSegment(tenantId)}:${sanitizeChannelSegment(userId)}`;

const extractClassIdsFromYearEntries = (
	entries: unknown,
	sponsorClass?: unknown,
) => {
	const yearEntries = Array.isArray(entries) ? entries : [];
	const classIds = yearEntries.flatMap((entry: any) =>
		Array.isArray(entry?.classes)
			? entry.classes.map((c: any) => String(c?.classId || ''))
			: [],
	);
	return toUniqueStrings([...classIds, trim(sponsorClass)]);
};

const extractTeacherClassIds = (user: AuthorizedRealtimeUser) =>
	extractClassIdsFromYearEntries(user.subjects, user.sponsorClass);

// isTeacher administrators store their class/subject assignment in `classes`
// (same shape as a teacher's `subjects`) — see utils/gradeActor.ts.
const extractIsTeacherAdminClassIds = (user: AuthorizedRealtimeUser) =>
	extractClassIdsFromYearEntries(user.classes);

const extractStudentClassIds = (user: AuthorizedRealtimeUser) => {
	const academicYears = Array.isArray(user.academicYears)
		? user.academicYears
		: [];
	const academicYearClassIds = academicYears.map((entry: any) =>
		String(entry?.classId || ''),
	);
	return toUniqueStrings([String(user.classId || ''), ...academicYearClassIds]);
};

const extractParentChildClassIds = (user: AuthorizedRealtimeUser) => {
	const children = Array.isArray(user.parentChildren)
		? user.parentChildren
		: [];
	const childClassIds = children.map((child: any) =>
		String(child?.classId || ''),
	);
	const fallbackClassId = user.parentChildren?.length
		? ''
		: String(user.classId || '');
	return toUniqueStrings([...childClassIds, fallbackClassId]);
};

const extractParentChildUserIds = (user: AuthorizedRealtimeUser) => {
	const children = Array.isArray(user.parentChildren)
		? user.parentChildren
		: [];
	return toUniqueStrings(
		children.map((child: any) => String(child?.id || '')),
	);
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
	channels.add(PLATFORM_EVENTS_CHANNEL);

	if (options.publicOnly) return Array.from(channels);

	const role = trim(options.role || options.user?.role).toLowerCase();
	const userId = trim(options.user?.id);

	if (userId) {
		channels.add(getUserRealtimeChannel(tenantId, userId));
	}

	if (
		role === 'administrator' ||
		role === 'system_admin' ||
		role === 'superadmin'
	) {
		// school:tenantId (already added) receives all broadcast events.
		// user:tenantId:ownId (already added) receives targeted security events.
		// Wildcard channel subscriptions don't work for message delivery in Ably —
		// wildcards are capability-only. Everything admins need arrives on the
		// school channel once resolvePublishChannels fans out correctly.
		if (role === 'administrator' && options.user?.isTeacher) {
			// isTeacher administrators additionally subscribe to the class
			// channels a teacher with the same assignment would, same as
			// resolvePublishChannels' class-scoped fan-out for grades/attendance.
			extractIsTeacherAdminClassIds(options.user || {}).forEach((classId) => {
				channels.add(getClassRealtimeChannel(tenantId, classId));
			});
		}
		return Array.from(channels);
	}

	const classIds =
		role === 'teacher'
			? extractTeacherClassIds(options.user || {})
			: role === 'student'
				? extractStudentClassIds(options.user || {})
				: role === 'parent'
					? extractParentChildClassIds(options.user || {})
					: [];

	classIds.forEach((classId) => {
		channels.add(getClassRealtimeChannel(tenantId, classId));
	});

	if (role === 'parent') {
		extractParentChildUserIds(options.user || {}).forEach((childId) => {
			channels.add(getUserRealtimeChannel(tenantId, childId));
		});
	}

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

	// Super admins get wildcard capability on ALL school channels so their
	// token is valid on any school channel for cross-tenant real-time events.
	if (
		!options.publicOnly &&
		role === 'superadmin'
	) {
		return {
			['school:*']: ['subscribe'],
			['superadmin:*']: ['subscribe'],
			[PLATFORM_EVENTS_CHANNEL]: ['subscribe'],
		};
	}

	// Admins and system admins get wildcard capability grants so their token
	// is valid on any channel. They only subscribe to specific channels
	// (school + own user channel) but the wildcard capability means Ably
	// will accept the token if we ever need to add channels without re-minting.
	if (
		!options.publicOnly &&
		tenantId &&
		(role === 'administrator' ||
			role === 'system_admin')
	) {
		return {
			[`school:${tenantId}`]: ['subscribe'],
			[`class:${tenantId}:*`]: ['subscribe'],
			[`user:${tenantId}:*`]: ['subscribe'],
			[PLATFORM_EVENTS_CHANNEL]: ['subscribe'],
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
	'school-toggled-active': 'SCHOOL_UPDATED',
	'school-updated': 'SCHOOL_UPDATED',
	'school-deleted': 'SCHOOL_DELETED',
	'student-promoted': 'USER_UPDATED',
	'student-demoted': 'USER_UPDATED',
	'teacher-academic-year-added': 'USER_UPDATED',
	'administrator-academic-year-added': 'USER_UPDATED',
	'bulk-user-action': 'USER_UPDATED',
	'student-class-changed': 'USER_UPDATED',
	'teacher-class-reassigned': 'USER_UPDATED',
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
	'teacher-attendance-saved': 'TEACHER_ATTENDANCE_SAVED',
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
		case 'attendance':
			return 'ATTENDANCE_CREATED';
		case 'teacher_attendance':
			return 'TEACHER_ATTENDANCE_SAVED';
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
	seq?: number;
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
		...(typeof params.seq === 'number' ? { seq: params.seq } : {}),
	} satisfies RealtimeEvent;
};

export const resolvePublishChannels = (event: RealtimeEvent) => {
	const tenantId = sanitizeChannelSegment(event.tenantId);
	const payload = event.payload || {};
	const channels = new Set<string>();

	const addSchool = () => {
		if (tenantId) channels.add(getSchoolRealtimeChannel(tenantId));
	};
	const addSuperadminBroadcast = () => {
		// Publish to the superadmin broadcast channel so all superadmin
		// clients receive cross-school events regardless of which school
		// they're currently viewing.
		channels.add('superadmin:broadcast');
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

		// isTeacher administrators store their assignment in `classes` (same
		// shape as a teacher's `subjects`) — see utils/gradeActor.ts.
		const adminClassIds = Array.isArray(payloadUser.classes)
			? payloadUser.classes.flatMap((s: any) =>
					Array.isArray(s?.classes)
						? s.classes
								.map((c: any) => String(c?.classId || '').trim())
								.filter(Boolean)
						: [],
				)
			: [];
		if (adminClassIds.length > 0) addClassIds(adminClassIds);
	};

	switch (event.type) {
		case 'ANNOUNCEMENT_CREATED':
		case 'EVENT_CREATED':
		case 'EVENT_UPDATED':
		case 'EVENT_DELETED':
			// School-wide broadcast — school channel is sufficient.
			addSchool();
			break;

		case 'SCHOOL_UPDATED':
		case 'SCHOOL_DELETED':
			// School-level change — broadcast to the school channel,
			// the superadmin broadcast channel, and the platform events
			// channel so all subscribed schools receive the event.
			addSchool();
			addSuperadminBroadcast();
			channels.add(PLATFORM_EVENTS_CHANNEL);
			break;

		case 'USER_CREATED':
		case 'USER_UPDATED':
		case 'USER_DISABLED':
		case 'ATTENDANCE_CREATED':
		case 'ATTENDANCE_UPDATED':
		case 'TEACHER_ATTENDANCE_SAVED':
			// Publish to:
			// 1. school channel — reaches admins and system_admins
			// 2. the affected user's own channel — reaches that user directly
			// 3. the affected user's class channels — reaches teachers and classmates
			//    who have access to this user but don't subscribe to their user channel
			// 4. superadmin broadcast — reaches all superadmin sessions
			addSchool();
			addSuperadminBroadcast();
			addUserIds(
				targetUserIds ||
					(payload.userId ? [String(payload.userId)] : undefined),
			);
			addClassIds(classIds);
			addPayloadUserClassChannels();
			// Class transition: publish to old class channels so former
			// teachers and classmates receive the event and lose access.
			const oldClassIds = payload.oldClassIds as string[] | undefined;
			if (oldClassIds?.length) addClassIds(oldClassIds);
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

		case 'APPLICATION_LOG_CREATED':
		case 'APPLICATION_WARNING_CREATED':
		case 'SYSTEM_ALERT_CREATED':
		case 'MONITORING_UPDATED':
			// Observability events reach the superadmin broadcast channel and
			// the platform events channel. Tenant-scoped events also reach the
			// school channel so tenant admins can subscribe later.
			if (tenantId && tenantId !== 'platform') {
				addSchool();
			}
			addSuperadminBroadcast();
			channels.add(PLATFORM_EVENTS_CHANNEL);
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
