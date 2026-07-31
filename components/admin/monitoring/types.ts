export interface MonitoringDashboardData {
	systemStatus?: 'healthy' | 'warning' | 'critical';
	errors?: {
		total?: number;
		critical?: number;
		last24Hours?: number;
		affectedSchools?: string[];
	};
	logs?: {
		warnings?: number;
		errors?: number;
	};
	storage?: {
		used?: string;
		usedBytes?: number;
		objects?: number;
		requests?: number;
		status?: string;
	};
	uptime?: {
		percentage?: number;
		status?: string;
	};
	deployment?: {
		status?: string;
		version?: string;
		url?: string;
		buildFailures?: number;
	};
	health?: {
		application?: string;
		database?: string;
		storage?: string;
		monitoring?: string;
		providers?: {
			provider: string;
			status: string;
			message?: string;
			checkedAt: string;
		}[];
	};
	database?: {
		cluster?: {
			clusterName?: string;
			storageUsedBytes?: number;
			storageLimitBytes?: number;
			storageUsed?: string;
			storageLimit?: string;
			connections?: number;
			operationsPerSecond?: number;
			status?: string;
			message?: string;
			measuredAt?: string;
		};
		tenants?: {
			schoolId: string;
			schoolName?: string;
			databaseName?: string;
			storage?: string;
			storageBytes?: number;
			dataSizeBytes?: number;
			indexSizeBytes?: number;
			documents?: number;
			collections?: number;
			collectedAt?: string;
		}[];
		generatedAt?: string;
	};
	generatedAt?: string;
	timestamp?: string;
}

export interface MonitoringFilters {
	schoolId: string;
	severity: string;
	module: string;
	requestId: string;
	dateFrom: string;
	dateTo: string;
}
