export type ReportTemplateType = 'yearly' | 'semester';
type TemplateSemesterKey = 'first' | 'second';

export type ReportTemplateFallbackRequest = {
	reportType: ReportTemplateType;
	school: {
		shortName?: string;
		host?: string;
		name?: string;
		logoUrl?: string;
		logoUrl2?: string;
		address?: string[];
	};
	session?: string;
	classLevel?: string;
	classSubjects: string[];
	semester?: TemplateSemesterKey;
	themeId?: string;
	sponsorName?: string;
	includePrincipalSignature?: boolean;
	principalSignatureValue?: string;
	includeDate?: boolean;
	dateValue?: string;
};

// ---------------------------------------------------------------------------
// Logo normalizer — keep this. It's a safety guard, unrelated to caching:
// it only accepts local paths or already-inlined data URIs, so a stray
// remote http(s) URL never gets handed to the PDF renderer.
// ---------------------------------------------------------------------------

const normalizeLogo = (value?: string) => {
	if (!value || typeof value !== 'string') return undefined;
	const normalized = value.trim();
	if (!normalized) return undefined;
	if (normalized.startsWith('/') || normalized.startsWith('data:')) {
		return normalized;
	}
	return undefined;
};

// ---------------------------------------------------------------------------
// Public API — always generates fresh. No Cache Storage, no dedup map.
// Every call reflects the school's current theme, sponsor name, and subjects
// at the moment of generation.
// ---------------------------------------------------------------------------

export const loadReportTemplateBytes = async (
	request: ReportTemplateFallbackRequest,
): Promise<ArrayBuffer> => {
	const safeRequest: ReportTemplateFallbackRequest = {
		...request,
		school: {
			...request.school,
			logoUrl: normalizeLogo(request.school.logoUrl),
			logoUrl2: normalizeLogo(request.school.logoUrl2),
		},
	};

	const { generateDynamicTemplateBytes } =
		await import('@/utils/reportTemplateGenerator');
	return generateDynamicTemplateBytes(safeRequest);
};
