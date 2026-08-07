// ---------------------------------------------------------------------------
// School address normalization.
//
// contact.addresses is stored canonically as `{ label?, lines: string[] }[]`,
// but older / migrated profiles may hold a flat `string[]` where each item is
// one address line. These helpers accept any of those shapes and return a
// normalized form so every consumer renders lines identically.
// ---------------------------------------------------------------------------

export type NormalizedSchoolAddress = {
	label?: string;
	lines: string[];
};

// Convert any addresses shape into `{ label?, lines: string[] }[]`.
// Flat string[] items become lines of a single address, so multi-line
// letterheads (which read the first address's lines) keep every row.
export function normalizeSchoolAddresses(addresses: unknown): NormalizedSchoolAddress[] {
	if (!Array.isArray(addresses)) return [];
	if (addresses.length === 0) return [];
	const allStrings = addresses.every((a) => typeof a === 'string');
	if (allStrings) {
		const lines = addresses
			.map((s) => String(s).trim())
			.filter(Boolean);
		return lines.length ? [{ lines }] : [];
	}
	const out: NormalizedSchoolAddress[] = [];
	for (const a of addresses) {
		if (a && typeof a === 'object' && Array.isArray((a as any).lines)) {
			const lines = ((a as any).lines as unknown[])
				.map((s) => String(s).trim())
				.filter(Boolean);
			if (lines.length) out.push({ label: (a as any).label, lines });
		}
	}
	return out;
}

// Flatten any addresses shape into a single flat list of address lines.
export function flattenSchoolAddressLines(addresses: unknown): string[] {
	return normalizeSchoolAddresses(addresses).flatMap((a) => a.lines);
}

// First address's lines, used by document headers and cards.
export function getFirstSchoolAddressLines(addresses: unknown): string[] {
	return normalizeSchoolAddresses(addresses)[0]?.lines || [];
}
