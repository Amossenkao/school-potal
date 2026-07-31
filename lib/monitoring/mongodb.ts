import { getTenantConnectionByDbName } from '@/lib/mongoose';
import { getSchoolMeshModels } from '@/models/schoolmesh';

import type {
	MongoClusterMetrics,
	MonitoringStatus,
	TenantDatabaseStats,
} from './types';

const ATLAS_API_BASE = 'https://cloud.mongodb.com/api/atlas/v2';

const EMPTY_CLUSTER_METRICS: MongoClusterMetrics = {
	clusterName: 'unconfigured',
	storageUsedBytes: 0,
	storageLimitBytes: 0,
	storageUsed: '0 B',
	storageLimit: '0 B',
	connections: 0,
	operationsPerSecond: 0,
	status: 'warning',
	message: 'MongoDB Atlas credentials not configured',
	measuredAt: new Date().toISOString(),
};

function hasAtlasConfig() {
	return Boolean(
		process.env.MONGODB_ATLAS_PUBLIC_KEY &&
		process.env.MONGODB_ATLAS_PRIVATE_KEY &&
		process.env.MONGODB_ATLAS_PROJECT_ID,
	);
}

export function formatBytes(bytes: number) {
	if (!bytes) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${(bytes / 1024 ** exponent).toFixed(2)} ${units[exponent]}`;
}

async function atlasFetch<T>(path: string): Promise<T | null> {
	if (!hasAtlasConfig()) return null;

	const response = await fetch(`${ATLAS_API_BASE}${path}`, {
		headers: {
			Authorization: `Basic ${Buffer.from(
				`${process.env.MONGODB_ATLAS_PUBLIC_KEY}:${process.env.MONGODB_ATLAS_PRIVATE_KEY}`,
			).toString('base64')}`,
			'Content-Type': 'application/json',
			Accept: 'application/vnd.atlas.2024-08-05+json',
		},
		next: { revalidate: 300 },
	});

	if (!response.ok) {
		throw new Error(`MongoDB Atlas API request failed with ${response.status}`);
	}

	return response.json() as Promise<T>;
}

function lastPointValue(series: any) {
	const points = Array.isArray(series?.dataPoints) ? series.dataPoints : [];
	const last = points[points.length - 1];
	return Number(last?.value ?? 0);
}

/**
 * Derives a stable, human-readable id for a school profile. Prefers the host
 * slug ("uca" from "ucaliberia.vercel.app"), then initials, then _id.
 */
export function deriveSchoolId(school: any): string {
	if (!school || typeof school !== 'object') return '';
	const host = typeof school.system?.host === 'string' ? school.system.host : '';
	const slug = host.split('.')[0].toLowerCase();
	return (
		slug ||
		(String(school.identity?.initials || '').toLowerCase()) ||
		String(school._id || '')
	);
}

// ============================================================================
// MongoDB Atlas cluster metrics
// ============================================================================

export async function getMongoClusterMetrics(): Promise<MongoClusterMetrics> {
	const projectId = process.env.MONGODB_ATLAS_PROJECT_ID;

	if (!hasAtlasConfig()) {
		return { ...EMPTY_CLUSTER_METRICS, measuredAt: new Date().toISOString() };
	}

	try {
		const clusters = await atlasFetch<any>(`/groups/${projectId}/clusters`);
		const clusterList = Array.isArray(clusters?.results) ? clusters.results : [];
		const cluster = clusterList[0];

		if (!cluster) {
			return {
				...EMPTY_CLUSTER_METRICS,
				clusterName: 'none',
				status: 'warning',
				message: 'No MongoDB Atlas clusters found',
				measuredAt: new Date().toISOString(),
			};
		}

		const clusterName = String(cluster.name || 'none');
		const stateName = String(cluster.stateName || 'IDLE').toUpperCase();
		let storageLimitBytes = Number(cluster.diskSizeGB || 0) * 1024 ** 3;
		let connections = 0;
		let operationsPerSecond = 0;
		let storageUsedBytes = 0;

		const processes = await atlasFetch<any>(`/groups/${projectId}/processes?itemsPerPage=100`);
		const processList = Array.isArray(processes?.results) ? processes.results : [];
		const primary =
			processList.find((process: any) =>
				String(process.typeName || '').includes('PRIMARY'),
			) || processList[0];

		if (primary) {
			const hostPort = `${primary.hostname}:${primary.port}`;
			const measurements = await atlasFetch<any>(
				`/groups/${projectId}/processes/${hostPort}/measurements` +
					'?granularity=PT1M&period=PT1H' +
					'&m=CONNECTIONS&m=OPCOUNTER_CMD&m=OPCOUNTER_QUERY&m=OPCOUNTER_INSERT&m=OPCOUNTER_UPDATE&m=OPCOUNTER_DELETE',
			);

			for (const series of measurements?.measurements ?? []) {
				if (series.name === 'CONNECTIONS') {
					connections = lastPointValue(series);
				} else if (
					['OPCOUNTER_CMD', 'OPCOUNTER_QUERY', 'OPCOUNTER_INSERT', 'OPCOUNTER_UPDATE', 'OPCOUNTER_DELETE'].includes(
						series.name,
					)
				) {
					operationsPerSecond += lastPointValue(series);
				}
			}

			const disks = await atlasFetch<any>(`/groups/${projectId}/processes/${hostPort}/disks`);
			const diskList = Array.isArray(disks?.results) ? disks.results : [];
			const dataDisk =
				diskList.find((disk: any) =>
					String(disk.partitionName || '').toLowerCase().includes('data'),
				) || diskList[0];

			if (dataDisk) {
				const diskName = encodeURIComponent(String(dataDisk.partitionName || dataDisk.id || 'data'));
				const diskMeasurements = await atlasFetch<any>(
					`/groups/${projectId}/processes/${hostPort}/disks/${diskName}/measurements` +
						'?granularity=PT1M&period=PT1H&m=DISK_PARTITION_SPACE_USED&m=DISK_PARTITION_USABLE_SPACE',
				);

				for (const series of diskMeasurements?.measurements ?? []) {
					if (series.name === 'DISK_PARTITION_SPACE_USED') {
						storageUsedBytes = lastPointValue(series);
					} else if (series.name === 'DISK_PARTITION_USABLE_SPACE' && storageLimitBytes === 0) {
						storageLimitBytes = lastPointValue(series);
					}
				}
			}
		}

		const status: MonitoringStatus = stateName === 'IDLE' ? 'healthy' : 'warning';

		return {
			clusterName,
			storageUsedBytes,
			storageLimitBytes,
			storageUsed: formatBytes(storageUsedBytes),
			storageLimit: formatBytes(storageLimitBytes),
			connections,
			operationsPerSecond,
			status,
			message: status === 'healthy' ? undefined : `Cluster state is ${stateName.toLowerCase()}`,
			measuredAt: new Date().toISOString(),
		};
	} catch (error) {
		return {
			...EMPTY_CLUSTER_METRICS,
			clusterName: 'unavailable',
			status: 'warning',
			message: error instanceof Error ? error.message : 'MongoDB Atlas unavailable',
			measuredAt: new Date().toISOString(),
		};
	}
}

// ============================================================================
// Per-tenant database statistics (db.stats())
// ============================================================================

export async function getTenantDatabaseStats(school: any): Promise<TenantDatabaseStats | null> {
	const databaseName = school?.system?.dbName;
	if (!databaseName) return null;

	try {
		const connection = await getTenantConnectionByDbName(databaseName);
		if (!connection?.db) return null;

		const stats = await connection.db.stats();
		const dataSizeBytes = Number(stats.dataSize ?? 0);
		const storageSizeBytes = Number(stats.storageSize ?? 0);
		const indexSizeBytes = Number(stats.indexSize ?? 0);

		return {
			schoolId: deriveSchoolId(school),
			schoolName: school.identity?.name,
			databaseName,
			collections: Number(stats.collections ?? 0),
			documents: Number(stats.objects ?? 0),
			dataSizeBytes,
			storageSizeBytes,
			indexSizeBytes,
			totalSizeBytes: dataSizeBytes + indexSizeBytes,
			collectedAt: new Date(),
		};
	} catch {
		return null;
	}
}

export async function getAllTenantDatabaseStats(
	options: { limit?: number; concurrency?: number } = {},
): Promise<TenantDatabaseStats[]> {
	const { SchoolProfile } = await getSchoolMeshModels();

	const schools = await SchoolProfile.find({ 'system.isActive': true }).lean().exec();
	const targets = options.limit ? schools.slice(0, options.limit) : schools;
	const concurrency = Math.max(1, Math.min(options.concurrency ?? 8, 25));

	const stats: TenantDatabaseStats[] = [];
	let cursor = 0;

	async function worker() {
		while (cursor < targets.length) {
			const index = cursor++;
			const school = targets[index];
			const collected = await getTenantDatabaseStats(school);
			if (collected) stats.push(collected);
		}
	}

	await Promise.all(
		Array.from({ length: Math.min(concurrency, targets.length || 1) }, () => worker()),
	);

	return stats;
}

// ============================================================================
// MongoDB health
// ============================================================================

export async function getMongoHealth() {
	if (hasAtlasConfig()) {
		try {
			await atlasFetch(`/groups/${process.env.MONGODB_ATLAS_PROJECT_ID}`);
			return { status: 'connected' as const };
		} catch (error) {
			return {
				status: 'error' as const,
				message: error instanceof Error ? error.message : 'MongoDB Atlas unavailable',
			};
		}
	}

	try {
		const { connection } = await getSchoolMeshModels();
		return {
			status: connection.readyState === 1 ? ('connected' as const) : ('degraded' as const),
			message: connection.readyState === 1 ? undefined : 'SchoolMesh database connection is not ready',
		};
	} catch (error) {
		return {
			status: 'error' as const,
			message: error instanceof Error ? error.message : 'MongoDB unavailable',
		};
	}
}
