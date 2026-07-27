'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Ably from 'ably';
import type { RealtimeEvent } from '@/lib/realtimeTypes';
import { getSchoolRealtimeChannel } from '@/lib/realtimeTypes';

const SUPERADMIN_SYNC_TOKEN_ENDPOINT = '/api/school/sync-token';
const SUPERADMIN_BROADCAST_CHANNEL = 'superadmin:broadcast';
const RECONNECT_DELAY_MS = 5000;

export function useSuperadminRealtime(options: {
	schoolHosts?: string[];
	schoolTenantIds?: string[];
	onEvent?: (event: RealtimeEvent) => void;
}) {
	const { schoolHosts = [], schoolTenantIds = [], onEvent } = options;
	const [connected, setConnected] = useState(false);
	const [reconnectTrigger, setReconnectTrigger] = useState(0);
	const clientRef = useRef<Ably.Realtime | null>(null);
	const subscriptionsRef = useRef<Array<() => void>>([]);
	const onEventRef = useRef(onEvent);
	onEventRef.current = onEvent;
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const closeClient = useCallback(() => {
		subscriptionsRef.current.forEach((unsub) => unsub());
		subscriptionsRef.current = [];
		if (clientRef.current) {
			try { clientRef.current.close(); } catch {}
			clientRef.current = null;
		}
		setConnected(false);
	}, []);

	const scheduleReconnect = useCallback((delay: number) => {
		if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
		reconnectTimerRef.current = setTimeout(() => {
			reconnectTimerRef.current = null;
			setReconnectTrigger((n) => n + 1);
		}, delay);
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const client = new Ably.Realtime({
			authUrl: SUPERADMIN_SYNC_TOKEN_ENDPOINT,
			authMethod: 'GET',
		});
		clientRef.current = client;

		const handleEvent = (event: RealtimeEvent) => {
			console.log('[superadmin-realtime] Event received:', event.type, event.payload?.reason, event.tenantId);
			onEventRef.current?.(event);
		};

		const subscribeToChannel = (channelName: string) => {
			const channel = client.channels.get(channelName);
			const listener = (message: any) => {
				const event = message?.data as RealtimeEvent | undefined;
				if (!event || typeof event.type !== 'string' || typeof event.tenantId !== 'string') {
					console.warn('[superadmin-realtime] Invalid event on channel:', channelName, message?.data);
					return;
				}
				handleEvent(event);
			};
			channel.subscribe(listener);
			subscriptionsRef.current.push(() => channel.unsubscribe(listener));
		};

		// Always subscribe to the superadmin broadcast channel
		subscribeToChannel(SUPERADMIN_BROADCAST_CHANNEL);

		// Subscribe to individual school channels.
		// resolvePublishChannels publishes on school:{tenantId} where tenantId
		// is resolved by resolveTenantSyncKey (prioritizes dbName over host).
		// Subscribe to both host and tenantId channels so we receive events
		// regardless of which identifier the server resolved.
		const allIdentifiers = Array.from(
			new Set([...schoolHosts, ...schoolTenantIds].filter(Boolean)),
		);
		allIdentifiers.forEach((id) => {
			subscribeToChannel(getSchoolRealtimeChannel(id));
		});

		client.connection.on('connected', () => {
			console.log('[superadmin-realtime] Connected. Subscribed channels:', SUPERADMIN_BROADCAST_CHANNEL, ...allIdentifiers.map(getSchoolRealtimeChannel));
			setConnected(true);
		});

		client.connection.on('failed', () => {
			console.warn('[superadmin-realtime] Connection failed, scheduling reconnect');
			setConnected(false);
			scheduleReconnect(RECONNECT_DELAY_MS);
		});

		client.connection.on('suspended', () => {
			console.warn('[superadmin-realtime] Connection suspended, scheduling reconnect');
			setConnected(false);
			scheduleReconnect(RECONNECT_DELAY_MS * 2);
		});

		return () => {
			if (reconnectTimerRef.current) {
				clearTimeout(reconnectTimerRef.current);
				reconnectTimerRef.current = null;
			}
			closeClient();
		};
	}, [schoolHosts.join(','), schoolTenantIds.join(','), closeClient, scheduleReconnect, reconnectTrigger]);

	return { connected };
}
