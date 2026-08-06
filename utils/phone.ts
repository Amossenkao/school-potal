/**
 * Phone number normalization.
 *
 * Numbers are stored verbatim in whatever format they were typed — the same
 * subscriber shows up as `+231 776 949463`, `0776949463` and `231776949463`
 * across the collection. Matching a typed number against an account therefore
 * needs a canonical form, which is what `normalizePhone` produces: the national
 * significant number, digits only.
 *
 * The raw `phone` field stays as-typed for display; only the derived
 * `phoneNormalized` field is used for lookups and uniqueness.
 */

const LR_COUNTRY_CODE = '231';

/**
 * Liberian national significant numbers are 8-9 digits, but stored data also
 * contains 10-digit variants (e.g. "+231-770-000-0001"). The upper bound is 10
 * so those still shed their country code — with a narrower window the "231"
 * survived normalization and the local form of the same number failed to match.
 */
const MIN_NSN_LENGTH = 7;
const MAX_NSN_LENGTH = 10;

/** Shortest value we are willing to treat as a phone number at all. */
const MIN_USABLE_LENGTH = 6;

/**
 * Reduce a phone number to its canonical national significant number.
 *
 * `+231 776 949463`, `0776949463`, `231776949463` and `00231776949463` all
 * collapse to `776949463`. Numbers that do not look Liberian fall through to a
 * digits-only form (`+1 415 555 0123` -> `14155550123`), which still gives
 * stable matching for a number typed the same way twice.
 *
 * Returns `null` when there is nothing usable, so callers can distinguish
 * "no phone" from "some phone" without inspecting the string.
 */
export function normalizePhone(raw: unknown): string | null {
	if (raw === null || raw === undefined) return null;

	let digits = String(raw).replace(/\D+/g, '');
	if (!digits) return null;

	// International access prefix: 00231... -> 231...
	if (digits.startsWith('00')) {
		digits = digits.slice(2);
	}

	// Country code: 231776949463 -> 776949463
	if (digits.startsWith(LR_COUNTRY_CODE)) {
		const rest = digits.slice(LR_COUNTRY_CODE.length);
		if (rest.length >= MIN_NSN_LENGTH && rest.length <= MAX_NSN_LENGTH) {
			digits = rest;
		}
	}

	// National trunk prefix: 0776949463 -> 776949463
	if (digits.startsWith('0')) {
		const rest = digits.replace(/^0+/, '');
		if (rest.length >= MIN_NSN_LENGTH && rest.length <= MAX_NSN_LENGTH) {
			digits = rest;
		}
	}

	return digits.length >= MIN_USABLE_LENGTH ? digits : null;
}

/**
 * Raw-format variants of a typed number, for querying the legacy `phone` field
 * directly. Only used as a transitional safety net for tenants whose
 * `phoneNormalized` backfill has not run yet — it cannot match values stored
 * with spaces or punctuation, which is exactly why the backfill exists.
 */
export function buildPhoneQueryCandidates(raw: unknown): string[] {
	const trimmed = String(raw ?? '').trim();
	if (!trimmed) return [];

	const nsn = normalizePhone(trimmed);
	const candidates = [trimmed, trimmed.replace(/\D+/g, '')];

	if (nsn) {
		candidates.push(
			nsn,
			`0${nsn}`,
			`${LR_COUNTRY_CODE}${nsn}`,
			`+${LR_COUNTRY_CODE}${nsn}`,
		);
	}

	return Array.from(new Set(candidates.filter(Boolean)));
}

/** True when both values normalize to the same non-null number. */
export function phonesMatch(a: unknown, b: unknown): boolean {
	const left = normalizePhone(a);
	if (!left) return false;
	return left === normalizePhone(b);
}

/**
 * A value is a usable phone number when it normalizes to something. Replaces
 * the old `/^\+?[\d\s\-()]{10,}$/` test, which accepted `((((((((((`.
 */
export function isValidPhone(raw: unknown): boolean {
	return normalizePhone(raw) !== null;
}
