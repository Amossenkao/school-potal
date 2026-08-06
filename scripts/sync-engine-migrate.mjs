#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

// ── Sync-engine domains → tenant collections ─────────────────────────────
// Each entry maps a ChangeLog domain to the tenant collection that backs it.
// `yearField` is the field holding the academic year on that document.
const SYNC_DOMAINS = [
	{ domain: 'grades', collection: 'grades', yearField: 'academicYear' },
	{ domain: 'attendance', collection: 'attendances', yearField: 'academicYear' },
	{
		domain: 'teacher_attendance',
		collection: 'teacherattendances',
		yearField: 'academicYear',
	},
	{
		domain: 'calendar',
		collection: 'schoolevents',
		yearField: 'academicYear',
	},
	{
		domain: 'schedules',
		collection: 'schoolevents',
		yearField: 'academicYear',
	},
	{
		domain: 'gradeRequests',
		collection: 'gradechangerequests',
		yearField: 'academicYear',
	},
	{ domain: 'payments', collection: 'payments', yearField: 'paymentAcademicYear' },
];

// Users are year-keyed via academicYears[]/subjects[].year; a single doc can
// belong to multiple years so it gets a global seq and syncsequences are only
// seeded from existing changelogs, never from doc counts.
const USER_DOMAIN = { domain: 'users', collection: 'users', yearField: null };

const EVENT_DOMAIN_BY_TYPE = (eventType) => {
	const type = String(eventType || '');
	if (/schedule/i.test(type)) return 'schedules';
	return 'calendar';
};

const CHANGELOG_INDEXES = [
	{ key: { domain: 1, academicYear: 1, seq: 1 }, options: { unique: true } },
	{ key: { domain: 1, academicYear: 1, createdAt: -1 } },
	{
		key: { domain: 1, academicYear: 1, idempotencyKey: 1 },
		options: {
			unique: true,
			partialFilterExpression: { idempotencyKey: { $type: 'string' } },
		},
	},
];

const SYNCSEQUENCE_INDEXES = [
	{ key: { domain: 1, academicYear: 1 }, options: { unique: true } },
];

function printUsage() {
	console.log(`
Usage:
  node scripts/sync-engine-migrate.mjs [options]

Options:
  --db <dbName>        Migrate only a specific tenant DB (repeatable)
  --dry-run            Print planned operations without applying
  --help               Show this help

Default behavior:
  If no --db is provided, script discovers tenant DB names from tenants.profiles.
`);
}

function parseArgs(argv) {
	const args = argv.slice(2);
	const dbNames = [];
	let dryRun = false;
	let help = false;

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (arg === '--help' || arg === '-h') {
			help = true;
			continue;
		}
		if (arg === '--dry-run') {
			dryRun = true;
			continue;
		}
		if (arg === '--db') {
			const value = args[i + 1];
			if (!value || value.startsWith('--')) {
				throw new Error('--db requires a value');
			}
			dbNames.push(value);
			i += 1;
			continue;
		}
		if (arg.startsWith('--db=')) {
			dbNames.push(arg.slice('--db='.length));
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}

	return { dbNames, dryRun, help };
}

function uniqueNonEmpty(values) {
	return Array.from(
		new Set(
			values
				.map((value) => String(value || '').trim())
				.filter((value) => value.length > 0),
		),
	);
}

function loadEnvFiles() {
	const files = ['.env.local', '.env'];
	for (const file of files) {
		const fullPath = path.join(process.cwd(), file);
		if (!fs.existsSync(fullPath)) continue;
		const raw = fs.readFileSync(fullPath, 'utf8');
		const lines = raw.split(/\r?\n/g);
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const idx = trimmed.indexOf('=');
			if (idx <= 0) continue;
			const key = trimmed.slice(0, idx).trim();
			if (!key || process.env[key] != null) continue;
			let value = trimmed.slice(idx + 1).trim();
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			process.env[key] = value;
		}
	}
}

function resolveMongoUri() {
	loadEnvFiles();
	return process.env.MONGODB_URI || '';
}

async function discoverTenantDbNames(mongoUri) {
	const conn = mongoose.createConnection(mongoUri, {
		dbName: 'tenants',
		maxPoolSize: 4,
		minPoolSize: 0,
		serverSelectionTimeoutMS: 5000,
	});
	try {
		await conn.asPromise();
		const rows = await conn.db
			.collection('profiles')
			.find({}, { projection: { dbName: 1, _id: 0 } })
			.toArray();
		return uniqueNonEmpty(rows.map((row) => row.dbName));
	} finally {
		await conn.close();
	}
}

const BATCH_SIZE = 500;

// Sort order the backfill relies on. The index is created up front so the
// sorted find is served by the index instead of a blocking in-memory sort,
// which blows past MongoDB's 32MB sort limit on big collections (and
// `allowDiskUse` on `find` is only honored by servers >= 4.4).
const BACKFILL_SORT = { createdAt: 1, _id: 1 };

// Creates the `{ createdAt, _id }` index the backfill scan sorts by. Index
// creation is idempotent, so running the migration again is a no-op here.
async function ensureBackfillIndexes(db, dryRun) {
	for (const entry of SYNC_DOMAINS) {
		const collection = db.collection(entry.collection);
		const hasCollection = await collection
			.find({}, { projection: { _id: 1 } })
			.limit(1)
			.hasNext();
		if (!hasCollection) continue;
		if (dryRun) {
			console.log(
				`[dry-run] [index] ${entry.collection} ${JSON.stringify(BACKFILL_SORT)}`,
			);
			continue;
		}
		await collection.createIndex(BACKFILL_SORT);
		console.log(`[index] ${entry.collection} ${JSON.stringify(BACKFILL_SORT)}`);
	}

	const users = db.collection('users');
	const hasUsers = await users
		.find({}, { projection: { _id: 1 } })
		.limit(1)
		.hasNext();
	if (hasUsers) {
		if (dryRun) {
			console.log(`[dry-run] [index] users ${JSON.stringify(BACKFILL_SORT)}`);
			return;
		}
		await users.createIndex(BACKFILL_SORT);
		console.log(`[index] users ${JSON.stringify(BACKFILL_SORT)}`);
	}
}

// Backfills `seq` (per (domain, academicYear) bucket, ordered by createdAt)
// and `deletedAt` on the 7 sync-capable collections. Returns the per-bucket
// seq count map keyed as `${domain}:${academicYear}`.
async function backfillSeqAndDeletedAt(db, dryRun) {
	const counts = new Map();
	const counters = new Map();

	for (const entry of SYNC_DOMAINS) {
		const collection = db.collection(entry.collection);
		const hasCollection = await collection
			.find({}, { projection: { _id: 1 } })
			.limit(1)
			.hasNext();
		if (!hasCollection) continue;

		// Resume from any seq a previous (partial) run already stamped, so a
		// re-run keeps counting up instead of re-issuing seq values the next
		// appendChange could collide with.
		const existingSeq = await collection
			.aggregate(
				[
					{ $match: { seq: { $exists: true } } },
					{
						$group: {
							_id: {
								year: `$${entry.yearField}`,
								eventType:
									entry.collection === 'schoolevents' ? '$eventType' : entry.domain,
							},
							maxSeq: { $max: '$seq' },
						},
					},
				],
				{ allowDiskUse: true },
			)
			.toArray();
		for (const row of existingSeq) {
			const year = String(row._id?.year || '').trim();
			if (!year) continue;
			const domain =
				entry.collection === 'schoolevents'
					? EVENT_DOMAIN_BY_TYPE(row._id?.eventType)
					: entry.domain;
			const bucketKey = `${domain}:${year}`;
			counters.set(
				bucketKey,
				Math.max(counters.get(bucketKey) || 0, row.maxSeq || 0),
			);
		}

		const cursor = collection
			.find({ seq: { $exists: false } })
			.sort(BACKFILL_SORT)
			.hint(BACKFILL_SORT)
			.allowDiskUse(true);

		let ops = [];
		let bucketCounts = 0;
		while (await cursor.hasNext()) {
			const doc = await cursor.next();
			const year = String(doc?.[entry.yearField] || '').trim();
			if (!year) continue;
			const domain =
				entry.collection === 'schoolevents'
					? EVENT_DOMAIN_BY_TYPE(doc?.eventType)
					: entry.domain;
			const bucketKey = `${domain}:${year}`;
			const nextSeq = (counters.get(bucketKey) || 0) + 1;
			counters.set(bucketKey, nextSeq);

			if (!dryRun) {
				ops.push({
					updateOne: {
						filter: { _id: doc._id },
						update: {
							$set: {
								seq: nextSeq,
								deletedAt: doc.deletedAt ?? null,
							},
						},
					},
				});
			}
			bucketCounts += 1;
			if (ops.length >= BATCH_SIZE) {
				await collection.bulkWrite(ops);
				ops = [];
			}
		}
		if (ops.length > 0) await collection.bulkWrite(ops);
		counts.set(entry.domain, (counts.get(entry.domain) || 0) + bucketCounts);

		if (!dryRun) {
			await collection.updateMany(
				{ deletedAt: { $exists: false } },
				{ $set: { deletedAt: null } },
			);
		}
		console.log(
			`${dryRun ? '[dry-run] ' : ''}[backfill] ${entry.collection}: ${bucketCounts} doc(s)`,
		);
	}

	// Users: global seq per doc, no per-bucket counts.
	const users = db.collection('users');
	const hasUsers = await users
		.find({}, { projection: { _id: 1 } })
		.limit(1)
		.hasNext();
	if (hasUsers) {
		const existingUserSeq = await users
			.aggregate(
				[
					{ $match: { seq: { $exists: true } } },
					{ $group: { _id: null, maxSeq: { $max: '$seq' } } },
				],
				{ allowDiskUse: true },
			)
			.toArray();
		let userCount = Number(existingUserSeq[0]?.maxSeq || 0);

		const cursor = users
			.find({ seq: { $exists: false } })
			.sort(BACKFILL_SORT)
			.hint(BACKFILL_SORT)
			.allowDiskUse(true);
		let ops = [];
		while (await cursor.hasNext()) {
			const doc = await cursor.next();
			userCount += 1;
			if (!dryRun) {
				ops.push({
					updateOne: {
						filter: { _id: doc._id },
						update: { $set: { seq: userCount, deletedAt: doc.deletedAt ?? null } },
					},
				});
			}
			if (ops.length >= BATCH_SIZE) {
				await users.bulkWrite(ops);
				ops = [];
			}
		}
		if (ops.length > 0) await users.bulkWrite(ops);
		if (!dryRun) {
			await users.updateMany(
				{ deletedAt: { $exists: false } },
				{ $set: { deletedAt: null } },
			);
		}
		console.log(
			`${dryRun ? '[dry-run] ' : ''}[backfill] users: ${userCount} doc(s)`,
		);
	}

	return counters;
}

// Seeds syncsequences with max(backfilledCount, changelogsMaxSeq) per
// (domain, academicYear) so the next appendChange never collides.
async function seedSyncSequences(db, counters, dryRun) {
	const changelogs = db.collection('changelogs');
	const hasChangelogs = await changelogs
		.find({}, { projection: { _id: 1 } })
		.limit(1)
		.hasNext();

	const maxByBucket = new Map();
	if (hasChangelogs) {
		const rows = await changelogs
			.aggregate([
				{ $match: { domain: { $exists: true }, academicYear: { $exists: true } } },
				{
					$group: {
						_id: { domain: '$domain', academicYear: '$academicYear' },
						maxSeq: { $max: '$seq' },
					},
				},
			])
			.toArray();
		for (const row of rows) {
			const key = `${row._id.domain}:${row._id.academicYear}`;
			maxByBucket.set(key, Math.max(maxByBucket.get(key) || 0, row.maxSeq || 0));
		}
	}

	const seededBuckets = new Set();
	const seeds = new Map();
	const addBucket = (domain, year, count) => {
		const key = `${domain}:${year}`;
		const seed = Math.max(maxByBucket.get(key) || 0, count);
		seededBuckets.add(key);
		seeds.set(key, seed);
		if (dryRun) {
			console.log(`[dry-run] [seed] syncsequences ${domain}:${year} = ${seed}`);
			return;
		}
		console.log(`[seed] syncsequences ${domain}:${year} = ${seed}`);
	};

	for (const [bucketKey, count] of counters.entries()) {
		const idx = bucketKey.indexOf(':');
		const domain = bucketKey.slice(0, idx);
		const year = bucketKey.slice(idx + 1);
		addBucket(domain, year, count);
	}

	// Preserve any changelog buckets with no backfilled docs (e.g. users).
	for (const [bucketKey, maxSeq] of maxByBucket.entries()) {
		if (seededBuckets.has(bucketKey)) continue;
		const idx = bucketKey.indexOf(':');
		addBucket(bucketKey.slice(0, idx), bucketKey.slice(idx + 1), maxSeq);
	}

	if (!dryRun) {
		for (const [bucketKey, seed] of seeds.entries()) {
			const idx = bucketKey.indexOf(':');
			await db.collection('syncsequences').updateOne(
				{ domain: bucketKey.slice(0, idx), academicYear: bucketKey.slice(idx + 1) },
				{ $max: { seq: seed } },
				{ upsert: true },
			);
		}
	}
}

async function ensureIndexes(db, dryRun) {
	const changelogs = db.collection('changelogs');
	for (const { key, options } of CHANGELOG_INDEXES) {
		if (dryRun) {
			console.log(`[dry-run] [index] changelogs ${JSON.stringify(key)}`);
			continue;
		}
		await changelogs.createIndex(key, options);
		console.log(`[index] changelogs ${JSON.stringify(key)}`);
	}

	const syncsequences = db.collection('syncsequences');
	for (const { key, options } of SYNCSEQUENCE_INDEXES) {
		if (dryRun) {
			console.log(`[dry-run] [index] syncsequences ${JSON.stringify(key)}`);
			continue;
		}
		await syncsequences.createIndex(key, options);
		console.log(`[index] syncsequences ${JSON.stringify(key)}`);
	}
}

async function migrateTenantDb(mongoUri, dbName, dryRun) {
	const conn = mongoose.createConnection(mongoUri, {
		dbName,
		maxPoolSize: 4,
		minPoolSize: 0,
		serverSelectionTimeoutMS: 5000,
	});
	try {
		await conn.asPromise();
		const db = conn.db;
		await ensureBackfillIndexes(db, dryRun);
		const counters = await backfillSeqAndDeletedAt(db, dryRun);
		await seedSyncSequences(db, counters, dryRun);
		await ensureIndexes(db, dryRun);
		return { dbName, success: true };
	} catch (error) {
		return { dbName, success: false, error };
	} finally {
		await conn.close();
	}
}

async function main() {
	const { dbNames: requestedDbNames, dryRun, help } = parseArgs(process.argv);
	if (help) {
		printUsage();
		return;
	}

	const mongoUri = resolveMongoUri();
	if (!mongoUri) {
		console.error(
			'Missing MONGODB_URI. Set it in env or define it in .env.local/.env.',
		);
		process.exit(1);
	}

	const dbNames =
		requestedDbNames.length > 0
			? uniqueNonEmpty(requestedDbNames)
			: await discoverTenantDbNames(mongoUri);

	if (dbNames.length === 0) {
		console.error('No tenant database names found. Provide --db <dbName>.');
		process.exit(1);
	}

	console.log(
		`Starting sync-engine migration for ${dbNames.length} database(s)${dryRun ? ' [dry-run]' : ''}...`,
	);

	const failures = [];
	for (const dbName of dbNames) {
		const result = await migrateTenantDb(mongoUri, dbName, dryRun);
		if (result.success) continue;
		failures.push(result);
		console.error(`[failed] ${dbName}:`, result.error);
	}

	console.log(
		`Completed. Databases: ${dbNames.length}. Failures: ${failures.length}.`,
	);
	if (failures.length > 0) {
		process.exit(1);
	}
}

main().catch((error) => {
	console.error('Sync-engine migration failed:', error);
	process.exit(1);
});
