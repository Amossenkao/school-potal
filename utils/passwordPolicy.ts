/**
 * Password rules shared by the server routes and the account-setup UI.
 *
 * Kept separate from `utils/loginIdentity.ts` because that module pulls in
 * bcryptjs, which has no business in a client bundle.
 */

import { normalizePhone } from './phone';

/** Minimum for every password-setting path, client and server. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * True when a proposed password is just one of the account's own identifiers.
 *
 * While `mustChangePassword` is set, both the username and the phone number
 * unlock the account, so a forced change must not adopt either of them as the
 * "new" password — that would leave the account exactly as open as before.
 */
export function isIdentifierPassword(
	user: { username?: string; phone?: string; phoneNormalized?: string } | null,
	password: unknown,
): boolean {
	if (!user || !password) return false;

	const candidate = String(password).trim();
	if (!candidate) return false;

	if (
		user.username &&
		candidate.toUpperCase() === String(user.username).toUpperCase()
	) {
		return true;
	}

	const candidatePhone = normalizePhone(candidate);
	const accountPhone = user.phoneNormalized || normalizePhone(user.phone);
	return Boolean(
		candidatePhone && accountPhone && candidatePhone === accountPhone,
	);
}
