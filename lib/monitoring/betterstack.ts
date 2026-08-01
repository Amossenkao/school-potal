import type { IncidentDetail, LogSummary, RecentLog, UptimeSummary } from './types';

const BETTERSTACK_API_BASE = 'https://uptime.betterstack.com/api/v2';

function hasBetterStackConfig() {
	return Boolean(process.env.BETTERSTACK_TOKEN);
}

async function betterStackFetch<T>(path: string, options?: { cache?: RequestCache }): Promise<T | null> {
	if (!hasBetterStackConfig()) return null;

	const fetchOptions: RequestInit = {
		headers: {
			Authorization: `Bearer ${process.env.BETTERSTACK_TOKEN}`,
			'Content-Type': 'application/json',
		},
		next: { revalidate: 60 },
	};

	if (options?.cache) {
		fetchOptions.cache = options.cache;
		delete fetchOptions.next;
	}

	const response = await fetch(`${BETTERSTACK_API_BASE}${path}`, fetchOptions);

	const jsonResponse = await response.json();
	
	if (!response.ok) {
		throw new Error(`Better Stack API request failed with ${response.status}`);
	}

	return jsonResponse as Promise<T>;
}

export async function getRecentLogs(): Promise<{ summary: LogSummary; entries: RecentLog[] }> {
	const incidents = await getIncidents();
	const entries = incidents.map((incident) => ({
		id: incident.id,
		timestamp: incident.createdAt,
		level: incident.severity === 'critical' ? 'error' as const : 'warning' as const,
		message: incident.message,
		module: incident.module,
		source: 'betterstack' as const,
	}));

	return {
		summary: {
			errors: entries.filter((entry) => entry.level === 'error').length,
			warnings: entries.filter((entry) => entry.level === 'warning').length,
		},
		entries,
	};
}

export async function getIncidents() {
	const payload = await betterStackFetch<any>('/incidents?per_page=25');
	const data = Array.isArray(payload?.data) ? payload.data : [];

	return data.map((incident: any) => ({
		id: String(incident.id),
		message: String(incident.attributes?.name || incident.attributes?.summary || 'Incident'),
		severity: incident.attributes?.severity === 'critical' ? 'critical' : 'warning',
		status: String(incident.attributes?.status || 'open'),
		createdAt: String(incident.attributes?.created_at || new Date().toISOString()),
		module: incident.attributes?.monitor_name,
	}));
}

export async function getIncidentDetail(incidentId: string): Promise<IncidentDetail | null> {
	if (!hasBetterStackConfig()) return null;

	const payload = await betterStackFetch<any>(
		`/incidents/${encodeURIComponent(incidentId)}`,
		{ cache: 'no-store' },
	);
	const incident = payload?.data;
	if (!incident) return null;

	const attributes = incident.attributes || {};
	const updates = Array.isArray(incident.incident_updates)
		? incident.incident_updates.map((update: any) => ({
				id: update?.id ? String(update.id) : undefined,
				status: update?.attributes?.status,
				message: update?.attributes?.message,
				createdAt: update?.attributes?.created_at,
			}))
		: [];

	return {
		id: String(incident.id),
		message: String(attributes.name || attributes.summary || 'Incident'),
		severity: attributes.severity === 'critical' ? 'critical' : 'warning',
		status: String(attributes.status || 'open'),
		monitorName: attributes.monitor_name,
		createdAt: String(attributes.created_at || new Date().toISOString()),
		resolvedAt: attributes.resolved_at ? String(attributes.resolved_at) : undefined,
		externalUrl: 'https://uptime.betterstack.com/incidents',
		updates,
	};
}

export async function getUptimeStatus(): Promise<UptimeSummary> {
	const payload = await betterStackFetch<any>('/monitors?per_page=100');
	const monitors = Array.isArray(payload?.data) ? payload.data : [];

	if (monitors.length === 0) {
		return {
			percentage: hasBetterStackConfig() ? 100 : 0,
			status: hasBetterStackConfig() ? 'healthy' : 'warning',
		};
	}

	const upMonitors = monitors.filter((monitor: any) =>
		['up', 'validating'].includes(String(monitor.attributes?.status || '').toLowerCase()),
	);
	const percentage = Number(((upMonitors.length / monitors.length) * 100).toFixed(2));

	return {
		percentage,
		status: percentage >= 99 ? 'healthy' : percentage >= 95 ? 'warning' : 'critical',
	};
}
