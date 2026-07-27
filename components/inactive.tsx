'use client';

import { useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Ably from 'ably';
import { useSchoolStore } from '@/store/schoolStore';
import {
	getAuthorizedRealtimeChannels,
	resolveTenantSyncKey,
	type RealtimeEvent,
} from '@/lib/realtimeTypes';
import {
	Mail,
	Phone,
	Globe,
	MapPin,
	Send,
	AlertCircle,
	School,
} from 'lucide-react';

const PUBLIC_SYNC_STREAM_TOKEN_ENDPOINT = '/api/sync/public-stream-token';
const PUBLIC_SYNC_REFRESH_DEBOUNCE_MS = 120;

export default function Inactive() {
	const school = useSchoolStore((state) => state.school);
	const setSchool = useSchoolStore((state) => state.setSchool);
	const applyRealtimeEvent = useSchoolStore(
		(state) => state.applyRealtimeEvent,
	);

	const publicSchoolTenantKey = useMemo(
		() =>
			resolveTenantSyncKey({
				schoolProfile: school?.system,
			}),
		[school?.system?.dbName, school?.system?.host],
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
	}, [applyRealtimeEvent, publicSchoolTenantKey, refreshSchoolProfile]);

	const schoolName = school?.identity?.name;
	const restorationSubject = `Account Restoration Request${schoolName ? ` — ${schoolName}` : ''}`;
	const mailtoHref = `mailto:amossenkao@gmail.com?subject=${encodeURIComponent(restorationSubject)}`;

	return (
		<div className="flex h-dvh items-center justify-center bg-gray-50 px-4 py-6">
			<div className="w-full max-w-[460px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
				{/* Top accent bar */}
				<div className="h-[3px] bg-gradient-to-r from-[#465fff] to-[#12b76a]" />

				<div className="p-8">
					{/* Status badge */}
					<div className="mb-5 inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-500">
						<AlertCircle className="h-3.5 w-3.5" />
						Account inactive
					</div>

					{/* Headline */}
					<h1 className="text-xl font-medium tracking-tight text-gray-900">
						This school account has been deactivated
					</h1>
					<p className="mt-1.5 text-sm leading-relaxed text-gray-500">
						All platform features are unavailable. Contact support below to
						restore access.
					</p>

					{/* School identity */}
					<div className="mt-5 flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5">
						{school?.branding?.logoUrl ? (
							<img
								src={school.branding.logoUrl}
								alt={schoolName ?? 'School logo'}
								className="h-7 w-7 rounded-md object-contain"
							/>
						) : (
							<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50">
								<School className="h-4 w-4 text-blue-500" />
							</div>
						)}
						<div>
							<p className="text-sm font-medium text-gray-900">
								{schoolName ?? 'Your School'}
							</p>
							<p className="text-xs text-gray-400">
								{school?.identity?.slogan ?? 'School Management System'}
							</p>
						</div>
					</div>

					{/* Divider */}
					<div className="my-6 border-t border-gray-100" />

					{/* Contact section */}
					<p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-gray-400">
						Contact support
					</p>
					<div className="space-y-2 mb-6">
						<a
							href={mailtoHref}
							className="flex items-center gap-2.5 text-sm text-gray-600 transition-colors hover:text-[#465fff]"
						>
							<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50">
								<Mail className="h-3.5 w-3.5 text-blue-500" />
							</span>
							amossenkao@gmail.com
						</a>
						<a
							href="tel:+231776949463"
							className="flex items-center gap-2.5 text-sm text-gray-600 transition-colors hover:text-[#465fff]"
						>
							<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-green-50">
								<Phone className="h-3.5 w-3.5 text-green-600" />
							</span>
							+231 776 949 463
						</a>
						<div className="flex items-center gap-2.5 text-sm text-gray-600">
							<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-50">
								<MapPin className="h-3.5 w-3.5 text-amber-500" />
							</span>
							Unity Town, Lower Johnsonville, Liberia
						</div>
						<a
							href="https://www.schoolmesh.net"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2.5 text-sm text-gray-600 transition-colors hover:text-[#465fff]"
						>
							<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-purple-50">
								<Globe className="h-3.5 w-3.5 text-purple-500" />
							</span>
							www.schoolmesh.net
						</a>
					</div>

					{/* CTA */}
					<a
						href={mailtoHref}
						className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#465fff] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
					>
						<Send className="h-3.5 w-3.5" />
						Request account restoration
					</a>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between border-t border-gray-100 px-8 py-3">
					<div className="flex items-center gap-1.5">
						<Image
							src="/images/SchoolMesh.png"
							alt="SchoolMesh"
							width={16}
							height={16}
							className="h-4 w-4 rounded object-contain"
						/>
						<span className="text-xs text-gray-400">
							School<span className="font-medium text-gray-500">Mesh</span>
						</span>
					</div>
					<div className="flex items-center gap-1.5 text-xs text-gray-400">
						<span className="relative flex h-1.5 w-1.5">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
							<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
						</span>
						Monitoring for restoration
					</div>
				</div>
			</div>
		</div>
	);
}
