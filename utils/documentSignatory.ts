/**
 * Resolves the name to print on an official document's signature line.
 *
 * A school configures named *positions* (`userConfig.administrativePositions`
 * — "Principal", "Registrar", …) separately from *who currently holds one*
 * (an Administrator's `position` field). This walks from a position label to
 * whichever cached administrator holds it, so Attestation/Transcript/
 * Recommendation/Graduation Clearance letters sign with a real name instead
 * of a bare title — and degrade gracefully to the title alone when nobody is
 * assigned, since a document must never fail to generate over this.
 */

export interface Signatory {
	name: string;
	title: string;
	/** False when no administrator could be matched — render a blank line. */
	resolved: boolean;
}

const administratorName = (admin: any): string =>
	admin?.fullName ||
	`${admin?.firstName || ''} ${admin?.lastName || ''}`.trim() ||
	admin?.username ||
	'';

export function resolveSignatory(
	schoolProfile: any,
	usersByAcademicYear: Record<string, any>,
	academicYear: string,
	positionName: string,
): Signatory {
	const positions: any[] = schoolProfile?.userConfig?.administrativePositions || [];
	const needle = positionName.trim().toLowerCase();
	const position = positions.find(
		(entry) => String(entry?.name || '').trim().toLowerCase() === needle,
	);
	const title = position?.name || positionName;

	const roster =
		usersByAcademicYear?.[academicYear] ||
		Object.entries(usersByAcademicYear || {}).find(
			([key]) => key.replace(/\//g, '-') === academicYear.replace(/\//g, '-'),
		)?.[1];
	const administrators: any[] = Array.isArray(roster?.administrators)
		? roster.administrators
		: [];

	if (position) {
		const holder = administrators.find((admin) => {
			if (admin?.position === position.id) return true;
			const yearEntry = Array.isArray(admin?.academicYears)
				? admin.academicYears.find(
						(entry: any) => entry?.year?.replace(/\//g, '-') === academicYear.replace(/\//g, '-'),
					)
				: null;
			return yearEntry?.position === position.id;
		});
		if (holder) {
			const name = administratorName(holder);
			if (name) return { name, title, resolved: true };
		}
	}

	return { name: '', title, resolved: false };
}
