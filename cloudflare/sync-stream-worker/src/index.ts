import { DurableObject } from 'cloudflare:workers';
import { verifyStreamToken } from './token';

export interface Env {
	UPSTASH_REDIS_REST_URL: string;
	UPSTASH_REDIS_REST_TOKEN: string;
	SYNC_STREAM_JWT_SECRET: string;
	SYNC_STREAM_HUB: DurableObjectNamespace;
	SYNC_STREAM_REPLAY_LIMIT?: string;
	SYNC_STREAM_DEBUG_LOGS?: string;
}

const encoder = new TextEncoder();

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, Last-Event-ID',
} as const;

const SSE_HEADERS = {
	'Content-Type': 'text/event-stream; charset=utf-8',
	'Cache-Control': 'no-cache, no-transform',
	Connection: 'keep-alive',
	'X-Accel-Buffering': 'no',
	...CORS_HEADERS,
} as const;

const KEEP_ALIVE_MS = 25_000;
const DEFAULT_REPLAY_LIMIT = 300;
const MIN_REPLAY_LIMIT = 50;
const MAX_REPLAY_LIMIT = 2000;
const DEBUG_TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on', 'debug']);

const isWorkerDebugEnabled = (env: Env) =>
	DEBUG_TRUTHY_VALUES.has(String(env.SYNC_STREAM_DEBUG_LOGS || '').trim().toLowerCase());

const workerDebugLog = (
	env: Env,
	scope: string,
	message: string,
	data?: Record<string, unknown>,
) => {
	if (!isWorkerDebugEnabled(env)) return;
	if (data) {
		console.log(`[sync-stream-worker][${scope}] ${message}`, data);
		return;
	}
	console.log(`[sync-stream-worker][${scope}] ${message}`);
};

const workerDebugWarn = (
	env: Env,
	scope: string,
	message: string,
	data?: Record<string, unknown>,
) => {
	if (!isWorkerDebugEnabled(env)) return;
	if (data) {
		console.warn(`[sync-stream-worker][${scope}] ${message}`, data);
		return;
	}
	console.warn(`[sync-stream-worker][${scope}] ${message}`);
};

const normalizePositiveInteger = (
	value: string | number | undefined,
	fallback: number,
	min: number,
	max: number,
) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.min(max, Math.max(min, Math.floor(parsed)));
};

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			...CORS_HEADERS,
		},
	});

const normalizeEventId = (value: string | null) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return 0;
	return Math.floor(parsed);
};

const normalizeChannelName = (channel: unknown) =>
	String(channel || '')
		.trim()
		.toLowerCase();

const toTokenFromRequest = (request: Request, url: URL) => {
	const tokenFromQuery = String(url.searchParams.get('token') || '').trim();
	if (tokenFromQuery) return tokenFromQuery;
	const authHeader = String(request.headers.get('authorization') || '').trim();
	if (!authHeader.toLowerCase().startsWith('bearer ')) return '';
	return authHeader.slice('bearer '.length).trim();
};

const parseJsonValue = (value: string) => {
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
};

const parseJsonRecord = (value: string) => {
	const parsed = parseJsonValue(value);
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		return null;
	}
	return parsed as Record<string, unknown>;
};

const parseUpstashFrame = (value: string) => {
	const firstComma = value.indexOf(',');
	if (firstComma < 0) return null;
	const secondComma = value.indexOf(',', firstComma + 1);
	if (secondComma < 0) return null;

	const kind = value.slice(0, firstComma).trim().toLowerCase();
	const channel = normalizeChannelName(value.slice(firstComma + 1, secondComma));
	const payload = value.slice(secondComma + 1);

	if (!kind || !channel) return null;
	return { kind, channel, payload };
};

const buildSyncPayload = (record: ReplayRecord) => ({
	channel: record.channel,
	event: record.event,
	ts: record.ts,
});

type ClientConnection = {
	id: string;
	userId: string;
	tenantKey: string;
	channels: Set<string>;
	writer: WritableStreamDefaultWriter<Uint8Array>;
	closed: boolean;
};

type ReplayRecord = {
	id: string;
	channel: string;
	event: Record<string, unknown>;
	ts: number;
};

type ChannelSubscription = {
	channel: string;
	clientIds: Set<string>;
	running: boolean;
	abortController: AbortController | null;
	reconnectTimer: ReturnType<typeof setTimeout> | null;
};

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);
		workerDebugLog(env, 'http', 'Incoming request.', {
			method: request.method,
			path: url.pathname,
		});
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: CORS_HEADERS,
			});
		}

		if (url.pathname === '/health') {
			return jsonResponse({ ok: true, at: new Date().toISOString() }, 200);
		}

		if (url.pathname !== '/sync/events' || request.method !== 'GET') {
			return jsonResponse({ success: false, message: 'Not found' }, 404);
		}

		const secret = String(env.SYNC_STREAM_JWT_SECRET || '').trim();
		if (!secret) {
			return jsonResponse(
				{
					success: false,
					message: 'SYNC_STREAM_JWT_SECRET is missing.',
				},
				500,
			);
		}

		const token = toTokenFromRequest(request, url);
		if (!token) {
			workerDebugWarn(env, 'auth', 'Missing stream token.');
			return jsonResponse(
				{
					success: false,
					message: 'Missing stream token.',
				},
				401,
			);
		}

		const verification = await verifyStreamToken(token, secret);
		if (!verification.valid) {
			workerDebugWarn(env, 'auth', 'Invalid stream token.', {
				reason: verification.reason,
			});
			return jsonResponse(
				{
					success: false,
					message: 'Invalid stream token.',
					reason: verification.reason,
				},
				401,
			);
		}

		const payload = verification.payload;
		const channels = Array.from(
			new Set(
				payload.channels
					.map((channel) => normalizeChannelName(channel))
					.filter(Boolean),
			),
		);
		if (channels.length === 0) {
			workerDebugWarn(env, 'auth', 'Token had no channels.');
			return jsonResponse(
				{
					success: false,
					message: 'No channels available in token.',
				},
				401,
			);
		}

		const durableObjectId = env.SYNC_STREAM_HUB.idFromName(
			`tenant:${payload.tenantKey}`,
		);
		const stub = env.SYNC_STREAM_HUB.get(durableObjectId);

		const connectUrl = new URL('https://sync.stream.internal/connect');
		const lastEventIdFromQuery = String(url.searchParams.get('lastEventId') || '').trim();
		if (lastEventIdFromQuery) {
			connectUrl.searchParams.set('lastEventId', lastEventIdFromQuery);
		}

		const headers = new Headers();
		headers.set('x-sync-user-id', payload.userId);
		headers.set('x-sync-tenant-key', payload.tenantKey);
		headers.set('x-sync-channels', JSON.stringify(channels));

		const lastEventIdHeader = String(request.headers.get('last-event-id') || '').trim();
		if (lastEventIdHeader) {
			headers.set('last-event-id', lastEventIdHeader);
		}
		workerDebugLog(env, 'connect', 'Proxying stream connect to Durable Object.', {
			tenantKey: payload.tenantKey,
			userId: payload.userId,
			channelCount: channels.length,
			lastEventIdFromQuery: lastEventIdFromQuery || null,
			lastEventIdFromHeader: lastEventIdHeader || null,
		});

		return stub.fetch(
			new Request(connectUrl.toString(), {
				method: 'GET',
				headers,
			}),
		);
	},
} satisfies ExportedHandler<Env>;

export class SyncStreamHub extends DurableObject<Env> {
	private clients = new Map<string, ClientConnection>();
	private channelSubscriptions = new Map<string, ChannelSubscription>();
	private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
	private replayLimit: number;
	private initialized: Promise<void>;
	private lastSequence = 0;
	private minSequence = 1;
	private debugEnabled: boolean;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.debugEnabled = isWorkerDebugEnabled(env);
		this.replayLimit = normalizePositiveInteger(
			env.SYNC_STREAM_REPLAY_LIMIT,
			DEFAULT_REPLAY_LIMIT,
			MIN_REPLAY_LIMIT,
			MAX_REPLAY_LIMIT,
		);
		this.initialized = this.hydrateReplayState();
	}

	private log(scope: string, message: string, data?: Record<string, unknown>) {
		if (!this.debugEnabled) return;
		if (data) {
			console.log(`[sync-stream-do][${scope}] ${message}`, data);
			return;
		}
		console.log(`[sync-stream-do][${scope}] ${message}`);
	}

	private warn(scope: string, message: string, data?: Record<string, unknown>) {
		if (!this.debugEnabled) return;
		if (data) {
			console.warn(`[sync-stream-do][${scope}] ${message}`, data);
			return;
		}
		console.warn(`[sync-stream-do][${scope}] ${message}`);
	}

	override async fetch(request: Request): Promise<Response> {
		try {
			await this.initialized;
			const url = new URL(request.url);

			if (request.method === 'OPTIONS') {
				return new Response(null, { status: 204, headers: CORS_HEADERS });
			}

			if (url.pathname !== '/connect' || request.method !== 'GET') {
				return jsonResponse({ success: false, message: 'Not found' }, 404);
			}

			return this.handleConnect(request, url);
		} catch (error) {
			this.warn('fetch', 'Durable Object fetch failed.', {
				error: error instanceof Error ? error.message : String(error),
			});
			return jsonResponse(
				{
					success: false,
					message: 'Sync stream hub failure.',
				},
				500,
			);
		}
	}

	private async hydrateReplayState() {
		const [storedLastSeq, storedMinSeq] = await Promise.all([
			this.ctx.storage.get<number>('meta:lastSeq'),
			this.ctx.storage.get<number>('meta:minSeq'),
		]);
		this.lastSequence = Number.isFinite(storedLastSeq as number)
			? Number(storedLastSeq)
			: 0;
		this.minSequence = Number.isFinite(storedMinSeq as number)
			? Math.max(1, Number(storedMinSeq))
			: Math.max(1, this.lastSequence - this.replayLimit + 1);
		this.log('state', 'Hydrated replay state.', {
			lastSequence: this.lastSequence,
			minSequence: this.minSequence,
			replayLimit: this.replayLimit,
		});
	}

	private startKeepAliveIfNeeded() {
		if (this.keepAliveTimer || this.clients.size === 0) return;
		this.keepAliveTimer = setInterval(() => {
			void this.sendKeepAliveToAll();
		}, KEEP_ALIVE_MS);
	}

	private stopKeepAliveIfIdle() {
		if (this.clients.size > 0 || !this.keepAliveTimer) return;
		clearInterval(this.keepAliveTimer);
		this.keepAliveTimer = null;
	}

	private async sendKeepAliveToAll() {
		const chunk = `: keepalive ${Date.now()}\n\n`;
		const writes = Array.from(this.clients.values()).map((client) =>
			this.writeRaw(client, chunk),
		);
		await Promise.allSettled(writes);
	}

	private async writeRaw(client: ClientConnection, chunk: string) {
		if (client.closed) return;
		try {
			await client.writer.write(encoder.encode(chunk));
		} catch {
			await this.disconnectClient(client.id);
		}
	}

	private async sendSseEvent(
		client: ClientConnection,
		eventName: string,
		payload: Record<string, unknown>,
		sseId?: string,
	) {
		let chunk = '';
		if (sseId) chunk += `id: ${sseId}\n`;
		chunk += `event: ${eventName}\n`;
		chunk += `data: ${JSON.stringify(payload)}\n\n`;
		await this.writeRaw(client, chunk);
	}

	private async broadcastToClients(
		predicate: (client: ClientConnection) => boolean,
		eventName: string,
		payload: Record<string, unknown>,
		sseId?: string,
	) {
		const targets = Array.from(this.clients.values()).filter(predicate);
		if (targets.length === 0) return;
		const writes = targets.map((client) =>
			this.sendSseEvent(client, eventName, payload, sseId),
		);
		await Promise.allSettled(writes);
	}

	private async handleConnect(request: Request, url: URL) {
		const userId = String(request.headers.get('x-sync-user-id') || '').trim();
		const tenantKey = String(request.headers.get('x-sync-tenant-key') || '').trim();
		const channelsHeader = String(request.headers.get('x-sync-channels') || '').trim();
		const channelsRaw = channelsHeader ? parseJsonValue(channelsHeader) : null;
		const channels = Array.isArray(channelsRaw)
			? channelsRaw
					.map((channel) => normalizeChannelName(channel))
					.filter(Boolean)
			: [];

		if (!userId || !tenantKey || channels.length === 0) {
			return jsonResponse(
				{
					success: false,
					message: 'Missing stream claims.',
				},
				401,
			);
		}

		const requestedLastEventId = normalizeEventId(
			url.searchParams.get('lastEventId') || request.headers.get('last-event-id'),
		);

		const stream = new TransformStream<Uint8Array, Uint8Array>();
		const writer = stream.writable.getWriter();
		const clientId = crypto.randomUUID();
		const connection: ClientConnection = {
			id: clientId,
			userId,
			tenantKey,
			channels: new Set(channels),
			writer,
			closed: false,
		};
		this.clients.set(clientId, connection);
		this.log('connect', 'Client connected.', {
			clientId,
			userId,
			tenantKey,
			channels,
			requestedLastEventId,
			clientCount: this.clients.size,
		});

		for (const channel of connection.channels) {
			this.addClientToChannel(channel, clientId);
		}
		this.startKeepAliveIfNeeded();

		const bootstrapClient = async () => {
			if (requestedLastEventId > 0) {
				await this.replayMissedEvents(connection, requestedLastEventId);
			}

			await this.sendSseEvent(
				connection,
				'ready',
				{
					tenantKey,
					userId,
					channels,
					connectedAt: new Date().toISOString(),
				},
				this.lastSequence > 0 ? String(this.lastSequence) : undefined,
			);
		};
		void bootstrapClient().catch((error) => {
			this.warn('connect', 'Failed to bootstrap client stream.', {
				clientId,
				error: error instanceof Error ? error.message : String(error),
			});
			void this.disconnectClient(clientId);
		});

		request.signal.addEventListener(
			'abort',
			() => {
				void this.disconnectClient(clientId);
			},
			{ once: true },
		);

		return new Response(stream.readable, {
			headers: SSE_HEADERS,
		});
	}

	private async replayMissedEvents(connection: ClientConnection, lastSeenId: number) {
		if (this.lastSequence <= 0 || lastSeenId >= this.lastSequence) return;
		this.log('replay', 'Replaying missed events.', {
			clientId: connection.id,
			lastSeenId,
			lastSequence: this.lastSequence,
			minSequence: this.minSequence,
		});
		if (lastSeenId < this.minSequence - 1) {
			this.warn('replay', 'Replay gap detected.', {
				clientId: connection.id,
				lastSeenId,
				minSequence: this.minSequence,
				lastSequence: this.lastSequence,
			});
			await this.sendSseEvent(connection, 'stream-error', {
				code: 'replay_gap',
				message: 'Replay gap detected. Client should force a full sync.',
				minAvailableEventId: this.minSequence,
				lastKnownEventId: this.lastSequence,
			});
		}

		const start = Math.max(this.minSequence, lastSeenId + 1);
		for (let sequence = start; sequence <= this.lastSequence; sequence += 1) {
			const record = await this.ctx.storage.get<ReplayRecord>(`event:${sequence}`);
			if (!record) continue;
			if (!connection.channels.has(record.channel)) continue;
			await this.sendSseEvent(
				connection,
				'sync',
				buildSyncPayload(record),
				record.id,
			);
		}
	}

	private addClientToChannel(channel: string, clientId: string) {
		let subscription = this.channelSubscriptions.get(channel);
		if (!subscription) {
			subscription = {
				channel,
				clientIds: new Set(),
				running: true,
				abortController: null,
				reconnectTimer: null,
			};
			this.channelSubscriptions.set(channel, subscription);
			void this.runChannelSubscriptionLoop(channel);
		}
		subscription.clientIds.add(clientId);
	}

	private removeClientFromChannel(channel: string, clientId: string) {
		const subscription = this.channelSubscriptions.get(channel);
		if (!subscription) return;
		subscription.clientIds.delete(clientId);
		if (subscription.clientIds.size > 0) return;

		subscription.running = false;
		if (subscription.abortController) {
			subscription.abortController.abort();
			subscription.abortController = null;
		}
		if (subscription.reconnectTimer) {
			clearTimeout(subscription.reconnectTimer);
			subscription.reconnectTimer = null;
		}
		this.channelSubscriptions.delete(channel);
	}

	private async disconnectClient(clientId: string) {
		const connection = this.clients.get(clientId);
		if (!connection || connection.closed) return;
		connection.closed = true;
		this.clients.delete(clientId);
		for (const channel of connection.channels) {
			this.removeClientFromChannel(channel, clientId);
		}
		try {
			await connection.writer.close();
		} catch {
			// Stream already closed.
		}
		this.stopKeepAliveIfIdle();
		this.log('connect', 'Client disconnected.', {
			clientId,
			remainingClients: this.clients.size,
		});
	}

	private async runChannelSubscriptionLoop(channel: string) {
		let attempt = 0;
		while (true) {
			const subscription = this.channelSubscriptions.get(channel);
			if (!subscription || !subscription.running) return;
			const controller = new AbortController();
			subscription.abortController = controller;
			try {
				const subscribeUrl = `${this.env.UPSTASH_REDIS_REST_URL.replace(/\/+$/g, '')}/subscribe/${encodeURIComponent(channel)}`;
				const response = await fetch(subscribeUrl, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${this.env.UPSTASH_REDIS_REST_TOKEN}`,
					},
					signal: controller.signal,
				});
				if (!response.ok || !response.body) {
					throw new Error(`upstash_subscribe_http_${response.status}`);
				}
				this.log('upstash', 'Subscribed to channel.', { channel });
				attempt = 0;
				await this.consumeUpstashSse(response.body, channel, controller.signal);
			} catch (error) {
				if (controller.signal.aborted) return;
				this.warn('upstash', 'Subscription loop error.', {
					channel,
					error: error instanceof Error ? error.message : String(error),
				});
				await this.broadcastChannelError(channel, error);
			} finally {
				subscription.abortController = null;
			}

			const activeSubscription = this.channelSubscriptions.get(channel);
			if (!activeSubscription || !activeSubscription.running) return;

			const backoff = Math.min(10_000, 1_000 * 2 ** attempt);
			const jitter = Math.floor(Math.random() * 220);
			const delay = backoff + jitter;
			attempt += 1;
			this.log('upstash', 'Scheduling channel resubscribe.', {
				channel,
				attempt,
				delay,
			});
			await new Promise<void>((resolve) => {
				activeSubscription.reconnectTimer = setTimeout(() => {
					activeSubscription.reconnectTimer = null;
					resolve();
				}, delay);
			});
		}
	}

	private async consumeUpstashSse(
		body: ReadableStream<Uint8Array>,
		channel: string,
		signal: AbortSignal,
	) {
		const reader = body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let eventType = 'message';
		let eventId = '';
		let dataLines: string[] = [];

		const flush = async () => {
			if (dataLines.length === 0) {
				eventType = 'message';
				eventId = '';
				return;
			}
			const payload = dataLines.join('\n');
			dataLines = [];
			const currentType = eventType;
			eventType = 'message';
			const currentId = eventId;
			eventId = '';
			await this.handleUpstashEvent({
				channel,
				eventType: currentType,
				eventId: currentId,
				data: payload,
			});
		};

		while (!signal.aborted) {
			const { done, value } = await reader.read();
			if (done) {
				await flush();
				break;
			}

			buffer += decoder.decode(value, { stream: true });
			let lineBreakIndex = buffer.indexOf('\n');
			while (lineBreakIndex >= 0) {
				const rawLine = buffer.slice(0, lineBreakIndex);
				buffer = buffer.slice(lineBreakIndex + 1);
				const line = rawLine.replace(/\r$/, '');

				if (!line) {
					await flush();
				} else if (line.startsWith(':')) {
					// Keepalive comment from upstream.
				} else if (line.startsWith('event:')) {
					eventType = line.slice('event:'.length).trim() || 'message';
				} else if (line.startsWith('id:')) {
					eventId = line.slice('id:'.length).trim();
				} else if (line.startsWith('data:')) {
					dataLines.push(line.slice('data:'.length).trimStart());
				}

				lineBreakIndex = buffer.indexOf('\n');
			}
		}
	}

	private async handleUpstashEvent(params: {
		channel: string;
		eventType: string;
		eventId: string;
		data: string;
	}) {
		if (!params.data) return;
		let channel = params.channel;
		let messagePayload: unknown = null;

		const parsedFrame = parseUpstashFrame(params.data);
		if (parsedFrame) {
			channel = parsedFrame.channel || channel;
			if (parsedFrame.kind !== 'message') {
				// Ignore subscribe/unsubscribe/pong control frames.
				return;
			}
			messagePayload = parsedFrame.payload;
		} else {
			const parsedEnvelope = parseJsonRecord(params.data);
			messagePayload = parsedEnvelope;
			if (
				parsedEnvelope &&
				Object.prototype.hasOwnProperty.call(parsedEnvelope, 'channel')
			) {
				channel = normalizeChannelName(parsedEnvelope.channel) || channel;
			}
			if (
				parsedEnvelope &&
				Object.prototype.hasOwnProperty.call(parsedEnvelope, 'message')
			) {
				messagePayload = parsedEnvelope.message;
			}
		}

		if (typeof messagePayload === 'string') {
			const nestedRecord = parseJsonRecord(messagePayload);
			if (nestedRecord) {
				messagePayload = nestedRecord;
			} else {
				const nestedValue = parseJsonValue(messagePayload);
				messagePayload = nestedValue ?? messagePayload;
			}
		}
		if (!messagePayload || typeof messagePayload !== 'object' || Array.isArray(messagePayload)) {
			return;
		}

		const event = { ...(messagePayload as Record<string, unknown>) };
		if (!event.eventId) {
			event.eventId = crypto.randomUUID();
		}
		if (!event.ts) {
			event.ts = Date.now();
		}

		const replayRecord: ReplayRecord = {
			id: String(++this.lastSequence),
			channel,
			event,
			ts: Date.now(),
		};
		this.log('event', 'Received upstream event.', {
			channel,
			replayId: replayRecord.id,
			eventId: String(event.eventId || ''),
			type: String(event.type || ''),
			reason: String(event.reason || ''),
		});

		await this.persistReplayRecord(replayRecord);
		await this.broadcastToClients(
			(client) => client.channels.has(channel),
			'sync',
			buildSyncPayload(replayRecord),
			replayRecord.id,
		);
	}

	private async persistReplayRecord(record: ReplayRecord) {
		await this.ctx.storage.put(`event:${record.id}`, record);
		const pruneBefore = this.lastSequence - this.replayLimit;
		if (pruneBefore >= this.minSequence) {
			const staleKeys: string[] = [];
			for (let sequence = this.minSequence; sequence <= pruneBefore; sequence += 1) {
				staleKeys.push(`event:${sequence}`);
			}
			if (staleKeys.length > 0) {
				await this.ctx.storage.delete(staleKeys);
			}
			this.minSequence = pruneBefore + 1;
		}

		await Promise.all([
			this.ctx.storage.put('meta:lastSeq', this.lastSequence),
			this.ctx.storage.put('meta:minSeq', this.minSequence),
		]);
	}

	private async broadcastChannelError(channel: string, error: unknown) {
		const details = error instanceof Error ? error.message : String(error);
		await this.broadcastToClients(
			(client) => client.channels.has(channel),
			'stream-error',
			{
				channel,
				code: 'upstream_subscription_error',
				message: 'Upstream subscription temporarily unavailable.',
				details,
			},
		);
	}
}
