import type {
	BreadcrumbDetail,
	ErrorSummary,
	ExceptionDetail,
	LogEventDetail,
	RecentError,
	RecentLog,
	RequestDetail,
	SentryIssueDetail,
	StackTraceFrame,
} from './types';

const SENTRY_API_BASE = 'https://sentry.io/api/0';

function hasSentryConfig() {
	return Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);
}

async function sentryFetch<T>(path: string, options?: { cache?: RequestCache }): Promise<T | null> {
	if (!hasSentryConfig()) return null;

	const fetchOptions: RequestInit = {
		headers: {
			Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
			'Content-Type': 'application/json',
		},
		next: { revalidate: 60 },
	};

	if (options?.cache) {
		fetchOptions.cache = options.cache;
		delete fetchOptions.next;
	}

	const response = await fetch(`${SENTRY_API_BASE}${path}`, fetchOptions);

	if (!response.ok) {
		throw new Error(`Sentry API request failed with ${response.status}`);
	}

	return response.json() as Promise<T>;
}

function sentryIssueUrl(...segments: Array<string | number>) {
	return `https://sentry.io/organizations/${process.env.SENTRY_ORG}/${segments.join('/')}/`;
}

function normalizeEventFrames(stacktrace?: any): StackTraceFrame[] {
	return (Array.isArray(stacktrace?.frames) ? stacktrace.frames : []).map((frame: any) => ({
		filename: frame?.filename,
		absPath: frame?.absPath,
		module: frame?.module,
		function: frame?.function,
		lineNo: frame?.lineNo,
		colNo: frame?.colNo,
		contextLine: frame?.contextLine,
		preContext: Array.isArray(frame?.preContext) ? frame.preContext : undefined,
		postContext: Array.isArray(frame?.postContext) ? frame.postContext : undefined,
		inApp: frame?.inApp,
		vars: frame?.vars,
	}));
}

function extractExceptions(event: any): ExceptionDetail[] {
	const entries = Array.isArray(event?.entries) ? event.entries : [];
	const exceptionEntry = entries.find((entry: any) => entry?.type === 'exception');
	const values = Array.isArray(exceptionEntry?.data?.values)
		? exceptionEntry.data.values
		: [];
	return values.map((value: any) => ({
		type: String(value?.type || 'Error'),
		value: value?.value,
		mechanism: value?.mechanism?.type,
		frames: normalizeEventFrames(value?.stacktrace),
	}));
}

function extractBreadcrumbs(event: any): BreadcrumbDetail[] {
	const entries = Array.isArray(event?.entries) ? event.entries : [];
	const breadcrumbEntry = entries.find((entry: any) => entry?.type === 'breadcrumbs');
	const values = Array.isArray(breadcrumbEntry?.data?.values)
		? breadcrumbEntry.data.values
		: [];
	return values.slice(0, 50).map((crumb: any) => ({
		timestamp: crumb?.timestamp,
		type: crumb?.type,
		level: crumb?.level,
		category: crumb?.category,
		message: crumb?.message,
		data: crumb?.data,
	}));
}

function extractRequest(event: any): RequestDetail | undefined {
	const entries = Array.isArray(event?.entries) ? event.entries : [];
	const requestEntry = entries.find((entry: any) => entry?.type === 'request');
	const data = requestEntry?.data;
	if (!data) return undefined;

	let path: string | undefined = data.path;
	if (!path && typeof data.url === 'string') {
		try {
			path = new URL(data.url).pathname;
		} catch {}
	}

	const rawQuery = data.query_string;
	let query: string[] | undefined;
	if (Array.isArray(rawQuery)) {
		query = rawQuery.map((pair: any) =>
			Array.isArray(pair) ? pair.map(String).join('=') : String(pair),
		);
	} else if (typeof rawQuery === 'string' && rawQuery.length > 0) {
		query = [rawQuery];
	}

	return {
		method: data.method,
		url: data.url,
		path,
		query,
		data: data.data,
		headers: data.headers,
		cookies: data.cookies,
		env: data.env,
	};
}

function extractTags(event: any): { key: string; value: string }[] | undefined {
	const tags = event?.tags;
	if (Array.isArray(tags)) {
		return tags
			.map((tag: any) => ({
				key: String(tag?.[0] ?? ''),
				value: String(tag?.[1] ?? ''),
			}))
			.filter((tag) => tag.key);
	}
	if (tags && typeof tags === 'object') {
		return Object.entries(tags).flatMap(([key, values]) =>
			Array.isArray(values) ? values.map((value) => ({ key, value: String(value) })) : [{ key, value: String(values) }],
		);
	}
	return undefined;
}

function normalizeEventDetail(event: any): LogEventDetail {
	const org = process.env.SENTRY_ORG;
	const groupId = event?.groupID || event?.group_id || event?.issue?.id;
	const eventId = String(event?.eventID || event?.id || crypto.randomUUID());
	const timestamp = String(event?.dateCreated || event?.timestamp || new Date().toISOString());

	return {
		id: eventId,
		timestamp,
		level: eventLevel(event?.level),
		title: String(event?.title || event?.message || 'Application event'),
		message: event?.message,
		platform: event?.platform,
		sdk: event?.sdk?.name ? `${event.sdk.name}@${event.sdk.version || ''}` : undefined,
		groupID: groupId ? String(groupId) : undefined,
		externalUrl: groupId && org ? sentryIssueUrl('issues', groupId, 'events', eventId) : undefined,
		exceptions: extractExceptions(event),
		breadcrumbs: extractBreadcrumbs(event),
		request: extractRequest(event),
		contexts: event?.contexts,
		tags: extractTags(event),
	};
}

function issueQuery(sinceHours = 24) {
	const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
	return encodeURIComponent(`firstSeen:>${since}`);
}

function eventLevel(level?: string): RecentLog['level'] {
	const value = String(level || '').toLowerCase();
	if (value === 'fatal' || value === 'error') return 'error';
	if (value === 'warning' || value === 'warn') return 'warning';
	return 'info';
}

function eventTag(event: any, key: string): string | undefined {
	const tags = Array.isArray(event?.tags) ? event.tags : [];
	const found = tags.find((tag: any) => tag?.[0] === key);
	const value = found?.[1];
	return value === undefined ? undefined : String(value);
}

export async function getSentryIssues() {
	const org = process.env.SENTRY_ORG;
	const project = process.env.SENTRY_PROJECT;
	return sentryFetch<any[]>(
		`/projects/${org}/${project}/issues/?query=${issueQuery()}&limit=50&sort=freq`,
	);
}

export async function getRecentApplicationLogs(limit = 100): Promise<RecentLog[]> {
	const org = process.env.SENTRY_ORG;
	const project = process.env.SENTRY_PROJECT;
	const events = await sentryFetch<any[]>(
		`/projects/${org}/${project}/events/?limit=${limit}&full=true`,
	);

	return (events ?? [])
		.filter((event) => String(event?.type || '') !== 'transaction')
		.slice(0, limit)
		.map((event) => ({
			id: String(event.eventID || event.id || crypto.randomUUID()),
			timestamp: String(event.dateCreated || event.timestamp || new Date().toISOString()),
			level: eventLevel(event.level),
			message: String(event.title || event.message || 'Application log'),
			requestId: eventTag(event, 'requestId'),
			tenantId: eventTag(event, 'tenantId') || eventTag(event, 'schoolSlug'),
			schoolId: eventTag(event, 'schoolId'),
			schoolName: event?.metadata?.schoolName,
			module: eventTag(event, 'module') || event?.metadata?.module,
			operation: eventTag(event, 'operation') || event?.metadata?.operation,
			path: event?.metadata?.path,
			method: event?.metadata?.method,
			statusCode: event?.metadata?.statusCode
				? Number(event.metadata.statusCode)
				: undefined,
			errorName: event?.metadata?.errorName || event?.metadata?.type,
			errorCode: eventTag(event, 'errorCode') || event?.metadata?.errorCode,
			stackPreview: event?.metadata?.stackPreview,
			source: 'sentry',
		}));
}

export async function getErrorSummary(): Promise<ErrorSummary> {
	const issues = (await getSentryIssues()) ?? [];
	const criticalIssues = issues.filter((issue) =>
		['fatal', 'error'].includes(String(issue.level || '').toLowerCase()),
	);

	return {
		total: issues.reduce((sum, issue) => sum + Number(issue.count || 1), 0),
		critical: criticalIssues.length,
		last24Hours: issues.length,
		affectedSchools: Array.from(
			new Set(
				issues
					.map((issue) => issue.metadata?.tenantId || issue.tags?.tenantId?.[0] || issue.tags?.schoolSlug?.[0])
					.filter(Boolean),
			),
		),
	};
}

export async function getRecentErrors(): Promise<RecentError[]> {
	const issues = (await getSentryIssues()) ?? [];

	return issues.slice(0, 25).map((issue) => {
		const level = String(issue.level || '').toLowerCase();
		return {
			id: String(issue.id || issue.shortId || crypto.randomUUID()),
			title: String(issue.title || issue.culprit || 'Application error'),
			level:
				level === 'fatal' || level === 'error'
					? 'critical'
					: level === 'warning' || level === 'warn'
						? 'warning'
						: 'info',
			status: String(issue.status || 'unresolved'),
			count: Number(issue.count || 1),
			lastSeen: String(issue.lastSeen || new Date().toISOString()),
			schoolId: issue.metadata?.tenantId,
			schoolName: issue.metadata?.schoolName,
			module: issue.metadata?.type || issue.culprit,
		};
	});
}

export async function getReleaseHealth() {
	if (!hasSentryConfig()) return { status: 'unconfigured', releases: [] };

	const org = process.env.SENTRY_ORG;
	const project = process.env.SENTRY_PROJECT;
	const releases = await sentryFetch<any[]>(`/projects/${org}/${project}/releases/?limit=10`);

	return {
		status: 'connected',
		releases: (releases ?? []).map((release) => ({
			version: String(release.version || ''),
			dateCreated: release.dateCreated,
			lastEvent: release.lastEvent,
		})),
	};
}

export async function getSentryEventDetail(eventId: string): Promise<LogEventDetail | null> {
	const org = process.env.SENTRY_ORG;
	const project = process.env.SENTRY_PROJECT;
	if (!org || !project || !hasSentryConfig()) return null;

	const event = await sentryFetch<any>(
		`/projects/${org}/${project}/events/${encodeURIComponent(eventId)}/`,
		{ cache: 'no-store' },
	);
	if (!event) return null;

	return normalizeEventDetail(event);
}

export async function getSentryIssueDetail(issueId: string): Promise<SentryIssueDetail | null> {
	const org = process.env.SENTRY_ORG;
	const project = process.env.SENTRY_PROJECT;
	if (!org || !project || !hasSentryConfig()) return null;

	const [issue, events] = await Promise.all([
		sentryFetch<any>(
			`/projects/${org}/${project}/issues/${encodeURIComponent(issueId)}/`,
			{ cache: 'no-store' },
		),
		sentryFetch<any[]>(
			`/projects/${org}/${project}/issues/${encodeURIComponent(issueId)}/events/?limit=1&full=true`,
			{ cache: 'no-store' },
		),
	]);
	if (!issue) return null;

	const latestEvent = Array.isArray(events) && events.length > 0 ? events[0] : undefined;

	return {
		issue: {
			id: String(issue.id),
			title: String(issue.title || issue.metadata?.title || 'Sentry issue'),
			level: String(issue.level || 'warning'),
			status: String(issue.status || 'unresolved'),
			count: Number(issue.count || 0),
			culprit: issue.culprit,
			firstSeen: issue.firstSeen,
			lastSeen: issue.lastSeen,
			schoolId: issue.metadata?.tenantId,
			schoolName: issue.metadata?.schoolName,
			module: issue.metadata?.type,
			externalUrl: org ? sentryIssueUrl('issues', issue.id) : undefined,
		},
		detail: latestEvent ? normalizeEventDetail(latestEvent) : undefined,
	};
}
