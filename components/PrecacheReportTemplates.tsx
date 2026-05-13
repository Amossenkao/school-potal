'use client';

import { useEffect, useRef } from 'react';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { useNetworkStore } from '@/store/networkStore';
import { precacheReportTemplatesForSchool } from '@/utils/reportTemplate';

const STORAGE_PREFIX = 'school_portal_report_template_precache_v1';

const getCacheKey = (schoolShortName?: string) => {
	const safe = String(schoolShortName || '').trim().toLowerCase() || 'unknown';
	return `${STORAGE_PREFIX}:${safe}`;
};

export default function PrecacheReportTemplates() {
	const { user, isLoggedIn } = useAuth();
	const { school } = useSchoolStore();
	const { isOnline } = useNetworkStore();
	const hasRunRef = useRef(false);

	useEffect(() => {
		if (hasRunRef.current) return;
		if (!isLoggedIn || !user) return;
		if (!school) return;
		if (!isOnline) return;
		if (typeof window === 'undefined') return;

		const cacheKey = getCacheKey((school as any)?.shortName);
		try {
			if (sessionStorage.getItem(cacheKey) === '1') {
				hasRunRef.current = true;
				return;
			}
		} catch {
			// Ignore storage read failures.
		}

		hasRunRef.current = true;

		const run = async () => {
			// Preload the dynamic fallback generator chunk so offline template fallback
			// won't trip a Next.js chunk-load error on cold caches.
			await import('@/utils/reportTemplateGenerator').catch(() => undefined);

			await precacheReportTemplatesForSchool(school as any, {
				reportTypes: ['yearly', 'semester'],
				concurrency: 2,
			}).catch(() => undefined);

			try {
				sessionStorage.setItem(cacheKey, '1');
			} catch {
				// Ignore storage write failures.
			}
		};

		// Schedule during idle time to avoid delaying first paint.
		if ('requestIdleCallback' in window) {
			const idleId = (window as any).requestIdleCallback(run, { timeout: 2500 });
			return () => {
				(window as any).cancelIdleCallback?.(idleId);
			};
		}

		const timeoutId = window.setTimeout(run, 250);
		return () => window.clearTimeout(timeoutId);
	}, [isLoggedIn, user, school, isOnline]);

	return null;
}

