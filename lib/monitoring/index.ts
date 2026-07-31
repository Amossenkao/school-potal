import { getRecentLogs, getUptimeStatus } from './betterstack';
import { getR2StorageUsage } from './cloudflare';
import { getLatestTenantDatabaseUsage } from './collectors/mongodbCollector';
import { getHealthSummary } from './health';
import { getMongoClusterMetrics } from './mongodb';
import { getErrorSummary } from './sentry';
import type { MonitoringSummary, MonitoringStatus } from './types';
import { getLatestDeploymentStatus } from './vercel';

export * from './betterstack';
export * from './cloudflare';
export * from './health';
export * from './mongodb';
export * from './sentry';
export * from './types';
export * from './vercel';

function resolveSystemStatus(summary: Pick<MonitoringSummary, 'errors' | 'logs' | 'uptime' | 'health' | 'database'>): MonitoringStatus {
	if (
		summary.health.application === 'critical' ||
		summary.errors.critical > 0 ||
		summary.uptime.percentage < 95 ||
		summary.database.cluster.status === 'critical'
	) {
		return 'critical';
	}

	if (
		summary.logs.errors > 0 ||
		summary.errors.last24Hours > 0 ||
		summary.uptime.percentage < 99 ||
		summary.database.cluster.status === 'warning'
	) {
		return 'warning';
	}

	return 'healthy';
}

export async function getMonitoringSummary(): Promise<MonitoringSummary> {
	const [errors, logs, storage, uptime, deployment, health, cluster, tenants] = await Promise.all([
		getErrorSummary(),
		getRecentLogs().then((result) => result.summary),
		getR2StorageUsage(),
		getUptimeStatus(),
		getLatestDeploymentStatus(),
		getHealthSummary(),
		getMongoClusterMetrics(),
		getLatestTenantDatabaseUsage().catch(() => []),
	]);

	const summary = {
		systemStatus: 'healthy' as MonitoringStatus,
		errors,
		logs,
		storage,
		uptime,
		deployment,
		health,
		database: {
			cluster,
			tenants,
			generatedAt: new Date().toISOString(),
		},
		generatedAt: new Date().toISOString(),
	};

	return {
		...summary,
		systemStatus: resolveSystemStatus(summary),
	};
}
