export type ReportTemplateType = 'yearly' | 'semester';

export const DEFAULT_REPORT_TEMPLATE_URL = '/pdf_template.pdf';
const TEMPLATE_CACHE_NAME = 'report-template-bytes-v1';

const templateBytesCache = new Map<string, Promise<ArrayBuffer>>();

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');

const fetchTemplateBytes = (url: string) => {
	if (!templateBytesCache.has(url)) {
		const promise = fetch(url, { cache: 'no-store' })
			.then(async (res) => {
				if (!res.ok) {
					throw new Error(`Failed to load PDF template: ${url}`);
				}
				const bytes = await res.arrayBuffer();
				await persistTemplateBytes(url, bytes);
				return bytes;
			})
			.catch((err) => {
				templateBytesCache.delete(url);
				throw err;
			});
		templateBytesCache.set(url, promise);
	}
	return templateBytesCache.get(url)!;
};

const persistTemplateBytes = async (url: string, bytes: ArrayBuffer) => {
	if (typeof window === 'undefined' || !('caches' in window)) return;
	try {
		const cache = await window.caches.open(TEMPLATE_CACHE_NAME);
		await cache.put(
			url,
			new Response(bytes.slice(0), {
				headers: { 'Content-Type': 'application/pdf' },
			}),
		);
	} catch {
		// Ignore durable cache write failures.
	}
};

const loadTemplateBytesFromPersistentCache = async (url: string) => {
	if (typeof window === 'undefined' || !('caches' in window)) {
		return null;
	}
	try {
		const cache = await window.caches.open(TEMPLATE_CACHE_NAME);
		const cached = await cache.match(url);
		if (!cached) return null;
		return await cached.arrayBuffer();
	} catch {
		return null;
	}
};

const loadTemplateBytesWithOfflineSupport = async (url: string) => {
	const offline =
		typeof navigator !== 'undefined' && navigator.onLine === false;

	if (offline) {
		const cached = await loadTemplateBytesFromPersistentCache(url);
		if (cached) return cached;
		return await fetchTemplateBytes(url);
	}

	try {
		return await fetchTemplateBytes(url);
	} catch {
		const cached = await loadTemplateBytesFromPersistentCache(url);
		if (cached) return cached;
		throw new Error(`Failed to load PDF template: ${url}`);
	}
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
		return await loadTemplateBytesWithOfflineSupport(primaryUrl);
	} catch (err) {
		if (fallbackUrl && fallbackUrl !== primaryUrl) {
			return await loadTemplateBytesWithOfflineSupport(fallbackUrl);
		}
		throw err;
	}
};
