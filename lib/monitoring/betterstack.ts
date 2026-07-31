import type { LogSummary, RecentLog, UptimeSummary } from './types';

const BETTERSTACK_API_BASE = 'https://uptime.betterstack.com/api/v2';

function hasBetterStackConfig() {
	return Boolean(process.env.BETTERSTACK_TOKEN);
}

async function betterStackFetch<T>(path: string): Promise<T | null> {
	if (!hasBetterStackConfig()) return null;

	const response = await fetch(`${BETTERSTACK_API_BASE}${path}`, {
		headers: {
			Authorization: `Bearer ${process.env.BETTERSTACK_TOKEN}`,
			'Content-Type': 'application/json',
		},
		next: { revalidate: 60 },
	});

	if (!response.ok) {
		throw new Error(`Better Stack API request failed with ${response.status}`);
	}

	return response.json() as Promise<T>;
}

export async function getRecentLogs(): Promise<{ summary: LogSummary; entries: RecentLog[] }> {
	const incidents = await getIncidents();
	const entries = incidents.map((incident) => ({
		id: incident.id,
		timestamp: incident.createdAt,
		level: incident.severity === 'critical' ? 'error' as const : 'warning' as const,
		message: incident.message,
		module: incident.module,
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
