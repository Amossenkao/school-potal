'use client';

import { useCallback, useEffect, useMemo } from 'react';
import Ably from 'ably';
import { useSchoolStore } from '@/store/schoolStore';
import {
	getAuthorizedRealtimeChannels,
	resolveTenantSyncKey,
	type RealtimeEvent,
} from '@/lib/realtimeTypes';
import { Ban, Mail, Phone, MapPin } from 'lucide-react';

const PUBLIC_SYNC_STREAM_TOKEN_ENDPOINT = '/api/sync/public-stream-token';
const PUBLIC_SYNC_REFRESH_DEBOUNCE_MS = 120;

export default function Inactive() {
	const school = useSchoolStore((state) => state.school);
	const setSchool = useSchoolStore((state) => state.setSchool);
	const applyRealtimeEvent = useSchoolStore((state) => state.applyRealtimeEvent);
	const publicSchoolTenantKey = useMemo(
		() =>
			resolveTenantSyncKey({
				schoolProfile: school,
			}),
		[school?.dbName, school?.host],
	);

	const refreshSchoolProfile = useCallback(async () => {
		try {
			const response = await fetch('/api/school', {
				cache: 'no-store',
				headers: { 'Cache-Control': 'no-store' },
			});
			if (!response.ok) return;
			const latestSchool = await response.json();
			setSchool(latestSchool);
		} catch (error) {
			console.warn('[inactive] Failed to refresh school profile:', error);
		}
	}, [setSchool]);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		let client: Ably.Realtime | null = null;
		let unsubscribe: (() => void) | null = null;
		let refreshTimer: number | null = null;
		const tenantKey =
			publicSchoolTenantKey ||
			resolveTenantSyncKey({
				host: window.location.host,
			});

		const clearRefreshTimer = () => {
			if (!refreshTimer) return;
			window.clearTimeout(refreshTimer);
			refreshTimer = null;
		};

		const closeClient = () => {
			if (unsubscribe) {
				unsubscribe();
				unsubscribe = null;
			}
			if (client) {
				client.close();
				client = null;
			}
		};

		const scheduleRefresh = () => {
			clearRefreshTimer();
			refreshTimer = window.setTimeout(() => {
				refreshTimer = null;
				void refreshSchoolProfile();
			}, PUBLIC_SYNC_REFRESH_DEBOUNCE_MS);
		};

		const connectStream = () => {
			closeClient();
			if (!tenantKey) return;

			const nextClient = new Ably.Realtime({
				authUrl: PUBLIC_SYNC_STREAM_TOKEN_ENDPOINT,
				authMethod: 'GET',
				withCredentials: true,
			});
			client = nextClient;

			const channels = getAuthorizedRealtimeChannels({
				tenantId: tenantKey,
				publicOnly: true,
			});
			const cleanupFns: (() => void)[] = [];
			channels.forEach((channelName) => {
				const channel = nextClient.channels.get(channelName);
				const listener = (message: any) => {
					const event = message?.data as RealtimeEvent | undefined;
					if (!event || event.tenantId !== tenantKey) return;
					applyRealtimeEvent(event);
					scheduleRefresh();
				};
				channel.subscribe(listener);
				cleanupFns.push(() => channel.unsubscribe(listener));
			});
			unsubscribe = () => cleanupFns.forEach((fn) => fn());
		};

		const handleOnline = () => {
			scheduleRefresh();
			connectStream();
		};
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') scheduleRefresh();
		};

		window.addEventListener('online', handleOnline);
		document.addEventListener('visibilitychange', handleVisibilityChange);
		scheduleRefresh();
		connectStream();

		return () => {
			window.removeEventListener('online', handleOnline);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			closeClient();
			clearRefreshTimer();
		};
	}, [
		applyRealtimeEvent,
		publicSchoolTenantKey,
		refreshSchoolProfile,
	]);

	const contactEmail = school?.emails?.[0] ?? 'support@schoolmesh.com';
	const contactPhone = school?.phones?.[0] ?? null;
	const contactAddress = school?.address?.[0] ?? null;

	return (
		<div className="flex min-h-screen items-center justify-center bg-[#FAFBFC] px-4 py-12">
			<div className="w-full max-w-lg">
				{/* Card */}
				<div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
					{/* Icon */}
					<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
						<Ban className="h-8 w-8 text-red-500" />
					</div>

					{/* School identity */}
					{school?.logoUrl && (
						<img
							src={school.logoUrl}
							alt={school.name}
							className="mx-auto mb-3 h-10 w-10 rounded-xl object-contain"
						/>
					)}
					<h1 className="text-xl font-bold tracking-tight text-[#111827]">
						{school?.name ?? 'Your School'}
					</h1>
					<p className="mt-1 text-xs font-medium uppercase tracking-widest text-[#465fff]">
						Account Inactive
					</p>

					{/* Divider */}
					<div className="my-6 h-px bg-gray-100" />

					{/* Message */}
					<p className="text-sm leading-relaxed text-gray-500">
						This school account has been deactivated. All platform features
						are currently unavailable. Please reach out to your administrator
						or our support team to restore access.
					</p>

					{/* Contact info */}
					<div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-5 text-left">
						<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
							Get in touch
						</p>
						<div className="space-y-3">
							<a
								href={`mailto:${contactEmail}`}
								className="flex items-center gap-3 text-sm text-gray-600 transition-colors hover:text-[#465fff]"
							>
								<Mail className="h-4 w-4 shrink-0 text-gray-400" />
								{contactEmail}
							</a>
							{contactPhone && (
								<a
									href={`tel:${contactPhone}`}
									className="flex items-center gap-3 text-sm text-gray-600 transition-colors hover:text-[#465fff]"
								>
									<Phone className="h-4 w-4 shrink-0 text-gray-400" />
									{contactPhone}
								</a>
							)}
							{contactAddress && (
								<div className="flex items-start gap-3 text-sm text-gray-600">
									<MapPin className="h-4 w-4 shrink-0 pt-0.5 text-gray-400" />
									{contactAddress}
								</div>
							)}
						</div>
					</div>

					{/* CTA */}
					<a
						href={`mailto:${contactEmail}?subject=Account%20Restoration%20Request${school?.name ? `%20%E2%80%94%20${encodeURIComponent(school.name)}` : ''}`}
						className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#465fff] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3a4fe0] focus:outline-none focus:ring-2 focus:ring-[#465fff]/30 focus:ring-offset-2"
					>
						<Mail className="h-4 w-4" />
						Contact Support
					</a>
				</div>

				{/* Footer */}
				<p className="mt-6 text-center text-xs text-gray-400">
					Powered by{' '}
					<span className="font-semibold text-gray-500">
						School<span className="text-[#465fff]">Mesh</span>
					</span>
				</p>
			</div>
		</div>
	);
}
