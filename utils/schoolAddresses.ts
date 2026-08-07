// ---------------------------------------------------------------------------
// School address normalization.
//
// contact.addresses is now stored canonically as a flat `string[]` where each
// element is one address line. Older profiles may still hold the legacy
// `{ label?, lines: string[] }[]` objects; these helpers accept any of those
// shapes and always return flat lines so every consumer renders identically.
// ---------------------------------------------------------------------------

type NormalizedSchoolAddress = {
	label?: string;
	lines: string[];
};

// Convert any addresses shape into `{ label?, lines: string[] }[]`.
// Flat string[] items become lines of a single address, so multi-line
// letterheads (which read the first address's lines) keep every row.
function normalizeSchoolAddresses(addresses: unknown): NormalizedSchoolAddress[] {
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
