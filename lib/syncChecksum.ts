// lib/syncChecksum.ts
// Phase 4 integrity: a deterministic, dependency-free content checksum that
// runs identically in Node (API routes) and the browser (clientSync). The
// snapshot route hashes the serialized domain payload; the client hashes the
// received payload and self-heals on mismatch (§6.5 / Phase 4).

/** Stable, key-sorted serialization so hashes match regardless of JSON key order. */
export const canonicalStringify = (value: unknown): string => {
	if (Array.isArray(value)) {
		return `[${value.map((item) => canonicalStringify(item)).join(',')}]`;
	}
	if (value && typeof value === 'object') {
		const entries = Object.keys(value as Record<string, unknown>)
			.filter((key) => (value as Record<string, unknown>)[key] !== undefined)
			.sort()
			.map(
				(key) =>
					`${JSON.stringify(key)}:${canonicalStringify(
						(value as Record<string, unknown>)[key],
					)}`,
			);
		return `{${entries.join(',')}}`;
	}
	if (value === undefined) return 'undefined';
	if (value === null) return 'null';
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) return 'null';
		return JSON.stringify(value);
	}
	return JSON.stringify(value);
};

/**
 * 64-bit-ish djb2 xor checksum over the canonical serialization, hex-encoded.
 * Detects corruption/drift; not cryptographic (cost is fine for integrity).
 */
export const checksum = (value: unknown): string => {
	const str = canonicalStringify(value);
	let h1 = 5381;
	let h2 = 52711;
	for (let i = 0; i < str.length; i++) {
		const code = str.charCodeAt(i);
		h1 = (h1 * 33 + code) | 0;
		h2 = (h2 * 33 + code) | 0;
	}
	const a = (h1 >>> 0).toString(16).padStart(8, '0');
	const b = (h2 >>> 0).toString(16).padStart(8, '0');
	return `${a}${b}`;
};
