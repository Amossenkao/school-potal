import { deleteObject, isR2Configured, keyFromPublicUrl } from './r2';

// Avatar-specific naming and cleanup rules, kept out of lib/storage/r2.ts so that
// module stays a generic bucket client other surfaces (e.g. school branding logos)
// can reuse.

/**
 * Superadmins live in the central schoolmesh DB and carry no tenant host, so they get
 * their own namespace. Everyone else is scoped to their school's host.
 */
export function resolveTenantSlug(user: {
	role?: string;
	tenantId?: unknown;
}): string {
	if (user?.role === 'superadmin') return 'schoolmesh';

	const raw = typeof user?.tenantId === 'string' ? user.tenantId : '';
	const host = raw.split(':')[0].toLowerCase();
	const slug = host.replace(/[^a-z0-9.-]/g, '');
	return slug || 'unknown';
}

export function avatarPrefix(tenantSlug: string, userId: string): string {
	return `avatars/${tenantSlug}/${userId}/`;
}

/**
 * Purges the avatar a user is moving away from, so replaced or removed photos don't
 * sit in the bucket forever. Applies whatever the new value is — another upload, a
 * generated DiceBear URL, a pasted link, or an empty string.
 *
 * Deliberately called at *persist* time rather than upload time: the DB write is the
 * commit point, so on screens that defer saving until a form submit we never delete a
 * file the stored record still points at.
 *
 * Only ever deletes objects under the owner's own prefix, and never throws — losing a
 * cleanup is an orphaned file, which must not fail the user's profile update.
 */
export async function deleteReplacedAvatar({
	previousUrl,
	nextUrl,
	tenantSlug,
	userId,
}: {
	previousUrl?: string | null;
	nextUrl?: string | null;
	tenantSlug: string;
	userId: string;
}): Promise<void> {
	try {
		if (!isR2Configured()) return;

		const previous = (previousUrl || '').trim();
		if (!previous) return;
		if (previous === (nextUrl || '').trim()) return;

		const key = keyFromPublicUrl(previous);
		if (!key) return;
		if (!key.startsWith(avatarPrefix(tenantSlug, userId))) return;

		await deleteObject(key);
	} catch (error) {
		console.error('Failed to delete replaced avatar:', error);
	}
}
