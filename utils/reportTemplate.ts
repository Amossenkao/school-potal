export type ReportTemplateType = 'yearly' | 'semester';

export const DEFAULT_REPORT_TEMPLATE_URL = '/pdf_template.pdf';

const templateBytesCache = new Map<string, Promise<ArrayBuffer>>();

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');

const fetchTemplateBytes = (url: string) => {
	if (!templateBytesCache.has(url)) {
		const promise = fetch(url)
			.then((res) => {
				if (!res.ok) {
					throw new Error(`Failed to load PDF template: ${url}`);
				}
				return res.arrayBuffer();
			})
			.catch((err) => {
				templateBytesCache.delete(url);
				throw err;
			});
		templateBytesCache.set(url, promise);
	}
	return templateBytesCache.get(url)!;
};

export const buildReportTemplateUrl = ({
	schoolShortName,
	session,
	classLevel,
	reportType,
	templateVariant,
}: {
	schoolShortName?: string;
	session?: string;
	classLevel?: string;
	reportType: ReportTemplateType;
	templateVariant?: string;
}) => {
	if (!schoolShortName || !session || !classLevel) {
		return DEFAULT_REPORT_TEMPLATE_URL;
	}
	const parts = [
		slugify(schoolShortName),
		slugify(session),
		slugify(classLevel),
		`${reportType}_report`,
	];
	if (templateVariant) {
		parts.push(slugify(templateVariant));
	}
	return `/${parts.join('_')}.pdf`;
};

export const loadReportTemplateBytes = async (
	primaryUrl: string,
	fallbackUrl: string = DEFAULT_REPORT_TEMPLATE_URL,
) => {
	try {
		return await fetchTemplateBytes(primaryUrl);
	} catch (err) {
		if (fallbackUrl && fallbackUrl !== primaryUrl) {
			return await fetchTemplateBytes(fallbackUrl);
		}
		throw err;
	}
};
