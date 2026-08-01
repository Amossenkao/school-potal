import { getRecentLogs, getUptimeStatus } from './betterstack';
import { getR2StorageUsage } from './cloudflare';
import { getLatestTenantDatabaseUsage } from './collectors/mongodbCollector';
import { getHealthSummary } from './health';
import { getMongoClusterMetrics } from './mongodb';
import { getErrorSummary } from './sentry';
import type {
	DeploymentSummary,
	ErrorSummary,
	HealthSummary,
	LogSummary,
	MonitoringStatus,
	MonitoringSummary,
	StorageSummary,
	UptimeSummary,
} from './types';
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

const EMPTY_ERROR_SUMMARY: ErrorSummary = {
	total: 0,
	critical: 0,
	last24Hours: 0,
	affectedSchools: [],
};

const EMPTY_LOG_SUMMARY: LogSummary = { errors: 0, warnings: 0 };

const EMPTY_STORAGE_SUMMARY: StorageSummary = {
	usedBytes: 0,
	used: '0 B',
	objects: 0,
	requests: 0,
	status: 'warning',
};

const EMPTY_UPTIME_SUMMARY: UptimeSummary = { percentage: 0, status: 'warning' };

const EMPTY_DEPLOYMENT_SUMMARY: DeploymentSummary = {
	status: 'unconfigured',
	buildFailures: 0,
	history: [],
};

async function safe<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
	try {
		return await loader();
	} catch {
		return fallback;
	}
}

export async function getMonitoringSummary(): Promise<MonitoringSummary> {
	const [errors, logs, storage, uptime, deployment, health, cluster, tenants] = await Promise.all([
		safe(
			() => getErrorSummary(),
			EMPTY_ERROR_SUMMARY,
		),
		safe(
			() => getRecentLogs().then((result) => result.summary),
			EMPTY_LOG_SUMMARY,
		),
		safe(() => getR2StorageUsage(), EMPTY_STORAGE_SUMMARY),
		safe(() => getUptimeStatus(), EMPTY_UPTIME_SUMMARY),
		safe(() => getLatestDeploymentStatus(), EMPTY_DEPLOYMENT_SUMMARY),
		safe(() => getHealthSummary(), {
			application: 'healthy',
			database: 'warning',
			storage: 'warning',
			monitoring: 'unconfigured',
			providers: [],
		} satisfies HealthSummary),
		safe(() => getMongoClusterMetrics(), {
			clusterName: 'unavailable',
			storageUsedBytes: 0,
			storageLimitBytes: 0,
			storageUsed: '0 B',
			storageLimit: '0 B',
			connections: 0,
			operationsPerSecond: 0,
			status: 'warning',
			message: 'MongoDB Atlas unavailable',
			measuredAt: new Date().toISOString(),
		}),
		safe(() => getLatestTenantDatabaseUsage(), []),
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
