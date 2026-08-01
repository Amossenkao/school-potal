import type { ErrorSummary, RecentError, RecentLog } from './types';

const SENTRY_API_BASE = 'https://sentry.io/api/0';

function hasSentryConfig() {
	return Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);
}

async function sentryFetch<T>(path: string): Promise<T | null> {
	if (!hasSentryConfig()) return null;

	const response = await fetch(`${SENTRY_API_BASE}${path}`, {
		headers: {
			Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
			'Content-Type': 'application/json',
		},
		next: { revalidate: 60 },
	});

	if (!response.ok) {
		throw new Error(`Sentry API request failed with ${response.status}`);
	}

	return response.json() as Promise<T>;
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

	return issues.slice(0, 25).map((issue) => ({
		id: String(issue.id || issue.shortId || crypto.randomUUID()),
		title: String(issue.title || issue.culprit || 'Application error'),
		level: String(issue.level || '').toLowerCase() === 'fatal' ? 'critical' : 'warning',
		status: String(issue.status || 'unresolved'),
		count: Number(issue.count || 1),
		lastSeen: String(issue.lastSeen || new Date().toISOString()),
		schoolId: issue.metadata?.tenantId,
		schoolName: issue.metadata?.schoolName,
		module: issue.metadata?.type || issue.culprit,
	}));
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
