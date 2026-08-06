#!/usr/bin/env node

/**
 * Backfill the derived `phoneNormalized` field so existing accounts can be
 * found by phone number at login.
 *
 * Phone numbers were stored verbatim — the same subscriber appears as
 * "+231 776 949463", "0776949463" and "231776949463" across the collection — so
 * matching a typed number needs a canonical form. This script computes it for
 * every existing user and then puts the unique index in place.
 *
 * Run --check first. Collisions are expected: two format variants of one number
 * pass every uniqueness check the app has today, and the unique index is what
 * stops that from continuing.
 *
 *   node scripts/backfill-phone-normalized.mjs --check
 *   node scripts/backfill-phone-normalized.mjs --apply
 */

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const SCHOOLMESH_DB = 'schoolmesh';
const TENANT_COLLECTION = 'users';
const SUPERADMIN_COLLECTION = 'superadmins';

// --- Normalization -------------------------------------------------------
// Mirrors utils/phone.ts. Kept as a copy because this is a plain .mjs script
// with no TypeScript build step; if you change one, change the other.

const LR_COUNTRY_CODE = '231';
const MIN_NSN_LENGTH = 7;
const MAX_NSN_LENGTH = 9;
const MIN_USABLE_LENGTH = 6;

function normalizePhone(raw) {
	if (raw === null || raw === undefined) return null;

	let digits = String(raw).replace(/\D+/g, '');
	if (!digits) return null;

	if (digits.startsWith('00')) {
		digits = digits.slice(2);
	}

	if (digits.startsWith(LR_COUNTRY_CODE)) {
		const rest = digits.slice(LR_COUNTRY_CODE.length);
		if (rest.length >= MIN_NSN_LENGTH && rest.length <= MAX_NSN_LENGTH) {
			digits = rest;
		}
	}

	if (digits.startsWith('0')) {
		const rest = digits.replace(/^0+/, '');
		if (rest.length >= MIN_NSN_LENGTH && rest.length <= MAX_NSN_LENGTH) {
			digits = rest;
		}
	}

	return digits.length >= MIN_USABLE_LENGTH ? digits : null;
}

// --- CLI plumbing (mirrors scripts/sync-indexes.mjs) ---------------------

function printUsage() {
	console.log(`
Usage:
  node scripts/backfill-phone-normalized.mjs [options]

Options:
  --check              Report what would change and list collisions (default)
  --apply              Write phoneNormalized and create the unique index
  --db <dbName>        Limit to a specific tenant DB (repeatable)
  --skip-superadmins   Do not touch the ${SCHOOLMESH_DB} database
  --help               Show this help

Default behavior:
  Discovers tenant DB names from tenants.profiles, plus the ${SCHOOLMESH_DB} DB.
  --check exits non-zero when collisions are found; resolve them before --apply.
`);
}

function parseArgs(argv) {
	const args = argv.slice(2);
	const dbNames = [];
	let apply = false;
	let skipSuperadmins = false;
	let help = false;

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (arg === '--help' || arg === '-h') {
			help = true;
			continue;
		}
		if (arg === '--apply') {
			apply = true;
			continue;
		}
		if (arg === '--check') {
			continue;
		}
		if (arg === '--skip-superadmins') {
			skipSuperadmins = true;
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

	return { dbNames, apply, skipSuperadmins, help };
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
		for (const line of raw.split(/\r?\n/g)) {
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

// --- Core ----------------------------------------------------------------

/**
 * Inspect one collection: what normalizes cleanly, what does not, and which
 * accounts would end up sharing a canonical number.
 */
async function inspectCollection(collection) {
	const docs = await collection
		.find(
			{},
			{ projection: { _id: 1, username: 1, role: 1, phone: 1, phoneNormalized: 1 } },
		)
		.toArray();

	const byNormalized = new Map();
	const unusable = [];
	const writes = [];

	for (const doc of docs) {
		const normalized = normalizePhone(doc.phone);

		if (!normalized) {
			if (doc.phone || doc.phoneNormalized !== undefined) {
				unusable.push(doc);
			}
			if (doc.phoneNormalized !== undefined) {
				writes.push({
					updateOne: {
						filter: { _id: doc._id },
						update: { $unset: { phoneNormalized: '' } },
					},
				});
			}
			continue;
		}

		if (!byNormalized.has(normalized)) byNormalized.set(normalized, []);
		byNormalized.get(normalized).push(doc);

		if (doc.phoneNormalized !== normalized) {
			writes.push({
				updateOne: {
					filter: { _id: doc._id },
					update: { $set: { phoneNormalized: normalized } },
				},
			});
		}
	}

	const collisions = [...byNormalized.entries()]
		.filter(([, group]) => group.length > 1)
		.map(([normalized, group]) => ({ normalized, docs: group }));

	return { total: docs.length, withPhone: byNormalized.size, unusable, collisions, writes };
}

function reportCollection(label, report) {
	console.log(
		`  ${label}: ${report.total} doc(s), ${report.withPhone} distinct number(s), ` +
			`${report.writes.length} pending write(s)`,
	);

	for (const collision of report.collisions) {
		console.log(`  [collision] ${collision.normalized}`);
		for (const doc of collision.docs) {
			console.log(
				`      ${String(doc.username || doc._id).padEnd(16)} ` +
					`${String(doc.role || '-').padEnd(14)} ${JSON.stringify(doc.phone ?? null)}`,
			);
		}
	}

	for (const doc of report.unusable) {
		console.log(
			`  [unusable]  ${String(doc.username || doc._id).padEnd(16)} ` +
				`${String(doc.role || '-').padEnd(14)} ${JSON.stringify(doc.phone ?? null)}`,
		);
	}
}

/**
 * Drop any existing phoneNormalized index before creating ours: Mongo rejects
 * a createIndex that changes the options of an existing index
 * (IndexOptionsConflict), and Mongoose's autoIndex will not rebuild it either.
 */
async function ensureUniqueIndex(collection) {
	try {
		await collection.dropIndex('phoneNormalized_1');
		console.log('  [index] dropped existing phoneNormalized_1');
	} catch (error) {
		// IndexNotFound (27) is the normal first-run case.
		if (error?.code !== 27 && !/index not found/i.test(error?.message || '')) {
			throw error;
		}
	}
	await collection.createIndex(
		{ phoneNormalized: 1 },
		{ unique: true, sparse: true, name: 'phoneNormalized_1' },
	);
	console.log('  [index] created phoneNormalized_1 { unique: true, sparse: true }');
}

async function processDb(mongoUri, dbName, collectionName, apply) {
	const conn = mongoose.createConnection(mongoUri, {
		dbName,
		maxPoolSize: 4,
		minPoolSize: 0,
		serverSelectionTimeoutMS: 5000,
	});

	try {
		await conn.asPromise();
		const collection = conn.db.collection(collectionName);
		const report = await inspectCollection(collection);

		console.log(`[db: ${dbName}]`);
		reportCollection(collectionName, report);

		if (report.collisions.length > 0) {
			console.error(
				`  [blocked] ${report.collisions.length} collision(s) — resolve before --apply`,
			);
			return { dbName, collisions: report.collisions.length, written: 0, success: false };
		}

		if (!apply) {
			return { dbName, collisions: 0, written: 0, success: true };
		}

		if (report.writes.length > 0) {
			await collection.bulkWrite(report.writes, { ordered: false });
			console.log(`  [applied] ${report.writes.length} document(s) updated`);
		} else {
			console.log('  [applied] already up to date');
		}

		await ensureUniqueIndex(collection);

		return {
			dbName,
			collisions: 0,
			written: report.writes.length,
			success: true,
		};
	} catch (error) {
		return { dbName, collisions: 0, written: 0, success: false, error };
	} finally {
		await conn.close();
	}
}

async function main() {
	const { dbNames: requestedDbNames, apply, skipSuperadmins, help } = parseArgs(
		process.argv,
	);
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

	const tenantDbNames =
		requestedDbNames.length > 0
			? uniqueNonEmpty(requestedDbNames)
			: await discoverTenantDbNames(mongoUri);

	const targets = tenantDbNames.map((dbName) => ({
		dbName,
		collectionName: TENANT_COLLECTION,
	}));

	// Superadmins live in their own database, and log in the same way.
	if (!skipSuperadmins && requestedDbNames.length === 0) {
		targets.push({
			dbName: SCHOOLMESH_DB,
			collectionName: SUPERADMIN_COLLECTION,
		});
	}

	if (targets.length === 0) {
		console.error('No databases found. Provide --db <dbName>.');
		process.exit(1);
	}

	console.log(
		`${apply ? 'Applying' : 'Checking'} phoneNormalized across ${targets.length} database(s)...\n`,
	);

	let totalWritten = 0;
	let totalCollisions = 0;
	const failures = [];

	for (const target of targets) {
		const result = await processDb(
			mongoUri,
			target.dbName,
			target.collectionName,
			apply,
		);
		totalWritten += result.written;
		totalCollisions += result.collisions;
		if (!result.success) {
			failures.push(result);
			if (result.error) console.error(`[failed] ${result.dbName}:`, result.error);
		}
		console.log('');
	}

	console.log(
		`Completed. ${apply ? 'Documents written' : 'Documents pending'}: ${totalWritten}. ` +
			`Collisions: ${totalCollisions}. Failures: ${failures.length}.`,
	);

	if (!apply && totalCollisions === 0) {
		console.log('No collisions — safe to re-run with --apply.');
	}

	if (failures.length > 0 || totalCollisions > 0) {
		process.exit(1);
	}
}

main().catch((error) => {
	console.error('Backfill failed:', error);
	process.exit(1);
});
