'use client';

import { useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Ably from 'ably';
import { motion } from 'framer-motion';
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
	MessageSquare,
	ShieldCheck,
	AlertCircle,
	ArrowRight,
	Sparkles,
} from 'lucide-react';

const PUBLIC_SYNC_STREAM_TOKEN_ENDPOINT = '/api/sync/public-stream-token';
const PUBLIC_SYNC_REFRESH_DEBOUNCE_MS = 120;

const BRAND_PRIMARY = '#465fff';
const BRAND_SECONDARY = '#12b76a';
const BRAND_ACCENT = '#f79009';

export default function Inactive() {
	const school = useSchoolStore((state) => state.school);
	const setSchool = useSchoolStore((state) => state.setSchool);
	const applyRealtimeEvent = useSchoolStore((state) => state.applyRealtimeEvent);
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
	}, [
		applyRealtimeEvent,
		publicSchoolTenantKey,
		refreshSchoolProfile,
	]);

	return (
		<div className="relative flex h-dvh items-center justify-center overflow-hidden bg-[#FAFBFC]">
			{/* Animated gradient orbs */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
				<motion.div
					className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
					style={{ background: `radial-gradient(circle, ${BRAND_PRIMARY} 0%, transparent 70%)` }}
					animate={{ x: [0, 80, 0], y: [0, -40, 0], scale: [1, 1.15, 1] }}
					transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
				/>
				<motion.div
					className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full opacity-15 blur-3xl"
					style={{ background: `radial-gradient(circle, ${BRAND_SECONDARY} 0%, transparent 70%)` }}
					animate={{ x: [0, -60, 0], y: [0, 50, 0], scale: [1, 1.1, 1] }}
					transition={{ duration: 25, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
				/>
				<motion.div
					className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-3xl"
					style={{ background: `radial-gradient(circle, ${BRAND_ACCENT} 0%, transparent 70%)` }}
					animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.18, 0.1] }}
					transition={{ duration: 15, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
				/>
			</div>

			{/* Mesh grid overlay */}
			<div className="pointer-events-none absolute inset-0 opacity-[0.03]" aria-hidden="true">
				<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
					<defs>
						<pattern id="mesh-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
							<circle cx="30" cy="30" r="1.5" fill={BRAND_PRIMARY} />
							<line x1="30" y1="30" x2="30" y2="0" stroke={BRAND_PRIMARY} strokeWidth="0.5" />
							<line x1="30" y1="30" x2="30" y2="60" stroke={BRAND_PRIMARY} strokeWidth="0.5" />
							<line x1="30" y1="30" x2="0" y2="30" stroke={BRAND_PRIMARY} strokeWidth="0.5" />
							<line x1="30" y1="30" x2="60" y2="30" stroke={BRAND_PRIMARY} strokeWidth="0.5" />
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill="url(#mesh-grid)" />
				</svg>
			</div>

			{/* Main content */}
			<div className="relative z-10 flex h-full w-full max-w-5xl flex-col items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
				{/* Main card */}
				<motion.div
					initial={{ opacity: 0, y: 30, scale: 0.96 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
					className="w-full overflow-hidden rounded-3xl border border-gray-200/60 bg-white/70 backdrop-blur-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.04),0_20px_40px_-8px_rgba(0,0,0,0.08)] sm:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.04),0_30px_60px_-10px_rgba(0,0,0,0.10)]"
				>
					{/* Top accent bar */}
					<div className="h-1 bg-gradient-to-r from-[#465fff] via-[#12b76a] to-[#f79009]" />

					<div className="grid lg:grid-cols-2">
						{/* Left: Info panel */}
						<div className="relative flex flex-col p-6 sm:p-8 lg:p-10">
							{/* Decorative corner accent */}
							<div className="absolute top-0 right-0 h-20 w-20 overflow-hidden rounded-br-3xl" aria-hidden="true">
								<div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-[#465fff]/10 to-transparent" />
							</div>

							<motion.div
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
								className="flex-1"
							>
								{/* Icon cluster */}
								<div className="mb-4 flex items-center gap-3">
									<div className="relative">
										<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/50">
											<AlertCircle className="h-6 w-6 text-red-400" />
										</div>
										<div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-400 border-2 border-white">
											<span className="text-[8px] font-bold text-white">!</span>
										</div>
									</div>
									<div>
										<h1 className="text-xl font-bold tracking-tight text-[#111827] sm:text-2xl">
											Account Inactive
										</h1>
										<p className="mt-0.5 text-xs font-medium text-red-400">
											This school account has been deactivated
										</p>
									</div>
								</div>

								{/* Message */}
								<p className="text-sm leading-relaxed text-gray-500">
									All platform features are currently unavailable. Please reach out to our
									support team to restore access.
								</p>

								{/* School identity */}
							{school?.identity?.name && (
								<div className="mt-4 flex items-center gap-3 rounded-xl bg-gray-50/80 px-4 py-2.5">
									{school.branding?.logoUrl && (
										<img
											src={school.branding.logoUrl}
											alt={school.identity.name}
											className="h-7 w-7 rounded-lg object-contain"
										/>
									)}
									<div>
										<p className="text-sm font-semibold text-[#111827]">{school.identity.name}</p>
										<p className="text-xs text-gray-400">{school.identity?.slogan || 'School Management System'}</p>
										</div>
									</div>
								)}
							</motion.div>

							{/* Contact info */}
							<motion.div
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.35, duration: 0.6, ease: 'easeOut' }}
								className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-4"
							>
								<p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
									Contact Support
								</p>
								<div className="space-y-2">
									<a
										href="mailto:amossenkao@gmail.com?subject=Account%20Restoration%20Request"
										className="flex items-center gap-2.5 text-xs text-gray-600 transition-colors hover:text-[#465fff]"
									>
										<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#465fff]/10 text-[#465fff]">
											<Mail className="h-3 w-3" />
										</div>
										amossenkao@gmail.com
									</a>
									<a
										href="tel:+231776949463"
										className="flex items-center gap-2.5 text-xs text-gray-600 transition-colors hover:text-[#465fff]"
									>
										<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#12b76a]/10 text-[#12b76a]">
											<Phone className="h-3 w-3" />
										</div>
										+231 776 949 463
									</a>
									<div className="flex items-center gap-2.5 text-xs text-gray-600">
										<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f79009]/10 text-[#f79009]">
											<MapPin className="h-3 w-3" />
										</div>
										Unity Town, Lower Johnsonville, Liberia
									</div>
									<a
										href="https://www.schoolmesh.net"
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2.5 text-xs text-gray-600 transition-colors hover:text-[#465fff]"
									>
										<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#8b5cf6]/10 text-[#8b5cf6]">
											<Globe className="h-3 w-3" />
										</div>
										www.schoolmesh.net
									</a>
								</div>
							</motion.div>

							{/* CTA */}
							<motion.div
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
								className="mt-4"
							>
								<a
									href={`mailto:amossenkao@gmail.com?subject=Account%20Restoration%20Request${school?.identity?.name ? `%20%E2%80%94%20${encodeURIComponent(school.identity.name)}` : ''}`}
									className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#465fff] to-[#465fff]/90 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#465fff]/25 transition-all hover:shadow-xl hover:shadow-[#465fff]/30 hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-[#465fff]/40 focus:ring-offset-2"
								>
									<MessageSquare className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
									Contact Support
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
								</a>
							</motion.div>
						</div>

						{/* Right: Team panel */}
						<div className="relative flex flex-col border-t border-gray-100 bg-gradient-to-br from-gray-50/80 to-gray-100/40 p-6 sm:p-8 lg:p-10 lg:border-t-0 lg:border-l">
							{/* Decorative dot pattern */}
							<div className="absolute inset-0 opacity-[0.02]" aria-hidden="true">
								<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
									<defs>
										<pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
											<circle cx="2" cy="2" r="1" fill={BRAND_PRIMARY} />
										</pattern>
									</defs>
									<rect width="100%" height="100%" fill="url(#dots)" />
								</svg>
							</div>

							<div className="relative z-10 flex flex-1 flex-col">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
								>
									<h2 className="text-base font-bold tracking-tight text-[#111827] sm:text-lg">
										SchoolMesh Support
									</h2>
									<p className="mt-0.5 text-xs text-gray-500">
										Our team is ready to help you restore access.
									</p>
								</motion.div>

								{/* Lead Engineer card */}
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
									className="mt-5"
								>
									<p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
										Lead Engineer
									</p>
									<a
										href="mailto:amossenkao@gmail.com"
										className="mt-2 group flex items-center gap-3 rounded-xl border border-gray-200/60 bg-white/60 px-4 py-3 backdrop-blur-sm transition-all hover:border-[#465fff]/30 hover:bg-white hover:shadow-md"
									>
										<div
											className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
											style={{ background: BRAND_PRIMARY }}
										>
											<Sparkles className="h-4 w-4" />
										</div>
										<div className="min-w-0">
											<p className="text-sm font-medium text-[#111827] group-hover:text-[#465fff]">
												Amos Senkao
											</p>
											<p className="text-xs text-gray-400">Founder & Lead Engineer</p>
										</div>
									</a>
								</motion.div>

								{/* Features list */}
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.55, duration: 0.6, ease: 'easeOut' }}
									className="mt-6"
								>
									<p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
										Platform Features
									</p>
									<div className="mt-2.5 grid grid-cols-2 gap-2">
										{[
											{ icon: ShieldCheck, label: 'Secure', color: BRAND_SECONDARY },
											{ icon: Globe, label: 'Multi-Tenant', color: BRAND_ACCENT },
										].map((feature) => (
											<div
												key={feature.label}
												className="flex items-center gap-2 rounded-xl border border-gray-200/50 bg-white/50 px-3 py-2 backdrop-blur-sm"
											>
												<div
													className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
													style={{ background: `${feature.color}15`, color: feature.color }}
												>
													<feature.icon className="h-3 w-3" />
												</div>
												<span className="text-[11px] font-medium text-gray-600">{feature.label}</span>
											</div>
										))}
									</div>
								</motion.div>

								{/* Status indicator */}
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 0.7, duration: 0.6 }}
									className="mt-auto pt-6 flex items-center gap-2 text-[11px] text-gray-400"
								>
									<div className="flex h-2 w-2 items-center justify-center">
										<span className="relative flex h-2 w-2">
											<span className="absolute inline-flex h-full w-full rounded-full bg-[#12b76a] opacity-75 animate-ping" />
											<span className="relative inline-flex rounded-full h-2 w-2 bg-[#12b76a]" />
										</span>
									</div>
									Monitoring for connectivity restoration…
								</motion.div>
							</div>
						</div>
					</div>
				</motion.div>

				{/* Footer */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.8, duration: 0.6, ease: 'easeOut' }}
					className="mt-5 flex flex-col items-center gap-1.5"
				>
					<div className="flex items-center gap-2">
						<Image
							src="/images/SchoolMesh.png"
							alt="SchoolMesh"
							width={20}
							height={20}
							className="h-5 w-5 rounded object-contain"
						/>
						<p className="text-center text-xs text-gray-400">
							Powered by{' '}
							<span className="font-semibold text-gray-500">
								School<span style={{ color: BRAND_PRIMARY }}>Mesh</span>
							</span>
						</p>
					</div>
					<p className="text-center text-[10px] text-gray-300">
						© {new Date().getFullYear()} SchoolMesh. All rights reserved.
					</p>
				</motion.div>
			</div>
		</div>
	);
}
