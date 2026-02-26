'use client';

import { useCallback, useEffect, useRef } from 'react';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { useNetworkStore } from '@/store/networkStore';

const FALLBACK_SYNC_STREAM_ENDPOINT = '/api/sync/events';
const SYNC_STREAM_TOKEN_ENDPOINT = '/api/sync/stream-token';
const CLOUD_STREAM_ENDPOINT =
	typeof process !== 'undefined'
		? String(process.env.NEXT_PUBLIC_SYNC_STREAM_URL || '').trim()
		: '';
const SYNC_REFRESH_DEBOUNCE_MS = 60;
const STREAM_RETRY_BASE_MS = 1200;
const STREAM_RETRY_MAX_MS = 12000;
const SYNC_LAST_EVENT_ID_STORAGE_KEY = 'school_portal_sync_last_event_id';
const SECURITY_SYNC_REASONS = new Set([
	'account-deactivated',
	'password-changed-session-revocation',
	'password-reset',
	'user-deleted',
	'user-password-reset',
]);

type StreamEventPayload = {
	eventId?: string;
	reason?: string;
	code?: string;
	domain?: string;
	targetUserIds?: string[];
	[key: string]: unknown;
};

const parseStreamEventPayload = (raw: string): StreamEventPayload | null => {
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') return null;
		if (parsed.event && typeof parsed.event === 'object') {
			return parsed.event as StreamEventPayload;
		}
		return parsed as StreamEventPayload;
	} catch {
		return null;
	}
};

const ensureSyncEventsPath = (rawUrl: string) => {
	const url = new URL(rawUrl);
	if (!url.pathname || url.pathname === '/') {
		url.pathname = '/sync/events';
	}
	return url.toString();
};

export default function AuthProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const bootstrapAuth = useAuth((state) => state.bootstrapAuth);
	const checkAuthStatus = useAuth((state) => state.checkAuthStatus);
	const user = useAuth((state) => state.user);

	const setBrowserOnline = useNetworkStore((state) => state.setBrowserOnline);
	const markOffline = useNetworkStore((state) => state.markOffline);
	const setAuthCheckFailed = useNetworkStore(
		(state) => state.setAuthCheckFailed,
	);

	const authRefreshInFlight = useRef(false);
	const pendingAuthRefreshRef = useRef<{
		force?: boolean;
		trigger?: string;
		academicYear?: string;
	} | null>(null);
	const syncEventDebounceRef = useRef<number | null>(null);
	const syncEventSourceRef = useRef<EventSource | null>(null);
	const syncReconnectTimerRef = useRef<number | null>(null);
	const syncReconnectAttemptsRef = useRef(0);
	const lastSyncEventIdRef = useRef<string>('');

	const clearSyncReconnectTimer = useCallback(() => {
		if (syncReconnectTimerRef.current !== null) {
			window.clearTimeout(syncReconnectTimerRef.current);
			syncReconnectTimerRef.current = null;
		}
	}, []);

	const rememberLastSyncEventId = useCallback((eventId: string | undefined) => {
		const normalized = String(eventId || '').trim();
		if (!normalized) return;
		lastSyncEventIdRef.current = normalized;
		try {
			localStorage.setItem(SYNC_LAST_EVENT_ID_STORAGE_KEY, normalized);
		} catch {
			// No-op.
		}
	}, []);

	const readLastSyncEventId = useCallback(() => {
		if (lastSyncEventIdRef.current) return lastSyncEventIdRef.current;
		try {
			const saved = localStorage.getItem(SYNC_LAST_EVENT_ID_STORAGE_KEY);
			if (!saved) return '';
			lastSyncEventIdRef.current = saved;
			return saved;
		} catch {
			return '';
		}
	}, []);

	const ensureSchoolProfile = useCallback(async () => {
		const currentSchool = useSchoolStore.getState().school;
		if (currentSchool) return;
		try {
			await useSchoolStore.getState().fetchSchool();
		} catch (error) {
			console.error('[AuthProvider] Failed to fetch school profile:', error);
		}
	}, []);

	const runAuthRefresh = useCallback(
		async (options?: {
			force?: boolean;
			trigger?: string;
			academicYear?: string;
		}) => {
			if (authRefreshInFlight.current) {
				const previous = pendingAuthRefreshRef.current;
				pendingAuthRefreshRef.current = {
					force: Boolean(previous?.force) || Boolean(options?.force),
					trigger: options?.trigger || previous?.trigger,
					academicYear: options?.academicYear || previous?.academicYear,
				};
				return;
			}
			authRefreshInFlight.current = true;
			try {
				await checkAuthStatus({
					skipConnectivityCheck: true,
					force: options?.force === true,
					trigger: options?.trigger,
					academicYear: options?.academicYear,
				});
				await ensureSchoolProfile();
			} catch (error) {
				console.error('[AuthProvider] Auth refresh failed:', error);
				setAuthCheckFailed(true);
			} finally {
				authRefreshInFlight.current = false;
				const pending = pendingAuthRefreshRef.current;
				pendingAuthRefreshRef.current = null;
				if (pending) {
					void runAuthRefresh(pending);
				}
			}
		},
		[checkAuthStatus, ensureSchoolProfile, setAuthCheckFailed],
	);

	useEffect(() => {
		const runInitialBootstrap = async () => {
			try {
				await bootstrapAuth({ force: true });
				await ensureSchoolProfile();
			} catch (error) {
				console.error('[AuthProvider] Initial auth bootstrap failed:', error);
			}
		};
		void runInitialBootstrap();

		const handleOnline = () => {
			setBrowserOnline(true);
			void runAuthRefresh({ force: true, trigger: 'online' });
		};
		const handleOffline = () => {
			markOffline('browser-offline');
			setAuthCheckFailed(true);
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}, [
		bootstrapAuth,
		ensureSchoolProfile,
		markOffline,
		runAuthRefresh,
		setAuthCheckFailed,
		setBrowserOnline,
	]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (!user?.isActive) {
			syncEventSourceRef.current?.close();
			syncEventSourceRef.current = null;
			clearSyncReconnectTimer();
			if (syncEventDebounceRef.current !== null) {
				window.clearTimeout(syncEventDebounceRef.current);
				syncEventDebounceRef.current = null;
			}
			return;
		}

		const scheduleRefresh = (options?: {
			force?: boolean;
			trigger?: string;
			academicYear?: string;
		}) => {
			if (syncEventDebounceRef.current !== null) {
				window.clearTimeout(syncEventDebounceRef.current);
			}
			syncEventDebounceRef.current = window.setTimeout(() => {
				syncEventDebounceRef.current = null;
				void runAuthRefresh({
					force: options?.force === true,
					trigger: options?.trigger || 'stream-sync',
					academicYear: options?.academicYear,
				});
			}, SYNC_REFRESH_DEBOUNCE_MS);
		};

		let disposed = false;
		const closeSource = () => {
			if (syncEventSourceRef.current) {
				syncEventSourceRef.current.close();
				syncEventSourceRef.current = null;
			}
		};

		const scheduleReconnect = () => {
			clearSyncReconnectTimer();
			if (disposed) return;
			const attempt = syncReconnectAttemptsRef.current;
			const backoff = Math.min(
				STREAM_RETRY_MAX_MS,
				STREAM_RETRY_BASE_MS * 2 ** attempt,
			);
			const jitter = Math.floor(Math.random() * 250);
			syncReconnectAttemptsRef.current = attempt + 1;
			syncReconnectTimerRef.current = window.setTimeout(() => {
				syncReconnectTimerRef.current = null;
				void connectStream();
			}, backoff + jitter);
		};

		const resolveCloudSyncUrl = (path: string) => {
			const normalizedPath = String(path || '').trim() || '/sync/events';
			if (!CLOUD_STREAM_ENDPOINT) return '';
			try {
				return new URL(normalizedPath, CLOUD_STREAM_ENDPOINT).toString();
			} catch {
				return CLOUD_STREAM_ENDPOINT;
			}
		};

		const buildCloudStreamUrl = async () => {
			const response = await fetch(SYNC_STREAM_TOKEN_ENDPOINT, {
				method: 'GET',
				credentials: 'include',
				cache: 'no-store',
			});
			if (!response.ok) {
				throw new Error(`stream_token_http_${response.status}`);
			}
			const body = (await response.json().catch(() => ({}))) as {
				token?: string;
				streamUrl?: string | null;
			};
			const token = String(body.token || '').trim();
			if (!token) {
				throw new Error('stream_token_missing');
			}
			const baseUrl =
				String(body.streamUrl || '').trim() || resolveCloudSyncUrl('/sync/events');
			if (!baseUrl) {
				throw new Error('stream_url_missing');
			}
			const streamUrl = new URL(ensureSyncEventsPath(baseUrl));
			streamUrl.searchParams.set('token', token);
			const replayFrom = readLastSyncEventId();
			if (replayFrom) {
				streamUrl.searchParams.set('lastEventId', replayFrom);
			}
			return streamUrl.toString();
		};

		const connectLocalStream = () => {
			const source = new EventSource(FALLBACK_SYNC_STREAM_ENDPOINT);
			syncEventSourceRef.current = source;
			syncReconnectAttemptsRef.current = 0;
			setAuthCheckFailed(false);

			const onSync = () => {
				scheduleRefresh({ force: true, trigger: 'stream-sync' });
			};
			const onError = () => {
				if (typeof navigator !== 'undefined' && !navigator.onLine) {
					markOffline('browser-offline');
					setAuthCheckFailed(true);
				}
			};

			source.addEventListener('sync', onSync as EventListener);
			source.addEventListener('error', onError as EventListener);
		};

		const connectCloudStream = async () => {
			const streamUrl = await buildCloudStreamUrl();
			if (disposed) return;
			const source = new EventSource(streamUrl);
			syncEventSourceRef.current = source;

			const onReady = (event: Event) => {
				const messageEvent = event as MessageEvent;
				const payload = parseStreamEventPayload(messageEvent.data || '');
				rememberLastSyncEventId(messageEvent.lastEventId || payload?.eventId as string);
				setAuthCheckFailed(false);
				syncReconnectAttemptsRef.current = 0;
			};

			const onSync = (event: Event) => {
				const messageEvent = event as MessageEvent;
				const payload = parseStreamEventPayload(messageEvent.data || '');
				rememberLastSyncEventId(
					messageEvent.lastEventId || (payload?.eventId as string),
				);
				const reason = String(payload?.reason || '').trim();
				const academicYear = String(payload?.academicYear || '').trim();
				if (SECURITY_SYNC_REASONS.has(reason)) {
					void runAuthRefresh({
						force: true,
						trigger: `stream-security:${reason}`,
						academicYear,
					});
					return;
				}
				scheduleRefresh({
					force: true,
					trigger: 'stream-sync',
					academicYear,
				});
			};

			const onStreamError = (event: Event) => {
				const messageEvent = event as MessageEvent;
				const payload = parseStreamEventPayload(messageEvent.data || '');
				if (payload?.eventId) {
					rememberLastSyncEventId(String(payload.eventId));
				}
				const code = String(payload?.code || '').trim();
				if (code === 'replay_gap') {
					void runAuthRefresh({ force: true, trigger: 'stream-replay-gap' });
				}
			};

			const onError = () => {
				closeSource();
				if (disposed) return;
				if (typeof navigator !== 'undefined' && !navigator.onLine) {
					markOffline('browser-offline');
					setAuthCheckFailed(true);
					scheduleReconnect();
					return;
				}
				scheduleReconnect();
			};

			source.addEventListener('ready', onReady as EventListener);
			source.addEventListener('sync', onSync as EventListener);
			source.addEventListener('stream-error', onStreamError as EventListener);
			source.addEventListener('error', onError as EventListener);
		};

		const connectStream = async () => {
			closeSource();
			if (disposed) return;
			if (!CLOUD_STREAM_ENDPOINT) {
				connectLocalStream();
				return;
			}
			try {
				await connectCloudStream();
			} catch (error) {
				console.warn('[AuthProvider] Failed to connect cloud sync stream:', error);
				scheduleReconnect();
			}
		};

		void connectStream();

		return () => {
			disposed = true;
			clearSyncReconnectTimer();
			closeSource();
			if (syncEventDebounceRef.current !== null) {
				window.clearTimeout(syncEventDebounceRef.current);
				syncEventDebounceRef.current = null;
			}
		};
	}, [
		clearSyncReconnectTimer,
		markOffline,
		readLastSyncEventId,
		rememberLastSyncEventId,
		runAuthRefresh,
		setAuthCheckFailed,
		user?.id,
		user?.isActive,
	]);

	useEffect(() => {
		if (typeof navigator === 'undefined') return;
		if (!navigator.onLine && !user) {
			markOffline('browser-offline');
		}
	}, [markOffline, user]);

	return <>{children}</>;
}
