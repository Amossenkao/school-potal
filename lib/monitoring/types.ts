export type MonitoringStatus = 'healthy' | 'warning' | 'critical';

export type ProviderConnectionStatus = 'connected' | 'degraded' | 'unconfigured' | 'error';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface MonitoringProviderState {
	provider: 'sentry' | 'betterstack' | 'cloudflare' | 'vercel' | 'mongodb';
	status: ProviderConnectionStatus;
	message?: string;
	checkedAt: string;
}

export interface ErrorSummary {
	total: number;
	critical: number;
	last24Hours: number;
	affectedSchools: string[];
}

export interface RecentError {
	id: string;
	title: string;
	level: AlertSeverity;
	status: string;
	count: number;
	lastSeen: string;
	schoolId?: string;
	schoolName?: string;
	module?: string;
}

export interface LogSummary {
	errors: number;
	warnings: number;
}

export interface RecentLog {
	id: string;
	timestamp: string;
	level: 'info' | 'warning' | 'error';
	message: string;
	requestId?: string;
	schoolId?: string;
	schoolName?: string;
	tenantId?: string;
	module?: string;
	operation?: string;
	path?: string;
	method?: string;
	statusCode?: number;
	errorName?: string;
	errorCode?: string;
	stackPreview?: string;
	source?: string;
}

export interface UptimeSummary {
	percentage: number;
	status: MonitoringStatus;
}

export interface StorageSummary {
	usedBytes: number;
	used: string;
	objects: number;
	requests: number;
	status: MonitoringStatus;
}

export interface DeploymentSummary {
	status: string;
	version?: string;
	url?: string;
	createdAt?: string;
	buildFailures: number;
	history: DeploymentHistoryItem[];
}

export interface DeploymentHistoryItem {
	id: string;
	status: string;
	url?: string;
	createdAt?: string;
}

export interface HealthSummary {
	application: MonitoringStatus;
	database: MonitoringStatus;
	storage: MonitoringStatus;
	monitoring: ProviderConnectionStatus;
	providers: MonitoringProviderState[];
}

export interface MonitoringSummary {
	systemStatus: MonitoringStatus;
	errors: ErrorSummary;
	logs: LogSummary;
	storage: StorageSummary;
	uptime: UptimeSummary;
	deployment: DeploymentSummary;
	health: HealthSummary;
	generatedAt: string;
}

export interface MonitoringFilters {
	schoolId?: string;
	dateFrom?: string;
	dateTo?: string;
	severity?: AlertSeverity;
	module?: string;
}

export interface SystemAlertRecord {
	type: string;
	severity: AlertSeverity;
	message: string;
	schoolId?: string;
	schoolName?: string;
	module?: string;
	resolved: boolean;
	createdAt: Date;
	resolvedAt?: Date;
}
