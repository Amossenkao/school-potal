#!/usr/bin/env node

/**
 * Rewrites every stored classId from an old school profile's scheme to a new
 * one, then copies the old profile's entire financialConfig across with the
 * class references rewritten to match.
 *
 * The two profiles share no IDs, so the join is made on the only thing that is
 * stable across them: session → level → class name. That mapping is validated
 * hard before anything is written, because a classId is the key that ties a
 * student to their grades, attendance, payments and timetable. If two old
 * classes were to land on one new ID, those two classes would silently merge
 * and no later pass could separate them again — so an ambiguous mapping aborts
 * the run rather than guessing.
 *
 * Usage:
 *   node scripts/migrate-class-ids.mjs --old old.json --new new.json           # dry run
 *   node scripts/migrate-class-ids.mjs --old old.json --new new.json --apply
 *
 *   --db <name>        Tenant database to rewrite. Defaults to the NEW profile's
 *                      system.dbName. Pass explicitly if the data still lives in
 *                      the old database.
 *   --mapping <file>   Use an explicit {"oldId":"newId"} map instead of matching
 *                      on session/level/name. Use this when names changed too.
 *   --emit-mapping <f> Write the derived mapping out for review and stop.
 *   --skip-financial   Rewrite IDs only; leave the new profile's financialConfig.
 *   --financial-only   Port financialConfig only; touch no tenant data.
 *   --apply            Actually write. Without it nothing is modified.
 *
 * The financialConfig is replaced wholesale — currencies, paymentCategories,
 * feeDefinitions, installments, studentGroups and feeSchedules all come from
 * the old profile, so every id a scheduled fee names is defined alongside it.
 *
 * Every step is idempotent: documents are matched on old IDs, so a second run
 * finds nothing left to change.
 */

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

// ── Where classIds live ──────────────────────────────────────────────────
// Each entry is one collection and the paths within it that hold a classId.
// `array` paths sit inside an array of subdocuments and are rewritten with an
// arrayFilters update; `scalar` paths are plain fields.
const CLASS_ID_PATHS = [
	{
		collection: 'users',
		scalar: [
			// Student's current class, and the sponsor class on a teacher.
			'classId',
			'sponsorClass',
			// Written by older builds; still present on historical documents.
			'historicalClass.classId',
			'currentClass.classId',
		],
		nested: [
			// Student: one entry per academic year.
			{ path: 'academicYears', field: 'classId' },
			// Teacher: subjects[].classes[].classId
			{ path: 'subjects', sub: 'classes', field: 'classId' },
			// isTeacher administrators keep the same shape under `classes`.
			{ path: 'classes', sub: 'classes', field: 'classId' },
		],
	},
	{ collection: 'grades', scalar: ['classId'], nested: [] },
	{ collection: 'gradechangerequests', scalar: ['classId'], nested: [] },
	{ collection: 'attendances', scalar: ['classId'], nested: [] },
	// Timetables and test schedules are both SchoolEvent documents.
	{ collection: 'schoolevents', scalar: ['classId'], nested: [] },
	{ collection: 'payments', scalar: ['classId'], nested: [] },
];

// ── CLI ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
	const args = {
		old: 'old.json',
		new: 'new.json',
		db: '',
		mapping: '',
		emitMapping: '',
		rebuildNew: '',
		apply: false,
		skipFinancial: false,
		financialOnly: false,
	};
	for (let i = 2; i < argv.length; i += 1) {
		const token = argv[i];
		const next = () => argv[(i += 1)];
		if (token === '--old') args.old = next();
		else if (token === '--new') args.new = next();
		else if (token === '--db') args.db = next();
		else if (token === '--mapping') args.mapping = next();
		else if (token === '--emit-mapping') args.emitMapping = next();
		else if (token === '--rebuild-new') args.rebuildNew = next();
		else if (token === '--apply') args.apply = true;
		else if (token === '--skip-financial' || token === '--skip-fees')
			args.skipFinancial = true;
		else if (token === '--financial-only' || token === '--fees-only')
			args.financialOnly = true;
		else if (token === '--help' || token === '-h') args.help = true;
		else throw new Error(`Unknown argument: ${token}`);
	}
	return args;
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

/**
 * Drops the cached copy of a school profile.
 *
 * `getSchoolProfile` serves from Redis for thirty days, so a profile written
 * straight to Mongo — as this script does — stays invisible to the running app
 * until that lapses. That matters beyond staleness: Ably channels are named
 * `school:{system.dbName}`, and publishers read the profile from Mongo while
 * subscribers read it through this cache. Leave the cache behind and the two
 * sides name different channels, so every realtime event is published to a
 * channel nobody is listening on.
 */
async function bustSchoolProfileCache(host) {
	const url = String(process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
	const token = process.env.UPSTASH_REDIS_REST_TOKEN || '';
	if (!url || !token) {
		return {
			ok: false,
			message:
				'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — delete the key by hand.',
		};
	}
	const key = `school_profile:${host}`;
	try {
		const response = await fetch(`${url}/del/${encodeURIComponent(key)}`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` },
		});
		const body = await response.json().catch(() => null);
		if (!response.ok) {
			return { ok: false, message: `Redis DEL failed (${response.status}).` };
		}
		return {
			ok: true,
			message: `Cleared "${key}" (deleted ${body?.result ?? 0}).`,
		};
	} catch (error) {
		return {
			ok: false,
			message: `Redis DEL failed: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

const readJson = (file) => {
	const fullPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
	if (!fs.existsSync(fullPath)) throw new Error(`File not found: ${fullPath}`);
	return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
};

// ── Profile reading ──────────────────────────────────────────────────────

/** Flattens a profile's class tree to [{ session, level, name, classId }]. */
function listClasses(profile) {
	const out = [];
	const tree = profile?.academicConfig?.classLevels || {};
	for (const [session, levels] of Object.entries(tree)) {
		for (const [level, data] of Object.entries(levels || {})) {
			for (const klass of data?.classes || []) {
				out.push({
					session,
					level,
					name: String(klass?.name ?? '').trim(),
					classId: String(klass?.classId ?? '').trim(),
				});
			}
		}
	}
	return out;
}

/**
 * The classId convention: session and class name lowercased, with every run of
 * spaces and punctuation collapsed to a single underscore.
 *
 *   Morning + "Grade 10-A" → morning_grade_10_a
 *   Night   + "Grade 1-PM" → night_grade_1_pm
 *   Morning + "K 1"        → morning_k_1
 *
 * Prefixing with the session is what keeps Night distinct from Morning — the
 * class names alone collide across sessions.
 */
const slugify = (value) =>
	String(value ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');

const deriveClassId = (session, name) => `${slugify(session)}_${slugify(name)}`;

/** "Grade 1 PM" → "Grade 1-PM", so the evening classes read consistently. */
const normalizeClassName = (name) =>
	String(name ?? '')
		.trim()
		.replace(/\s*[-\s]\s*PM$/i, '-PM');

/**
 * Classes are joined old→new on session, level and name — but the name is
 * slugified first, so punctuation drift ("Grade 1 PM" vs "Grade 1-PM") and
 * casing do not break the match.
 */
const identityKey = (c) => `${c.session}::${c.level}::${slugify(c.name)}`;

/**
 * Regenerates the new profile's class tree so every classId follows the
 * convention above.
 *
 * Class names are taken from the old profile, level by level, because the new
 * one lost the evening suffixes when its Night classes were copied from
 * Morning. A level is only rewritten when both profiles list the same number of
 * classes for it — otherwise the pairing would be a guess, so it is reported
 * and left alone.
 */
function rebuildNewProfile(oldProfile, newProfile) {
	const rebuilt = JSON.parse(JSON.stringify(newProfile));
	const notes = [];

	const oldTree = new Map();
	for (const [session, levels] of Object.entries(
		oldProfile?.academicConfig?.classLevels || {},
	)) {
		for (const [level, data] of Object.entries(levels || {})) {
			oldTree.set(`${session}::${level}`, data?.classes || []);
		}
	}

	const tree = rebuilt?.academicConfig?.classLevels || {};
	for (const [session, levels] of Object.entries(tree)) {
		for (const [level, data] of Object.entries(levels || {})) {
			const classes = data?.classes || [];
			const oldClasses = oldTree.get(`${session}::${level}`);

			if (oldClasses && oldClasses.length !== classes.length) {
				notes.push(
					`${session}/${level}: old has ${oldClasses.length} classes, new has ${classes.length} — ` +
						`names left as they are, ids still regenerated.`,
				);
			}

			classes.forEach((klass, index) => {
				const canPairByPosition =
					oldClasses && oldClasses.length === classes.length;
				const sourceName = canPairByPosition
					? oldClasses[index]?.name
					: klass?.name;
				const name = normalizeClassName(sourceName ?? klass?.name);
				const classId = deriveClassId(session, name);
				if (klass.name !== name || klass.classId !== classId) {
					notes.push(
						`${session}/${level}: "${klass.name}" (${klass.classId}) → "${name}" (${classId})`,
					);
				}
				klass.name = name;
				klass.classId = classId;
			});
		}
	}

	// The whole point is uniqueness, so prove it before handing the file back.
	const seen = new Map();
	for (const c of listClasses(rebuilt)) {
		if (!seen.has(c.classId)) seen.set(c.classId, []);
		seen.get(c.classId).push(identityKey(c));
	}
	const collisions = Array.from(seen.entries()).filter(([, u]) => u.length > 1);

	return { rebuilt, notes, collisions };
}

// ── Mapping + validation ─────────────────────────────────────────────────

/**
 * Builds old→new and reports every reason the mapping cannot be trusted.
 * Nothing is written while `errors` is non-empty.
 */
function buildMapping(oldProfile, newProfile) {
	const oldClasses = listClasses(oldProfile);
	const newClasses = listClasses(newProfile);
	const errors = [];
	const warnings = [];

	// A classId must identify exactly one class. Two classes sharing an ID
	// means every document pointing at it becomes ambiguous.
	const newById = new Map();
	for (const c of newClasses) {
		if (!newById.has(c.classId)) newById.set(c.classId, []);
		newById.get(c.classId).push(c);
	}
	for (const [classId, uses] of newById) {
		if (uses.length > 1) {
			errors.push(
				`New profile reuses classId "${classId}" for ${uses.length} classes: ` +
					uses.map((u) => `${u.session}/${u.level}/${u.name}`).join('  |  '),
			);
		}
	}
	for (const c of newClasses) {
		if (!c.classId) {
			errors.push(`New class has an empty classId: ${identityKey(c)}`);
		}
	}

	// Same check on the old side — a duplicate there means the source data is
	// already ambiguous and the rewrite cannot improve on it.
	const oldSeen = new Map();
	for (const c of oldClasses) {
		if (!oldSeen.has(c.classId)) oldSeen.set(c.classId, []);
		oldSeen.get(c.classId).push(c);
	}
	for (const [classId, uses] of oldSeen) {
		if (uses.length > 1) {
			errors.push(
				`Old profile reuses classId "${classId}" for ${uses.length} classes: ` +
					uses.map((u) => `${u.session}/${u.level}/${u.name}`).join('  |  '),
			);
		}
	}

	// Join on session/level/name.
	const newByIdentity = new Map();
	for (const c of newClasses) newByIdentity.set(identityKey(c), c);

	const mapping = {};
	const targets = new Map();
	for (const oldClass of oldClasses) {
		const match = newByIdentity.get(identityKey(oldClass));
		if (!match) {
			errors.push(
				`No class in the new profile matches ${identityKey(oldClass)} ` +
					`(old id "${oldClass.classId}"). Rename it to match, or supply --mapping.`,
			);
			continue;
		}
		mapping[oldClass.classId] = match.classId;
		if (!targets.has(match.classId)) targets.set(match.classId, []);
		targets.get(match.classId).push(oldClass.classId);
	}

	// Two old classes landing on one new ID is the merge case: refuse.
	for (const [newId, olds] of targets) {
		if (olds.length > 1) {
			errors.push(
				`Old classes ${olds.map((o) => `"${o}"`).join(', ')} would all become ` +
					`"${newId}" — their students, grades and payments would merge irreversibly.`,
			);
		}
	}

	// A new class with nothing pointing at it is fine (a genuinely new class),
	// but worth surfacing in case it signals a rename that was missed.
	const oldByIdentity = new Set(oldClasses.map(identityKey));
	for (const c of newClasses) {
		if (!oldByIdentity.has(identityKey(c))) {
			warnings.push(
				`New class ${identityKey(c)} ("${c.classId}") has no old counterpart — nothing will migrate into it.`,
			);
		}
	}

	// A no-op entry means that ID is already correct; harmless but noisy.
	for (const [oldId, newId] of Object.entries(mapping)) {
		if (oldId === newId) {
			warnings.push(`classId "${oldId}" is unchanged; it will be skipped.`);
		}
	}

	return { mapping, errors, warnings, oldClasses, newClasses };
}

// ── Tenant data rewrite ──────────────────────────────────────────────────

/**
 * Maps one field through the whole mapping in a single expression, so each
 * field costs one pass over the collection instead of one pass per class.
 * Anything not in the mapping keeps its current value.
 */
const switchExpr = (fieldExpr, pairs) => ({
	$switch: {
		branches: pairs.map(([oldId, newId]) => ({
			case: { $eq: [fieldExpr, oldId] },
			then: newId,
		})),
		default: fieldExpr,
	},
});

async function rewriteCollection(db, spec, mapping, apply, log) {
	const results = [];
	const pairs = Object.entries(mapping).filter(([o, n]) => o && n && o !== n);
	const oldIds = pairs.map(([oldId]) => oldId);
	const collection = db.collection(spec.collection);

	const run = async (label, filter, pipeline) => {
		log(`    ${label} …`);
		let matched = 0;
		let modified = 0;
		if (apply) {
			const res = await collection.updateMany(filter, pipeline);
			matched = res.matchedCount;
			modified = res.modifiedCount;
		} else {
			matched = await collection.countDocuments(filter);
		}
		log(
			`    ${label} — ${apply ? `matched ${matched}, modified ${modified}` : `${matched} would change`}`,
		);
		if (matched > 0 || modified > 0) {
			results.push({ target: label, matched, modified });
		}
	};

	for (const field of spec.scalar) {
		await run(
			`${spec.collection}.${field}`,
			{ [field]: { $in: oldIds } },
			[{ $set: { [field]: switchExpr(`$${field}`, pairs) } }],
		);
	}

	for (const nested of spec.nested) {
		const dotted = nested.sub
			? `${nested.path}.${nested.sub}.${nested.field}`
			: `${nested.path}.${nested.field}`;

		// The filter guarantees the array exists on every matched document, so
		// $map never sees a missing field. Sibling entries pass through $switch's
		// default untouched.
		const inner = (varName) => ({
			$mergeObjects: [
				`$$${varName}`,
				{
					[nested.field]: switchExpr(`$$${varName}.${nested.field}`, pairs),
				},
			],
		});

		const pipeline = nested.sub
			? [
					{
						$set: {
							[nested.path]: {
								$map: {
									input: `$${nested.path}`,
									as: 'outer',
									in: {
										$mergeObjects: [
											'$$outer',
											{
												[nested.sub]: {
													$map: {
														input: { $ifNull: [`$$outer.${nested.sub}`, []] },
														as: 'entry',
														in: inner('entry'),
													},
												},
											},
										],
									},
								},
							},
						},
					},
				]
			: [
					{
						$set: {
							[nested.path]: {
								$map: {
									input: `$${nested.path}`,
									as: 'entry',
									in: inner('entry'),
								},
							},
						},
					},
				];

		await run(`${spec.collection}.${dotted}`, { [dotted]: { $in: oldIds } }, pipeline);
	}

	return results;
}

/**
 * Class names are denormalised alongside the ids in several places. Once the
 * ids are right, refresh the names from the new profile so nothing displays a
 * stale label.
 */
async function refreshClassNames(db, newClasses, apply, log) {
	const users = db.collection('users');
	const results = [];
	const namePairs = newClasses
		.filter((c) => c.classId && c.name)
		.map((c) => [c.classId, c.name]);
	if (namePairs.length === 0) return results;
	const classIds = namePairs.map(([id]) => id);

	const run = async (label, filter, pipeline) => {
		log(`    ${label} …`);
		let matched = 0;
		let modified = 0;
		if (apply) {
			const res = await users.updateMany(filter, pipeline);
			matched = res.matchedCount;
			modified = res.modifiedCount;
		} else {
			matched = await users.countDocuments(filter);
		}
		log(
			`    ${label} — ${apply ? `matched ${matched}, modified ${modified}` : `${matched} would change`}`,
		);
		if (matched > 0 || modified > 0) results.push({ target: label, matched, modified });
	};

	// Names are denormalised beside the ids; refresh them from the new tree so
	// nothing displays a label the profile no longer uses.
	await run(
		'users.className',
		{ classId: { $in: classIds } },
		[{ $set: { className: switchExpr('$classId', namePairs) } }],
	);

	await run(
		'users.academicYears[].className',
		{ 'academicYears.classId': { $in: classIds } },
		[
			{
				$set: {
					academicYears: {
						$map: {
							input: '$academicYears',
							as: 'entry',
							in: {
								$mergeObjects: [
									'$$entry',
									{ className: switchExpr('$$entry.classId', namePairs) },
								],
							},
						},
					},
				},
			},
		],
	);

	return results;
}

// ── Fee schedule port ────────────────────────────────────────────────────

/**
 * Copies the old profile's whole `financialConfig` onto the new one, rewriting
 * every classId it carries.
 *
 * The config is taken as a unit rather than schedule-by-schedule because its
 * parts only make sense together: a scheduled fee names a feeId, an
 * installmentId and a studentGroupId, and each of those is defined elsewhere in
 * the same object. Copying the schedule but keeping the new profile's shorter
 * definition lists would leave fees pointing at installments that do not exist,
 * which bills nobody. Carrying currencies, paymentCategories, feeDefinitions,
 * installments and studentGroups across with it keeps the set closed.
 *
 * It also settles the studentType question: the old `returning-students` group
 * matches `studentType: "old"`, which is what student records actually store.
 */
function portFinancialConfig(oldProfile, mapping) {
	const source = oldProfile?.financialConfig;
	const warnings = [];
	if (!source) {
		warnings.push('Old profile has no financialConfig; nothing to port.');
		return { ported: null, warnings, remapped: 0 };
	}

	const ported = JSON.parse(JSON.stringify(source));
	const unmappedClassIds = new Set();
	let remapped = 0;

	const remapClassId = (id) => {
		const mapped = mapping[id];
		if (!mapped) {
			unmappedClassIds.add(id);
			return id;
		}
		if (mapped !== id) remapped += 1;
		return mapped;
	};

	for (const schedule of ported.feeSchedules || []) {
		for (const session of schedule?.sessionFeeSchedules || []) {
			for (const group of session?.feeGroups || []) {
				group.appliesToClassIds = (group.appliesToClassIds || []).map(remapClassId);
			}
		}
		// A scholarship's `appliesTo` can hold classIds or student ids. Only
		// rewrite entries that are actually a known old classId; anything else
		// is left exactly as it was.
		for (const scholarship of schedule?.scholarships || []) {
			scholarship.appliesTo = (scholarship.appliesTo || []).map((entry) =>
				typeof entry === 'string' && mapping[entry] ? mapping[entry] : entry,
			);
		}
	}

	// The config now stands alone, so check it against itself.
	const feeIds = new Set((ported.feeDefinitions || []).map((f) => f?.id));
	const installmentIds = new Set((ported.installments || []).map((i) => i?.id));
	const groupIds = new Set((ported.studentGroups || []).map((g) => g?.id));
	const categoryIds = new Set((ported.paymentCategories || []).map((c) => c?.id));
	const currencyCodes = new Set((ported.currencies || []).map((c) => c?.code));

	const missingFees = new Set();
	const missingInstallments = new Set();
	const missingGroups = new Set();
	const missingCurrencies = new Set();

	for (const schedule of ported.feeSchedules || []) {
		for (const session of schedule?.sessionFeeSchedules || []) {
			for (const group of session?.feeGroups || []) {
				for (const fee of group?.scheduledFees || []) {
					if (fee?.feeId && !feeIds.has(fee.feeId)) missingFees.add(fee.feeId);
					if (fee?.amount?.currency && !currencyCodes.has(fee.amount.currency)) {
						missingCurrencies.add(fee.amount.currency);
					}
					for (const inst of fee?.installments || []) {
						if (inst?.installmentId && !installmentIds.has(inst.installmentId)) {
							missingInstallments.add(inst.installmentId);
						}
					}
					for (const groupId of fee?.applicableStudentGroupIds || []) {
						if (groupId && !groupIds.has(groupId)) missingGroups.add(groupId);
					}
				}
			}
		}
	}

	const orphanCategories = (ported.feeDefinitions || [])
		.filter((f) => f?.category && !categoryIds.has(f.category))
		.map((f) => `${f.id} → ${f.category}`);

	if (unmappedClassIds.size > 0) {
		warnings.push(
			`appliesToClassIds entries with no class in the old tree, carried over unchanged: ${Array.from(unmappedClassIds).join(', ')}`,
		);
	}
	if (missingFees.size > 0) {
		warnings.push(`Scheduled fees reference undefined feeIds: ${Array.from(missingFees).join(', ')}`);
	}
	if (missingInstallments.size > 0) {
		warnings.push(
			`Scheduled fees reference undefined installmentIds: ${Array.from(missingInstallments).join(', ')}`,
		);
	}
	if (missingGroups.size > 0) {
		warnings.push(
			`Scheduled fees reference undefined studentGroupIds: ${Array.from(missingGroups).join(', ')}`,
		);
	}
	if (missingCurrencies.size > 0) {
		warnings.push(`Scheduled fees use undefined currencies: ${Array.from(missingCurrencies).join(', ')}`);
	}
	if (orphanCategories.length > 0) {
		warnings.push(
			`Fee definitions reference undefined paymentCategories: ${orphanCategories.join(', ')}`,
		);
	}

	return { ported, warnings, remapped };
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
	const args = parseArgs(process.argv);
	if (args.help) {
		console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
		return;
	}

	const oldProfile = readJson(args.old);
	const newProfile = readJson(args.new);

	console.log('── Class ID migration ─────────────────────────────────────');
	console.log(`  old profile : ${args.old}  (dbName ${oldProfile?.system?.dbName})`);
	console.log(`  new profile : ${args.new}  (dbName ${newProfile?.system?.dbName})`);

	if (args.rebuildNew) {
		const { rebuilt, notes, collisions } = rebuildNewProfile(oldProfile, newProfile);
		console.log(`\n  Regenerating class names and ids by convention:\n`);
		for (const note of notes) console.log(`    ${note}`);
		if (collisions.length > 0) {
			console.error('\n✖ The convention still produces duplicate ids:');
			for (const [classId, uses] of collisions) {
				console.error(`  • "${classId}" ← ${uses.join('  |  ')}`);
			}
			console.error('\nTwo classes in one session share a name. Rename one, then re-run.');
			process.exitCode = 1;
			return;
		}
		fs.writeFileSync(args.rebuildNew, JSON.stringify(rebuilt, null, '\t'));
		console.log(
			`\n  ${listClasses(rebuilt).length} classes, all ids unique. Wrote ${args.rebuildNew}.`,
		);
		console.log('  Review it, replace new.json, then run the migration.');
		return;
	}

	const built = buildMapping(oldProfile, newProfile);
	let mapping = built.mapping;

	if (args.mapping) {
		mapping = readJson(args.mapping);
		console.log(`  mapping     : ${args.mapping} (explicit, ${Object.keys(mapping).length} entries)`);
	}

	if (args.emitMapping) {
		fs.writeFileSync(args.emitMapping, JSON.stringify(mapping, null, 2));
		console.log(`\nWrote derived mapping to ${args.emitMapping}. Review it, then re-run with --mapping.`);
		return;
	}

	for (const warning of built.warnings) console.log(`  ! ${warning}`);

	// An explicit mapping is the operator's own assertion, so only the derived
	// one is gated on these checks.
	if (!args.mapping && built.errors.length > 0) {
		console.error('\n✖ The mapping is not safe to apply:\n');
		for (const error of built.errors) console.error(`  • ${error}`);
		console.error(
			'\nFix the new profile so each class has its own unique classId, or pass an\n' +
				'explicit --mapping file. Nothing was written.',
		);
		process.exitCode = 1;
		return;
	}

	const pairs = Object.entries(mapping).filter(([o, n]) => o && n && o !== n);
	console.log(`\n  ${pairs.length} classIds will be rewritten.`);
	if (!args.apply) console.log('  DRY RUN — pass --apply to write.\n');
	else console.log('  APPLYING.\n');

	loadEnvFiles();
	const mongoUri = process.env.MONGODB_URI || '';
	if (!mongoUri) {
		console.error('Missing MONGODB_URI. Set it in env or .env.local/.env.');
		process.exitCode = 1;
		return;
	}

	const targetDb = args.db || newProfile?.system?.dbName;
	if (!targetDb) {
		console.error('Could not resolve a target database. Pass --db <name>.');
		process.exitCode = 1;
		return;
	}

	// ── Tenant collections ──
	if (!args.financialOnly) {
		console.log(`  tenant db   : ${targetDb}`);
		const conn = mongoose.createConnection(mongoUri, {
			dbName: targetDb,
			maxPoolSize: 4,
			serverSelectionTimeoutMS: 8000,
		});
		try {
			console.log('  connecting …');
			await conn.asPromise();
			console.log('  connected.\n');
			const log = (line) => console.log(line);
			const rows = [];
			for (const spec of CLASS_ID_PATHS) {
				rows.push(
					...(await rewriteCollection(conn.db, spec, mapping, args.apply, log)),
				);
			}
			rows.push(
				...(await refreshClassNames(conn.db, built.newClasses, args.apply, log)),
			);

			if (rows.length === 0) {
				console.log('\n  Nothing to change — no document holds an old classId.');
			} else {
				console.log('\n  Documents touched:');
				for (const row of rows) {
					const suffix = args.apply
						? `matched ${row.matched}, modified ${row.modified}`
						: `${row.matched} would change`;
					console.log(`    ${row.target.padEnd(52)} ${suffix}`);
				}
			}
		} finally {
			await conn.close();
		}
	}

	// ── financialConfig ──
	if (!args.skipFinancial) {
		const { ported, warnings, remapped } = portFinancialConfig(oldProfile, mapping);
		if (ported) {
			console.log(
				`\n  financialConfig: copying the old profile's whole block ` +
					`(${(ported.feeDefinitions || []).length} fee definitions, ` +
					`${(ported.installments || []).length} installments, ` +
					`${(ported.studentGroups || []).length} student groups, ` +
					`${(ported.feeSchedules || []).length} academic year(s)); ` +
					`${remapped} classId references rewritten.`,
			);
		}
		for (const warning of warnings) console.log(`    ! ${warning}`);

		const host = newProfile?.system?.host;
		if (!ported) {
			// nothing to do
		} else if (!host) {
			console.error('    New profile has no system.host; cannot locate it. Skipped.');
		} else if (args.apply) {
			const conn = mongoose.createConnection(mongoUri, {
				dbName: 'schoolmesh',
				maxPoolSize: 2,
				serverSelectionTimeoutMS: 8000,
			});
			try {
				await conn.asPromise();
				// The class tree goes up with it. Rewriting tenant documents to the
				// new ids while the stored profile still lists the old ones would
				// leave every class lookup — timetables, fees, report cards —
				// resolving against ids nothing references any more.
				const res = await conn.db.collection('schoolprofiles').updateOne(
					{ 'system.host': host },
					{
						$set: {
							financialConfig: ported,
							'academicConfig.classLevels':
								newProfile?.academicConfig?.classLevels || {},
						},
					},
				);
				if (res.matchedCount === 0) {
					console.error(
						`    No profile found with system.host "${host}" in schoolmesh.schoolprofiles.`,
					);
				} else {
					console.log(
						`    Replaced financialConfig and academicConfig.classLevels on ${host}.`,
					);
					// Must happen here, not as a follow-up step: until the cache is
					// dropped the app keeps serving the pre-migration profile, and
					// realtime silently publishes to the wrong tenant channel.
					const busted = await bustSchoolProfileCache(host);
					console.log(`    ${busted.ok ? '' : '! '}${busted.message}`);
					const oldHost = oldProfile?.system?.host;
					if (oldHost && oldHost !== host) {
						const bustedOld = await bustSchoolProfileCache(oldHost);
						console.log(`    ${bustedOld.ok ? '' : '! '}${bustedOld.message}`);
					}
				}
			} finally {
				await conn.close();
			}
		} else {
			const out = 'financial-config.ported.json';
			fs.writeFileSync(out, JSON.stringify(ported, null, 2));
			console.log(`    DRY RUN — wrote the remapped financialConfig to ${out} for review.`);
		}
	}

	console.log('\nDone.');
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
