import { publishRealtimeEventSafe } from '@/lib/ablyServer';
import type { LogContext } from '@/lib/logger';

import type { MonitoringSummary, SystemAlertRecord } from './types';

const PLATFORM_TENANT_ID = 'platform';

export type MonitoringLogLevel = 'info' | 'warning' | 'error' | 'critical';

export function publishMonitoringLogEvent(input: {
	level: MonitoringLogLevel;
	message: string;
	eventId?: string;
	context?: LogContext;
	metadata?: Record<string, unknown>;
	source?: string;
}) {
	const { level, message, eventId, context = {}, metadata = {}, source = 'application' } = input;

	if (level === 'info') return;

	const type =
		level === 'warning' ? 'APPLICATION_WARNING_CREATED' : 'APPLICATION_LOG_CREATED';

	void publishRealtimeEventSafe({
		tenantId: String(context.tenantId || PLATFORM_TENANT_ID),
		type,
		domain: 'monitoring',
		source: 'system',
		reason: context.operation,
		payload: {
			id: eventId,
			level,
			message,
			source,
			timestamp: new Date().toISOString(),
			requestId: context.requestId,
			tenantId: context.tenantId,
			schoolId: context.schoolId,
			schoolName: context.schoolName,
			schoolSlug: context.schoolSlug,
			module: context.module,
			operation: context.operation,
			path: context.path,
			method: context.method,
			statusCode: context.statusCode,
			errorCode: context.errorCode,
			userId: context.userId,
			role: context.role,
			errorName: metadata.errorName,
			stackPreview: metadata.stackPreview,
		},
	});
}

export function publishSystemAlertCreated(alert: SystemAlertRecord) {
	void publishRealtimeEventSafe({
		tenantId: String(alert.schoolId || alert.schoolName || PLATFORM_TENANT_ID),
		type: 'SYSTEM_ALERT_CREATED',
		domain: 'monitoring',
		source: 'system',
		payload: {
			id: String(alert.createdAt.getTime()),
			type: alert.type,
			severity: alert.severity,
			message: alert.message,
			module: alert.module,
			schoolId: alert.schoolId,
			schoolName: alert.schoolName,
			createdAt: alert.createdAt.toISOString(),
			resolved: alert.resolved,
		},
	});
}

export function publishMonitoringUpdate(summary: MonitoringSummary) {
	void publishRealtimeEventSafe({
		tenantId: PLATFORM_TENANT_ID,
		type: 'MONITORING_UPDATED',
		domain: 'monitoring',
		source: 'system',
		payload: {
			generatedAt: summary.generatedAt,
			systemStatus: summary.systemStatus,
			errors: summary.errors,
			logs: summary.logs,
			uptime: summary.uptime,
		},
	});
}
