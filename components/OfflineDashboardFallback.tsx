'use client';

import OfflineDashboard from '@/components/OfflineDashboard';

type OfflineDashboardFallbackProps = {
	user?: unknown;
	schoolProfile?: unknown;
	theme?: string;
	userPreferences?: string;
	sessionToken?: string;
};

export default function OfflineDashboardFallback(
	_props: OfflineDashboardFallbackProps
) {
	return <OfflineDashboard />;
}
