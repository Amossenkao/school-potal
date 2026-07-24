'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Ably from 'ably';
import type { RealtimeEvent } from '@/lib/realtimeTypes';
import { getSchoolRealtimeChannel } from '@/lib/realtimeTypes';

const SUPERADMIN_SYNC_TOKEN_ENDPOINT = '/api/superadmin/sync-token';
const SUPERADMIN_BROADCAST_CHANNEL = 'superadmin:broadcast';

export function useSuperadminRealtime(options: {
	schoolHosts?: string[];
	onEvent?: (event: RealtimeEvent) => void;
}) {
	const { schoolHosts = [], onEvent } = options;
	const [connected, setConnected] = useState(false);
	const clientRef = useRef<Ably.Realtime | null>(null);
	const subscriptionsRef = useRef<Array<() => void>>([]);
	const onEventRef = useRef(onEvent);
	onEventRef.current = onEvent;

	const closeClient = useCallback(() => {
		subscriptionsRef.current.forEach((unsub) => unsub());
		subscriptionsRef.current = [];
		if (clientRef.current) {
			try { clientRef.current.close(); } catch {}
			clientRef.current = null;
		}
		setConnected(false);
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

		// Subscribe to individual school channels
		const uniqueHosts = Array.from(new Set(schoolHosts.filter(Boolean)));
		uniqueHosts.forEach((host) => {
			subscribeToChannel(getSchoolRealtimeChannel(host));
		});

		client.connection.on('connected', () => {
			console.log('[superadmin-realtime] Connected. Subscribed channels:', SUPERADMIN_BROADCAST_CHANNEL, ...uniqueHosts.map(getSchoolRealtimeChannel));
			setConnected(true);
		});

		client.connection.on('failed', () => {
			console.warn('[superadmin-realtime] Connection failed');
			setConnected(false);
		});

		client.connection.on('suspended', () => {
			console.warn('[superadmin-realtime] Connection suspended');
			setConnected(false);
		});

		return () => {
			closeClient();
		};
	}, [schoolHosts.join(','), closeClient]);

	return { connected };
}
