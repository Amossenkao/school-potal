import { getSchoolMeshModels } from '@/models/schoolmesh';

import { collectTenantDatabaseMetrics, buildMongoAlerts } from './collectors/mongodbCollector';
import { getMonitoringSummary } from './index';
import type { SystemAlertRecord } from './types';

function buildAlerts(summary: Awaited<ReturnType<typeof getMonitoringSummary>>): SystemAlertRecord[] {
	const alerts: SystemAlertRecord[] = [];

	if (summary.errors.critical > 0) {
		alerts.push({
			type: 'CRITICAL_ERRORS',
			severity: 'critical',
			message: `${summary.errors.critical} critical application errors detected.`,
			resolved: false,
			createdAt: new Date(),
		});
	}

	if (summary.uptime.percentage > 0 && summary.uptime.percentage < 99) {
		alerts.push({
			type: 'LOW_UPTIME',
			severity: summary.uptime.percentage < 95 ? 'critical' : 'warning',
			message: `Platform uptime is ${summary.uptime.percentage}%.`,
			resolved: false,
			createdAt: new Date(),
		});
	}

	if (summary.deployment.buildFailures > 0) {
		alerts.push({
			type: 'BUILD_FAILURES',
			severity: 'warning',
			message: `${summary.deployment.buildFailures} recent deployment build failure(s).`,
			module: 'deployments',
			resolved: false,
			createdAt: new Date(),
		});
	}

	return alerts;
}

export async function collectMonitoringSnapshot() {
	const databaseCollection = await collectTenantDatabaseMetrics().catch((error) => ({
		collected: 0,
		saved: 0,
		failures: [
			{ schoolId: 'unknown', error: error instanceof Error ? error.message : 'MongoDB metric collection failed' },
		],
	}));

	const summary = await getMonitoringSummary();
	const { MonitoringSnapshot, SystemAlert } = await getSchoolMeshModels();

	const snapshot = await MonitoringSnapshot.create({
		timestamp: new Date(summary.generatedAt),
		systemStatus: summary.systemStatus,
		errors: {
			total: summary.errors.total,
			critical: summary.errors.critical,
			last24Hours: summary.errors.last24Hours,
		},
		logs: summary.logs,
		storage: {
			usedBytes: summary.storage.usedBytes,
			objects: summary.storage.objects,
			requests: summary.storage.requests,
		},
		uptime: summary.uptime.percentage,
		deployment: {
			status: summary.deployment.status,
			version: summary.deployment.version,
		},
		database: {
			cluster: summary.database.cluster,
			tenants: summary.database.tenants,
		},
		health: summary.health,
	});

	const mongoAlerts = await buildMongoAlerts().catch(() => []);
	const alerts = [...buildAlerts(summary), ...mongoAlerts];
	if (alerts.length > 0) {
		await SystemAlert.insertMany(alerts, { ordered: false });
	}

	return { snapshot, alerts, summary, databaseCollection };
}
