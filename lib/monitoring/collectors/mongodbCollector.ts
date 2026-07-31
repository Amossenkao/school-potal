import { getSchoolMeshModels } from '@/models/schoolmesh';

import {
	deriveSchoolId,
	formatBytes,
	getAllTenantDatabaseStats,
	getMongoClusterMetrics,
} from '../mongodb';
import type { MongoGrowthPoint, MongoTenantUsage, SystemAlertRecord } from '../types';

const COLLECTION_CONCURRENCY = Number(process.env.MONGODB_COLLECTION_CONCURRENCY) || 8;
const COLLECTION_SCHOOL_LIMIT = Number(process.env.MONGODB_COLLECTION_SCHOOL_LIMIT) || 0;

// ============================================================================
// Metrics collection
// ============================================================================

/**
 * Retrieves all school profiles, connects to each tenant database, runs
 * db.stats() and persists a TenantDatabaseMetric per school. Runs through the
 * existing monitoring collection mechanism - never on dashboard renders.
 */
export async function collectTenantDatabaseMetrics(
	options: { limit?: number; concurrency?: number } = {},
) {
	const { TenantDatabaseMetric } = await getSchoolMeshModels();

	const collected = await getAllTenantDatabaseStats({
		limit: options.limit ?? COLLECTION_SCHOOL_LIMIT,
		concurrency: options.concurrency ?? COLLECTION_CONCURRENCY,
	});

	let saved = 0;
	const failures: { schoolId: string; error: string }[] = [];

	for (const stat of collected) {
		try {
			await TenantDatabaseMetric.create({
				schoolId: stat.schoolId,
				databaseName: stat.databaseName,
				collections: stat.collections,
				documents: stat.documents,
				dataSizeBytes: stat.dataSizeBytes,
				storageSizeBytes: stat.storageSizeBytes,
				indexSizeBytes: stat.indexSizeBytes,
				collectedAt: stat.collectedAt,
			});
			saved += 1;
		} catch (error) {
			failures.push({
				schoolId: stat.schoolId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	return { collected: collected.length, saved, failures };
}

// ============================================================================
// Historical database usage
// ============================================================================

async function schoolNameMap() {
	const { SchoolProfile } = await getSchoolMeshModels();
	const profiles = await SchoolProfile.find({})
		.select('system.dbName system.host identity.name identity.initials')
		.lean()
		.exec();
	const map = new Map<string, string>();
	for (const profile of profiles) {
		map.set(deriveSchoolId(profile), profile.identity?.name || '');
	}
	return map;
}

export async function getLatestTenantDatabaseUsage(): Promise<MongoTenantUsage[]> {
	const { TenantDatabaseMetric } = await getSchoolMeshModels();

	const latest = await TenantDatabaseMetric.aggregate([
		{ $sort: { collectedAt: -1 } },
		{ $group: { _id: '$schoolId', doc: { $first: '$$ROOT' } } },
		{ $replaceRoot: { newRoot: '$doc' } },
		{ $sort: { storageSizeBytes: -1 } },
	])
		.limit(500)
		.exec();

	const names = await schoolNameMap();

	return latest.map((doc: any) => {
		const schoolId = String(doc.schoolId || '');
		const storageBytes = Number(doc.storageSizeBytes || 0);
		return {
			schoolId,
			schoolName: names.get(schoolId) || doc.schoolName || undefined,
			databaseName: String(doc.databaseName || ''),
			storage: formatBytes(storageBytes),
			storageBytes,
			dataSizeBytes: Number(doc.dataSizeBytes || 0),
			indexSizeBytes: Number(doc.indexSizeBytes || 0),
			documents: Number(doc.documents || 0),
			collections: Number(doc.collections || 0),
			collectedAt: doc.collectedAt?.toISOString?.() || new Date().toISOString(),
		};
	});
}

export async function getTenantDatabaseGrowthTrend(schoolId?: string): Promise<MongoGrowthPoint[]> {
	const { TenantDatabaseMetric } = await getSchoolMeshModels();

	const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const query: Record<string, unknown> = { collectedAt: { $gte: since } };
	if (schoolId) query.schoolId = schoolId;

	const docs = await TenantDatabaseMetric.find(query)
		.select('schoolId collectedAt storageSizeBytes documents')
		.sort({ collectedAt: 1 })
		.lean()
		.exec();

	return docs.map((doc: any) => ({
		schoolId: doc.schoolId,
		collectedAt: doc.collectedAt?.toISOString?.() || new Date().toISOString(),
		storageBytes: Number(doc.storageSizeBytes || 0),
		documents: Number(doc.documents || 0),
	}));
}

// ============================================================================
// Alerts
// ============================================================================

export async function getFastGrowingDatabases(
	windowMs = 24 * 60 * 60 * 1000,
	threshold = 0.5,
) {
	const { TenantDatabaseMetric } = await getSchoolMeshModels();

	const cutoff = new Date(Date.now() - windowMs);
	const docs = await TenantDatabaseMetric.find({ collectedAt: { $gte: cutoff } })
		.select('schoolId databaseName collectedAt storageSizeBytes')
		.sort({ schoolId: 1, collectedAt: 1 })
		.lean()
		.exec();

	const firstBySchool = new Map<string, any>();
	const lastBySchool = new Map<string, any>();
	for (const doc of docs) {
		const key = String(doc.schoolId || '');
		if (!firstBySchool.has(key)) firstBySchool.set(key, doc);
		lastBySchool.set(key, doc);
	}

	const names = await schoolNameMap();
	const growing: {
		schoolId: string;
		schoolName?: string;
		databaseName: string;
		growthPercent: number;
		fromBytes: number;
		toBytes: number;
	}[] = [];

	for (const [schoolId, first] of firstBySchool) {
		const last = lastBySchool.get(schoolId);
		if (!last || first === last) continue;

		const from = Number(first.storageSizeBytes || 0);
		const to = Number(last.storageSizeBytes || 0);
		if (from <= 0 || to <= from) continue;

		const growth = (to - from) / from;
		if (growth >= threshold) {
			growing.push({
				schoolId,
				schoolName: names.get(schoolId) || undefined,
				databaseName: String(last.databaseName || ''),
				growthPercent: Math.round(growth * 100),
				fromBytes: from,
				toBytes: to,
			});
		}
	}

	return growing.sort((a, b) => b.growthPercent - a.growthPercent).slice(0, 25);
}

export async function buildMongoAlerts(): Promise<SystemAlertRecord[]> {
	const alerts: SystemAlertRecord[] = [];
	const cluster = await getMongoClusterMetrics();

	if (cluster.status !== 'healthy') {
		alerts.push({
			type: 'MONGODB_CONNECTION',
			severity: 'warning',
			message: cluster.message || 'MongoDB connection issues detected',
			module: 'mongodb',
			resolved: false,
			createdAt: new Date(),
		});
	}

	if (cluster.storageLimitBytes > 0) {
		const usage = cluster.storageUsedBytes / cluster.storageLimitBytes;
		if (usage > 0.95) {
			alerts.push({
				type: 'MONGODB_STORAGE',
				severity: 'critical',
				message: `MongoDB cluster storage usage is at ${(usage * 100).toFixed(1)}% (${cluster.storageUsed} of ${cluster.storageLimit}).`,
				module: 'mongodb',
				resolved: false,
				createdAt: new Date(),
			});
		} else if (usage > 0.8) {
			alerts.push({
				type: 'MONGODB_STORAGE',
				severity: 'warning',
				message: `MongoDB cluster storage usage is at ${(usage * 100).toFixed(1)}% (${cluster.storageUsed} of ${cluster.storageLimit}).`,
				module: 'mongodb',
				resolved: false,
				createdAt: new Date(),
			});
		}
	}

	for (const item of await getFastGrowingDatabases()) {
		alerts.push({
			type: 'TENANT_DATABASE_GROWTH',
			severity: 'warning',
			message: `${item.schoolName || item.schoolId} database grew by ${item.growthPercent}% in 24 hours (${formatBytes(item.fromBytes)} to ${formatBytes(item.toBytes)}).`,
			schoolId: item.schoolId,
			schoolName: item.schoolName,
			module: 'mongodb',
			resolved: false,
			createdAt: new Date(),
		});
	}

	return alerts;
}
