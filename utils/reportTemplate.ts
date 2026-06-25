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
};

const TEMPLATE_CACHE_NAME = 'report-template-bytes-v1';

// ---------------------------------------------------------------------------
// Cache key — stable and unique per school + report type + class level
// ---------------------------------------------------------------------------

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');

const buildCacheKey = (request: ReportTemplateFallbackRequest): string => {
	const parts = [
		slugify(request.school.shortName ?? 'school'),
		slugify(request.reportType),
	];
	if (request.classLevel) parts.push(slugify(request.classLevel));
	return `generated-template:${parts.join('_')}`;
};

// ---------------------------------------------------------------------------
// Cache Storage read / write
// ---------------------------------------------------------------------------

const readFromCache = async (key: string): Promise<ArrayBuffer | null> => {
	if (typeof window === 'undefined' || !('caches' in window)) return null;
	try {
		const cache = await window.caches.open(TEMPLATE_CACHE_NAME);
		const cached = await cache.match(key);
		if (!cached) return null;
		return await cached.arrayBuffer();
	} catch {
		return null;
	}
};

const writeToCache = async (key: string, bytes: ArrayBuffer): Promise<void> => {
	if (typeof window === 'undefined' || !('caches' in window)) return;
	try {
		const cache = await window.caches.open(TEMPLATE_CACHE_NAME);
		await cache.put(
			key,
			new Response(bytes.slice(0), {
				headers: { 'Content-Type': 'application/pdf' },
			}),
		);
	} catch {
		// Ignore write failures — generation will simply re-run next time.
	}
};

// ---------------------------------------------------------------------------
// In-flight deduplication — prevents generating the same template twice
// if two callers race before the cache is populated
// ---------------------------------------------------------------------------

const inFlightMap = new Map<string, Promise<ArrayBuffer>>();

// ---------------------------------------------------------------------------
// Logo normalizer
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
// Public API
// ---------------------------------------------------------------------------

export const loadReportTemplateBytes = async (
	request: ReportTemplateFallbackRequest,
): Promise<ArrayBuffer> => {
	const cacheKey = buildCacheKey(request);

	// 1. Try Cache Storage first (persists across page loads / works offline).
	const cached = await readFromCache(cacheKey);
	if (cached) return cached;

	// 2. Deduplicate concurrent requests for the same template.
	if (inFlightMap.has(cacheKey)) {
		return inFlightMap.get(cacheKey)!;
	}

	const safeRequest: ReportTemplateFallbackRequest = {
		...request,
		school: {
			...request.school,
			logoUrl: normalizeLogo(request.school.logoUrl),
			logoUrl2: normalizeLogo(request.school.logoUrl2),
		},
	};

	const promise = (async () => {
		const { generateDynamicTemplateBytes } =
			await import('@/utils/reportTemplateGenerator');
		const bytes = await generateDynamicTemplateBytes(safeRequest);
		await writeToCache(cacheKey, bytes);
		inFlightMap.delete(cacheKey);
		return bytes;
	})();

	inFlightMap.set(cacheKey, promise);
	return promise;
};

export const precacheReportTemplatesForSchool = async (
	school:
		| (ReportTemplateFallbackRequest['school'] & {
				classLevels?: Record<string, Record<string, unknown>>;
		  })
		| null,
	options?: {
		reportTypes?: ReportTemplateType[];
		concurrency?: number;
	},
) => {
	if (typeof window === 'undefined') return;
	if (!school) return;

	const reportTypes: ReportTemplateType[] = options?.reportTypes ?? [
		'yearly',
		'semester',
	];
	const concurrency = Math.max(1, Math.floor(options?.concurrency ?? 2));

	const tasks: Array<() => Promise<void>> = [];

	const classLevels = school.classLevels ?? {};
	Object.entries(classLevels).forEach(([session, levels]) => {
		if (!levels || typeof levels !== 'object') return;
		Object.keys(levels).forEach((classLevel) => {
			reportTypes.forEach((reportType) => {
				tasks.push(async () => {
					await loadReportTemplateBytes({
						reportType,
						school,
						session,
						classLevel,
						classSubjects: [''],
					});
				});
			});
		});
	});

	const queue = [...tasks];
	const workers = Array.from({
		length: Math.min(concurrency, queue.length),
	}).map(async () => {
		while (queue.length) {
			const next = queue.shift();
			if (!next) return;
			try {
				await next();
			} catch {
				// Pre-cache failures are non-fatal.
			}
		}
	});

	await Promise.allSettled(workers);
};
