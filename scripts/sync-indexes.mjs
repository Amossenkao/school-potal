#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const INDEXES = {
	users: [
		{ role: 1 },
		{ role: 1, classId: 1 },
		{ role: 1, 'academicYears.year': 1 },
		{ role: 1, 'academicYears.year': 1, 'academicYears.classId': 1 },
		{ role: 1, 'subjects.year': 1 },
		{ role: 1, 'subjects.classes.classId': 1 },
	],
	grades: [
		{ academicYear: 1, classId: 1, period: 1, status: 1 },
		{ academicYear: 1, studentId: 1, classId: 1 },
		{
			academicYear: 1,
			teacherUsername: 1,
			classId: 1,
			subject: 1,
			period: 1,
		},
		{ academicYear: 1, classId: 1, status: 1 },
		{ lastUpdated: -1 },
	],
	gradechangerequests: [
		{ academicYear: 1, teacherUsername: 1, status: 1 },
		{ academicYear: 1, classId: 1, period: 1, status: 1 },
		{ academicYear: 1, submittedAt: -1 },
		{ academicYear: 1, lastUpdated: -1 },
	],
	schoolevents: [
		{ eventType: 1, academicYear: 1, session: 1, level: 1, classId: 1 },
		{ eventType: 1, academicYear: 1, startDate: 1 },
	],
};

function printUsage() {
	console.log(`
Usage:
  node scripts/sync-indexes.mjs [options]

Options:
  --db <dbName>        Sync only a specific tenant DB (repeatable)
  --dry-run            Print planned indexes without applying
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

function formatKey(key) {
	return JSON.stringify(key);
}

async function syncDbIndexes(mongoUri, dbName, dryRun = false) {
	const conn = mongoose.createConnection(mongoUri, {
		dbName,
		maxPoolSize: 4,
		minPoolSize: 0,
		serverSelectionTimeoutMS: 5000,
	});
	let applied = 0;
	try {
		await conn.asPromise();
		for (const [collectionName, keys] of Object.entries(INDEXES)) {
			const collection = conn.db.collection(collectionName);
			for (const key of keys) {
				if (dryRun) {
					console.log(`[dry-run] ${dbName}.${collectionName} ${formatKey(key)}`);
					continue;
				}
				await collection.createIndex(key);
				applied += 1;
				console.log(`[applied] ${dbName}.${collectionName} ${formatKey(key)}`);
			}
		}
		return { dbName, applied, success: true };
	} catch (error) {
		return { dbName, applied, success: false, error };
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
		`Starting index sync for ${dbNames.length} database(s)${dryRun ? ' [dry-run]' : ''}...`,
	);

	let totalApplied = 0;
	const failures = [];

	for (const dbName of dbNames) {
		const result = await syncDbIndexes(mongoUri, dbName, dryRun);
		if (result.success) {
			totalApplied += result.applied;
			continue;
		}
		failures.push(result);
		console.error(`[failed] ${dbName}:`, result.error);
	}

	console.log(
		`Completed. ${dryRun ? 'Planned' : 'Applied'} index ops: ${totalApplied}. Failures: ${failures.length}.`,
	);

	if (failures.length > 0) {
		process.exit(1);
	}
}

main().catch((error) => {
	console.error('Index sync failed:', error);
	process.exit(1);
});
