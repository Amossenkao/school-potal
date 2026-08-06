/**
 * Login identity resolution — server only (pulls in bcryptjs).
 *
 * Two concerns live here:
 *   1. Which account does a typed identifier refer to? (username OR phone)
 *   2. Does a supplied password unlock that account?
 *
 * Both are shared between the login route and the self-service password change,
 * so a user who signed in with one credential can always complete their setup
 * with the same one.
 */

import bcrypt from 'bcryptjs';
import { buildPhoneQueryCandidates, normalizePhone } from './phone';

// Re-exported so server callers can pull the whole login vocabulary from one
// place; the definitions live in a bcrypt-free module the client can import.
export { isIdentifierPassword, MIN_PASSWORD_LENGTH } from './passwordPolicy';

/**
 * Mongo `$or` clause matching an account by either its username or its phone
 * number. Callers add their own `role` filter, so lookups stay role-scoped and
 * a phone shared between, say, a student and their parent stays unambiguous.
 *
 * Usernames are generated uppercase (`UCA2026504`, `TEA2026001`, `SYS20261234`),
 * so matching both the raw and uppercased input gives case-insensitive username
 * login for every role.
 */
export function buildIdentifierQuery(rawInput: unknown) {
	const raw = String(rawInput ?? '').trim();

	// An empty identifier must match nothing rather than fall through to
	// `{ username: { $in: [''] } }`, which could hit a malformed document.
	// Every document has an _id, so this is an unsatisfiable filter that also
	// avoids casting a bogus value to ObjectId.
	if (!raw) return { _id: { $exists: false } };

	const normalized = normalizePhone(raw);

	const or: Record<string, unknown>[] = [
		{ username: { $in: Array.from(new Set([raw, raw.toUpperCase()])) } },
	];

	if (normalized) {
		or.push({ phoneNormalized: normalized });
		// Transitional: covers tenants whose backfill has not run yet. Matches
		// unpunctuated variants only — the backfill is what makes this complete.
		or.push({ phone: { $in: buildPhoneQueryCandidates(raw) } });
	}

	return { $or: or };
}

/**
 * Verify a supplied password against an account.
 *
 * While `mustChangePassword` is true — a freshly created account, or one an
 * admin has just reset — the account additionally accepts its own username or
 * phone number as the password. Combined with `buildIdentifierQuery`, that
 * makes all four username/phone combinations work during the setup window.
 *
 * The `mustChangePassword !== true` guard is the security boundary: once the
 * user has chosen a password, the identifiers stop working as credentials.
 * `bcrypt.compare` runs first and unconditionally so the two states are not
 * distinguishable by timing.
 */
export async function verifyLoginPassword(
	user: any,
	password: unknown,
): Promise<boolean> {
	if (!user || !password) return false;

	const supplied = String(password);

	if (user.password && (await bcrypt.compare(supplied, user.password))) {
		return true;
	}

	if (user.mustChangePassword !== true) return false;

	const trimmed = supplied.trim();

	if (
		user.username &&
		trimmed.toUpperCase() === String(user.username).toUpperCase()
	) {
		return true;
	}

	const suppliedPhone = normalizePhone(trimmed);
	const accountPhone = user.phoneNormalized || normalizePhone(user.phone);
	return Boolean(suppliedPhone && accountPhone && suppliedPhone === accountPhone);
}

