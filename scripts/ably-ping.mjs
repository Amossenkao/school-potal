#!/usr/bin/env node

/**
 * Publishes one diagnostic event to a tenant's realtime channels.
 *
 * Splits "is the subscriber wired up?" from "is the publisher publishing?" —
 * the two failure modes look identical from the browser, where both simply
 * mean nothing arrives. If the ping shows up in the console, the client,
 * its token and its channel names are all correct and the fault is in
 * whatever should have published. If it does not, the subscriber side is at
 * fault, or the API key here belongs to a different Ably app than the one the
 * running deployment authenticates against.
 *
 *   node scripts/ably-ping.mjs                       # school + platform channels
 *   node scripts/ably-ping.mjs --tenant uca          # a different tenant key
 *   node scripts/ably-ping.mjs --app-id              # just print the app id
 */

import fs from 'node:fs';
import path from 'node:path';
import Ably from 'ably';

function loadEnvFiles() {
	for (const file of ['.env.local', '.env']) {
		const full = path.join(process.cwd(), file);
		if (!fs.existsSync(full)) continue;
		for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/g)) {
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

async function main() {
	loadEnvFiles();

	let tenant = 'ucaliberia_vercel_app';
	for (let i = 2; i < process.argv.length; i += 1) {
		if (process.argv[i] === '--tenant') tenant = process.argv[i + 1];
	}

	const apiKey = String(process.env.ABLY_API_KEY || '').trim();
	if (!apiKey) {
		console.error('ABLY_API_KEY is not set.');
		process.exitCode = 1;
		return;
	}
	console.log(`Ably app id : ${apiKey.split('.')[0]}`);
	console.log(`tenant key  : ${tenant}`);

	const rest = new Ably.Rest(apiKey);
	// Shaped like a real event so the client's guards treat it normally: the
	// tenantId must match or the subscriber drops it before logging anything
	// useful, which is the very thing being tested.
	const event = {
		type: 'ANNOUNCEMENT_CREATED',
		tenantId: tenant,
		payload: { reason: 'diagnostic-ping', diagnostic: true },
		timestamp: new Date().toISOString(),
		source: 'system',
	};

	const channels = [`school:${tenant}`, 'platform:events'];
	for (const name of channels) {
		await rest.channels.get(name).publish(event.type, event);
		console.log(`  published to ${name}`);
	}

	// Occupancy would say whether anyone is attached, but reading it needs the
	// channel-metadata capability. Distinguish "no subscribers" from "not
	// allowed to ask" — conflating them invents a finding that isn't there.
	for (const name of channels) {
		try {
			const details = await rest.request('get', `/channels/${encodeURIComponent(name)}`);
			const item = details.items?.[0];
			if (details.statusCode === 401 || item?.error) {
				console.log(
					`  ${name} occupancy: unavailable — key lacks channel-metadata permission`,
				);
				continue;
			}
			const occupancy = item?.status?.occupancy?.metrics;
			console.log(
				`  ${name} occupancy:`,
				occupancy
					? `connections=${occupancy.connections ?? 0} subscribers=${occupancy.subscribers ?? 0}`
					: '(no occupancy data returned)',
			);
		} catch (error) {
			console.log(
				`  ${name} occupancy: unavailable (${error?.statusCode ?? '?'})`,
			);
		}
	}

	console.log('\nWatch the browser console for:');
	console.log(`  [AuthProvider] message on school:${tenant} ANNOUNCEMENT_CREATED`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
