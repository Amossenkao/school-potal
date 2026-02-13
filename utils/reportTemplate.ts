export type ReportTemplateType = 'yearly' | 'semester';

export const DEFAULT_REPORT_TEMPLATE_URL = '/pdf_template.pdf';
const TEMPLATE_CACHE_NAME = 'report-template-bytes-v1';
const STATIC_TEMPLATE_DEFAULTS: Record<ReportTemplateType, string[]> = {
	yearly: [
		'/upstairs_morning_elementary_yearly_report.pdf',
		'/upstairs_morning_junior_high_yearly_report.pdf',
		'/upstairs_morning_senior_high_yearly_report.pdf',
		'/upstairs_morning_senior_high_yearly_report (1).pdf',
		'/upstairs_morning_senior_high_yearly_report%20(1).pdf',
	],
	semester: [
		'/upstairs_morning_elementary_semester_report.pdf',
		'/upstairs_morning_junior_high_semester_report.pdf',
		'/upstairs_morning_senior_high_semester_report.pdf',
	],
};

const templateBytesCache = new Map<string, Promise<ArrayBuffer>>();

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');

const getStoredSchoolShortName = () => {
	if (typeof window === 'undefined') return '';
	try {
		const raw = localStorage.getItem('school-profile');
		if (!raw) return '';
		const parsed = JSON.parse(raw);
		return typeof parsed?.shortName === 'string' ? parsed.shortName : '';
	} catch {
		return '';
	}
};

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
	const resolvedShortName = schoolShortName || getStoredSchoolShortName();
	if (!resolvedShortName || !session || !classLevel) {
		return DEFAULT_REPORT_TEMPLATE_URL;
	}
	const parts = [
		slugify(resolvedShortName),
		slugify(session),
		slugify(classLevel),
		`${reportType}_report`,
	];
	if (templateVariant) {
		parts.push(slugify(templateVariant));
	}
	return `/${parts.join('_')}.pdf`;
};

export const buildReportTemplateCandidates = ({
	schoolShortName,
	session,
	classLevel,
	reportType,
}: {
	schoolShortName?: string;
	session?: string;
	classLevel?: string;
	reportType: ReportTemplateType;
}) => {
	const resolvedShortName = schoolShortName || getStoredSchoolShortName();
	const candidates: string[] = [];
	const seen = new Set<string>();
	const push = (url?: string) => {
		if (!url || seen.has(url)) return;
		seen.add(url);
		candidates.push(url);
	};

	push(
		buildReportTemplateUrl({
			schoolShortName: resolvedShortName,
			session,
			classLevel,
			reportType,
		}),
	);

	if (resolvedShortName && session) {
		for (const fallbackLevel of ['elementary', 'junior_high', 'senior_high']) {
			push(
				`/${slugify(resolvedShortName)}_${slugify(session)}_${fallbackLevel}_${reportType}_report.pdf`,
			);
		}
	}

	STATIC_TEMPLATE_DEFAULTS[reportType].forEach((url) => push(url));
	push(DEFAULT_REPORT_TEMPLATE_URL);
	return candidates;
};

export const loadReportTemplateBytes = async (
	primaryUrl: string,
	fallbackUrl: string | string[] = DEFAULT_REPORT_TEMPLATE_URL,
) => {
	const fallbackList = Array.isArray(fallbackUrl) ? fallbackUrl : [fallbackUrl];
	const urls = [primaryUrl, ...fallbackList].filter(Boolean);
	const uniqueUrls = Array.from(new Set(urls));
	let lastError: unknown = null;

	for (const url of uniqueUrls) {
		try {
			return await loadTemplateBytesWithOfflineSupport(url);
		} catch (err) {
			lastError = err;
		}
	}

	throw lastError || new Error('Failed to load PDF template.');
};
